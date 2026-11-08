/**
 * Pooled visual effects. Everything is pre-allocated once so gameplay never
 * allocates per frame (avoids GC stutter on low-end Android).
 */

export type Particle = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // ms remaining
  maxLife: number;
  size: number;
  color: string;
};

export type Ring = { active: boolean; x: number; y: number; r: number; t: number; dur: number; color: string };

export type Popup = { active: boolean; x: number; y: number; text: string; t: number; dur: number; color: string; size: number };

/** A merging fruit shrinking into the contact point. */
export type Ghost = {
  active: boolean;
  level: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  angle: number;
  t: number;
  dur: number;
};

function pool<T>(n: number, make: () => T): T[] {
  return Array.from({ length: n }, make);
}

export class Effects {
  particles: Particle[];
  rings: Ring[];
  popups: Popup[];
  ghosts: Ghost[];
  combo = { text: '', count: 0, t: 0, dur: 1100, active: false };

  constructor(maxParticles: number) {
    this.particles = pool(maxParticles, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, color: '#fff' }));
    this.rings = pool(8, () => ({ active: false, x: 0, y: 0, r: 0, t: 0, dur: 1, color: '#fff' }));
    this.popups = pool(12, () => ({ active: false, x: 0, y: 0, text: '', t: 0, dur: 1, color: '#fff', size: 20 }));
    this.ghosts = pool(12, () => ({ active: false, level: 0, x0: 0, y0: 0, x1: 0, y1: 0, angle: 0, t: 0, dur: 1 }));
  }

  private free<T extends { active: boolean }>(arr: T[]): T | undefined {
    for (let i = 0; i < arr.length; i++) if (!arr[i].active) return arr[i];
    return undefined;
  }

  burst(x: number, y: number, count: number, colors: string[], speed: number, rand: () => number) {
    for (let i = 0; i < count; i++) {
      const p = this.free(this.particles);
      if (!p) return; // pool exhausted: silently cap
      const a = (i / count) * Math.PI * 2 + rand() * 0.6;
      const s = speed * (0.55 + rand() * 0.7);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - speed * 0.3;
      p.maxLife = p.life = 450 + rand() * 350;
      p.size = 2.5 + rand() * 4;
      p.color = colors[i % colors.length];
    }
  }

  ring(x: number, y: number, r: number, color: string) {
    const g = this.free(this.rings);
    if (!g) return;
    g.active = true;
    g.x = x;
    g.y = y;
    g.r = r;
    g.t = 0;
    g.dur = 420;
    g.color = color;
  }

  popup(x: number, y: number, text: string, color: string, size: number) {
    // stack above recent popups instead of drawing on top of them (simultaneous merges)
    for (let tries = 0; tries < 6; tries++) {
      const hit = this.popups.some((q) => q.active && q.t < 500 && Math.abs(q.x - x) < 60 && Math.abs(q.y - y) < size + 4);
      if (!hit) break;
      y -= size + 6;
    }
    const p = this.free(this.popups) ?? this.popups[0];
    p.active = true;
    p.x = x;
    p.y = y;
    p.text = text;
    p.t = 0;
    p.dur = 900;
    p.color = color;
    p.size = size;
  }

  ghost(level: number, x0: number, y0: number, x1: number, y1: number, angle: number) {
    const g = this.free(this.ghosts);
    if (!g) return;
    g.active = true;
    g.level = level;
    g.x0 = x0;
    g.y0 = y0;
    g.x1 = x1;
    g.y1 = y1;
    g.angle = angle;
    g.t = 0;
    g.dur = 110;
  }

  showCombo(count: number) {
    this.combo.text = `Combo x${count}!`;
    this.combo.count = count;
    this.combo.t = 0;
    this.combo.active = true;
  }

  update(dt: number) {
    const sec = dt / 1000;
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += 900 * sec;
      p.vx *= 0.985;
      p.x += p.vx * sec;
      p.y += p.vy * sec;
    }
    for (const r of this.rings) if (r.active && (r.t += dt) >= r.dur) r.active = false;
    for (const p of this.popups) if (p.active && (p.t += dt) >= p.dur) p.active = false;
    for (const g of this.ghosts) if (g.active && (g.t += dt) >= g.dur) g.active = false;
    if (this.combo.active && (this.combo.t += dt) >= this.combo.dur) this.combo.active = false;
  }

  clear() {
    for (const p of this.particles) p.active = false;
    for (const r of this.rings) r.active = false;
    for (const p of this.popups) p.active = false;
    for (const g of this.ghosts) g.active = false;
    this.combo.active = false;
  }
}
