import { POWERUP_FIRST_SPAWN, POWERUP_TTL } from '../game/constants';
import { tick } from '../game/engine';
import { cellCenter, isInsideBunker } from '../game/maze';
import {
  applyCurse,
  applyPickup,
  CURSES,
  MYSTERY_BUFFS,
  nextSpawnDelay,
  pickPowerUpCell,
  pickPowerUpKind,
  POWERUP_DEFS,
  POWERUP_GROUPS,
  POWERUP_KINDS,
  SPAWN_WEIGHTS,
} from '../game/powerups';
import { constantRng, seededRng } from '../game/rng';
import type { GameState, PowerUpKind } from '../game/types';
import { DT, eventTypes, freezeRoster, input, newGame, placeEnemy, placePlayer, run } from '../test-utils/engine';

afterEach(() => jest.restoreAllMocks());

function quiet(modern = true): GameState {
  const state = newGame({ modern });
  freezeRoster(state);
  jest.spyOn(require('../game/ai'), 'tickEnemy').mockImplementation(() => {});
  placePlayer(state, 5, 1);
  state.player.invulnTimer = 1e9;
  return state;
}

describe('power-up spawning (AC-31)', () => {
  it('drops the first power-up at 18 s, then every 22-38 s and only when none is on the map', () => {
    const state = quiet();
    run(state, POWERUP_FIRST_SPAWN - 0.1, input(), seededRng(5));
    expect(state.powerUps).toHaveLength(0);
    const seen: string[] = [];
    for (let i = 0; i < 20; i++) {
      tick(state, DT, input(), seededRng(5 + i));
      seen.push(...eventTypes(state));
    }
    expect(state.powerUps).toHaveLength(1);
    expect(seen).toContain('powerUpAppear');
    expect(nextSpawnDelay(constantRng(0))).toBe(22);
    expect(nextSpawnDelay(constantRng(0.999999))).toBeCloseTo(38, 3);
    // While one is on the map, the timer runs out without a second one.
    state.powerUpSpawnTimer = 0;
    tick(state, DT, input(), seededRng(9));
    expect(state.powerUps).toHaveLength(1);
  });

  it('places it on a reachable free cell >= 70 units from the player, never the gun, and removes it after 12 s', () => {
    for (let seed = 1; seed < 200; seed++) {
      const state = quiet();
      const cell = pickPowerUpCell(state, seededRng(seed));
      if (!cell) continue;
      const c = cellCenter(cell.col, cell.row);
      expect(Math.hypot(c.x - state.player.x, c.y - state.player.y)).toBeGreaterThanOrEqual(70);
      expect(isInsideBunker(c.x, c.y)).toBe(false);
      expect(cell).not.toEqual(state.gun);
      expect(cell).not.toEqual({ col: 1, row: 10 });
      expect(cell).not.toEqual({ col: 2, row: 10 });
    }
    const state = quiet();
    state.powerUps.push({ id: 1, kind: 'slowMo', col: 18, row: 10, ttl: POWERUP_TTL });
    state.powerUpSpawnTimer = 1e9;
    run(state, POWERUP_TTL - 0.2);
    expect(state.powerUps).toHaveLength(1);
    run(state, 0.3);
    expect(state.powerUps).toHaveLength(0);
  });

  it('never appears in classic mode', () => {
    const state = quiet(false);
    run(state, 60);
    expect(state.powerUps).toHaveLength(0);
  });

  it('draws kinds with the PRD weights', () => {
    expect(SPAWN_WEIGHTS.map((w) => w.w)).toEqual([3, 1, 2, 3, 2, 2, 1, 1, 2, 1, 1, 1, 3, 3, 1, 0.5, 2, 2, 2]);
    expect(pickPowerUpKind(constantRng(0))).toBe('slowMo');
    expect(pickPowerUpKind(constantRng(0.999))).toBe('mystery');
    expect(POWERUP_KINDS).toHaveLength(19);
    expect(POWERUP_GROUPS.flatMap((g) => g.kinds).sort()).toEqual([...POWERUP_KINDS].sort());
  });
});

