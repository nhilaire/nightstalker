// Main game step (ported from the prototype's engine.ts). Pure TypeScript: time (dt) and randomness (rng) are
// inputs; sounds, haptics and telemetry are returned as state.events for the screen to consume.
import {
  BONUS_FLASH,
  BONUS_POINTS,
  BULLET_RADIUS,
  BULLET_SUBSTEP,
  BULLET_TTL,
  COMBO_WINDOW,
  ENEMY_RADIUS,
  FIELD_H,
  FIELD_W,
  FULL_CLIP_MIN_SHOTS,
  GUN_AMMO,
  GUN_PICKUP_RADIUS,
  HEARTBEAT_TEMPO,
  LIFE_BONUS_EVERY,
  MAX_BAT_CONVERSIONS,
  NO_AMMO_FLASH,
  PARTICLE_COLORS,
  PICKUP_FLASH,
  PLAYER_BULLET_SPEED,
  PLAYER_INVULN_AFTER_RESPAWN,
  PLAYER_PARALYSIS,
  PLAYER_RADIUS,
  PLAYER_RESPAWN,
  PLAYER_SPEED,
  PLAYER_WEB_SPEED,
  POWERUP_FIRST_SPAWN,
  POWERUP_PICKUP_RADIUS,
  QUICK_DRAW_TIME,
  SCORE,
  SHIELD_TIME,
  SNAP_TOL,
  STARTING_LIVES,
  STICK_DEAD_ZONE,
  TIER_THRESHOLDS,
  TILE,
} from './constants';
import { hasReactiveShield, isTrackingType, tickEnemy } from './ai';
import { bulletHitsBunker, bulletHitsWall, circlesOverlap } from './collisions';
import { getMaze, isInsideBunker, isWebTile, spawnPoint } from './maze';
import { applyPickup, nextSpawnDelay, spawnPowerUp } from './powerups';
import { Rng } from './rng';
import { ensureRoster, mainTypeForScore, pickGunSpawn, tierForScore } from './spawn';
import type {
  ActiveBuffs,
  BonusKind,
  Bullet,
  CardinalDir,
  ComboState,
  Enemy,
  EnemyType,
  GameState,
  InputState,
  Particle,
  Player,
  Vec2,
} from './types';

function freshBuffs(): ActiveBuffs {
  return {
    slowMoTimer: 0,
    freezeTimer: 0,
    cloakTimer: 0,
    rapidFireTimer: 0,
    phaseWalkTimer: 0,
    scoreMultTimer: 0,
    scoreMult: 1,
    xrayTimer: 0,
    decoyTimer: 0,
    decoyX: 0,
    decoyY: 0,
    shieldHits: 0,
    piercingShots: 0,
    spreadShots: 0,
    heavyShots: 0,
    boomerangShots: 0,
    slowDebuffTimer: 0,
  };
}

function freshCombo(): ComboState {
  return {
    comboCount: 0,
    comboMult: 1,
    comboTimer: 0,
    clipShotsFired: 0,
    clipShotsHit: 0,
    currentTier: 0,
    enteredBunkerThisTier: false,
    clutchArmed: false,
    flash: null,
    flashTimer: 0,
  };
}

function freshPlayer(): Player {
  const p = spawnPoint();
  return {
    x: p.x,
    y: p.y,
    hasGun: false,
    ammo: 0,
    state: 'alive',
    paralysisTimer: 0,
    respawnTimer: 0,
    invulnTimer: PLAYER_INVULN_AFTER_RESPAWN,
    lastMoveDir: 'N',
    currentDir: null,
  };
}

export function emptyInput(): InputState {
  return { dir: { x: 0, y: 0 }, fireRequested: false, fireDir: null };
}

