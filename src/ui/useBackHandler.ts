// Android hardware back for the current screen. The handler is registered last, so it runs before any earlier one;
// it returns true when it handled the press (false lets the OS leave the app).
import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

export function useBackHandler(onBack: () => boolean): void {
  // The latest handler, refreshed after each render (the press always comes later, from a native event).
  const latest = useRef(onBack);
  useEffect(() => {
    latest.current = onBack;
  });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => latest.current());
    return () => sub.remove();
  }, []);
}
