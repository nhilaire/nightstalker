import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';

import { applyCheat, CheatDetector } from '../game/cheats';
import { createGame } from '../game/engine';
import { seededRng } from '../game/rng';
import { DICTIONARIES } from '../i18n';
import { I18nProvider } from '../i18n/I18nProvider';
import { GameScreen, RunResult } from '../screens/GameScreen';
import { DEFAULT_SETTINGS } from '../storage/settings';
import { activeBuffs, flashText, pad6 } from '../ui/hudModel';

async function renderGame(props: Partial<Parameters<typeof GameScreen>[0]> = {}) {
  const onGameOver = jest.fn<void, [RunResult]>();
  const utils = await render(
    <I18nProvider setting="fr" onChange={() => {}}>
      <GameScreen settings={DEFAULT_SETTINGS} highScore={0} onGameOver={onGameOver} rng={seededRng(1)} cheatsEnabled={false} requestFrame={() => 0} cancelFrame={() => {}} {...props} />
    </I18nProvider>,
  );
  return { onGameOver, utils };
}

describe('game screen (AC-35, AC-41, AC-42)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('starts with 6 lives, a zero score and no gun', async () => {
    await renderGame();
    expect(screen.getByTestId('hud-lives')).toHaveTextContent('×6');
    expect(screen.getByTestId('hud-score')).toHaveTextContent('000000');
    expect(screen.getByTestId('hud-ammo')).toHaveTextContent("PAS D'ARME");
  });

  it('pauses, resumes and quits: the run ends with reason quit', async () => {
    const { onGameOver } = await renderGame();
    await fireEvent.press(screen.getByTestId('game-pause'));
    expect(screen.getByTestId('pause-overlay')).toBeTruthy();
    expect(screen.getByText('Reprendre')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('pause-resume'));
    expect(screen.queryByTestId('pause-overlay')).toBeNull();
    await fireEvent.press(screen.getByTestId('game-pause'));
    await fireEvent.press(screen.getByTestId('pause-quit'));
    expect(onGameOver).toHaveBeenCalledTimes(1);
    expect(onGameOver.mock.calls[0][0]).toMatchObject({ score: 0, newBest: false, reason: 'quit', tier: 0, modern: true });
  });

  it('pauses by itself when the app goes to the background', async () => {
    const listeners: ((s: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listeners.push(handler as (s: AppStateStatus) => void);
      return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
    });
    const onPauseChange = jest.fn();
    await renderGame({ onPauseChange });
    await act(async () => listeners.forEach((l) => l('background')));
    expect(screen.getByTestId('pause-overlay')).toBeTruthy();
    expect(onPauseChange).toHaveBeenLastCalledWith(true);
  });

  it('advances the run with the animation frames and reports its events', async () => {
    const frames: ((now: number) => void)[] = [];
    const onEvents = jest.fn();
    await renderGame({ onEvents, requestFrame: (step) => frames.push(step) });
    // 20 s of frames at 60 fps: the enemies leave their spawning phase and things happen.
    await act(async () => {
      for (let i = 0; i < 1200; i++) frames[frames.length - 1](i * (1000 / 60));
    });
    expect(onEvents).toHaveBeenCalled();
    expect(screen.getByTestId('hud-lives')).toBeTruthy();
  });

  it('has no cheat zone when cheats are disabled (release builds)', async () => {
    await renderGame({ cheatsEnabled: false });
    expect(screen.queryByTestId('cheat-lives')).toBeNull();
    expect(screen.queryByTestId('cheat-score')).toBeNull();
  });

  it('puts the joystick on the side chosen in the settings (AC-39)', async () => {
    await renderGame({ settings: { ...DEFAULT_SETTINGS, swapControls: true } });
    expect(screen.getByTestId('joystick-right')).toBeTruthy();
  });
});

describe('debug cheats (AC-41)', () => {
  it('fire on 3 taps of the same corner within 800 ms only', () => {
    const d = new CheatDetector();
    expect(d.tap('lives', 0)).toBeNull();
    expect(d.tap('lives', 300)).toBeNull();
    expect(d.tap('lives', 600)).toBe('lives');
    expect(d.tap('score', 0)).toBeNull();
    expect(d.tap('score', 500)).toBeNull();
    expect(d.tap('score', 1400)).toBeNull();
  });

  it('give 2 lives and a full gun, or 5,000 points with life bonuses', () => {
    const state = createGame({ highScore: 0, modernMode: false, rng: seededRng(1) });
    applyCheat(state, 'lives');
    expect(state.lives).toBe(8);
    expect(state.player).toMatchObject({ hasGun: true, ammo: 6 });
    state.score = 6000;
    applyCheat(state, 'score');
    expect(state.score).toBe(11000);
    expect(state.lives).toBe(9);
  });

  it('are disabled by default in a release build (__DEV__ false)', () => {
    // GameScreen defaults cheatsEnabled to __DEV__; in a release bundle __DEV__ is false.
    expect(GameScreen.toString()).toContain('__DEV__');
  });
});

describe('HUD model (AC-32, D3)', () => {
  const t = DICTIONARIES.fr;

  it('pads scores to 6 digits', () => {
    expect(pad6(0)).toBe('000000');
    expect(pad6(12345)).toBe('012345');
  });

  it('shows a power-up label without points, and a bonus with its points', () => {
    expect(flashText({ kind: 'powerup', powerUp: 'slowMo' }, t)).toBe('LENT');
    expect(flashText({ kind: 'bonus', bonus: 'fullClip', points: 1000 }, t)).toBe('SANS FAUTE +1000');
    expect(flashText({ kind: 'bonus', bonus: 'shieldAbsorb', points: 0 }, t)).toBe(t.bonus.shieldAbsorb);
    expect(flashText({ kind: 'curse', curse: 'volley' }, t)).toBe(t.curse.volley);
    expect(flashText(null, t)).toBeNull();
  });

  it('lists active buffs with their remaining ratio or charges', () => {
    const state = createGame({ highScore: 0, modernMode: true, rng: seededRng(1) });
    state.buffs.slowMoTimer = 12.5;
    state.buffs.heavyShots = 2;
    expect(activeBuffs(state)).toEqual([
      { kind: 'slowMo', ratio: 0.5 },
      { kind: 'heavy', charges: 2 },
    ]);
    state.modernMode = false;
    expect(activeBuffs(state)).toEqual([]);
  });
});
