import { BONUS_POINTS, SCORE } from '../game/constants';
import { addScore, tick } from '../game/engine';
import { cellCenter } from '../game/maze';
import { constantRng } from '../game/rng';
import type { EnemyType, GameState } from '../game/types';
import { DT, freezeRoster, input, newGame, placeEnemy, placePlayer, run } from '../test-utils/engine';

afterEach(() => jest.restoreAllMocks());

// Player at (5, 1) with a loaded gun; enemies do not move (the AI is stubbed).
function range(modern: boolean, highScore = 0): GameState {
  const state = newGame({ modern, highScore });
  freezeRoster(state);
  jest.spyOn(require('../game/ai'), 'tickEnemy').mockImplementation(() => {});
  placePlayer(state, 5, 1);
  state.player.invulnTimer = 1e9;
  state.player.hasGun = true;
  state.player.ammo = 6;
  state.combo.currentTier = 9; // no no-bunker bonus unless a test wants it
  return state;
}

function shoot(state: GameState, dir: 'E' | 'W' | 'N' | 'S' = 'E', seconds = 0.6) {
  state.bullets = state.bullets.filter((b) => b.source === 'enemy');
  tick(state, DT, input({ fireRequested: true, fireDir: dir }), constantRng(0.9));
  run(state, seconds, input(), constantRng(0.9));
}

function killOne(state: GameState, type: EnemyType) {
  const e = placeEnemy(state, type, 8, 1);
  e.hp = 1;
  shoot(state);
}

describe('classic scoring (AC-28)', () => {
  it.each(Object.entries(SCORE))('gives %s its points', (type, points) => {
    const state = range(false);
    killOne(state, type as EnemyType);
    expect(state.score).toBe(points);
  });

  it('adds one life per 10,000 crossed, several in one gain', () => {
    const state = range(false);
    state.score = 9000;
    addScore(state, 12000);
    expect(state.lives).toBe(8);
    expect(state.nextLifeAt).toBe(30000);
  });

  it('flags a new best only when the score is strictly greater than the saved best', () => {
    const tie = range(false, 300);
    killOne(tie, 'bat');
    expect(tie.newHighScore).toBe(false);
    killOne(tie, 'spider');
    expect(tie.newHighScore).toBe(true);
    const first = range(false, 0);
    expect(first.newHighScore).toBe(false); // a 0-score run is never a new best
    killOne(first, 'spider');
    expect(first.newHighScore).toBe(true);
  });
});

describe('combos (AC-29)', () => {
  it('multiplies kills chained within 4 s by 1, 1.5, 2, 2, 3', () => {
    const state = range(true);
    const gains: number[] = [];
    for (let i = 0; i < 5; i++) {
      const before = state.score;
      state.player.ammo = 6;
      killOne(state, 'bat');
      gains.push(state.score - before);
    }
    expect(gains).toEqual([300, 450, 600, 600, 900]);
  });

  it('resets after 4 s without a kill', () => {
    const state = range(true);
    killOne(state, 'bat');
    killOne(state, 'bat');
    run(state, 4.1);
    const before = state.score;
    killOne(state, 'bat');
    expect(state.score - before).toBe(300);
  });

  it('has no multiplier in classic mode', () => {
    const state = range(false);
    killOne(state, 'bat');
    killOne(state, 'bat');
    expect(state.score).toBe(600);
  });
});

