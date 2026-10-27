// Circle vs tile / bunker segment collisions (ported from the prototype).
import { COLS, ROWS, TILE } from './constants';
import { getMaze, isSolidTile, isWallTile } from './maze';
import type { GameState } from './types';

function circleIntersectsTile(x: number, y: number, r: number, col: number, row: number): boolean {
  const tx = col * TILE;
  const ty = row * TILE;
  const closestX = Math.max(tx, Math.min(x, tx + TILE));
  const closestY = Math.max(ty, Math.min(y, ty + TILE));
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy < r * r;
}

// Circle collides with a solid tile (walls; the gate unless passGate) or a standing bunker segment.
export function circleCollidesSolid(state: GameState, x: number, y: number, r: number, passGate = false): boolean {
  const { tiles } = getMaze();
  const minCol = Math.max(0, Math.floor((x - r) / TILE));
  const maxCol = Math.min(COLS - 1, Math.floor((x + r) / TILE));
  const minRow = Math.max(0, Math.floor((y - r) / TILE));
  const maxRow = Math.min(ROWS - 1, Math.floor((y + r) / TILE));
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (isSolidTile(tiles, col, row, passGate) && circleIntersectsTile(x, y, r, col, row)) return true;
    }
  }
  for (const seg of state.bunkerSegments) {
    if (seg.hp > 0 && circleIntersectsTile(x, y, r, seg.col, seg.row)) return true;
  }
  return false;
}

export function bulletHitsBunker(state: GameState, x: number, y: number, r: number): { col: number; row: number } | null {
  for (const seg of state.bunkerSegments) {
    if (seg.hp > 0 && circleIntersectsTile(x, y, r, seg.col, seg.row)) return { col: seg.col, row: seg.row };
  }
  return null;
}

export function bulletHitsWall(x: number, y: number, r: number): boolean {
  const { tiles } = getMaze();
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (isWallTile(tiles, col + dc, row + dr) && circleIntersectsTile(x, y, r, col + dc, row + dr)) return true;
    }
  }
  return false;
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function circlesOverlap(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  return dist2(ax, ay, bx, by) < (ar + br) * (ar + br);
}
