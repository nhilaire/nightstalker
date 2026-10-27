// Skia drawing of the playfield, ported from the prototype's GameCanvas.tsx. Visual only: not unit-tested, proven by
// Maestro screenshots and the feel check on the phone. Uses a clock (seconds) for blinking, never the engine.
import { PaintStyle, SkCanvas, SkPaint, Skia, SkPath } from '@shopify/react-native-skia';

import { lineOfSight } from '../game/ai';
import {
  BUNKER_COL,
  BUNKER_H,
  BUNKER_ROW,
  BUNKER_W,
  COLS,
  FIELD_H,
  FIELD_W,
  POWERUP_BLINK_THRESHOLD,
  POWERUP_TTL,
  ROWS,
  TILE,
} from '../game/constants';
import { getMaze } from '../game/maze';
import { POWERUP_DEFS } from '../game/powerups';
import type { Enemy, GameState, PowerUp } from '../game/types';
import {
  BAT,
  compile,
  FONT_3X5,
  GUN,
  PLAYER,
  PLAYER_PARALYZED,
  ROBOT_BLACK_1,
  ROBOT_BLACK_2,
  ROBOT_BLUE,
  ROBOT_GRAY,
  ROBOT_INVISIBLE,
  ROBOT_INVISIBLE_XRAY,
  ROBOT_WHITE,
  SPIDER,
  SpriteDef,
} from './sprites';

export const COLORS = {
  bg: '#1E40AF',
  wall: '#0B1220',
  bunkerFloor: '#CBD5E1',
  bunkerWall: '#94A3B8',
  bunkerWallDamaged: '#64748B',
  webBg: '#0F172A',
  webStrand: '#E2E8F0',
  bullet: '#FFFFFF',
  enemyBullet: '#FB923C',
  yellowBolt: '#FACC15',
  laserBolt: '#F87171',
  laserCore: '#FECACA',
  shieldHalo: '#FACC15',
  xray: '#10B981',
} as const;

// Where the 200 x 120 field sits on the canvas.
export type View = { offsetX: number; offsetY: number; scale: number; width: number; height: number };

// Largest scale that fits the field in the area, centred.
export function fitView(width: number, height: number): View {
  const scale = Math.min(width / FIELD_W, height / FIELD_H);
  return { scale, width, height, offsetX: (width - FIELD_W * scale) / 2, offsetY: (height - FIELD_H * scale) / 2 };
}

const paints = new Map<string, SkPaint>();
function paint(color: string, alpha = 1, stroke = 0): SkPaint {
  const key = `${color}|${alpha.toFixed(2)}|${stroke}`;
  let p = paints.get(key);
  if (!p) {
    p = Skia.Paint();
    p.setColor(Skia.Color(color));
    p.setAlphaf(alpha);
    p.setAntiAlias(false);
    if (stroke > 0) {
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(stroke);
      p.setAntiAlias(true);
    }
    paints.set(key, p);
  }
  return p;
}

let mazePaths: { walls: SkPath; web: SkPath; strands: SkPath } | null = null;
function getMazePaths() {
  if (mazePaths) return mazePaths;
  const { tiles } = getMaze();
  const walls = Skia.Path.Make();
  const web = Skia.Path.Make();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (tiles[r][c] === '#') walls.addRect(Skia.XYWHRect(c * TILE, r * TILE, TILE, TILE));
      if (tiles[r][c] === 'W') web.addRect(Skia.XYWHRect(c * TILE, r * TILE, TILE, TILE));
    }
  }
  const strands = Skia.Path.Make();
  const x0 = TILE;
  const y0 = TILE;
  const w = 3 * TILE;
  const h = 2 * TILE;
  strands.moveTo(x0, y0);
  strands.lineTo(x0 + w, y0 + h);
  strands.moveTo(x0 + w, y0);
  strands.lineTo(x0, y0 + h);
  strands.moveTo(x0 + w / 2, y0);
  strands.lineTo(x0 + w / 2, y0 + h);
  strands.moveTo(x0, y0 + h / 2);
  strands.lineTo(x0 + w, y0 + h / 2);
  for (let i = 1; i <= 4; i++) {
    const radius = (Math.min(w, h) / 4) * i;
    strands.addArc(Skia.XYWHRect(x0 - radius, y0 - radius, radius * 2, radius * 2), 0, 90);
  }
  mazePaths = { walls, web, strands };
  return mazePaths;
}

