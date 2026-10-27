// Power-up guide: the 19 power-ups in 6 groups, with label, description and duration or charges.
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { POWERUP_DEFS, POWERUP_GROUPS } from '../game/powerups';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

export function GuideScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <Screen testID="guide-screen">
      <Text style={styles.title} accessibilityRole="header">
        {t.guide.title}
      </Text>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.lead}>{t.guide.lead}</Text>
        {POWERUP_GROUPS.map((group) => (
          <View key={group.id} testID={`guide-group-${group.id}`} style={styles.group}>
            <Text style={styles.groupTitle}>{t.guide.groups[group.id].title}</Text>
            <Text style={styles.groupHint}>{t.guide.groups[group.id].hint}</Text>
            {group.kinds.map((kind) => {
              const def = POWERUP_DEFS[kind];
              const meta = def.duration ? t.guide.duration(def.duration) : def.charges ? t.guide.charges(def.charges) : null;
              return (
                <View key={kind} testID={`guide-${kind}`} style={styles.row}>
                  <View style={[styles.chip, { borderColor: def.color, backgroundColor: def.bg }]}>
                    <Text style={[styles.chipLabel, { color: def.color }]}>{t.powerups[kind].label}</Text>
                  </View>
                  <Text style={styles.description}>{t.powerups[kind].description}</Text>
                  {meta ? <Text style={styles.meta}>{meta}</Text> : null}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <Button label={t.guide.back} onPress={onBack} variant="secondary" testID="guide-back" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.accent, fontSize: font.heading, fontWeight: '900', letterSpacing: 3 },
  body: { gap: spacing.md, paddingBottom: spacing.md },
  lead: { color: colors.muted, fontSize: font.small },
  group: { gap: spacing.xs, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md },
  groupTitle: { color: colors.highlight, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  groupHint: { color: colors.muted, fontSize: 12, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chip: { width: 96, borderWidth: 1, borderRadius: 4, paddingVertical: 3, alignItems: 'center' },
  chipLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  description: { flex: 1, color: colors.text, fontSize: font.small },
  meta: { color: colors.muted, fontSize: 12 },
});
