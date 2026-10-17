# Dino-Conquest — Game Brief for Claude Code

> **Note to the AI reading this:** Read this whole file before writing any code. Decisions marked **(your call)** are yours to make — don't ask about them. Ask only if you are truly blocked. Never invent content where a `[PLACEHOLDER]` sits. Build in the order given in §12 and stop after each milestone so I can play-test.

---

## 1. One-line pitch

A fast, turn-based **pixel-art dinosaur roguelike** for the browser: hatch a random dino, fight through prehistoric zones with **timing-based attacks and dodges**, evolve mid-run, and when you die your dino leaves a **fossil** that makes the next generation stronger.

Game name: **Dino-Conquest** (final).

## 2. Context

- I'm Marvell, a video editor building personal games with Claude. This is a hobby project I may post on Reddit / short-form socials later, so **game feel** (hit flash, screen shake, snappy timing) matters more than content volume.
- Structural inspiration: the Roblox game *Pixel Lineage* (turn-based roguelike, race/talent spins, QTE attack/dodge, lives). **Borrow the structure only.** Do not copy its names, UI layout, art, text, or any assets.
- Platform: desktop browser first, must also be playable on a phone (tap controls).

## 3. Tech stack (fixed)

| Thing | Choice |
|---|---|
| Engine | **Phaser 3** (latest 3.x) |
| Build | **Vite**, plain **JavaScript** (ES modules) — TypeScript is fine if you prefer **(your call)** |
| Rendering | `pixelArt: true`, integer scaling, no smoothing |
| Base resolution | **320 × 180**, scaled up to fit window (letterboxed) |
| Save | `localStorage`, wrapped in try/catch, versioned save object |
| Deploy | Static build, deployable to **Vercel** with zero config |
| Audio | Optional for MVP; if added, generate simple SFX with WebAudio (no downloaded files) |

No backend. No accounts. No external asset downloads.

## 4. Art: code-generated pixel sprites (important)

All dino sprites are **defined as character grids in code** and rendered to Phaser textures at boot (`scene.textures.createCanvas` or `generateTexture`). This keeps every dino editable as text and makes adding species cheap.

### 4.1 Palette (keys are single characters)

```js
export const PAL = {
  O: '#1c2018', // outline
  G: '#5ca048', // rex green
  D: '#3a6e34', // rex dark green (shade)
  L: '#c4d68c', // rex belly
  W: '#f0ecdc', // teeth / claws
  E: '#c8281e', // eye
  M: '#961e28', // mouth interior
  R: '#cd803e', // raptor orange
  B: '#96562a', // raptor dark
  K: '#6e3a1e', // raptor stripes
  C: '#eccea0', // raptor belly
  S: '#fff096', // impact spark
  '.': null      // transparent
};
```

### 4.2 Reference sprites (use exactly, both face RIGHT; mirror enemies to face LEFT)

**T-rex — 32×26**
```
..................OOOOOOOOOO....
.................OGGGGGGGGGGO...
................OGGGGGGGGOOGGO..
................OGGGGGGGGOEGGGO.
................OGGGGGGGGGGGGGGO
................ODGGGGGGGGGGGGGO
................ODGGGGGOWOWOWOWO
...............ODGGGGGOOOOOOOOO.
...............OGGGGGLLWOWOWO...
..............ODGGGGGLLOOOOO....
............OODGGGGGGLLO........
..........OODGGGGGGGGLLLOO......
........OODDGGGGGGGGGLLLOGO.....
......OODDGGGGGGGGGGGLLLOGGO....
....OODDGGGGGGGGGGGGGLLLLOOGO...
..OODDGGGGGGGGGGGGGGGLLLLO.O....
OODDDGGGGGGGGGGGGGGGLLLLO.......
OOOOODDGGGGGGGGGGGGLLLLO........
.....OOOODDGGGGGGGGGLLO.........
.........OODGGGGOODGGGO.........
..........ODGGGO.ODGGGO.........
..........ODGGO..ODGGO..........
..........ODGGO...ODGGO.........
.........ODGGGO...ODGGGO........
........OGGOGGO..OGGOGGO........
........OOOOOOO..OOOOOOO........
```

**Raptor — 25×20**
```
.................OOOOO...
................ORRRRRO..
...............ORRROERRO.
...............ORRRRRRRRO
..............ORRRRWOWOWO
..............ORRRROOOOO.
.............ORRRCO......
............ORRRRCO......
OOO........ORKRRKCCO.....
ORROOO...OORKRRKRCCO.....
.OBRRROOORRKRRKRRCCO.....
..OOBBRRRRRRRRRRCCOOO....
....OOOBBRRRRRRRCCOCRO...
.......OOBBRRRRRCO.OWO...
.........OOBRRORRO..O....
..........OBRO.ORRO......
..........ORO..OBRO......
.........ORRO..ORRO......
.........OWOO.OWORO......
........OOOO..OOOOO......
```

### 4.3 Animation approach

