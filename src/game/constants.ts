// Tunables ported from the prototype (C:/dev/Nightstalker src/game/constants.ts). Every number is a PRD rule.
import type { EnemyType } from './types';

// Logical playfield (game units). Rendering scales it to the screen.
export const FIELD_W = 200;
export const FIELD_H = 120;

export const TILE = 10;
export const COLS = FIELD_W / TILE; // 20
export const ROWS = FIELD_H / TILE; // 12

// Player
export const PLAYER_SPEED = 30;
export const PLAYER_WEB_SPEED = 15;
export const PLAYER_RADIUS = 3.5;
export const PLAYER_PARALYSIS = 1.0;
export const PLAYER_RESPAWN = 0.8;
export const PLAYER_INVULN_AFTER_RESPAWN = 1.2;
export const STICK_DEAD_ZONE = 0.25;
export const SNAP_TOL = 1.2;

// Bullets
export const PLAYER_BULLET_SPEED = 90;
export const ENEMY_BULLET_SPEED = 45;
export const BULLET_RADIUS = 1.5;
export const BULLET_TTL = 6;
export const BULLET_SUBSTEP = 1.5;

// Weapon
export const GUN_AMMO = 6;
export const GUN_PICKUP_RADIUS = 4;
export const NO_AMMO_FLASH = 0.3;

// Lives
export const STARTING_LIVES = 6;
export const LIFE_BONUS_EVERY = 10000;

export const SCORE: Record<EnemyType, number> = {
  spider: 100,
  bat: 300,
  gray: 200,
  blue: 500,
  white: 1000,
  black1: 2000,
  black2: 2000,
  invisible: 4000,
};

// Score thresholds of tiers 1..5.
export const TIER_THRESHOLDS = [5000, 15000, 30000, 50000, 80000] as const;
export const MAIN_BY_TIER: readonly EnemyType[] = ['gray', 'blue', 'white', 'black1', 'black2', 'invisible'];
export const MAX_BAT_CONVERSIONS = 2;

export const ENEMY_HP: Record<EnemyType, number> = {
  spider: 1,
  bat: 1,
  gray: 1,
  blue: 1,
  white: 3,
  black1: 3,
  black2: 3,
  invisible: 3,
};

export const ENEMY_SPEED: Record<EnemyType, number> = {
  spider: 7,
  bat: 15,
  gray: 22,
  blue: 26,
  white: 26,
  black1: 23,
  black2: 23,
  invisible: 24,
};

export const ENEMY_RADIUS = 4;
export const ENEMY_SPAWN_TIME = 1.2;
export const SHIELD_TIME = 2;
export const STUCK_CHECK_EVERY = 2;
export const STUCK_MIN_MOVE = 5;
export const FORCE_RANDOM_TIME = 2.5;
export const ENEMY_CENTER_TOL = 1.5;
export const ENEMY_PROBE = TILE * 0.6;

// Fire cooldown base (s) per shooting robot; after a shot the cooldown is base + random(0..0.6).
export const ENEMY_SHOOT_CD: Partial<Record<EnemyType, number>> = {
  gray: 2.2,
  blue: 1.8,
  white: 1.6,
  black1: 1.4,
  black2: 1.2,
  invisible: 1.0,
};
export const LOS_TOL = TILE * 0.6;
export const LOS_TOL_INVISIBLE = TILE * 1.4;

// Heartbeat loop period (s) per active main robot.
export const HEARTBEAT_TEMPO: Record<EnemyType, number> = {
  spider: 1.8,
  bat: 1.8,
  gray: 1.8,
  blue: 1.65,
  white: 1.5,
  black1: 1.35,
  black2: 1.2,
  invisible: 1.05,
};

// Bunker: 3x2 cells, single door in the middle of the top row, which is also the spawn cell.
export const BUNKER_COL = 8;
export const BUNKER_ROW = 4;
export const BUNKER_W = 3;
export const BUNKER_H = 2;
export const BUNKER_DOOR_COL = 9;
export const BUNKER_HP = 3;

// Spider anchor (near the web, NW) and leash.
export const SPIDER_ANCHOR = { x: 20, y: 15 };
export const SPIDER_LEASH = 80;

// Robot pen: single cell, gate on its right.
export const PEN_COL = 1;
export const PEN_ROW = 10;

export const GUN_SPAWNS: readonly { col: number; row: number }[] = [
  { col: 5, row: 3 },
  { col: 18, row: 1 },
  { col: 18, row: 5 },
  { col: 5, row: 8 },
  { col: 18, row: 10 },
];

export const SPIDER_SPAWNS: readonly { col: number; row: number }[] = [
  { col: 1, row: 1 },
  { col: 2, row: 1 },
  { col: 3, row: 1 },
  { col: 1, row: 2 },
  { col: 2, row: 2 },
  { col: 3, row: 2 },
  { col: 1, row: 3 },
  { col: 3, row: 3 },
];
export const BAT_SPAWNS_FIRST: readonly { col: number; row: number }[] = [
  { col: 18, row: 1 },
  { col: 17, row: 1 },
  { col: 18, row: 3 },
  { col: 15, row: 3 },
];
export const BAT_SPAWNS_SECOND: readonly { col: number; row: number }[] = [
  { col: 18, row: 10 },
  { col: 15, row: 10 },
  { col: 10, row: 10 },
  { col: 18, row: 6 },
];

// Modern mode
export const COMBO_WINDOW = 4;
export const BONUS_FLASH = 2.5;
export const PICKUP_FLASH = 2.0;
export const QUICK_DRAW_TIME = 1.5;
export const FULL_CLIP_MIN_SHOTS = 4;
export const BONUS_POINTS = {
  doubleKill: 250,
  tripleKill: 750,
  megaKill: 1500,
  quickDraw: 500,
  clutch: 1000,
  fullClip: 1000,
  noBunker: 2000,
} as const;

export const POWERUP_FIRST_SPAWN = 18;
export const POWERUP_SPAWN_MIN = 22;
export const POWERUP_SPAWN_MAX = 38;
export const POWERUP_TTL = 12;
export const POWERUP_BLINK_THRESHOLD = 4;
export const POWERUP_PICKUP_RADIUS = 5;
export const POWERUP_MIN_DIST = 70;

// Game loop
export const MAX_DT = 0.05;

// Colours used by the engine for particles (the renderer owns the rest of the palette).
export const PARTICLE_COLORS: Record<EnemyType, string> = {
  spider: '#EC4899',
  bat: '#A855F7',
  gray: '#94A3B8',
  blue: '#3B82F6',
  white: '#F1F5F9',
  black1: '#475569',
  black2: '#F59E0B',
  invisible: '#1F2937',
};
