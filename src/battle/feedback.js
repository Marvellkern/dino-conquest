import { sfx } from '../systems/sfx.js';

// Hit feedback for one impact. n = index within one QTE (Swarm lands 3):
// labels show once and damage numbers fan out so they don't stack.
export function hitFeedback(scene, att, dfd, dmg, qte, defend, n = 0) {
  const fx = scene.fx, rig = dfd.rig, p = rig.hitPoint(), dir = att.rig.homeFacing;
  const nx = p.x + [0, -10, 10][n % 3];
  const pop = (...args) => n === 0 && fx.pop(...args);
  const num = (y, v, o) => fx.number(nx, y, v, o);

  if (defend === 'dodge') {
    pop(p.x, p.y - 12, 'DODGE!', '#7fe0ff');
    if (n === 0) { sfx('dodge'); fx.hitstop(50); dodgeHop(scene, rig, dir); }
    return;
  }

  rig.flash(50);
  knock(scene, rig, dir, qte === 'crit' ? 5 : 2);
  if (qte === 'crit') {
    fx.hitstop(70);
    fx.shake(4, 240);
    fx.impactStar(p.x, p.y);
    fx.sparks(p.x, p.y, { count: 16, dir, big: true });
    num(p.y - 16, dmg, { crit: true });
    pop(p.x, p.y - 38, 'CRIT!', '#fff096');
    sfx('crit');
  } else if (defend === 'block') {
    fx.shake(2, 120);
    fx.sparks(p.x, p.y, { count: 4, dir });
    num(p.y - 16, dmg, { color: '#9ab8ff' });
    pop(p.x, p.y - 28, 'BLOCK', '#9ab8ff');
    sfx('block');
  } else if (qte === 'miss') {
    fx.shake(1, 80);
    fx.sparks(p.x, p.y, { count: 3, dir });
    num(p.y - 16, dmg, { color: '#8a90a0' });
    pop(p.x, p.y - 28, 'WEAK', '#8a90a0');
    sfx('weak');
  } else {
    fx.shake(2, 140);
    fx.sparks(p.x, p.y, { count: 8, dir });
    num(p.y - 16, dmg);
    sfx('hit');
  }
}

// Trait triggers (venom applied, bloodlust heal).
export function traitFeedback(scene, att, dfd, t) {
  const p = dfd.rig.hitPoint();
  if (t.poisoned) scene.fx.pop(p.x, p.y - 48, 'POISONED', '#80d060', 1, 800);
  if (t.healed) {
    const a = att.rig.top();
    scene.fx.number(a.x, a.y, `+${t.healed}`, { color: '#80d060' });
  }
}

function knock(scene, rig, dir, px) {
  scene.tweens.add({
    targets: rig.c, x: rig.homeX + dir * px, duration: 60, yoyo: true, ease: 'Quad.Out',
    onComplete: () => { rig.x = rig.homeX; }
  });
}

function dodgeHop(scene, rig, dir) {
  rig.stopIdle();
  rig.ghost(0.5, 200);
  scene.tweens.add({
    targets: rig.c, x: rig.homeX + dir * 14, y: rig.homeY - 6, duration: 90, ease: 'Quad.Out',
    onComplete: () => scene.tweens.add({
      targets: rig.c, x: rig.homeX, y: rig.homeY, duration: 160, delay: 120, ease: 'Quad.In',
      onComplete: () => rig.startIdle()
    })
  });
}