Animate with **part offsets + tweens**, not hand-drawn frames:
- Split the T-rex into parts: **upper skull + upper teeth** (rows 0–6, x ≥ 16), **lower jaw** (rows 7–9, x ≥ 21), **neck/body** (everything else above row 19), **legs** (rows 19+).
- **Jaw open** = move the upper skull up by `gap` px and fill the gap with a green back-of-head column + `M` mouth interior.
- **Lean** = shift neck/body horizontally while legs stay planted.
- **Hit flash** = draw every non-outline pixel white for 1–2 frames (or use a white tint pipeline).
- The raptor can be animated as a whole sprite (crouch = compress top 14 rows down 1px, leap = arc tween).

Proven T-rex bite timing (copy this):

| Frame | Body dx | Head dx | Head dy | Jaw gap | ms | Note |
|---|---|---|---|---|---|---|
| idle | 0 | 0 | 0 | 0 | 180 | |
| windup 1 | −1 | −1 | −1 | 0 | 90 | |
| windup 2 | −2 | −1 | −2 | 1 | 90 | |
| roar | −2 | −1 | −2 | 3 | 110–160 | **attack QTE window opens** |
| lunge | +1 | +2 | 0 | 4 | 50 | |
| SNAP | +3 | +3 | +1 | 0 | 70 | **damage applied**, sparks, screen shake |
| sparks big | +3 | +3 | +1 | 0 | 90 | |
| recover | +2 → +1 → 0 | | | 0 | 90 each | |

Raptor pounce: crouch 120ms → arc leap (2 frames, 70ms) → claw slash (white 2-line slash FX) 60ms → hop back 80ms ×2. **Dodge QTE window = the leap frames.**

### 4.4 Other species

For species not drawn above, **you design new grids in the same style** (your call): same palette approach, 1px dark outline, 1 shade color, light belly, readable silhouette at 1×. Size by weight class: small ~20px tall, medium ~24px, large ~26–32px. Each new species gets its own 3–4 color palette keys.

Backgrounds, UI, and FX are also code-drawn (rects, gradients, simple pixel tiles). Keep it chunky and consistent; no smooth vector art mixed in.

## 5. Core loop

**Hatch → Run through a zone → Evolve → Die or win → Fossil → Next generation stronger**

## 6. Systems

### 6.1 Hatching (run start)
- Player gets an egg → **Species spin** (slot-style reel animation, ~1.5s).
- Rarity odds (base): Common 60% · Rare 28% · Epic 10% · Legendary 2%.
- Then **Trait spin** for 1 trait.
- **Reroll** either spin for Amber (meta currency): species reroll 30 Amber, trait reroll 15 Amber.

### 6.2 MVP species (4)

| Species | Rarity | HP | ATK | DEF | SPD | Special move |
|---|---|---|---|---|---|---|
| Compy | Common | 40 | 8 | 3 | 9 | **Swarm** — summons 2 ghost compies, 3 small hits |
| Raptor | Rare | 55 | 12 | 4 | 8 | **Double Slash** — 2 hits, 2nd hit needs its own QTE |
| Triceratops | Epic | 90 | 10 | 9 | 3 | **Horn Charge** — big hit, +2 DEF for 2 turns |
| T-rex | Legendary | 110 | 16 | 6 | 4 | **Crushing Bite** — huge hit, ignores 50% DEF |

Numbers are a starting point — tune them **(your call)** so a Common can clear zone 1 with decent play.

### 6.3 Traits (MVP: 6)
Thick Hide (−15% damage taken) · Venom Bite (attacks poison 3 dmg/turn, 3 turns) · Bloodlust (heal 20% max HP on kill) · Quick Reflexes (dodge window +40% wider) · Pack Instinct (+20% ATK when below 50% HP) · Thunder Roar (Roar also stuns 1 turn, 25% chance).

