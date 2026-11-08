import Matter from 'matter-js';

import { FRUITS, MAX_LEVEL } from '../src/game/fruits';
import { GameEngine, STEP_MS, WORLD, type GameEvent } from '../src/game/engine';

function run(e: GameEngine, ms: number) {
  for (let t = 0; t < ms; t += STEP_MS) e.tick(STEP_MS);
}

describe('GameEngine', () => {
  it('drops a fruit that falls and lands on the jar floor', () => {
    const e = new GameEngine({ seed: 1 });
    const level = e.held.level;
    expect(e.drop()).toBe(true);
    expect(e.drop()).toBe(false); // cooldown
    run(e, 3000);
    const f = e.fruits[0];
    expect(f.level).toBe(level);
    expect(f.body.position.y).toBeGreaterThan(WORLD.jarBottom - f.r - 3);
    expect(f.body.position.y).toBeLessThan(WORLD.jarBottom);
  });

  it('merges two touching identical fruits and scores', () => {
    const e = new GameEngine({ seed: 1 });
    const events: GameEvent[] = [];
    e.on((ev) => events.push(ev));
    e.debugSpawn(0, 200, 600);
    e.debugSpawn(0, 210, 500);
    run(e, 2000);
    expect(e.fruits).toHaveLength(1);
    expect(e.fruits[0].level).toBe(1);
    expect(e.score).toBe(FRUITS[1].score);
    expect(events.some((ev) => ev.type === 'merge' && ev.level === 1)).toBe(true);
  });

  it('chains merges into combos', () => {
    const e = new GameEngine({ seed: 3 });
    e.debugSpawn(1, 100, 700);
    e.debugSpawn(0, 220, 700);
    e.debugSpawn(0, 222, 620);
    run(e, 500);
    // strawberry created next to the existing one -> they merge into grape quickly
    e.debugSpawn(1, 130, 560);
    run(e, 2000);
    expect(e.fruits.every((f) => f.level !== 0)).toBe(true);
    expect(e.score).toBeGreaterThan(FRUITS[1].score);
  });

  it('two watermelons vanish with the bonus', () => {
    const e = new GameEngine({ seed: 1 });
    e.debugSpawn(MAX_LEVEL, 130, 640);
    e.debugSpawn(MAX_LEVEL, 330, 640);
    run(e, 1500);
    expect(e.fruits).toHaveLength(0);
    expect(e.score).toBe(500);
  });

  it('ends the game when a settled fruit stays above the danger line', () => {
    const e = new GameEngine({ seed: 1 });
    let over = false;
    e.on((ev) => {
      if (ev.type === 'gameover') over = true;
    });
    // a fruit resting above the danger line (pinned so it is perfectly settled)
    const f = e.debugSpawn(3, 220, WORLD.dangerY - 10);
    Matter.Body.setStatic(f.body, true);
    run(e, 2500);
    expect(over).toBe(false); // grace period + 2 s timer not elapsed yet
    run(e, 1500);
    expect(over).toBe(true);
    expect(e.gameOver).toBe(true);
    // continue clears the top and resumes
    e.continueRun();
    expect(e.gameOver).toBe(false);
    expect(e.fruits.every((f) => f.body.position.y - f.r >= WORLD.dangerY + 140 - 1)).toBe(true);
  });

  it('bomb removes the tapped fruit and consumes a charge', () => {
    const e = new GameEngine({ seed: 1, startPowerUps: { shake: 0, bomb: 1 } });
    const f = e.debugSpawn(4, 220, 600);
    run(e, 1000);
    expect(e.toggleBomb()).toBe(true);
    expect(e.drop()).toBe(false); // can't drop while aiming a bomb
    expect(e.bombAt(f.body.position.x, f.body.position.y)).toBe(true);
    expect(e.fruits).toHaveLength(0);
    expect(e.powerUps.bomb).toBe(0);
    expect(e.toggleBomb()).toBe(false);
  });

  it('nothing escapes the jar after a shake', () => {
    const e = new GameEngine({ seed: 9, startPowerUps: { shake: 1, bomb: 0 } });
    for (let i = 0; i < 12; i++) e.debugSpawn(i % 5, 60 + (i % 6) * 60, 700 - Math.floor(i / 6) * 80);
    run(e, 1000);
    e.useShake();
    run(e, 4000);
    for (const f of e.fruits) {
      expect(f.body.position.x).toBeGreaterThan(WORLD.jarLeft);
      expect(f.body.position.x).toBeLessThan(WORLD.jarRight);
      expect(f.body.position.y).toBeLessThan(WORLD.jarBottom);
    }
  });

  it('aim clamps the held fruit inside the jar', () => {
    const e = new GameEngine({ seed: 1 });
    e.aim(-1000);
    expect(e.held.x - e.heldRadius()).toBeGreaterThanOrEqual(WORLD.jarLeft);
    e.aim(5000);
    expect(e.held.x + e.heldRadius()).toBeLessThanOrEqual(WORLD.jarRight);
  });

  it('slow motion slows the simulation without changing outcomes', () => {
    const fast = new GameEngine({ seed: 1 });
    const slow = new GameEngine({ seed: 1 });
    const a = fast.debugSpawn(2, 220, 300);
    const b = slow.debugSpawn(2, 220, 300);
    slow.slowMo(10_000);
    run(fast, 300);
    run(slow, 300);
    expect(b.body.position.y - 300).toBeLessThan((a.body.position.y - 300) * 0.5);
    expect(slow.now).toBeLessThan(fast.now);
  });

  it('flags same-level fruits that are almost touching, not different ones', () => {
    const e = new GameEngine({ seed: 1 });
    const a = e.debugSpawn(4, 150, 709);
    const b = e.debugSpawn(4, 150 + 2 * 41 + 8, 709); // 8 units apart
    const c = e.debugSpawn(2, 380, 722);
    run(e, 200);
    expect(a.near).toBeGreaterThan(0.3);
    expect(b.near).toBeGreaterThan(0.3);
    expect(c.near).toBe(0);
  });

  it('newly merged fruit is happy and a 3-chain triggers slow-mo + flash', () => {
    const e = new GameEngine({ seed: 1 });
    let combo = 0;
    e.on((ev) => {
      if (ev.type === 'combo') combo = Math.max(combo, ev.count);
    });
    e.debugSpawn(0, 100, 720);
    e.debugSpawn(0, 100, 680);
    e.debugSpawn(0, 220, 720);
    e.debugSpawn(0, 220, 680);
    e.debugSpawn(0, 340, 720);
    e.debugSpawn(0, 340, 680);
    for (let t = 0; t < 2000 && combo < 3; t += STEP_MS) e.tick(STEP_MS);
    expect(combo).toBeGreaterThanOrEqual(3);
    expect(e.fruits.some((f) => f.happyT > 0)).toBe(true);
    expect(e.slowMoMs + e.flash).toBeGreaterThan(0);
  });

  it('merges same-level fruits resting with a hairline gap', () => {
    const e = new GameEngine({ seed: 1 });
    const r = FRUITS[0].radius;
    const a = e.debugSpawn(0, 200, 735);
    const b = e.debugSpawn(0, 200 + 2 * r + 1, 735); // 1 unit apart, never colliding
    Matter.Body.setStatic(a.body, true);
    Matter.Body.setStatic(b.body, true);
    run(e, 200);
    expect(e.fruits.some((f) => f.level === 1)).toBe(true);
    expect(e.score).toBe(FRUITS[1].score);
  });
});
