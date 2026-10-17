import { W, GROUND_Y, COLORS } from '../config.js';
import { MOVES, QTE } from '../data/moves.js';
import { TRAITS } from '../data/traits.js';
import { REWARDS, ZONES } from '../data/zones.js';
import { drawZone } from '../ui/backdrop.js';
import { text } from '../ui/font.js';
import { panel } from '../ui/pixel.js';
import { Hud, MoveButtons } from '../ui/battleUI.js';
import { createRig } from '../sprites/rig.js';
import { makeRng, randomSeed } from '../systems/rng.js';
import {
  makeFighter, startTurn, endTurn, useMove, applyStatus, computeDamage,
  afterHit, roarStuns, roarTurns, dodgeWindow
} from '../systems/combat.js';
import { chooseMove } from '../systems/ai.js';
import { attackBar, defendRing, onPress } from '../systems/qte.js';
import { Fx } from '../systems/fx.js';
import { sfx } from '../systems/sfx.js';
import { animSet, roar, chargeUp, wait } from '../battle/anims.js';
import { hitFeedback, traitFeedback } from '../battle/feedback.js';
import { session, playerFighter, enemyFighter, skinOf, gainXp, dinoStats, advanceZone } from '../run/run.js';
import { RETRY_HP } from '../data/lineage.js';

const PLAYER_X = 72;
const ENEMY_X = 248;

// One fight: player (left, faces right) vs enemy (right, mirrored).
// In a run: data = { node: nodeId }. Test mode (no run): data / URL
// ?p=compy&e=trike&t=venomBite picks the matchup.
export class Battle extends Phaser.Scene {
  constructor() { super('Battle'); }

  init(data) {
    this.node = data.node ? session.run?.map.nodes[data.node] : null;
    const q = new URLSearchParams(location.search);
    const valid = (k) => (k && this.textures.exists(k) ? k : null);
    const t = data.trait ?? q.get('t');
    this.cfg = {
      player: data.player ?? valid(q.get('p')) ?? 'rex',
      trait: t in TRAITS ? t : null,
      enemy: data.enemy ?? valid(q.get('e')) ?? 'raptor',
      seed: data.seed ?? randomSeed(),
      zone: data.zone ?? (q.get('z') in ZONES ? q.get('z') : 'jungle')
    };
  }

  create() {
    this.rng = makeRng(this.cfg.seed);
    this.fx = new Fx(this);
    this.cameras.main.fadeIn(200);
    drawZone(this, this.node ? session.run.zone : this.cfg.zone);

    let pSkin, eSkin;
    if (this.node) {
      const run = session.run, e = this.node.enemy;
      this.player = playerFighter(run);
      this.enemy = enemyFighter(this.node);
      pSkin = skinOf(run.dino.species, run.dino.evo);
      eSkin = e.skin ?? skinOf(e.species, e.evo);
    } else {
      this.player = makeFighter(this.cfg.player, { side: 'player', traits: this.cfg.trait ? [this.cfg.trait] : [] });
      this.enemy = makeFighter(this.cfg.enemy, { side: 'enemy' });
    }
    this.enemy.cd[this.enemy.moves[3]] = 2; // enemy opens with a normal move
    this.player.rig = createRig(this, this.player.species, PLAYER_X, GROUND_Y, 1, pSkin);
    this.enemy.rig = createRig(this, this.enemy.species, ENEMY_X, GROUND_Y, -1, eSkin);

    this.huds = [new Hud(this, this.player, 'player'), new Hud(this, this.enemy, 'enemy')];
    this.buttons = new MoveButtons(this, this.player);
    this.msg = text(this, W / 2, 49, '', { origin: 0.5 }).setDepth(12);

    this.loop();
  }

  update(_, dt) {
    this.fx.update(dt);
    for (const h of this.huds) h.update(dt);
  }

  say(s) { this.msg.setText(s); }

  async loop() {
    await this.intro();
    let side = this.player.spd >= this.enemy.spd ? 'player' : 'enemy';
    for (;;) {
      const [me, foe] = side === 'player' ? [this.player, this.enemy] : [this.enemy, this.player];
      const tick = startTurn(me);
      if (tick.poison) {
        const p = me.rig.hitPoint();
        me.rig.flash(50);
        this.fx.number(p.x, p.y - 16, tick.poison, { color: '#80d060' });
        this.fx.pop(p.x, p.y - 28, 'POISON', '#80d060');
        sfx('weak');
        await wait(this, 500);
        if (me.hp <= 0) return this.finish(me !== this.player);
      }
      if (tick.stunned) {
        this.buttons.draw();
        this.say(`${me.name} IS STUNNED!`);
        const p = me.rig.top();
        this.fx.pop(p.x, p.y, 'ZZZ', '#fff096', 1, 800);
        await wait(this, 800);
        endTurn(me);
        side = side === 'player' ? 'enemy' : 'player';
        continue;
      }
      let id;
      if (side === 'player') {
        this.say('YOUR MOVE');
        id = await this.buttons.choose();
      } else {
        this.buttons.draw();
        this.say(`${me.name}'S TURN`);
        await wait(this, 450);
        id = chooseMove(me, foe, this.rng);
      }
      await this.doMove(me, foe, id);
      endTurn(me);
      if (foe.hp <= 0) return this.finish(me === this.player);
      side = side === 'player' ? 'enemy' : 'player';
      await wait(this, 300);
    }
  }

