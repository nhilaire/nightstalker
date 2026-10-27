// Debug cheats kept from the prototype: 3 quick taps in a top corner. Enabled only in debug builds (__DEV__), so a
// release APK has no cheat zone.
import { GUN_AMMO, LIFE_BONUS_EVERY } from './constants';
import type { GameState } from './types';

export type Cheat = 'lives' | 'score';

export const CHEAT_TAP_WINDOW_MS = 800;
export const CHEAT_SCORE = 5000;

export class CheatDetector {
  private taps: Record<Cheat, number[]> = { lives: [], score: [] };

  // Returns the cheat triggered by this tap, if any (3 taps of the same corner within 800 ms).
  tap(cheat: Cheat, nowMs: number): Cheat | null {
    const recent = [...this.taps[cheat], nowMs].filter((t) => nowMs - t < CHEAT_TAP_WINDOW_MS);
    if (recent.length >= 3) {
      this.taps[cheat] = [];
      return cheat;
    }
    this.taps[cheat] = recent;
    return null;
  }
}

// Top-right: +2 lives and a full gun. Top-left: +5,000 points (with life bonuses), to jump a tier.
export function applyCheat(state: GameState, cheat: Cheat): void {
  if (state.phase !== 'playing') return;
  if (cheat === 'lives') {
    state.lives += 2;
    state.player.hasGun = true;
    state.player.ammo = GUN_AMMO;
    state.gun = null;
    state.flashLifeBonus = 1.5;
    return;
  }
  state.score += CHEAT_SCORE;
  if (state.score > state.highScore) state.newHighScore = true;
  while (state.score >= state.nextLifeAt) {
    state.lives += 1;
    state.flashLifeBonus = 1.5;
    state.nextLifeAt += LIFE_BONUS_EVERY;
  }
}
