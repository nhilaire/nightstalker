import { fireEvent, render, screen } from '@testing-library/react-native';

import { FireZone } from '../controls/FireZone';
import { controlSides, directionOf, joystickVector } from '../game/controls';

describe('touch controls (AC-14, AC-39)', () => {
  it('turns the finger offset into a clamped knob and a normalised vector with a dead zone', () => {
    expect(joystickVector(80, 0, 40)).toEqual({ knobX: 40, knobY: 0, x: 1, y: 0 });
    const small = joystickVector(5, 0, 40);
    expect([small.x, small.y]).toEqual([0, 0]);
    const diag = joystickVector(0, -20, 40);
    expect(diag.y).toBeCloseTo(-0.5);
  });

  it('gives the dominant axis of a tap, ties going horizontal', () => {
    expect(directionOf(10, 3)).toBe('E');
    expect(directionOf(-10, 3)).toBe('W');
    expect(directionOf(2, 9)).toBe('S');
    expect(directionOf(2, -9)).toBe('N');
    expect(directionOf(5, 5)).toBe('E');
  });

  it('puts the joystick left and the fire zone right, swapped on demand', () => {
    expect(controlSides(false)).toEqual({ joystick: 'left', fire: 'right' });
    expect(controlSides(true)).toEqual({ joystick: 'right', fire: 'left' });
  });

  it('fires the pressed direction with the d-pad and "auto" with the auto-aim button', async () => {
    const onFire = jest.fn();
    const player = () => ({ x: 0, y: 0 });
    await render(<FireZone mode="dpad" side="right" onFire={onFire} playerOnScreen={player} />);
    await fireEvent(screen.getByTestId('fire-S'), 'pressIn');
    expect(onFire).toHaveBeenLastCalledWith('S');
    await screen.unmount();
    await render(<FireZone mode="autoaim" side="left" onFire={onFire} playerOnScreen={player} />);
    await fireEvent(screen.getByTestId('fire-auto'), 'pressIn');
    expect(onFire).toHaveBeenLastCalledWith('auto');
  });

  it('renders the quadrant circle and the point-and-shoot zone', async () => {
    const player = () => ({ x: 0, y: 0 });
    await render(<FireZone mode="quadrants" side="right" onFire={jest.fn()} playerOnScreen={player} />);
    expect(screen.getByTestId('fire-quadrants')).toBeTruthy();
    await screen.unmount();
    await render(<FireZone mode="pointAndShoot" side="right" onFire={jest.fn()} playerOnScreen={player} />);
    expect(screen.getByTestId('fire-point')).toBeTruthy();
  });
});
