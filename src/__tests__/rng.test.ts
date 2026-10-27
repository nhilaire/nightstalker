import { constantRng, pick, randomInt, randomRange, seededRng } from '../game/rng';

describe('rng', () => {
  it('is deterministic for a seed and stays in [0, 1)', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('maps draws to ranges, integers and picks', () => {
    expect(randomRange(constantRng(0.5), 22, 38)).toBe(30);
    expect(randomInt(constantRng(0.99), 1, 3)).toBe(3);
    expect(pick(constantRng(0), ['a', 'b'])).toBe('a');
    expect(pick(constantRng(0.99), ['a', 'b'])).toBe('b');
  });
});
