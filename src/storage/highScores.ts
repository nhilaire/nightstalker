import AsyncStorage from '@react-native-async-storage/async-storage';

import { HighScore, insertScore, sanitizeScores } from '../game/highScores';
import { reportError } from '../telemetry/telemetry';

const KEY = 'nightstalker.highscores.v1';

export async function loadHighScores(): Promise<HighScore[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? sanitizeScores(JSON.parse(raw)) : [];
  } catch (error) {
    reportError(error, 'load_high_scores');
    return [];
  }
}

// Saves every finished run (quit or not, 0 points included) and returns the updated list.
export async function addHighScore(score: number, date = new Date()): Promise<HighScore[]> {
  const updated = insertScore(await loadHighScores(), { score, date: date.toISOString() });
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch (error) {
    reportError(error, 'save_high_scores');
  }
  return updated;
}
