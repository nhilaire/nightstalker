// Virtual joystick (ported from the prototype): the knob follows the finger, releasing stops the player.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { joystickVector } from '../game/controls';

type Props = { size?: number; knobSize?: number; onChange: (x: number, y: number) => void };

export function Joystick({ size = 140, knobSize = 60, onChange }: Props) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const radius = size / 2;
  const maxOffset = (size - knobSize) / 2;

  const update = (x: number, y: number) => {
    const v = joystickVector(x - radius, y - radius, maxOffset);
    setKnob({ x: v.knobX, y: v.knobY });
    onChange(v.x, v.y);
  };
  const reset = () => {
    setKnob({ x: 0, y: 0 });
    setActive(false);
    onChange(0, 0);
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      setActive(true);
      update(e.x, e.y);
    })
    .onUpdate((e) => update(e.x, e.y))
    .onFinalize(reset);

  return (
    <GestureDetector gesture={pan}>
      <View testID="joystick" style={[styles.wrap, { width: size, height: size, borderRadius: radius }]}>
        <View style={[styles.ring, { width: size, height: size, borderRadius: radius, borderColor: active ? '#10B981' : '#1F2937' }]} />
        <View
          style={[
            styles.knob,
            { width: knobSize, height: knobSize, borderRadius: knobSize / 2, opacity: active ? 1 : 0.7 },
            { transform: [{ translateX: knob.x }, { translateY: knob.y }] },
          ]}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  ring: { position: 'absolute', borderWidth: 2 },
  knob: { backgroundColor: 'rgba(16, 185, 129, 0.65)', borderWidth: 2, borderColor: '#10B981' },
});
