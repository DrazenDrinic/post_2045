# Post 2045 — Graphics Generation Plan

> **What this is.** A complete, generation-ready map of *every* visual in the game: what it is, what
> it's for, the icon it currently uses, where it appears on screen, and the size it renders at. It is
> written so an SVG-artist agent can read this file alone and produce a themed art set for the whole
> game — and so a second pass can wire that art in.
>
> **Two separate jobs.** (1) **Generate** the SVG set from this plan + the style in `/test`. (2) **Implement**
> — swap emoji for the generated art in the render code. *Implementation happens on its own branch.* This
> document and the generated SVGs are the inputs to that branch; nothing here changes game behaviour.

> **Data freshness.** Counts and icons below were extracted live from `js/data.js` on **2026-10-11**
> (via the same `vm` load that `tools/gen-pricing.js` uses). This **supersedes `VISUAL_MAP.md`**, which
> is stale (it predates recent content: it lists 55 jobs / 72 features / 31 entities / 24 tech; the game
> now has **79 / 93 / 33 / 27**). Treat this file as the source of truth for the art set.

---

## 1. Art direction (locked to `/test`)

The ten studies in `/test/` (`01-salvaged-timber.svg` … `10-overgrown-ruins.svg`, previewed by
`test/index.html`) **are** the house style. Everything we generate must sit beside them without looking
out of place. Read those SVGs before drawing anything.

**The established "Field Collection" style:**

- **Mood:** *Built from what remains.* Oxidized steel, faded canvas, reclaimed timber, a little warmth.
  Hand-worn, post-collapse, hopeful-not-grim. Salvage, don't gleam.
- **Palette (canonical — from `test/index.html` footer):**
  | Role | Hex | Use |
  |------|-----|-----|
  | Ash (base / outline) | `#242c2e` | darkest structure, grounding shadow |
  | Rust (metal / warm accent) | `#a96c49` | corrosion, clay, worn orange-brown |
  | Canvas (gold / highlight) | `#d5b363` | the signature warm gold; labels, light |
  | Sage (organic / growth) | `#86a169` | foliage, cloth, "alive" greens |
  | Water (cool accent) | `#528a9b` | water, glass, sky, cool metal sheen |

  Use tints/shades of these five; introduce a new hue only when an object truly demands it (e.g. a red
  danger glow, radioactive yellow-green). Keep it a *family*, not a rainbow.
- **Harmonize with the in-app UI palette** (`css/styles.css :root`) so art doesn't clash with the live
  game chrome: bg `#0d0f10` / `#15191c` / `#1e2428`, lines `#2b333a`, text `#d5dde2`, muted `#8d99a3`,
  **accent gold `#c9a14a`** (≈ canvas), good `#7fbf5d` (≈ sage), bad `#d35353`, warn `#e2b14b`,
  info/water `#5fa8d3`. Need-bar colors: hp `#d35353`, hunger `#b07a39`, thirst `#5fa8d3`,
  energy `#c9a14a`, happy `#cf6cb0`, safety `#7fbf5d`, morale `#e2b14b`, warmth `#d97a3a`.
- **Technique:** flat-ish shapes with 2–3 tone shading, confident dark outline/edge, soft occlusion
  shadow at the base. No gradients-as-crutch, no photo-real. Think screen-print / woodcut warmth.
