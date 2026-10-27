// Enemy movement and firing (ported from the prototype; randomness injected).
import {
  BULLET_TTL,
  ENEMY_BULLET_SPEED,
  ENEMY_CENTER_TOL,
  ENEMY_PROBE,
  ENEMY_RADIUS,
  ENEMY_SHOOT_CD,
  ENEMY_SPEED,
  FORCE_RANDOM_TIME,
  LOS_TOL,
  LOS_TOL_INVISIBLE,
  SPIDER_ANCHOR,
  SPIDER_LEASH,
  STUCK_CHECK_EVERY,
  STUCK_MIN_MOVE,
  TILE,
} from './constants';
import { circleCollidesSolid } from './collisions';
import { getMaze, isInsideBunker } from './maze';
import { Rng } from './rng';
import type { BulletVariant, CardinalDir, Enemy, EnemyType, GameState } from './types';

const DIRS: { d: CardinalDir; dx: number; dy: number }[] = [
  { d: 'N', dx: 0, dy: -1 },
  { d: 'S', dx: 0, dy: 1 },
  { d: 'E', dx: 1, dy: 0 },
  { d: 'W', dx: -1, dy: 0 },
];

export function vecOf(d: CardinalDir): { dx: number; dy: number } {
  return DIRS.find((x) => x.d === d)!;
}

export function reverse(d: CardinalDir): CardinalDir {
  return d === 'N' ? 'S' : d === 'S' ? 'N' : d === 'E' ? 'W' : 'E';
}

export function isRobotType(t: EnemyType): boolean {
  return t !== 'spider' && t !== 'bat';
}

export function isTrackingType(t: EnemyType): boolean {
  return t === 'black1' || t === 'black2' || t === 'invisible';
}

export function hasReactiveShield(t: EnemyType): boolean {
  return t === 'white' || t === 'black1' || t === 'black2' || t === 'invisible';
}

export function randomCardinal(rng: Rng): CardinalDir {
  const r = rng();
  return r < 0.25 ? 'N' : r < 0.5 ? 'S' : r < 0.75 ? 'E' : 'W';
}

function canMove(state: GameState, e: Enemy, d: CardinalDir): boolean {
  const v = vecOf(d);
  return !circleCollidesSolid(state, e.x + v.dx * ENEMY_PROBE, e.y + v.dy * ENEMY_PROBE, ENEMY_RADIUS, isRobotType(e.type));
}

// Axis-aligned line of sight towards the player (or the decoy). Walls do not block the decision.
export function lineOfSight(state: GameState, e: Enemy): CardinalDir | null {
  if (state.modernMode && state.buffs.cloakTimer > 0) return null;
  const useDecoy = state.modernMode && state.buffs.decoyTimer > 0;
  const px = useDecoy ? state.buffs.decoyX : state.player.x;
  const py = useDecoy ? state.buffs.decoyY : state.player.y;
  const dx = px - e.x;
  const dy = py - e.y;
  const tol = e.type === 'invisible' ? LOS_TOL_INVISIBLE : LOS_TOL;
  if (Math.abs(dy) < tol) return dx > 0 ? 'E' : 'W';
  if (Math.abs(dx) < tol) return dy > 0 ? 'S' : 'N';
  return null;
}

// Greedy: the axis with the larger distance to the player first, avoiding reverse when possible.
export function trackingDir(state: GameState, e: Enemy): CardinalDir {
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  const candidates: CardinalDir[] =
    Math.abs(dx) > Math.abs(dy) ? [dx > 0 ? 'E' : 'W', dy > 0 ? 'S' : 'N'] : [dy > 0 ? 'S' : 'N', dx > 0 ? 'E' : 'W'];
  for (const c of candidates) {
    if (c !== reverse(e.dir) && canMove(state, e, c)) return c;
  }
  for (const c of candidates) {
    if (canMove(state, e, c)) return c;
  }
  return e.dir;
}

// Weighted random among enterable directions: forward 1.6, perpendicular 1.0, reverse 0.18.
export function patrolDir(state: GameState, e: Enemy, rng: Rng): CardinalDir {
  const choices: CardinalDir[] = [];
  const weights: number[] = [];
  const rev = reverse(e.dir);
  for (const c of DIRS) {
    if (!canMove(state, e, c.d)) continue;
    choices.push(c.d);
    weights.push(c.d === e.dir ? 1.6 : c.d === rev ? 0.18 : 1.0);
  }
  if (choices.length === 0) return rev;
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < choices.length; i++) {
    r -= weights[i];
    if (r <= 0) return choices[i];
  }
  return choices[choices.length - 1];
}

function canEnterTile(state: GameState, col: number, row: number, passGate: boolean): boolean {
  const { tiles } = getMaze();
  if (col < 0 || col >= tiles[0].length || row < 0 || row >= tiles.length) return false;
  const t = tiles[row][col];
  if (t === '#' || (t === 'G' && !passGate)) return false;
  return !state.bunkerSegments.some((s) => s.hp > 0 && s.col === col && s.row === row);
}

