import { hasReactiveShield, patrolDir, pickDir, tickEnemy, trackingDir } from '../game/ai';
import { ENEMY_HP, ENEMY_SHOOT_CD, ENEMY_SPEED, SCORE, SHIELD_TIME } from '../game/constants';
import { tick } from '../game/engine';
import { isInsideBunker } from '../game/maze';
import { constantRng, seededRng } from '../game/rng';
import { DT, freezeRoster, input, newGame, placeEnemy, placePlayer, run } from '../test-utils/engine';

afterEach(() => jest.restoreAllMocks());

describe('enemy stats and spawning (AC-16)', () => {
  it('matches the PRD enemy table', () => {
    expect(ENEMY_HP).toEqual({ spider: 1, bat: 1, gray: 1, blue: 1, white: 3, black1: 3, black2: 3, invisible: 3 });
    expect(ENEMY_SPEED).toEqual({ spider: 7, bat: 15, gray: 22, blue: 26, white: 26, black1: 23, black2: 23, invisible: 24 });
    expect(ENEMY_SHOOT_CD).toEqual({ gray: 2.2, blue: 1.8, white: 1.6, black1: 1.4, black2: 1.2, invisible: 1.0 });
    expect(SCORE).toEqual({ spider: 100, bat: 300, gray: 200, blue: 500, white: 1000, black1: 2000, black2: 2000, invisible: 4000 });
  });

  it('keeps a new enemy inactive for 1.2 s: no move, no damage, no contact', () => {
    const state = newGame();
    freezeRoster(state);
    const e = placeEnemy(state, 'gray', 12, 1);
    e.spawning = true;
    e.spawnTimer = 1.2;
    placePlayer(state, 12, 1);
    run(state, 1.1);
    expect(e.x).toBe(125);
    expect(state.lives).toBe(6);
    run(state, 0.2);
    expect(e.spawning).toBe(false);
  });
});

describe('spawning enemies (AC-16)', () => {
  it('take no damage and do not shoot while spawning', () => {
    const state = newGame();
    freezeRoster(state);
    placePlayer(state, 5, 1);
    state.player.invulnTimer = 1e9;
    state.player.hasGun = true;
    state.player.ammo = 6;
    const e = placeEnemy(state, 'gray', 8, 1);
    e.spawning = true;
    e.spawnTimer = 1.2;
    e.shootCooldown = 0; // ready to fire and aligned with the player
    tick(state, DT, input({ fireRequested: true, fireDir: 'E' }), constantRng(0.9));
    run(state, 0.6);
    expect(e.hp).toBe(1);
    expect(state.enemies).toContain(e);
    expect(state.bullets.filter((b) => b.source === 'enemy')).toHaveLength(0);
  });
});

describe('reactive shields (AC-17)', () => {
  function shootAt(state: ReturnType<typeof newGame>, piercing = false) {
    state.bullets = [];
    state.player.hasGun = true;
    state.player.ammo = 6;
    state.buffs.piercingShots = piercing ? 1 : 0;
    tick(state, DT, input({ fireRequested: true, fireDir: 'E' }), constantRng(0.9));
    run(state, 0.5);
  }

  it.each(['white', 'black1', 'black2', 'invisible'] as const)('%s raises a 2 s shield on a non-lethal hit, ignored by normal bullets, not by piercing ones', (type) => {
    const state = newGame();
    freezeRoster(state);
    placePlayer(state, 5, 1);
    const robot = placeEnemy(state, type, 10, 1);
    const hold = () => {
      robot.x = 105;
      robot.y = 15;
    };
    jest.spyOn(require('../game/ai'), 'tickEnemy').mockImplementation((...args: unknown[]) => {
      const e = args[1] as typeof robot;
      if (e.shieldTimer > 0) e.shieldTimer = Math.max(0, e.shieldTimer - (args[2] as number));
    });
    shootAt(state);
    hold();
    expect(robot.hp).toBe(2);
    expect(robot.shieldTimer).toBeGreaterThan(0);
    expect(robot.shieldTimer).toBeLessThanOrEqual(SHIELD_TIME);
    shootAt(state);
    expect(robot.hp).toBe(2);
    shootAt(state, true);
    expect(robot.hp).toBe(1);
    run(state, SHIELD_TIME + 0.1);
    shootAt(state);
    expect(robot.hp).toBe(0);
  });

  it('never shields the one-hit types', () => {
    for (const type of ['spider', 'bat', 'gray', 'blue'] as const) expect(hasReactiveShield(type)).toBe(false);
  });
});

