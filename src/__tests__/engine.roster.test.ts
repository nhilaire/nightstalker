import { BAT_SPAWNS_FIRST, BAT_SPAWNS_SECOND, HEARTBEAT_TEMPO, SPIDER_SPAWNS } from '../game/constants';
import { tick } from '../game/engine';
import { cellCenter } from '../game/maze';
import { constantRng, seededRng } from '../game/rng';
import { desiredRoster, ensureRoster, mainTypeForScore, spawnPosition, tierForScore } from '../game/spawn';
import type { EnemyType, GameState } from '../game/types';
import { DT, input, newGame, placeEnemy, placePlayer, run } from '../test-utils/engine';

afterEach(() => jest.restoreAllMocks());

const roster = (s: GameState) => s.enemies.map((e) => e.type).sort();
const sorted = (types: EnemyType[]) => [...types].sort();

function atScore(score: number): GameState {
  const state = newGame({ modern: false });
  state.enemies = [];
  state.score = score;
  state.activeMainType = mainTypeForScore(score);
  ensureRoster(state, seededRng(3));
  return state;
}

describe('roster by tier (AC-25)', () => {
  it.each([
    [0, ['spider', 'bat', 'bat', 'gray']],
    [5000, ['spider', 'bat', 'bat', 'blue']],
    [15000, ['spider', 'gray', 'gray', 'white']],
    [30000, ['spider', 'gray', 'gray', 'black1']],
    [50000, ['spider', 'gray', 'gray', 'black2']],
    [80000, ['spider', 'gray', 'gray', 'invisible']],
  ] as [number, EnemyType[]][])('score %i gives %j', (score, expected) => {
    expect(sorted(desiredRoster(score))).toEqual(sorted(expected));
    expect(roster(atScore(score))).toEqual(sorted(expected));
  });

  it('maps scores to tiers 0..5', () => {
    expect([0, 4999, 5000, 14999, 15000, 30000, 50000, 79999, 80000].map(tierForScore)).toEqual([0, 0, 1, 1, 2, 3, 4, 4, 5]);
  });

  it('keeps the old main until it is killed', () => {
    const state = atScore(0);
    state.score = 5000; // crossed by a support kill: the gray main is still alive
    ensureRoster(state, seededRng(3));
    expect(roster(state)).toEqual(sorted(['spider', 'bat', 'bat', 'gray']));
    state.enemies = state.enemies.filter((e) => e.type !== 'gray');
    state.activeMainType = mainTypeForScore(state.score);
    ensureRoster(state, seededRng(3));
    expect(roster(state)).toEqual(sorted(['spider', 'bat', 'bat', 'blue']));
  });
});

describe('bat conversion (AC-26)', () => {
  function shootBat(state: GameState) {
    jest.spyOn(require('../game/ai'), 'tickEnemy').mockImplementation(() => {});
    const bats = state.enemies.filter((e) => e.type === 'bat');
    const bat = bats[0];
    const c = cellCenter(8, 1);
    bat.x = c.x;
    bat.y = c.y;
    bat.spawning = false;
    placePlayer(state, 5, 1);
    state.player.hasGun = true;
    state.player.ammo = 6;
    state.bullets = [];
    tick(state, DT, input({ fireRequested: true, fireDir: 'E' }), constantRng(0.5));
    run(state, 0.5);
    jest.restoreAllMocks();
  }

  it('turns the first 2 bats killed at tier 1 into grays for the rest of the run', () => {
    const state = atScore(6000);
    state.player.invulnTimer = 1e9;
    state.combo.currentTier = 1;
    shootBat(state);
    expect(state.bluePhaseConversions).toBe(1);
    expect(roster(state)).toEqual(sorted(['spider', 'bat', 'gray', 'blue']));
    const gray = state.enemies.find((e) => e.type === 'gray')!;
    expect({ x: gray.x, y: gray.y }).toEqual(cellCenter(1, 10));
    // Killing the gray brings back a gray, never a bat.
    state.enemies = state.enemies.filter((e) => e !== gray);
    ensureRoster(state, seededRng(4));
    expect(roster(state)).toEqual(sorted(['spider', 'bat', 'gray', 'blue']));
    shootBat(state);
    expect(state.bluePhaseConversions).toBe(2);
    expect(roster(state)).toEqual(sorted(['spider', 'gray', 'gray', 'blue']));
  });
});

describe('spawn positions (AC-27)', () => {
  it('puts the spider in the web area, bats in their pools and robots in the pen', () => {
    for (let seed = 1; seed < 30; seed++) {
      const state = newGame();
      state.enemies = [];
      const rng = seededRng(seed);
      const centres = (cells: readonly { col: number; row: number }[]) => cells.map((c) => cellCenter(c.col, c.row));
      expect(centres(SPIDER_SPAWNS)).toContainEqual(spawnPosition(state, 'spider', rng));
      expect(centres(BAT_SPAWNS_FIRST)).toContainEqual(spawnPosition(state, 'bat', rng));
      placeEnemy(state, 'bat', 18, 1);
      expect(centres(BAT_SPAWNS_SECOND)).toContainEqual(spawnPosition(state, 'bat', rng));
      for (const t of ['gray', 'blue', 'white', 'black1', 'black2', 'invisible'] as EnemyType[]) {
        expect(spawnPosition(state, t, rng)).toEqual(cellCenter(1, 10));
      }
    }
  });
});

describe('heartbeat tempo (AC-34)', () => {
  it('matches the tempo table and changes when the main changes', () => {
    expect(HEARTBEAT_TEMPO).toMatchObject({ gray: 1.8, blue: 1.65, white: 1.5, black1: 1.35, black2: 1.2, invisible: 1.05 });
    const state = atScore(14900);
    state.combo.currentTier = 2;
    jest.spyOn(require('../game/ai'), 'tickEnemy').mockImplementation(() => {});
    const blue = state.enemies.find((e) => e.type === 'blue')!;
    const c = cellCenter(8, 1);
    blue.x = c.x;
    blue.y = c.y;
    blue.spawning = false;
    placePlayer(state, 5, 1);
    state.player.invulnTimer = 1e9;
    state.player.hasGun = true;
    state.player.ammo = 6;
    const events: string[] = [];
    tick(state, DT, input({ fireRequested: true, fireDir: 'E' }), constantRng(0.5));
    for (let i = 0; i < 30; i++) {
      tick(state, DT, input(), constantRng(0.5));
      for (const e of state.events) if (e.type === 'tempo') events.push(String(e.seconds));
    }
    expect(state.activeMainType).toBe('white');
    expect(events).toEqual(['1.5']);
  });
});
