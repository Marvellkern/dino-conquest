import { TIERS } from '../data/quality.js';
import { GRADES, BLOOM, VIGNETTE } from '../data/lighting.js';
import { render } from './quality.js';

// Post-processing for lit tiers (lighting brief §7): bloom on bright pixels only, a
// per-zone color grade, and a vignette, in one camera post pipeline.
//   1. bright pass: pixels over BLOOM.threshold luminance, into a small buffer
//      (half size on High, quarter on Medium: the class decides, see below)
//   2. two separable gaussian passes on that buffer
//   3. one full-size composite: scene + bloom, then grade, then vignette
// No full-screen blur at full size, nothing that scales with the number of objects.
const BRIGHT = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uThreshold;
varying vec2 outTexCoord;
void main () {
  vec4 c = texture2D(uMainSampler, outTexCoord);
  float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(c.rgb * smoothstep(uThreshold, uThreshold + 0.12, l), 1.0);
}`;

const BLUR = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uStep;
varying vec2 outTexCoord;
void main () {
  vec3 s = texture2D(uMainSampler, outTexCoord).rgb * 0.227;
  s += texture2D(uMainSampler, outTexCoord + uStep * 1.385).rgb * 0.316;
  s += texture2D(uMainSampler, outTexCoord - uStep * 1.385).rgb * 0.316;
  s += texture2D(uMainSampler, outTexCoord + uStep * 3.231).rgb * 0.070;
  s += texture2D(uMainSampler, outTexCoord - uStep * 3.231).rgb * 0.070;
  gl_FragColor = vec4(s, 1.0);
}`;

// Grade: saturation, contrast around mid grey, then split toning (shadows and highlights
// tinted by luminance). Vignette: darken toward the edges, from uVig.x out to the corners.
const COMPOSITE = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uSat;
uniform float uContrast;
uniform vec3 uShadow;
uniform vec3 uHigh;
uniform vec3 uVig; // inner radius, strength, aspect
varying vec2 outTexCoord;
void main () {
  vec3 c = texture2D(uMainSampler, outTexCoord).rgb;
  c += texture2D(uBloom, outTexCoord).rgb * uBloomStrength;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, uSat);
  c = (c - 0.5) * uContrast + 0.5;
  c *= mix(uShadow, uHigh, smoothstep(0.1, 0.8, l));
  vec2 d = (outTexCoord - 0.5) * vec2(uVig.z, 1.0);
  float v = smoothstep(uVig.x, uVig.x + 0.55, length(d));
  c *= 1.0 - v * uVig.y;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

const shaders = [
  { name: 'bright', fragShader: BRIGHT },
  { name: 'blur', fragShader: BLUR },
  { name: 'composite', fragShader: COMPOSITE }
];

function makeClass(scale) {
  return class extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
      super({ game, shaders });
      this.params = { grade: GRADES.none, bloom: BLOOM.strength, vignette: VIGNETTE.normal };
      this.small = [];
    }

    // The two small bloom buffers, sized from the frame (Phaser's RenderTarget ignores its
    // scale argument), rebuilt when the canvas size changes (rotation, a new tier).
    buffers(source) {
      const w = Math.max(1, Math.round(source.width * scale)), h = Math.max(1, Math.round(source.height * scale));
      if (this.small[0]?.width !== w || this.small[0]?.height !== h) {
        for (const t of this.small) t.destroy();
        this.small = [0, 1].map(() => new Phaser.Renderer.WebGL.RenderTarget(this.renderer, w, h, 1, 0, true, false));
      }
      return this.small;
    }

    onDraw(source) {
      const [a, b] = this.buffers(source), [bright, blur, comp] = this.shaders, p = this.params, g = p.grade;
      this.set1f('uThreshold', BLOOM.threshold, bright);
      this.bindAndDraw(source, a, true, true, bright);
      this.set2f('uStep', 1 / a.width, 0, blur);
      this.bindAndDraw(a, b, true, true, blur);
      this.set2f('uStep', 0, 1 / a.height, blur);
      this.bindAndDraw(b, a, true, true, blur);
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, a.texture.webGLTexture);
      this.set1i('uBloom', 1, comp);
      this.set1f('uBloomStrength', p.bloom, comp);
      this.set1f('uSat', g.sat, comp);
      this.set1f('uContrast', g.contrast, comp);
      this.set3f('uShadow', ...g.shadow, comp);
      this.set3f('uHigh', ...g.high, comp);
      this.set3f('uVig', p.vignette.inner, p.vignette.strength, source.width / source.height, comp);
      this.bindAndDraw(source, null, true, true, comp);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      // The bloom was bound to unit 1 behind Phaser's back: every pipeline caches what it
      // thinks each unit holds and skips rebinding, so clear those caches or the next draws
      // (the UI camera) sample an empty unit and come out black.
      for (const pipe of this.renderer.pipelines.pipelines.values()) {
        if (pipe.activeTextures) pipe.activeTextures.length = 0;
        if ('currentNormalMap' in pipe) pipe.currentNormalMap = null; // Light2D keeps its normal map on unit 1 too
      }
    }

    destroy() {
      for (const t of this.small) t.destroy();
      this.small = [];
      return super.destroy();
    }
  };
}

// Bloom buffer size per tier: High half, Medium quarter.
const POST = { 0.5: 'PostHalf', 0.25: 'PostQuarter' };
export function registerPost(game) {
  const pipes = game.renderer?.pipelines;
  if (!pipes?.addPostPipeline) return;
  for (const [scale, name] of Object.entries(POST)) if (!pipes.postPipelineClasses?.has(name)) pipes.addPostPipeline(name, makeClass(+scale));
}

// Put the post pass on a scene's main camera (lit tiers only). zone: whose grade; boss: a
// stronger vignette. Returns the pipeline (or null on Low).
export function applyPost(scene, zone, { boss = false } = {}) {
  const tier = TIERS[render.tier], name = POST[tier.bloom];
  if (!name || scene.renderer.type !== Phaser.WEBGL) return null;
  const cam = scene.cameras.main;
  cam.setPostPipeline(name);
  const pipe = cam.getPostPipeline(name);
  const one = Array.isArray(pipe) ? pipe[0] : pipe;
  if (!one) return null;
  one.params = { grade: GRADES[zone] ?? GRADES.none, bloom: BLOOM.strength, vignette: boss ? VIGNETTE.boss : VIGNETTE.normal };
  splitUi(scene, cam);
  return one;
}

// The UI goes through a second camera without the post pass, so HUD text and buttons don't
// bloom or pick up the grade. Every frame each object is routed by depth: 10 and up is UI
// (HUDs, move bar, QTEs, banners, popups, text), except the spark particles at 19-29, which
// stay in the world so hits still glow. Fades and flashes are mirrored on both cameras.
const isUi = (go) => go.depth >= 10 && !(go.depth >= 19 && go.depth < 30 && go.type !== 'BitmapText' && go.type !== 'Container');

function splitUi(scene, cam) {
  const ui = scene.cameras.add(0, 0, cam.width, cam.height).setOrigin(0, 0).setZoom(cam.zoom);
  for (const fx of ['fadeIn', 'fadeOut', 'fade', 'flash']) {
    const own = cam[fx].bind(cam);
    cam[fx] = (...args) => { ui[fx](...args); return own(...args); };
  }
  const route = () => {
    for (const go of scene.children.list) go.cameraFilter = isUi(go) ? cam.id : ui.id;
  };
  scene.events.on('prerender', route); // right before drawing: catches objects made this frame
  scene.events.once('shutdown', () => scene.events.off('prerender', route));
  route();
}
