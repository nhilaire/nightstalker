import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { bestOf, HighScore } from './game/highScores';
import { LanguageSetting } from './i18n';
import { I18nProvider } from './i18n/I18nProvider';
import { AboutScreen } from './screens/AboutScreen';
import { ConsentScreen } from './screens/ConsentScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { GameScreen, RunResult } from './screens/GameScreen';
import { GuideScreen } from './screens/GuideScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { addHighScore, loadHighScores } from './storage/highScores';
import { loadLanguageSetting, saveLanguageSetting } from './storage/languageSetting';
import { DEFAULT_SETTINGS, GameSettings, loadSettings, saveSettings } from './storage/settings';
import { Consent, loadConsent, saveConsent } from './telemetry/consentStore';
import { applyConsent } from './telemetry/telemetry';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { colors } from './ui/theme';

type Route = 'home' | 'game' | 'gameover' | 'settings' | 'guide' | 'about';

export default function App() {
  const [consent, setConsentState] = useState<Consent | 'loading'>('loading');
  const [route, setRoute] = useState<Route>('home');
  const [scores, setScores] = useState<HighScore[]>([]);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [languageSetting, setLanguageSetting] = useState<LanguageSetting>('auto');
  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [storedConsent, storedScores, storedLanguage, storedSettings] = await Promise.all([
        loadConsent(),
        loadHighScores(),
        loadLanguageSetting(),
        loadSettings(),
      ]);
      if (storedConsent !== 'unknown') await applyConsent(storedConsent === 'granted');
      if (alive) {
        setLanguageSetting(storedLanguage);
        setScores(storedScores);
        setSettings(storedSettings);
        setConsentState(storedConsent);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const decide = useCallback(async (granted: boolean) => {
    const value = granted ? 'granted' : 'denied';
    await saveConsent(value);
    await applyConsent(granted);
    setConsentState(value);
  }, []);

  const changeLanguage = useCallback(async (value: LanguageSetting) => {
    setLanguageSetting(value);
    await saveLanguageSetting(value);
  }, []);

  const changeSettings = useCallback(async (next: GameSettings) => {
    setSettings(next);
    await saveSettings(next);
  }, []);

  const play = useCallback(() => {
    setRunId((id) => id + 1);
    setRoute('game');
  }, []);

  const onGameOver = useCallback(async (result: RunResult) => {
    setLastRun(result);
    setRoute('gameover');
    setScores(await addHighScore(result.score));
  }, []);

  const home = () => setRoute('home');

  let content: React.ReactNode;
  if (consent === 'loading') {
    content = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  } else if (consent === 'unknown') {
    content = <ConsentScreen onDecision={decide} />;
  } else if (route === 'game') {
    content = <GameScreen key={runId} settings={settings} highScore={bestOf(scores)} onGameOver={onGameOver} />;
  } else if (route === 'gameover' && lastRun) {
    content = <GameOverScreen score={lastRun.score} newBest={lastRun.newBest} scores={scores} onReplay={play} onMenu={home} />;
  } else if (route === 'settings') {
    content = (
      <SettingsScreen settings={settings} onChange={changeSettings} telemetryEnabled={consent === 'granted'} onToggleTelemetry={decide} onBack={home} />
    );
  } else if (route === 'guide') {
    content = <GuideScreen onBack={home} />;
  } else if (route === 'about') {
    content = <AboutScreen onBack={home} />;
  } else {
    content = (
      <HomeScreen
        bestScore={bestOf(scores)}
        swapControls={settings.swapControls}
        onPlay={play}
        onSettings={() => setRoute('settings')}
        onGuide={() => setRoute('guide')}
        onAbout={() => setRoute('about')}
      />
    );
  }

  return (
    <I18nProvider setting={languageSetting} onChange={changeLanguage}>
      <ErrorBoundary>{content}</ErrorBoundary>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
