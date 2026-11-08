import Matter from 'matter-js';

import { Effects } from './effects';
import { FRUITS, MAX_LEVEL, mergeOutcome } from './fruits';
import { mulberry32, type Rng } from './rng';
import { COMBO_POWERUP_AT, ComboTracker, mergePoints } from './scoring';
import { Spawner } from './spawner';

/** World layout in world units. The renderer scales this to the screen. */
export const WORLD = {
  width: 440,
  height: 770,
  jarLeft: 20,
  jarRight: 420,
  jarTop: 200,
  jarBottom: 750,
  spawnY: 128,
  dangerY: 236,
};

export const STEP_MS = 1000 / 60;
const SUBSTEPS = 2;
const MAX_STEPS_PER_TICK = 4;
const MAX_SPEED = 20; // units per 16.6ms; caps tunneling on hard drops / shake
const DROP_COOLDOWN_MS = 480;
const GAME_OVER_MS = 2000;
const WARN_MS = 350;
const GRACE_AFTER_DROP_MS = 1200;
const MAX_POWERUPS_EARNED = 3;
const MAX_FRUITS = 90;

export type PowerUp = 'shake' | 'bomb';

export type GameEvent =
  | { type: 'score'; score: number; delta: number }
  | { type: 'merge'; level: number; combo: number }
  | { type: 'vanish' }
  | { type: 'drop'; level: number }
  | { type: 'land'; strength: number }
  | { type: 'combo'; count: number }
  | { type: 'powerups'; shake: number; bomb: number; earned?: PowerUp }
  | { type: 'bomb'; armed: boolean }
  | { type: 'danger'; on: boolean }
  | { type: 'discover'; level: number }
  | { type: 'gameover'; score: number };

export type Fruit = {
  id: number;
  level: number;
  r: number;
  body: Matter.Body;
  removed: boolean;
  merging: boolean;
  dropAt: number;
  /** ms since pop-in started; < POP_MS means animating */
  popT: number;
  squash: number;
  squashAngle: number;
  squashT: number;
  blinkIn: number;
  blinkT: number;
  dangerMs: number;
};

export const POP_MS = 320;

export type EngineOptions = {
  seed: number;
  maxParticles?: number;
  startPowerUps?: { shake: number; bomb: number };
};

export class GameEngine {
  readonly matter: Matter.Engine;
  readonly fx: Effects;
  readonly fruits: Fruit[] = [];
  private byBody = new Map<number, Fruit>();
  private spawner: Spawner;
  private rand: Rng; // cosmetic randomness (never affects the spawn sequence)
  private combo = new ComboTracker();
  private listeners = new Set<(e: GameEvent) => void>();
  private mergeQueue: Array<[Fruit, Fruit]> = [];
  private nextId = 1;
  private acc = 0;
  private earnedPowerUps = 0;
  private dangerOn = false;

  /** Simulated time (ms). Only advances while running. */
  now = 0;
  score = 0;
  merges = 0;
  paused = false;
  gameOver = false;
  continued = false;
  maxLevel = 0;
  dangerLevel = 0; // 0..1 warning intensity
  shake = 0; // camera shake amplitude, world units
  powerUps: { shake: number; bomb: number };
  bombArmed = false;

  held: { level: number; x: number; readyAt: number };

  constructor(opts: EngineOptions) {
    this.spawner = new Spawner(mulberry32(opts.seed));
    this.rand = mulberry32(opts.seed ^ 0x9e3779b9);
    this.fx = new Effects(opts.maxParticles ?? 160);
    this.powerUps = { ...(opts.startPowerUps ?? { shake: 1, bomb: 1 }) };
    this.held = { level: this.spawner.take(), x: (WORLD.jarLeft + WORLD.jarRight) / 2, readyAt: 0 };

    this.matter = Matter.Engine.create({ positionIterations: 8, velocityIterations: 6, enableSleeping: false });
    this.matter.gravity.y = 1.15;
    this.buildJar();
    Matter.Events.on(this.matter, 'collisionStart', this.onCollision);
    Matter.Events.on(this.matter, 'collisionActive', this.onCollision);
  }

