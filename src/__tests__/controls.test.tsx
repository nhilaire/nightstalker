import { fireEvent, render, screen } from '@testing-library/react-native';

import { FireZone } from '../controls/FireZone';
import { controlSides, directionOf, joystickVector, pointDirection, quadrantDirection } from '../game/controls';

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

  it('fires the quadrant tapped in the 110 px circle (AC-14)', () => {
    expect(quadrantDirection(55, 5, 110)).toBe('N');
    expect(quadrantDirection(55, 105, 110)).toBe('S');
    expect(quadrantDirection(105, 50, 110)).toBe('E');
    expect(quadrantDirection(5, 60, 110)).toBe('W');
  });

  it('fires from the player towards the tap in point-and-shoot (AC-14)', () => {
    const player = { x: 400, y: 200 };
    expect(pointDirection({ x: 700, y: 260 }, player)).toBe('E');
    expect(pointDirection({ x: 100, y: 150 }, player)).toBe('W');
    expect(pointDirection({ x: 420, y: 20 }, player)).toBe('N');
    expect(pointDirection({ x: 380, y: 330 }, player)).toBe('S');
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
