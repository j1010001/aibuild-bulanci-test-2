import { describe, expect, it } from 'vitest';
import { createGame, DEFAULTS, step } from '../../src/sim/sim';
import type { Input, Inputs } from '../../src/sim/types';

function idle(playerId = 'p1'): Inputs {
  return { [playerId]: { moveDir: null, shoot: false } };
}

function shoot(playerId = 'p1'): Inputs {
  return { [playerId]: { moveDir: null, shoot: true } };
}

function move(dir: Input['moveDir'], playerId = 'p1'): Inputs {
  return { [playerId]: { moveDir: dir, shoot: false } };
}

describe('sim: movement', () => {
  it('moves along the axis on directional input', () => {
    const s0 = createGame({ boardWidth: 10, boardHeight: 10 });
    const r = step(s0, move('right'), 0.5);
    expect(r.state.players[0].pos.x).toBeGreaterThan(s0.players[0].pos.x);
    expect(r.state.players[0].pos.y).toBe(s0.players[0].pos.y);
    expect(r.state.players[0].facing).toBe('right');
  });

  it('clamps the player to board bounds', () => {
    let s = createGame({ boardWidth: 10, boardHeight: 10 });
    for (let i = 0; i < 100; i += 1) s = step(s, move('left'), 1).state;
    expect(s.players[0].pos.x).toBe(s.config.playerRadius);
  });
});

describe('sim: shooting', () => {
  it('spawns a bullet at the muzzle on a shoot edge', () => {
    const s = createGame({ boardWidth: 10, boardHeight: 10 });
    const r = step(s, shoot(), 0);

    expect(r.state.bullets).toHaveLength(1);
    const b = r.state.bullets[0];
    expect(b.ownerId).toBe(s.players[0].id);
    expect(b.dir).toBe('right');
    // muzzle sits muzzleOffset forward of the player's center along facing
    expect(b.pos.x).toBeCloseTo(s.players[0].pos.x + DEFAULTS.muzzleOffset);
    expect(b.pos.y).toBeCloseTo(s.players[0].pos.y);
    // born outside the body — clears the player's own collision circle
    const dist = Math.hypot(
      b.pos.x - s.players[0].pos.x,
      b.pos.y - s.players[0].pos.y,
    );
    expect(dist).toBeGreaterThan(s.config.playerRadius);
  });

  it('advances the bullet by bulletSpeed * dt along its direction', () => {
    let s = createGame({ boardWidth: 40, boardHeight: 40 });
    s = step(s, shoot(), 0).state;
    const before = s.bullets[0].pos.x;
    s = step(s, idle(), 0.5).state;
    expect(s.bullets[0].pos.x).toBeCloseTo(before + DEFAULTS.bulletSpeed * 0.5);
  });

  it('blocks a second shot within the cadence window', () => {
    let s = createGame();
    s = step(s, shoot(), 0).state; // 1 bullet, lastShotAt = 0
    s = step(s, shoot(), 0.1).state; // 0.1 - 0 < cadence -> blocked
    expect(s.bullets).toHaveLength(1);
  });

  it('allows a second shot once cadence has elapsed', () => {
    let s = createGame();
    s = step(s, shoot(), 0).state; // 1 bullet
    s = step(s, idle(), 0.9).state; // time advances past cadence
    s = step(s, shoot(), 0).state; // elapsed >= cadence -> fires
    expect(s.bullets).toHaveLength(2);
  });

  it('records lastShotAt as the sim time of the shot', () => {
    let s = createGame();
    s = step(s, idle(), 0.5).state;
    s = step(s, shoot(), 0).state;
    expect(s.players[0].lastShotAt).toBeCloseTo(0.5);
  });

  it('consumes a bullet when it exits the board bounds', () => {
    let s = createGame({ boardWidth: 10, boardHeight: 10 });
    s = step(s, shoot(), 0).state; // bullet at muzzle, heading right
    s = step(s, idle(), 1).state; // muzzle + 18 exceeds the 10-unit board
    expect(s.bullets).toHaveLength(0);
  });
});

describe('sim: determinism', () => {
  it('produces identical state for identical input sequences', () => {
    const run = (): { x: number; y: number; bullets: number } => {
      let s = createGame({ boardWidth: 40, boardHeight: 40 });
      s = step(s, move('up'), 0.25).state;
      s = step(s, shoot(), 0).state;
      s = step(s, idle(), 0.4).state;
      return { x: s.players[0].pos.x, y: s.players[0].pos.y, bullets: s.bullets.length };
    };
    expect(run()).toEqual(run());
  });
});
