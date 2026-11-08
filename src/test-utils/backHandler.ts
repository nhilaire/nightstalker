// Android hardware back in tests: React Native has no BackHandler mock, so the listeners are captured and a press
// calls them like the OS does (last registered first, until one returns true).
import { act } from '@testing-library/react-native';
import { BackHandler, HardwareBackPressEvent } from 'react-native';

export function captureBackHandler() {
  const listeners: ((event: HardwareBackPressEvent) => boolean | null | undefined)[] = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_type, handler) => {
    listeners.push(handler);
    return {
      remove: () => {
        const i = listeners.indexOf(handler);
        if (i >= 0) listeners.splice(i, 1);
      },
    };
  });
  // Returns true when the app handled the press (false: the OS would leave the app).
  const pressBack = async (): Promise<boolean> => {
    let handled = false;
    await act(async () => {
      for (const l of [...listeners].reverse()) {
        if (l({ type: 'hardwareBackPress', timeStamp: Date.now() })) {
          handled = true;
          break;
        }
      }
    });
    return handled;
  };
  return { pressBack };
}
