import { W, H, lp } from '../config.js';
import { FLOW, WEAK_POINTS, POINT_ORDER } from '../data/flow.js';
import { SPARK } from '../data/lighting.js';
import { VARIANTS } from '../data/variants.js';
import * as F from '../systems/flow.js';
import * as B from '../systems/battleState.js';
import { sfx } from '../systems/sfx.js';
import { chime, ting, snap, sigh } from '../systems/perfectSfx.js';
import { music } from '../systems/music.js';
import { text } from '../ui/font.js';
import { Aura } from './aura.js';
import { SurgeCtl } from './surge.js';
import { wait } from './anims.js';
import { hitFeedback, traitFeedback } from './feedback.js';

// Perfect Moments (primal surge brief §2b, numbers in data/flow.js). One per battle scene.
//   perfect dodge on an attack's last hit: calm (slow-mo, the world dims, the music goes
//     quiet, a water-drop chime) -> aim (tap a weak point, or arrows + Space) -> a very fast
//     counter. The calm starts once the dodge ring has resolved, and the next ring of a
//     combo only opens at full speed, so QTE timing never changes.
//   crit on the attack bar: a short freeze with a "ting", then the swing plays fast.
//   streak: every perfect climbs the chime a note and grows the aura; a hit taken or a
//     missed attack breaks it with a soft sigh.
const realWait = (ms) => new Promise((r) => setTimeout(r, ms));
const pointAt = (rig, k) => rig.at(Math.round(rig.w * WEAK_POINTS[k].gx), Math.round(rig.h * WEAK_POINTS[k].gy));

export class Flow {
  constructor(scene) {
    this.s = scene;
    this.aura = new Aura(scene, scene.st.player.rig);
    scene.surge = new SurgeCtl(scene); // the Primal meter and Surge (battle/surge.js)
    const v = VARIANTS[scene.st.build?.variant];
    if (v) this.aura.glow(v.glow); // a color variant glows in its own color
    scene.st.player.variant ??= scene.st.build?.variant ?? null; // test fights (?v=) name it on the HUD too
    this.dodges = 0;          // perfect dodges this round (combo guardrail)
    this.round = -1;
    this.lastPoint = 'head';
    this.pending = null;      // the calm (+ aim) after a perfect dodge: resolves { e, point } | null
    this.calmOn = false;
    scene.events.once('shutdown', () => { clearInterval(this.fastTimer); if (this.calmOn) music.setCalm(false); });
  }

  get st() { return this.s.st; }

  /* ---------- streak ---------- */

  up() {
    const n = F.perfect(this.st);
    this.aura.set(n);
    return n;
  }

  broken() {
    if (F.breakStreak(this.st) > 0) sigh();
    this.aura.set(0);
  }

  /* ---------- perfect dodge ---------- */

  // A hit of an enemy attack resolved. last: no more hits follow in this attack.
  defended(e, defend, last) {
    if (defend === 'hit') { this.broken(); this.s.surge.gain('hit'); return; }
    if (defend === 'block') this.s.surge.gain('block');
    if (defend !== 'dodge') return;
    if (this.round !== this.st.turn) { this.round = this.st.turn; this.dodges = 0; }
    this.dodges++;
    chime(this.up());
    this.s.surge.gain('dodge');
    const rig = this.st.player.rig;
    rig.ghost(0.55, 600); // where the hit would have landed
    this.ripple(rig);
    if (last && !this.pending) this.pending = this.calm(e);
  }

  // After the attack's hits: wait for the calm and the aim. A perfect dodge on an earlier
  // hit (then hit by the last one) still earns the counter, after a short calm.
  async settle(e, dodged) {
    const ready = e.hp > 0 && this.st.player.hp > 0 && !e.status.submerged && B.counterReady(this.st);
    if (!this.pending && dodged && ready) this.pending = this.calm(e, true);
    const p = this.pending;
    this.pending = null;
    return p ? p : null;
  }

  async calm(e, short = false) {
    short ||= this.dodges >= FLOW.shortAfter;
    this.enter();
    await realWait(short ? FLOW.shortCalmMs : FLOW.calmMs);
    const st = this.st;
    if (!(e.hp > 0 && st.player.hp > 0 && !e.status.submerged && B.counterReady(st))) { this.exit(); return null; }
    let pick;
    if (short) pick = { e, point: this.lastPoint };
    else if (this.s.registry.get('aim') === 'auto') pick = { e, point: 'head' };
    else pick = await this.aim(e);
    this.lastPoint = pick.point;
    this.s.fx.setSpeed(1); // release: time snaps back (the attacker's follow-through ends quickly)
    return pick;
  }

