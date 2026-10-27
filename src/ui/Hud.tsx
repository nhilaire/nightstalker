// In-game HUD (ported from the prototype): lives, buffs, combo and bonus flash on the left; score, best and ammo on
// the right; pause button at the top centre.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GUN_AMMO } from '../game/constants';
import { POWERUP_DEFS } from '../game/powerups';
import type { GameState } from '../game/types';
import { useI18n } from '../i18n/I18nProvider';
import { activeBuffs, flashText, pad6 } from './hudModel';

type Props = { state: GameState; onPause: () => void };

export function Hud({ state, onPause }: Props) {
  const { t } = useI18n();
  const flash = state.modernMode ? flashText(state.combo.flash, t) : null;
  const p = state.player;
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View pointerEvents="none" style={styles.left}>
        <Text style={styles.label}>{t.game.lives}</Text>
        <View style={styles.row}>
          {Array.from({ length: Math.min(state.lives, 9) }).map((_, i) => (
            <View key={i} style={styles.lifeIcon} />
          ))}
          <Text testID="hud-lives" style={[styles.label, styles.lifeCount]}>
            ×{state.lives}
          </Text>
        </View>
        <View style={styles.buffRow}>
          {activeBuffs(state).map((b) => {
            const def = POWERUP_DEFS[b.kind];
            return (
              <View key={b.kind} style={[styles.buffChip, { borderColor: def.color, backgroundColor: def.bg }]}>
                <Text style={[styles.buffLabel, { color: def.color }]}>{t.powerups[b.kind].label}</Text>
                {b.charges !== undefined ? (
                  <Text style={[styles.buffAux, { color: def.color }]}>×{b.charges}</Text>
                ) : (
                  <View style={[styles.buffBar, { backgroundColor: def.color, width: 22 * (b.ratio ?? 0) }]} />
                )}
              </View>
            );
          })}
        </View>
        {state.modernMode && state.combo.comboMult > 1 ? <Text style={styles.combo}>{t.game.combo(state.combo.comboMult)}</Text> : null}
        {flash ? (
          <Text testID="hud-flash" style={styles.flash}>
            {flash}
          </Text>
        ) : null}
      </View>

      <View pointerEvents="none" style={styles.right}>
        <Text testID="hud-score" style={styles.score}>
          {pad6(state.score)}
        </Text>
        {state.flashLifeBonus > 0 ? <Text style={styles.lifeBonus}>{t.game.lifeBonus}</Text> : null}
        <Text style={styles.best}>{`${t.game.best} ${pad6(Math.max(state.highScore, state.score))}`}</Text>
        <Text testID="hud-ammo" style={[styles.label, styles.ammoLabel, state.flashNoAmmo > 0 && styles.warn]}>
          {p.hasGun ? t.game.ammo : t.game.noGun}
        </Text>
        <View style={styles.row}>
          {Array.from({ length: GUN_AMMO }).map((_, i) => (
            <View key={i} style={[styles.ammoCell, p.hasGun && i < p.ammo && styles.ammoFull]} />
          ))}
        </View>
      </View>

      <Pressable testID="game-pause" accessibilityLabel={t.game.pause} style={styles.pauseSlot} onPress={onPause} hitSlop={10}>
        <View style={styles.pauseBtn}>
          <Text style={styles.pauseText}>‖‖</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  left: { flex: 1 },
  right: { flex: 1, alignItems: 'flex-end' },
  label: { color: '#10B981', fontWeight: '700', fontSize: 11, letterSpacing: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  lifeIcon: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FDE68A', marginRight: 3 },
  lifeCount: { marginLeft: 4 },
  buffRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 },
  buffChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderRadius: 3, gap: 4 },
  buffLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  buffAux: { fontSize: 9, fontWeight: '700' },
  buffBar: { height: 2, borderRadius: 1 },
  combo: { color: '#FACC15', fontWeight: '900', fontSize: 12, letterSpacing: 2, marginTop: 5 },
  flash: { color: '#22D3EE', fontWeight: '900', fontSize: 11, letterSpacing: 2, marginTop: 2 },
  score: { color: '#FFFFFF', fontWeight: '900', fontSize: 22, letterSpacing: 2 },
  lifeBonus: { color: '#FACC15', fontWeight: '700', fontSize: 11, marginTop: 2 },
  best: { color: '#94A3B8', fontSize: 10, letterSpacing: 1, marginTop: 2 },
  ammoLabel: { marginTop: 6 },
  warn: { color: '#EF4444' },
  ammoCell: { width: 9, height: 9, borderWidth: 1, borderColor: '#FACC15', marginLeft: 2 },
  ammoFull: { backgroundColor: '#FACC15' },
  pauseSlot: { position: 'absolute', top: 6, left: '50%', marginLeft: -18, width: 36, height: 36 },
  pauseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#94A3B8',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});
