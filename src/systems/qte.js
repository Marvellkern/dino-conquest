import { W, lp } from '../config.js';
import { QTE, MUDDY, BLIND, COMBO, COMBO_MULT } from '../data/moves.js';
import { panel, pixelCircle } from '../ui/pixel.js';
import { text } from '../ui/font.js';
import { sfx } from './sfx.js';

// Space / Enter / click / tap anywhere. Returns an unsubscribe function.
export function onPress(scene, cb) {
  const p = () => cb();
  const k = (e) => { if (!e.repeat && (e.code === 'Space' || e.code === 'Enter')) cb(); };
  scene.input.on('pointerdown', p);
  scene.input.keyboard.on('keydown', k);
  return () => { scene.input.off('pointerdown', p); scene.input.keyboard?.off('keydown', k); };
}

// Both QTEs count time from scene 'update' deltas scaled by the clock,
// so they stay in sync with animation waits (and freeze during hitstop).
function ticker(scene, fn) {
  const upd = (_, dt) => {
    if (import.meta.env.DEV && dt > 33) console.debug(`[qte] slow frame: ${Math.round(dt)}ms`); // QTE timing is sacred
    fn(dt * scene.time.timeScale);
  };
  scene.events.on('update', upd);
  return () => scene.events.off('update', upd);
}

// Text rows under the HUD: status tags y38-46, battle message y48-56, QTE hint y58-66.
const hintY = () => lp(62, 78);
const barY = () => lp(72, 88);

// Dev builds only: lets automated play-tests time their presses.
const devHook = (info) => { if (import.meta.env.DEV) window.__qteHook?.(info); };

