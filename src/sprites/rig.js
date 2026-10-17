import { FILL_MAX } from './rexParts.js';

// A rig is a container of grid-textured parts, anchored at feet-center.
// Units for poses are grid pixels; the rig is drawn at integer `scale`.
// facing: 1 = right (player), -1 = left (enemy, mirrored).
class Rig {
  constructor(scene, x, y, { w, h, facing = 1, scale = 2 }) {
    this.scene = scene;
    this.w = w;
    this.h = h;
    this.scale = scale;
    this.homeX = x;
    this.homeY = y;
    this.homeFacing = facing;
    this.facing = facing;
    this.ox = -Math.floor(w / 2);
    this.oy = -h;
    this.flashOn = false;
    this.parts = [];
    this.c = scene.add.container(x, y).setDepth(5).setScale(scale * facing, scale);
  }

  part(key) {
    const img = this.scene.add.image(0, 0, key).setOrigin(0);
    img.baseKey = key;
    this.c.add(img);
    this.parts.push(img);
    return img;
  }

  put(img, dx = 0, dy = 0) { img.setPosition(this.ox + dx, this.oy + dy); }

  setBase(img, key) {
    img.baseKey = key;
    img.setTexture(this.flashOn ? `${key}_flash` : key);
  }

  get x() { return this.c.x; }
  set x(v) { this.c.x = v; }
  get y() { return this.c.y; }
  set y(v) { this.c.y = v; }
  get halfW() { return Math.floor(this.w / 2) * this.scale; }

  setFacing(f) {
    this.facing = f;
    this.c.scaleX = this.scale * f;
  }

  // World position of grid pixel (gx, gy) in the current facing.
  at(gx, gy) {
    return {
      x: Math.round(this.c.x + (this.ox + gx) * this.scale * this.facing),
      y: Math.round(this.c.y + (this.oy + gy) * this.scale)
    };
  }
  hitPoint() { return this.at(Math.round(this.w * 0.7), Math.round(this.h * 0.35)); }
  center() { return this.at(Math.round(this.w * 0.45), Math.round(this.h * 0.5)); }
  top() { return this.at(Math.round(this.w * 0.75), -4); }

  setFlash(on) {
    this.flashOn = on;
    for (const p of this.parts) p.setTexture(on ? `${p.baseKey}_flash` : p.baseKey);
  }

  flash(ms = 50) {
    this.setFlash(true);
    this.scene.time.delayedCall(ms, () => this.c.active && this.setFlash(false));
  }

  // Fading afterimage of the current pose (motion smear).
  ghost(alpha = 0.4, ms = 140) {
    for (const p of this.parts) {
      if (!p.visible) continue;
      const g = this.scene.add
        .image(this.c.x + p.x * this.c.scaleX, this.c.y + p.y * this.c.scaleY, p.texture.key)
        .setOrigin(0).setScale(this.c.scaleX, this.c.scaleY)
        .setAlpha(alpha).setTint(0x9fd8ff).setDepth(4);
      this.scene.tweens.add({ targets: g, alpha: 0, duration: ms, onComplete: () => g.destroy() });
    }
  }

  // Idle breathing: 1px bob on a timer (stepped, never sub-pixel).
  startIdle() {
    this.stopIdle();
    let up = false;
    this.idle = this.scene.time.addEvent({
      delay: 380, loop: true,
      callback: () => { up = !up; this.c.y = this.homeY - (up ? 1 : 0); }
    });
  }

  stopIdle() {
    this.idle?.remove();
    this.idle = null;
    this.c.y = this.homeY;
  }
}

// T-rex: part-offset rig (brief §4.3).
export class RexRig extends Rig {
  constructor(scene, x, y, facing, key = 'rex', scale = 2) {
    const src = scene.textures.get(`${key}_legs`).getSourceImage(); // evolved forms are bigger
    super(scene, x, y, { w: src.width, h: src.height, facing, scale });
    this.key = key;
    this.legs = this.part(`${key}_legs`);
    this.body = this.part(`${key}_body`);
    this.jaw = this.part(`${key}_jaw`);
    this.fill = this.part(`${key}_fill1`);
    this.skull = this.part(`${key}_skull`);
    this.roarPose = { body: -2, hx: -1, hy: -2, gap: 4 };
    this.setPose({});
  }

  setPose({ body = 0, hx = 0, hy = 0, gap = 0 } = {}) {
    this.pose = { body, hx, hy, gap };
    this.put(this.legs);
    this.put(this.body, body, 0);
    this.put(this.jaw, hx, hy);
    this.put(this.skull, hx, hy - gap);
    const g = Math.min(gap, FILL_MAX);
    this.fill.setVisible(g > 0);
    if (g > 0) {
      this.setBase(this.fill, `${this.key}_fill${g}`);
      this.put(this.fill, hx, hy);
    }
  }

  mouth() { return this.at(this.w - 2 + this.pose.hx, 7 + this.pose.hy); }
}

// Everyone else: whole sprite + a pre-built crouch texture.
export class SpriteRig extends Rig {
  constructor(scene, x, y, facing, key, w, h, scale = 2) {
    super(scene, x, y, { w, h, facing, scale });
    this.key = key;
    this.img = this.part(key);
    this.roarPose = { dy: -1 };
    this.setPose({});
  }

  setPose({ dx = 0, dy = 0, crouch = false } = {}) {
    this.pose = { dx, dy, crouch };
    this.setBase(this.img, crouch ? `${this.key}_crouch` : this.key);
    this.put(this.img, dx, dy);
  }

  mouth() { return this.at(this.w - 2, 4 + this.pose.dy); }
}

// skin: texture key to draw with (e.g. 'raptor_e1', 'alpharex'); defaults to the species.
export function createRig(scene, species, x, y, facing, skin = species, scale = 2) {
  if (species === 'rex') return new RexRig(scene, x, y, facing, skin, scale);
  const src = scene.textures.get(skin).getSourceImage();
  return new SpriteRig(scene, x, y, facing, skin, src.width, src.height, scale);
}