// A fresh run: highScore is the saved best before this run (0 when none).
export function createGame(options: { highScore: number; modernMode: boolean; rng: Rng }): GameState {
  const state: GameState = {
    phase: 'playing',
    score: 0,
    lives: STARTING_LIVES,
    nextLifeAt: LIFE_BONUS_EVERY,
    elapsed: 0,
    player: freshPlayer(),
    enemies: [],
    bullets: [],
    gun: null,
    bunkerSegments: getMaze().bunkerSegments.map((s) => ({ ...s })),
    particles: [],
    enemyIdCounter: 0,
    bulletIdCounter: 0,
    flashLifeBonus: 0,
    flashNoAmmo: 0,
    flashEMP: 0,
    highScore: options.highScore,
    newHighScore: false,
    bluePhaseConversions: 0,
    activeMainType: 'gray',
    maxTierReached: 0,
    modernMode: options.modernMode,
    powerUps: [],
    powerUpIdCounter: 0,
    powerUpSpawnTimer: POWERUP_FIRST_SPAWN,
    buffs: freshBuffs(),
    combo: freshCombo(),
    endReason: null,
    events: [],
  };
  state.gun = pickGunSpawn(state);
  ensureRoster(state, options.rng);
  return state;
}

// Ends the run from the pause menu.
export function quitGame(state: GameState): void {
  if (state.phase !== 'playing') return;
  state.phase = 'gameover';
  state.endReason = 'quit';
  state.events.push({ type: 'gameOver' });
}

export function tick(state: GameState, dt: number, input: InputState, rng: Rng): void {
  state.events = [];
  if (state.phase !== 'playing') return;
  state.elapsed += dt;
  if (state.flashLifeBonus > 0) state.flashLifeBonus = Math.max(0, state.flashLifeBonus - dt);
  if (state.flashNoAmmo > 0) state.flashNoAmmo = Math.max(0, state.flashNoAmmo - dt);
  if (state.flashEMP > 0) state.flashEMP = Math.max(0, state.flashEMP - dt);

  if (state.modernMode) {
    updateBuffs(state, dt);
    updatePowerUpSpawns(state, dt, rng);
    updateCombo(state, dt);
    updateTierTracking(state);
  }

  updatePlayer(state, dt, input, rng);
  updateBullets(state, dt, rng);

  const frozen = state.modernMode && state.buffs.freezeTimer > 0;
  const enemyDt = frozen ? 0 : state.modernMode && state.buffs.slowMoTimer > 0 ? dt * 0.5 : dt;
  if (enemyDt > 0) for (const e of state.enemies) tickEnemy(state, e, enemyDt, rng);

  resolvePlayerVsEnemies(state, rng);
  ensureRoster(state, rng);
  updateParticles(state, dt);

  if (state.lives <= 0 && state.player.state !== 'respawning') {
    state.phase = 'gameover';
    state.endReason = 'lives';
    state.events.push({ type: 'gameOver' });
  }
}

function updateBuffs(state: GameState, dt: number): void {
  const b = state.buffs;
  const dec = (v: number) => Math.max(0, v - dt);
  b.slowMoTimer = dec(b.slowMoTimer);
  b.freezeTimer = dec(b.freezeTimer);
  b.cloakTimer = dec(b.cloakTimer);
  b.rapidFireTimer = dec(b.rapidFireTimer);
  b.phaseWalkTimer = dec(b.phaseWalkTimer);
  b.xrayTimer = dec(b.xrayTimer);
  b.decoyTimer = dec(b.decoyTimer);
  b.slowDebuffTimer = dec(b.slowDebuffTimer);
  if (b.scoreMultTimer > 0) {
    b.scoreMultTimer = dec(b.scoreMultTimer);
    if (b.scoreMultTimer === 0) b.scoreMult = 1;
  }
}

function updatePowerUpSpawns(state: GameState, dt: number, rng: Rng): void {
  state.powerUps = state.powerUps.filter((p) => {
    p.ttl -= dt;
    return p.ttl > 0;
  });
  state.powerUpSpawnTimer -= dt;
  if (state.powerUpSpawnTimer <= 0 && state.powerUps.length === 0) {
    const pu = spawnPowerUp(state, rng);
    state.powerUpSpawnTimer = nextSpawnDelay(rng);
    if (pu) state.events.push({ type: 'powerUpAppear' });
  }
}

