import { describe, expect, it } from 'vitest';
import { createGame, step } from '../../src/sim/sim';
import type { Input } from '../../src/sim/types';

describe('sim skeleton', () => {
  it('moves along the axis on directional input', () => {
    const state = createGame({ boardWidth: 10, boardHeight: 10 });
    const result = step(state, { moveDir: 'right' }, 0.5);

    expect(result.state.player.pos.x).toBeGreaterThan(state.player.pos.x);
    expect(result.state.player.pos.y).toBe(state.player.pos.y);
    expect(result.state.player.facing).toBe('right');
  });

  it('clamps the player to board bounds', () => {
    let state = createGame({ boardWidth: 10, boardHeight: 10 });
    for (let i = 0; i < 100; i += 1) {
      state = step(state, { moveDir: 'left' }, 1).state;
    }
    expect(state.player.pos.x).toBe(state.config.playerRadius);
  });

  it('is deterministic for identical input sequences', () => {
    const input: Input = { moveDir: 'up' };
    const run = (): GameSnapshot => {
      let s = createGame({ boardWidth: 10, boardHeight: 10 });
      s = step(s, input, 0.25).state;
      s = step(s, input, 0.25).state;
      return { x: s.player.pos.x, y: s.player.pos.y, facing: s.player.facing };
    };
    expect(run()).toEqual(run());
  });
});

interface GameSnapshot {
  x: number;
  y: number;
  facing: string;
}
