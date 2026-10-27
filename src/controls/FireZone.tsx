// Fire controls, four modes (ported from the prototype). No text: arrows and a crosshair only.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { directionOf, Side } from '../game/controls';
import type { CardinalDir, FireMode } from '../game/types';

export type FireFn = (dir: CardinalDir | 'auto') => void;

type Props = {
  mode: FireMode;
  side: Side;
  onFire: FireFn;
  // Player position on screen (point-and-shoot), read at tap time.
  playerOnScreen: () => { x: number; y: number };
};

const BTN = 110;

export function FireZone({ mode, side, onFire, playerOnScreen }: Props) {
  if (mode === 'pointAndShoot') return <PointZone onFire={onFire} playerOnScreen={playerOnScreen} />;
  const align = side === 'right' ? styles.right : styles.left;
  return (
    <View style={[styles.zone, align]}>
      {mode === 'quadrants' ? <Quadrants onFire={onFire} /> : mode === 'dpad' ? <Dpad onFire={onFire} /> : <AutoAim onFire={onFire} />}
    </View>
  );
}

function Quadrants({ onFire }: { onFire: FireFn }) {
  const tap = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(99999)
    .shouldCancelWhenOutside(false)
    .onBegin((e) => onFire(directionOf(e.x - BTN / 2, e.y - BTN / 2)));
  return (
    <GestureDetector gesture={tap}>
      <View testID="fire-quadrants" style={styles.circle}>
        <View style={styles.crossH} />
        <View style={styles.crossV} />
        <Text style={[styles.arrow, styles.arrowN]}>▲</Text>
        <Text style={[styles.arrow, styles.arrowS]}>▼</Text>
        <Text style={[styles.arrow, styles.arrowE]}>▶</Text>
        <Text style={[styles.arrow, styles.arrowW]}>◀</Text>
      </View>
    </GestureDetector>
  );
}

function Dpad({ onFire }: { onFire: FireFn }) {
  const button = (dir: CardinalDir, label: string, style: object) => (
    <Pressable key={dir} testID={`fire-${dir}`} onPressIn={() => onFire(dir)} style={({ pressed }) => [styles.dBtn, style, pressed && styles.dBtnPressed]}>
      <Text style={styles.dBtnText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.dpad}>
      {button('N', '▲', styles.dN)}
      {button('W', '◀', styles.dW)}
      {button('E', '▶', styles.dE)}
      {button('S', '▼', styles.dS)}
    </View>
  );
}

function AutoAim({ onFire }: { onFire: FireFn }) {
  return (
    <Pressable testID="fire-auto" onPressIn={() => onFire('auto')} style={({ pressed }) => [styles.circle, styles.auto, pressed && styles.autoPressed]}>
      <Text style={styles.autoGlyph}>⌖</Text>
    </Pressable>
  );
}

function PointZone({ onFire, playerOnScreen }: { onFire: FireFn; playerOnScreen: () => { x: number; y: number } }) {
  const tap = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(99999)
    .shouldCancelWhenOutside(false)
    .onBegin((e) => {
      const p = playerOnScreen();
      onFire(directionOf(e.absoluteX - p.x, e.absoluteY - p.y));
    });
  return (
    <GestureDetector gesture={tap}>
      <View testID="fire-point" style={styles.pointZone}>
        <Text style={styles.pointGlyph}>⌖</Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  zone: { flex: 1, justifyContent: 'flex-end', paddingBottom: 24 },
  right: { alignItems: 'flex-end', paddingRight: 24 },
  left: { alignItems: 'flex-start', paddingLeft: 24 },
  circle: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    borderWidth: 3,
    borderColor: 'rgba(239, 68, 68, 0.7)',
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossH: { position: 'absolute', left: 12, right: 12, top: BTN / 2 - 1, height: 2, backgroundColor: 'rgba(252, 165, 165, 0.4)' },
  crossV: { position: 'absolute', top: 12, bottom: 12, left: BTN / 2 - 1, width: 2, backgroundColor: 'rgba(252, 165, 165, 0.4)' },
  arrow: { position: 'absolute', color: '#FCA5A5', fontSize: 14, fontWeight: '700' },
  arrowN: { top: 6, alignSelf: 'center' },
  arrowS: { bottom: 6, alignSelf: 'center' },
  arrowE: { right: 8, top: BTN / 2 - 9 },
  arrowW: { left: 8, top: BTN / 2 - 9 },
  dpad: { width: 132, height: 132 },
  dBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.7)',
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dBtnPressed: { backgroundColor: 'rgba(239, 68, 68, 0.45)' },
  dN: { top: 0, left: 46 },
  dS: { bottom: 0, left: 46 },
  dW: { left: 0, top: 46 },
  dE: { right: 0, top: 46 },
  dBtnText: { color: '#FCA5A5', fontSize: 16, fontWeight: '700' },
  auto: { borderColor: 'rgba(16, 185, 129, 0.7)', backgroundColor: 'rgba(16, 185, 129, 0.18)' },
  autoPressed: { backgroundColor: 'rgba(16, 185, 129, 0.45)' },
  autoGlyph: { color: '#6EE7B7', fontSize: 44 },
  pointZone: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24 },
  pointGlyph: { color: '#475569', fontSize: 28 },
});