function updateCombo(state: GameState, dt: number): void {
  const c = state.combo;
  if (c.comboTimer > 0) {
    c.comboTimer = Math.max(0, c.comboTimer - dt);
    if (c.comboTimer === 0) {
      c.comboCount = 0;
      c.comboMult = 1;
    }
  }
  if (c.flashTimer > 0) {
    c.flashTimer = Math.max(0, c.flashTimer - dt);
    if (c.flashTimer === 0) c.flash = null;
  }
}

// No-bunker run: a new tier reached without having been inside the bunker since the previous one.
function updateTierTracking(state: GameState): void {
  const tier = tierForScore(state.score);
  if (tier > state.combo.currentTier) {
    if (!state.combo.enteredBunkerThisTier) grantBonus(state, 'noBunker', BONUS_POINTS.noBunker);
    state.combo.currentTier = tierForScore(state.score);
    state.combo.enteredBunkerThisTier = false;
  }
  if (isInsideBunker(state.player.x, state.player.y)) state.combo.enteredBunkerThisTier = true;
}

export function grantBonus(state: GameState, bonus: BonusKind, points: number): void {
  state.combo.flash = { kind: 'bonus', bonus, points };
  state.combo.flashTimer = BONUS_FLASH;
  if (points > 0) addScore(state, points);
}

// Adds points (x score multiplier in modern mode), life bonuses, the new-best flag and tier events.
export function addScore(state: GameState, pts: number): void {
  if (pts <= 0) return;
  const mult = state.modernMode ? state.buffs.scoreMult : 1;
  state.score += Math.round(pts * mult);
  if (state.score > state.highScore) state.newHighScore = true;
  while (state.score >= state.nextLifeAt) {
    state.lives += 1;
    state.flashLifeBonus = 1.5;
    state.nextLifeAt += LIFE_BONUS_EVERY;
    state.events.push({ type: 'lifeBonus' });
  }
  const tier = tierForScore(state.score);
  while (state.maxTierReached < tier) {
    state.maxTierReached += 1;
    state.events.push({ type: 'tierReached', tier: state.maxTierReached });
  }
}

function updatePlayer(state: GameState, dt: number, input: InputState, rng: Rng): void {
  const p = state.player;
  if (p.state === 'respawning') {
    p.respawnTimer -= dt;
    if (p.respawnTimer <= 0) {
      const s = spawnPoint();
      p.x = s.x;
      p.y = s.y;
      p.state = 'alive';
      p.invulnTimer = PLAYER_INVULN_AFTER_RESPAWN;
      p.currentDir = null;
    }
    return;
  }
  if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  if (p.state === 'paralyzed') {
    p.paralysisTimer -= dt;
    if (p.paralysisTimer <= 0) p.state = 'alive';
    return;
  }

  movePlayerOnGrid(state, dt, input);

  if (state.gun) {
    const gx = state.gun.col * TILE + TILE / 2;
    const gy = state.gun.row * TILE + TILE / 2;
    if (circlesOverlap(p.x, p.y, PLAYER_RADIUS, gx, gy, GUN_PICKUP_RADIUS)) {
      const c = state.combo;
      if (state.modernMode && c.clipShotsFired >= FULL_CLIP_MIN_SHOTS && c.clipShotsHit === c.clipShotsFired) {
        grantBonus(state, 'fullClip', BONUS_POINTS.fullClip);
      }
      c.clipShotsFired = 0;
      c.clipShotsHit = 0;
      c.clutchArmed = false;
      p.hasGun = true;
      p.ammo = GUN_AMMO;
      state.gun = null;
      state.events.push({ type: 'gunPickup' });
    }
  }

  if (state.modernMode && state.powerUps.length) {
    state.powerUps = state.powerUps.filter((pu) => {
      const px = pu.col * TILE + TILE / 2;
      const py = pu.row * TILE + TILE / 2;
      if (!circlesOverlap(p.x, p.y, PLAYER_RADIUS, px, py, POWERUP_PICKUP_RADIUS)) return true;
      const gunBefore = state.gun;
      state.combo.flash = applyPickup(state, pu.kind, rng);
      state.combo.flashTimer = PICKUP_FLASH;
      if (state.gun && !gunBefore) state.events.push({ type: 'gunSpawn' });
      state.events.push({ type: 'powerUpPickup', kind: pu.kind });
      return false;
    });
  }

  if (input.fireRequested) {
    if (!p.hasGun || p.ammo <= 0) {
      state.flashNoAmmo = NO_AMMO_FLASH;
      state.events.push({ type: 'noAmmo' });
    } else {
      const rapid = state.modernMode && state.buffs.rapidFireTimer > 0;
      if (rapid || !state.bullets.some((b) => b.source === 'player')) {
        const dir = resolveShootDir(state, input.fireDir, p.lastMoveDir);
        p.lastMoveDir = dir;
        p.ammo -= 1;
        const lastOfClip = p.ammo === 0;
        firePlayerVolley(state, dir, lastOfClip);
        if (state.modernMode) state.combo.clipShotsFired += 1;
        if (lastOfClip) {
          state.combo.clutchArmed = true;
          p.hasGun = false;
          state.gun = pickGunSpawn(state);
          state.events.push({ type: 'gunSpawn' });
        }
        state.events.push({ type: 'shoot' });
      }
    }
  }
}

