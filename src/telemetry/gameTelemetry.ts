// Maps game moments to the PRD telemetry events (pure, unit-tested). track() itself drops everything without consent.
import type { GameEvent, PowerUpKind, FireMode } from '../game/types';
import type { LanguageSetting } from '../i18n';
import type { RunResult } from '../screens/GameScreen';
import type { GameSettings } from '../storage/settings';
import type { FireModeParam, OnOff, PowerUpKindParam, SettingParam, SettingValueParam, TelemetryEvents } from './events';
import { track } from './telemetry';

const onOff = (v: boolean): OnOff => (v ? 'on' : 'off');

export function fireModeParam(mode: FireMode): FireModeParam {
  return mode === 'pointAndShoot' ? 'point' : mode;
}

export function powerUpParam(kind: PowerUpKind): PowerUpKindParam {
  return kind.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`) as PowerUpKindParam;
}

export function gameStartParams(settings: GameSettings): TelemetryEvents['game_start'] {
  return { modern: onOff(settings.modernMode), fire_mode: fireModeParam(settings.fireMode), controls: settings.swapControls ? 'swapped' : 'normal' };
}

export function gameOverParams(result: RunResult): TelemetryEvents['game_over'] {
  return {
    score: result.score,
    tier: Math.max(0, Math.min(5, result.tier)) as TelemetryEvents['game_over']['tier'],
    duration_s: result.durationS,
    modern: onOff(result.modern),
    reason: result.reason,
  };
}

type Tracked = { [N in keyof TelemetryEvents]: { name: N; params: TelemetryEvents[N] } }[keyof TelemetryEvents];

// Events of one frame that the PRD measures (tier reached, power-up picked up).
export function frameEvents(events: readonly GameEvent[], elapsedS: number): Tracked[] {
  const out: Tracked[] = [];
  for (const e of events) {
    if (e.type === 'tierReached' && e.tier >= 1 && e.tier <= 5) {
      out.push({ name: 'tier_reached', params: { tier: e.tier as 1 | 2 | 3 | 4 | 5, duration_s: Math.round(elapsedS) } });
    } else if (e.type === 'powerUpPickup') {
      out.push({ name: 'powerup_pickup', params: { kind: powerUpParam(e.kind) } });
    }
  }
  return out;
}

// One settings_change per setting that differs.
export function settingsChanges(before: GameSettings, after: GameSettings): TelemetryEvents['settings_change'][] {
  const out: { setting: SettingParam; value: SettingValueParam }[] = [];
  if (before.swapControls !== after.swapControls) out.push({ setting: 'swap', value: onOff(after.swapControls) });
  if (before.fireMode !== after.fireMode) out.push({ setting: 'fire_mode', value: fireModeParam(after.fireMode) });
  if (before.modernMode !== after.modernMode) out.push({ setting: 'modern', value: onOff(after.modernMode) });
  if (before.sound !== after.sound) out.push({ setting: 'sound', value: onOff(after.sound) });
  if (before.ambience !== after.ambience) out.push({ setting: 'ambience', value: onOff(after.ambience) });
  if (before.haptics !== after.haptics) out.push({ setting: 'haptics', value: onOff(after.haptics) });
  return out;
}

export function languageChange(value: LanguageSetting): TelemetryEvents['settings_change'] {
  return { setting: 'language', value };
}

export function trackAll(items: readonly Tracked[]): void {
  for (const item of items) track(item.name, item.params as never);
}
