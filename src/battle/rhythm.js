import { W, lp } from '../config.js';
import { panel } from '../ui/pixel.js';
import { text } from '../ui/font.js';
import { onPress } from '../systems/qte.js';
import { sfx } from '../systems/sfx.js';
import { ting } from '../systems/perfectSfx.js';
import { music } from '../systems/music.js';

// The Apex Strike's rhythm QTE: markers scroll along one track toward a hit line, one per
// beat of the music (its surge layer), and each tap is judged perfect / good / miss
// against the beat. Runs on real time (performance.now) so the slowed scene clock never
// moves the beats. onBeat(i, result) fires as each beat is judged. Resolves with the
// results. window: { perfect, good } in ms either side.
const devHook = (info) => { if (import.meta.env.DEV) window.__qteHook?.(info); };

export function rhythmQte(scene, { beats = 5, lead = 2, window, onBeat = () => {} }) {
  scene.qteActive = (scene.qteActive ?? 0) + 1;
  return new Promise((resolve) => {
    const clock = music.beat() ?? { beatMs: 60000 / 136, next: performance.now() + 120 };
    let first = clock.next + lead * clock.beatMs;
    if (clock.next - performance.now() < 80) first += clock.beatMs; // too close to read the first one
    const times = Array.from({ length: beats }, (_, i) => first + i * clock.beatMs);
    const res = Array(beats).fill(null);
    devHook({ type: 'rhythm', times: times.map((t) => t - performance.now()), beatMs: clock.beatMs, window });

    const BW = lp(150, W - 16), x0 = Math.round(W / 2 - BW / 2), y0 = lp(72, 88), BH = 8, lineX = x0 + 14;
    const step = Math.min(30, (BW - 24) / (lead + 1)); // px per beat
    const g = scene.add.graphics().setDepth(30);
    panel(g, x0 - 4, y0 - 4, BW + 8, BH + 8);
    g.fillStyle(0x121418).fillRect(x0, y0, BW, BH);
    g.fillStyle(0xfff096).fillRect(lineX - 1, y0 - 2, 3, BH + 4);
    const m = scene.add.graphics().setDepth(31);
    const hint = text(scene, W / 2, lp(62, 78), 'TAP ON THE BEAT!', { origin: 0.5, color: '#ffd040' }).setDepth(31);
    let combo = 0, done = false;

    const judge = (i, r) => {
      if (res[i]) return;
      res[i] = r;
      combo = r === 'perfect' ? combo + 1 : 0;
      const label = r === 'perfect' ? (combo > 1 ? `PERFECT x${combo}!` : 'PERFECT!') : r === 'good' ? 'GOOD' : 'MISS';
      hint.setText(label);
      hint.label?.setTint(r === 'perfect' ? 0xffd040 : r === 'good' ? 0xf0ecdc : 0x8a90a0);
      if (r === 'perfect') ting(i + 2); else if (r === 'good') sfx('tick'); else sfx('early');
      onBeat(i, r);
      if (res.every(Boolean)) finish();
    };
    const finish = () => {
      if (done) return;
      done = true;
      scene.qteActive = Math.max(0, scene.qteActive - 1);
      off();
      scene.events.off('update', tick);
      scene.time.delayedCall(120, () => { g.destroy(); m.destroy(); hint.destroy(); });
      resolve(res);
    };
    const press = () => {
      const now = performance.now(), i = res.findIndex((r) => !r);
      if (i < 0) return;
      const d = now - times[i], a = Math.abs(d);
      if (a <= window.perfect) judge(i, 'perfect');
      else if (a <= window.good) judge(i, 'good');
      else if (d < 0 && a <= window.good * 2.5) judge(i, 'miss'); // way early: that beat is lost
    };
    const tick = () => {
      const now = performance.now();
      res.forEach((r, i) => { if (!r && now > times[i] + window.good) judge(i, 'miss'); });
      m.clear();
      times.forEach((t, i) => {
        if (res[i]) return;
        const x = Math.round(lineX + ((t - now) / clock.beatMs) * step);
        if (x > x0 + BW - 3 || x < x0) return;
        const cy = y0 + BH / 2;
        m.fillStyle(0x0c0e12).fillPoints(diamond(x, cy, 5), true);
        m.fillStyle(0xffd040).fillPoints(diamond(x, cy, 4), true);
      });
    };
    const off = onPress(scene, press);
    scene.events.on('update', tick);
    scene.events.once('shutdown', () => { done = true; off(); scene.events.off('update', tick); }); // the scene left mid-QTE
    tick();
  });
}

const diamond = (x, y, r) => [{ x, y: y - r }, { x: x + r, y }, { x, y: y + r }, { x: x - r, y }];
