// Pixel-art sprites (ported from the prototype, drawn from scratch: no asset from the original game).
// '.' is transparent, other characters map to colours through the palette. 1 sprite pixel = 1 logical unit.
import { Skia, SkPath } from '@shopify/react-native-skia';

export type SpriteDef = { width: number; height: number; pixels: string[]; palette: Record<string, string> };

function s(pixels: string[], palette: Record<string, string>): SpriteDef {
  return { width: pixels[0].length, height: pixels.length, pixels, palette };
}

export const PLAYER = s(['..XXXX..', '.X.XX.X.', '..XXXX..', '.XXXXXX.', 'XXXXXXXX', '.XXXXXX.', '..X..X..', '.XX..XX.'], { X: '#FDE68A' });
export const PLAYER_PARALYZED = s(PLAYER.pixels, { X: '#FCA5A5' });

export const SPIDER = s(['X......X', 'XX....XX', '.XXXXXX.', '.XEEEEX.', '.XEEEEX.', '.XXXXXX.', 'XX....XX', 'X......X'], {
  X: '#FACC15',
  E: '#1F2937',
});

export const BAT = s(['XX....XX', 'XXX..XXX', 'XXXXXXXX', '.XXXXXX.', '.XEXXEX.', '..XXXX..', '...XX...', '........'], {
  X: '#1E1B4B',
  E: '#FACC15',
});

function robot(body: string, eye: string): SpriteDef {
  return s(['.XXXXXX.', 'XXXXXXXX', 'XX.EE.XX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XX.XX.XX', 'XX.XX.XX'], { X: body, E: eye });
}

export const ROBOT_GRAY = robot('#CBD5E1', '#7F1D1D');
export const ROBOT_BLUE = robot('#60A5FA', '#FACC15');
export const ROBOT_WHITE = s(['.X....X.', '.X....X.', 'XXXXXXXX', 'XX.EE.XX', 'XXXXXXXX', '.XXXXXX.', 'XXXXXXXX', 'XX....XX'], {
  X: '#F8FAFC',
  E: '#1E40AF',
});
export const ROBOT_BLACK_1 = s(['X......X', '.X....X.', '.XXXXXX.', 'XXXXXXXX', 'XX.EE.XX', 'XXXXXXXX', '.XXXXXX.', 'X.X..X.X'], {
  X: '#475569',
  E: '#FCA5A5',
});
export const ROBOT_BLACK_2 = robot('#475569', '#F59E0B');
// Near-invisible on the blue floor; revealed in light colours by the x-ray power-up.
export const ROBOT_INVISIBLE = robot('#1E3A8A', '#1E3A8A');
export const ROBOT_INVISIBLE_XRAY = robot('#93C5FD', '#F87171');

export const GUN = s(['.XXXXX..', '.X...XX.', '.XXXXXX.', '..X.X...', '..XXX...', '...X....'], { X: '#FACC15' });

// Tiny 3x5 bitmap font for the power-up glyphs.
export const FONT_3X5: Record<string, string[]> = {
  S: ['111', '100', '111', '001', '111'],
  F: ['111', '100', '111', '100', '100'],
  C: ['111', '100', '100', '100', '111'],
  R: ['110', '101', '110', '101', '101'],
  P: ['110', '101', '110', '100', '100'],
  '3': ['111', '001', '011', '001', '111'],
  H: ['101', '101', '111', '101', '101'],
  O: ['111', '101', '101', '101', '111'],
  '+': ['000', '010', '111', '010', '000'],
  B: ['110', '101', '110', '101', '110'],
  '~': ['000', '110', '011', '000', '000'],
  D: ['110', '101', '101', '101', '110'],
  '2': ['111', '001', '111', '100', '111'],
  A: ['010', '101', '111', '101', '101'],
  M: ['101', '111', '111', '101', '101'],
  '*': ['101', '010', '111', '010', '101'],
  E: ['111', '100', '110', '100', '111'],
  X: ['101', '101', '010', '101', '101'],
  '?': ['111', '001', '011', '000', '010'],
};

// One path per palette colour, centred on (0, 0): a sprite is drawn with a translate and a few drawPath calls.
export type CompiledSprite = { parts: { color: string; path: SkPath }[] };

const compiled = new Map<SpriteDef, CompiledSprite>();

export function compile(def: SpriteDef): CompiledSprite {
  const hit = compiled.get(def);
  if (hit) return hit;
  const x0 = -def.width / 2;
  const y0 = -def.height / 2;
  const parts = Object.entries(def.palette).map(([ch, color]) => {
    const path = Skia.Path.Make();
    def.pixels.forEach((row, r) => {
      [...row].forEach((c, col) => {
        if (c === ch) path.addRect(Skia.XYWHRect(x0 + col, y0 + r, 1, 1));
      });
    });
    return { color, path };
  });
  const sprite = { parts };
  compiled.set(def, sprite);
  return sprite;
}
