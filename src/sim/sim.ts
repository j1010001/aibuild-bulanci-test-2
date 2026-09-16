// Pure, deterministic simulation core. No DOM, no three.js, no WebRTC.
// `step(state, input, dt)` is the only way state changes; it returns a new
// state object and (future) a list of events. Keep it free of randomness and
// wall-clock reads so it stays unit-testable and server-portable.

import type {
  CreateGameOptions,
  Direction,
  GameState,
  Input,
  StepResult,
} from './types';

export const DEFAULTS = {
  boardWidth: 40,
  boardHeight: 40,
  playerRadius: 0.5,
  playerSpeed: 6,
} as const;

const DIRECTION_VECTOR: Record<Direction, Vec2Like> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

interface Vec2Like {
  x: number;
  y: number;
}

export function createGame(options: CreateGameOptions = {}): GameState {
  const config = {
    boardWidth: options.boardWidth ?? DEFAULTS.boardWidth,
    boardHeight: options.boardHeight ?? DEFAULTS.boardHeight,
    playerRadius: DEFAULTS.playerRadius,
    playerSpeed: DEFAULTS.playerSpeed,
  };

  return {
    config,
    phase: 'practice',
    player: {
      id: 'p1',
      name: 'Player',
      skinId: 0,
      pos: { x: config.boardWidth / 2, y: config.boardHeight / 2 },
      facing: 'right',
    },
  };
}

export function step(state: GameState, input: Input, dt: number): StepResult {
  const { config, player } = state;

  let x = player.pos.x;
  let y = player.pos.y;
  let facing = player.facing;

  if (input.moveDir !== null) {
    facing = input.moveDir;
    const v = DIRECTION_VECTOR[facing];
    const r = config.playerRadius;
    x = clamp(x + v.x * config.playerSpeed * dt, r, config.boardWidth - r);
    y = clamp(y + v.y * config.playerSpeed * dt, r, config.boardHeight - r);
  }

  return {
    state: { ...state, player: { ...player, pos: { x, y }, facing } },
    events: [],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