function firePlayerVolley(state: GameState, dir: CardinalDir, lastOfClip: boolean): void {
  const b = state.buffs;
  const modern = state.modernMode;
  const piercing = modern && b.piercingShots > 0;
  const heavy = modern && b.heavyShots > 0;
  const spread = modern && b.spreadShots > 0;
  const boomerang = modern && b.boomerangShots > 0;
  for (const d of spread ? spreadDirs(dir) : [dir]) spawnPlayerBullet(state, d, { piercing, heavy, boomerang, lastOfClip });
  if (piercing) b.piercingShots -= 1;
  if (spread) b.spreadShots -= 1;
  if (heavy) b.heavyShots -= 1;
  if (boomerang) b.boomerangShots -= 1;
}

function spreadDirs(d: CardinalDir): CardinalDir[] {
  return d === 'N' || d === 'S' ? [d, 'E', 'W'] : [d, 'N', 'S'];
}

export function resolveShootDir(state: GameState, fireDir: InputState['fireDir'], fallback: CardinalDir): CardinalDir {
  if (fireDir === 'auto') return autoAimDir(state) ?? fallback;
  return fireDir ?? fallback;
}

// Dominant axis towards the nearest active (not spawning) enemy.
export function autoAimDir(state: GameState): CardinalDir | null {
  const p = state.player;
  let best: Enemy | null = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    if (e.spawning) continue;
    const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best ? dominantDir(best.x - p.x, best.y - p.y) : null;
}

// Dominant axis of a vector (ties go to the vertical axis, as in the prototype's auto-aim).
export function dominantDir(dx: number, dy: number): CardinalDir {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'E' : 'W';
  return dy > 0 ? 'S' : 'N';
}

// Joystick vector to a cardinal direction (dead zone 0.25; ties go to the horizontal axis, as in the prototype).
export function stickToCardinal(dx: number, dy: number): CardinalDir | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < STICK_DEAD_ZONE) return null;
  if (ax >= ay) return dx > 0 ? 'E' : 'W';
  return dy > 0 ? 'S' : 'N';
}

function dirOffset(d: CardinalDir): { dc: number; dr: number } {
  return d === 'N' ? { dc: 0, dr: -1 } : d === 'S' ? { dc: 0, dr: 1 } : d === 'E' ? { dc: 1, dr: 0 } : { dc: -1, dr: 0 };
}

function dirVec(d: CardinalDir): Vec2 {
  const o = dirOffset(d);
  return { x: o.dc, y: o.dr };
}

