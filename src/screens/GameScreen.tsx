// The run: game loop (requestAnimationFrame), Skia playfield, HUD, touch controls, pause and debug cheats.
import { Canvas, createPicture, Picture } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { FireZone } from '../controls/FireZone';
import { Joystick } from '../controls/Joystick';
import { applyCheat, Cheat, CheatDetector } from '../game/cheats';
import { MAX_DT } from '../game/constants';
import { controlSides } from '../game/controls';
import { createGame, emptyInput, quitGame, tick } from '../game/engine';
import { Rng } from '../game/rng';
import { tierForScore } from '../game/spawn';
import type { CardinalDir, GameEvent, GameState } from '../game/types';
import { useI18n } from '../i18n/I18nProvider';
import { FrameStats } from '../render/frameStats';
import { drawScene, fitView } from '../render/scene';
import type { GameSettings } from '../storage/settings';
import { Button } from '../ui/Button';
import { Hud } from '../ui/Hud';

export type RunResult = {
  score: number;
  newBest: boolean;
  reason: 'lives' | 'quit';
  tier: number;
  durationS: number;
  modern: boolean;
};

type Props = {
  settings: GameSettings;
  highScore: number;
  onGameOver: (result: RunResult) => void;
  // Sounds, haptics and telemetry of each frame (the run's state is read-only for the listener).
  onEvents?: (events: GameEvent[], state: GameState) => void;
  onPauseChange?: (paused: boolean) => void;
  cheatsEnabled?: boolean;
  rng?: Rng;
  // Frame scheduler (tests drive frames by hand).
  requestFrame?: (step: (now: number) => void) => number;
  cancelFrame?: (id: number) => void;
};

export function GameScreen({ settings, highScore, onGameOver, onEvents, onPauseChange, cheatsEnabled = __DEV__, rng = Math.random, requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame }: Props) {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const view = useMemo(() => fitView(width, height), [width, height]);
  const stateRef = useRef<GameState | null>(null);
  if (!stateRef.current) stateRef.current = createGame({ highScore, modernMode: settings.modernMode, rng });
  const inputRef = useRef(emptyInput());
  const [, setFrame] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const endedRef = useRef(false);
  const cheats = useRef(new CheatDetector());

  const finish = useCallback(
    (state: GameState) => {
      if (endedRef.current) return;
      endedRef.current = true;
      onGameOver({
        score: state.score,
        newBest: state.newHighScore,
        reason: state.endReason ?? 'lives',
        tier: tierForScore(state.score),
        durationS: Math.round(state.elapsed),
        modern: state.modernMode,
      });
    },
    [onGameOver],
  );

  const setPause = useCallback(
    (value: boolean) => {
      pausedRef.current = value;
      setPaused(value);
      onPauseChange?.(value);
    },
    [onPauseChange],
  );

  useEffect(() => {
    let raf = 0;
    let last: number | null = null;
    const stats = new FrameStats();
    const step = (now: number) => {
      const state = stateRef.current!;
      const frameMs = last === null ? 0 : now - last;
      const dt = Math.min(frameMs / 1000, MAX_DT);
      last = now;
      if (!pausedRef.current && state.phase === 'playing' && dt > 0) {
        const line = stats.record(frameMs);
        if (line) console.log(line);
        tick(state, dt, inputRef.current, rng);
        inputRef.current.fireRequested = false;
        inputRef.current.fireDir = null;
        if (state.events.length) onEvents?.(state.events, state);
      }
      setFrame((f) => (f + 1) % 1_000_000);
      if (state.phase === 'gameover') {
        finish(state);
        return;
      }
      raf = requestFrame(step);
    };
    raf = requestFrame(step);
    return () => cancelFrame(raf);
  }, [finish, onEvents, rng, requestFrame, cancelFrame]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') setPause(true);
    });
    return () => sub.remove();
  }, [setPause]);

  const onJoystick = useCallback((x: number, y: number) => {
    inputRef.current.dir = { x, y };
  }, []);

  const onFire = useCallback((dir: CardinalDir | 'auto') => {
    inputRef.current.fireRequested = true;
    inputRef.current.fireDir = dir;
  }, []);

  const playerOnScreen = useCallback(() => {
    const p = stateRef.current!.player;
    return { x: view.offsetX + p.x * view.scale, y: view.offsetY + p.y * view.scale };
  }, [view]);

  const quit = useCallback(() => {
    const state = stateRef.current!;
    quitGame(state);
    onEvents?.(state.events, state);
    finish(state);
  }, [finish, onEvents]);

  const cheatTap = (cheat: Cheat) => {
    if (cheats.current.tap(cheat, Date.now())) applyCheat(stateRef.current!, cheat);
  };

  const state = stateRef.current;
  const time = state.elapsed;
  const picture = createPicture((canvas) => drawScene(canvas, state, view, time));
  const sides = controlSides(settings.swapControls);

  return (
    <GestureHandlerRootView style={styles.root} testID="game-screen">
      <StatusBar hidden />
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>

      <View style={[styles.fireHalf, { width: width / 2 }, sides.fire === 'left' ? styles.leftEdge : styles.rightEdge]}>
        <FireZone mode={settings.fireMode} side={sides.fire} onFire={onFire} playerOnScreen={playerOnScreen} />
      </View>
      <View testID={`joystick-${sides.joystick}`} pointerEvents="box-none" style={[styles.joyWrap, sides.joystick === 'left' ? styles.joyLeft : styles.joyRight]}>
        <Joystick onChange={onJoystick} />
      </View>

      <Hud state={state} onPause={() => setPause(true)} />

      {cheatsEnabled ? (
        <>
          <Pressable testID="cheat-lives" style={[styles.cheat, styles.rightEdge]} onPressIn={() => cheatTap('lives')} />
          <Pressable testID="cheat-score" style={[styles.cheat, styles.leftEdge]} onPressIn={() => cheatTap('score')} />
        </>
      ) : null}

      {paused ? (
        <View testID="pause-overlay" style={styles.pause}>
          <Text style={styles.pauseTitle}>{t.pause.title}</Text>
          <View style={styles.pauseRow}>
            <Button label={t.pause.resume} onPress={() => setPause(false)} testID="pause-resume" />
            <Button label={t.pause.quit} onPress={quit} variant="secondary" testID="pause-quit" />
          </View>
        </View>
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  fireHalf: { position: 'absolute', top: 40, bottom: 0 },
  leftEdge: { left: 0 },
  rightEdge: { right: 0 },
  joyWrap: { position: 'absolute', bottom: 16 },
  joyLeft: { left: 16 },
  joyRight: { right: 16 },
  cheat: { position: 'absolute', top: 0, width: 90, height: 90, zIndex: 1000 },
  pause: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  pauseTitle: { color: '#10B981', fontSize: 32, fontWeight: '900', letterSpacing: 6 },
  pauseRow: { flexDirection: 'row', gap: 16 },
});
