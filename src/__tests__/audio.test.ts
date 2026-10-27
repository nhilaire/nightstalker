import fs from 'fs';
import path from 'path';

import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

import { feedbackFor, heartbeatName } from '../audio/feedback';
import { Heartbeat, playFeedback } from '../audio/player';
import { HEARTBEAT_TEMPO } from '../game/constants';
import type { GameEvent } from '../game/types';

const SFX = path.join(__dirname, '../../assets/sfx');

describe('generated sounds (AC-47)', () => {
  const files = fs.readdirSync(SFX).filter((f) => f.endsWith('.wav'));

  it('has every sound the game plays, one heartbeat per main-robot tempo', () => {
    const expected = ['gun_spawn', 'bonus_spawn', 'explosion', 'shield_bounce', ...new Set(Object.values(HEARTBEAT_TEMPO).map(heartbeatName))];
    expect(files.map((f) => f.replace('.wav', '')).sort()).toEqual(expected.sort());
  });

  it.each(fs.readdirSync(SFX).filter((f) => f.endsWith('.wav')))('%s is a valid, non-silent 16-bit PCM WAV', (file) => {
    const buf = fs.readFileSync(path.join(SFX, file));
    expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
    expect(buf.readUInt32LE(4)).toBe(buf.length - 8);
    expect(buf.toString('ascii', 8, 12)).toBe('WAVE');
    expect(buf.toString('ascii', 12, 16)).toBe('fmt ');
    expect(buf.readUInt16LE(20)).toBe(1);
    expect(buf.readUInt16LE(34)).toBe(16);
    expect(buf.toString('ascii', 36, 40)).toBe('data');
    expect(buf.readUInt32LE(40)).toBe(buf.length - 44);
    let peak = 0;
    for (let i = 44; i < buf.length; i += 2) peak = Math.max(peak, Math.abs(buf.readInt16LE(i)));
    expect(peak).toBeGreaterThan(3000);
  });
});

describe('feedback policy (AC-40, D1)', () => {
  const events: GameEvent[] = [
    { type: 'shoot' },
    { type: 'kill', enemy: 'gray', byPlayer: true },
    { type: 'death' },
    { type: 'powerUpAppear' },
    { type: 'gunSpawn' },
    { type: 'shieldBounce' },
    { type: 'paralyze' },
    { type: 'lifeBonus' },
  ];

  it('plays sounds and haptics when both are on', () => {
    const f = feedbackFor(events, { sound: true, haptics: true });
    expect(f.sounds.sort()).toEqual(['bonus_spawn', 'explosion', 'gun_spawn', 'shield_bounce']);
    expect(f.haptics.sort()).toEqual(['double', 'heavy', 'light', 'medium', 'success', 'warning']);
  });

  it('plays no sound with sound effects off, no haptic with vibrations off', () => {
    expect(feedbackFor(events, { sound: false, haptics: true }).sounds).toEqual([]);
    expect(feedbackFor(events, { sound: true, haptics: false }).haptics).toEqual([]);
  });

  it('triggers expo-audio and expo-haptics accordingly', () => {
    jest.mocked(createAudioPlayer).mockClear();
    jest.mocked(Haptics.impactAsync).mockClear();
    playFeedback({ sounds: ['explosion'], haptics: ['heavy'] });
    expect(createAudioPlayer).toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
    jest.mocked(Haptics.impactAsync).mockClear();
    playFeedback({ sounds: [], haptics: [] });
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});

describe('heartbeat ambience (AC-34, AC-40)', () => {
  beforeEach(() => jest.mocked(createAudioPlayer).mockClear());

  it('loops the tempo of the main robot and switches when it changes', () => {
    const hb = new Heartbeat(true);
    hb.start(HEARTBEAT_TEMPO.gray);
    const first = jest.mocked(createAudioPlayer).mock.results.at(-1)?.value;
    expect(first.loop).toBe(true);
    expect(first.play).toHaveBeenCalled();
    hb.setTempo(HEARTBEAT_TEMPO.white);
    expect(first.pause).toHaveBeenCalled();
    hb.setPaused(true);
    hb.stop();
  });

  it('stays silent with ambience off', () => {
    const hb = new Heartbeat(false);
    hb.start(1.8);
    hb.setTempo(1.5);
    hb.setPaused(false);
    expect(createAudioPlayer).not.toHaveBeenCalled();
  });

  it('names the loop of each tempo', () => {
    expect(heartbeatName(1.65)).toBe('heartbeat_165');
    expect(heartbeatName(1.05)).toBe('heartbeat_105');
  });
});
