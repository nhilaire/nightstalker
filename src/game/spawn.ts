// Enemy roster by score tier, spawn positions and gun placement (ported from the prototype).
import {
  BAT_SPAWNS_FIRST,
  BAT_SPAWNS_SECOND,
  COLS,
  ENEMY_HP,
  ENEMY_SPAWN_TIME,
  GUN_SPAWNS,
  MAIN_BY_TIER,
  PEN_COL,
  PEN_ROW,
  ROWS,
  SPIDER_SPAWNS,
  TIER_THRESHOLDS,
} from './constants';
import { randomCardinal } from './ai';
import { dist2 } from './collisions';
import { cellCenter, getMaze, isInsideBunker, isWallTile } from './maze';
import { pick, Rng } from './rng';
import type { Enemy, EnemyType, GameState, Gun } from './types';

// Tier 0..5 for a score.
export function tierForScore(score: number): number {
  let tier = 0;
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) if (score >= TIER_THRESHOLDS[i]) tier = i + 1;
  return tier;
}

export function mainTypeForScore(score: number): EnemyType {
  return MAIN_BY_TIER[tierForScore(score)];
}

export function desiredRoster(score: number): EnemyType[] {
  const tier = tierForScore(score);
  const support: EnemyType[] = tier <= 1 ? ['bat', 'bat'] : ['gray', 'gray'];
  return ['spider', ...support, MAIN_BY_TIER[tier]];
}

export function makeEnemy(state: GameState, type: EnemyType, x: number, y: number, rng: Rng): Enemy {
  state.enemyIdCounter += 1;
  return {
    id: state.enemyIdCounter,
    type,
    x,
    y,
    hp: ENEMY_HP[type],
    dir: randomCardinal(rng),
    shootCooldown: 1 + rng() * 1.5,
    spawning: true,
    spawnTimer: ENEMY_SPAWN_TIME,
    shieldTimer: 0,
    stuckCheckX: x,
    stuckCheckY: y,
    stuckCheckTimer: 0,
    forceRandomTimer: 0,
    aliveTime: 0,
    // -1 forces a fresh decision on the first tick after spawning.
    lastTileCol: -1,
    lastTileRow: -1,
    pendingDecision: true,
  };
}

// Where a new enemy of this type appears.
export function spawnPosition(state: GameState, type: EnemyType, rng: Rng): { x: number; y: number } {
  if (type === 'spider') {
    const { tiles } = getMaze();
    const valid = SPIDER_SPAWNS.filter((c) => tiles[c.row][c.col] === 'W' || tiles[c.row][c.col] === '.');
    const c = valid.length ? pick(rng, valid) : SPIDER_SPAWNS[0];
    return cellCenter(c.col, c.row);
  }
  if (type === 'bat') {
    const existing = state.enemies.filter((e) => e.type === 'bat').length;
    const c = pick(rng, existing === 0 ? BAT_SPAWNS_FIRST : BAT_SPAWNS_SECOND);
    return cellCenter(c.col, c.row);
  }
  return cellCenter(PEN_COL, PEN_ROW);
}

// Spawns missing enemies and removes extra ones so that the roster matches the score, with the main carry-over and
// the tier-1 bat conversions.
export function ensureRoster(state: GameState, rng: Rng): void {
  const counts: Partial<Record<EnemyType, number>> = {};
  for (const e of state.enemies) counts[e.type] = (counts[e.type] ?? 0) + 1;
  const wanted: Partial<Record<EnemyType, number>> = {};
  for (const t of desiredRoster(state.score)) wanted[t] = (wanted[t] ?? 0) + 1;

  if (tierForScore(state.score) === 1) {
    wanted.bat = Math.max(0, (wanted.bat ?? 0) - state.bluePhaseConversions);
    wanted.gray = state.bluePhaseConversions;
  }

  const scoreMain = mainTypeForScore(state.score);
  if (state.activeMainType !== scoreMain) {
    wanted[scoreMain] = 0;
    wanted[state.activeMainType] = (wanted[state.activeMainType] ?? 0) + 1;
  }

  for (const t of Object.keys(wanted) as EnemyType[]) {
    const need = (wanted[t] ?? 0) - (counts[t] ?? 0);
    for (let i = 0; i < need; i++) {
      const pos = spawnPosition(state, t, rng);
      state.enemies.push(makeEnemy(state, t, pos.x, pos.y, rng));
    }
  }

  for (const t of Object.keys(counts) as EnemyType[]) {
    let extra = (counts[t] ?? 0) - (wanted[t] ?? 0);
    if (extra <= 0) continue;
    state.enemies = state.enemies.filter((e) => {
      if (e.type === t && extra > 0) {
        extra -= 1;
        return false;
      }
      return true;
    });
  }
}

// Among the gun spots minus the current one, the farthest from the player.
export function pickGunSpawn(state: GameState): Gun {
  const current = state.gun;
  const pool = current ? GUN_SPAWNS.filter((p) => p.col !== current.col || p.row !== current.row) : GUN_SPAWNS;
  let best = pool[0];
  let bestDist = -1;
  for (const p of pool) {
    const c = cellCenter(p.col, p.row);
    const d = dist2(c.x, c.y, state.player.x, state.player.y);
    if (d > bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return { col: best.col, row: best.row };
}

// A free corridor cell the player can reach: not a wall, the gate, the robot pen, the bunker or a standing segment.
export function isFreeCell(state: GameState, col: number, row: number): boolean {
  if (col < 1 || col >= COLS - 1 || row < 1 || row >= ROWS - 1) return false;
  const { tiles } = getMaze();
  if (isWallTile(tiles, col, row) || tiles[row][col] === 'G') return false;
  if (col === PEN_COL && row === PEN_ROW) return false;
  const c = cellCenter(col, row);
  if (isInsideBunker(c.x, c.y)) return false;
  return !state.bunkerSegments.some((s) => s.hp > 0 && s.col === col && s.row === row);
}
