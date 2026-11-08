// Helpers for components driven by Gesture Handler: Pressables are replaced by RNGH taps so that a button works
// while another finger holds the joystick, and fireEvent.press does not reach them.
import { act } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

// Finger down only, still on the button: fireGestureHandler always ends the gesture, so the BEGAN callback is
// called directly.
export async function touchDown(testID: string): Promise<void> {
  const gesture = getByGestureTestId(testID) as unknown as { handlers: { onBegin?: (e: object) => void } };
  await act(async () => gesture.handlers.onBegin?.({ state: State.BEGAN, x: 0, y: 0, absoluteX: 0, absoluteY: 0 }));
}

// A full tap: down, then up (ends any touchDown before it).
export async function tap(testID: string): Promise<void> {
  await act(async () => fireGestureHandler(getByGestureTestId(testID), [{ state: State.BEGAN }, { state: State.ACTIVE }, { state: State.END }]));
}
