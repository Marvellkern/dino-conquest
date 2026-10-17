import { W, GROUND_Y, COLORS } from '../config.js';
import { TRAITS } from '../data/traits.js';
import { REWARDS, ZONES } from '../data/zones.js';
import { RETRY_HP } from '../data/lineage.js';
import { drawZone } from '../ui/backdrop.js';
import { text } from '../ui/font.js';
import { panel } from '../ui/pixel.js';
import { Hud, EnemyMarkers, MoveBar } from '../ui/battleUI.js';
import { RelicBar } from '../ui/relicBar.js';
import { pickRelic, pickMutation } from '../ui/buildPicks.js';
import { RELICS } from '../data/relics.js';
import { MUTATIONS } from '../data/mutations.js';
import { createRig } from '../sprites/rig.js';
import { makeRng, randomSeed } from '../systems/rng.js';
import { makeFighter } from '../systems/combat.js';
import * as B from '../systems/battleState.js';
import { onPress } from '../systems/qte.js';
import { Fx } from '../systems/fx.js';
import { sfx } from '../systems/sfx.js';
import { wait } from '../battle/anims.js';
import { deathAnim, phaseAnim, enterAnim } from '../battle/gimmicks.js';
import { playerMove } from '../battle/playerMoves.js';
import { enemyAction, evadePounce } from '../battle/enemyMoves.js';
import {
  session, playerFighter, enemyFighters, enemyFighter, minionFighter, gainXp, dinoStats, advanceZone, skinOf,
  buildOf
} from '../run/run.js';

const PLAYER_X = 72;

// One fight: the player (left) vs 1–3 enemies (right, mirrored).
// Each round: enemies show intents → the player spends energy → END TURN →
// enemies act. Rules live in systems/battleState.js; this scene animates them.
// In a run: data = { node }. Test mode: URL ?p=raptor&e=compy*,compy*,compy*&z=jungle
// (a trailing * makes a small pack member; e=boss uses the zone boss;
// r=amberFang,oldEgg adds fossils; m=bite:chain,tail:sweep adds mutations).
export class Battle extends Phaser.Scene {
  constructor() { super('Battle'); }

  init(data) {
    this.node = data.node ? session.run?.map.nodes[data.node] : null;
    const q = new URLSearchParams(location.search);
    const t = data.trait ?? q.get('t');
    this.cfg = {
      player: data.player ?? (this.textures.exists(q.get('p')) ? q.get('p') : 'rex'),
      trait: t in TRAITS ? t : null,
      enemies: data.enemies ?? (q.get('e') ?? 'raptor').split(','),
      seed: data.seed ?? randomSeed(),
      zone: data.zone ?? (q.get('z') in ZONES ? q.get('z') : 'jungle'),
      relics: data.relics ?? (q.get('r') ? q.get('r').split(',').filter((r) => r in RELICS) : []),
      mutations: data.mutations ?? Object.fromEntries((q.get('m') ?? '').split(',').filter(Boolean).map((t) => t.split(':'))
        .filter(([mv, id]) => MUTATIONS[mv]?.[id]))
    };
  }