export function canPlayerEnter(state: GameState, col: number, row: number): boolean {
  const { tiles } = getMaze();
  if (col < 0 || col >= tiles[0].length || row < 0 || row >= tiles.length) return false;
  const phase = state.modernMode && state.buffs.phaseWalkTimer > 0;
  if (!phase && (tiles[row][col] === '#' || tiles[row][col] === 'G')) return false;
  return !state.bunkerSegments.some((s) => s.hp > 0 && s.col === col && s.row === row);
}

function isSameAxis(a: CardinalDir, b: CardinalDir): boolean {
  return (a === 'N' || a === 'S') === (b === 'N' || b === 'S');
}

// Pac-Man style lane movement: cardinal moves only, perpendicular turns at cell centres, instant reverse and stop.
function movePlayerOnGrid(state: GameState, dt: number, input: InputState): void {
  const p = state.player;
  const col = Math.floor(p.x / TILE);
  const row = Math.floor(p.y / TILE);
  const cx = col * TILE + TILE / 2;
  const cy = row * TILE + TILE / 2;
  const atVerticalLane = Math.abs(p.x - cx) < SNAP_TOL;
  const atHorizontalLane = Math.abs(p.y - cy) < SNAP_TOL;
  const atCenter = atVerticalLane && atHorizontalLane;
  const preferred = stickToCardinal(input.dir.x, input.dir.y);

  if (!preferred) {
    if (p.currentDir === 'N' || p.currentDir === 'S') p.x = cx;
    else if (p.currentDir === 'E' || p.currentDir === 'W') p.y = cy;
    p.currentDir = null;
    return;
  }

  if (preferred !== p.currentDir) {
    const vertical = preferred === 'N' || preferred === 'S';
    const canChange = p.currentDir ? isSameAxis(p.currentDir, preferred) || atCenter : vertical ? atVerticalLane : atHorizontalLane;
    if (canChange) {
      const off = dirOffset(preferred);
      if (canPlayerEnter(state, col + off.dc, row + off.dr)) {
        if (vertical) p.x = cx;
        else p.y = cy;
        p.currentDir = preferred;
        p.lastMoveDir = preferred;
      }
    }
  }

  if (p.currentDir && atCenter) {
    const cur = dirOffset(p.currentDir);
    if (!canPlayerEnter(state, col + cur.dc, row + cur.dr)) {
      p.x = cx;
      p.y = cy;
      p.currentDir = null;
      return;
    }
  }
  if (!p.currentDir) return;

  let speed = isWebTile(getMaze().tiles, col, row) ? PLAYER_WEB_SPEED : PLAYER_SPEED;
  if (state.modernMode && state.buffs.slowDebuffTimer > 0) speed *= 0.5;
  const v = dirVec(p.currentDir);
  let nx = p.x + v.x * speed * dt;
  let ny = p.y + v.y * speed * dt;
  if (p.currentDir === 'N' || p.currentDir === 'S') nx = cx;
  else ny = cy;

  const newCol = Math.floor(nx / TILE);
  const newRow = Math.floor(ny / TILE);
  if ((newCol !== col || newRow !== row) && !canPlayerEnter(state, newCol, newRow)) {
    p.x = cx;
    p.y = cy;
    p.currentDir = null;
    return;
  }
  p.x = nx;
  p.y = ny;
}

function spawnPlayerBullet(
  state: GameState,
  dir: CardinalDir,
  opts: { piercing: boolean; heavy: boolean; boomerang: boolean; lastOfClip: boolean },
): void {
  const dv = dirVec(dir);
  state.bulletIdCounter += 1;
  state.bullets.push({
    id: state.bulletIdCounter,
    x: state.player.x + dv.x * (PLAYER_RADIUS + 1),
    y: state.player.y + dv.y * (PLAYER_RADIUS + 1),
    vx: dv.x * PLAYER_BULLET_SPEED,
    vy: dv.y * PLAYER_BULLET_SPEED,
    source: 'player',
    variant: 'normal',
    ttl: BULLET_TTL,
    hitIds: [],
    piercing: opts.piercing || undefined,
    heavy: opts.heavy || undefined,
    boomerang: opts.boomerang ? 'forward' : undefined,
    killsCount: 0,
    lastOfClip: opts.lastOfClip || undefined,
  });
}

