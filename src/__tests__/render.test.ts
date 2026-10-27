import { createGame } from '../game/engine';
import { seededRng } from '../game/rng';
import { drawScene, fitView } from '../render/scene';

describe('renderer', () => {
  it('fits the 200 x 120 field in the screen, centred', () => {
    expect(fitView(800, 360)).toEqual({ scale: 3, width: 800, height: 360, offsetX: 100, offsetY: 0 });
    expect(fitView(400, 400)).toEqual({ scale: 2, width: 400, height: 400, offsetX: 0, offsetY: 80 });
  });

  it('draws a scene without throwing (Skia is mocked: the pixels are proven by Maestro screenshots)', () => {
    const state = createGame({ highScore: 0, modernMode: true, rng: seededRng(1) });
    state.powerUps.push({ id: 1, kind: 'scoreX2', col: 18, row: 1, ttl: 3 });
    state.buffs.xrayTimer = 5;
    const canvas = new Proxy({}, { get: () => () => undefined });
    expect(() => drawScene(canvas as never, state, fitView(800, 360), 1.234)).not.toThrow();
  });
});