// Attack QTE: marker sweeps a bar once. Resolves 'crit' | 'good' | 'miss'.
// shape (data/qteProfiles.js rollBar): sweep time, sweet spot, marker curve,
// drift. Without one, the old fixed bar (title-screen demos, tests).
// blind (Venom Spit): the first part of the bar is covered, so the marker shows up late.
// combo (systems/combo.js comboPlan): after a good or crit the marker bounces back for an
// optional extra pass, faster, with new smaller zones (no curve, drift, mud or cover). The
// promise resolves once the combo is over, with the first pass's result; promise.combo
// holds { landed, sweets }. onPass(k, res, landed): each extra pass's result (k from 1).
const GLOW = [0xf0ecdc, 0xf7a040, 0xffd040, 0xffd040]; // the frame warms with each pass
export function attackBar(scene, { rng, sure = false, muddy = false, blind = false, shape = null, combo = null, onPass = null } = {}) {
  const sh = shape ?? { sweepMs: QTE.sweepMs, center: rng.range(0.55, 0.85), curve: 'linear', drift: null, sweetW: QTE.sweetW, goodW: QTE.goodW };
  const sweepMs = sh.sweepMs;
  let sweetW = Math.max(2, Math.round(sh.sweetW * (muddy ? MUDDY.sweet : 1))), goodW = Math.round(sh.goodW * (muddy ? MUDDY.good : 1));
  const info = { landed: 0, sweets: 0 };
  scene.qteActive = (scene.qteActive ?? 0) + 1; // extras (lightning) wait while a QTE is open
  const promise = new Promise((resolve) => {
    const BW = 100, BH = 6, x0 = Math.round(W / 2 - BW / 2), y0 = barY(), END = BW - 2;
    // Marker progress 0..1 at time t (wave: fast-slow-fast-slow; ease: slow-fast-slow).
    const curve = (k) => (sh.curve === 'wave' ? k - (0.55 * Math.sin(4 * Math.PI * k)) / (4 * Math.PI)
      : sh.curve === 'ease' ? k * k * (3 - 2 * k) : k);
    const pos0 = (t) => Math.min(END, Math.round(curve(Math.min(1, t / sweepMs)) * END));
    const center0 = (t) => {
      const k = sh.drift ? sh.center + sh.drift.amp * Math.sin((t / sh.drift.period) * Math.PI * 2 + sh.drift.phase) : sh.center;
      return Math.round(Math.min(0.92, Math.max(0.12, k)) * BW);
    };
    // Dev hook: the press time that lands dead center (scanned, so it works for curves and drift).
    let bestMs = 0, bestD = Infinity;
    for (let t = 61; t < sweepMs; t += 4) { const d = Math.abs(pos0(t) + 1 - center0(t)); if (d < bestD) { bestD = d; bestMs = t; } }
    devHook({ type: 'bar', sweepMs, center: center0(0), width: BW, muddy, blind, curve: sh.curve, drift: !!sh.drift, bestMs });

    const g = scene.add.graphics().setDepth(30);
    const zone = scene.add.graphics().setDepth(30);
    const frame = (color) => { g.clear(); panel(g, x0 - 4, y0 - 4, BW + 8, BH + 8); if (color) g.lineStyle(1, color).strokeRect(x0 - 2.5, y0 - 2.5, BW + 5, BH + 5); g.fillStyle(0x121418).fillRect(x0, y0, BW, BH); };
    frame(null);
    let mud = muddy, drift = !!sh.drift;
    const drawZone = (c) => {
      zone.clear();
      zone.fillStyle(mud ? 0x5a5030 : 0x3e7a3a).fillRect(x0 + c - goodW / 2, y0, goodW, BH);
      zone.fillStyle(0xfff096).fillRect(x0 + c - sweetW / 2, y0, sweetW, BH);
      if (drift) zone.fillStyle(0xffffff).fillRect(x0 + c, y0 - 2, 1, 1).fillRect(x0 + c, y0 + BH + 1, 1, 1); // sway markers
    };
    const m = scene.add.graphics().setDepth(31);
    const cover = scene.add.graphics().setDepth(32);
    if (blind) { // venom smear over the start of the bar
      const cw = Math.round(BW * BLIND.hide);
      cover.fillStyle(0x3e2731).fillRect(x0 - 1, y0 - 3, cw + 1, BH + 6);
      cover.fillStyle(0x68386c);
      for (let i = 0; i < cw; i += 3) cover.fillRect(x0 + i, y0 - 3 + ((i * 7) % (BH + 4)), 2, 2);
    }
    const hint = text(scene, W / 2, hintY(), blind ? 'BLINDED! WATCH CLOSELY!' : muddy ? 'MUDDY! TAP IN THE YELLOW!' : sh.drift ? lp('IT MOVES! TAP IN THE YELLOW!', 'IT MOVES! TAP YELLOW!') : 'TAP IN THE YELLOW!',
      { origin: 0.5, color: blind ? '#c070ff' : muddy ? '#b09a62' : '#f0ecdc' }).setDepth(31);
    const counter = text(scene, lp(x0 + BW + 10, W / 2), lp(y0 - 3, y0 + BH + 6), '', { scale: 2, color: '#ffd040', origin: lp([0, 0], [0.5, 0]) }).setDepth(31).setVisible(false); // portrait: under the bar

    // The pass being played: k 0 is the normal bar; extras move from `from` in `dir`.
    let t = 0, done = false, first = null, k = 0, pass = null;
    const pos = (t) => (!pass ? pos0(t) : Math.round(pass.from + pass.dir * pass.speed * Math.max(0, t - pass.t0 - pass.rest)));
    const centerAt = (t) => (!pass ? center0(t) : pass.c);
    const draw = () => {
      drawZone(centerAt(t));
      const px = Math.min(END, Math.max(0, pos(t)));
      m.clear();
      m.fillStyle(0x0c0e12).fillRect(x0 + px - 1, y0 - 3, 4, BH + 6);
      m.fillStyle(0xffffff).fillRect(x0 + px, y0 - 2, 2, BH + 4);
    };
    const judge = (px) => {
      if (px == null) return sure && !pass ? 'good' : 'miss';
      const d = Math.abs(px + 1 - centerAt(t));
      if (d <= sweetW / 2) return 'crit';
      if (d <= goodW / 2 || (sure && !pass)) return 'good';
      return 'miss';
    };
    const close = (delay) => scene.time.delayedCall(delay, () => { g.destroy(); zone.destroy(); m.destroy(); cover.destroy(); hint.destroy(); counter.destroy(); });
    const finish = (soft = false) => {
      if (done) return;
      done = true;
      scene.qteActive = Math.max(0, scene.qteActive - 1);
      offPress(); offTick();
      if (soft) { // a missed extra pass: the bar just fades, what was earned stays
        sfx('tuk');
        scene.tweens.add({ targets: [g, zone, m, hint], alpha: 0, duration: 200 });
      }
      close(soft ? 220 : 260);
      resolve(first);
    };
    // Bounce: the marker turns where it was hit and sweeps back with new, smaller zones.
    const bounce = (px) => {
      const p = combo.pass(++k), dir = k % 2 ? -1 : 1;
      const speed = (END / sweepMs) * p.speed;
      goodW = Math.max(4, Math.round(sh.goodW * p.shrink));
      sweetW = Math.max(2, Math.round(sh.sweetW * p.shrink), Math.ceil(combo.minWinMs * speed));
      mud = false; drift = false; cover.clear();
      const lead = Math.round(combo.lead * BW), room = (from) => [dir < 0 ? goodW / 2 + 2 : from + lead, dir < 0 ? from - lead : BW - goodW / 2 - 2];
      let [lo, hi] = room(px);
      if (hi < lo) { px = dir < 0 ? END : 0; [lo, hi] = room(px); } // hit near the start: no room to turn back, so it bounces off the far end
      pass = { from: px, dir, speed, t0: t, rest: combo.bounceMs, c: Math.round(lo + rng.next() * (hi - lo)) };
      devHook({ type: 'pass', k, bestMs: Math.round(pass.rest + Math.abs(pass.c - 1 - px) / speed) }); // ms from now to dead center
      sfx('bounce', k);
      zone.alpha = 1;
      const edge = scene.add.rectangle(x0 + px, y0 + BH / 2, 3, BH + 8, 0xffffff).setDepth(32); // a tick flash where it turned
      scene.tweens.add({ targets: edge, alpha: 0, duration: 160, onComplete: () => edge.destroy() });
      hint.setText(`AGAIN! ${k + 1}/${combo.passes}`);
      return true;
    };
    // One pass resolved (a tap, or the marker ran off the end).
    const passDone = (res) => {
      if (!pass) { // the first pass: the normal attack
        first = res;
        info.landed = res === 'miss' ? 0 : 1;
        hint.setText(res === 'crit' ? 'CRIT!' : res === 'good' ? 'GOOD' : 'MISS');
        hint.label.setTint(res === 'crit' ? 0xfff096 : res === 'good' ? 0xf0ecdc : 0x8a90a0);
        sfx(res === 'crit' ? (scene.flow ? null : 'ding') : res === 'good' ? 'tick' : 'early'); // battles ring their own crit (battle/flow.js)
        cover.clear();
        if (res === 'miss' || !combo || combo.passes < 2 || !bounce(Math.min(END, pos(t)))) { if (res === 'crit') g.fillStyle(0xffffff).fillRect(x0, y0, BW, BH); finish(); }
        return;
      }
      if (res === 'miss') { finish(true); return; }
      info.landed++;
      if (res === 'crit') info.sweets++;
      onPass?.(k, res, info.landed);
      const mult = COMBO_MULT[Math.min(info.landed, COMBO_MULT.length) - 1] + COMBO.sweetBonus * info.sweets;
      counter.setText(`X${+mult.toFixed(2)}${info.landed >= 3 ? '!' : ''}`).setVisible(true).setScale(1.6);
      scene.tweens.add({ targets: counter, scale: 1, duration: 140, ease: 'Back.Out' });
      frame(GLOW[Math.min(k, GLOW.length - 1)]);
      if (info.landed >= combo.passes || !bounce(Math.min(END, Math.max(0, pos(t))))) finish();
    };
    const offPress = onPress(scene, () => {
      if (!pass) { if (t > 60) passDone(judge(pos(t))); }
      else if (t > pass.t0 + pass.rest) passDone(judge(Math.min(END, Math.max(0, pos(t))))); // taps during the turn don't count
    });
    const offTick = ticker(scene, (dt) => {
      t += dt;
      if (!pass && t >= sweepMs) passDone(judge(null));
      else if (pass && (pos(t) < 0 || pos(t) > END)) passDone('miss');
      if (!done) draw();
    });
    draw();
  });
  promise.combo = info;
  return promise;
}

