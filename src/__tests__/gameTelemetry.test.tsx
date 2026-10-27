import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent } from '@react-native-firebase/analytics';
import { fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import { addScore, createGame } from '../game/engine';
import { POWERUP_KINDS } from '../game/powerups';
import { seededRng } from '../game/rng';
import { sanitizeParams } from '../telemetry/events';
import { frameEvents, gameOverParams, gameStartParams, powerUpParam, settingsChanges } from '../telemetry/gameTelemetry';
import { DEFAULT_SETTINGS } from '../storage/settings';

const realRaf = global.requestAnimationFrame;
beforeAll(() => {
  global.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;
});
afterAll(() => {
  global.requestAnimationFrame = realRaf;
});

describe('telemetry mapping (AC-05)', () => {
  it('describes the run start with the settings', () => {
    expect(gameStartParams(DEFAULT_SETTINGS)).toEqual({ modern: 'on', fire_mode: 'quadrants', controls: 'normal' });
    expect(gameStartParams({ ...DEFAULT_SETTINGS, fireMode: 'pointAndShoot', swapControls: true, modernMode: false })).toEqual({
      modern: 'off',
      fire_mode: 'point',
      controls: 'swapped',
    });
  });

  it('describes the run end', () => {
    expect(gameOverParams({ score: 15200, newBest: true, reason: 'lives', tier: 2, durationS: 312, modern: true })).toEqual({
      score: 15200,
      tier: 2,
      duration_s: 312,
      modern: 'on',
      reason: 'lives',
    });
  });

  it('sends one tier_reached per tier crossed, in order, and power-up kinds in snake case', () => {
    const state = createGame({ highScore: 0, modernMode: true, rng: seededRng(1) });
    state.events = [];
    addScore(state, 16000); // tiers 1 and 2 in one gain
    expect(frameEvents(state.events, 61.4)).toEqual([
      { name: 'tier_reached', params: { tier: 1, duration_s: 61 } },
      { name: 'tier_reached', params: { tier: 2, duration_s: 61 } },
    ]);
    expect(frameEvents([{ type: 'powerUpPickup', kind: 'scoreX2' }], 0)).toEqual([{ name: 'powerup_pickup', params: { kind: 'score_x2' } }]);
    for (const kind of POWERUP_KINDS) {
      const value = powerUpParam(kind);
      expect(sanitizeParams({ kind: value })).toEqual({ kind: value });
    }
  });

  it('lists one settings_change per changed setting', () => {
    expect(settingsChanges(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, fireMode: 'dpad', haptics: false })).toEqual([
      { setting: 'fire_mode', value: 'dpad' },
      { setting: 'haptics', value: 'off' },
    ]);
    expect(settingsChanges(DEFAULT_SETTINGS, DEFAULT_SETTINGS)).toEqual([]);
  });
});

describe('telemetry consent in the app (AC-05)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.mocked(logEvent).mockClear();
  });

  const names = () => jest.mocked(logEvent).mock.calls.map((c) => c[1]);

  async function playAndQuit() {
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-play'));
    await fireEvent.press(await screen.findByTestId('game-pause'));
    await fireEvent.press(screen.getByTestId('pause-quit'));
    await screen.findByTestId('game-over-screen');
  }

  it('sends game_start and game_over after consent', async () => {
    await AsyncStorage.setItem('telemetry.consent.v1', 'granted');
    await playAndQuit();
    expect(names()).toEqual(['game_start', 'game_over']);
    expect(jest.mocked(logEvent).mock.calls[1][2]).toMatchObject({ score: 0, tier: 0, reason: 'quit', modern: 'on' });
  });

  it('sends nothing without consent', async () => {
    await AsyncStorage.setItem('telemetry.consent.v1', 'denied');
    await playAndQuit();
    expect(names()).toEqual([]);
  });

  it('sends settings changes, and telemetry only when it is turned on', async () => {
    await AsyncStorage.setItem('telemetry.consent.v1', 'granted');
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-settings'));
    await fireEvent.press(screen.getByTestId('settings-fire-autoaim'));
    await fireEvent.press(screen.getByTestId('settings-language-en'));
    await fireEvent(screen.getByTestId('settings-telemetry'), 'valueChange', false);
    await fireEvent(screen.getByTestId('settings-sound'), 'valueChange', false);
    await fireEvent(screen.getByTestId('settings-telemetry'), 'valueChange', true);
    const params = jest.mocked(logEvent).mock.calls.map((c) => c[2]);
    expect(params).toEqual([
      { setting: 'fire_mode', value: 'autoaim' },
      { setting: 'language', value: 'en' },
      { setting: 'telemetry', value: 'on' },
    ]);
  });
});
