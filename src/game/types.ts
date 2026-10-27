// Game state and entities (ported from the prototype). The engine mutates one GameState per run.
export type Vec2 = { x: number; y: number };

export type CardinalDir = 'N' | 'S' | 'E' | 'W';

export type EnemyType = 'spider' | 'bat' | 'gray' | 'blue' | 'white' | 'black1' | 'black2' | 'invisible';

export type GamePhase = 'menu' | 'playing' | 'gameover';

export type FireMode = 'quadrants' | 'dpad' | 'autoaim' | 'pointAndShoot';

export interface Player {
  x: number;
  y: number;
  hasGun: boolean;
  ammo: number;
  state: 'alive' | 'paralyzed' | 'respawning';
  paralysisTimer: number;
  respawnTimer: number;
  invulnTimer: number;
  lastMoveDir: CardinalDir;
  currentDir: CardinalDir | null;
}

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  dir: CardinalDir;
  shootCooldown: number;
  spawning: boolean;
  spawnTimer: number;
  // > 0 while a reactive shield is up (white/black/invisible robots).
  shieldTimer: number;
  stuckCheckX: number;
  stuckCheckY: number;
  stuckCheckTimer: number;
  forceRandomTimer: number;
  // Seconds since the enemy finished spawning (quick-draw bonus).
  aliveTime: number;
  // Direction changes happen only at cell centres, once per entered cell.
  lastTileCol: number;
  lastTileRow: number;
  pendingDecision: boolean;
}

export type BulletVariant = 'normal' | 'yellow' | 'laser';

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  source: 'player' | 'enemy';
  variant: BulletVariant;
  ttl: number;
  // Enemies already damaged by this bullet.
  hitIds: number[];
  shooterId?: number;
  piercing?: boolean;
  heavy?: boolean;
  boomerang?: 'forward' | 'returning';
  killsCount: number;
  // Fired by the shot that emptied the gun (clutch bonus, D5).
  lastOfClip?: boolean;
}

export type PowerUpKind =
  | 'slowMo'
  | 'freeze'
  | 'cloak'
  | 'rapidFire'
  | 'piercing'
  | 'spread'
  | 'heavy'
  | 'boomerang'
  | 'shield'
  | 'bunkerRepair'
  | 'phaseWalk'
  | 'decoy'
  | 'scoreX2'
  | 'ammo'
  | 'magnet'
  | 'extraLife'
  | 'emp'
  | 'xray'
  | 'mystery';

export type BonusKind = 'doubleKill' | 'tripleKill' | 'megaKill' | 'quickDraw' | 'clutch' | 'fullClip' | 'noBunker' | 'shieldAbsorb';
export type CurseKind = 'slow' | 'noAmmo' | 'volley';

// What the HUD flashes; the UI translates it.
export type FlashLabel =
  | { kind: 'bonus'; bonus: BonusKind; points: number }
  | { kind: 'powerup'; powerUp: PowerUpKind }
  | { kind: 'curse'; curse: CurseKind };

export interface PowerUp {
  id: number;
  kind: PowerUpKind;
  col: number;
  row: number;
  ttl: number;
}

export interface ActiveBuffs {
  slowMoTimer: number;
  freezeTimer: number;
  cloakTimer: number;
  rapidFireTimer: number;
  phaseWalkTimer: number;
  scoreMultTimer: number;
  scoreMult: number;
  xrayTimer: number;
  decoyTimer: number;
  decoyX: number;
  decoyY: number;
  shieldHits: number;
  piercingShots: number;
  spreadShots: number;
  heavyShots: number;
  boomerangShots: number;
  slowDebuffTimer: number;
}

export interface ComboState {
  comboCount: number;
  comboMult: number;
  comboTimer: number;
  clipShotsFired: number;
  clipShotsHit: number;
  currentTier: number;
  enteredBunkerThisTier: boolean;
  // True between the shot that emptied the gun and its first kill (D5: one clutch per clip).
  clutchArmed: boolean;
  flash: FlashLabel | null;
  flashTimer: number;
}

export interface BunkerSegment {
  col: number;
  row: number;
  hp: number;
}

export interface Gun {
  col: number;
  row: number;
}

export interface InputState {
  // Joystick vector, each axis in [-1, 1].
  dir: Vec2;
  fireRequested: boolean;
  // Cardinal direction, 'auto' (nearest enemy) or null (last move direction).
  fireDir: CardinalDir | 'auto' | null;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

// Side effects of a tick, consumed by the screen (sound, haptics, telemetry).
export type GameEvent =
  | { type: 'shoot' }
  | { type: 'noAmmo' }
  | { type: 'hit' }
  | { type: 'shieldBounce' }
  | { type: 'kill'; enemy: EnemyType; byPlayer: boolean }
  | { type: 'gunPickup' }
  | { type: 'gunSpawn' }
  | { type: 'powerUpAppear' }
  | { type: 'powerUpPickup'; kind: PowerUpKind }
  | { type: 'death' }
  | { type: 'bunkerHit' }
  | { type: 'paralyze' }
  | { type: 'lifeBonus' }
  | { type: 'tempo'; seconds: number }
  | { type: 'tierReached'; tier: number }
  | { type: 'gameOver' };

export interface GameState {
  phase: GamePhase;
  score: number;
  lives: number;
  nextLifeAt: number;
  elapsed: number;
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  gun: Gun | null;
  bunkerSegments: BunkerSegment[];
  particles: Particle[];
  enemyIdCounter: number;
  bulletIdCounter: number;
  flashLifeBonus: number;
  flashNoAmmo: number;
  flashEMP: number;
  // Best score before this run; newHighScore is set when the score passes it.
  highScore: number;
  newHighScore: boolean;
  // Bats turned into grays at tier 1 (at most 2 per run, locked for the run).
  bluePhaseConversions: number;
  // Main robot of the run, advanced only when the previous one is killed.
  activeMainType: EnemyType;
  // Highest tier reported to telemetry during this run.
  maxTierReached: number;
  modernMode: boolean;
  powerUps: PowerUp[];
  powerUpIdCounter: number;
  powerUpSpawnTimer: number;
  buffs: ActiveBuffs;
  combo: ComboState;
  endReason: 'lives' | 'quit' | null;
  events: GameEvent[];
}
