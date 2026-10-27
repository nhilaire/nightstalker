// Modern-mode power-ups: definitions, spawning and effects (ported from the prototype; texts live in i18n).
import {
  COLS,
  GUN_AMMO,
  POWERUP_MIN_DIST,
  POWERUP_SPAWN_MAX,
  POWERUP_SPAWN_MIN,
  POWERUP_TTL,
  ROWS,
} from './constants';
import { dist2 } from './collisions';
import { cellCenter } from './maze';
import { pick, Rng } from './rng';
import { isFreeCell, pickGunSpawn } from './spawn';
import type { CurseKind, FlashLabel, GameState, PowerUp, PowerUpKind } from './types';

export type PowerUpDef = { icon: string; color: string; bg: string; duration?: number; charges?: number };

export const POWERUP_DEFS: Record<PowerUpKind, PowerUpDef> = {
  slowMo: { icon: 'S', color: '#0EA5E9', bg: '#0C4A6E', duration: 25 },
  freeze: { icon: 'F', color: '#67E8F9', bg: '#155E75', duration: 4 },
  cloak: { icon: 'C', color: '#A78BFA', bg: '#3B0764', duration: 8 },
  rapidFire: { icon: 'R', color: '#F97316', bg: '#7C2D12', duration: 6 },
  piercing: { icon: 'P', color: '#22D3EE', bg: '#155E75', charges: 1 },
  spread: { icon: '3', color: '#F472B6', bg: '#831843', charges: 1 },
  heavy: { icon: 'H', color: '#F87171', bg: '#7F1D1D', charges: 3 },
  boomerang: { icon: 'O', color: '#FACC15', bg: '#713F12', charges: 1 },
  shield: { icon: '+', color: '#34D399', bg: '#064E3B', charges: 1 },
  bunkerRepair: { icon: 'B', color: '#94A3B8', bg: '#1F2937' },
  phaseWalk: { icon: '~', color: '#A78BFA', bg: '#312E81', duration: 4 },
  decoy: { icon: 'D', color: '#FBBF24', bg: '#78350F', duration: 8 },
  scoreX2: { icon: 'x2', color: '#FACC15', bg: '#78350F', duration: 30 },
  ammo: { icon: 'A', color: '#FACC15', bg: '#713F12' },
  magnet: { icon: 'M', color: '#22D3EE', bg: '#0C4A6E' },
  extraLife: { icon: '*', color: '#FB7185', bg: '#7F1D1D' },
  emp: { icon: 'E', color: '#A78BFA', bg: '#1E1B4B' },
  xray: { icon: 'X', color: '#10B981', bg: '#064E3B', duration: 12 },
  mystery: { icon: '?', color: '#E879F9', bg: '#581C87' },
};

export const POWERUP_KINDS = Object.keys(POWERUP_DEFS) as PowerUpKind[];

// Guide groups (PRD "Screens > Guide").
export const POWERUP_GROUPS: { id: 'tempo' | 'offense' | 'defense' | 'economy' | 'info' | 'mystery'; kinds: PowerUpKind[] }[] = [
  { id: 'tempo', kinds: ['slowMo', 'freeze', 'cloak', 'rapidFire'] },
  { id: 'offense', kinds: ['piercing', 'spread', 'heavy', 'boomerang'] },
  { id: 'defense', kinds: ['shield', 'bunkerRepair', 'phaseWalk', 'decoy'] },
  { id: 'economy', kinds: ['scoreX2', 'ammo', 'magnet', 'extraLife'] },
  { id: 'info', kinds: ['emp', 'xray'] },
  { id: 'mystery', kinds: ['mystery'] },
];

export const SPAWN_WEIGHTS: { kind: PowerUpKind; w: number }[] = [
  { kind: 'slowMo', w: 3 },
  { kind: 'freeze', w: 1 },
  { kind: 'cloak', w: 2 },
  { kind: 'rapidFire', w: 3 },
  { kind: 'piercing', w: 2 },
  { kind: 'spread', w: 2 },
  { kind: 'heavy', w: 1 },
  { kind: 'boomerang', w: 1 },
  { kind: 'shield', w: 2 },
  { kind: 'bunkerRepair', w: 1 },
  { kind: 'phaseWalk', w: 1 },
  { kind: 'decoy', w: 1 },
  { kind: 'scoreX2', w: 3 },
  { kind: 'ammo', w: 3 },
  { kind: 'magnet', w: 1 },
  { kind: 'extraLife', w: 0.5 },
  { kind: 'emp', w: 2 },
  { kind: 'xray', w: 2 },
  { kind: 'mystery', w: 2 },
];

export const MYSTERY_BUFFS: PowerUpKind[] = [
  'slowMo',
  'rapidFire',
  'shield',
  'scoreX2',
  'ammo',
  'extraLife',
  'emp',
  'xray',
  'spread',
  'heavy',
  'piercing',
  'bunkerRepair',
];
export const CURSES: CurseKind[] = ['slow', 'noAmmo', 'volley'];
export const CURSE_SLOW_TIME = 10;
export const MYSTERY_SAFE_SCORE = 5000;
export const MYSTERY_SAFE_LIVES = 2;
export const EMP_MIN_COOLDOWN = 3;
export const MAGNET_RANGE = 4;

export function pickPowerUpKind(rng: Rng): PowerUpKind {
  const total = SPAWN_WEIGHTS.reduce((s, w) => s + w.w, 0);
  let r = rng() * total;
  for (const e of SPAWN_WEIGHTS) {
    r -= e.w;
    if (r <= 0) return e.kind;
  }
  return SPAWN_WEIGHTS[0].kind;
}

