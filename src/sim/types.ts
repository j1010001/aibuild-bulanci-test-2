// Simulation core types. The full game model (scores, obstacles, bullets,
// rounds) extends these via issues; the skeleton is a single moving player
// on an empty bounded plane.

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
}

export interface Player {
  id: string;
  name: string;
  skinId: number;
  pos: Vec2;
  facing: Direction;
}

export type Phase = 'practice';

export interface GameState {
  config: GameConfig;
  phase: Phase;
  player: Player;
}

export interface Input {
  moveDir: Direction | null;
}

export interface StepResult {
  state: GameState;
  events: string[];
}

export interface CreateGameOptions {
  boardWidth?: number;
  boardHeight?: number;
}