### 6.4 Combat (turn-based + timing)
- Turn order by SPD. Side-view arena: player left, enemy right (mirrored).
- Player moves (4 buttons): **Bite** (basic), **Tail Whip** (weaker, can't miss), **Roar** (enemy −25% ATK for 2 turns, 3-turn cooldown), **Special** (species move, 3-turn cooldown).
- **Attack QTE:** a horizontal timing bar with a sliding marker appears during the windup. Sweet spot = crit (×1.75 dmg, big sparks, stronger shake). Good = normal. Miss = ×0.6 dmg.
- **Defend QTE:** when the enemy winds up, a "!" ring shrinks toward a circle. Tap/press at the overlap = **dodge** (0 dmg). Near = **block** (×0.5). Miss = full damage.
- Input: Space / click / tap all trigger the QTE. Buttons are clickable and also mapped to keys 1–4.
- Hit feedback (required): white flash, knockback, screen shake (2–4px), floating damage number, short hitstop (~60ms) on crits.
- Enemies are dinos too, using the same species/move system with simple AI: Special when off cooldown, Roar when its HP > 70% and the player has no debuff, otherwise Bite (**your call** to improve).

### 6.5 The run
- Zone map: ~8 nodes on a small branching path (2–3 lanes, Slay-the-Spire-like), drawn as pixel icons.
- Node types: **Fight**, **Elite** (stronger enemy, better reward), **Nest** (heal 40%), **Fossil Dig** (pick 1 of 3 upgrades: +stat, new trait, move upgrade), **Meteor Shard** (random event: risk/reward), **Boss** (last node).
- XP from fights. **Evolution at level 5 and level 10** (stat jump + slightly bigger/recolored sprite + one move upgrade). For MVP, evolution can be a recolor + scale-up of the same grid **(your call)**.

### 6.6 Lives & Lineage (death)
- **3 lives per run.** Losing a fight costs 1 life and restarts that fight at 50% HP.
- At 0 lives the dino dies → **Fossil screen**: show species, level reached, zone reached, cause of death.
- Each fossil grants a permanent **Lineage bonus** chosen from 3 options (e.g. +5 base HP, +2% Rare odds, start runs with 1 extra reroll). Bonuses stack across fossils, with a reasonable cap **(your call)**.
- Earn **Amber** per run: 5 per fight won, 15 per elite, 50 per boss.

### 6.7 Meta / home screen
- Home: **Hatch** button, Amber count, Lineage bonuses list, **Dino-dex** (silhouettes for undiscovered species, filled in when hatched).
- Settings: SFX on/off, screen shake on/off, reset save (with confirm).

## 7. MVP content

- **Zone 1: Jungle** (8 nodes) with enemies: Compy, Raptor, Triceratops (elite).
- **Boss: Alpha Rex** — T-rex grid recolored darker/red-tinted, 1.5× HP, has a 2-turn charge-up attack with an extra-tight dodge window.
- Later zones (not MVP): Swamp → Volcano → Meteor Crater.

## 8. Screens

1. **Title** — game name in chunky pixel font, the T-rex vs raptor fight looping in the background, "Press to start".
2. **Home / Nest**
3. **Hatch** (species spin → trait spin → reroll options)
4. **Zone map**
5. **Battle**
6. **Fossil Dig / Event / Nest** popups
7. **Evolution** (flash + sprite swap moment — make it feel big)
8. **Death / Fossil** and **Victory** screens

UI style: dark background `#22262e`, pixel panels with 1px outline + 1px inner highlight, pixel font (use a free **bitmap font drawn in code** or a Google pixel font like "Press Start 2P" loaded from Google Fonts — **your call**). Text must be readable at 320×180 scaled.

## 9. Guardrails

- **No copying Pixel Lineage** names, UI, art, or text — structure only. Reason: it's another creator's game and I may post this publicly.
- **No downloaded/third-party sprite assets.** All art generated in code from grids.
- No dark patterns, no fake monetization, no ads.
- Keep pixels crisp: no anti-aliasing, no non-integer scaling of sprites.
- Mobile: buttons ≥ 32px tall in base resolution terms, QTE works by tapping anywhere.
- Don't let a single file grow past ~400 lines; split into modules.

## 10. Suggested file structure (your call to adjust)

```
/src
  main.js
  config.js
  /data      species.js, traits.js, moves.js, zones.js, palette.js
  /sprites   grids.js, renderSprite.js, rexParts.js
  /scenes    Boot, Title, Home, Hatch, Map, Battle, Fossil, Victory
  /systems   combat.js, qte.js, ai.js, save.js, rng.js, fx.js
index.html
```

Use a **seedable RNG** so runs can be replayed/debugged (and later used for daily runs).

## 11. Stretch goals (NOT for MVP)
Zones 2–4 · more species (pachy, ankylo, spino, pterodactyl, mosasaur boss) · daily seeded run · sound/music · share-a-run GIF/screenshot · leaderboard.

## 12. Build order (stop and report after each)

1. **Skeleton:** Vite + Phaser, scaling, sprite-from-grid renderer, show the T-rex and mirrored raptor on screen.
2. **Battle prototype:** one fight (player rex vs enemy raptor), all 4 moves, attack + defend QTE, full hit feedback, the T-rex bite animation from §4.3.
3. **Hatch + species/traits:** spins, rerolls, the 4 species with stats and specials.
4. **Run structure:** zone map, node types, XP, evolution, boss.
5. **Lives, fossils, Amber, save/load, home screen, Dino-dex.**
6. **Polish:** title screen loop, transitions, settings, mobile tap check, balance pass.

## 13. Deliverables & done

- Runnable project: `npm install && npm run dev`; `npm run build` produces a static `dist/` deployable to Vercel.
- Short README: how to run, where to tweak numbers (data files), how to add a new species grid.

**Done checklist (verify before replying each milestone):**
- [ ] Sprites render crisp at all window sizes, no blur
- [ ] Enemies face left, player faces right
- [ ] Both QTEs work with keyboard, mouse, and touch
- [ ] Crit / dodge feel noticeably different from normal hits
- [ ] A full run (hatch → zone → boss or death → fossil) works without errors
- [ ] Refreshing the page keeps Amber, fossils, and Dino-dex
- [ ] No console errors
