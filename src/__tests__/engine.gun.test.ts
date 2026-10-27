import { GUN_AMMO, GUN_SPAWNS, PLAYER_BULLET_SPEED } from '../game/constants';
import { autoAimDir, resolveShootDir, tick } from '../game/engine';
import { cellCenter } from '../game/maze';
import { constantRng } from '../game/rng';
import { pickGunSpawn } from '../game/spawn';
import { DT, eventTypes, freezeRoster, input, newGame, placeEnemy, placePlayer, run } from '../test-utils/engine';

afterEach(() => jest.restoreAllMocks());

const fire = (dir: 'N' | 'S' | 'E' | 'W' | 'auto' | null = 'E') => input({ fireRequested: true, fireDir: dir });

describe('gun placement and pickup (AC-11, AC-12)', () => {
  it('places the run gun on one of the 5 spots, the farthest from the player', () => {
    const state = newGame();
    expect(GUN_SPAWNS).toContainEqual(state.gun);
    // Spawn point (95, 45): the farthest spot is (18, 10).
    expect(state.gun).toEqual({ col: 18, row: 10 });
  });

  it('never places the gun again on the current spot, and picks the farthest remaining one', () => {
    const state = newGame();
    placePlayer(state, 17, 10);
    state.gun = { col: 5, row: 3 };
    const next = pickGunSpawn(state);
    expect(next).not.toEqual({ col: 5, row: 3 });
    expect(next).toEqual({ col: 5, row: 8 });
  });

  it('gives 6 bullets on pickup; 6 shots empty the gun and place a new one', () => {
    const state = newGame({ modern: false });
    freezeRoster(state);
    const g = cellCenter(18, 10);
    state.player.x = g.x;
    state.player.y = g.y;
    tick(state, DT, input(), constantRng(0.5));
    expect(state.gun).toBeNull();
    expect(state.player.ammo).toBe(GUN_AMMO);
    expect(eventTypes(state)).toContain('gunPickup');
    for (let i = 0; i < GUN_AMMO; i++) {
      state.bullets = [];
      tick(state, DT, fire('W'), constantRng(0.5));
    }
    expect(state.player.ammo).toBe(0);
    expect(state.player.hasGun).toBe(false);
    expect(state.gun).not.toBeNull();
  });

  it('fires nothing without a gun and flashes the ammo display', () => {
    const state = newGame();
    freezeRoster(state);
    tick(state, DT, fire(), constantRng(0.5));
    expect(state.bullets).toHaveLength(0);
    expect(state.flashNoAmmo).toBeGreaterThan(0);
    expect(eventTypes(state)).toContain('noAmmo');
  });
});

describe('player bullets (AC-13)', () => {
  function armed() {
    const state = newGame({ modern: false });
    freezeRoster(state);
    placePlayer(state, 5, 1);
    state.player.hasGun = true;
    state.player.ammo = GUN_AMMO;
    return state;
  }

  it('allows one player bullet on screen at a time', () => {
    const state = armed();
    tick(state, DT, fire('E'), constantRng(0.5));
    tick(state, DT, fire('E'), constantRng(0.5));
    expect(state.bullets.filter((b) => b.source === 'player')).toHaveLength(1);
    expect(state.player.ammo).toBe(GUN_AMMO - 1);
  });

  it('moves at 90 units per second', () => {
    const state = armed();
    tick(state, DT, fire('E'), constantRng(0.5));
    const x0 = state.bullets[0].x;
    run(state, 0.1);
    expect(state.bullets[0].x - x0).toBeCloseTo(PLAYER_BULLET_SPEED * 0.1, 0);
  });

  it('passes through two aligned enemies, hitting each once', () => {
    const state = armed();
    const a = placeEnemy(state, 'white', 9, 1);
    const b = placeEnemy(state, 'white', 12, 1);
    a.dir = b.dir = 'E';
    tick(state, DT, fire('E'), constantRng(0.5));
    run(state, 1.2);
    expect(a.hp).toBe(2);
    expect(b.hp).toBe(2);
  });

  it('stops on a wall and on a bunker segment without damaging it', () => {
    const state = armed();
    tick(state, DT, fire('E'), constantRng(0.5));
    run(state, 1.6);
    expect(state.bullets).toHaveLength(0);
    placePlayer(state, 9, 3);
    tick(state, DT, fire('S'), constantRng(0.5));
    run(state, 0.3);
    expect(state.bullets).toHaveLength(0);
    expect(state.bunkerSegments.every((s) => s.hp === 3)).toBe(true);
  });
});

describe('fire direction (AC-14)', () => {
  it('uses the tapped direction, or the last move direction when none', () => {
    const state = newGame();
    expect(resolveShootDir(state, 'S', 'N')).toBe('S');
    expect(resolveShootDir(state, null, 'W')).toBe('W');
  });

  it('auto-aims at the nearest active enemy on its dominant axis', () => {
    const state = newGame();
    freezeRoster(state);
    placePlayer(state, 5, 5);
    placeEnemy(state, 'gray', 5, 8); // 30 below
    const far = placeEnemy(state, 'gray', 15, 5); // 100 east
    expect(autoAimDir(state)).toBe('S');
    state.enemies = [far];
    expect(autoAimDir(state)).toBe('E');
    far.spawning = true;
    expect(autoAimDir(state)).toBeNull();
    expect(resolveShootDir(state, 'auto', 'N')).toBe('N');
  });
});

describe('web absorption (AC-15)', () => {
  function shootIntoWeb(rngValue: number) {
    const state = newGame({ modern: false });
    freezeRoster(state);
    placePlayer(state, 1, 3);
    state.player.hasGun = true;
    state.player.ammo = GUN_AMMO;
    const spider = placeEnemy(state, 'white', 1, 1); // a robot standing in the web, 3 HP
    spider.dir = 'N';
    tick(state, DT, fire('N'), constantRng(rngValue));
    run(state, 0.3, input(), constantRng(rngValue));
    return spider.hp;
  }

  it('absorbs the hit when the random draw is < 0.5', () => {
    expect(shootIntoWeb(0.3)).toBe(3);
  });

  it('lets the hit through when the draw is >= 0.5', () => {
    expect(shootIntoWeb(0.7)).toBe(2);
  });
});
