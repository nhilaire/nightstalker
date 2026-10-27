// Which sound and haptic each engine event produces, filtered by the sound / vibrations settings (D1).
// Pure, unit-tested; src/audio/player.ts does the playback.
import type { GameEvent } from '../game/types';

export type SoundName = 'gun_spawn' | 'bonus_spawn' | 'explosion' | 'shield_bounce';
export type Haptic = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'double';

export type Feedback = { sounds: SoundName[]; haptics: Haptic[] };

export function feedbackFor(events: readonly GameEvent[], settings: { sound: boolean; haptics: boolean }): Feedback {
  const sounds = new Set<SoundName>();
  const haptics: Haptic[] = [];
  for (const e of events) {
    switch (e.type) {
      case 'shoot':
      case 'hit':
        haptics.push('light');
        break;
      case 'shieldBounce':
        haptics.push('light');
        sounds.add('shield_bounce');
        break;
      case 'kill':
        haptics.push('medium');
        sounds.add('explosion');
        break;
      case 'bunkerHit':
        haptics.push('medium');
        break;
      case 'death':
        haptics.push('heavy');
        sounds.add('explosion');
        break;
      case 'gunPickup':
      case 'powerUpPickup':
      case 'lifeBonus':
        haptics.push('success');
        break;
      case 'paralyze':
        haptics.push('warning');
        break;
      case 'powerUpAppear':
        haptics.push('double');
        sounds.add('bonus_spawn');
        break;
      case 'gunSpawn':
        haptics.push('light');
        sounds.add('gun_spawn');
        break;
    }
  }
  return { sounds: settings.sound ? [...sounds] : [], haptics: settings.haptics ? [...new Set(haptics)] : [] };
}

// Heartbeat asset for a tempo (seconds per loop), e.g. 1.65 -> 'heartbeat_165'.
export function heartbeatName(tempo: number): string {
  return `heartbeat_${Math.round(tempo * 100)}`;
}