describe('bonuses (AC-30)', () => {
  it('grants double, triple and mega kills for one bullet', () => {
    const state = range(true);
    for (const col of [8, 10, 12, 14]) placeEnemy(state, 'spider', col, 1);
    const bonuses: string[] = [];
    state.bullets = [];
    tick(state, DT, input({ fireRequested: true, fireDir: 'E' }), constantRng(0.9));
    for (let i = 0; i < 60; i++) {
      tick(state, DT, input(), constantRng(0.9));
      const flash = state.combo.flash;
      if (flash?.kind === 'bonus' && !bonuses.includes(flash.bonus)) bonuses.push(flash.bonus);
    }
    expect(bonuses).toEqual(['doubleKill', 'tripleKill', 'megaKill']);
    // 100 x (1 + 1.5 + 2 + 2) + 250 + 750 + 1500
    expect(state.score).toBe(650 + 250 + 750 + 1500);
  });

  it('grants quick draw for a tracking robot killed < 1.5 s after it became active', () => {
    const quick = range(true);
    const e = placeEnemy(quick, 'black1', 8, 1);
    e.hp = 1;
    e.aliveTime = 1.0;
    shoot(quick);
    expect(quick.score).toBe(SCORE.black1 + BONUS_POINTS.quickDraw);
    const slow = range(true);
    const f = placeEnemy(slow, 'black1', 8, 1);
    f.hp = 1;
    f.aliveTime = 1.6;
    shoot(slow);
    expect(slow.score).toBe(SCORE.black1);
  });

  it('grants clutch once, for the shot that emptied the gun (D5)', () => {
    const state = range(true);
    state.player.ammo = 1;
    placeEnemy(state, 'spider', 8, 1);
    placeEnemy(state, 'spider', 10, 1);
    shoot(state);
    // 100 + 150 (combo) + 250 (double kill) + 1000 (one clutch only)
    expect(state.score).toBe(100 + 150 + 250 + BONUS_POINTS.clutch);

    const rapid = range(true);
    rapid.buffs.rapidFireTimer = 5;
    rapid.player.ammo = 2;
    placeEnemy(rapid, 'spider', 12, 1);
    tick(rapid, DT, input({ fireRequested: true, fireDir: 'E' }), constantRng(0.9)); // bullet 1 (not the last)
    tick(rapid, DT, input({ fireRequested: true, fireDir: 'W' }), constantRng(0.9)); // last bullet, away from the spider
    run(rapid, 1);
    expect(rapid.score).toBe(100); // the first bullet's kill is not a clutch
  });

  it('grants full clip when >= 4 shots all hit, on the next gun pickup', () => {
    const g = cellCenter(18, 10);
    const state = range(true);
    for (let i = 0; i < 4; i++) killOne(state, 'spider');
    run(state, 4.1); // let the combo window and the flashes expire
    const before = state.score;
    state.gun = { col: 18, row: 10 };
    state.player.x = g.x;
    state.player.y = g.y;
    tick(state, DT, input(), constantRng(0.9));
    expect(state.score - before).toBe(BONUS_POINTS.fullClip);

    const miss = range(true);
    for (let i = 0; i < 3; i++) killOne(miss, 'spider');
    shoot(miss, 'E', 1.6); // a miss
    const before2 = miss.score;
    miss.gun = { col: 18, row: 10 };
    miss.player.x = g.x;
    miss.player.y = g.y;
    tick(miss, DT, input(), constantRng(0.9));
    expect(miss.score).toBe(before2);
  });

  it('counts a spread volley as one shot', () => {
    const state = range(true);
    state.buffs.spreadShots = 1;
    killOne(state, 'spider');
    expect(state.combo.clipShotsFired).toBe(1);
  });

  it('grants the no-bunker bonus for tier 2 only when the player stayed out of the bunker, once per gain', () => {
    const state = range(true);
    state.combo.currentTier = 1;
    state.combo.enteredBunkerThisTier = false;
    state.score = 14900;
    killOne(state, 'spider'); // 15,000: tier 2
    expect(state.score).toBe(15000 + BONUS_POINTS.noBunker);

    const visited = range(true);
    visited.combo.currentTier = 1;
    visited.combo.enteredBunkerThisTier = true;
    visited.score = 14900;
    killOne(visited, 'spider');
    expect(visited.score).toBe(15000);

    const jump = range(true);
    jump.combo.currentTier = 1;
    jump.score = 14000;
    addScore(jump, 20000); // tiers 2 and 3 at once
    tick(jump, DT, input(), constantRng(0.9));
    expect(jump.score).toBe(34000 + BONUS_POINTS.noBunker);
  });

  it('never grants the tier 1 no-bunker bonus: the run starts inside the bunker', () => {
    const state = newGame({ modern: true });
    freezeRoster(state);
    tick(state, DT, input(), constantRng(0.9)); // the player stands in the bunker at the start
    placePlayer(state, 5, 1);
    state.player.invulnTimer = 1e9;
    addScore(state, 5000); // tier 1
    tick(state, DT, input(), constantRng(0.9));
    expect(state.combo.currentTier).toBe(1);
    expect(state.score).toBe(5000);
  });

  it('cancels the no-bunker bonus of the current tier after a death (respawn in the bunker)', () => {
    const state = range(true);
    state.combo.currentTier = 1;
    state.combo.enteredBunkerThisTier = false;
    state.player.invulnTimer = 0;
    placeEnemy(state, 'gray', 5, 1); // robot contact: death
    tick(state, DT, input(), constantRng(0.9));
    expect(state.lives).toBe(5);
    state.enemies = [];
    run(state, 1); // respawn at the spawn point, inside the bunker
    expect(state.combo.enteredBunkerThisTier).toBe(true);
    state.score = 14900;
    placePlayer(state, 5, 1);
    state.player.invulnTimer = 1e9;
    state.player.hasGun = true;
    state.player.ammo = 6;
    killOne(state, 'spider'); // 15,000: tier 2
    expect(state.score).toBe(15000);
  });

  it('doubles kill points and bonuses under score x2', () => {
    const state = range(true);
    state.buffs.scoreMult = 2;
    state.buffs.scoreMultTimer = 30;
    state.player.ammo = 1;
    placeEnemy(state, 'spider', 8, 1);
    shoot(state);
    expect(state.score).toBe(2 * (100 + BONUS_POINTS.clutch));
  });
});