- **Format rules (hard constraints — same spirit as the game's "one self-contained file" rule):**
  - Pure SVG. **No external fonts, scripts, images, filters-with-refs, or network assets.** Self-contained.
  - Canvas **`viewBox="0 0 256 256"`**. Transparent background.
  - Must stay legible when scaled **down to 24×24** (that's how most of them render — see §4). Silhouette
    first; detail second. If it's a mystery blob at 24px, it fails.
  - Keep each file small (the `/test` set is ~2.5–3.4 KB). Optimize paths.

**Fidelity tiers** (not everything is a hero illustration):

- **T-ICON — functional glyph (most assets).** Reads instantly at 14–24px on a map tile or in a list
  row. Bold silhouette, minimal interior detail, but still painted in the house style. Resources, map
  features, map entities, need bars, HUD, tabs.
- **T-HERO — showcase illustration.** The `/test` level of detail. Buildings, gear, combat portraits,
  big modal art — things seen at 40–256px. Richer, but same palette/line language.
- **T-TILE — seamless-ish terrain fill.** Biomes: a 24×24 repeatable tile texture + a legend swatch,
  not an object on transparent ground. See §7C.

---

## 2. How graphics are wired today (the swap surface)

Every visual is an **emoji string** living in a `.icon` (or `label`) field in `js/data.js`, rendered
**inline** by `js/render.js` and `js/world-map.js`. Two render patterns matter:

1. **`textContent` on a span** — world-map tiles. e.g. `renderMapTab` in `render.js`:
   `b.className="biome"; b.textContent=biome.icon` and `.feat` / `.ent` / `.settle` / `.pl` spans.
2. **Interpolated into `innerHTML`** — everywhere else: resource rows, build cards, modals, guide search,
   job rows, etc. (e.g. `` `${r.icon} ${r.name}` ``).

**Implication for generation:** name each SVG after its **data id** (`wood.svg`, `campfire.svg`,
`berry_bush.svg`). Then implementation is a mechanical id→file lookup, not 400 hand-edits.

**Implication for the implementation branch (later, not now):** add one helper, e.g.
`icon(kind, id)` → returns an `<img class="gicon" src="assets/svg/…">` (or an inline `<use>` sprite),
with **emoji fallback** when no SVG exists so partial art sets still run. Swap the two render patterns
above to call it. No `G`/save-format change. Keep it out of hot tick loops (icons render in `render()`
only, which is fine). This is the entire wiring job — deliberately small.

---

## 3. Delivery spec (what the generation agent produces)

```
assets/
  svg/
    resources/   wood.svg  stone.svg  …            (41)
    needs/       health.svg  hunger.svg  …          (8)
    status/      diseased.svg  child.svg  …         (badges + markers)
    biomes/      plains.svg  forest.svg  …          (14, T-TILE)
    buildings/   campfire.svg  warehouse.svg  …     (63)
    features/    berry_bush.svg  ruined_house.svg … (93)
    entities/    wolf.svg  trader_npc.svg  …        (33)
    enemies/     wild_dogs.svg  bears.svg  …        (15 combat portraits)
    gear/        stone_axe.svg  lantern.svg  …      (28)
    crops/       vegetables.svg  …                   (5)
    traits/      brave.svg  …                        (16)
    knowledge/   survival.svg  … (per-category)      (10)
    ui/          tab-map.svg  phase-morning.svg  weather-rain.svg  qa-chop.svg  … 
    misc/        favicon.svg  hint.svg  cache.svg  waypoint.svg
  gallery/
    index.html   ← one review page per batch, modeled on test/index.html
```

- **Filename = data id**, lowercase, from the tables below. One SVG per id.
- Ship each batch with a **gallery page** (clone `test/index.html`: dark + parchment preview, 24/32/48
  size strip, card captions) so art can be reviewed at real sizes before any code is touched.
- Keep `/test` as reference; don't overwrite it.

---

## 4. Render sizes (so art is drawn for where it's seen)

From `css/styles.css`:

| Surface | Element | Rendered size | Tier |
|---------|---------|---------------|------|
| World-map biome fill | `.tile` | **24×24px** | T-TILE |
| World-map feature overlay | `.tile .feat` | ~14px glyph on 24px tile | T-ICON |
| World-map entity overlay | `.tile .ent` | ~14px | T-ICON |
| World-map settlement/player | `.tile .settle` / `.pl` | ~16px | T-ICON |
| Town grid building | `.town-tile` / `.town-building` | **48×48 / 40×36px** | T-HERO (small) |
| Resource / log / list rows | inline emoji | ~13–14px | T-ICON |
| Build / buildings / jobs cards | card headers + preview | 16–21px, preview ~48px | T-HERO |
| Guide search results | `.sr-icon` | ~20px | T-ICON |
| HUD stat chips | `header .topstats .ico` | ~13px | T-ICON |
| Tabs | `.tabs button` | ~12px | T-ICON |
| Modals (combat, dialog, death) | title + body | 16–64px+ | T-HERO |
| Favicon | `<link rel=icon>` | 16–64px | special |

**Takeaway:** design on the 256 canvas, but verify every asset at **24px** (and buildings at 48px).

---

## 5. Master inventory — counts, art need, priority

| # | Category | Count | Unique art? | Tier | Priority | Section |
|---|----------|------:|-------------|------|----------|---------|
| 1 | Resources | 41 | yes (6 reuse emoji today) | T-ICON | **P1** | §7A |
| 2 | Survivor need bars | 8 | yes | T-ICON | **P1** | §7B |
| 3 | Survivor status / markers | ~12 | yes | T-ICON | **P1** | §7B |
| 4 | Biome tiles | 14 | yes | T-TILE | **P1** | §7C |
| 5 | Map markers & overlays | ~7 | yes | T-ICON | **P1** | §7D |
| 6 | Buildings | 63 | yes (several reuse) | T-HERO | **P2** | §7E |
| 7 | Gear / items | 28 | yes (no emoji today) | T-HERO | **P2** | §7I |
| 8 | Crops | 5 | yes | T-ICON | **P2** | §7J |
| 9 | Traits | 16 | yes (badges) | T-ICON | **P2** | §7K |
| 10 | Map features | 93 | yes (some reuse) | T-ICON | **P3** | §7F |
| 11 | Map entities | 33 | yes | T-ICON/HERO | **P3** | §7G |
| 12 | Enemy combat portraits | 15 | reuse entity art | T-HERO | **P3** | §7H |
| 13 | Knowledge category icons | 10 | yes | T-ICON | P4 | §7L |
| 14 | Jobs | 79 | **mostly reuse** | — | P4 | §7M |
| 15 | UI chrome (tabs/HUD/phase/weather/quick-actions/combat/hint) | ~65 | yes | T-ICON | P1–P4 | §7N |
| 16 | Quick-Scout locations | 15 | reuse feature art | T-ICON | P4 | §7O |
| 17 | Underground sites | 4 | reuse feature art | T-ICON | P4 | §7O |
| 18 | Favicon | 1 | refresh | special | P4 | §7N |

**Distinct new SVGs to draw ≈ 300** (the ~400 "visual slots" collapse because jobs, enemies, quick-scout
and underground reuse building/resource/feature/entity art). Generate **by priority tier**, newest-impact
first: a player stares at resources, need bars, biome tiles, the player marker, HUD and tabs every second;
rare hazards and job rows almost never.

---

## 6. Emoji collisions to resolve (must become visually distinct)

These ids currently share one emoji. The art set must give each a **unique** silhouette so the UI reads
correctly. (Some are intentional *variants* — mark the relationship, don't make them identical.)

| Emoji | Shared by (id) | Guidance |
|-------|----------------|----------|
| 🟫 | `planks`, `leather` (res) · `palisade`, `leatherworker` (bldg) | plank stack vs. hide sheet vs. log wall vs. tannery |
| 💧 | `water`, `dirty_water` (res) · `spring` (feat) | clean = clear/blue; dirty = murky/brown-green *variant* |
| 🧵 | `cloth`, `fiber` (res) · `tailor` (bldg) | woven bolt vs. raw plant fiber vs. tailor hut |
| ⛓ | `iron`, `ore` (res) · `iron_vein` (feat) | refined bar vs. raw ore chunk *variant* vs. rock seam |
| 🟤 | `clay`, `sand` (res) · `clay_deposit`, `sand_bank` (feat) | clay lump vs. sand pile *variant* |
| 🌱 | `seeds`, `compost` (res) · `garden` (bldg) | seed packet vs. compost heap vs. tilled plot |
| 💊 | `medicine`, `bandages` (res) · `medicine_workshop` (bldg) · `medicine_cabinet` (feat) | pills vs. bandage roll vs. workshop vs. wall cabinet |
| 🛠 | `tools`, `repair_kits` (res) · `workshop`, `crafting_table` (bldg) · `workshop_ruins` (feat) | toolset vs. repair kit vs. shop |
| 🏛 | `community_hall`, `town_hall` (bldg) | civic hall vs. seat of government |
| ⚒ | `forge`, `furnace` (bldg) · `forge_ruins` (feat) | forge vs. smelt-furnace |
| 🪵 | `wood` (res) · `sawmill`, `charcoal_kiln` (bldg) · `fallen_log` (feat) | timber vs. sawmill vs. kiln vs. log |
| 🏡 | `stone_hut` (bldg) · `greenhouse` (bldg) | stone home vs. glass greenhouse |
| 🏹 | `arrows` (res) · `hunting_lodge` (bldg) · `hunter_friendly`, `rogue_hunter_e` (ent) | arrows vs. lodge vs. friendly hunter vs. hostile hunter |
| 🗡 | `weapons` (res) · `armory` (bldg) · `scavenger_gang` (ent) | blade vs. armory vs. raider gang |
| ⛽ | `fuel` (res) · `fuel_depot` (bldg) · `gas_pump` (feat) · `gas_station` (loc) | jerrycan vs. depot vs. pump |
| 📦 | `ammo` (res) · `storage_shed` (bldg) · `footlocker` (feat) | ammo box vs. storage vs. locker |
| 🔥 | `campfire` (bldg) · `village` (biome) · `burned_cabin`, `signal_fire`, `burning_pile` (feat) | distinct fire contexts |
| 🕳 | `well` (bldg) · `old_well`, `cave_mouth`, `storm_drain`, `pitfall` (feat) | well vs. cave vs. drain vs. trap pit |
| 🪤 | `trap_line` (bldg) · `rusty_trap` (feat) | built trap line vs. hidden rusty trap |
| ⚠ | `collapsed_floor`, `spike_trap` (feat) | distinct hazard glyphs |
| 💀 | `soldier_remains`, `hiker_corpse` (feat) | military vs. civilian remains |
| 🚪 | `gate` (bldg) · `cellar` (feat) · `shelter` (loc) | gate vs. cellar door |
| 🔧 | `parts` (res) · `repair_station` (bldg) · `mechanic_npc` (ent) | parts vs. shop vs. person |
| 🌾 | `crops` (res) · `crop_field` (bldg) · `wild_wheat`, `reeds` (feat) | harvest vs. field vs. wild stand |
| 🌿 | `herbs` (res) · `herbalist` (bldg) · `wild_herbs` (feat) | herb bundle vs. hut vs. wild patch |
| 🪖 | `barracks` (bldg) · `wrecked_tank` (feat) · `military` (loc) | helmet vs. wreck |
| 🪨 | `stone` (res) · `stone_outcrop` (feat) | loose stone vs. outcrop *variant* |
| ⬛ | `charcoal` (res) · `coal_seam` (feat) | charcoal lump vs. coal seam |
| 🦴 | `bones` (res) · `old_bones` (feat) | bone pile *variant* |
| 🦌 | `hides` (res) · `animal_carcass` (feat) · `deer` (ent) | hide vs. carcass vs. live deer |
| 🪢 | `rope` (res) · `rope_pile` (feat) | coil *variant* |
| 🪟 | `glass` (res) · `glass_shards` (feat) | pane vs. shards *variant* |
| 📖 | `books` (res) · `library` (bldg) · `scholar_npc` (ent) · Guide tab | book vs. library vs. person |
| 🐐 | `goat_pen` (bldg) · `mountain_goat` (ent) | pen vs. wild goat |
| 🏬 | `warehouse` (bldg) · `shopping_mall` (feat) | warehouse vs. mall |
| 🚗 | `scrapyard` (bldg) · `abandoned_car` (feat) | yard vs. single wreck |
| 🏪 | `market_stall` (bldg) · `storehouse` (feat) | stall vs. store |
| 🗼 | `watchtower` (bldg) · `watchtower_ruin` (feat) | intact vs. ruined *variant* |
| 🚜 | `abandoned_farm` (feat) · `farm` (loc) | same concept — may share |
| ⛺ | `tent` (bldg) · `abandoned_camp` (feat) | pitched vs. derelict |
| ⚔ | `bandit_camp` (ent) · `raider_camp` (loc) | may share |
| 🚇 | `subway_stairs` (feat) · `subway` (underground) | same concept — may share |

---

## 7. The asset map

Legend: **Current** = emoji in use today. **Where** = render surface. Draw to the house style (§1).

### 7A. Resources — 41 · T-ICON · **P1**
Appear in: right-panel stockpile (`renderRight`), cost/loot strings everywhere, inventory rows, daily
outlook, guide search. Rendered ~13px inline. These are the single most-seen icons in the game.

| id | Name | Current | Brief |
|----|------|:------:|-------|
| wood | Wood | 🪵 | cut log / timber billet |
| planks | Planks | 🟫 | stacked sawn planks |
| stone | Stone | 🪨 | rough stone block(s) |
| bricks | Bricks | 🧱 | fired brick stack |
| clay | Clay | 🟤 | wet clay lump |
| metal | Metal Scraps | 🔩 | bent sheet + bolt (cf. `/test` 02) |
| iron | Iron | ⛓ | refined iron bar |
| steel | Steel | ⚙ | bright steel bar / ingot |
| nails | Nails | 📌 | handful of nails |
| tools | Tools | 🛠 | hammer + wrench set |
| rope | Rope | 🪢 | coiled rope |
| cloth | Cloth | 🧵 | folded cloth bolt |
| leather | Leather | 🟫 | tanned hide sheet |
| hides | Hides | 🦌 | raw stretched hide |
| bones | Bones | 🦴 | bone pile |
| food | Food | 🍞 | ration tin / bread (cf. `/test` 04) |
| meat | Meat | 🍖 | raw meat cut |
| crops | Crops | 🌾 | harvested produce bundle |
| seeds | Seeds | 🌱 | seed packet / sprouting seeds |
| herbs | Herbs | 🌿 | herb bundle |
| water | Clean Water | 💧 | clear canteen/drop (cf. `/test` 03) |
| dirty_water | Dirty Water | 💧 | murky water *variant of water* |
| medicine | Medicine | 💊 | pills / med case (cf. `/test` 05) |
| alcohol | Alcohol | 🍺 | bottle / flask |
| charcoal | Charcoal | ⬛ | charcoal chunks |
| fuel | Fuel | ⛽ | jerrycan |
| oil | Oil | 🛢 | oil drum / can |
| parts | Parts | 🔧 | mechanical parts |
| components | Components | 🔌 | circuit / connector |
| batteries | Batteries | 🔋 | salvaged cell (cf. `/test` 06) |
| glass | Glass | 🪟 | glass pane |
| weapons | Weapons | 🗡 | blade / makeshift weapon |
| ammo | Ammunition | 📦 | ammo box / rounds |
| arrows | Arrows | 🏹 | bundle of arrows |
| books | Books | 📖 | worn books |
| fiber | Plant Fiber | 🧵 | raw plant fiber *(reuses cloth today)* |
| ore | Iron Ore | ⛓ | raw ore chunk *(reuses iron)* |
| sand | Sand | 🟤 | sand pile *(reuses clay)* |
| compost | Compost | 🌱 | compost heap *(reuses seeds)* |
| bandages | Bandages | 💊 | bandage roll *(reuses medicine)* |
| repair_kits | Repair Kits | 🛠 | repair kit pouch *(reuses tools)* |

### 7B. Survivor need bars, status & courtship — ~20 · T-ICON · **P1**
Need bars: left-panel character card + Survivors tab (`NEED_DEFS`). Status badges: survivor cards.

**Need bars (8)** — tiny icon in the bar label; tint to the matching need color (§1).

| id | Current | Color var |
|----|:------:|-----------|
| health | ❤ | `--hp` #d35353 |
| hunger | 🍞 | `--hunger` #b07a39 |
| thirst | 💧 | `--thirst` #5fa8d3 |
| energy | ⚡ | `--energy` #c9a14a |
| happiness | 😊 | `--happy` #cf6cb0 |
| safety | 🛡 | `--safety` #7fbf5d |
| morale | ✨ | `--morale` #e2b14b |
| warmth | 🔥 | `--warm` #d97a3a |

**Status / role badges & markers**

| id | Current | Where |
|----|:------:|-------|
| diseased | 🤒 | survivor card badge |
| injured | 🩹 | survivor card badge |
| player_star | ⭐ | marks player in Survivors list |
| player_avatar | 👤 | left-panel character header |
| child | 👶 | child suffix, follower strip |
| partner | 💍 | partnered badge |
| courtship_heart | ❤ | courtship progress badge X/100 |

### 7C. Biome tiles — 14 · **T-TILE** · **P1**
The map background. Today each is a single glyph char on a colored `.tile` (24×24, `biomeAt` in
`world-map.js`, `renderMapTab`). Produce **two things per biome**: a 24×24 repeatable tile texture
*and* a small legend swatch (the biome key). Keep the existing bg/fg colors as the anchor so saved
maps still read the same.

| id | Name | Glyph | bg | fg | Notes |
|----|------|:----:|----|----|-------|
| plains | Plains | · | #3a4a26 | #90a050 | default terrain, sparse grass |
| forest | Forest | ♣ | #1f3018 | #3e6028 | tree stipple |
| deep_forest | Deep Forest | ♠ | #142010 | #244018 | darker, denser (dark flag) |
| mountain | Mountain | ▲ | #3a3a36 | #7a7570 | rock |
| hills | Hills | ⌒ | #403624 | #7a6a40 | rolling |
| river | River | ~ | #0e2638 | #5a90b0 | blocks, water |
| lake | Lake | ≈ | #0a1f30 | #4a7090 | blocks, water |
| swamp | Swamp | ≡ | #1a2818 | #5a6530 | hazard |
| radio | Irradiated | ☢ | #3a3a10 | #c0c020 | hazard + radiation glow |
| ruins | Ruins | ▦ | #2a2825 | #807870 | rubble texture |
| road | Road | = | #2a2522 | #7a6f68 | fast travel |
| snow | Snow | ❄ | #5a6878 | #d0e0f0 | cold |
| desert | Wasteland | · | #3a3220 | #a08858 | dry |
| village | Village | 🔥 | #5a2818 | #ffaa44 | safe home tile, warm glow |

### 7D. Map markers & overlays — ~7 · T-ICON · **P1**
Drawn over tiles (`renderMapTab`, `.pl` / `.settle` / `.map-marker` / `.fol`).

| id | Current | Meaning |
|----|:------:|---------|
| player | 🧑 | player position (`.pl`, ~16px, warm glow) |
| village_home | 🔥 | settlement campfire tile (`.settle`) |
| camp | `C` | field camp on a tile |
| cache | `$` | ground cache of resources |
| waypoint | `+` | player-placed marker |
| follower_count | `+N` | small badge, number following |
| settlement_building | building emoji | a built structure shown on the map |

### 7E. Buildings — 63 · T-HERO (render 40–48px) · **P2**
Build tab cards + preview, Town grid tiles, Buildings tab, worker-slot headers, cost strings,
settlement map tiles. The `/test` set already nails `campfire` (09), `survivor-shelter` (07),
`lookout-tower` (08) — extend that language. Grouped by `cat`:

**Survival (1):** `campfire` 🔥
**Shelter (5):** `tent` ⛺ · `shelter` 🛖 · `wooden_hut` 🏠 · `stone_hut` 🏡 · `family_cabin` 🏘
**Storage (3):** `storage_shed` 📦 · `warehouse` 🏬 · `food_cellar` 🥖
**Water (4):** `rain_barrel` 🛢 · `water_collector` 💦 · `well` 🕳 · `purifier` 🧪
**Food (10):** `garden` 🌱 · `crop_field` 🌾 · `greenhouse` 🏡 · `chicken_coop` 🐔 · `goat_pen` 🐐 · `hunting_lodge` 🏹 · `smokehouse` 🥩 · `kitchen` 🍳 · `animal_stable` 🐎 · `fishing_station` 🐟
**Medicine (3):** `clinic` ⚕ · `herbalist` 🌿 · `medicine_workshop` 💊
**Community (7):** `inn` 🛏 · `tavern` 🍺 · `brewery` 🍻 · `shrine` ⛩ · `bathhouse` 🛁 · `community_hall` 🏛 · `town_hall` 🏛
**Education (2):** `school` 📚 · `library` 📖
**Crafting (9):** `workshop` 🛠 · `carpenter` 🪚 · `sawmill` 🪵 · `toolsmith` 🔨 · `charcoal_kiln` 🪵 · `tailor` 🧵 · `leatherworker` 🟫 · `crafting_table` 🛠 · `furnace` ⚒
**Engineering (6):** `forge` ⚒ · `recycler` ♻ · `scrapyard` 🚗 · `mechanics_shed` ⚙ · `repair_station` 🔧 · `fuel_depot` ⛽
**Defense (9):** `guard_post` 🪧 · `watchtower` 🗼 · `palisade` 🟫 · `gate` 🚪 · `trap_line` 🪤 · `barracks` 🪖 · `training_yard` 🥋 · `armory` 🗡 · `prison_cage` 🔒
**Trade (4):** `market_stall` 🏪 · `trading_post` 🛒 · `signal_tower` 📡 · `scout_camp` 🏕

> Buildings also get a "ghost/preview" state (`.ghost`) and a damaged state (`dmg`) in code — art can
> be a single SVG; CSS handles the tint. No separate damaged SVG needed unless we want one.

### 7F. Map features — 93 · T-ICON (render ~14px on tile) · **P3**
Overlaid on map tiles (`.feat`) and listed in nearby/search panels. Must read at 14px — silhouette only.
Grouped by role:

**Food (11):** `berry_bush` 🫐 · `mushroom_patch` 🍄 · `wild_herbs` 🌿 · `apple_tree` 🍎 · `edible_roots` 🥕 · `wild_wheat` 🌾 · `bird_nest` 🥚 · `beehive` 🐝 · `animal_carcass` 🦌 · `seed_pod` 🌰 · `fish_pool` 🐟
**Wood / stone / metal (12):** `dead_tree` 🪾 · `fallen_log` 🪵 · `pine_grove` 🌲 · `ancient_oak` 🌳 · `stone_outcrop` 🪨 · `boulder_pile` 🗿 · `clay_deposit` 🟤 · `iron_vein` ⛓ · `coal_seam` ⬛ · `old_bones` 🦴 · `scrap_pile` 🔩 · `glass_shards` 🪟
**Water (6):** `spring` 💧 · `old_well` 🕳 · `pond` 🟦 · `stream` 〰 · `rain_pool` 💦 · `hot_spring` ♨
**Ruins / scavenge sites (36):** `ruined_house` 🏚 · `burned_cabin` 🔥 · `abandoned_farm` 🚜 · `church_ruins` ⛪ · `hospital_ruins` 🏥 · `police_station` 🚓 · `fire_station` 🚒 · `factory_ruins` 🏭 · `power_station` ⚡ · `shopping_mall` 🏬 · `train_station` 🚉 · `school_ruins` 🏫 · `library_ruins` 📚 · `abandoned_car` 🚗 · `crashed_bus` 🚌 · `wrecked_truck` 🚛 · `crashed_heli` 🚁 · `roadblock` 🚧 · `abandoned_camp` ⛺ · `soldier_remains` 💀 · `hiker_corpse` 💀 · `suitcase` 🧳 · `toolbox` 🧰 · `footlocker` 📦 · `medicine_cabinet` 💊 · `cellar` 🚪 · `storehouse` 🏪 · `workshop_ruins` 🛠 · `forge_ruins` ⚒ · `watchtower_ruin` 🗼 · `bunker_hatch` 🔒 · `silo` 🏗 · `gas_pump` ⛽ · `wrecked_tank` 🪖 · `ammo_crate` 🎁 · `rope_pile` 🪢
**Underground entrances (4):** `mine_entrance` ⛏ · `cave_mouth` 🕳 · `subway_stairs` 🚇 · `storm_drain` 🕳
**Hazards (14):** `radioactive_pool` ☢ · `toxic_cloud` 💨 · `landmine` 💣 · `rusty_trap` 🪤 · `pitfall` 🕳 · `collapsed_floor` ⚠ · `spike_trap` ⚠ · `acid_puddle` 🧪 · `quicksand` 🟫 · `plague_nest` 🦠 · `mass_grave` ⚰ · `lightning_zone` ⛈ · `burning_pile` 🔥 · `ash_pit` 🌫
**Events / oddities (8):** `strange_shrine` ⛩ · `old_radio` 📻 · `music_box` 🎵 · `hidden_cache` 💰 · `glowing_woods` 🌌 · `map_fragment` 🗺 · `signal_fire` 🔥 · `graveyard` 🪦
**Secondary (2):** `reeds` 🌾 *(variant of wild_wheat)* · `sand_bank` 🟤 *(variant of clay_deposit)*

### 7G. Map entities — 33 · T-ICON / T-HERO · **P3**
On-map creatures/NPCs (`.ent`, ~14px) that double as combat/dialog portraits (→ T-HERO at modal size).

**Hostiles (15):** `wild_dogs_pack` 🐕 · `wolf` 🐺 · `bear` 🐻 · `infected_npc` 🧟 · `raider_npc` 🥷 · `bandit_camp` ⚔ · `mutant_beast` 👹 · `cultist_npc` 🕯 · `forest_beast_e` 🦁 · `night_stalker_e` 🦇 · `thief_npc` 🕵 · `rogue_hunter_e` 🏹 · `warlord_scout_e` 🎖 · `scavenger_gang` 🗡 · `desperate_npc` 😵
**Huntable animals (5):** `rabbit` 🐇 · `deer` 🦌 · `boar` 🐗 · `wild_turkey` 🦃 · `mountain_goat` 🐐
**Friendly NPCs (13):** `lost_child_npc` 🧒 · `wounded_npc` 🤕 · `wanderer_npc` 🚶 · `hermit_npc` 🧙 · `trader_npc` 🧺 · `hunter_friendly` 🏹 · `refugee_family` 👨‍👩‍👧 · `wise_elder` 👴 · `doctor_npc` 🩺 · `mechanic_npc` 🔧 · `scholar_npc` 📖 · `loyal_dog` 🐶 · `sage_npc` 🧓

### 7H. Enemy combat portraits — 15 · T-HERO · **P3** · *reuse §7G*
`ENEMIES` drive combat modals / raid events. Each maps to a hostile entity — **reuse that entity's
art at hero size**; only draw extra if we want a distinct "combat pose." ids: `wild_dogs`, `wolves`,
`bears`, `infected`, `scavengers`, `raiders`, `bandits`, `mutated_animals`, `desperate`, `cultists`,
`rogue_hunters`, `forest_beasts`, `night_stalkers`, `thieves`, `warlord_scouts`.

### 7I. Gear / items — 28 · T-HERO · **P2**
Inventory & Crafting tabs. **No emoji today** (they currently fall back to a generic 🎒 / resource
icons), so this is pure upside — a crafted-gear look will feel great. Equip slots: weapon, light,
pack, clothing, plus tools/utility.

**Tools (12):** `stone_axe` · `iron_axe` · `steel_axe` · `stone_pick` · `iron_pick` · `steel_pick` · `shovel` · `hoe` · `knife` · `hammer` · `saw` · `crowbar` *(axe/pick come in stone→iron→steel tiers: shared shape, upgraded material/color)*
**Fishing / water (3):** `fishing_rod` · `bucket` · `canteen`
**Weapons (2):** `bow` · `salvaged_weapon`
**Light (2):** `torch` · `lantern`
**Navigation (2):** `compass` (Home Compass) · `binoculars`
**Shelter (2):** `sleeping_bag` · `portable_tent`
**Packs (2):** `backpack` (Canvas) · `hiking_pack` (Framed)
**Clothing (3):** `warm_coat` · `raincoat` · `leather_armor`

### 7J. Crops — 5 · T-ICON · **P2**
Farming tab crop selector + plot cards. `vegetables` · `grain` · `flax` (Fiber crop) · `herbs`
(Medicinal herbs) · `orchard`. Draw each with a seedling → mature pair feel if cheap, else mature only.

### 7K. Traits — 16 · T-ICON (badge) · **P2**
Badges on survivor cards. Small, legible-at-tiny emblems (not portraits): `brave` · `cowardly` ·
`hardworking` · `lazy` · `medic` · `hunter` · `builder` · `farmer` · `guard` · `teacher` · `mechanic` ·
`cook` · `leader` · `troublemaker` · `tough` · `quick`. Positive traits lean sage/gold, negative lean rust/muted.

### 7L. Knowledge — category icons (10) · T-ICON · **P4**
The tree groups 27 nodes by `cat`. Per-node art is overkill; draw **one emblem per category** and reuse:
`Survival` · `Building` · `Farming` · `Medicine` · `Combat` · `Crafting` · `Engineering` · `Trade` ·
`Community` · `Education`. (Node → unlock icons already come from §7E building art.)

### 7M. Jobs — 79 · *mostly reuse* · **P4**
Jobs render in the Jobs tab. A job's icon is **already derived from its building** (render.js falls back
to the building icon, else 🧑‍🔧). So: building-backed jobs reuse §7E; general jobs reuse the resource
they produce (e.g. `woodcutter`→wood, `stone_collector`→stone, `miner`→iron/ore, `fiber_gatherer`→fiber).
Only a handful of general jobs lack an obvious reuse and could get a small worker emblem:
`none` (Idle) · `gatherer` · `trapper` · `runner` · `chronicler` · `mediator` · `builder` · `wallbuilder` ·
`hauler`. Draw those ~9 only if time allows; everything else reuses.

### 7N. UI chrome — ~65 · T-ICON · **P1–P4**

**Tabs (12)** — `.tabs` labels: `map` 🗺 · `town` 🏘 · `inventory` (none) · `crafting` (none) ·
`farms` (none) · `build` 🏗 · `survivors` 👥 · `jobs` 🛠 · `knowledge` 📚 · `buildings` 🏠 ·
`scout` 🧭 · `guide` 📖. *(inventory/crafting/farms have no icon today — add three.)*

**HUD stat chips (8)** — `index.html` header: `day` 📅 · `phase` (dynamic) · `clock` 🕐 ·
`weather` (dynamic) · `pop` 👥 · `danger` ⚠️ · `rep` 🤝 · `knowledge` 📚.

**Time-of-day phase (4)** — set in `render.js` (`["🌅","☀️","🌇","🌙"][phase]`) and the map phase
badge (`☀ Morning / ☀ Midday / 🌇 Evening / 🌙 Midnight`): `phase-morning` 🌅 · `phase-midday` ☀️ ·
`phase-evening` 🌇 · `phase-night` 🌙.

**Weather (3)** — `{clear:"🌤", rain:"🌧", cold:"❄️"}`: `weather-clear` · `weather-rain` · `weather-cold`.

**Quick-action buttons (~28)** — left-panel action buttons (grouped Survival / Gather / Camp & Craft).
Current implied emoji: eat 🍞 · drink 💧 · rest 💤 · bandage 🩹 · warm-up 🔥 · chop 🪓 · forage 🌿 ·
fetch-water 🪣 · gather-fiber · gather-stone · mine ⛏ · dig 🕳 · fish 🎣 · hunt 🏹 · survey 🔭 ·
cook 🍳 · boil-water 🔥 · filter-water ⬛ · craft-arrows 🏹 · pitch-tent ⛺ · lay-bag 🛏 · build-leanto ·
fuel-fire 🔥 · pack-camp 📦 · share-stories 🎺 · study 📖 · train 🥋 · sleep 🛏. *(Several reuse
resource/feature art — only draw the verbs that need a distinct action glyph: chop/forage/dig/fish/
hunt/survey/cook/study/train/rest/bandage/share-stories.)*

**Combat UI (2)** — modal action buttons: `combat-attack` · `combat-flee`.

**Hint avatar (1)** — idle "thinking" bubble: `hint` 🤔 (player pondering).

**Event-log types (4)** — not icons; CSS color classes `.good/.bad/.warn/.info`. Could get tiny leading
glyphs if desired (optional).

**Favicon (1)** — currently an inline SVG campfire in `index.html` (`#120f0b` bg, `#856a46` sticks,
`#ff9f1c`/`#ffd166` flame). **Refresh to match the new house palette** once the set exists.

### 7O. Quick-Scout locations (15) + Underground sites (4) · *reuse* · **P4**
Legacy "Quick Scout" tab (`LOCATIONS`) and underground expeditions (`UNDERGROUND_SITES`) — all map onto
existing feature/building art. **Reuse**, don't redraw.
Locations: `forest` 🌲 · `road` 🛣 · `ruined_house` 🏚 · `market` 🛒 · `police` 🚓 · `hospital` 🏥 ·
`gas_station` ⛽ · `factory` 🏭 · `farm` 🚜 · `military` 🪖 · `raider_camp` ⚔ · `school` 🏫 ·
`riverbank` 🏞 · `deep_forest` 🌳 · `shelter` 🚪.
Underground: `mine` ⛏ · `cave` 🕳 · `subway` 🚇 · `drain` 🕳 (reuse the matching §7F entrance art).

---

## 8. Generation workflow (for the SVG agent)

1. **Study `/test`** (all 10 SVGs + `index.html`). Internalize palette, line weight, shadow, scale.
2. **Generate by priority tier**, one category per batch (P1 first): resources → need/status → biomes →
   markers → HUD/tabs/phase/weather → buildings → gear → crops → traits → features → entities → the rest.
3. **One SVG per data id** (names in §7), `viewBox 0 0 256 256`, transparent, self-contained, ≤ ~4 KB.
4. **Resolve every §6 collision** — no two ids share a silhouette.
5. After each batch, emit a **gallery page** (clone `test/index.html`) showing every new asset at
   24 / 32 / 48 / 256 on both dark and parchment backgrounds. This is the review gate.
6. **Acceptance checklist per asset:** reads at 24px · on-palette · transparent bg · no external refs ·
   distinct from its collision-mates · filename = data id · lands in the right `assets/svg/<cat>/` folder.

## 9. Implementation plan (SEPARATE BRANCH — not part of generation)

When the art set is approved, on a new branch:

1. Add `assets/svg/**` and a tiny `icon(kind, id, {size})` helper (`js/helpers.js`) returning an
   `<img class="gicon">` (or inline `<use>` sprite) **with emoji fallback** when an SVG is missing.
2. Update the two render patterns (§2): map-tile `textContent` spans (`world-map.js` /
   `renderMapTab`) and the inline `${x.icon}` interpolations across `render.js`. Add a small CSS rule
   sizing `.gicon` to its context (24 map / 48 town / 1em inline).
3. Biomes (§7C): swap the `.tile` glyph for the tile texture, keep bg/fg colors as fallback so old
   saves render unchanged; this is the one place touching map drawing — verify fog/unseen tiles still
   don't generate terrain (per `CLAUDE.md`).
4. Refresh the favicon (§7N) in `index.html`.
5. **No `G`/save-format change.** Keep art out of the hot tick path (icons only build during `render()`).
6. Verify: `node --check js/*.js`, then open `index.html` and walk the map, open each tab, trigger a
   combat modal — confirm icons resolve and emoji fallback works for any gaps.
7. Update `VISUAL_MAP.md` (or retire it in favor of this file) and note the art set in `CLAUDE.md`.

---

### Appendix — quick totals (live, 2026-10-11)
Resources 41 · Need bars 8 · Buildings 63 · Biomes 14 · Map features 93 · Map entities 33 ·
Enemies 15 · Gear 28 · Crops 5 · Traits 16 · Jobs 79 · Knowledge nodes 27 (10 categories) ·
Locations 15 · Underground 4 · Tabs 12 · Recipes 46.
**≈ 300 distinct SVGs to draw** after reuse.
