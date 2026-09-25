// Pure, deterministic simulation core. No DOM, no three.js, no WebRTC.
// `step(state, inputs, dt)` is the only way state changes; it returns a new
// state object. Free of randomness and wall-clock reads so it stays
// unit-testable and server-portable.

import type {
  CreateGameOptions,
  Direction,
  GameState,
  Inputs,
  StepResult,
  Vec2,
} from './types';

export const DEFAULTS = {
  boardWidth: 40,
  boardHeight: 40,
  playerRadius: 0.5,
  playerSpeed: 6,
  bulletSpeed: 18,
  cadence: 0.8,
  muzzleOffset: 0.75,
} as const;

const DIRECTION_VECTOR: Record<Direction, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function createGame(options: CreateGameOptions = {}): GameState {
  const config = {
    boardWidth: options.boardWidth ?? DEFAULTS.boardWidth,
    boardHeight: options.boardHeight ?? DEFAULTS.boardHeight,
    playerRadius: DEFAULTS.playerRadius,
    playerSpeed: DEFAULTS.playerSpeed,
    bulletSpeed: DEFAULTS.bulletSpeed,
    cadence: DEFAULTS.cadence,
    muzzleOffset: DEFAULTS.muzzleOffset,
  };

  return {
    config,
    phase: 'practice',
    time: 0,
    nextBulletId: 0,
    players: [
      {
        id: 'p1',
        name: 'Player',
        skinId: 0,
        pos: { x: config.boardWidth / 2, y: config.boardHeight / 2 },
        facing: 'right',
        lastShotAt: null,
        alive: true,
        connected: true,
      },
    ],
    bullets: [],
  };
}

export function step(state: GameState, inputs: Inputs, dt: number): StepResult {
  const time = state.time + dt;
  const config = state.config;

  // 1. movement — axis-aligned, clamped to board bounds.
  const players = state.players.map((player) => {
    if (!player.alive) return player;
    const input = inputs[player.id];
    if (input === undefined || input.moveDir === null) return player;

    const v = DIRECTION_VECTOR[input.moveDir];
    const r = config.playerRadius;
    const x = clamp(player.pos.x + v.x * config.playerSpeed * dt, r, config.boardWidth - r);
    const y = clamp(player.pos.y + v.y * config.playerSpeed * dt, r, config.boardHeight - r);
    return { ...player, pos: { x, y }, facing: input.moveDir };
  });

  // 2. shooting — a cadence-gated spawn at the muzzle, along facing.
  let nextBulletId = state.nextBulletId;
  const spawned: { id: number; ownerId: string; pos: Vec2; dir: Direction }[] = [];

  const playersAfterShots = players.map((player) => {
    if (!player.alive) return player;
    const input = inputs[player.id];
    if (input === undefined || !input.shoot) return player;
    if (player.lastShotAt !== null && time - player.lastShotAt < config.cadence) {
      return player;
    }

    const v = DIRECTION_VECTOR[player.facing];
    spawned.push({
      id: nextBulletId,
      ownerId: player.id,
      pos: {
        x: player.pos.x + v.x * config.muzzleOffset,
        y: player.pos.y + v.y * config.muzzleOffset,
      },
      dir: player.facing,
    });
    nextBulletId += 1;
    return { ...player, lastShotAt: time };
  });

  // 3. bullets — advance and cull those that leave the board.
  const bullets: typeof state.bullets = [];
  for (const bullet of [...state.bullets, ...spawned]) {
    const v = DIRECTION_VECTOR[bullet.dir];
    const nx = bullet.pos.x + v.x * config.bulletSpeed * dt;
    const ny = bullet.pos.y + v.y * config.bulletSpeed * dt;
    if (nx < 0 || nx > config.boardWidth || ny < 0 || ny > config.boardHeight) {
      continue;
    }
    bullets.push({ ...bullet, pos: { x: nx, y: ny } });
  }

  return {
    state: {
      ...state,
      time,
      nextBulletId,
      players: playersAfterShots,
      bullets,
    },
    events: [],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
