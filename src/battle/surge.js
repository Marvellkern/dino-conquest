import { W, H, COLORS, lp } from '../config.js';
import { SURGE } from '../data/surge.js';
import { MOVES } from '../data/moves.js';
import { SPECIES } from '../data/species.js';
import { VARIANTS } from '../data/variants.js';
import * as SG from '../systems/surge.js';
import * as B from '../systems/battleState.js';
import { sfx } from '../systems/sfx.js';
import { music } from '../systems/music.js';
import { onPress } from '../systems/qte.js';
import { text } from '../ui/font.js';
import { Button } from '../ui/button.js';
import { wait } from './anims.js';

// Primal Surge, on screen (rules in systems/surge.js, numbers in data/surge.js). One per
// battle (scene.surge, made by battle/flow.js, which reports the dodges, hits and crits).
//   the meter: a thin bar under the player's HP, dim orange to gold; full, it pulses and a
//     gold light glows at the dino's feet. Each gain pops "+20" beside it.
//   SURGE! (key R): appears over the move bar once it's full, on the player's turn.
//   activation (~1.2s, tap to skip after the first one each run): the arena darkens, the
//     music cuts for a beat, the dino crouches and roars (shockwave, dust), grows 15%, a
//     flickering aura lights the arena, the music goes to its surge layer, PRIMAL SURGE slams in.
//   while it lasts: slot 5 is the Apex Strike. When it ends the dino shrinks back.
const lerp = (a, b, k) => {
  const ch = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

export class SurgeCtl {
  constructor(scene) {
    this.s = scene;
    this.was = false;
    this.g = scene.add.graphics().setDepth(11);
    this.btn = null;
    this.upd = () => this.update();
    this.key = (e) => { if (!e.repeat && e.code === 'KeyR' && this.btn) this.btn.click(); };
    scene.events.on('update', this.upd);
    scene.input.keyboard?.on('keydown', this.key);
    // Kills fill the meter too (Battle.afterDamage handles every kill).
    const after = scene.afterDamage.bind(scene);
    scene.afterDamage = (e, r) => { if (r.killed) this.gain('kill'); after(e, r); };
    scene.events.once('shutdown', () => {
      scene.events.off('update', this.upd);
      scene.input.keyboard?.off('keydown', this.key);
      if (scene.st?.surge?.active) music.setSurge(false);
    });
  }

  get st() { return this.s.st; }

  // A meter event (systems/surge.js gain). Shows the "+n".
  gain(kind) {
    const st = this.st, before = SG.ready(st), n = SG.gain(st, kind, st.flowStreak ?? 0), hud = this.s.playerHud;
    if (!n || !hud) return;
    const t = text(this.s, hud.bx + hud.hpW + 2, hud.y + 26, `+${n}`, { color: '#ffd040', small: true }).setDepth(12);
    this.s.tweens.add({ targets: t, y: t.y - 8, alpha: 0, duration: 700, onComplete: () => t.destroy() });
    if (!before && SG.ready(st)) { sfx('levelup'); this.s.say('PRIMAL SURGE READY!  [R]'); }
  }

  startMove() { SG.startMove(this.st); }

  update() {
    const st = this.st, hud = this.s.playerHud;
    if (!st?.surge || !hud) return;
    // The meter.
    const s = st.surge, k = s.meter / SURGE.max, full = s.meter >= SURGE.max, x = hud.bx, y = hud.y + 29, w = hud.hpW;
    const pulse = full ? 0.6 + 0.4 * Math.sin(Date.now() / 120) : 1;
    this.g.clear().fillStyle(0x0c0e12).fillRect(x, y, w, 2);
    this.g.fillStyle(s.active ? 0xffffff : lerp(0x8a4a1a, 0xffd040, k), pulse).fillRect(x, y, Math.round(w * k), 2);
    // Ready: a pulsing gold light at the dino's feet.
    const rig = st.player.rig;
    if (SG.ready(st) && !this.readyLight) this.readyLight = this.s.lighting?.steady(50, 0xffd040, 0.6) ?? null;
    if (!SG.ready(st) && this.readyLight) { this.s.lighting.release(this.readyLight); this.readyLight = null; }
    this.readyLight?.setPosition(rig.x, rig.homeY - 6).setIntensity(0.4 + 0.5 * pulse);
    // The button, on the player's turn only.
    const show = SG.ready(st) && this.s.planning;
    if (show && !this.btn) {
      const [bx, by] = lp([4, 122], [W - 68, 184]);
      this.btn = new Button(this.s, bx, by, 64, 16, { key: 'R', label: 'SURGE!', depth: 20, onClick: () => this.s.bar.on && this.s.bar.pick('surge') });
      this.btn.label.label?.setTint(0xffd040);
    } else if (!show && this.btn) { this.btn.destroy(); this.btn = null; }
    // The surge ran out (systems/surge.js ends it as a player turn starts).
    if (this.was && !s.active) this.ended();
    this.was = s.active;
  }

  async activate() {
    const s = this.s, st = this.st, p = st.player, rig = p.rig, run = st.build.run;
    const color = VARIANTS[st.build.variant]?.glow ?? SG.apexInfo(p.species).aura;
    const quick = run ? !!run.surgeSeen : !!s.surgeSeen;
    if (run) run.surgeSeen = true; else s.surgeSeen = true;
    let skipped = false;
    const off = quick ? onPress(s, () => { skipped = true; }) : () => {};
    const nap = (ms) => (skipped ? Promise.resolve() : wait(s, quick ? ms * 0.5 : ms));
    SG.activate(st);
    this.was = true;
    s.say('');
    // The arena darkens; the music cuts for a beat.
    rig.stopIdle();
    rig.c.setDepth(8);
    const dim = s.add.rectangle(0, 0, W, H, 0x05070c).setOrigin(0).setDepth(7.5).setAlpha(0);
    s.tweens.add({ targets: dim, alpha: 0.5, duration: 120 });
    music.duck(music.beat()?.beatMs ?? 450, 0);
    // Crouch...
    if (p.species === 'rex') rig.setPose({ body: -2, hx: -1, hy: -2, gap: 1 }); else rig.setPose({ crouch: true });
    sfx('growl');
    await nap(300);
    // ...then the roar.
    if (p.species === 'rex') rig.setPose({ body: -2, hx: -1, hy: -2, gap: 4 }); else rig.setPose({ dy: -2 });
    sfx('surgeRoar'); // bigger than Roar, with a low boom
    s.fx.shake(5, 500);
    s.lighting?.roar();
    const c = rig.center();
    this.shockwave(c.x, rig.homeY - 8, color);
    s.fx.dust(rig.x - 10, rig.homeY, 6);
    s.fx.dust(rig.x + 10, rig.homeY, 6);
    s.fx.debris(c.x, rig.homeY - 4, s.zone, 8);
    // Grows 15%; the aura and its light; the surge layer.
    this.grow(SURGE.grow);
    s.flow.aura.surge(color);
    music.setSurge(true);
    const title = text(s, W / 2, lp(70, 104), 'PRIMAL SURGE', { scale: 3, color: '#ffd040', origin: 0.5 }).setDepth(41).setAlpha(0);
    title.y -= 16;
    s.tweens.add({ targets: title, y: title.y + 16, alpha: 1, duration: 140, ease: 'Quad.In', onComplete: () => s.fx.shake(3, 160) });
    await nap(650);
    s.tweens.add({ targets: title, alpha: 0, duration: 250, onComplete: () => title.destroy() });
    s.tweens.add({ targets: dim, alpha: 0, duration: 250, onComplete: () => dim.destroy() });
    off();
    rig.setPose({});
    rig.c.setDepth(5);
    rig.startIdle();
    // The special becomes the Apex Strike.
    s.bar.setSlot(4, 'apex', { sub: MOVES.apex.desc });
    s.say(`PRIMAL SURGE! ${SURGE.turns} TURNS  +1 ENERGY`);
  }

  // The surge is over: the aura fades, the dino shrinks back, the music returns, the special
  // comes back, and any boss phase that waited plays out.
  ended() {
    const s = this.s, st = this.st;
    s.flow.aura.surge(null);
    this.grow(1);
    music.setSurge(false);
    s.bar.setSlot(4, SPECIES[st.player.species].special);
    s.say('THE SURGE FADES');
    for (const e of B.alive(st)) { const ph = B.checkPhase(st, e); if (ph) s.phases.push({ e, ...ph }); }
  }

  // Scale the dino to k x its normal size (feet stay put).
  grow(k) {
    const rig = this.st.player.rig;
    rig.baseScale ??= rig.scale;
    const o = { v: rig.scale };
    this.s.tweens.add({
      targets: o, v: rig.baseScale * k, duration: 220, ease: 'Back.Out',
      onUpdate: () => { rig.scale = o.v; rig.c.setScale(o.v * rig.facing, o.v); }
    });
  }

  shockwave(x, y, color) {
    const s = this.s, g = s.add.graphics().setDepth(8.5), o = { r: 6, a: 1 };
    s.tweens.add({
      targets: o, r: 120, a: 0, duration: 420, ease: 'Quad.Out',
      onUpdate: () => g.clear().lineStyle(2, color, o.a).strokeCircle(x, y, o.r).lineStyle(1, 0xffffff, o.a * 0.7).strokeCircle(x, y, o.r * 0.8),
      onComplete: () => g.destroy()
    });
  }
}