  enter() {
    const s = this.s, rig = this.st.player.rig;
    this.calmOn = true;
    s.fx.setSpeed(FLOW.slow);
    rig.c.setDepth(8);
    this.dim ??= s.add.rectangle(0, 0, W, H, 0x0a1018).setOrigin(0).setDepth(7.5).setAlpha(0);
    s.tweens.killTweensOf(this.dim);
    s.tweens.add({ targets: this.dim, alpha: FLOW.dim, duration: 20 }); // ~100ms at the slowed clock
    music.setCalm(true, { level: FLOW.musicLevel, lowpass: FLOW.musicLowpass });
  }

  exit() {
    if (!this.calmOn) return;
    this.calmOn = false;
    const s = this.s;
    s.fx.setSpeed(1);
    s.tweens.killTweensOf(this.dim);
    s.tweens.add({ targets: this.dim, alpha: 0, duration: 150 });
    this.st.player.rig.c.setDepth(5);
    music.setCalm(false);
  }

  // A soft ring rippling out across the ground from the dino.
  ripple(rig) {
    const s = this.s, g = s.add.graphics().setDepth(4.5), o = { r: 4, a: 0.8 };
    s.tweens.add({
      targets: o, r: 40, a: 0, duration: 260, ease: 'Quad.Out',
      onUpdate: () => g.clear().lineStyle(1, 0x7fe0ff, o.a).strokeEllipse(rig.homeX, rig.homeY, o.r * 2, o.r * 0.6),
      onComplete: () => g.destroy()
    });
  }

  // Weak points on the attacker (packs: arrows up / down or a tap switch enemies). Taps,
  // arrows + Space / Enter; the head when the time runs out.
  aim(first) {
    const s = this.s, st = this.st;
    return new Promise((resolve) => {
      let e = first, sel = 'head', done = false;
      const t0 = Date.now(), g = s.add.graphics().setDepth(8.6), bar = s.add.graphics().setDepth(31);
      s.say(lp('AIM YOUR COUNTER!  < >  SPACE', 'TAP A WEAK POINT!')); // the message row: the DODGE! pop rises through the hint row
      const tag = text(s, 0, 0, '', { origin: [0.5, 0], small: true }).setDepth(31);
      const points = () => POINT_ORDER.map((k) => ({ k, ...pointAt(e.rig, k) })).sort((a, b) => a.x - b.x);
      const draw = (left) => {
        g.clear();
        const pulse = Math.floor(Date.now() / 120) % 2;
        for (const p of points()) {
          const on = p.k === sel, r = on ? 4 + pulse : 3, c = WEAK_POINTS[p.k].color;
          g.fillStyle(0x0c0e12, 0.9).fillPoints(diamond(p.x, p.y, r + 1), true);
          g.fillStyle(on ? 0xffffff : c, 1).fillPoints(diamond(p.x, p.y, r), true);
          if (on) { g.fillStyle(c, 1).fillPoints(diamond(p.x, p.y, r - 2), true); tag.setPosition(p.x, p.y + 7).setText(WEAK_POINTS[p.k].label); tag.label?.setTint(c); }
        }
        const bw = 60, bx = Math.round(W / 2 - bw / 2), by = lp(62, 78);
        bar.clear().fillStyle(0x121418).fillRect(bx, by, bw, 2).fillStyle(0x7fe0ff).fillRect(bx, by, Math.round(bw * left), 2);
      };
      const finish = (point) => {
        if (done) return;
        done = true;
        s.events.off('update', tick);
        s.input.keyboard?.off('keydown', key);
        s.input.off('pointerdown', tap);
        g.destroy(); bar.destroy(); tag.destroy();
        s.say('');
        resolve({ e, point });
      };
      const step = (d) => { const ps = points(), i = ps.findIndex((p) => p.k === sel); sel = ps[(i + d + ps.length) % ps.length].k; sfx('tick'); };
      const swap = (d) => {
        const list = B.targetable(st);
        if (list.length < 2) return;
        e = list[(list.indexOf(e) + d + list.length) % list.length];
        sfx('tick');
      };
      const key = (ev) => {
        if (ev.repeat) return;
        if (ev.code === 'ArrowLeft' || ev.code === 'KeyA') step(-1);
        else if (ev.code === 'ArrowRight' || ev.code === 'KeyD') step(1);
        else if (ev.code === 'ArrowUp' || ev.code === 'ArrowDown' || ev.code === 'Tab') { ev.preventDefault?.(); swap(ev.code === 'ArrowUp' ? -1 : 1); }
        else if (ev.code === 'Space' || ev.code === 'Enter') finish(sel);
      };
      const tap = (ptr) => {
        const x = ptr.worldX, y = ptr.worldY;
        const near = points().find((p) => Math.abs(p.x - x) <= 12 && Math.abs(p.y - y) <= 12);
        if (near) { finish(near.k); return; }
        const other = B.targetable(st).find((o) => o !== e && Math.abs(o.rig.x - x) <= o.rig.halfW && y <= o.rig.homeY && y >= o.rig.homeY - o.rig.h * o.rig.scale);
        if (other) { e = other; sfx('tick'); }
      };
      const tick = () => {
        const left = 1 - (Date.now() - t0) / FLOW.aimMs;
        if (left <= 0) finish('head');
        else draw(left);
      };
      s.events.on('update', tick);
      s.input.keyboard?.on('keydown', key);
      s.input.on('pointerdown', tap);
      s.events.once('shutdown', () => { done = true; s.events.off('update', tick); s.input.keyboard?.off('keydown', key); s.input.off('pointerdown', tap); });
      draw(1);
    });
  }

