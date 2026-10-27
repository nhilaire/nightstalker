// Helpers for engine tests: a run with a pinned RNG, an optional frozen roster, and fixed-step simulation.
import { createGame, emptyInput, tick } from '../game/engine';
import { cellCenter } from '../game/maze';
import { constantRng, Rng, seededRng } from '../game/rng';
import * as spawn from '../game/spawn';
import { makeEnemy } from '../game/spawn';
import type { EnemyType, GameState, InputState } from '../game/types';

export const DT = 1 / 60;

export function newGame(opts: { modern?: boolean; highScore?: number; rng?: Rng } = {}): GameState {
  return createGame({ highScore: opts.highScore ?? 0, modernMode: opts.modern ?? true, rng: opts.rng ?? seededRng(1) });
}

// Stops the engine from spawning or removing enemies, and empties the maze: the test places what it needs.
export function freezeRoster(state: GameState): void {
  jest.spyOn(spawn, 'ensureRoster').mockImplementation(() => {});
  state.enemies = [];
}

export function input(partial: Partial<InputState> = {}): InputState {
  return { ...emptyInput(), ...partial };
}

export function run(state: GameState, seconds: number, inp: InputState = input(), rng: Rng = constantRng(0.99)): void {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) tick(state, DT, inp, rng);
}

// Places an active (not spawning) enemy at a cell centre.
export function placeEnemy(state: GameState, type: EnemyType, col: number, row: number, dir: 'N' | 'S' | 'E' | 'W' = 'E') {
  const c = cellCenter(col, row);
  const e = makeEnemy(state, type, c.x, c.y, constantRng(0.5));
  e.spawning = false;
  e.spawnTimer = 0;
  e.dir = dir;
  e.shootCooldown = 99;
  state.enemies.push(e);
  return e;
}

export function placePlayer(state: GameState, col: number, row: number) {
  const c = cellCenter(col, row);
  state.player.x = c.x;
  state.player.y = c.y;
  state.player.invulnTimer = 0;
  state.player.currentDir = null;
}

export function eventTypes(state: GameState): string[] {
  return state.events.map((e) => e.type);
}