describe('movement AI (AC-21)', () => {
  it('keeps its direction in a corridor without perpendicular option', () => {
    const state = newGame();
    freezeRoster(state);
    const e = placeEnemy(state, 'gray', 7, 1, 'E'); // row 1, cols 6-9 have walls above and below
    for (let i = 0; i < 20; i++) tickEnemy(state, e, DT, seededRng(i));
    expect(e.dir).toBe('E');
  });

  it('turns back in a dead end', () => {
    const state = newGame();
    freezeRoster(state);
    // The pen (1, 10) is the only dead end: a robot heading west there turns back east through the gate.
    const e = placeEnemy(state, 'gray', 1, 10, 'W');
    e.lastTileCol = 1;
    e.lastTileRow = 10;
    e.pendingDecision = false;
    for (let i = 0; i < 30; i++) tickEnemy(state, e, DT, seededRng(i));
    expect(e.dir).toBe('E');
    expect(e.x).toBeGreaterThan(15);
    expect(e.y).toBe(105);
  });

  it('tracks the player along the axis of the largest distance', () => {
    const state = newGame();
    freezeRoster(state);
    // (10, 3): N, E and W open, S blocked by the bunker segment (10, 4).
    const e = placeEnemy(state, 'black1', 10, 3, 'E');
    placePlayer(state, 15, 5); // dx 50 > dy 20
    expect(trackingDir(state, e)).toBe('E');
    placePlayer(state, 11, 1); // dy -20 > dx 10
    expect(trackingDir(state, e)).toBe('N');
    placePlayer(state, 10, 8); // S is blocked: next candidate axis
    expect(trackingDir(state, e)).toBe('W');
    // Under cloak or while unstuck, tracking robots patrol.
    state.buffs.cloakTimer = 5;
    expect(pickDir(state, e, constantRng(0))).toBe(patrolDir(state, e, constantRng(0)));
  });

  it('patrols with weights forward 1.6, perpendicular 1.0, reverse 0.18', () => {
    const state = newGame();
    freezeRoster(state);
    const e = placeEnemy(state, 'gray', 10, 3, 'E'); // N, E, W open
    // Candidates in order N (1.0), E (forward 1.6), W (reverse 0.18): total 2.78.
    expect(patrolDir(state, e, constantRng(0.1))).toBe('N');
    expect(patrolDir(state, e, constantRng(0.5))).toBe('E');
    expect(patrolDir(state, e, constantRng(0.99))).toBe('W');
  });

  it('switches to random patrol for 2.5 s when it moved 5 units or less in 2 s', () => {
    const state = newGame();
    freezeRoster(state);
    const e = placeEnemy(state, 'black1', 5, 5);
    e.stuckCheckX = e.x;
    e.stuckCheckY = e.y;
    e.stuckCheckTimer = 2;
    tickEnemy(state, e, 0.02, constantRng(0.5));
    expect(e.forceRandomTimer).toBeCloseTo(2.48, 2);
  });

  it('never lets an enemy into the bunker; bats and spider never cross the gate, robots leave the pen', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const rng = seededRng(seed);
      const state = newGame({ rng });
      state.player.invulnTimer = 1e9;
      let robotLeftPen = false;
      for (let i = 0; i < 60 * 40; i++) {
        tick(state, DT, input(), rng);
        for (const e of state.enemies) {
          expect(isInsideBunker(e.x, e.y)).toBe(false);
          const col = Math.floor(e.x / 10);
          const row = Math.floor(e.y / 10);
          if (e.type === 'bat' || e.type === 'spider') expect(col === 2 && row === 10).toBe(false);
          if (e.type === 'gray' && (col > 2 || row < 10)) robotLeftPen = true;
        }
      }
      expect(robotLeftPen).toBe(true);
    }
  });
});
