// What each power-up does to the game, beyond its timer or charge counter (AC-32).
import { lineOfSight, tickEnemy } from '../game/ai';
import { canPlayerEnter, tick } from '../game/engine';
import { cellCenter } from '../game/maze';
import { applyPickup } from '../game/powerups';
import { constantRng } from '../game/rng';
import { isFreeCell } from '../game/spawn';
import type { GameState } from '../game/types';
import { spriteFor } from '../render/scene';
import { ROBOT_INVISIBLE, ROBOT_INVISIBLE_XRAY } from '../render/sprites';
import { DT, freezeRoster, input, newGame, placeEnemy, placePlayer, run } from '../test-utils/engine';

afterEach(() => jest.restoreAllMocks());

const fire = (dir: 'N' | 'S' | 'E' | 'W') => input({ fireRequested: true, fireDir: dir });
const playerBullets = (s: GameState) => s.bullets.filter((b) => b.source === 'player');
const enemyBullets = (s: GameState) => s.bullets.filter((b) => b.source === 'enemy');

function armed(col = 5, row = 1, stubAi = true): GameState {
  const state = newGame({ modern: true });
  freezeRoster(state);
  if (stubAi) jest.spyOn(require('../game/ai'), 'tickEnemy').mockImplementation(() => {});
  placePlayer(state, col, row);
  state.player.invulnTimer = 1e9;
  state.player.hasGun = true;
  state.player.ammo = 6;
  state.combo.currentTier = 9;
  state.powerUpSpawnTimer = 1e9;
  return state;
}