function resetShooterCooldown(state: GameState, b: Bullet): void {
  if (b.shooterId === undefined) return;
  const shooter = state.enemies.find((e) => e.id === b.shooterId);
  if (shooter) shooter.shootCooldown = 0;
}

function updateBullets(state: GameState, dt: number, rng: Rng): void {
  const survivors: Bullet[] = [];
  for (const b of state.bullets) {
    b.ttl -= dt;
    if (b.ttl <= 0) continue;
    const totalDx = b.vx * dt;
    const totalDy = b.vy * dt;
    const steps = Math.max(1, Math.ceil(Math.hypot(totalDx, totalDy) / BULLET_SUBSTEP));
    const sx = totalDx / steps;
    const sy = totalDy / steps;
    let consumed = false;

    for (let s = 0; s < steps; s++) {
      b.x += sx;
      b.y += sy;
      if (b.x < 0 || b.x > FIELD_W || b.y < 0 || b.y > FIELD_H) {
        if (b.source === 'enemy') resetShooterCooldown(state, b);
        consumed = true;
        break;
      }
      if (bulletHitsWall(b.x, b.y, BULLET_RADIUS)) {
        if (b.source === 'player' && b.boomerang === 'forward') {
          b.boomerang = 'returning';
          b.vx = -b.vx;
          b.vy = -b.vy;
          b.hitIds = [];
          spawnHitParticles(state, b.x, b.y, '#FACC15', rng);
          b.x -= sx * 1.5;
          b.y -= sy * 1.5;
          break;
        }
        spawnHitParticles(state, b.x, b.y, '#FACC15', rng);
        if (b.source === 'enemy') resetShooterCooldown(state, b);
        consumed = true;
        break;
      }
      const seg = bulletHitsBunker(state, b.x, b.y, BULLET_RADIUS);
      if (seg) {
        if (b.variant === 'yellow') {
          const target = state.bunkerSegments.find((x) => x.col === seg.col && x.row === seg.row);
          if (target && target.hp > 0) {
            target.hp -= 1;
            state.events.push({ type: 'bunkerHit' });
          }
        }
        spawnHitParticles(state, b.x, b.y, '#22D3EE', rng);
        if (b.source === 'enemy') resetShooterCooldown(state, b);
        consumed = true;
        break;
      }
      if (b.source === 'player') stepPlayerBullet(state, b, rng);
      else if (stepEnemyBullet(state, b, rng)) {
        consumed = true;
        break;
      }
    }
    if (!consumed) survivors.push(b);
  }
  // A death during the loop removes player bullets: keep that removal.
  state.bullets = survivors.filter((b) => b.source === 'enemy' || state.player.state !== 'respawning');
}

// Player bullets pass through enemies, damaging each one at most once.
function stepPlayerBullet(state: GameState, b: Bullet, rng: Rng): void {
  for (const e of [...state.enemies]) {
    if (e.spawning || b.hitIds.includes(e.id)) continue;
    if (!circlesOverlap(b.x, b.y, BULLET_RADIUS, e.x, e.y, ENEMY_RADIUS)) continue;
    b.hitIds.push(e.id);
    if (e.shieldTimer > 0 && !b.piercing) {
      spawnHitParticles(state, b.x, b.y, '#FACC15', rng);
      continue;
    }
    const inWeb = isWebTile(getMaze().tiles, Math.floor(b.x / TILE), Math.floor(b.y / TILE));
    if (inWeb && rng() < 0.5) {
      spawnHitParticles(state, b.x, b.y, '#A855F7', rng);
      continue;
    }
    if (state.modernMode) state.combo.clipShotsHit += 1;
    e.hp = b.heavy ? 0 : e.hp - 1;
    if (e.hp <= 0) {
      b.killsCount += 1;
      registerKillCombo(state, b, e);
      killEnemy(state, e, true, rng);
    } else {
      damageFeedback(state, e, b, rng);
    }
  }
}

