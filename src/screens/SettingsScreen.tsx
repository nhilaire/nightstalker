// Settings: controls side, fire mode, modern mode, sound effects, ambience, vibrations, statistics, language.
// Every change is saved at once by the caller.
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import type { FireMode } from '../game/types';
import { LANGUAGE_NAMES, LANGUAGES, LanguageSetting } from '../i18n';
import { useI18n } from '../i18n/I18nProvider';
import type { GameSettings } from '../storage/settings';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

type Props = {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  telemetryEnabled: boolean;
  onToggleTelemetry: (granted: boolean) => void;
  onBack: () => void;
};

const FIRE_MODES: FireMode[] = ['quadrants', 'dpad', 'autoaim', 'pointAndShoot'];

function Row({ label, hint, value, onValueChange, testID }: { label: string; hint: string; value: boolean; onValueChange: (v: boolean) => void; testID: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.help}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} testID={testID} trackColor={{ true: colors.accent, false: colors.switchOff }} thumbColor={value ? colors.text : colors.muted} />
    </View>
  );
}

function Group({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.help}>{hint}</Text> : null}
      <View style={styles.choices}>{children}</View>
    </View>
  );
}

function Choice({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function SettingsScreen({ settings, onChange, telemetryEnabled, onToggleTelemetry, onBack }: Props) {
  const { t, setting, setSetting } = useI18n();
  const set = (patch: Partial<GameSettings>) => onChange({ ...settings, ...patch });
  const languages: { value: LanguageSetting; label: string }[] = [
    { value: 'auto', label: t.settings.languageAuto },
    ...LANGUAGES.map((language) => ({ value: language, label: LANGUAGE_NAMES[language] })),
  ];

  return (
    <Screen testID="settings-screen">
      <Text style={styles.title} accessibilityRole="header">
        {t.settings.title}
      </Text>
      <ScrollView contentContainerStyle={styles.body}>
        <Row
          label={t.settings.swap}
          hint={settings.swapControls ? t.settings.swapOn : t.settings.swapOff}
          value={settings.swapControls}
          onValueChange={(v) => set({ swapControls: v })}
          testID="settings-swap"
        />
        <Group label={t.settings.fireMode} hint={t.settings.fire[settings.fireMode].hint}>
          {FIRE_MODES.map((mode) => (
            <Choice
              key={mode}
              testID={`settings-fire-${mode}`}
              label={t.settings.fire[mode].label}
              selected={settings.fireMode === mode}
              onPress={() => set({ fireMode: mode })}
            />
          ))}
        </Group>
        <Row
          label={t.settings.modern}
          hint={`${settings.modernMode ? t.settings.modernOn : t.settings.modernOff} ${t.settings.modernNext}`}
          value={settings.modernMode}
          onValueChange={(v) => set({ modernMode: v })}
          testID="settings-modern"
        />
        <Row label={t.settings.sound} hint={t.settings.soundHint} value={settings.sound} onValueChange={(v) => set({ sound: v })} testID="settings-sound" />
        <Row
          label={t.settings.ambience}
          hint={t.settings.ambienceHint}
          value={settings.ambience}
          onValueChange={(v) => set({ ambience: v })}
          testID="settings-ambience"
        />
        <Row
          label={t.settings.haptics}
          hint={t.settings.hapticsHint}
          value={settings.haptics}
          onValueChange={(v) => set({ haptics: v })}
          testID="settings-haptics"
        />
        <Row label={t.settings.telemetry} hint={t.settings.telemetryHelp} value={telemetryEnabled} onValueChange={onToggleTelemetry} testID="settings-telemetry" />
        <Group label={t.settings.language}>
          {languages.map(({ value, label }) => (
            <Choice key={value} testID={`settings-language-${value}`} label={label} selected={value === setting} onPress={() => setSetting(value)} />
          ))}
        </Group>
      </ScrollView>
      <Button label={t.settings.back} onPress={onBack} variant="secondary" testID="settings-back" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.accent, fontSize: font.heading, fontWeight: '900', letterSpacing: 3 },
  body: { gap: spacing.sm, paddingBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md },
  rowText: { flex: 1, gap: 2 },
  label: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  help: { color: colors.muted, fontSize: 13 },
  group: { gap: spacing.xs, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  choice: { minHeight: 44, borderRadius: 10, paddingHorizontal: spacing.md, justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  choiceSelected: { borderColor: colors.accent },
  choiceText: { color: colors.muted, fontSize: font.small, fontWeight: '700' },
  choiceTextSelected: { color: colors.text },
});
