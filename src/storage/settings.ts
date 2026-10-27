import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FireMode } from '../game/types';
import { reportError } from '../telemetry/telemetry';

// Game settings (language and telemetry consent are stored separately by the factory overlay).
export type GameSettings = {
  swapControls: boolean;
  fireMode: FireMode;
  modernMode: boolean;
  sound: boolean;
  ambience: boolean;
  haptics: boolean;
};

export const DEFAULT_SETTINGS: GameSettings = {
  swapControls: false,
  fireMode: 'quadrants',
  modernMode: true,
  sound: true,
  ambience: true,
  haptics: true,
};

const KEY = 'nightstalker.settings.v1';
const FIRE_MODES: FireMode[] = ['quadrants', 'dpad', 'autoaim', 'pointAndShoot'];

export function sanitizeSettings(raw: unknown): GameSettings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const bool = (key: keyof GameSettings) => (typeof s[key] === 'boolean' ? (s[key] as boolean) : (DEFAULT_SETTINGS[key] as boolean));
  return {
    swapControls: bool('swapControls'),
    fireMode: FIRE_MODES.includes(s.fireMode as FireMode) ? (s.fireMode as FireMode) : DEFAULT_SETTINGS.fireMode,
    modernMode: bool('modernMode'),
    sound: bool('sound'),
    ambience: bool('ambience'),
    haptics: bool('haptics'),
  };
}

export async function loadSettings(): Promise<GameSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? sanitizeSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch (error) {
    reportError(error, 'load_settings');
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: GameSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch (error) {
    reportError(error, 'save_settings');
  }
}
