// Plays the generated sounds (assets/sfx, made by scripts/generate-sfx.mjs), the heartbeat ambience loop and the
// haptics. One expo-audio player per sound, created lazily; failures are ignored (no sound is better than a crash).
// The first load of each sound is logged (SOUND_LOADED <name>) so that logcat proves playback on the phone.
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

import { Feedback, Haptic, heartbeatName, SoundName } from './feedback';

const SOURCES: Record<string, number> = {
  gun_spawn: require('../../assets/sfx/gun_spawn.wav'),
  bonus_spawn: require('../../assets/sfx/bonus_spawn.wav'),
  explosion: require('../../assets/sfx/explosion.wav'),
  shield_bounce: require('../../assets/sfx/shield_bounce.wav'),
  heartbeat_180: require('../../assets/sfx/heartbeat_180.wav'),
  heartbeat_165: require('../../assets/sfx/heartbeat_165.wav'),
  heartbeat_150: require('../../assets/sfx/heartbeat_150.wav'),
  heartbeat_135: require('../../assets/sfx/heartbeat_135.wav'),
  heartbeat_120: require('../../assets/sfx/heartbeat_120.wav'),
  heartbeat_105: require('../../assets/sfx/heartbeat_105.wav'),
};

const VOLUME: Record<SoundName, number> = { gun_spawn: 0.7, bonus_spawn: 0.7, explosion: 0.8, shield_bounce: 0.95 };

const players = new Map<string, AudioPlayer>();
let modeSet = false;

function ensureMode(): void {
  if (modeSet) return;
  modeSet = true;
  // Media plays whatever the ringer mode (with false, expo-audio mutes everything on a phone in vibrate mode);
  // the in-game switches are the mute.
  setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
}

function player(name: string): AudioPlayer | null {
  let p = players.get(name);
  if (!p) {
    const source = SOURCES[name];
    if (source === undefined) return null;
    p = createAudioPlayer(source);
    players.set(name, p);
    console.log(`SOUND_LOADED ${name}`);
  }
  return p;
}

export function playSound(name: SoundName): void {
  try {
    ensureMode();
    const p = player(name);
    if (!p) return;
    p.volume = VOLUME[name];
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // audio is optional
  }
}

function vibrate(h: Haptic): void {
  const run = (fn: () => Promise<void>) => fn().catch(() => {});
  if (h === 'light') run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  else if (h === 'medium') run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  else if (h === 'heavy') run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  else if (h === 'success') run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  else if (h === 'warning') run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  else {
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    setTimeout(() => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)), 120);
  }
}

export function playFeedback(feedback: Feedback): void {
  for (const s of feedback.sounds) playSound(s);
  for (const h of feedback.haptics) vibrate(h);
}

// The ambience: a looping heartbeat whose tempo follows the main robot (D1: its own switch).
export class Heartbeat {
  private current: AudioPlayer | null = null;
  private tempo = 1.8;
  private paused = false;

  constructor(private enabled: boolean) {}

  start(tempo: number): void {
    this.tempo = tempo;
    if (this.enabled) this.play();
  }

  setTempo(tempo: number): void {
    if (Math.abs(tempo - this.tempo) < 0.01) return;
    this.tempo = tempo;
    if (this.enabled && this.current) {
      this.current.pause();
      this.play();
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!this.current) return;
    if (paused) this.current.pause();
    else this.current.play();
  }

  stop(): void {
    this.current?.pause();
    this.current = null;
  }

  private play(): void {
    try {
      ensureMode();
      const p = player(heartbeatName(this.tempo));
      if (!p) return;
      p.loop = true;
      p.volume = 0.5;
      this.current = p;
      p.seekTo(0).catch(() => {});
      if (!this.paused) p.play();
    } catch {
      // audio is optional
    }
  }
}
