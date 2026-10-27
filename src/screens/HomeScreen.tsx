// Home (landscape): title, tagline and best score on the left; play, settings, guide and about on the right; a
// controls hint that follows the "swap controls" setting (D3).
import { StyleSheet, Text, View } from 'react-native';

import { controlSides } from '../game/controls';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { pad6 } from '../ui/hudModel';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

type Props = {
  bestScore: number;
  swapControls: boolean;
  onPlay: () => void;
  onSettings: () => void;
  onGuide: () => void;
  onAbout: () => void;
};

export function HomeScreen({ bestScore, swapControls, onPlay, onSettings, onGuide, onAbout }: Props) {
  const { t } = useI18n();
  const sides = controlSides(swapControls);
  const hint = (side: 'left' | 'right') => (sides.joystick === side ? t.home.hintMove : t.home.hintFire);
  return (
    <Screen testID="home-screen">
      <View style={styles.columns}>
        <View style={styles.hero}>
          <Text style={styles.title} accessibilityRole="header">
            {t.home.title}
          </Text>
          <Text style={styles.tagline}>{t.home.tagline}</Text>
          <Text style={styles.bestLabel}>{t.home.bestScore}</Text>
          <Text testID="home-best" style={styles.best}>
            {pad6(bestScore)}
          </Text>
          <View testID="home-hint" style={styles.hints}>
            <Text style={styles.hint}>{`${t.home.hintLeft} ${hint('left')}`}</Text>
            <Text style={styles.hint}>{`${hint('right')} ${t.home.hintRight}`}</Text>
          </View>
        </View>
        <View style={styles.menu}>
          <Button label={t.home.play} onPress={onPlay} testID="home-play" />
          <Button label={t.home.settings} onPress={onSettings} variant="secondary" testID="home-settings" />
          <Button label={t.home.guide} onPress={onGuide} variant="secondary" testID="home-guide" />
          <Button label={t.home.about} onPress={onAbout} variant="secondary" testID="home-about" />
        </View>
      </View>
      <Text style={styles.footer}>{t.home.footer}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  columns: { flex: 1, flexDirection: 'row', gap: spacing.xl, alignItems: 'center' },
  hero: { flex: 1, alignItems: 'center', gap: spacing.xs },
  title: {
    color: colors.accent,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 6,
    textShadowColor: colors.accent,
    textShadowRadius: 12,
  },
  tagline: { color: colors.muted, fontSize: font.small, letterSpacing: 1, marginBottom: spacing.sm },
  bestLabel: { color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  best: { color: colors.highlight, fontSize: font.heading, fontWeight: '900', letterSpacing: 3 },
  hints: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md },
  hint: { color: colors.muted, fontSize: 12, letterSpacing: 1 },
  menu: { flex: 1, gap: spacing.sm, maxWidth: 320 },
  footer: { color: '#475569', fontSize: 11, textAlign: 'center', letterSpacing: 1 },
});
