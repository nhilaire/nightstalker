import { PLAYER_INVULN_AFTER_RESPAWN, PLAYER_PARALYSIS, PLAYER_RESPAWN } from '../game/constants';
import { tick } from '../game/engine';
import { spawnPoint } from '../game/maze';
import { constantRng } from '../game/rng';
import type { GameState } from '../game/types';
import { DT, eventTypes, freezeRoster, input, newGame, placeEnemy, placePlayer, run } from '../test-utils/engine';

afterEach(() => jest.restoreAllMocks());

function setup(modern = false): GameState {
  const state = newGame({ modern });
  freezeRoster(state);
  jest.spyOn(require('../game/ai'), 'tickEnemy').mockImplementation(() => {});
  placePlayer(state, 5, 1);
  return state;
}

function enemyBulletAtPlayer(state: GameState) {
  state.bulletIdCounter += 1;
  state.bullets.push({
    id: state.bulletIdCounter,
    x: state.player.x + 10,
    y: state.player.y,
    vx: -45,
    vy: 0,
    source: 'enemy',
    variant: 'normal',
    ttl: 6,
    hitIds: [],
    killsCount: 0,
  });
}

describe('player hits (AC-22)', () => {
  it('loses a life on an enemy bullet, drops gun and bullets, then respawns at the spawn point, invulnerable', () => {
    const state = setup();
    state.player.hasGun = true;
    state.player.ammo = 3;
    state.gun = null;
    state.bullets.push({ id: 50, x: 30, y: 15, vx: -90, vy: 0, source: 'player', variant: 'normal', ttl: 6, hitIds: [], killsCount: 0 });
    enemyBulletAtPlayer(state);
    run(state, 0.3);
    expect(state.lives).toBe(5);
    expect(state.player.hasGun).toBe(false);
    expect(state.player.ammo).toBe(0);
    expect(state.gun).not.toBeNull();
    expect(state.bullets.filter((b) => b.source === 'player')).toHaveLength(0);
    expect(state.player.state).toBe('respawning');
    run(state, PLAYER_RESPAWN);
    expect(state.player.state).toBe('alive');
    expect({ x: state.player.x, y: state.player.y }).toEqual(spawnPoint());
    expect(state.player.invulnTimer).toBeGreaterThan(0);
    expect(state.player.invulnTimer).toBeLessThanOrEqual(PLAYER_INVULN_AFTER_RESPAWN);
  });

  it('dies when a robot touches it outside the bunker', () => {
    const state = setup();
    placeEnemy(state, 'gray', 5, 1);
    tick(state, DT, input(), constantRng(0.5));
    expect(state.lives).toBe(5);
    expect(eventTypes(state)).toContain('death');
  });

  it('is safe inside the bunker and while invulnerable', () => {
    const inBunker = setup();
    placePlayer(inBunker, 9, 4);
    placeEnemy(inBunker, 'gray', 9, 4);
    enemyBulletAtPlayer(inBunker);
    run(inBunker, 0.3);
    expect(inBunker.lives).toBe(6);

    const invuln = setup();
    invuln.player.invulnTimer = 1;
    placeEnemy(invuln, 'gray', 5, 1);
    enemyBulletAtPlayer(invuln);
    run(invuln, 0.3);
    expect(invuln.lives).toBe(6);
  });
});

describe('paralysis (AC-23)', () => {
  it('freezes the player 1 s on spider or bat contact; a new contact re-arms it', () => {
    const state = setup();
    state.player.hasGun = true;
    state.player.ammo = 6;
    const bat = placeEnemy(state, 'bat', 5, 1);
    tick(state, DT, input(), constantRng(0.5));
    expect(state.player.state).toBe('paralyzed');
    expect(eventTypes(state)).toContain('paralyze');
    bat.x = -50;
    run(state, PLAYER_PARALYSIS / 2, input({ dir: { x: 1, y: 0 }, fireRequested: true, fireDir: 'E' }));
    expect(state.player.x).toBe(55);
    expect(state.bullets).toHaveLength(0);
    // The paralysis timer only re-arms on contact while the player is alive (as in the prototype).
    run(state, PLAYER_PARALYSIS / 2 + 0.05);
    expect(state.player.state).toBe('alive');
    placeEnemy(state, 'spider', 5, 1);
    tick(state, DT, input(), constantRng(0.5));
    expect(state.player.state).toBe('paralyzed');
    expect(state.player.paralysisTimer).toBeCloseTo(PLAYER_PARALYSIS, 5);
  });

  it('lets enemy bullets kill a paralysed player', () => {
    const state = setup();
    state.player.state = 'paralyzed';
    state.player.paralysisTimer = 1;
    enemyBulletAtPlayer(state);
    run(state, 0.3);
    expect(state.lives).toBe(5);
  });
});

describe('game over (AC-24)', () => {
  it('ends the game 0.8 s after the last life is lost', () => {
    const state = setup();
    state.lives = 1;
    enemyBulletAtPlayer(state);
    run(state, 0.25);
    expect(state.lives).toBe(0);
    expect(state.phase).toBe('playing');
    run(state, PLAYER_RESPAWN);
    expect(state.phase).toBe('gameover');
    expect(state.endReason).toBe('lives');
  });
});
