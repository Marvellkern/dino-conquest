# Dino-Conquest v2 — Revamp Brief for Claude Code

> **Note to the AI reading this:** This is a revamp of an EXISTING, working game (Phaser 3.90 + Vite, deployed at dino-conquest-five.vercel.app). Read this whole file and the current codebase before changing anything. Keep what works (sprite-from-grid renderer, T-rex part animation, QTE bar/ring, hit flash, screen shake, WebAudio SFX, localStorage save). Decisions marked **(your call)** are yours. Ask only if truly blocked. Work in the phase order in §9 and **stop after each phase** so I can play-test.

---

## 1. The problem (play-test findings)

The game works but it isn't fun to replay. Three issues share one cause: **the game hands out numbers instead of choices.**

| Problem | Cause in current build |
|---|---|
| **No point playing** | Lineage bonuses are tiny flat stats (+5 HP, +1 ATK, +2% rare). Nothing unlocked changes *how* you play. Only 7 species / 2 zones, so the Dino-dex fills fast. |
| **Repetitive** | Every dino has Bite / Tail Whip / Roar + 1 special. Optimal play = "special when off cooldown, else Bite". Enemy AI is the same pattern. Fossil Dig = +2 stat. Evolution = recolor + "II". |
| **Mediocre art** | ~60% of the battle screen is flat green bands + identical rectangle trees. Dinos are small (2×) in the bottom third. Everything is the same dark muddy green; dinos don't pop. Generic grey UI boxes. Almost nothing moves. |

**Goal of v2:** every turn has a real decision, every run feels different, every run unlocks something new, and the screen looks alive.

---

## 2. Combat revamp (Phase 1 — highest priority)

### 2.1 Enemy intent (the core fix)
- Above every enemy, show an **intent icon + number** for its NEXT action, decided at the start of the player's turn:
  - 🦷 Attack `12` · 🦷×3 Multi-hit `4×3` · 🛡 Defend · ⬇ Debuff · ⚡ Charging (big hit next turn) · 💤 Stunned
- Draw icons as small pixel grids (8×8 or 10×10) like the existing `heart`/`icon_*` sprites.
- Intent must be **honest** (what it shows is what it does), modified only by player effects (e.g. Roar lowers the shown number live).
- This makes Roar, defending, and "kill it before it charges" real decisions.

### 2.2 Energy instead of cooldowns
- Player has **Energy: max 3, +2 per turn** (carry over up to max). Show as 3 pixel pips under the HP bar.
- Move costs: Bite 1 · Tail Whip 1 · Roar 1 · **Brace** (new, 1: block 50% of next hit + guaranteed "block" on a missed QTE) · Special 2–3.
- Player can do **multiple actions per turn** while energy lasts, then press **END TURN** (key `E` / button). This creates combos and "spend now vs save" choices.
- Remove move cooldowns for the player (enemies can keep simple cooldowns internally).

### 2.3 Enemy gimmicks (each enemy must play differently)
| Enemy | Gimmick |
|---|---|
| **Compy** | Spawns as a **pack of 3** small compies (low HP each). Multi-hit and AoE moves shine here. |
| **Raptor** | **Pounce**: after it dodges/blocks, it gets a free quick attack. Alternates attack/feint (feint = fake windup, pressing early is punished). |
| **Trike** (elite) | **Charge-up**: telegraphs a huge Horn Ram 1 turn ahead. If you don't perfect-dodge, you take big damage. Takes −50% damage while charging. |
| **Pachy** | **Headbutt stun**: if you get "hit" (not block/dodge) you lose 1 energy next turn. |
| **Sarco** | **Submerge**: every 3rd turn goes underwater, untargetable 1 turn, then ambushes with a tighter dodge ring. |
| **Alpha Rex** (boss) | 2 phases. Phase 2 at 50% HP: roars (summons 1 compy), attacks faster, dodge ring shrinks 15% faster. |
| **Bog Spino** (boss) | Floods the arena every 3 turns: player's next attack QTE is "muddy" (narrower sweet spot) unless they Brace. |