describe('power-up effects (AC-32)', () => {
  it('sets the durations and charges of the table, stacking charges and restarting durations', () => {
    const state = quiet();
    const pick = (k: PowerUpKind) => applyPickup(state, k, constantRng(0.5));
    pick('slowMo');
    pick('freeze');
    pick('cloak');
    pick('rapidFire');
    pick('phaseWalk');
    pick('xray');
    pick('scoreX2');
    pick('decoy');
    const b = state.buffs;
    expect([b.slowMoTimer, b.freezeTimer, b.cloakTimer, b.rapidFireTimer, b.phaseWalkTimer, b.xrayTimer, b.scoreMultTimer, b.decoyTimer]).toEqual([
      25, 4, 8, 6, 4, 12, 30, 8,
    ]);
    expect(b.scoreMult).toBe(2);
    expect({ x: b.decoyX, y: b.decoyY }).toEqual({ x: state.player.x, y: state.player.y });
    pick('piercing');
    pick('piercing');
    pick('spread');
    pick('heavy');
    pick('boomerang');
    pick('shield');
    expect([b.piercingShots, b.spreadShots, b.heavyShots, b.boomerangShots, b.shieldHits]).toEqual([2, 1, 3, 1, 1]);
    b.slowMoTimer = 3;
    pick('slowMo');
    expect(b.slowMoTimer).toBe(25);
  });

  it('applies the instant effects: repair, ammo, extra life, magnet, EMP', () => {
    const state = quiet();
    state.bunkerSegments[0].hp = 0;
    applyPickup(state, 'bunkerRepair', constantRng(0.5));
    expect(state.bunkerSegments.every((s) => s.hp === 3)).toBe(true);
    applyPickup(state, 'ammo', constantRng(0.5));
    expect(state.player).toMatchObject({ hasGun: true, ammo: 6 });
    expect(state.gun).toBeNull();
    applyPickup(state, 'extraLife', constantRng(0.5));
    expect(state.lives).toBe(7);
    applyPickup(state, 'magnet', constantRng(0.5));
    expect(state.gun).not.toBeNull();
    const d = Math.max(Math.abs(state.gun!.col - 5), Math.abs(state.gun!.row - 1));
    expect(d).toBeLessThanOrEqual(4);
    const robot = placeEnemy(state, 'gray', 12, 1);
    robot.shootCooldown = 0.2;
    state.bullets.push({ id: 7, x: 120, y: 15, vx: -45, vy: 0, source: 'enemy', variant: 'normal', ttl: 6, hitIds: [], killsCount: 0 });
    applyPickup(state, 'emp', constantRng(0.5));
    expect(state.bullets).toHaveLength(0);
    expect(robot.shootCooldown).toBe(3);
  });

  it('slows enemies to half speed, freezes them, and lets the player walk through walls', () => {
    const state = newGame();
    freezeRoster(state);
    placePlayer(state, 5, 1);
    state.player.invulnTimer = 1e9;
    const e = placeEnemy(state, 'gray', 12, 1, 'E');
    e.lastTileCol = 12;
    e.lastTileRow = 1;
    e.pendingDecision = false;
    state.buffs.slowMoTimer = 25;
    run(state, 0.1);
    expect(e.x - 125).toBeCloseTo(22 * 0.05, 1);
    state.buffs.freezeTimer = 4;
    const x = e.x;
    run(state, 0.1);
    expect(e.x).toBe(x);
    state.buffs.phaseWalkTimer = 4;
    placePlayer(state, 6, 1);
    run(state, 0.4, input({ dir: { x: 0, y: 1 } })); // (6, 2) is a wall
    expect(state.player.y).toBeGreaterThan(20);
  });

  it('absorbs a death with a shield charge', () => {
    const state = quiet();
    state.player.invulnTimer = 0;
    state.buffs.shieldHits = 1;
    placeEnemy(state, 'gray', 5, 1);
    tick(state, DT, input(), constantRng(0.5));
    expect(state.lives).toBe(6);
    expect(state.buffs.shieldHits).toBe(0);
    expect(state.player.invulnTimer).toBeGreaterThan(1.4);
    expect(state.combo.flash).toEqual({ kind: 'bonus', bonus: 'shieldAbsorb', points: 0 });
  });

  it('shows the power-up label without points on pickup (D3)', () => {
    const state = quiet();
    state.combo.flash = { kind: 'bonus', bonus: 'fullClip', points: 1000 };
    state.combo.flashTimer = 2;
    state.powerUps.push({ id: 1, kind: 'slowMo', col: 5, row: 1, ttl: 12 });
    tick(state, DT, input(), constantRng(0.5));
    expect(state.combo.flash).toEqual({ kind: 'powerup', powerUp: 'slowMo' });
    expect(eventTypes(state)).toContain('powerUpPickup');
  });

  it('has durations and charges in its definitions for the guide', () => {
    expect(POWERUP_DEFS.heavy.charges).toBe(3);
    expect(POWERUP_DEFS.scoreX2.duration).toBe(30);
  });
});

describe('mystery (AC-33)', () => {
  it('always gives a buff when the score is < 5,000 or lives < 2', () => {
    const early = quiet();
    expect(applyPickup(early, 'mystery', constantRng(0.99)).kind).toBe('powerup');
    const low = quiet();
    low.score = 20000;
    low.lives = 1;
    expect(applyPickup(low, 'mystery', constantRng(0.99)).kind).toBe('powerup');
  });

  it('otherwise gives a buff or one of the 3 curses', () => {
    const state = quiet();
    state.score = 20000;
    const buff = applyPickup(state, 'mystery', constantRng(0.2));
    expect(buff.kind).toBe('powerup');
    expect(MYSTERY_BUFFS).toContain(buff.kind === 'powerup' ? buff.powerUp : null);
    const curse = applyPickup(state, 'mystery', constantRng(0.99));
    expect(curse).toEqual({ kind: 'curse', curse: 'volley' });
    expect(CURSES).toEqual(['slow', 'noAmmo', 'volley']);
  });

  it('applies the curses: slow 10 s, no ammo, volley', () => {
    const state = quiet();
    applyCurse(state, 'slow');
    expect(state.buffs.slowDebuffTimer).toBe(10);
    state.player.hasGun = true;
    state.player.ammo = 4;
    state.gun = null;
    applyCurse(state, 'noAmmo');
    expect(state.player).toMatchObject({ hasGun: false, ammo: 0 });
    expect(state.gun).not.toBeNull();
    const e = placeEnemy(state, 'gray', 12, 1);
    applyCurse(state, 'volley');
    expect(e.shootCooldown).toBe(0);
  });
});