function sprite(canvas: SkCanvas, def: SpriteDef, x: number, y: number, alpha = 1): void {
  canvas.save();
  canvas.translate(x, y);
  for (const part of compile(def).parts) canvas.drawPath(part.path, paint(part.color, alpha));
  canvas.restore();
}

function rect(canvas: SkCanvas, x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
  canvas.drawRect(Skia.XYWHRect(x, y, w, h), paint(color, alpha));
}

const blinkOn = (t: number, hz: number) => Math.floor(t * hz * 2) % 2 === 0;

export function drawScene(canvas: SkCanvas, state: GameState, view: View, time: number): void {
  rect(canvas, 0, 0, view.width, view.height, '#000000');
  canvas.save();
  canvas.translate(view.offsetX, view.offsetY);
  canvas.scale(view.scale, view.scale);
  rect(canvas, 0, 0, FIELD_W, FIELD_H, COLORS.bg);

  const { walls, web, strands } = getMazePaths();
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(BUNKER_COL * TILE - 1, BUNKER_ROW * TILE - 1, BUNKER_W * TILE + 2, BUNKER_H * TILE + 2), 6, 6),
    paint(COLORS.bunkerFloor),
  );
  canvas.drawPath(web, paint(COLORS.webBg));
  canvas.drawPath(strands, paint(COLORS.webStrand, 1, 0.6));
  canvas.drawPath(walls, paint(COLORS.wall));

  for (const seg of state.bunkerSegments) {
    if (seg.hp <= 0) continue;
    const alpha = seg.hp === 3 ? 1 : seg.hp === 2 ? 0.75 : 0.5;
    rect(canvas, seg.col * TILE, seg.row * TILE, TILE, TILE, seg.hp === 3 ? COLORS.bunkerWall : COLORS.bunkerWallDamaged, alpha);
  }

  if (state.gun && blinkOn(time, 2)) sprite(canvas, GUN, state.gun.col * TILE + TILE / 2, state.gun.row * TILE + TILE / 2);

  const modern = state.modernMode;
  const xray = modern && state.buffs.xrayTimer > 0;
  if (modern) for (const pu of state.powerUps) drawPowerUp(canvas, pu);

  if (modern && state.buffs.decoyTimer > 0) {
    sprite(canvas, PLAYER, state.buffs.decoyX, state.buffs.decoyY, 0.35);
    canvas.drawCircle(state.buffs.decoyX, state.buffs.decoyY, 7, paint('#FBBF24', 0.15));
  }

  if (xray) {
    for (const e of state.enemies) {
      if (e.spawning || !lineOfSight(state, e)) continue;
      const p = state.player;
      if (Math.abs(p.y - e.y) <= Math.abs(p.x - e.x)) rect(canvas, Math.min(e.x, p.x), e.y - 0.3, Math.abs(p.x - e.x), 0.6, COLORS.xray, 0.45);
      else rect(canvas, e.x - 0.3, Math.min(e.y, p.y), 0.6, Math.abs(p.y - e.y), COLORS.xray, 0.45);
    }
  }

  for (const e of state.enemies) drawEnemy(canvas, e, xray);

  for (const b of state.bullets) {
    if (b.variant === 'laser') {
      const horizontal = Math.abs(b.vx) > Math.abs(b.vy);
      const len = 8;
      rect(canvas, b.x - (horizontal ? len : 2) / 2, b.y - (horizontal ? 2 : len) / 2, horizontal ? len : 2, horizontal ? 2 : len, COLORS.laserBolt);
      rect(canvas, b.x - (horizontal ? len : 1) / 2, b.y - (horizontal ? 1 : len) / 2, horizontal ? len : 1, horizontal ? 1 : len, COLORS.laserCore);
    } else {
      const color = b.source === 'player' ? COLORS.bullet : b.variant === 'yellow' ? COLORS.yellowBolt : COLORS.enemyBullet;
      rect(canvas, b.x - 1.5, b.y - 1.5, 3, 3, color);
    }
  }

  drawPlayer(canvas, state);

  if (state.flashEMP > 0) rect(canvas, 0, 0, FIELD_W, FIELD_H, '#A78BFA', Math.min(1, state.flashEMP * 0.6));

  for (const p of state.particles) {
    const a = Math.max(0, Math.min(1, p.life / p.maxLife));
    const size = p.size * a;
    rect(canvas, p.x - size / 2, p.y - size / 2, size, size, p.color, a);
  }
  canvas.restore();
}