  // Release: time snaps back, a 2-frame dash with speed lines, a hard hitstop on impact,
  // then the dino zips home.
  async counter({ e, point }) {
    const s = this.s, st = this.st, p = st.player, rig = p.rig, dir = rig.homeFacing;
    this.exit();
    rig.stopIdle();
    rig.c.setDepth(8);
    const tx = Math.round(e.rig.x - dir * (rig.halfW + e.rig.halfW - 10));
    sfx('whoosh');
    for (const k of [0.5, 1]) {
      rig.ghost(0.5, 220);
      s.fx.speedLines(rig.x, rig.y - rig.h * rig.scale * 0.5, dir);
      rig.x = Math.round(rig.x + (tx - rig.x) * k);
      await wait(s, FLOW.dashMs / 2);
    }
    const r = F.aimedCounter(st, e, point), at = pointAt(e.rig, point), t = e.rig.top();
    snap();
    s.fx.slash(at.x, at.y, dir);
    hitFeedback(s, p, e, r.dmg, point === 'head' ? 'crit' : 'good', 'hit', 0, { gold: true });
    s.fx.hitstop(FLOW.hitstopMs);
    traitFeedback(s, p, e, r.trait);
    s.fx.pop(t.x, t.y - 8, 'COUNTER!', '#ffd040', 1, 800);
    if (point !== 'head' && e.hp > 0) s.fx.pop(t.x, t.y - 18, point === 'legs' ? 'HOBBLED' : 'BLEED', point === 'legs' ? '#7fe0ff' : '#e43b44', 1, 800);
    s.afterDamage(e, r);
    await wait(s, 60);
    rig.ghost(0.4, 200);
    await new Promise((res) => s.tweens.add({ targets: rig.c, x: rig.homeX, duration: FLOW.backMs, ease: 'Quad.Out', onComplete: res }));
    rig.setPose({});
    rig.c.setDepth(5);
    rig.startIdle();
  }

  /* ---------- clean hit (crit on the attack bar) ---------- */

  // Wrap an attack bar's result: a crit freezes for a beat, then the swing runs fast.
  bar(promise) {
    return promise.then(async (res) => {
      if (res === 'miss') this.broken();
      if (res !== 'crit') return res;
      const s = this.s;
      ting(this.up());
      s.surge.gain('crit');
      s.fx.hitstop(FLOW.critFreezeMs);
      s.fx.setSpeed(FLOW.critSpeed); // lands on this once the freeze ends
      music.duck(FLOW.critFreezeMs + 150);
      this.vignette();
      this.fast = true;
      const rig = this.st.player.rig;
      clearInterval(this.fastTimer);
      this.fastTimer = setInterval(() => { if (!s.fx.frozen) rig.ghost(0.35, 160); }, 40);
      await realWait(FLOW.critFreezeMs);
      s.fx.speedLines(rig.x, rig.y - rig.h * rig.scale * 0.5, rig.homeFacing);
      return res;
    });
  }

  // The strike is over: back to normal speed.
  endFast() {
    if (!this.fast) return;
    this.fast = false;
    clearInterval(this.fastTimer);
    this.s.fx.setSpeed(1);
  }

  // A crit swing lands: more sparks and a bigger flash of light.
  critImpact(v) {
    if (!this.fast) return;
    const s = this.s, p = v.rig.hitPoint();
    s.fx.sparks(p.x, p.y, { count: 12, dir: this.st.player.rig.homeFacing, big: true, gold: true });
    s.lighting?.burst(p.x, p.y, { ...SPARK.crit, radius: SPARK.crit.radius * 1.5, intensity: SPARK.crit.intensity * 1.3 });
  }

  // The edges of the screen pull in for a moment.
  vignette() {
    const s = this.s;
    if (!s.textures.exists('flowVignette')) {
      const c = s.textures.createCanvas('flowVignette', 160, 90), ctx = c.getContext();
      const gr = ctx.createRadialGradient(80, 45, 20, 80, 45, 95);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 160, 90);
      c.refresh();
    }
    const v = s.add.image(0, 0, 'flowVignette').setOrigin(0).setDisplaySize(W, H).setDepth(9).setAlpha(0);
    s.tweens.add({ targets: v, alpha: 0.55, duration: 60, yoyo: true, hold: 120, onComplete: () => v.destroy() });
  }
}

const diamond = (x, y, r) => [{ x, y: y - r }, { x: x + r, y }, { x, y: y + r }, { x: x - r, y }];