  // ---------------------------------------------------------------- events
  on(cb: (e: GameEvent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  private emit(e: GameEvent) {
    this.listeners.forEach((l) => l(e));
  }

  // ---------------------------------------------------------------- setup
  private buildJar() {
    const t = 80; // thick walls: nothing can tunnel through
    const h = WORLD.jarBottom + 1000;
    const opts = { isStatic: true, friction: 0.4, restitution: 0.1, label: 'wall' };
    Matter.Composite.add(this.matter.world, [
      Matter.Bodies.rectangle(WORLD.jarLeft - t / 2, WORLD.jarBottom - h / 2, t, h, opts),
      Matter.Bodies.rectangle(WORLD.jarRight + t / 2, WORLD.jarBottom - h / 2, t, h, opts),
      Matter.Bodies.rectangle((WORLD.jarLeft + WORLD.jarRight) / 2, WORLD.jarBottom + t / 2, WORLD.jarRight - WORLD.jarLeft + 2 * t, t, opts),
    ]);
  }

  private addFruit(level: number, x: number, y: number, vx = 0, vy = 0, pop = false): Fruit {
    const def = FRUITS[level];
    const body = Matter.Bodies.circle(x, y, def.radius, {
      restitution: 0.12,
      friction: 0.35,
      frictionStatic: 0.6,
      frictionAir: 0.012,
      density: 0.0012,
      slop: 0.04,
      label: 'fruit',
    });
    Matter.Body.setVelocity(body, { x: vx, y: vy });
    Matter.Body.setAngle(body, (this.rand() - 0.5) * 0.6);
    const f: Fruit = {
      id: this.nextId++,
      level,
      r: def.radius,
      body,
      removed: false,
      merging: false,
      dropAt: this.now,
      popT: pop ? 0 : POP_MS,
      squash: 0,
      squashAngle: 0,
      squashT: 0,
      blinkIn: 1500 + this.rand() * 3500,
      blinkT: 0,
      dangerMs: 0,
    };
    this.fruits.push(f);
    this.byBody.set(body.id, f);
    Matter.Composite.add(this.matter.world, body);
    if (level > this.maxLevel) {
      this.maxLevel = level;
    }
    this.emit({ type: 'discover', level });
    return f;
  }

  private removeFruit(f: Fruit) {
    if (f.removed) return;
    f.removed = true;
    Matter.Composite.remove(this.matter.world, f.body);
    this.byBody.delete(f.body.id);
    const i = this.fruits.indexOf(f);
    if (i >= 0) this.fruits.splice(i, 1);
  }

  // ---------------------------------------------------------------- input
  get canDrop(): boolean {
    return !this.paused && !this.gameOver && !this.bombArmed && this.now >= this.held.readyAt && this.fruits.length < MAX_FRUITS;
  }

  get nextLevel(): number {
    return this.spawner.peek();
  }

  heldRadius(): number {
    return FRUITS[this.held.level].radius;
  }

  /** Clamp an x so the held fruit stays fully inside the jar. */
  aim(x: number) {
    const r = this.heldRadius();
    this.held.x = Math.max(WORLD.jarLeft + r + 1, Math.min(WORLD.jarRight - r - 1, x));
  }

  drop(): boolean {
    if (!this.canDrop) return false;
    const level = this.held.level;
    this.addFruit(level, this.held.x, WORLD.spawnY, 0, 2);
    this.held = { level: this.spawner.take(), x: this.held.x, readyAt: this.now + DROP_COOLDOWN_MS };
    this.aim(this.held.x);
    this.emit({ type: 'drop', level });
    return true;
  }

  // ---------------------------------------------------------------- power-ups
  useShake(): boolean {
    if (this.powerUps.shake <= 0 || this.gameOver || this.paused) return false;
    this.powerUps.shake--;
    for (const f of this.fruits) {
      Matter.Body.setVelocity(f.body, { x: (this.rand() - 0.5) * 14, y: -6 - this.rand() * 8 });
      Matter.Body.setAngularVelocity(f.body, (this.rand() - 0.5) * 0.4);
    }
    this.shake = Math.max(this.shake, 14);
    this.emitPowerUps();
    return true;
  }

  toggleBomb(): boolean {
    if (this.gameOver || this.paused) return false;
    if (!this.bombArmed && this.powerUps.bomb <= 0) return false;
    this.bombArmed = !this.bombArmed;
    this.emit({ type: 'bomb', armed: this.bombArmed });
    return true;
  }

  /** Remove the fruit under (x, y) if a bomb is armed. */
  bombAt(x: number, y: number): boolean {
    if (!this.bombArmed) return false;
    const f = this.fruitAt(x, y);
    if (!f) return false;
    this.bombArmed = false;
    this.powerUps.bomb--;
    const def = FRUITS[f.level];
    this.fx.burst(f.body.position.x, f.body.position.y, 16, [def.base, def.light, '#FFFFFF', '#333333'], 260, this.rand);
    this.fx.ring(f.body.position.x, f.body.position.y, f.r * 1.8, '#FFFFFF');
    this.shake = Math.max(this.shake, 8);
    this.removeFruit(f);
    this.emit({ type: 'bomb', armed: false });
    this.emitPowerUps();
    return true;
  }

  fruitAt(x: number, y: number): Fruit | undefined {
    let best: Fruit | undefined;
    let bestD = Infinity;
    for (const f of this.fruits) {
      const dx = f.body.position.x - x;
      const dy = f.body.position.y - y;
      const d = Math.sqrt(dx * dx + dy * dy) - f.r;
      if (d < 12 && d < bestD) {
        best = f;
        bestD = d;
      }
    }
    return best;
  }

  grantPowerUp(p: PowerUp) {
    this.powerUps[p]++;
    this.emitPowerUps(p);
  }

  private emitPowerUps(earned?: PowerUp) {
    this.emit({ type: 'powerups', shake: this.powerUps.shake, bomb: this.powerUps.bomb, earned });
  }

  /** Rewarded "continue": clear everything near the top and resume. */
  continueRun() {
    if (!this.gameOver || this.continued) return;
    this.continued = true;
    this.gameOver = false;
    const limit = WORLD.dangerY + 140;
    for (const f of [...this.fruits]) {
      if (f.body.position.y - f.r < limit) {
        const def = FRUITS[f.level];
        this.fx.burst(f.body.position.x, f.body.position.y, 8, [def.base, def.light], 200, this.rand);
        this.removeFruit(f);
      }
    }
    for (const f of this.fruits) f.dangerMs = 0;
    this.held.readyAt = this.now + DROP_COOLDOWN_MS;
    this.setDanger(false);
  }

  // ---------------------------------------------------------------- physics
  private onCollision = (ev: Matter.IEventCollision<Matter.Engine>) => {
    const starting = ev.name === 'collisionStart';
    for (const pair of ev.pairs) {
      const a = this.byBody.get(pair.bodyA.id);
      const b = this.byBody.get(pair.bodyB.id);
      if (starting) this.impact(pair, a, b);
      if (!a || !b || a.level !== b.level || a.merging || b.merging) continue;
      a.merging = b.merging = true;
      this.mergeQueue.push([a, b]);
    }
  };

  private impact(pair: Matter.Pair, a?: Fruit, b?: Fruit) {
    const n = pair.collision.normal;
    const va = pair.bodyA.velocity;
    const vb = pair.bodyB.velocity;
    const rel = Math.abs((va.x - vb.x) * n.x + (va.y - vb.y) * n.y);
    if (rel < 1.2) return;
    const amt = Math.min(0.28, rel * 0.035);
    const ang = Math.atan2(n.y, n.x);
    for (const f of [a, b]) {
      if (!f || f.merging) continue;
      if (amt > f.squash * Math.exp(-f.squashT / 140)) {
        f.squash = amt;
        f.squashAngle = ang;
        f.squashT = 0;
      }
    }
    if (rel > 3) this.emit({ type: 'land', strength: Math.min(1, rel / 12) });
  }

  private processMerges() {
    while (this.mergeQueue.length) {
      const [a, b] = this.mergeQueue.shift()!;
      if (a.removed || b.removed) continue;
      const pa = a.body.position;
      const pb = b.body.position;
      const cx = (pa.x + pb.x) / 2;
      const cy = (pa.y + pb.y) / 2;
      const vx = (a.body.velocity.x + b.body.velocity.x) / 2;
      const vy = (a.body.velocity.y + b.body.velocity.y) / 2;
      const level = a.level;
      this.fx.ghost(level, pa.x, pa.y, cx, cy, a.body.angle);
      this.fx.ghost(level, pb.x, pb.y, cx, cy, b.body.angle);
      this.removeFruit(a);
      this.removeFruit(b);

      const count = this.combo.hit(this.now);
      const pts = mergePoints(level, this.combo.multiplier);
      this.score += pts;
      this.merges++;
      const out = mergeOutcome(level);
      const def = FRUITS[out.kind === 'merge' ? out.level : level];

      if (out.kind === 'merge') {
        const r = FRUITS[out.level].radius;
        // keep the new (bigger) fruit inside the jar walls
        const x = Math.max(WORLD.jarLeft + r, Math.min(WORLD.jarRight - r, cx));
        const y = Math.min(WORLD.jarBottom - r, cy);
        this.addFruit(out.level, x, y, vx * 0.5, vy * 0.5 - 1, true);
        this.emit({ type: 'merge', level: out.level, combo: count });
      } else {
        this.emit({ type: 'vanish' });
      }

      const big = out.kind === 'vanish';
      const n = Math.min(16, 8 + level);
      this.fx.burst(cx, cy, big ? 28 : n, [def.base, def.light, def.accent, '#FFFFFF'], big ? 420 : 180 + level * 18, this.rand);
      this.fx.ring(cx, cy, def.radius * (big ? 2.6 : 1.7), big ? '#FFF3A0' : def.light);
      this.fx.popup(cx, cy - def.radius * 0.4, `+${pts}`, count > 1 ? '#FFC23D' : '#FFFFFF', 22 + Math.min(level, 8) * 2);
      this.shake = Math.max(this.shake, level >= 5 ? (level - 3) * 2.2 : 0, big ? 20 : 0);

      if (count >= 2) {
        this.fx.showCombo(count);
        this.emit({ type: 'combo', count });
      }
      if (count === COMBO_POWERUP_AT && this.earnedPowerUps < MAX_POWERUPS_EARNED) {
        this.earnedPowerUps++;
        this.grantPowerUp(this.rand() < 0.5 ? 'shake' : 'bomb');
      }
      this.emit({ type: 'score', score: this.score, delta: pts });
    }
  }

  private capVelocities() {
    for (const f of this.fruits) {
      const v = f.body.velocity;
      const s = Math.sqrt(v.x * v.x + v.y * v.y);
      if (s > MAX_SPEED) Matter.Body.setVelocity(f.body, { x: (v.x / s) * MAX_SPEED, y: (v.y / s) * MAX_SPEED });
    }
  }

  private step(dt: number) {
    const sub = dt / SUBSTEPS;
    for (let i = 0; i < SUBSTEPS; i++) {
      Matter.Engine.update(this.matter, sub);
      this.capVelocities();
      this.processMerges();
    }
    this.now += dt;
    this.combo.update(this.now);
    this.updateFruitAnims(dt);
    this.checkDanger(dt);
  }

  private updateFruitAnims(dt: number) {
    for (const f of this.fruits) {
      if (f.popT < POP_MS) f.popT += dt;
      f.squashT += dt;
      if (f.blinkT > 0) f.blinkT -= dt;
      else if ((f.blinkIn -= dt) <= 0) {
        f.blinkT = 140;
        f.blinkIn = 2000 + this.rand() * 4000;
      }
    }
  }

  private checkDanger(dt: number) {
    let worst = 0;
    for (const f of this.fruits) {
      const above = f.body.position.y - f.r < WORLD.dangerY;
      if (!above || this.now - f.dropAt < GRACE_AFTER_DROP_MS) {
        f.dangerMs = 0;
        continue;
      }
      const v = f.body.velocity;
      if (v.x * v.x + v.y * v.y < 2.5) f.dangerMs += dt; // only settled fruits count
      worst = Math.max(worst, f.dangerMs);
    }
    this.dangerLevel = worst <= WARN_MS ? 0 : Math.min(1, (worst - WARN_MS) / (GAME_OVER_MS - WARN_MS));
    this.setDanger(worst > WARN_MS);
    if (worst > GAME_OVER_MS) {
      this.gameOver = true;
      this.bombArmed = false;
      this.setDanger(false);
      this.emit({ type: 'gameover', score: this.score });
    }
  }

  private setDanger(on: boolean) {
    if (on !== this.dangerOn) {
      this.dangerOn = on;
      this.emit({ type: 'danger', on });
    }
  }

  /** Advance by real elapsed ms. Uses a fixed 60 Hz step with an accumulator. */
  tick(realDt: number) {
    // cosmetic effects keep animating while game over, physics does not
    const dt = Math.min(realDt, 100);
    if (!this.paused) this.fx.update(dt);
    this.shake *= Math.pow(0.86, dt / STEP_MS);
    if (this.shake < 0.05) this.shake = 0;
    if (this.paused || this.gameOver) {
      this.acc = 0;
      return;
    }
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP_MS && steps < MAX_STEPS_PER_TICK) {
      this.step(STEP_MS);
      this.acc -= STEP_MS;
      steps++;
      if (this.gameOver) break;
    }
    if (steps === MAX_STEPS_PER_TICK) this.acc = 0; // drop backlog instead of spiralling
  }

  /** Test/debug helper. */
  debugSpawn(level: number, x: number, y: number) {
    return this.addFruit(level, x, y);
  }

  destroy() {
    Matter.Events.off(this.matter, 'collisionStart', this.onCollision);
    Matter.Events.off(this.matter, 'collisionActive', this.onCollision);
    Matter.World.clear(this.matter.world, false);
    Matter.Engine.clear(this.matter);
    this.listeners.clear();
  }
}

export { MAX_LEVEL };
