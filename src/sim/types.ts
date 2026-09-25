// Simulation core types. M1 covers movement and shooting; later milestones add
// obstacles, multiple players, death, and rounds without reshaping these.

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Vec2 {
  x: number;
  y: number;
}

export interface GameConfig {
  boardWidth: number;
  boardHeight: number;
  playerRadius: number;
  playerSpeed: number;
  bulletSpeed: number;
  cadence: number; // seconds between shots
  muzzleOffset: number; // distance from player center to gun muzzle along facing
}

export interface Player {
  id: string;
  name: string;
  skinId: number;
  pos: Vec2;
  facing: Direction;
  lastShotAt: number | null; // sim time of last shot; null = never fired
  alive: boolean;
  connected: boolean;
}

export interface Bullet {
  id: number;
  ownerId: string;
  pos: Vec2;
  dir: Direction;
}

export type Phase = 'practice';

export interface GameState {
  config: GameConfig;
  phase: Phase;
  time: number;
  nextBulletId: number;
  players: Player[];
  bullets: Bullet[];
}

export interface Input {
  moveDir: Direction | null;
  shoot: boolean; // edge: true only on the tick the key went down
}

export type Inputs = Record<string, Input>;

export interface StepResult {
  state: GameState;
  events: string[];
}

export interface CreateGameOptions {
  boardWidth?: number;
  boardHeight?: number;
}