function damageFeedback(state: GameState, e: Enemy, b: Bullet, rng: Rng): void {
  spawnHitParticles(state, b.x, b.y, PARTICLE_COLORS[e.type], rng);
  if (hasReactiveShield(e.type)) {
    e.shieldTimer = SHIELD_TIME;
    state.events.push({ type: 'shieldBounce' });
  } else {
    state.events.push({ type: 'hit' });
  }
}

// Enemy bullets damage other enemies (friendly fire, no points: D2), then stop on the decoy or kill the player.
// Returns true when the bullet is consumed.
function stepEnemyBullet(state: GameState, b: Bullet, rng: Rng): boolean {
  for (const e of [...state.enemies]) {
    if (e.spawning || e.shieldTimer > 0 || b.hitIds.includes(e.id)) continue;
    if (!circlesOverlap(b.x, b.y, BULLET_RADIUS, e.x, e.y, ENEMY_RADIUS)) continue;
    b.hitIds.push(e.id);
    e.hp -= 1;
    if (e.hp <= 0) killEnemy(state, e, false, rng);
    else damageFeedback(state, e, b, rng);
  }
  if (state.modernMode && state.buffs.decoyTimer > 0) {
    if (circlesOverlap(b.x, b.y, BULLET_RADIUS, state.buffs.decoyX, state.buffs.decoyY, PLAYER_RADIUS)) {
      spawnHitParticles(state, b.x, b.y, '#FBBF24', rng);
      resetShooterCooldown(state, b);
      return true;
    }
  }
  const p = state.player;
  if (
    p.state !== 'respawning' &&
    p.invulnTimer <= 0 &&
    !isInsideBunker(p.x, p.y) &&
    circlesOverlap(b.x, b.y, BULLET_RADIUS, p.x, p.y, PLAYER_RADIUS)
  ) {
    spawnHitParticles(state, b.x, b.y, '#EF4444', rng);
    playerDies(state, rng);
    return true;
  }
  return false;
}

function killEnemy(state: GameState, e: Enemy, byPlayer: boolean, rng: Rng): void {
  if (byPlayer) {
    const comboMult = state.modernMode ? state.combo.comboMult : 1;
    addScore(state, Math.round(SCORE[e.type] * comboMult));
  }
  if (e.type === 'invisible') spawnInvisibleKillBurst(state, e.x, e.y, rng);
  else spawnExplosion(state, e.x, e.y, PARTICLE_COLORS[e.type], rng);
  state.events.push({ type: 'kill', enemy: e.type, byPlayer });

  state.enemies = state.enemies.filter((x) => x.id !== e.id);
  if (e.type === 'bat' && state.score >= TIER_THRESHOLDS[0] && state.bluePhaseConversions < MAX_BAT_CONVERSIONS) {
    state.bluePhaseConversions += 1;
  }
  if (e.type === state.activeMainType) {
    const next = mainTypeForScore(state.score);
    if (next !== state.activeMainType) {
      state.activeMainType = next;
      state.events.push({ type: 'tempo', seconds: HEARTBEAT_TEMPO[next] });
    }
  }
}

// Combo streak, multi-kill, quick draw and clutch (player-bullet kills, modern mode).
function registerKillCombo(state: GameState, b: Bullet, e: Enemy): void {
  if (!state.modernMode) return;
  const c = state.combo;
  c.comboCount += 1;
  c.comboTimer = COMBO_WINDOW;
  c.comboMult = c.comboCount >= 5 ? 3 : c.comboCount >= 3 ? 2 : c.comboCount >= 2 ? 1.5 : 1;

  if (b.killsCount === 2) grantBonus(state, 'doubleKill', BONUS_POINTS.doubleKill);
  else if (b.killsCount === 3) grantBonus(state, 'tripleKill', BONUS_POINTS.tripleKill);
  else if (b.killsCount >= 4) grantBonus(state, 'megaKill', BONUS_POINTS.megaKill);

  if (isTrackingType(e.type) && e.aliveTime < QUICK_DRAW_TIME) grantBonus(state, 'quickDraw', BONUS_POINTS.quickDraw);

  // D5: once per clip, for a bullet of the shot that emptied the gun.
  if (b.lastOfClip && c.clutchArmed) {
    c.clutchArmed = false;
    grantBonus(state, 'clutch', BONUS_POINTS.clutch);
  }
}

