// Screens and navigation through the whole app (consent already given).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import { POWERUP_KINDS } from '../game/powerups';
import { DICTIONARIES } from '../i18n';
import { deviceLanguageTags } from '../i18n/deviceLocale';

const fr = DICTIONARIES.fr;

async function openApp() {
  await render(<App />);
  return screen.findByTestId('home-screen');
}

// The game loop never ends by itself: frames are not scheduled in these navigation tests.
const realRaf = global.requestAnimationFrame;
beforeAll(() => {
  global.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;
});
afterAll(() => {
  global.requestAnimationFrame = realRaf;
});

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('telemetry.consent.v1', 'denied');
  jest.mocked(deviceLanguageTags).mockReturnValue(['fr-FR']);
});

describe('home, game over and best score (AC-35, AC-37)', () => {
  it('plays a run, quits from the pause menu, shows game over with the top scores, then replays or goes home', async () => {
    await openApp();
    expect(screen.getByTestId('home-best')).toHaveTextContent('000000');
    await fireEvent.press(screen.getByTestId('home-play'));
    expect(await screen.findByTestId('game-screen')).toBeTruthy();
    expect(screen.getByTestId('hud-lives')).toHaveTextContent('×6');
    expect(screen.getByTestId('hud-ammo')).toHaveTextContent("PAS D'ARME");
    await fireEvent.press(screen.getByTestId('game-pause'));
    await fireEvent.press(screen.getByTestId('pause-quit'));
    expect(await screen.findByTestId('game-over-screen')).toBeTruthy();
    expect(screen.getByText(fr.gameover.title)).toBeTruthy();
    expect(screen.getByTestId('gameover-score')).toHaveTextContent('000000');
    expect(await screen.findByText('1.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('gameover-replay'));
    expect(await screen.findByTestId('game-screen')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('game-pause'));
    await fireEvent.press(screen.getByTestId('pause-quit'));
    await fireEvent.press(await screen.findByTestId('gameover-menu'));
    expect(await screen.findByTestId('home-screen')).toBeTruthy();
  });

  it('shows the saved best score on Home after a restart', async () => {
    await AsyncStorage.setItem('nightstalker.highscores.v1', JSON.stringify([{ score: 12300, date: '2026-10-27T10:00:00.000Z' }]));
    await openApp();
    expect(screen.getByTestId('home-best')).toHaveTextContent('012300');
  });
});

describe('settings (AC-38, AC-39)', () => {
  it('saves every setting and keeps them after a restart', async () => {
    await openApp();
    await fireEvent.press(screen.getByTestId('home-settings'));
    await fireEvent(screen.getByTestId('settings-swap'), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('settings-fire-dpad'));
    await fireEvent(screen.getByTestId('settings-modern'), 'valueChange', false);
    await fireEvent(screen.getByTestId('settings-sound'), 'valueChange', false);
    await fireEvent(screen.getByTestId('settings-ambience'), 'valueChange', false);
    await fireEvent(screen.getByTestId('settings-haptics'), 'valueChange', false);
    expect(screen.getByText(fr.settings.fire.dpad.hint)).toBeTruthy();
    expect(screen.getByText(fr.settings.swapOn)).toBeTruthy();
    await screen.unmount();

    await openApp();
    await fireEvent.press(screen.getByTestId('home-settings'));
    expect(screen.getByTestId('settings-swap')).toHaveProp('value', true);
    expect(screen.getByTestId('settings-modern')).toHaveProp('value', false);
    expect(screen.getByTestId('settings-sound')).toHaveProp('value', false);
    expect(screen.getByTestId('settings-ambience')).toHaveProp('value', false);
    expect(screen.getByTestId('settings-haptics')).toHaveProp('value', false);
    expect(screen.getByTestId('settings-fire-dpad')).toHaveProp('accessibilityState', { checked: true });
  });

  it('shows the controls hint on Home following the swap setting', async () => {
    await openApp();
    expect(screen.getByText(`${fr.home.hintLeft} ${fr.home.hintMove}`)).toBeTruthy();
    expect(screen.getByText(`${fr.home.hintFire} ${fr.home.hintRight}`)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('home-settings'));
    await fireEvent(screen.getByTestId('settings-swap'), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('settings-back'));
    expect(await screen.findByText(`${fr.home.hintLeft} ${fr.home.hintFire}`)).toBeTruthy();
    expect(screen.getByText(`${fr.home.hintMove} ${fr.home.hintRight}`)).toBeTruthy();
  });
});

describe('guide and about (AC-43, AC-44)', () => {
  it('lists the 19 power-ups in 6 groups with label, description and duration or charges', async () => {
    await openApp();
    await fireEvent.press(screen.getByTestId('home-guide'));
    expect(await screen.findByTestId('guide-screen')).toBeTruthy();
    for (const group of ['tempo', 'offense', 'defense', 'economy', 'info', 'mystery']) expect(screen.getByTestId(`guide-group-${group}`)).toBeTruthy();
    for (const kind of POWERUP_KINDS) {
      expect(screen.getByTestId(`guide-${kind}`)).toBeTruthy();
      expect(screen.getByText(fr.powerups[kind].description)).toBeTruthy();
    }
    expect(screen.getByText(fr.guide.duration(25))).toBeTruthy();
    expect(screen.getAllByText(fr.guide.charges(3)).length).toBe(1);
  });

  it('shows the story verbatim, how to play, the inspiration, the author, the data and the version', async () => {
    await openApp();
    await fireEvent.press(screen.getByTestId('home-about'));
    expect(await screen.findByTestId('about-screen')).toBeTruthy();
    expect(screen.getByText(fr.about.story[0])).toBeTruthy();
    expect(screen.getByText(fr.about.howTo[0])).toBeTruthy();
    expect(screen.getByText(fr.about.inspiration[0])).toBeTruthy();
    expect(screen.getByText(fr.about.author[0])).toBeTruthy();
    expect(screen.getByText(fr.about.data[0])).toBeTruthy();
    expect(screen.getByText(/^Version [0-9]+[.][0-9]+[.][0-9]+$/)).toBeTruthy();
  });

  it('shows About in English on an English phone', async () => {
    jest.mocked(deviceLanguageTags).mockReturnValue(['en-US']);
    await openApp();
    await fireEvent.press(screen.getByTestId('home-about'));
    expect(screen.getByText(DICTIONARIES.en.about.story[0])).toBeTruthy();
  });
});
