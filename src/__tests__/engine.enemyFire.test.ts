import { lineOfSight, tickEnemy } from '../game/ai';
import { ENEMY_SHOOT_CD } from '../game/constants';
import { canPlayerEnter, tick } from '../game/engine';
import { constantRng } from '../game/rng';
import type { GameState } from '../game/types';
import { DT, freezeRoster, input, newGame, placeEnemy, placePlayer, run } from '../test-utils/engine';

afterEach(() => jest.restoreAllMocks());

function setup(): GameState {
  const state = newGame();
  freezeRoster(state);
  placePlayer(state, 5, 1);
  state.player.invulnTimer = 1e9;
  return state;
}

const enemyBullets = (s: GameState) => s.bullets.filter((b) => b.source === 'enemy');

describe('enemy fire (AC-18)', () => {
  it('keeps at most one enemy bullet on screen', () => {
    const state = setup();
    const a = placeEnemy(state, 'gray', 12, 1, 'E');
    const b = placeEnemy(state, 'gray', 16, 1, 'E');
    a.shootCooldown = 0;
    b.shootCooldown = 0;
    tickEnemy(state, a, DT, constantRng(0.5));
    tickEnemy(state, b, DT, constantRng(0.5));
    expect(enemyBullets(state)).toHaveLength(1);
    expect(a.shootCooldown).toBeCloseTo(ENEMY_SHOOT_CD.gray! + 0.3, 5);
    expect(b.shootCooldown).toBe(0);
  });

  it('fires only when aligned within 6 units (14 for the invisible robot)', () => {
    const state = setup();
    const gray = placeEnemy(state, 'gray', 12, 1);
    state.player.y = 15 + 7;
    expect(lineOfSight(state, gray)).toBeNull();
    state.player.y = 15 + 5;
    expect(lineOfSight(state, gray)).toBe('W');
    const inv = placeEnemy(state, 'invisible', 12, 1);
    state.player.y = 15 + 13;
    expect(lineOfSight(state, inv)).toBe('W');
    gray.shootCooldown = 0;
    state.player.y = 15 + 9;
    tickEnemy(state, gray, DT, constantRng(0.5));
    expect(enemyBullets(state)).toHaveLength(0);
    expect(gray.shootCooldown).toBeCloseTo(0.5, 5);
  });

  it('never fires from spiders and bats', () => {
    const state = setup();
    const bat = placeEnemy(state, 'bat', 12, 1);
    const spider = placeEnemy(state, 'spider', 14, 1);
    bat.shootCooldown = 0;
    spider.shootCooldown = 0;
    for (let i = 0; i < 120; i++) {
      tickEnemy(state, bat, DT, constantRng(0.5));
      tickEnemy(state, spider, DT, constantRng(0.5));
    }
    expect(enemyBullets(state)).toHaveLength(0);
  });

  it("resets the shooter's cooldown when its bullet hits a wall", () => {
    const state = setup();
    placePlayer(state, 18, 3); // aligned on column 18 with the gray below
    state.player.invulnTimer = 1e9;
    const gray = placeEnemy(state, 'gray', 18, 1, 'E');
    gray.shootCooldown = 0;
    tickEnemy(state, gray, DT, constantRng(0.5));
    expect(enemyBullets(state)).toHaveLength(1);
    // Turn the bullet towards the north wall and let it hit.
    enemyBullets(state)[0].vy = -45;
    gray.shootCooldown = 5;
    gray.x = 15; // out of the bullet's way (it would hit its own shooter)
    gray.y = 105;
    jest.spyOn(require('../game/ai'), 'tickEnemy').mockImplementation(() => {});
    run(state, 0.5);
    expect(enemyBullets(state)).toHaveLength(0);
    expect(gray.shootCooldown).toBe(0);
  });
});

describe('bunker damage and lasers (AC-19)', () => {
  function boltOn(state: GameState, variant: 'yellow' | 'normal') {
    state.bulletIdCounter += 1;
    state.bullets.push({ id: state.bulletIdCounter, x: 85, y: 35, vx: 0, vy: 45, source: 'enemy', variant, ttl: 6, hitIds: [], killsCount: 0 });
    run(state, 0.5);
  }

  it('removes 1 HP per yellow bolt; at 0 HP the cell is passable; normal bullets do no damage', () => {
    const state = setup();
    jest.spyOn(require('../game/ai'), 'tickEnemy').mockImplementation(() => {});
    const seg = state.bunkerSegments.find((s) => s.col === 8 && s.row === 4)!;
    boltOn(state, 'normal');
    expect(seg.hp).toBe(3);
    boltOn(state, 'yellow');
    boltOn(state, 'yellow');
    expect(seg.hp).toBe(1);
    expect(canPlayerEnter(state, 8, 4)).toBe(false);
    boltOn(state, 'yellow');
    expect(seg.hp).toBe(0);
    expect(canPlayerEnter(state, 8, 4)).toBe(true);
  });

  it('gives black2 yellow bolts and the invisible robot lasers (D4)', () => {
    for (const [type, variant] of [
      ['black2', 'yellow'],
      ['invisible', 'laser'],
      ['gray', 'normal'],
    ] as const) {
      const state = setup();
      const e = placeEnemy(state, type, 12, 1);
      e.shootCooldown = 0;
      tickEnemy(state, e, DT, constantRng(0.5));
      expect(enemyBullets(state)[0].variant).toBe(variant);
    }
  });
});

describe('friendly fire (AC-20, D2)', () => {
  it('damages and kills other enemies without points or combo, and roster rules still apply', () => {
    const state = setup();
    jest.spyOn(require('../game/ai'), 'tickEnemy').mockImplementation(() => {});
    state.score = 6000;
    state.combo.currentTier = 1; // no no-bunker bonus in this test
    const bat = placeEnemy(state, 'bat', 12, 1);
    state.bulletIdCounter += 1;
    state.bullets.push({ id: 99, x: 135, y: 15, vx: -45, vy: 0, source: 'enemy', variant: 'normal', ttl: 6, hitIds: [], killsCount: 0 });
    tick(state, DT, input(), constantRng(0.5));
    run(state, 0.2);
    expect(state.enemies).not.toContain(bat);
    expect(state.score).toBe(6000);
    expect(state.combo.comboCount).toBe(0);
    expect(state.bluePhaseConversions).toBe(1);
  });

  it('does nothing to a shielded enemy', () => {
    const state = setup();
    jest.spyOn(require('../game/ai'), 'tickEnemy').mockImplementation(() => {});
    const white = placeEnemy(state, 'white', 12, 1);
    white.shieldTimer = 2;
    state.bullets.push({ id: 99, x: 135, y: 15, vx: -45, vy: 0, source: 'enemy', variant: 'normal', ttl: 6, hitIds: [], killsCount: 0 });
    run(state, 0.2);
    expect(white.hp).toBe(3);
  });
});
