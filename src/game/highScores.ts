// Local best-score list: the 10 best runs, score descending, equal scores in insertion order (stable sort).
export type HighScore = { score: number; date: string };

export const MAX_HIGH_SCORES = 10;

export function insertScore(list: readonly HighScore[], entry: HighScore): HighScore[] {
  // Array.prototype.sort is stable: an equal score inserted later stays after the earlier ones.
  return [...list, entry].sort((a, b) => b.score - a.score).slice(0, MAX_HIGH_SCORES);
}

export function bestOf(list: readonly HighScore[]): number {
  return list.length ? list[0].score : 0;
}

// Keeps only well-formed entries from stored data.
export function sanitizeScores(raw: unknown): HighScore[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is HighScore => typeof x?.score === 'number' && Number.isFinite(x.score) && typeof x?.date === 'string')
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HIGH_SCORES);
}