function resolvePlayerVsEnemies(state: GameState, rng: Rng): void {
  const p = state.player;
  if (p.state !== 'alive' || isInsideBunker(p.x, p.y)) return;
  for (const e of state.enemies) {
    if (e.spawning || !circlesOverlap(p.x, p.y, PLAYER_RADIUS, e.x, e.y, ENEMY_RADIUS)) continue;
    if (e.type === 'spider' || e.type === 'bat') {
      p.state = 'paralyzed';
      p.paralysisTimer = PLAYER_PARALYSIS;
      state.events.push({ type: 'paralyze' });
    } else if (p.invulnTimer <= 0) {
      playerDies(state, rng);
      return;
    }
  }
}

export function playerDies(state: GameState, rng: Rng): void {
  const p = state.player;
  if (state.modernMode && state.buffs.shieldHits > 0) {
    state.buffs.shieldHits -= 1;
    p.invulnTimer = Math.max(p.invulnTimer, 1.5);
    state.combo.flash = { kind: 'bonus', bonus: 'shieldAbsorb', points: 0 };
    state.combo.flashTimer = 1.5;
    spawnHitParticles(state, p.x, p.y, '#34D399', rng);
    return;
  }
  state.lives -= 1;
  spawnExplosion(state, p.x, p.y, '#FDE68A', rng);
  state.events.push({ type: 'death' });
  p.hasGun = false;
  p.ammo = 0;
  if (!state.gun) {
    state.gun = pickGunSpawn(state);
    state.events.push({ type: 'gunSpawn' });
  }
  state.bullets = state.bullets.filter((x) => x.source !== 'player');
  p.state = 'respawning';
  p.respawnTimer = PLAYER_RESPAWN;
  p.currentDir = null;
  p.x = -100;
  p.y = -100;
}

function spawnHitParticles(state: GameState, x: number, y: number, color: string, rng: Rng): void {
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2;
    const s = 30 + rng() * 40;
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4, maxLife: 0.4, color, size: 1 + rng() * 1.5 });
  }
}

function spawnExplosion(state: GameState, x: number, y: number, color: string, rng: Rng): void {
  for (let i = 0; i < 18; i++) {
    const a = rng() * Math.PI * 2;
    const s = 40 + rng() * 80;
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.8, maxLife: 0.8, color, size: 1.5 + rng() * 2 });
  }
}

// Bigger, brighter burst with a ring: the invisible robot is barely visible, its death must not be.
function spawnInvisibleKillBurst(state: GameState, x: number, y: number, rng: Rng): void {
  const palette = ['#FDE68A', '#F87171', '#FECACA', '#F8FAFC', '#60A5FA'];
  for (let i = 0; i < 60; i++) {
    const a = rng() * Math.PI * 2;
    const s = 60 + rng() * 160;
    const color = palette[Math.floor(rng() * palette.length)];
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.4, maxLife: 1.4, color, size: 2 + rng() * 3.5 });
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    state.particles.push({ x, y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, life: 0.9, maxLife: 0.9, color: '#FFFFFF', size: 2.5 });
  }
}

function updateParticles(state: GameState, dt: number): void {
  const survivors: Particle[] = [];
  for (const p of state.particles) {
    p.life -= dt;
    if (p.life <= 0) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
    survivors.push(p);
  }
  state.particles = survivors;
}

export function tempoForMain(t: EnemyType): number {
  return HEARTBEAT_TEMPO[t];
}
