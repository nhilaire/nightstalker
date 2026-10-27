import { BUNKER_HP, COLS, PLAYER_SPEED, PLAYER_WEB_SPEED, ROWS } from '../game/constants';
import { canPlayerEnter } from '../game/engine';
import { getMaze, isInsideBunker, MAZE_LAYOUT, spawnPoint } from '../game/maze';
import { freezeRoster, input, newGame, placePlayer, run } from '../test-utils/engine';

afterEach(() => jest.restoreAllMocks());

describe('maze (AC-08)', () => {
  it('is 20 x 12 with a wall border and the PRD layout outside the bunker', () => {
    const { tiles } = getMaze();
    expect(tiles).toHaveLength(ROWS);
    for (const row of tiles) expect(row).toHaveLength(COLS);
    for (let c = 0; c < COLS; c++) expect(tiles[0][c] + tiles[ROWS - 1][c]).toBe('##');
    for (let r = 0; r < ROWS; r++) expect(tiles[r][0] + tiles[r][COLS - 1]).toBe('##');
    expect(tiles[1].slice(1, 4).join('')).toBe('WWW');
    expect(tiles[10][2]).toBe('G');
    expect(MAZE_LAYOUT[7]).toBe('#.#.#.#.#####.#....#');
  });

  it('has 5 bunker segments of 3 HP, a free door cell and an open approach', () => {
    const { tiles, bunkerSegments } = getMaze();
    expect(bunkerSegments.map((s) => `${s.col},${s.row},${s.hp}`).sort()).toEqual(
      ['8,4', '10,4', '8,5', '9,5', '10,5'].map((c) => `${c},${BUNKER_HP}`).sort(),
    );
    expect(tiles[3][9]).toBe('.');
    expect(tiles[4][9]).toBe('.');
    const state = newGame();
    expect(canPlayerEnter(state, 9, 3)).toBe(true);
    expect(canPlayerEnter(state, 9, 4)).toBe(true);
    expect(spawnPoint()).toEqual({ x: 95, y: 45 });
    expect(isInsideBunker(95, 45)).toBe(true);
    expect(isInsideBunker(95, 35)).toBe(false);
  });
});

describe('player movement (AC-09, AC-10)', () => {
  it('moves 30 units per second along a corridor and stops when the stick is released', () => {
    const state = newGame();
    freezeRoster(state);
    placePlayer(state, 5, 1); // row 1 corridor from col 5 to col 18
    run(state, 0.5, input({ dir: { x: 1, y: 0 } }));
    expect(state.player.x).toBeCloseTo(55 + PLAYER_SPEED * 0.5, 0);
    const x = state.player.x;
    run(state, 0.2, input());
    expect(state.player.x).toBe(x);
    expect(state.player.currentDir).toBeNull();
  });

  it('moves at half speed in a web cell', () => {
    const state = newGame();
    freezeRoster(state);
    placePlayer(state, 1, 1);
    run(state, 0.3, input({ dir: { x: 1, y: 0 } }));
    expect(state.player.x).toBeCloseTo(15 + PLAYER_WEB_SPEED * 0.3, 0);
  });

  it('reverses at once on the same axis', () => {
    const state = newGame();
    freezeRoster(state);
    placePlayer(state, 10, 1);
    run(state, 0.25, input({ dir: { x: 1, y: 0 } }));
    const x = state.player.x;
    run(state, 1 / 60, input({ dir: { x: -1, y: 0 } }));
    expect(state.player.currentDir).toBe('W');
    expect(state.player.x).toBeLessThan(x);
  });

  it('turns perpendicular only at a cell centre whose next cell can be entered', () => {
    const state = newGame();
    freezeRoster(state);
    placePlayer(state, 5, 1); // col 5 opens south (row 2 col 5 is '.')
    run(state, 0.1, input({ dir: { x: 1, y: 0 } }));
    // Off centre, wanting south: keeps going east.
    run(state, 1 / 60, input({ dir: { x: 0, y: 1 } }));
    expect(state.player.currentDir).toBe('E');
    // Back at col 5 centre (from a stop), south is open.
    placePlayer(state, 5, 1);
    run(state, 0.1, input({ dir: { x: 0, y: 1 } }));
    expect(state.player.currentDir).toBe('S');
    // At col 6 centre south is a wall: the player does not turn.
    placePlayer(state, 6, 1);
    run(state, 0.1, input({ dir: { x: 0, y: 1 } }));
    expect(state.player.currentDir).toBeNull();
    expect(state.player.y).toBe(15);
  });

  it('stops at the cell centre in front of a wall, the gate or a bunker segment (AC-10)', () => {
    const state = newGame();
    freezeRoster(state);
    placePlayer(state, 18, 1);
    run(state, 0.5, input({ dir: { x: 1, y: 0 } }));
    expect(state.player.x).toBe(185);
    placePlayer(state, 3, 10); // gate at (2, 10) on the west
    run(state, 0.5, input({ dir: { x: -1, y: 0 } }));
    expect(state.player.x).toBe(35);
    placePlayer(state, 9, 4); // spawn cell, segment (9, 5) below
    run(state, 0.5, input({ dir: { x: 0, y: 1 } }));
    expect(state.player.y).toBe(45);
    expect(canPlayerEnter(state, 9, 5)).toBe(false);
    state.bunkerSegments.find((s) => s.col === 9 && s.row === 5)!.hp = 0;
    expect(canPlayerEnter(state, 9, 5)).toBe(true);
  });
});
