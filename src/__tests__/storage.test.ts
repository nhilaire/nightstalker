import AsyncStorage from '@react-native-async-storage/async-storage';

import { bestOf, insertScore } from '../game/highScores';
import { addHighScore, loadHighScores } from '../storage/highScores';
import { DEFAULT_SETTINGS, loadSettings, sanitizeSettings, saveSettings } from '../storage/settings';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('high scores (AC-36)', () => {
  it('keeps the 10 best of 12 runs, in descending order', async () => {
    const scores = [500, 0, 1200, 300, 900, 4000, 100, 700, 2500, 50, 800, 600];
    for (const s of scores) await addHighScore(s);
    const list = await loadHighScores();
    expect(list.map((h) => h.score)).toEqual([4000, 2500, 1200, 900, 800, 700, 600, 500, 300, 100]);
    expect(bestOf(list)).toBe(4000);
  });

  it('keeps equal scores in insertion order and saves 0-point runs', () => {
    const a = insertScore([], { score: 300, date: 'a' });
    const b = insertScore(a, { score: 300, date: 'b' });
    const c = insertScore(b, { score: 0, date: 'c' });
    expect(c.map((h) => h.date)).toEqual(['a', 'b', 'c']);
    expect(bestOf([])).toBe(0);
  });

  it('ignores corrupted storage', async () => {
    await AsyncStorage.setItem('nightstalker.highscores.v1', '{not json');
    expect(await loadHighScores()).toEqual([]);
    await AsyncStorage.setItem('nightstalker.highscores.v1', JSON.stringify([{ score: 'x' }, { score: 5, date: 'd' }]));
    expect(await loadHighScores()).toEqual([{ score: 5, date: 'd' }]);
  });
});

describe('game settings (AC-38)', () => {
  it('defaults to quadrants, modern mode and every output on', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({ swapControls: false, fireMode: 'quadrants', modernMode: true, sound: true, ambience: true, haptics: true });
  });

  it('round-trips and sanitizes stored values', async () => {
    const changed = { swapControls: true, fireMode: 'autoaim' as const, modernMode: false, sound: false, ambience: false, haptics: false };
    await saveSettings(changed);
    expect(await loadSettings()).toEqual(changed);
    expect(sanitizeSettings({ fireMode: 'laser', sound: 'yes' })).toEqual(DEFAULT_SETTINGS);
  });
});
