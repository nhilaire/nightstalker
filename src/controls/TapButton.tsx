// A button driven by Gesture Handler instead of Pressable. The joystick's Pan gesture activates at touch-down and
// Gesture Handler then owns the touch stream, so a Pressable never sees a second finger: in-game buttons must be RNGH
// taps (same pattern as the fire quadrants) to work while the player is moving.
import { ReactNode, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type Props = {
  testID: string;
  accessibilityLabel?: string;
  // Called as soon as the finger touches the button (fire buttons).
  onPressIn?: () => void;
  // Called when the finger lifts on the button (pause).
  onPress?: () => void;
  hitSlop?: number;
  style: (pressed: boolean) => StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function TapButton({ testID, accessibilityLabel, onPressIn, onPress, hitSlop, style, children }: Props) {
  const [pressed, setPressed] = useState(false);
  let tap = Gesture.Tap()
    .runOnJS(true)
    .withTestId(testID)
    .onBegin(() => {
      setPressed(true);
      onPressIn?.();
    })
    .onEnd((_e, success) => {
      if (success) onPress?.();
    })
    .onFinalize(() => setPressed(false));
  // A held fire button must not be cancelled by a long press or a finger sliding off.
  if (!onPress) tap = tap.maxDuration(99999).shouldCancelWhenOutside(false);
  if (hitSlop) tap = tap.hitSlop(hitSlop);
  const activate = onPress ?? onPressIn;
  return (
    <GestureDetector gesture={tap}>
      <View
        testID={testID}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') activate?.();
        }}
        style={style(pressed)}
      >
        {children}
      </View>
    </GestureDetector>
  );
}