// A free cell, not the gun nor another power-up, at least 70 units from the player.
export function pickPowerUpCell(state: GameState, rng: Rng): { col: number; row: number } | null {
  for (let attempt = 0; attempt < 80; attempt++) {
    const col = 1 + Math.floor(rng() * (COLS - 2));
    const row = 1 + Math.floor(rng() * (ROWS - 2));
    if (!isFreeCell(state, col, row)) continue;
    if (state.gun && state.gun.col === col && state.gun.row === row) continue;
    if (state.powerUps.some((p) => p.col === col && p.row === row)) continue;
    const c = cellCenter(col, row);
    if (dist2(c.x, c.y, state.player.x, state.player.y) < POWERUP_MIN_DIST * POWERUP_MIN_DIST) continue;
    return { col, row };
  }
  return null;
}

export function spawnPowerUp(state: GameState, rng: Rng, kind?: PowerUpKind): PowerUp | null {
  const cell = pickPowerUpCell(state, rng);
  if (!cell) return null;
  state.powerUpIdCounter += 1;
  const pu: PowerUp = { id: state.powerUpIdCounter, kind: kind ?? pickPowerUpKind(rng), col: cell.col, row: cell.row, ttl: POWERUP_TTL };
  state.powerUps.push(pu);
  return pu;
}

export function nextSpawnDelay(rng: Rng): number {
  return POWERUP_SPAWN_MIN + rng() * (POWERUP_SPAWN_MAX - POWERUP_SPAWN_MIN);
}

// Applies a picked-up power-up and returns what the HUD flashes.
export function applyPickup(state: GameState, kind: PowerUpKind, rng: Rng): FlashLabel {
  const def = POWERUP_DEFS[kind];
  const b = state.buffs;
  const label: FlashLabel = { kind: 'powerup', powerUp: kind };
  switch (kind) {
    case 'slowMo':
      b.slowMoTimer = def.duration!;
      break;
    case 'freeze':
      b.freezeTimer = def.duration!;
      break;
    case 'cloak':
      b.cloakTimer = def.duration!;
      break;
    case 'rapidFire':
      b.rapidFireTimer = def.duration!;
      break;
    case 'phaseWalk':
      b.phaseWalkTimer = def.duration!;
      break;
    case 'xray':
      b.xrayTimer = def.duration!;
      break;
    case 'scoreX2':
      b.scoreMultTimer = def.duration!;
      b.scoreMult = 2;
      break;
    case 'decoy':
      b.decoyTimer = def.duration!;
      b.decoyX = state.player.x;
      b.decoyY = state.player.y;
      break;
    case 'piercing':
      b.piercingShots += 1;
      break;
    case 'spread':
      b.spreadShots += 1;
      break;
    case 'heavy':
      b.heavyShots += 3;
      break;
    case 'boomerang':
      b.boomerangShots += 1;
      break;
    case 'shield':
      b.shieldHits += 1;
      break;
    case 'bunkerRepair':
      for (const seg of state.bunkerSegments) seg.hp = 3;
      break;
    case 'ammo':
      state.player.hasGun = true;
      state.player.ammo = GUN_AMMO;
      state.gun = null;
      state.combo.clutchArmed = false;
      break;
    case 'extraLife':
      state.lives += 1;
      state.flashLifeBonus = 1.2;
      break;
    case 'magnet':
      moveGunNearPlayer(state);
      break;
    case 'emp':
      state.bullets = state.bullets.filter((x) => x.source !== 'enemy');
      for (const e of state.enemies) e.shootCooldown = Math.max(e.shootCooldown, EMP_MIN_COOLDOWN);
      state.flashEMP = 0.5;
      break;
    case 'mystery': {
      const safe = state.score < MYSTERY_SAFE_SCORE || state.lives < MYSTERY_SAFE_LIVES;
      if (safe || rng() < 0.5) return applyPickup(state, pick(rng, MYSTERY_BUFFS), rng);
      const curse = pick(rng, CURSES);
      applyCurse(state, curse);
      return { kind: 'curse', curse };
    }
  }
  return label;
}

export function applyCurse(state: GameState, curse: CurseKind): void {
  if (curse === 'slow') state.buffs.slowDebuffTimer = CURSE_SLOW_TIME;
  else if (curse === 'noAmmo') {
    state.player.ammo = 0;
    state.player.hasGun = false;
    if (!state.gun) state.gun = pickGunSpawn(state);
  } else {
    for (const e of state.enemies) e.shootCooldown = 0;
  }
}

// The gun moves to the 3rd closest free cell within 4 cells of the player.
function moveGunNearPlayer(state: GameState): void {
  const pc = Math.floor(state.player.x / 10);
  const pr = Math.floor(state.player.y / 10);
  const candidates: { col: number; row: number; d: number }[] = [];
  for (let dy = -MAGNET_RANGE; dy <= MAGNET_RANGE; dy++) {
    for (let dx = -MAGNET_RANGE; dx <= MAGNET_RANGE; dx++) {
      if (isFreeCell(state, pc + dx, pr + dy)) candidates.push({ col: pc + dx, row: pr + dy, d: dx * dx + dy * dy });
    }
  }
  if (!candidates.length) return;
  candidates.sort((a, b) => a.d - b.d);
  const target = candidates[Math.min(2, candidates.length - 1)];
  state.gun = { col: target.col, row: target.row };
}
