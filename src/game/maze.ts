// The single hedge maze (ported from the prototype) and tile helpers.
import { BUNKER_COL, BUNKER_DOOR_COL, BUNKER_H, BUNKER_HP, BUNKER_ROW, BUNKER_W, COLS, ROWS, TILE } from './constants';
import type { BunkerSegment } from './types';

export type TileType = '.' | '#' | 'W' | 'G';

// '#' wall, '.' corridor, 'W' web (slow zone), 'G' pen gate. The bunker cells are carved and rebuilt as segments.
export const MAZE_LAYOUT: readonly string[] = [
  '####################', // 00
  '#WWW#..............#', // 01
  '#WWW#.####.##.#.##.#', // 02
  '#.#.#.......#.#....#', // 03
  '#.#.#.#.....#.###.##', // 04 bunker top (cols 8-10)
  '#.#...#.....#......#', // 05 bunker bottom (cols 8-10)
  '#.#.#.#.......####.#', // 06
  '#.#.#.#.#####.#....#', // 07
  '#...#.......#...##.#', // 08
  '###.#.#####.#.####.#', // 09
  '#.G................#', // 10 pen (col 1) + gate (col 2)
  '####################', // 11
];

export type Maze = { tiles: TileType[][]; bunkerSegments: BunkerSegment[] };

export function buildMaze(): Maze {
  if (MAZE_LAYOUT.length !== ROWS) throw new Error(`maze has ${MAZE_LAYOUT.length} rows, expected ${ROWS}`);
  const tiles: TileType[][] = MAZE_LAYOUT.map((line, r) => {
    if (line.length !== COLS) throw new Error(`maze row ${r} has ${line.length} cols, expected ${COLS}`);
    return [...line].map((ch) => (ch === '#' || ch === 'W' || ch === 'G' ? ch : '.'));
  });
  for (let c = 0; c < COLS; c++) {
    tiles[0][c] = '#';
    tiles[ROWS - 1][c] = '#';
  }
  for (let r = 0; r < ROWS; r++) {
    tiles[r][0] = '#';
    tiles[r][COLS - 1] = '#';
  }
  for (let r = BUNKER_ROW; r < BUNKER_ROW + BUNKER_H; r++) {
    for (let c = BUNKER_COL; c < BUNKER_COL + BUNKER_W; c++) tiles[r][c] = '.';
  }
  // Approach corridor above the single door.
  tiles[BUNKER_ROW - 1][BUNKER_DOOR_COL] = '.';

  const bunkerSegments: BunkerSegment[] = [];
  for (let c = BUNKER_COL; c < BUNKER_COL + BUNKER_W; c++) {
    if (c !== BUNKER_DOOR_COL) bunkerSegments.push({ col: c, row: BUNKER_ROW, hp: BUNKER_HP });
  }
  for (let c = BUNKER_COL; c < BUNKER_COL + BUNKER_W; c++) {
    bunkerSegments.push({ col: c, row: BUNKER_ROW + BUNKER_H - 1, hp: BUNKER_HP });
  }
  return { tiles, bunkerSegments };
}

let cachedMaze: Maze | null = null;
export function getMaze(): Maze {
  if (!cachedMaze) cachedMaze = buildMaze();
  return cachedMaze;
}

function inGrid(col: number, row: number): boolean {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS;
}

export function isWallTile(tiles: TileType[][], col: number, row: number): boolean {
  return !inGrid(col, row) || tiles[row][col] === '#';
}

// Solid for the player, bats and spider; robots pass the gate (passGate).
export function isSolidTile(tiles: TileType[][], col: number, row: number, passGate = false): boolean {
  if (!inGrid(col, row)) return true;
  const t = tiles[row][col];
  return t === '#' || (t === 'G' && !passGate);
}

export function isWebTile(tiles: TileType[][], col: number, row: number): boolean {
  return inGrid(col, row) && tiles[row][col] === 'W';
}

// The door cell is the only free bunker cell: the player is "inside" there.
export function isInsideBunker(x: number, y: number): boolean {
  const cx = x / TILE;
  const cy = y / TILE;
  return cx > BUNKER_COL + 0.5 && cx < BUNKER_COL + BUNKER_W - 0.5 && cy > BUNKER_ROW - 0.5 && cy < BUNKER_ROW + BUNKER_H - 0.5;
}

export function spawnPoint(): { x: number; y: number } {
  return { x: BUNKER_DOOR_COL * TILE + TILE / 2, y: BUNKER_ROW * TILE + TILE / 2 };
}

export function cellCenter(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}
