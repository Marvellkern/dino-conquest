import { TIERS } from '../data/quality.js';
import { BLOOM } from '../data/lighting.js';
import { render } from './quality.js';
import { applyPost } from './post.js';
import { glowTexture } from './atmos.js';

// The lighter lighting for screens outside battle (lighting brief step 6): the post pass
// (grade + vignette, gentler bloom or none) and a soft key-light glow, no Light2D. Medium /
// High only; on Low it does nothing and burst() is a no-op, so the screens look as before.
//   zone   whose grade (data/lighting.js GRADES; 'menu' for Home, Hatch, Evolution)
//   key    { x, y, radius, color, alpha, depth }: an additive glow where the light comes from
//   bloom  false where lots of text sits in the world layer (Home), so it doesn't glow
// Returns { burst(x, y, color, size, ms) }: a bright flare that blooms (hatch, evolution).
export function menuLight(scene, { zone = 'menu', key = null, bloom = true } = {}) {
  const tier = TIERS[render.tier];
  if (!tier.bloom || scene.renderer.type !== Phaser.WEBGL) return { burst() {} };
  applyPost(scene, zone, { bloom: bloom ? BLOOM.strength * 0.8 : 0 });
  const glow = glowTexture(scene), ADD = Phaser.BlendModes.ADD;
  if (key) {
    const k = scene.add.image(key.x, key.y, glow).setDisplaySize(key.radius * 2, key.radius * 2).setTint(key.color)
      .setAlpha(key.alpha).setBlendMode(ADD).setDepth(key.depth ?? 0.5).setScrollFactor(0);
    scene.tweens.add({ targets: k, alpha: key.alpha * 0.7, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
  return {
    burst(x, y, color = 0xfff0c0, size = 160, ms = 600) {
      const b = scene.add.image(x, y, glow).setTint(color).setBlendMode(ADD).setDepth(9).setDisplaySize(size * 0.3, size * 0.3);
      scene.tweens.add({ targets: b, displayWidth: size, displayHeight: size, alpha: 0, duration: ms, ease: 'Quad.Out', onComplete: () => b.destroy() });
    }
  };
}