  async intro() {
    const p = this.player.rig, e = this.enemy.rig;
    p.x = -40;
    e.x = W + 40;
    const slide = (rig) => new Promise((r) =>
      this.tweens.add({ targets: rig.c, x: rig.homeX, duration: 420, ease: 'Quad.Out', onComplete: r }));
    await Promise.all([slide(p), slide(e)]);
    this.fx.shake(2, 120);
    sfx('step');
    p.startIdle();
    e.startIdle();
    const boss = this.node?.type === 'boss';
    const t = text(this, W / 2, 84, boss ? 'BOSS!' : 'FIGHT!', { scale: 3, color: boss ? '#ff6040' : COLORS.accent, origin: 0.5 }).setDepth(40);
    sfx(boss ? 'growl' : 'fight');
    if (boss) this.fx.shake(3, 400);
    await wait(this, boss ? 900 : 650);
    t.destroy();
  }

  async doMove(me, foe, id) {
    const m = MOVES[id];
    me.rig.stopIdle();

    if (m.charge && !me.status.charge) {
      me.status.charge = 1;
      this.say(`${me.name} IS CHARGING UP!`);
      await chargeUp(this, me.rig);
      me.rig.startIdle();
      return;
    }
    me.status.charge = 0;
    useMove(me, id);
    this.say(`${me.name}: ${m.name}!`);

    if (m.status) {
      await roar(this, me.rig, () => {
        applyStatus(foe, { stat: m.effect.stat, turns: roarTurns(me, m) });
        const p = foe.rig.top();
        this.fx.pop(p.x, p.y, 'ATK DOWN', '#e06060', 1, 900);
        if (roarStuns(me, this.rng)) {
          foe.status.stun = 1;
          this.fx.pop(p.x, p.y - 10, 'STUNNED!', '#fff096', 1, 900);
        }
      });
    } else {
      const set = animSet(me.species, m.anim);
      if (set.approach) await set.approach(this, me.rig, foe.rig);
      this.say('');
      const hits = m.hits ?? 1;
      for (let i = 0; i < hits && foe.hp > 0; i++) {
        await set.strike(this, me.rig, foe.rig, this.makeCtx(me, foe, m, i));
      }
      if (m.self) applyStatus(me, m.self, true);
      if (set.retreat) await set.retreat(this, me.rig);
    }

    const r = me.rig;
    r.setPose({});
    r.setFacing(r.homeFacing);
    r.x = r.homeX;
    r.startIdle();
  }

  // Wires one strike to the right QTE and to damage resolution.
  makeCtx(att, dfd, m, i) {
    const isPlayer = att.side === 'player';
    const tight = m.tight ?? 1;
    let p = null, n = 0;
    return {
      isPlayer,
      hit: i,
      open: (leadMs = 0) => {
        if (p) return;
        if (isPlayer) p = attackBar(this, { rng: this.rng, sure: !!m.sure });
        else {
          const c = dfd.rig.center();
          p = defendRing(this, {
            x: c.x, y: c.y, leadMs, noDodge: !!m.sure,
            dodgeMs: dodgeWindow(dfd) * tight, blockMs: QTE.blockMs * (tight < 1 ? 0.8 : 1)
          });
        }
      },
      result: () => p,
      impact: (res) => this.resolveHit(att, dfd, m, isPlayer ? res : 'good', isPlayer ? 'hit' : res, n++)
    };
  }

  resolveHit(att, dfd, m, qte, defend, n) {
    const dmg = computeDamage(att, dfd, m, this.rng, { qte, defend });
    dfd.hp = Math.max(0, dfd.hp - dmg);
    hitFeedback(this, att, dfd, dmg, qte, defend, n);
    traitFeedback(this, att, dfd, afterHit(att, dfd, dmg));
  }

  async finish(won) {
    const rig = (won ? this.enemy : this.player).rig;
    this.say('');
    rig.stopIdle();
    sfx('ko');
    for (let i = 0; i < 6; i++) { rig.c.setVisible(i % 2 === 1); await wait(this, 70); }
    await new Promise((r) => this.tweens.add({ targets: rig.c, alpha: 0, y: rig.homeY + 4, duration: 320, onComplete: r }));
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
      run.cause = this.enemy.name;
      await this.banner('DEFEATED', false, ['NO LIVES LEFT...'], 'TAP TO CONTINUE');
      this.leave('Fossil');
      return;
    }
    d.hp = this.player.hp;
    const rw = REWARDS[type];
    run.amber += rw.amber;
    const lines = [`+${rw.xp} XP   +${rw.amber} AMBER`];
    if (gainXp(d, rw.xp)) { lines.push(`LEVEL UP! LV${d.level}`); sfx('levelup'); }
    const next = type === 'boss' ? advanceZone(run) : null;
    const done = type === 'boss' && !next;
    if (d.pendingEvo && !done) lines.push('SOMETHING IS STIRRING...');
    if (next) lines.push(`ONWARD TO THE ${ZONES[next].name}!`);
    await this.banner(type === 'boss' ? 'ZONE CLEAR!' : 'VICTORY!', true, lines, 'TAP TO CONTINUE');
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
