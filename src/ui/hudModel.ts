// What the HUD shows, computed from the game state (pure, unit-tested).
import { POWERUP_DEFS } from '../game/powerups';
import type { FlashLabel, GameState, PowerUpKind } from '../game/types';
import type { Strings } from '../i18n';

export function pad6(value: number): string {
  return String(Math.max(0, Math.floor(value))).padStart(6, '0');
}

export type BuffChip = { kind: PowerUpKind; ratio?: number; charges?: number };

// Active timed buffs (with remaining ratio) and per-shot charges, in the prototype's order.
export function activeBuffs(state: GameState): BuffChip[] {
  if (!state.modernMode) return [];
  const b = state.buffs;
  const out: BuffChip[] = [];
  const timer = (kind: PowerUpKind, remain: number) => {
    if (remain > 0) out.push({ kind, ratio: Math.min(1, remain / POWERUP_DEFS[kind].duration!) });
  };
  const charge = (kind: PowerUpKind, charges: number) => {
    if (charges > 0) out.push({ kind, charges });
  };
  timer('slowMo', b.slowMoTimer);
  timer('freeze', b.freezeTimer);
  timer('cloak', b.cloakTimer);
  timer('rapidFire', b.rapidFireTimer);
  timer('phaseWalk', b.phaseWalkTimer);
  timer('xray', b.xrayTimer);
  timer('scoreX2', b.scoreMultTimer);
  timer('decoy', b.decoyTimer);
  charge('piercing', b.piercingShots);
  charge('spread', b.spreadShots);
  charge('heavy', b.heavyShots);
  charge('boomerang', b.boomerangShots);
  charge('shield', b.shieldHits);
  return out;
}

// The bonus / power-up / curse flash: a bonus shows its points, a power-up only its label (D3).
export function flashText(flash: FlashLabel | null, t: Strings): string | null {
  if (!flash) return null;
  if (flash.kind === 'powerup') return t.powerups[flash.powerUp].label;
  if (flash.kind === 'curse') return t.curse[flash.curse];
  const label = t.bonus[flash.bonus];
  return flash.points > 0 ? `${label} +${flash.points}` : label;
}
