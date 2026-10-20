import { W, lp } from '../config.js';
import { QTE, MUDDY, BLIND } from '../data/moves.js';
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
export function attackBar(scene, { rng, sure = false, muddy = false, blind = false, shape = null } = {}) {
  const sh = shape ?? { sweepMs: QTE.sweepMs, center: rng.range(0.55, 0.85), curve: 'linear', drift: null, sweetW: QTE.sweetW, goodW: QTE.goodW };
  const sweepMs = sh.sweepMs;
  const sweetW = Math.max(2, Math.round(sh.sweetW * (muddy ? MUDDY.sweet : 1))), goodW = Math.round(sh.goodW * (muddy ? MUDDY.good : 1));
  scene.qteActive = (scene.qteActive ?? 0) + 1; // extras (lightning) wait while a QTE is open
  return new Promise((resolve) => {
    const BW = 100, BH = 6, x0 = Math.round(W / 2 - BW / 2), y0 = barY();
    // Marker progress 0..1 at time t (wave: fast-slow-fast-slow; ease: slow-fast-slow).
    const curve = (k) => (sh.curve === 'wave' ? k - (0.55 * Math.sin(4 * Math.PI * k)) / (4 * Math.PI)
      : sh.curve === 'ease' ? k * k * (3 - 2 * k) : k);
    const pos = (t) => Math.min(BW - 2, Math.round(curve(Math.min(1, t / sweepMs)) * (BW - 2)));
    const centerAt = (t) => {
      const k = sh.drift ? sh.center + sh.drift.amp * Math.sin((t / sh.drift.period) * Math.PI * 2 + sh.drift.phase) : sh.center;
      return Math.round(Math.min(0.92, Math.max(0.12, k)) * BW);
    };
    // Dev hook: the press time that lands dead center (scanned, so it works for curves and drift).
    let bestMs = 0, bestD = Infinity;
    for (let t = 61; t < sweepMs; t += 4) { const d = Math.abs(pos(t) + 1 - centerAt(t)); if (d < bestD) { bestD = d; bestMs = t; } }
    devHook({ type: 'bar', sweepMs, center: centerAt(0), width: BW, muddy, blind, curve: sh.curve, drift: !!sh.drift, bestMs });

    const g = scene.add.graphics().setDepth(30);
    const zone = scene.add.graphics().setDepth(30);
    panel(g, x0 - 4, y0 - 4, BW + 8, BH + 8);
    g.fillStyle(0x121418).fillRect(x0, y0, BW, BH);
    const drawZone = (c) => {
      zone.clear();
      zone.fillStyle(muddy ? 0x5a5030 : 0x3e7a3a).fillRect(x0 + c - goodW / 2, y0, goodW, BH);
      zone.fillStyle(0xfff096).fillRect(x0 + c - sweetW / 2, y0, sweetW, BH);
      if (sh.drift) zone.fillStyle(0xffffff).fillRect(x0 + c, y0 - 2, 1, 1).fillRect(x0 + c, y0 + BH + 1, 1, 1); // sway markers
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

    let t = 0, done = false;
    const draw = () => {
      drawZone(centerAt(t));
      const px = pos(t);
      m.clear();
      m.fillStyle(0x0c0e12).fillRect(x0 + px - 1, y0 - 3, 4, BH + 6);
      m.fillStyle(0xffffff).fillRect(x0 + px, y0 - 2, 2, BH + 4);
    };
    const judge = (px) => {
      if (px == null) return sure ? 'good' : 'miss';
      const d = Math.abs(px + 1 - centerAt(t));
      if (d <= sweetW / 2) return 'crit';
      if (d <= goodW / 2 || sure) return 'good';
      return 'miss';
    };
    const finish = (res) => {
      if (done) return;
      done = true;
      scene.qteActive = Math.max(0, scene.qteActive - 1);
      offPress(); offTick();
      hint.setText(res === 'crit' ? 'CRIT!' : res === 'good' ? 'GOOD' : 'MISS');
      hint.label.setTint(res === 'crit' ? 0xfff096 : res === 'good' ? 0xf0ecdc : 0x8a90a0);
      if (res === 'crit') g.fillStyle(0xffffff).fillRect(x0, y0, BW, BH);
      sfx(res === 'crit' ? (scene.flow ? null : 'ding') : res === 'good' ? 'tick' : 'early'); // battles ring their own crit (battle/flow.js)
      cover.clear();
      scene.time.delayedCall(260, () => { g.destroy(); zone.destroy(); m.destroy(); cover.destroy(); hint.destroy(); });
      resolve(res);
    };
    const offPress = onPress(scene, () => { if (t > 60) finish(judge(pos(t))); });
    const offTick = ticker(scene, (dt) => {
      t += dt;
      if (t >= sweepMs) finish(judge(null));
      else draw();
    });
    draw();
  });
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