Add 1 more enemy per zone **(your call)** following the same rule: one clear, readable gimmick.

### 2.4 Multi-enemy fights
- Support up to 3 enemies. Click/tap an enemy (or `←/→` keys) to target. Show a pixel arrow over the target.
- Fights: 1–3 enemies; elites usually 1 big + 1 small.

### 2.5 Keep & sharpen the QTEs
- Keep attack bar (crit/good/miss) and defend ring (dodge/block/hit).
- **Perfect dodge = free counter** (quick 0.5× Bite, no energy cost). This is huge for game feel.
- **Crit streak**: 3 crits in a row → next attack +50% and gold sparks. Show a small streak counter.
- On a kill: 120ms slow-mo + slight camera zoom (1.05) on the final hit.

---

## 3. Builds: upgrades that change mechanics (Phase 2)

Replace the stat-only Fossil Dig with **Fossils (relics)** and **Move Mutations**.

### 3.1 Fossils (passive relics, collected during a run)
Pick 1 of 3 at Fossil Dig nodes, elites always drop one. Start with ~20, e.g.:
- **Amber Fang** — Crits heal 4 HP.
- **Raptor Claw** — Perfect dodge counter deals 1.0× instead of 0.5×.
- **Tar Pit Stone** — Enemies start each fight with 2 Poison.
- **Volcanic Heart** — +1 max Energy, but take 2 damage at the start of each turn.
- **Pack Totem** — +3 damage per enemy alive.
- **Meteor Chip** — First attack each fight is an automatic crit.
- **Old Egg** — Revive once per run at 30% HP (doesn't cost a life).
- **Thick Skull** — Brace also reflects 30% of blocked damage.
- **Bone Drum** — Roar costs 0 energy.
- **Hunter's Instinct** — Enemies below 30% HP take +25% damage.
Show owned fossils as small icons in a top bar during battle; hover/tap shows the description.

### 3.2 Move Mutations
At level-ups and some events, mutate a move (each move max 1 mutation per run):
- Bite → **Venom Bite** (applies 2 poison) / **Lifesteal Bite** (heal 30% of damage) / **Chain Bite** (on crit, bite again).
- Tail Whip → **Sweep** (hits all enemies) / **Stunning Whip** (crit = stun).
- Roar → **Terror Roar** (enemies skip a charged attack) / **Battle Roar** (+1 energy next turn).
Change the move button label and add a colored pixel badge.

### 3.3 Traits stay, but stack with fossils for synergies
Keep the 6 existing traits. Make sure some fossils combo with them (Venom Bite trait + Tar Pit Stone, Quick Reflexes + Raptor Claw).

### 3.4 Real choices on the map
- Show the **full zone map** with branching paths (keep the current 7-row structure) and make lanes meaningfully different: e.g. a lane with 2 elites + 2 fossils vs a safe lane with nests.
- **Meteor Shard** events: 6+ events, each with 2–3 options with clear tradeoffs (e.g. "Eat the glowing shard: +1 mutation, −15 max HP" vs "Leave it").
- Add a **Shop node** (spend in-run Amber on fossils, healing, or a mutation).

---

## 4. Evolution as a real moment (Phase 2)
- Each species gets **3 forms** with a **new silhouette**, not a recolor. Form 2/3 sprites are larger (+15–25% grid size) with added features: frills, horns, sail, back spikes, scars.
  - Compy → **Swarmlord** (bigger head, spines) → **Compy King** (crest, summons 1 permanent ghost compy)
  - Raptor → **Utahraptor** (feathers on arms/tail) → **Shadow Raptor** (dark palette, red eye trail)
  - Trike → **Torosaurus** (big frill) → **Warhorn** (3 long horns, armor plates)
  - T-Rex → **Tyrant** (scars, bigger skull) → **Alpha Rex** (playable!)
  - Pachy, Sarco, Spino: same pattern **(your call)**.
- Each evolution grants **1 new move or passive** (not just stats).
- Evolution scene: screen dims, white silhouette flicker between old/new forms 6–8 times speeding up, flash, particles, new name slams in. ~2.5s, skippable on tap.

---

## 5. Meta progression that unlocks content (Phase 3)

Replace flat-stat Lineage with **unlocks**. Keep Amber as currency.

### 5.1 The Nest (meta hub)
Spend Amber on **permanent unlocks**, roughly in this order:
| Unlock | Cost |
|---|---|
| New species egg pool (Ankylo, Pteranodon, Stego, Carno — design these) | 60–150 each |
| Zone 3: **Volcano**, Zone 4: **Meteor Crater** (final boss) | 200 / 400 |
| New fossils added to the drop pool (in packs of 4) | 80 per pack |
| Starting choice: pick 1 of 2 eggs instead of a random one | 120 |
| Shop node appears more often | 100 |
Keep 2–3 small stat bonuses max; everything else should be new content.

### 5.2 Bloodline (the "lineage" fantasy)
- When a dino dies or wins, it becomes an **ancestor**. The player picks **1 of its fossils or mutations to inherit** into the next hatchling (start the run with it).
- Show a **family tree** screen (simple vertical line of past dinos with species icon, level, cause of death). This makes deaths feel meaningful instead of a reset.

### 5.3 Goals / quests
A list of ~20 achievements that each unlock something, shown in the Nest:
- "Clear the Jungle with a Common" → unlocks **Golden Egg** (Rare+ guaranteed).
- "Perfect-dodge 10 times in one run" → unlocks Raptor Claw fossil.
- "Defeat Alpha Rex without Bracing" → unlocks playable Alpha Rex skin.
- "Kill 3 compies with one Sweep" → unlocks Pack Totem.
- **(your call)** for the rest. Each must point the player at a different playstyle.

### 5.4 Ascension / heat (replayability ceiling)
After first full clear, unlock **Extinction Levels 1–10**: each adds a modifier (enemies +10% HP, dodge rings faster, fewer nests, elites have 2 gimmicks…). Show the highest level cleared per species in the Dino-dex.

---

## 6. Art direction revamp (Phase 4)

### 6.1 Palette
Lock all art to **Endesga 32** (32-color pixel palette). Remap existing palette keys to the nearest Endesga colors so everything is cohesive. Keep 1px dark outlines on dinos.

### 6.2 Battle composition (320×180 base)
- Dinos at **3× scale** (currently 2×). Player stands at ~x 80, enemies at ~x 220–290. Ground line at y ≈ 132.
- Soft **drop shadow** ellipse (2–3px tall, 40% black) under every dino.
- **Foreground layer**: ferns/grass tufts that overlap the dinos' feet (depth above dinos), slightly darker.
- **UI panel** for moves stays at the bottom but slimmer (y 148–180), with icons.

### 6.3 Zone backgrounds: 4 parallax layers each, with idle motion
| Zone | Sky / light | Far | Mid | Near / FG | Ambient |
|---|---|---|---|---|---|
| **Jungle** | Warm golden-green, sun haze top-left | Distant volcano silhouette | Big trees with rounded canopy clumps + hanging vines | Giant ferns, flowers | Falling leaves, fireflies, light shafts |
| **Swamp** | Sickly teal/olive fog | Dead tree silhouettes | Mangrove roots, reeds | Lily pads on murky water with reflections | Bubbles, drifting mist bands, dragonflies |
| **Volcano** | Red-orange, smoky | Erupting volcano with glow | Black rock spires, lava falls | Cracked ground with glowing lava cracks | Embers rising, ash, heat shimmer |
| **Meteor Crater** | Purple night, giant meteor in sky growing per node | Crater rim | Crystal formations (glowing) | Scorched ground | Falling sparks, pulsing crystal light |
- Layers drift slightly (1–3px sine sway) and shift with a tiny parallax during attack lunges.
- Pre-render each layer to a texture once per scene (performance).

### 6.4 UI style
- Replace grey boxes with **stone panels**: dark stone fill, 1px light top edge, 1px dark bottom edge, small bone/rivet corners.
- Move buttons get **8×8 icons** (tooth, tail, sound waves, shield, species icon) + energy cost pips.
- Rarity colors stay (common grey, rare blue, epic purple, legendary gold), but add a matching glow/border on cards.
- Damage numbers: bigger (2× pixel font), crits in gold with a 1-frame white flash and slight upward arc.
- Titles: the existing pixel font with a 2px dark drop shadow + 1px highlight.

### 6.5 Juice checklist
- [ ] Hitstop 60ms on hits, 120ms on crits
- [ ] Camera shake scaled by damage (keep the setting toggle)
- [ ] Dust puffs when dinos land/lunge
- [ ] Blood-free impact particles (sparks, leaves knocked off ferns)
- [ ] Enemy death: flash white ×3, then dissolve into pixels falling down
- [ ] Screen transitions ≤ 400ms (current fades feel too slow)
- [ ] Hatch reel ≤ 1.5s total, tap to skip

---

## 7. Content targets for v2

| Thing | v1 | v2 target |
|---|---|---|
| Playable species | 7 | 11 (+Ankylo, Pteranodon, Stego, Carno) |
| Forms per species | recolor ×3 | 3 distinct silhouettes |
| Zones | 2 | 4 (+Volcano, Meteor Crater) |
| Enemy types | ~6 | 12+ (each with a gimmick) |
| Bosses | 2 | 4 (each with 2 phases) |
| Fossils (relics) | 0 | 30 |
| Move mutations | 0 | 2 per base move |
| Meteor events | 3 | 10+ |
| Goals/unlocks | 0 | 20 |

---

## 8. Guardrails
- **Don't break saves.** Bump save version to `v:2` and migrate v1 saves (convert old lineage counts into a small amount of Amber; keep Dino-dex).
- No copying Pixel Lineage or Slay the Spire names/UI/art. Structure ideas only.
- No downloaded art assets. All sprites, icons, and backgrounds stay code-drawn.
- Keep pixels crisp (integer scaling, no smoothing).
- Mobile: everything playable by tapping; targets ≥ 24px in base resolution.
- Keep files under ~400 lines; data (enemies, fossils, events, goals) in `/src/data`.
- Balance: a decent player should clear Jungle on run 1–3, Swamp around run 4–8, the full game around run 15–25.

---

## 9. Build order (stop after each phase for play-testing)

1. **Phase 1 — Combat:** enemy intent, energy + END TURN, Brace, perfect-dodge counter, crit streak, multi-enemy targeting, gimmicks for all existing enemies + both bosses.
2. **Phase 2 — Builds:** fossils (relics) system + 20 fossils, move mutations, reworked Meteor events, Shop node, distinct-silhouette evolutions for existing 7 species with the evolution scene.
3. **Phase 3 — Meta:** Nest unlock shop, Bloodline inheritance + family tree, 20 goals, Extinction levels, save migration.
4. **Phase 4 — Art:** Endesga 32 remap, 3× dinos, shadows, foreground layer, parallax backgrounds for Jungle + Swamp, stone UI, icons, juice checklist, faster transitions.
5. **Phase 5 — Content:** Volcano + Meteor Crater zones (backgrounds, enemies, bosses), 4 new species, remaining fossils/events.

## 10. Done checklist (each phase)
- [ ] No console errors; v1 save loads without crashing
- [ ] Every enemy's intent is visible and accurate
- [ ] Two runs with different fossils/mutations clearly play differently
- [ ] Every run (win or lose) unlocks or progresses something visible in the Nest
- [ ] Battle screen has no large empty flat areas; something is always moving
- [ ] Works with mouse, keyboard, and touch
- [ ] `npm run build` succeeds and deploys to Vercel
