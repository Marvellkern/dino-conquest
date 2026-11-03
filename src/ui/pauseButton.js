import { panel } from './pixel.js';

// The small "II" pause button (Battle, Map). Esc or P does the same.
// can(): whether the scene allows a pause right now (else onDeny). Returns { destroy }.
export function pauseButton(scene, x, y, { can = () => true, onDeny = null } = {}) {
  const S = 12, g = scene.add.graphics().setDepth(11).setScrollFactor(0);
  const draw = (hover) => {
    g.clear();
    panel(g, x, y, S, S);
    g.fillStyle(hover ? 0xfff096 : 0xc0cbdc).fillRect(x + 4, y + 3, 1, 6).fillRect(x + 7, y + 3, 1, 6);
  };
  draw(false);
  const zone = scene.add.zone(x - 2, y - 2, S + 4, S + 4).setOrigin(0).setDepth(12).setScrollFactor(0).setInteractive({ useHandCursor: true });
  const open = () => {
    if (scene.scene.isPaused() || scene.scene.isActive('Pause')) return;
    if (!can()) { onDeny?.(); return; }
    scene.scene.launch('Pause', { from: scene.scene.key });
  };
  zone.on('pointerover', () => draw(true));
  zone.on('pointerout', () => draw(false));
  zone.on('pointerdown', (p, lx, ly, ev) => { ev?.stopPropagation?.(); open(); });
  const key = (e) => { if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyP')) open(); };
  scene.input.keyboard?.on('keydown', key);
  scene.events.once('shutdown', () => scene.input.keyboard?.off('keydown', key));
  return { destroy: () => { g.destroy(); zone.destroy(); }, open };
}