// Defend QTE: a ring shrinks onto a target circle, meeting it `leadMs` from now
// (the moment of impact). Resolves 'dodge' | 'block' | 'hit'.
// Timing profile (data/qteProfiles.js): ease shapes the shrink, pause/pauseAt
// freeze it mid-way (a delayed attack), resetAt restarts it (a feint).
// ring: 'red' (can't dodge: perfect blocks) | 'purple' (can't block).
export function defendRing(scene, {
  x, y, leadMs, dodgeMs = QTE.dodgeMs, blockMs = QTE.blockMs, noDodge = false,
  ease = 'linear', pause = 0, pauseAt = 0, resetAt = null, ring = null, fatigue = 0
}) {
  devHook({ type: 'ring', leadMs, dodgeMs, ease, pause, resetAt, ring });
  scene.qteActive = (scene.qteActive ?? 0) + 1;
  return new Promise((resolve) => {
    const R0 = 38, RT = 10;
    const color = ring === 'red' ? 0xff4040 : ring === 'purple' ? 0xc070ff : 0xfff096;
    const g = scene.add.graphics().setDepth(30);
    const msg = ring === 'red' ? lp("RED: CAN'T DODGE - BLOCK!", 'RED: BLOCK IT!') : ring === 'purple' ? lp("PURPLE: CAN'T BLOCK - DODGE!", 'PURPLE: DODGE IT!')
      : lp('TAP WHEN THE RINGS MEET!', 'TAP WHEN RINGS MEET!');
    const hint = text(scene, W / 2, hintY(), msg, { origin: 0.5, color: ring ? (ring === 'red' ? '#ff6060' : '#d090ff') : '#f0ecdc' }).setDepth(31);
    // "!" drawn in pixels, symmetric around the ring's center pixel (a font
    // glyph sits off-center in its cell). 3px wide, rows y-6..y+6.
    x = Math.round(x); y = Math.round(y);
    const bang = scene.add.graphics().setDepth(31);
    bang.fillStyle(0x0c0e12).fillRect(x - 2, y - 7, 5, 10).fillRect(x - 2, y + 3, 5, 5);
    bang.fillStyle(color).fillRect(x - 1, y - 6, 3, 8).fillRect(x - 1, y + 4, 3, 3);
    // Dodge fatigue pips under the target circle (one per perfect dodge in a row, up to 4).
    const pips = Math.min(4, fatigue);
    for (let i = 0; i < pips; i++) {
      const px = x - (pips * 4 - 1) / 2 + i * 4;
      bang.fillStyle(0x0c0e12).fillRect(Math.round(px) - 1, y + 13, 5, 5);
      bang.fillStyle(0xf77622).fillRect(Math.round(px), y + 14, 3, 3);
    }

    // 0..1 progress of the shrink at time t.
    const curve = (k) => (ease === 'in' ? k * k * k : ease === 'out' ? 1 - (1 - k) ** 3 : k);
    const progress = (t) => {
      if (resetAt != null && t < resetAt) return 0.7 * (t / resetAt); // the fake ring gets ~70% in, then restarts
      let a0 = resetAt ?? 0, a = t - a0, span = leadMs - a0;
      if (pause && resetAt == null) {
        span -= pause;
        if (a > pauseAt + pause) a -= pause; else if (a > pauseAt) a = pauseAt;
      }
      return curve(Math.min(1, Math.max(0, a / Math.max(1, span))));
    };

    let t = 0, done = false;
    const draw = () => {
      g.clear();
      const r = Math.max(2, RT + (R0 - RT) * (1 - progress(t)));
      pixelCircle(g, x, y, RT, 0xf0ecdc);
      pixelCircle(g, x, y, RT + 1, 0xf0ecdc, 0.5);
      pixelCircle(g, x, y, r, color);
      pixelCircle(g, x, y, r - 1, color);
    };
    const judge = (d) => {
      const perfect = Math.abs(d) <= dodgeMs, close = Math.abs(d) <= blockMs;
      if (ring === 'purple') return perfect ? 'dodge' : 'hit';
      if (perfect) return noDodge || ring === 'red' ? 'block' : 'dodge';
      return close ? 'block' : 'hit';
    };
    const finish = (res, early = false) => {
      if (done) return;
      done = true;
      scene.qteActive = Math.max(0, scene.qteActive - 1);
      offPress(); offTick();
      hint.setText(early ? 'TOO EARLY!' : res === 'hit' ? 'TOO LATE!' : res === 'dodge' ? 'PERFECT!' : 'NICE!');
      if (early) sfx('early');
      g.clear();
      pixelCircle(g, x, y, RT, res === 'dodge' ? 0x7fe0ff : res === 'block' ? 0x9ab8ff : 0xc8281e);
      scene.time.delayedCall(180, () => { g.destroy(); hint.destroy(); bang.destroy(); });
      resolve(res);
    };
    const offPress = onPress(scene, () => {
      const d = t - leadMs;
      // Pressing during a feint's fake ring, or long before impact, is TOO EARLY (a hit).
      if ((resetAt != null && t < resetAt) || d < -blockMs) finish('hit', true);
      else finish(judge(d));
    });
    const offTick = ticker(scene, (dt) => {
      t += dt;
      if (t > leadMs + blockMs) finish('hit');
      else draw();
    });
    draw();
  });
}