function hasPerpendicularOption(state: GameState, e: Enemy, col: number, row: number): boolean {
  const passGate = isRobotType(e.type);
  if (e.dir === 'N' || e.dir === 'S') return canEnterTile(state, col + 1, row, passGate) || canEnterTile(state, col - 1, row, passGate);
  return canEnterTile(state, col, row + 1, passGate) || canEnterTile(state, col, row - 1, passGate);
}

function spiderRoamDir(state: GameState, e: Enemy, rng: Rng): CardinalDir {
  const dx = e.x - SPIDER_ANCHOR.x;
  const dy = e.y - SPIDER_ANCHOR.y;
  if (dx * dx + dy * dy > SPIDER_LEASH * SPIDER_LEASH) {
    const d: CardinalDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'W' : 'E') : dy > 0 ? 'N' : 'S';
    if (canMove(state, e, d)) return d;
  }
  return patrolDir(state, e, rng);
}

export function pickDir(state: GameState, e: Enemy, rng: Rng): CardinalDir {
  if (e.type === 'spider') return spiderRoamDir(state, e, rng);
  if (!isTrackingType(e.type)) return patrolDir(state, e, rng);
  const cloaked = state.modernMode && state.buffs.cloakTimer > 0;
  if (cloaked || e.forceRandomTimer > 0) return patrolDir(state, e, rng);
  return trackingDir(state, e);
}

export function enemyBulletVariant(t: EnemyType): BulletVariant {
  return t === 'black2' ? 'yellow' : t === 'invisible' ? 'laser' : 'normal';
}

export function tickEnemy(state: GameState, e: Enemy, dt: number, rng: Rng): void {
  if (e.spawning) {
    e.spawnTimer -= dt;
    if (e.spawnTimer <= 0) e.spawning = false;
    return;
  }
  if (e.shieldTimer > 0) e.shieldTimer = Math.max(0, e.shieldTimer - dt);
  e.aliveTime += dt;

  e.stuckCheckTimer += dt;
  if (e.stuckCheckTimer > STUCK_CHECK_EVERY) {
    if (Math.hypot(e.x - e.stuckCheckX, e.y - e.stuckCheckY) <= STUCK_MIN_MOVE) {
      e.forceRandomTimer = FORCE_RANDOM_TIME;
      e.pendingDecision = true;
    }
    e.stuckCheckX = e.x;
    e.stuckCheckY = e.y;
    e.stuckCheckTimer = 0;
  }
  if (e.forceRandomTimer > 0) e.forceRandomTimer = Math.max(0, e.forceRandomTimer - dt);

  const passGate = isRobotType(e.type);
  const col = Math.floor(e.x / TILE);
  const row = Math.floor(e.y / TILE);
  const cx = col * TILE + TILE / 2;
  const cy = row * TILE + TILE / 2;

  if (e.lastTileCol !== col || e.lastTileRow !== row) {
    e.lastTileCol = col;
    e.lastTileRow = row;
    e.pendingDecision = true;
  }

  const atCenter = Math.abs(e.x - cx) < ENEMY_CENTER_TOL && Math.abs(e.y - cy) < ENEMY_CENTER_TOL;
  if (atCenter && e.pendingDecision) {
    e.pendingDecision = false;
    e.x = cx;
    e.y = cy;
    if (hasPerpendicularOption(state, e, col, row)) e.dir = pickDir(state, e, rng);
    else if (!canMove(state, e, e.dir)) e.dir = reverse(e.dir);
  }

  const v = vecOf(e.dir);
  const speed = ENEMY_SPEED[e.type];
  const vertical = e.dir === 'N' || e.dir === 'S';
  const nx = vertical ? cx : e.x + v.dx * speed * dt;
  const ny = vertical ? e.y + v.dy * speed * dt : cy;
  if (!circleCollidesSolid(state, nx, ny, ENEMY_RADIUS, passGate) && !isInsideBunker(nx, ny)) {
    e.x = nx;
    e.y = ny;
  } else {
    e.x = cx;
    e.y = cy;
    e.dir = reverse(e.dir);
    e.pendingDecision = true;
  }

  const base = ENEMY_SHOOT_CD[e.type];
  if (base !== undefined && !state.bullets.some((b) => b.source === 'enemy')) {
    e.shootCooldown -= dt;
    if (e.shootCooldown <= 0) {
      const los = lineOfSight(state, e);
      if (los) {
        spawnEnemyBullet(state, e, los);
        e.shootCooldown = base + rng() * 0.6;
      } else {
        e.shootCooldown = 0.3 + rng() * 0.4;
      }
    }
  }
}

function spawnEnemyBullet(state: GameState, e: Enemy, dir: CardinalDir): void {
  const v = vecOf(dir);
  state.bulletIdCounter += 1;
  state.bullets.push({
    id: state.bulletIdCounter,
    x: e.x + v.dx * (ENEMY_RADIUS + 2),
    y: e.y + v.dy * (ENEMY_RADIUS + 2),
    vx: v.dx * ENEMY_BULLET_SPEED,
    vy: v.dy * ENEMY_BULLET_SPEED,
    source: 'enemy',
    variant: enemyBulletVariant(e.type),
    ttl: BULLET_TTL,
    hitIds: [],
    shooterId: e.id,
    killsCount: 0,
  });
}
