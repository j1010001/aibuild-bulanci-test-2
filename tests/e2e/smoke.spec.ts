import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameState } from '../../src/sim/types';

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

test('home page loads with zero console errors', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/');
  await expect(page.getByText('Browser Party Shooter')).toBeVisible();
  expect(errors).toEqual([]);
});

test('home page displays the headline', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Hello, agent!')).toBeVisible();
});

test('practice mode renders a non-blank canvas', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Practice' }).click();

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(500);

  const shot = await canvas.screenshot();
  // A uniformly blank frame compresses to a few hundred bytes; a rendered
  // scene (grid + plane + player) produces a materially larger PNG. This is a
  // smoke heuristic; the state assertions below are the correctness signal.
  expect(shot.length).toBeGreaterThan(2000);
});

test('practice mode exposes state and responds to input', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Practice' }).click();

  const initialState = (await page.evaluate(
    () => window.__game!.getState(),
  )) as GameState;

  expect(initialState).not.toBeNull();
  expect(initialState.phase).toBe('practice');

  const x0 = initialState.player.pos.x;
  await page.evaluate(() => window.__game!.press('ArrowRight'));
  await page.waitForTimeout(250);

  const moved = (await page.evaluate(
    () => window.__game!.getState(),
  )) as GameState;

  expect(moved.player.pos.x).toBeGreaterThan(x0);
  expect(moved.player.facing).toBe('right');
});
