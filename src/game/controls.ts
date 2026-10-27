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

// Quadrant circle of the given size: tap position inside it -> direction from its centre.
export function quadrantDirection(x: number, y: number, size: number): CardinalDir {
  return directionOf(x - size / 2, y - size / 2);
}

// Point-and-shoot: from the player (on screen) towards the tap.
export function pointDirection(tap: { x: number; y: number }, player: { x: number; y: number }): CardinalDir {
  return directionOf(tap.x - player.x, tap.y - player.y);
}

export type Side = 'left' | 'right';

export function controlSides(swapControls: boolean): { joystick: Side; fire: Side } {
  return swapControls ? { joystick: 'right', fire: 'left' } : { joystick: 'left', fire: 'right' };
}