describe('power-up effects (AC-32)', () => {
  it('heavy: a shot kills a 3 HP robot in one hit, 3 charges', () => {
    const state = armed();
    applyPickup(state, 'heavy', constantRng(0.5));
    const robot = placeEnemy(state, 'white', 9, 1);
    tick(state, DT, fire('E'), constantRng(0.9));
    run(state, 0.6);
    expect(state.enemies).not.toContain(robot);
    expect(state.buffs.heavyShots).toBe(2);
  });

  it('spread: the next shot fires 3 bullets, the direction and both perpendiculars', () => {
    const state = armed(5, 3); // (5, 3) is open to the north, the south and the east
    applyPickup(state, 'spread', constantRng(0.5));
    tick(state, DT, fire('E'), constantRng(0.9));
    const dirs = playerBullets(state).map((b) => `${Math.sign(b.vx)},${Math.sign(b.vy)}`).sort();
    expect(dirs).toEqual(['0,-1', '0,1', '1,0']);
    expect(state.buffs.spreadShots).toBe(0);
    expect(state.player.ammo).toBe(5);
  });

  it('boomerang: the next shot bounces back once on a wall, then stops on the next one', () => {
    const state = armed(15, 1);
    applyPickup(state, 'boomerang', constantRng(0.5));
    tick(state, DT, fire('E'), constantRng(0.9));
    run(state, 0.5);
    const [b] = playerBullets(state);
    expect(b.boomerang).toBe('returning');
    expect(b.vx).toBeLessThan(0);
    run(state, 2.5);
    expect(playerBullets(state)).toHaveLength(0);
  });

  it('rapid fire: more than one player bullet on screen', () => {
    const state = armed();
    applyPickup(state, 'rapidFire', constantRng(0.5));
    tick(state, DT, fire('E'), constantRng(0.9));
    tick(state, DT, fire('E'), constantRng(0.9));
    expect(playerBullets(state)).toHaveLength(2);
  });

  it('cloak: robots lose sight of the player and do not fire', () => {
    const state = armed(5, 1, false);
    const robot = placeEnemy(state, 'gray', 12, 1);
    robot.shootCooldown = 0;
    expect(lineOfSight(state, robot)).toBe('W');
    applyPickup(state, 'cloak', constantRng(0.5));
    expect(lineOfSight(state, robot)).toBeNull();
    tickEnemy(state, robot, DT, constantRng(0.5));
    expect(enemyBullets(state)).toHaveLength(0);
  });

  it('decoy: robots aim at the decoy and their bullets stop on it', () => {
    const state = armed(5, 1, false);
    applyPickup(state, 'decoy', constantRng(0.5)); // decoy at (5, 1)
    placePlayer(state, 5, 5); // the player moves away
    state.player.invulnTimer = 0;
    const robot = placeEnemy(state, 'gray', 12, 1);
    robot.shootCooldown = 0;
    expect(lineOfSight(state, robot)).toBe('W');
    tickEnemy(state, robot, DT, constantRng(0.5));
    expect(enemyBullets(state)).toHaveLength(1);
    robot.x = 15; // out of the way
    robot.y = 105;
    robot.shootCooldown = 5;
    jest.spyOn(require('../game/ai'), 'tickEnemy').mockImplementation(() => {});
    run(state, 2);
    expect(enemyBullets(state)).toHaveLength(0);
    expect(robot.shootCooldown).toBe(0);
    expect(state.lives).toBe(6);
  });

  it('freeze: enemies neither move nor count down to fire', () => {
    const state = armed(5, 1, false);
    const robot = placeEnemy(state, 'gray', 12, 1, 'E');
    robot.lastTileCol = 12;
    robot.lastTileRow = 1;
    robot.pendingDecision = false;
    robot.shootCooldown = 1;
    applyPickup(state, 'freeze', constantRng(0.5));
    run(state, 0.5);
    expect(robot.x).toBe(125);
    expect(robot.shootCooldown).toBe(1);
  });

  it('phase walk: walls and the gate open, standing bunker segments do not', () => {
    const state = armed();
    applyPickup(state, 'phaseWalk', constantRng(0.5));
    expect(canPlayerEnter(state, 6, 2)).toBe(true); // wall
    expect(canPlayerEnter(state, 2, 10)).toBe(true); // gate
    expect(canPlayerEnter(state, 9, 5)).toBe(false); // bunker segment
  });

  it('magnet: the gun moves to the 3rd closest free cell within 4 cells of the player', () => {
    const state = armed(5, 5);
    state.player.hasGun = false;
    state.gun = { col: 18, row: 10 };
    applyPickup(state, 'magnet', constantRng(0.5));
    const d = (c: number, r: number) => (c - 5) ** 2 + (r - 5) ** 2;
    const free: number[] = [];
    for (let r = 1; r <= 9; r++) for (let c = 1; c <= 9; c++) if (isFreeCell(state, c, r)) free.push(d(c, r));
    free.sort((a, b) => a - b);
    expect(d(state.gun!.col, state.gun!.row)).toBe(free[2]);
  });

  it('x-ray: the invisible robot is drawn in light colours while it lasts', () => {
    const state = armed();
    const ghost = placeEnemy(state, 'invisible', 12, 1);
    expect(spriteFor(ghost, false)).toBe(ROBOT_INVISIBLE);
    expect(spriteFor(ghost, true)).toBe(ROBOT_INVISIBLE_XRAY);
    applyPickup(state, 'xray', constantRng(0.5));
    expect(state.buffs.xrayTimer).toBe(12);
  });

  it('score x2 ends after 30 s and points go back to normal', () => {
    const state = armed();
    applyPickup(state, 'scoreX2', constantRng(0.5));
    run(state, 30.1);
    expect(state.buffs.scoreMult).toBe(1);
    const spider = placeEnemy(state, 'spider', 8, 1);
    spider.hp = 1;
    tick(state, DT, fire('E'), constantRng(0.9));
    run(state, 0.5);
    expect(state.score).toBe(100);
  });

  it('extra life and ammo pickups apply in a real pickup on the map', () => {
    const state = armed();
    state.player.hasGun = false;
    state.player.ammo = 0;
    const c = cellCenter(5, 1);
    state.powerUps.push({ id: 1, kind: 'ammo', col: 5, row: 1, ttl: 12 }, { id: 2, kind: 'extraLife', col: 5, row: 1, ttl: 12 });
    expect({ x: state.player.x, y: state.player.y }).toEqual(c);
    tick(state, DT, input(), constantRng(0.5));
    expect(state.player).toMatchObject({ hasGun: true, ammo: 6 });
    expect(state.lives).toBe(7);
  });
});
