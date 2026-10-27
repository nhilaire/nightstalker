// Game over: final score, new-best mention, the 5 best scores, replay or menu.
import { StyleSheet, Text, View } from 'react-native';

import type { HighScore } from '../game/highScores';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { pad6 } from '../ui/hudModel';
import { Screen } from '../ui/Screen';
import { colors, spacing } from '../ui/theme';

type Props = { score: number; newBest: boolean; scores: readonly HighScore[]; onReplay: () => void; onMenu: () => void };

export function GameOverScreen({ score, newBest, scores, onReplay, onMenu }: Props) {
  const { t } = useI18n();
  return (
    <Screen testID="game-over-screen">
      <View style={styles.columns}>
        <View style={styles.result}>
          <Text style={styles.title} accessibilityRole="header">
            {t.gameover.title}
          </Text>
          <Text testID="gameover-score" style={styles.score}>
            {pad6(score)}
          </Text>
          {newBest ? (
            <Text testID="gameover-new-best" style={styles.newBest}>
              {t.gameover.newBest}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button label={t.gameover.replay} onPress={onReplay} testID="gameover-replay" />
            <Button label={t.gameover.menu} onPress={onMenu} variant="secondary" testID="gameover-menu" />
          </View>
        </View>
        <View testID="gameover-top" style={styles.list}>
          <Text style={styles.listTitle}>{t.gameover.topScores}</Text>
          {scores.slice(0, 5).map((s, i) => (
            <View key={`${s.date}-${i}`} style={styles.row}>
              <Text style={styles.rank}>{i + 1}.</Text>
              <Text style={styles.rowScore}>{pad6(s.score)}</Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  columns: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  result: { flex: 1, alignItems: 'center', gap: spacing.sm },
  title: { color: colors.danger, fontSize: 34, fontWeight: '900', letterSpacing: 4 },
  score: { color: colors.text, fontSize: 40, fontWeight: '900', letterSpacing: 4 },
  newBest: { color: colors.highlight, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  list: { flex: 1, alignItems: 'center', gap: spacing.xs },
  listTitle: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  rank: { color: colors.muted, fontSize: 16, width: 24, textAlign: 'right' },
  rowScore: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});