function drawPlayer(canvas: SkCanvas, state: GameState): void {
  const p = state.player;
  if (p.state === 'respawning') return;
  if (p.invulnTimer > 0 && !blinkOn(p.invulnTimer, 4)) return;
  const modern = state.modernMode;
  if (modern && state.buffs.phaseWalkTimer > 0) canvas.drawCircle(p.x, p.y, 5.5, paint('#A78BFA', 0.35));
  const cloaked = modern && state.buffs.cloakTimer > 0;
  sprite(canvas, p.state === 'paralyzed' ? PLAYER_PARALYZED : PLAYER, p.x, p.y, cloaked ? 0.35 : 1);
  if (modern && state.buffs.shieldHits > 0) canvas.drawCircle(p.x, p.y, 6, paint('#34D399', 0.35));
}

function spriteFor(e: Enemy, xray: boolean): SpriteDef {
  switch (e.type) {
    case 'spider':
      return SPIDER;
    case 'bat':
      return BAT;
    case 'gray':
      return ROBOT_GRAY;
    case 'blue':
      return ROBOT_BLUE;
    case 'white':
      return ROBOT_WHITE;
    case 'black1':
      return ROBOT_BLACK_1;
    case 'black2':
      return ROBOT_BLACK_2;
    default:
      return xray ? ROBOT_INVISIBLE_XRAY : ROBOT_INVISIBLE;
  }
}

function drawEnemy(canvas: SkCanvas, e: Enemy, xray: boolean): void {
  if (e.spawning && !blinkOn(e.spawnTimer, 6)) return;
  if (e.shieldTimer > 0 && blinkOn(e.shieldTimer, 5)) {
    rect(canvas, e.x - 7, e.y - 7, 14, 14, COLORS.shieldHalo, 0.85);
    rect(canvas, e.x - 5, e.y - 5, 10, 10, '#000000', 0.5);
  }
  const ghost = e.type === 'invisible' && !e.spawning && !xray;
  sprite(canvas, spriteFor(e, xray), e.x, e.y, ghost ? 0.25 : 1);
}

function drawPowerUp(canvas: SkCanvas, pu: PowerUp): void {
  if (pu.ttl < POWERUP_BLINK_THRESHOLD && !blinkOn(POWERUP_TTL - pu.ttl, 4)) return;
  const def = POWERUP_DEFS[pu.kind];
  const cx = pu.col * TILE + TILE / 2;
  const cy = pu.row * TILE + TILE / 2;
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(cx - 4.5, cy - 4.5, 9, 9), 2, 2), paint(def.color));
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(cx - 3.5, cy - 3.5, 7, 7), 1.5, 1.5), paint(def.bg));
  const glyph = FONT_3X5[def.icon === 'x2' ? '2' : def.icon];
  if (!glyph) return;
  const px = 0.9;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      if (glyph[r][c] === '1') rect(canvas, cx - 1.5 * px + c * px, cy - 2.5 * px + r * px, px, px, def.color);
    }
  }
}