  create() {
    this.rng = makeRng(this.cfg.seed);
    this.fx = new Fx(this);
    this.pending = [];
    this.phases = [];
    this.lastHitBy = null;
    this.planning = false;
    this.cameras.main.fadeIn(200);
    this.zone = this.node ? session.run.zone : this.cfg.zone;
    drawZone(this, this.zone);

    let player, enemies, pSkin, build;
    if (this.node) {
      const run = session.run;
      player = playerFighter(run);
      enemies = enemyFighters(this.node);
      pSkin = skinOf(run.dino.species, run.dino.evo);
      build = buildOf(run);
    } else {
      player = makeFighter(this.cfg.player, { side: 'player', traits: this.cfg.trait ? [this.cfg.trait] : [] });
      enemies = this.cfg.enemies.map((tok) => this.testEnemy(tok));
      build = { relics: new Set(this.cfg.relics), mut: { ...this.cfg.mutations } };
    }
    player.rig = createRig(this, player.species, PLAYER_X, GROUND_Y, 1, pSkin);
    this.st = B.createBattle({ player, enemies: [], rng: this.rng, spawn: (sp) => this.spawn(sp), build });
    this.markers = new EnemyMarkers(this, (e) => this.setTarget(e));
    for (const e of enemies) this.addEnemy(e);
    this.layout(false);
    B.startBattle(this.st);
    this.relicBar = new RelicBar(this, 129, 6, { cols: 7, onInfo: (t) => this.say(t) }).set([...build.relics]);

    this.playerHud = new Hud(this, 'player', this.st);
    this.playerHud.bind(player);
    this.targetHud = new Hud(this, 'enemy');
    this.target = this.st.enemies[0];
    this.bar = new MoveBar(this, this.st, { onDeny: (why) => why && this.say(why) });
    this.msg = text(this, W / 2, 52, '', { origin: 0.5 }).setDepth(12); // row y48-56, below the status tags

    this.onKey = (ev) => {
      if (!this.planning || ev.repeat) return;
      if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight') this.cycleTarget(ev.code === 'ArrowRight' ? 1 : -1);
    };
    this.input.keyboard.on('keydown', this.onKey);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.onKey));
    this.loop();
  }

  testEnemy(tok) {
    const z = ZONES[this.cfg.zone];
    if (tok === 'boss') return enemyFighter({ ...z.boss }, 'boss');
    const small = tok.endsWith('*'), sp = tok.replace('*', '');
    return enemyFighter({ species: sp, level: 1, base: z.enemyBase?.[sp], hp: small ? 0.4 : 1, atk: small ? 0.7 : 1, small }, 'fight');
  }

  update(time, dt) {
    this.fx.update(dt);
    const t = this.currentTarget();
    if (t) this.targetHud.bind(t);
    this.playerHud.update(dt);
    this.targetHud.update(dt);
    this.markers.showIntents = this.planning; // intents are for planning; hide them during actions
    this.markers.update(this.st, this.planning ? t : null, time);
  }

  say(s) { this.msg.setText(s); }

  /* ---------- enemies, layout, targeting ---------- */

  addEnemy(e) {
    e.rig = createRig(this, e.species, W + 60, GROUND_Y, -1, e.skin);
    B.addEnemy(this.st, e);
    this.markers.add(e);
    return e;
  }

  // Line living enemies up on the right, front one closest to the player.
  // skip: a rig that animates its own entrance.
  layout(animate = true, skip = null) {
    const list = B.alive(this.st), gap = 6;
    const total = list.reduce((t, e) => t + e.rig.halfW * 2, 0) + gap * (list.length - 1);
    let x = Math.max(150, 314 - total);
    for (const e of list) {
      e.rig.homeX = Math.round(x + e.rig.halfW);
      x += e.rig.halfW * 2 + gap;
      if (animate && e !== skip) this.tweens.add({ targets: e.rig.c, x: e.rig.homeX, duration: 300, ease: 'Quad.Out' });
    }
  }

  // Boss summons: a small minion joins the fight.
  spawn(species) {
    const lvl = this.st.enemies[0]?.level ?? 1;
    const e = this.addEnemy(minionFighter(this.zone, species, lvl));
    this.layout(true, e);
    this.pending.push(enterAnim(this, e.rig));
    return e;
  }

  currentTarget() {
    const list = B.targetable(this.st);
    if (!list.includes(this.target)) this.target = list[0] ?? null;
    return this.target;
  }

  setTarget(e) {
    if (!this.planning || !B.targetable(this.st).includes(e) || e === this.target) return;
    this.target = e;
    sfx('tick');
  }

  cycleTarget(dir) {
    const list = B.targetable(this.st).sort((a, b) => a.rig.homeX - b.rig.homeX);
    if (!list.length) return;
    const i = list.indexOf(this.currentTarget());
    this.target = list[(i + dir + list.length) % list.length];
    sfx('tick');
  }

  /* ---------- damage aftermath (kills, boss phases) ---------- */

  afterDamage(e, r) {
    if (r.killed) {
      this.fx.killCam();
      this.markers.remove(e);
      this.pending.push(deathAnim(this, e.rig));
    }
    if (r.phase) this.phases.push({ e, ...r.phase });
  }

  // Wait for death animations, then play any boss phase changes.
  async settle() {
    while (this.pending.length || this.phases.length) {
      const anims = this.pending.splice(0);
      await Promise.all(anims);
      for (const ph of this.phases.splice(0)) if (ph.e.hp > 0) await phaseAnim(this, ph.e.rig, ph.line);
    }
    this.layout();
  }

  revivePop() {
    const t = this.st.player.rig.top();
    this.fx.pop(t.x, t.y - 12, 'OLD EGG! REVIVED', '#ffd040', 1, 1200);
    this.fx.sparks(t.x, t.y, { count: 16, big: true, gold: true });
    sfx('levelup');
  }

  streakUp() {
    const t = this.st.player.rig.top();
    this.fx.pop(t.x, t.y - 10, 'POWER UP!', '#ffd040', 1, 900);
    this.fx.sparks(t.x, t.y, { count: 14, big: true, gold: true });
    sfx('ding');
  }

  /* ---------- turn loop ---------- */

  async loop() {
    await this.intro();
    const st = this.st;
    for (let round = 0; ; round++) {
      const t = B.beginPlayerTurn(st);
      if (t.volcanic) {
        const p = st.player.rig.hitPoint();
        this.fx.number(p.x, p.y - 16, t.volcanic, { color: '#ff6040' });
      }
      if (t.revived) this.revivePop();
      if (t.poison) {
        const p = st.player.rig.hitPoint();
        this.fx.number(p.x, p.y - 16, t.poison, { color: '#80d060' });
        st.player.rig.flash(50);
        await wait(this, 400);
      }
      if (B.lost(st)) return this.finish(false);
      if (t.fast) this.fx.pop(PLAYER_X, 70, 'FASTER! +1 ENERGY', '#fff096', 1, 1100);
      if (t.stunned) { this.say('YOU ARE STUNNED!'); await wait(this, 900); }
      else await this.playerTurn(round === 0);
      if (B.won(st)) return this.finish(true);
      if (B.lost(st)) return this.finish(false);

      B.endPlayerTurn(st);
      for (const e of [...B.alive(st)]) {
        if (e.hp <= 0) continue;
        await enemyAction(this, e);
        if (B.lost(st)) return this.finish(false);
        if (B.won(st)) return this.finish(true);
      }
      await this.settle();
      await wait(this, 200);
    }
  }

  async playerTurn(first) {
    const st = this.st;
    this.say(first ? 'SPEND ENERGY, THEN END TURN' : 'YOUR TURN');
    for (;;) {
      if (!B.affordable(st)) { this.say('OUT OF ENERGY'); await wait(this, 450); return; }
      this.planning = true;
      const id = await this.bar.choose();
      this.planning = false;
      if (id === 'end') return;
      const evaders = await playerMove(this, id);
      for (const e of evaders) if (e.hp > 0 && st.player.hp > 0) await evadePounce(this, e);
      if (B.won(st) || B.lost(st)) return;
      this.say(`ENERGY ${st.energy}`);
    }
  }

  async intro() {
    const p = this.st.player.rig;
    p.x = -40;
    const slide = (rig) => new Promise((r) =>
      this.tweens.add({ targets: rig.c, x: rig.homeX, duration: 420, ease: 'Quad.Out', onComplete: r }));
    await Promise.all([slide(p), ...this.st.enemies.map((e) => slide(e.rig))]);
    this.fx.shake(2, 120);
    sfx('step');
    p.startIdle();
    for (const e of this.st.enemies) e.rig.startIdle();
    const boss = this.node?.type === 'boss';
    const t = text(this, W / 2, 84, boss ? 'BOSS!' : 'FIGHT!', { scale: 3, color: boss ? '#ff6040' : COLORS.accent, origin: 0.5 }).setDepth(40);
    sfx(boss ? 'growl' : 'fight');
    if (boss) this.fx.shake(3, 400);
    await wait(this, boss ? 900 : 650);
    t.destroy();
  }

  /* ---------- end of fight ---------- */

  async finish(won) {
    this.planning = false;
    this.say('');
    await this.settle();
    if (!won) await deathAnim(this, this.st.player.rig);
    sfx(won ? 'win' : 'lose');

    if (!this.node) {
      await this.banner(won ? 'VICTORY!' : 'DEFEATED', won, [], 'TAP TO FIGHT AGAIN');
      this.scene.restart({ ...this.cfg, seed: randomSeed() });
      return;
    }

    const run = session.run, d = run.dino, type = this.node.type;
    if (!won) {
      run.lives--;
      if (run.lives > 0) {
        d.hp = Math.max(1, Math.round(dinoStats(d).hp * RETRY_HP));
        await this.banner('DEFEATED', false, [`-1 LIFE  (${run.lives} LEFT)`, 'BACK UP AT 50% HP'], 'TAP TO RETRY');
        this.leave('Battle', { node: this.node.id });
        return;
      }
      d.hp = 0;
      run.cause = this.lastHitBy ?? this.st.enemies[0].name;
      await this.banner('DEFEATED', false, ['NO LIVES LEFT...'], 'TAP TO CONTINUE');
      this.leave('Fossil');
      return;
    }
    d.hp = Math.max(1, this.st.player.hp);
    this.levelBefore = d.level;
    const rw = REWARDS[type];
    run.amber += rw.amber;
    const lines = [`+${rw.xp} XP   +${rw.amber} AMBER`];
    if (gainXp(d, rw.xp)) { lines.push(`LEVEL UP! LV${d.level}`); sfx('levelup'); }
    const next = type === 'boss' ? advanceZone(run) : null;
    const done = type === 'boss' && !next;
    if (d.pendingEvo && !done) lines.push('SOMETHING IS STIRRING...');
    if (next) lines.push(`ONWARD TO THE ${ZONES[next].name}!`);
    const levels = d.level - (this.levelBefore ?? d.level);
    await this.banner(type === 'boss' ? 'ZONE CLEAR!' : 'VICTORY!', true, lines, 'TAP TO CONTINUE');
    if (type === 'elite') await pickRelic(this, run, 'ELITE DROP', ['IT GUARDED A FOSSIL.']);
    for (let i = 0; i < levels; i++) await pickMutation(this, run, { title: 'LEVEL UP: MUTATION' });
    if (done) this.leave('RunEnd', { won: true });
    else this.leave(d.pendingEvo ? 'Evolution' : 'Map');
  }

  async banner(title, won, lines, prompt) {
    const h = 34 + lines.length * 10 + 12;
    const y = Math.round(84 - h / 2);
    panel(this.add.graphics().setDepth(40), 70, y, 180, h);
    text(this, W / 2, y + 14, title, { scale: 2, color: won ? COLORS.accent : '#e06060', origin: 0.5 }).setDepth(41);
    lines.forEach((l, i) => text(this, W / 2, y + 30 + i * 10, l, { origin: [0.5, 0], color: l.startsWith('LEVEL') ? '#7fe0ff' : COLORS.text }).setDepth(41));
    text(this, W / 2, y + h - 10, prompt, { color: COLORS.textDim, origin: 0.5, shadow: false }).setDepth(41);
    await wait(this, 400);
    await new Promise((r) => { const off = onPress(this, () => { off(); r(); }); });
  }

  leave(scene, data) {
    this.cameras.main.fadeOut(200);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene, data));
  }
}
