// Touch-control maths (pure, unit-tested): joystick vector, fire directions per mode, sides of the screen.
import type { CardinalDir } from './types';

export const JOYSTICK_DEAD_ZONE = 0.18;

// Finger offset from the joystick centre -> knob offset (clamped to the ring) and normalised vector in [-1, 1].
export function joystickVector(dx: number, dy: number, maxOffset: number) {
  const mag = Math.hypot(dx, dy);
  const clamped = Math.min(mag, maxOffset);
  const angle = Math.atan2(dy, dx);
  const knobX = mag === 0 ? 0 : Math.cos(angle) * clamped;
  const knobY = mag === 0 ? 0 : Math.sin(angle) * clamped;
  let x = knobX / maxOffset;
  let y = knobY / maxOffset;
  if (Math.hypot(x, y) < JOYSTICK_DEAD_ZONE) {
    x = 0;
    y = 0;
  }
  return { knobX, knobY, x, y };
}

// Quadrant circle and point-and-shoot: dominant axis of the vector (ties go to the horizontal axis).
export function directionOf(dx: number, dy: number): CardinalDir {
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'E' : 'W';
  return dy > 0 ? 'S' : 'N';
}

export type Side = 'left' | 'right';

export function controlSides(swapControls: boolean): { joystick: Side; fire: Side } {
  return swapControls ? { joystick: 'right', fire: 'left' } : { joystick: 'left', fire: 'right' };
}
