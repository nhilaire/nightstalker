// Injectable random source: the engine never calls Math.random, so tests are deterministic.
export type Rng = () => number;

// Mulberry32: small, fast, good enough for gameplay. Returns a float in [0, 1).
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Always returns the same value: pins every random draw of a unit test.
export function constantRng(value: number): Rng {
  return () => value;
}

export function randomRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

// Integer in [min, max], both inclusive (source `randomInt`).
export function randomInt(rng: Rng, min: number, max: number): number {
  return Math.floor(randomRange(rng, min, max + 1));
}

// Uniform choice in a non-empty list.
export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}
