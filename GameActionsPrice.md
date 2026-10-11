# ☢️ Post 2045 — Game Actions & Prices

**The complete public reference for the economy of Post 2045.**
Everything that costs you ⏳ time, ⚡ energy, 📦 resources, or 🧠 knowledge — action by action,
building by building, recipe by recipe.

> **Last updated:** 2026-10-11
>
> **⚠️ Keep this file in sync.** This is a **hand-maintained** document (not auto-generated).
> If you change any game data or cost, browser behavior, or numbers below, you must update this file.
> Numbers were read from the live code at the date above.

---

## 👀 Where to look when updating

| If you change… | Update this file's section | Source of truth |
|---|---|---|
| Resource list / icons | §1 | `js/data.js` → `RESOURCES` |
| Starting kit | §1, §14 | `js/data.js` → `STARTING_RESOURCES`; `js/state.js` |
| Action times / energy | §4 | `js/data.js` → `ACTION_COSTS`, `ACTION_ENERGY` |
| Movement cost per tile | §3 | `js/data.js` → `TRAVEL`; `js/world-map.js` → `travelCost` |
| Building cost / max / workers / effects | §7 | `js/data.js` → `BUILDINGS` |
| Build time | §7 | `js/helpers.js` → `buildingMinutes` |
| Crafting recipe, time, output | §6 | `js/data.js` → `RECIPES` |
| Tool time discounts | §4, §6 | `js/helpers.js` → `actionMinutes`, `recipeMinutes` |
| Jobs + output/consumption | §10 | `js/data.js` → `JOBS` |
| Research costs & unlocks | §11 | `js/data.js` → `KNOWLEDGE` |
| Gear stats | §12 | `js/data.js` → `ITEMS`, `RESOURCE_WEIGHTS` |
| Enemies, loot, huntables | §13 | `js/data.js` → `ENEMIES`, `MAP_ENTITIES` |
| Combat numbers | §13 | `js/actions.js` → `combatAttack`, `enemyTurn`, `combatFlee` |
| Camps / fires / sleep | §5 | `js/actions.js` → `sleepFor`, `campAction`, `passMinutes` |
| Scout / underground | §9 | `js/actions.js` → `explore`; `js/world-map.js` → `undergroundExplore` |
| Map features / events | §15 | `js/data.js` → `MAP_FEATURES`; `js/world-map.js` → `triggerEvent` |
| Needs decay & health drain | §14 | `js/actions.js` → `decaySurvivor` |
| Storage caps, spoilage | §14 | `js/helpers.js` → `totalStorageCap`, `foodStorageCap` |

After any change to `js/data.js`, also regenerate the machine summary with `node tools/gen-pricing.js`
(produces `PRICING.md`). That file is generated; **this** file is written by hand.

---

## ⏳ 1. Time & currencies

The game runs on four "currencies".

| Icon | Name | Notes |
|:---:|---|---|
| ⏳ | **Time** | Measured in minutes and phases. 1 **phase = 360 min = 6 h**, 4 phases = **1 day (24 h)**. Phases are Morning, Midday, Evening, Night. |
| ⚡ | **Energy** | 0–100. Every step and most actions cost energy. Rest and sleep restore it. |
| 📦 | **Resources** | 52 tracked resources (see table). Capped by storage buildings. |
| 🧠 | **Knowledge** | Research points only; spent in the Knowledge tab, never on actions. |

- **Clock:** `gameMinutes = ((day-1)*4 + phase)*360 + phaseMinutes`. Day starts at 06:00.
- **Night:** from 20:00 to 06:00. Night reduces vision (☀️ 6 tiles → 🌙 3 tiles) and drains warmth faster.
- **Live mode:** the ▶ Live button advances **15 game-minutes per real tick**. Speeds: 1× ≈ every 12 s, 2× ≈ 6 s, 3× ≈ 2.5 s.
- Walking and actions advance the clock and can trigger phase ticks (decay, production, raids, encounters).

**Storage caps (📦):** base **80** per resource. +100 per Storage Shed, +400 per Warehouse,
+50 per Fuel Depot. Food 🍞 / Crops 🌾 / Meat 🍖 get an extra +200 per Food Cellar.
Food spoils if stored above 90% of its cap.

---

## 🎒 2. Starting kit (new game)

You begin as a lone survivor (the player) beside a lit 🏕 campfire.

**Resources:** 🪵 40 Wood · 🍞 5 Food · 💧 4 Clean Water · 🧵 8 Cloth · 📌 6 Nails · 🌱 3 Seeds · 🗡 1 Weapons · 🏹 4 Arrows · 🌿 1 Herbs

**Buildable from the start** (`STARTER_BUILDINGS`): 🔥 Campfire · ⛺ Tent · 📦 Storage Shed · 🛢 Rain Barrel ·
🌱 Garden Plot · 🪧 Guard Post · (plus 🛠 Crafting Table · 🏭 Furnace · 🐟 Fishing Station).

Everything else must be unlocked with 🧠 research (§11).

---

## 🚶 3. Walking — the cost of movement

Each tile you step onto costs **time** (⏳) and **energy** (⚡) based on its biome.
Costs are the **base** values; penalties (below) multiply both.

### Per-tile cost by biome

| Biome | Icon | ⏳ min / tile | ⚡ energy / tile |
|---|:---:|:---:|:---:|
| Road | `=` | 5 | 0.3 |
| Plains | `·` | 6 | 0.4 |
| Village | 🔥 | 6 | 0.4 |
| Forest | ♣ | 10 | 0.6 |
| Hills | `⌒` | 10 | 0.6 |
| Ruins | ▦ | 10 | 0.6 |
| Snow | ❄ | 12 | 0.7 |
| Irradiated | ☢ | 12 | 0.7 |
| Wasteland (desert) | `·` | 12 | 0.7 |
| Deep Forest | ♠ | 15 | 0.9 |
| Mountain | ▲ | 15 | 0.9 |
| Swamp | `≡` | 15 | 0.9 |
| River / Lake | `~` `≈` | **blocked** | — |

### Distance cost — the "how far can I walk?" table

**Clean** = healthy, fed, warm survivor (multiplier ×1).
**Worst** = maximum penalties (multiplier ×3.35 — see below). Minutes are rounded per tile.

| Terrain | 1 tile | 10 tiles | 100 tiles (clean) | 100 tiles (worst) |
|---|---:|---:|---:|---:|
| Road | 5 min / 0.3⚡ | 50 min / 3⚡ | **8 h 20 m** / 30⚡ | 28 h 20 m / 100⚡ |
| Plains · Village | 6 min / 0.4⚡ | 1 h / 4⚡ | **10 h** / 40⚡ | 33 h 30 m / 134⚡ |
| Forest · Hills · Ruins | 10 min / 0.6⚡ | 1 h 40 m / 6⚡ | **16 h 40 m** / 60⚡ | 55 h 50 m / 201⚡ |
| Snow · Irradiated · Wasteland | 12 min / 0.7⚡ | 2 h / 7⚡ | **20 h** / 70⚡ | 1 d 19 h / 234⚡ |
| Deep Forest · Mountain · Swamp | 15 min / 0.9⚡ | 2 h 30 m / 9⚡ | **25 h** / 90⚡ | 3 d 12 h / 301⚡ |

> ⚡ Energy caps at **100**, and you must have enough energy for the **next** tile before stepping.
> A 100-tile trip therefore needs rest stops (or is impossible in one go).
> Each step also triggers hunger/thirst drain, random encounters, and possibly a phase tick.

### Per-step extra drains (on top of the ⚡)

- 🍽 **Hunger −0.12** per step.
- 💧 **Thirst −0.18** per step (**−0.4** in Wasteland/desert). A carried **Canteen** reduces this by 20%.
- 🧥 **Warmth −0.6** per step on a Snow tile unless you wear insulated clothing.
- ⚠ Random biome hazard: **Swamp 6%**, **Irradiated 18%** (2–6 damage; radiation may cause disease).

### Penalty multiplier (`movementPenalty`)

| Condition | Added to multiplier |
|---|---:|
| Warmth < 30 | +0.50 |
| Warmth < 15 | +0.50 |
| Hunger < 20 | +0.35 |
| Thirst < 20 | +0.50 |
| Injured | +0.25 |
| Diseased | +0.25 |
| **Maximum** | **×3.35** |

---

## 🎯 4. Quick actions (what the player does)

Time ⏳ and energy ⚡ per action. "Yields" assume a healthy survivor; tool bonuses noted below.
A survivor must be **adjacent to** the required source (water, forest, deposit…).

| Action | Icon | ⏳ Time | ⚡ Energy | Requires | Yields / effect |
|---|:---:|:---:|:---:|---|---|
| Chop wood | 🪵 | 30 min | 3 | next to forest/wood | 3–5 Wood (**+2 per axe tier**) |
| Forage | 🍇 | 20 min | 2 | plains/forest/hills | 1–3 Food, 0–2 Herbs, 0–2 Seeds |
| Fetch water | 💧 | 10 min | 1 | next to water | 2 Water (**Bucket 5**, **Canteen 3**) |
| Boil water | 🔥 | 15 min | 1 | fire | recipe → 2 Clean Water (2 Dirty + 1 Wood) |
| Filter water | 🧪 | 10 min | 1 | — | recipe → 2 Clean Water (2 Dirty + 1 Charcoal) |
| Cook | 🍳 | 20 min | 1 | fire | recipe → 3 Food (1 Meat or 2 Crops + 1 Wood) |
| Warm by fire | 🔥 | 15 min | 0 | near fire | **+30 Warmth** |
| Gather spirits | 🗣 | 30 min | 2 | — | **+5 Happiness** to all at settlement |
| Craft arrows | 🏹 | 15 min | 1 | — | recipe → 5 Arrows (1 Wood + 1 Bones) |
| Hunt | 🏹 | 30 min | 4 | Bow + 1 Arrow | ranged kill of a visible animal (see §13) |
| Train | 🥋 | 60 min | 5 | — | **+0.5 Combat skill** (cap 20) |
| Study | 📖 | 60 min | 2 | 1 Book | **+2–5 Knowledge** |
| Eat | 🍞 | 0 | 0 | 1 Food | **+30 Hunger** |
| Drink | 💧 | 0 | 0 | 1 Water | **+30 Thirst** (1 Dirty Water = +20, 15% disease) |
| Gather fiber | 🌿 | 15 min | 2 | — | 3–5 Plant Fiber |
| Gather stone | 🪨 | 20 min | 2 | — | 2–3 Stone |
| Mine | ⛏ | 30 min¹ | 2 | Pickaxe + deposit | harvests a mineral node (see §15) |
| Dig | ⛏ | 20 min¹ | 3 | — | 3 Sand + 2 Clay |
| Fish | 🎣 | 30 min | 2 | next to water | 1–3 Meat |
| Bandage | 🩹 | 5 min | 0 | 1 Bandages | **+15 Health**, clears Injured |
| Rest | 💤 | 30 min | — | — | **+14 ⚡ / hour** (cap 60) |
| Sleep | 🛏 | 2 / 4 / 8 h | — | see §5 | restores energy, recovers |
| Light fire | 🔥 | 10 min | 1 | 1 Wood | starts a field camp fire |
| Pitch tent | ⛺ | 15 min | 1 | Portable Tent | shelter for the night |
| Lay sleeping bag | 🛌 | 5 min | 1 | Sleeping Bag | better sleep recovery |
| Lean-to | 🛖 | 30 min | 1 | 4 Wood + 4 Fiber | crude roof shelter |
| Pack camp | 🎒 | 10 min | 1 | camp with gear/fuel | packs up gear and leftover fuel |
| Survey | 🔭 | 15 min | 0 | Binoculars | reveals a **10-tile radius**, +0.2 🧠 |

¹ Chop / Mine / Dig times are reduced by tool tier: **×0.85 (tier 1), ×0.70 (tier 2), ×0.55 (tier 3)**, minimum ×0.45
(so Mine 30 → 26 / 21 / 17 min; Dig 20 → 17 / 14 / 11 min).

---

## 🍞 5. Eating, drinking, resting & sleeping

### Eat & drink (free — no time or energy)
| Action | Cost | Effect |
|---|---|---|
| Eat | 1 🍞 Food | +30 Hunger |
| Drink clean | 1 💧 Water | +30 Thirst |
| Drink dirty | 1 💧 Dirty Water | +20 Thirst · **15% chance disease** |

Passive auto-consumption happens at each phase tick: survivors eat/drink when a need drops low
(Meat gives +20 hunger, dirty water +15 thirst with a 10% disease risk).

### Rest
- **Rest (30 min):** recovers **14 energy per hour** (≈ +7 per rest), capped at **60**.

### Sleep (`sleepFor`) — choose 2 h / 4 h / 8 h
Recovery rate and warmth loss depend on your shelter:

| Shelter | ⚡ Energy / hour | Notes |
|---|---:|---|
| Ground (no shelter) | 4 | highest incident risk |
| Roof (lean-to / tent) | 7 | |
| Sleeping Bag | 9 | |
| Tent **+** Bag | 12 | best field sleep |
| Settlement housing | 14 | sleep indoors, safest |

- Walking/sleeping advances the clock; camp fires burn down (**1 Wood = 4 h of fuel** per refuel).
- The campfire at the settlement consumes **1 Wood per day** (evening tick) or goes out.
- Cold, rain, radiation, nearby hostiles, and lack of fire increase incident risk during sleep.

---

## 🧪 6. Crafting recipes

Times in minutes. "Station" is what you must stand near / have built (`fire` = campfire or field fire).
Recipes that build **items** (tools, gear, weapons) produce a carried item; others produce resources.

| Recipe | Icon | Ingredients → Output | ⏳ | Station |
|---|---|:---:|:---:|---|
| Twist rope | 🪢 | 3 Fiber → 1 Rope | 10 | — |
| Weave cloth | 🧵 | 4 Fiber → 1 Cloth | 15 | Crafting Table |
| Cut planks | 🟫 | 2 Wood → 2 Planks (**9 min with Saw**) | 15 | Crafting Table |
| Clean bandages | 🩹 | 1 Cloth + 1 Water → 3 Bandages | 10 | — |
| Repair kit | 🔧 | 2 Metal + 1 Cloth → 1 Repair Kit | 20 | Crafting Table |
| Stone axe | 🪓 | 2 Wood + 3 Stone + 1 Rope → Stone Axe | 20 | — |
| Stone pickaxe | ⛏ | 2 Wood + 4 Stone + 1 Rope → Stone Pickaxe | 25 | — |
| Shovel | ⛏ | 2 Wood + 2 Metal → Shovel | 25 | Crafting Table |
| Hoe | 🌾 | 2 Wood + 2 Stone + 1 Rope → Hoe | 20 | — |
| Knife | 🔪 | 2 Metal + 1 Wood → Knife | 20 | Crafting Table |
| Hammer | 🔨 | 1 Wood + 2 Stone → Hammer | 20 | — |
| Saw | 🪚 | 3 Metal + 1 Wood → Saw | 30 | Crafting Table |
| Crowbar | 🪝 | 2 Iron → Crowbar | 30 | Forge |
| Bow | 🏹 | 3 Wood + 2 Rope → Bow | 30 | Crafting Table |
| Fit salvaged weapon | 🗡 | 1 Weapons → Salvaged Weapon | 10 | — |
| Fishing rod | 🎣 | 2 Wood + 1 Rope + 1 Bones → Fishing Rod | 20 | — |
| Bucket | 🪣 | 2 Metal + 1 Rope → Bucket | 20 | Crafting Table |
| Canteen | 🧭 | 1 Leather + 1 Rope → Canteen | 20 | Crafting Table |
| Torch | 🔥 | 1 Wood + 1 Cloth → Torch | 5 | — |
| Lantern | 🏮 | 2 Metal + 1 Glass + 1 Oil → Lantern | 30 | Crafting Table |
| Compass | 🧭 | 2 Iron + 1 Glass + 1 Parts → Compass | 30 | Crafting Table |
| Binoculars | 🔭 | 3 Glass + 2 Metal + 2 Parts → Binoculars | 45 | Workshop |
| Sleeping bag | 🛌 | 4 Cloth + 1 Rope → Sleeping Bag | 25 | — |
| Portable tent | ⛺ | 6 Cloth + 2 Rope + 2 Wood → Portable Tent | 40 | Crafting Table |
| Backpack | 🎒 | 4 Cloth + 2 Rope → Canvas Backpack | 30 | Crafting Table |
| Hiking pack | 🎒 | 4 Leather + 2 Planks + 3 Rope → Framed Backpack | 45 | Workshop |
| Warm coat | 🧥 | 4 Cloth + 2 Hides → Warm Coat | 40 | Crafting Table |
| Raincoat | 🧥 | 3 Cloth + 1 Oil → Raincoat | 35 | Crafting Table |
| Leather armor | 🛡 | 4 Leather + 2 Rope → Leather Armor | 45 | Workshop |
| Bone arrows | 🏹 | 1 Wood + 1 Bones → 5 Arrows | 15 | — |
| Burn charcoal | ⬛ | 3 Wood → 2 Charcoal | 30 | Charcoal Kiln |
| Smelt ore | ⛓ | 2 Ore + 1 Charcoal → 1 Iron | 30 | Furnace |
| Recycle scrap iron | ⛓ | 3 Metal + 1 Charcoal → 1 Iron | 30 | Furnace |
| Forge steel | ⚙ | 2 Iron + 2 Charcoal → 1 Steel | 45 | Forge 🔬 Metalworking |
| Fire glass | 🪟 | 3 Sand + 1 Charcoal → 2 Glass | 30 | Furnace |
| Fire bricks | 🧱 | 3 Clay + 1 Charcoal → 3 Bricks | 30 | Furnace |
| Forge nails | 📌 | 1 Metal → 4 Nails | 15 | Workshop |
| Boil water | 💧 | 2 Dirty Water + 1 Wood → 2 Clean Water | 15 | Fire |
| Filter water | 💧 | 2 Dirty Water + 1 Charcoal → 2 Clean Water | 10 | — |
| Cook meat | 🍖 | 1 Meat + 1 Wood → 3 Food | 20 | Fire |
| Cook crops | 🌾 | 2 Crops + 1 Wood → 3 Food | 20 | Fire |
| Compost scraps | 🌱 | 1 Crops + 2 Fiber → 2 Compost | 20 | — |
| Iron axe | 🪓 | 3 Iron + 2 Wood + 1 Rope → Iron Axe | 40 | Forge 🔬 Toolmaking |
| Steel axe | 🪓 | 3 Steel + 2 Wood + 1 Rope → Steel Axe | 40 | Forge 🔬 Metalworking |
| Iron pickaxe | ⛏ | 3 Iron + 2 Wood + 1 Rope → Iron Pickaxe | 40 | Forge 🔬 Toolmaking |
| Steel pickaxe | ⛏ | 3 Steel + 2 Wood + 1 Rope → Steel Pickaxe | 40 | Forge 🔬 Metalworking |

---

## 🏘️ 7. Buildings

**Max** values below are the **effective caps** (base × `BUILDING_CAP_MULTIPLIER` = 3, except Campfire).
**Build time** (`buildingMinutes`): starter builds 45 min; housing 180 min; major buildings 480 min; everything else 120 min.
A carried **Hammer** cuts build time by **20%**.
Buildings are placed on the town grid near the campfire and cost resources up front.

### Cost & build-time summary

| Building | Cat | Cost | 🔨 Time | Workers | Max | Effect |
|---|---|:---:|:---:|:---:|:---:|---|
| 🔥 Campfire | Survival | free | 45 min | 0 | 1 | warmth, cooking |
| ⛺ Tent | Shelter | 4 Cloth, 4 Wood | 45 min | 0 | 12 | housing 1 |
| 🛖 Shelter | Shelter | 10 Wood, 4 Cloth | 180 min | 0 | 18 | housing 2 |
| 🏠 Wooden Hut | Shelter | 25 Wood, 4 Nails, 4 Cloth | 180 min | 0 | 24 | housing 3 |
| 🏡 Stone Hut | Shelter | 25 Stone, 10 Wood, 6 Nails | 180 min | 0 | 24 | housing 4, +safety |
| 🏘 Family Cabin | Shelter | 30 Wood, 20 Stone, 10 Planks, 8 Nails | 180 min | 0 | 18 | housing 6, +happiness |
| 📦 Storage Shed | Storage | 15 Wood, 4 Nails | 120 min | 1 | 24 | +100 resource cap |
| 🏬 Warehouse | Storage | 50 Wood, 30 Stone, 20 Nails, 20 Planks | 480 min | 1 | 12 | +400 resource cap |
| 🥖 Food Cellar | Storage | 20 Stone, 10 Wood, 10 Clay | 120 min | 0 | 12 | +200 food cap, slows spoilage |
| 🛢 Rain Barrel | Water | 8 Wood, 2 Nails | 45 min | 1 | 24 | +0.5 Dirty Water/day |
| 💦 Water Collector | Water | 12 Wood, 6 Metal, 4 Nails | 120 min | 1 | 12 | +3 Dirty Water/worker |
| 🕳 Well | Water | 25 Stone, 10 Wood, 4 Rope | 120 min | 1 | 9 | +3 Clean Water/worker |
| 🧪 Purifier Station | Water | 15 Metal, 5 Glass, 5 Parts | 120 min | 1 | 9 | 2 Dirty → 1 Water ×3/worker |
| 🌱 Garden Plot | Food | 6 Wood, 2 Seeds | 45 min | 1 | 24 | plant/water/harvest (farm) |
| 🌾 Crop Field | Food | 12 Wood, 5 Seeds | 120 min | 1 | 24 | plant/water/harvest (farm) |
| 🏡 Greenhouse | Food | 20 Wood, 15 Glass, 8 Nails | 120 min | 1 | 12 | plant/water/harvest (farm) |
| 🐔 Chicken Coop | Food | 12 Wood, 4 Cloth | 120 min | 1 | 12 | +3 Food/worker |
| 🐐 Goat Pen | Food | 15 Wood, 3 Rope | 120 min | 1 | 12 | +2 Food, +0.5 Hides/worker |
| 🏹 Hunting Lodge | Food | 18 Wood, 1 Weapons | 120 min | 2 | 9 | +2 Meat, +1 Hides, +1 Bones/worker |
| 🥩 Smokehouse | Food | 10 Stone, 10 Wood, 5 Charcoal | 120 min | 1 | 9 | 2 Meat → 3 Food ×3/worker |
| 🍳 Kitchen | Food | 12 Wood, 6 Stone, 1 Tools | 120 min | 1 | 9 | 2 Crops → 3 Food ×4/worker |
| 🐎 Animal Stable | Food | 25 Wood, 5 Stone, 5 Rope | 120 min | 1 | 6 | +1 Food, +0.5 Hides, +0.5 Leather/worker |
| ⚕ Clinic | Medicine | 15 Wood, 10 Cloth, 4 Glass, 2 Medicine | 120 min | 1 | 6 | heal 8/worker, −30% disease |
| 🌿 Herbalist Hut | Medicine | 10 Wood, 5 Herbs | 120 min | 1 | 9 | 2 Herbs → 1 Medicine ×2/worker |
| 💊 Medicine Workshop | Medicine | 15 Stone, 10 Wood, 8 Glass, 2 Tools | 120 min | 2 | 6 | 3 Herbs + 1 Water → 2 Medicine ×3/worker |
| 🛏 Inn | Community | 25 Wood, 10 Cloth, 4 Nails | 120 min | 1 | 6 | +0.5 happiness, +5% attract |
| 🍺 Tavern | Community | 20 Wood, 10 Stone, 5 Nails | 120 min | 1 | 6 | +1 happiness, consumes 1 Alcohol/day |
| 🍻 Brewery | Community | 15 Wood, 5 Glass, 2 Tools | 120 min | 1 | 6 | 2 Crops + 1 Water → 1 Alcohol ×2/worker |
| ⛩ Shrine | Community | 15 Stone, 10 Wood | 120 min | 0 | 6 | +0.3 morale |
| 🛁 Bathhouse | Community | 20 Stone, 10 Wood, 10 Clay, 5 Water | 120 min | 1 | 6 | +0.5 happiness, −10% disease, uses 2 Water/day |
| 🏛 Community Hall | Community | 30 Wood, 20 Stone, 10 Planks, 8 Nails | 480 min | 0 | 3 | +1 morale, +0.2 reputation |
| 🏛 Town Hall | Community | 40 Wood, 30 Stone, 15 Planks, 10 Nails | 480 min | 0 | 3 | +1 morale, −5 danger |
| 📚 School | Education | 15 Wood, 3 Books, 5 Cloth | 120 min | 1 | 3 | faster child growth, +0.5 knowledge |
| 📖 Library | Education | 20 Wood, 10 Books, 5 Glass | 120 min | 1 | 3 | +1 knowledge/worker, +1 knowledge |
| 🛠 Workshop | Crafting | 15 Wood, 5 Stone, 1 Tools | 120 min | 1 | 9 | 1 Metal + 1 Wood → 0.3 Tools + 2 Nails ×3/worker |
| 🪚 Carpenter Hut | Crafting | 12 Wood, 1 Tools | 120 min | 1 | 9 | 2 Wood → 1 Planks ×5/worker |
| 🪵 Sawmill | Crafting | 25 Wood, 5 Metal, 2 Tools | 120 min | 2 | 6 | 2 Wood → 2 Planks ×6/worker |
| 🔨 Toolsmith | Crafting | 10 Wood, 10 Metal, 5 Stone | 120 min | 1 | 6 | 2 Metal + 1 Wood → 1 Tools + 2 Nails ×2/worker |
| ⚒ Forge | Engineering | 20 Stone, 15 Metal, 5 Charcoal | 120 min | 1 | 6 | 3 Metal + 1 Charcoal → 1 Iron ×3/worker |
| ♻ Metal Recycler | Engineering | 15 Metal, 5 Parts | 120 min | 1 | 6 | +3 Metal/worker |
| 🚗 Scrapyard | Engineering | 20 Metal, 5 Wood | 120 min | 1 | 6 | +1 Parts + 1 Metal/worker |
| ⚙ Mechanics Shed | Engineering | 20 Metal, 10 Parts, 3 Tools | 120 min | 1 | 6 | 2 Parts → 1 Components ×2/worker, +1 Parts |
| 🔧 Repair Station | Engineering | 15 Metal, 3 Tools, 5 Parts | 120 min | 1 | 6 | repairs 2 building damage/worker |
| ⛽ Fuel Depot | Engineering | 20 Metal, 10 Stone | 120 min | 0 | 6 | +50 storage, fuel-safe |
| 🪧 Guard Post | Defense | 15 Wood, 1 Weapons | 120 min | 1 | 12 | +2 safety/worker |
| 🗼 Watchtower | Defense | 25 Wood, 10 Stone, 4 Nails | 120 min | 1 | 9 | +4 safety/worker, warning |
| 🟫 Palisade Wall | Defense | 20 Wood, 4 Nails | 120 min | 0 | 24 | wall 5 |
| 🚪 Gate | Defense | 15 Wood, 10 Metal, 4 Nails | 120 min | 0 | 6 | wall 10 |
| 🪤 Trap Line | Defense | 10 Wood, 5 Metal, 2 Rope | 120 min | 0 | 18 | wall 3 |
| 🪖 Barracks | Defense | 30 Wood, 15 Stone, 8 Nails | 480 min | 2 | 6 | housing 4, +3 safety/worker |
| 🥋 Training Yard | Defense | 15 Wood, 10 Stone, 1 Weapons | 120 min | 1 | 6 | +1 combat training |
| 🗡 Armory | Defense | 20 Stone, 8 Iron, 10 Wood | 120 min | 1 | 6 | 3 Metal + 1 Wood → 1 Weapons ×2/worker, +1 Ammo |
| 🔒 Prison Cage | Defense | 15 Metal, 10 Wood, 5 Nails | 120 min | 1 | 6 | order 2 |
| 🏪 Market Stall | Trade | 10 Wood, 3 Cloth | 120 min | 1 | 9 | +5% trade, +0.05 reputation |
| 🛒 Trading Post | Trade | 20 Wood, 10 Stone, 5 Cloth | 120 min | 1 | 3 | +10% trade, +0.1 reputation |
| 📡 Signal Tower | Trade | 25 Wood, 10 Metal, 3 Parts | 120 min | 1 | 3 | +5% trade, +5% attract |
| 🏕 Scout Camp | Trade | 15 Wood, 5 Cloth, 1 Weapons | 120 min | 1 | 6 | warning, +1 safety/worker |
| 🛠 Crafting Table | Crafting | 6 Wood, 2 Stone | 45 min | 1 | 18 | crafting station |
| 🏭 Furnace | Crafting | 10 Stone, 4 Clay | 120 min | 1 | 12 | smelting station |
| 🐟 Fishing Station | Food | 8 Wood, 2 Rope | 120 min | 2 | 12 | fishing workplace (needs a claimed site) |

---

## 🌾 8. Farming

Assign a **Farmer** job to automate tending and replanting, or tend plots by hand.

**You must be standing next to the plot** (within 1 tile) to tend it by hand — the Farming tab shows a plot's distance and a **Walk to plot** button when you're too far. You can also **left-click a plot in the Town tab** (or right-click it) to tend it directly. Choosing which crop to plant can be done from anywhere in the settlement.

### Hand actions on a plot
| Action | ⏳ Time | Cost | Effect |
|---|:---:|---|---|
| **Plant** | 20 min (**10 with Hoe**) | 1 Seed | starts a crop growing |
| **Water** | 5 min | 1 Water | speeds growth |
| **Fertilize** | 5 min | 1 Compost | +growth |
| **Harvest** | 10 min | — | collects the crop's output |
| **Build fence** | 20 min | 4 Wood | protects the plot |
| **Irrigate** | 30 min | 4 Wood + 4 Clay + 1 Rope | auto-waters the plot |

### Crops
| Crop | 🌱 Seed | ⏳ Grow time | Harvest |
|---|---|:---:|---|
| 🥕 Vegetables | 1 | 2 days | 6 Crops + 2 Seeds |
| 🌾 Grain | 1 | 3 days | 10 Crops + 3 Seeds |
| 🌿 Flax (fiber crop) | 1 | 3 days | 12 Fiber + 2 Seeds |
| 🌿 Medicinal herbs | 1 | 2.5 days | 7 Herbs + 2 Seeds |
| 🍎 Orchard | 1 | 4 days | 10 Food + 2 Seeds (**perennial** — keeps producing) |

---

## 🗺️ 9. Exploration: Quick Scout & Underground

### Quick Scout (from the settlement)
Sends you to a specific ruin/site for a lump-sum loot roll. **Requires 1 carried Food + 1 carried Clean Water.**
**Cooldown 720 min (12 h)** per destination. Base encounter chance = **0.18 + danger × 0.07**.

| Destination | Icon | ⏳ Time | ⚡ Energy | Danger | Notable loot |
|---|---|:---:|:---:|:---:|---|
| Forest | 🌲 | 60 min | 8 | 1 | Wood, Herbs, Seeds, Bones |
| Abandoned Road | 🛣 | 60 min | 7 | 1 | Metal, Cloth, Parts, Fuel |
| Ruined House | 🏚 | 60 min | 10 | 2 | Wood, Cloth, Food, Tools, Books |
| Riverbank | 🏞 | 60 min | 8 | 1 | Dirty Water, Clay, Herbs, Stone |
| Old Market | 🛒 | 120 min | 12 | 2 | Food, Cloth, Medicine, Alcohol, Glass |
| Police Station | 🚓 | 120 min | 14 | 3 | Weapons, Ammo, Metal, Books |
| Hospital Ruins | 🏥 | 120 min | 14 | 3 | Medicine, Herbs, Cloth, Books |
| Gas Station | ⛽ | 120 min | 12 | 2 | Fuel, Oil, Parts, Metal |
| Farm Ruins | 🚜 | 120 min | 12 | 1 | Food, Seeds, Crops, Hides, Tools |
| Raider Camp | ⚔ | 120 min | 18 | 5 | Weapons, Ammo, Food, Alcohol, Leather |
| Old School | 🏫 | 120 min | 12 | 2 | Books, Cloth, Glass, Parts |
| Factory Ruins | 🏭 | 180 min | 16 | 3 | Metal, Parts, Components, Iron, Oil |
| Military Checkpoint | 🪖 | 180 min | 18 | 4 | Weapons, Ammo, Steel, Components, Batteries |
| Deep Forest | 🌳 | 180 min | 18 | 3 | Wood, Herbs, Hides, Meat, Bones |
| Underground Shelter | 🚪 | 180 min | 18 | 4 | Food, Water, Medicine, Weapons, Books, Batteries |

### Underground sites (`UNDERGROUND_SITES`)
Found via map features ⛏ Mine Entrance, 🕳 Cave Mouth, 🚇 Subway Stairs, 🕳 Storm Drain.
**Cooldown 1440 min (24 h)** per route, per tile.

| Depth | ⏳ Time | ⚡ Energy | Danger | Loot | Penalty |
|---|:---:|:---:|:---:|---|---|
| **Shallow** (all sites) | 45 min | 8–10 | 18–28% | basic materials per site | — |
| **Deep** (all sites) | 90 min | 15–18 | 42–55% | rarer materials | 2–10 damage, some disease |

- **Deep routes require a light** (Torch/Lantern) with at least 90 min of fuel left.
- The **Mine** requires a **Pickaxe** for both depths.
- Each entry also drains hunger/thirst by `ceil(energy / 5)`.

| Site | Icon | Shallow loot | Deep loot (extra) |
|---|:---:|---|---|
| Abandoned Mine | ⛏ | Stone, Iron, Charcoal, Metal | Iron, Charcoal, Steel, Components |
| Natural Cave | 🕳 | Stone, Bones, Herbs | Stone, Bones, Medicine, Books |
| Buried Subway | 🚇 | Metal, Cloth, Parts, Books | Metal, Parts, Components, Batteries |
| Storm Drain | 🕳 | Dirty Water, Metal, Parts | Dirty Water, Medicine, Components, Bones · **disease** |

### Claims & outposts (while exploring)
- **Mark a worker site** (mine fishing spot): **2 Wood + 1 Rope**.
- **Build an outpost** (permanent cache/hauler point): **6 Wood + 1 Rope**, **30 min**.
- An **Expedition Hauler** returns up to **8 resource units/day** from claimed outpost caches.

---

## 🧑🔧 10. Jobs

Jobs are assigned in the Jobs tab. Output is **per day** (divided across the 4 phase ticks).
Workplace jobs need the building built **and** staff assigned. General jobs need no building.

### General jobs (no building)
| Job | Daily output | Notes |
|---|---|---|
| Idle | — | nothing |
| 🪵 Woodcutter | +3 Wood | cuts from nearby trees |
| 🪵 Lumber Picker | +1 Wood | safe loose wood |
| ⬛ Charcoal Burner | +1 Charcoal (−2 Wood) | no kiln needed |
| 🌿 Gatherer | +1 Herbs, +1 Seeds, +1 Food | |
| 🐇 Trapper | +0.5 Meat, +0.5 Hides, +0.5 Bones | |
| 💧 Water Carrier | +4 Dirty Water | |
| 🍳 Camp Cook | +3 Food (−2 Crops −1 Wood), +0.15 happiness | |
| 📖 Chronicler | +0.25 Knowledge | |
| 🗣 Mediator | +0.15 morale | |
| 🏃 Runner | +0.03 Reputation | |
| 🔩 Scavenger | +1 Metal, +1 Cloth, +0.5 Parts | **chance of injury** |
| 🔩 Junk Picker | +0.5 Metal, +0.5 Cloth, +0.25 Glass | safer |
| 🔨 Builder | repairs buildings | |
| 🟫 Wall Builder | maintains walls | |
| 🪨 Stone Collector | +4 Stone | |
| 🌿 Fiber Gatherer | +5 Fiber | |
| 🧱 Clay Digger | +3 Clay, +2 Sand | |
| 🪢 Rope Maker | +2 Rope (−6 Fiber) | |
| ⛏ Miner | +3 Ore, +2 Stone | needs a claimed mine site |
| 🫖 Camp Water Purifier | +6 Water (−6 Dirty Water −3 Wood) | |
| 🏹 Fletcher | +10 Arrows (−2 Wood −2 Bones) | |
| 🌱 Composter | +3 Compost (−1 Crops −2 Fiber) | |
| 🎒 Expedition Hauler | up to 8 units/day from outposts | |
| 🌱 Seed Saver | +2 Seeds (−1 Crops) | direct |

### Workplace jobs (need the building)
| Job | Building | Daily output |
|---|---|---|
| 🐇 Hunter | 🏹 Hunting Lodge | +2 Meat, +1 Hides, +1 Bones |
| 🪧 Guard | 🪧 Guard Post | defense |
| 🗼 Watchman | 🗼 Watchtower | warning/defense |
| 🪖 Drill Sergeant | 🪖 Barracks | troop readiness |
| 🌾 Farmer | 🌾 Crop Field | +3 Crops |
| 🌱 Gardener | 🌱 Garden Plot | +1 Crops |
| 🏡 Greenhouse Worker | 🏡 Greenhouse | +5 Crops |
| 🐎 Rancher | 🐎 Animal Stable | +1 Food, +0.5 Hides |
| 🐔 Chickenkeeper | 🐔 Chicken Coop | +3 Food |
| 🐐 Goatkeeper | 🐐 Goat Pen | +2 Food, +0.5 Hides |
| 🔨 Toolmaker | 🔨 Toolsmith | +1 Tools, +2 Nails |
| 🛠 Workshop Tinker | 🛠 Workshop | +0.3 Tools, +1 Nails |
| 🪚 Carpenter | 🪚 Carpenter Hut | +1 Planks |
| 🪵 Sawyer | 🪵 Sawmill | +2 Planks |
| ⚒ Smith | ⚒ Forge | +1 Iron |
| ♻ Recycler | ♻ Metal Recycler | +3 Metal |
| 🚗 Scrapper | 🚗 Scrapyard | +1 Parts, +1 Metal |
| ⬛ Charcoal Maker | ⬛ Charcoal Kiln | +1 Charcoal |
| 🧵 Tailor | 🧵 Tailor Hut | +2 Cloth |
| 🟫 Leatherworker | 🟫 Leatherworker | +1 Leather |
| 🍳 Cook | 🍳 Kitchen | +3 Food |
| 🥩 Smoker | 🥩 Smokehouse | +3 Food |
| 🍻 Brewer | 🍻 Brewery | +1 Alcohol |
| 💊 Alchemist | 💊 Medicine Workshop | +2 Medicine |
| 🌿 Herbalist | 🌿 Herbalist Hut | +1 Medicine |
| ⚕ Healer / Nurse | ⚕ Clinic | healing |
| 📚 Teacher / Tutor | 📚 School | +0.5 Knowledge (tutor) |
| 📖 Scholar / Archivist | 📖 Library | +1 Knowledge (archivist) |
| 🛏 Innkeeper | 🛏 Inn | happiness |
| 🍺 Barkeep | 🍺 Tavern | happiness (uses alcohol) |
| 🛒 Trader | 🛒 Trading Post | trade |
| 🏪 Shopkeeper / Barterer | 🏪 Market Stall | +0.05 Reputation (barterer) |
| 📦 Storekeeper | 🏬 Warehouse | storage |
| 📦 Quartermaster | 📦 Storage Shed | storage |
| 📡 Signaller | 📡 Signal Tower | signals |
| 🏕 Scout / Pathfinder | 🏕 Scout Camp | +0.35 Knowledge (pathfinder) |
| 🛁 Bathhouse Keeper | 🛁 Bathhouse | hygiene |
| 💧 Water Worker | 💦 Water Collector | +3 Dirty Water |
| 🛢 Rain Tender | 🛢 Rain Barrel | +0.5 Dirty Water |
| 🕳 Well Worker | 🕳 Well | +3 Water |
| 🧪 Purifier Op | 🧪 Purifier Station | +3 Water |
| 🗡 Armorer | 🗡 Armory | +1 Weapons, +1 Ammo |
| 🥋 Trainer | 🥋 Training Yard | combat training |
| ⚙ Mechanic | ⚙ Mechanics Shed | +1 Components, +1 Parts |
| 🔧 Repairman | 🔧 Repair Station | repairs |
| 🔒 Warden | 🔒 Prison Cage | order |
| 🛠 Equipment Crafter | 🛠 Crafting Table | fulfills orders |
| 🏭 Smelter | 🏭 Furnace | fulfills orders |
| 🎣 Fisher | 🐟 Fishing Station | +4 Meat from a claimed site |

**Traits:** `Hardworking` **+25%** job output, `Lazy` **−25%**. Other traits (Medic, Hunter, Judge,
Farmer, Guard, Teacher, Mechanic, Cook) grant bonuses in their domain.

---

## 🧠 11. Research (Knowledge)

Each node costs 🧠 Knowledge and (for most) requires a prerequisite. Unlocks are shown.

| Node | Cat | 🧠 Cost | Requires | Unlocks |
|---|---|:---:|---|---|
| Survival Basics | Survival | 5 | — | Tent, Rain Barrel |
| Firecraft | Survival | 8 | Survival Basics | Charcoal Kiln |
| Foraging | Survival | 8 | Survival Basics | (bonus foraging) |
| Basic Building | Building | 6 | — | Shelter, Wooden Hut, Storage Shed |
| Masonry | Building | 12 | Basic Building | Stone Hut, Family Cabin, Well |
| Large Structures | Building | 18 | Masonry | Warehouse, Town Hall, Community Hall, Barracks |
| Farming | Farming | 10 | Survival Basics | Garden, Crop Field |
| Animal Husbandry | Farming | 14 | Farming | Chicken Coop, Goat Pen, Animal Stable |
| Greenhouses | Farming | 18 | Farming | Greenhouse |
| Herbalism | Medicine | 8 | — | Herbalist Hut |
| Medicine | Medicine | 14 | Herbalism | Clinic, Medicine Workshop |
| Defense | Combat | 8 | — | Guard Post, Trap Line |
| Fortifications | Combat | 14 | Defense | Palisade, Gate, Watchtower |
| Warfare | Combat | 20 | Fortifications | Armory, Training Yard |
| Crafting | Crafting | 6 | — | Workshop, Carpenter Hut |
| Toolmaking | Crafting | 10 | Crafting | Toolsmith, Sawmill |
| Textiles | Crafting | 10 | Crafting | Tailor, Leatherworker |
| Metalworking | Engineering | 14 | Crafting | Forge, Recycler, Scrapyard |
| Mechanics | Engineering | 18 | Metalworking | Mechanics Shed, Repair Station, Fuel Depot |
| Water Purification | Engineering | 12 | Basic Building | Water Collector, Purifier Station |
| Trade | Trade | 10 | Basic Building | Market Stall, Trading Post |
| Diplomacy | Trade | 14 | Trade | Signal Tower, Scout Camp |
| Community | Community | 10 | — | Inn, Tavern, Shrine, Bathhouse |
| Brewing | Community | 12 | Community + Farming | Brewery, Kitchen, Smokehouse, Hunting Lodge |
| Justice | Community | 14 | Community | Prison Cage, Food Cellar |
| Literacy | Education | 8 | — | School |
| Scholarship | Education | 16 | Literacy | Library |

**Knowledge income:** +0.5 + 0.05 × survivors per day (passive), Study (books), Library/School jobs,
wise elders/hermits/scholars, radio/map/glow events, and some ruins.

---

## 🎒 12. Gear & equipment

Equip in the Survivors/Inventory panel. Some items grant passive benefits while carried/equipped.

| Item | Kind / slot | Key stat | Notes |
|---|---|---|---|
| 🪓 Stone / Iron / Steel Axe | axe (tier 1–3) | durability 60/140/240 | faster wood, +2 wood yield per tier |
| ⛏ Stone / Iron / Steel Pickaxe | pick (tier 1–3) | durability 60/140/240 | mine ore/coal/stone; higher tier = faster |
| ⛏ Shovel | shovel | durability 100 | digs sand & clay |
| 🌾 Hoe | hoe | durability 100 | halves planting time |
| 🔪 Knife | knife | durability 100 | more meat/hides/bones from hunting |
| 🔨 Hammer | hammer | durability 100 | build **20% faster** |
| 🪚 Saw | saw | durability 100 | planks **40% faster** |
| 🪝 Crowbar | crowbar | durability 120 | faster salvage, extra scrap from ruins |
| 🏹 Bow | weapon | damage **4**, durability 100 | required for ranged hunting & combat |
| 🗡 Salvaged Weapon | weapon | damage **6**, durability 140 | 30% chance/attack to spend 1 Ammo for +6–12 dmg |
| 🎣 Fishing Rod | rod | durability 100 | fish at a water source |
| 🪣 Bucket | bucket | — | fetch **5** water at once |
| 🧭 Canteen | canteen | — | fetch **3** water, use **20% less** travel thirst |
| 🔥 Torch | light | vision **2**, durability 240 | night vision, deep-underground light |
| 🏮 Lantern | light | vision **3**, durability 720 | better light, longer burn |
| 🧭 Home Compass | compass | — | shows the bearing/distance to the settlement |
| 🔭 Binoculars | survey | — | enables **Survey** (reveals 10-tile radius) |
| 🛌 Sleeping Bag | bedroll | weight 2 | better sleep warmth/recovery |
| ⛺ Portable Tent | tent | weight 3 | shelter from rain, fewer incidents |
| 🎒 Canvas Backpack | pack | capacity **45** | carry more |
| 🎒 Framed Backpack | pack | capacity **65** | carry more |
| 🧥 Warm Coat | clothing | insulation **3** | protects against cold |
| 🧥 Raincoat | clothing | insulation **1**, rainproof | no rain penalties |
| 🛡 Leather Armor | clothing | armor **3** | reduce incoming damage by 3 |

**Weights matter:** carrying capacity is limited by your pack (default **30** without a pack).
Resource weights (`RESOURCE_WEIGHTS`) e.g. Wood 1, Stone 1.2, Metal 0.8, Water 0.6, Food 0.3, Seeds 0.05.

---

## ⚔️ 13. Enemies, hunting & combat

### Enemy stats & loot
| Enemy | HP | Damage | Danger | Loot |
|---|:---:|:---:|:---:|---|
| Wild Dogs | 12 | 3–6 | 1 | Hides, Bones, Meat |
| Wolves | 18 | 5–9 | 2 | Hides, Bones, Meat |
| Bear | 36 | 10–16 | 4 | Hides, Bones, Meat, Leather |
| Infected Wanderer | 14 | 4–7 | 2 | Cloth, Bones |
| Scavenger | 16 | 4–8 | 2 | Metal, Cloth, Food |
| Raider | 22 | 6–10 | 3 | Weapons, Ammo, Leather |
| Bandits | 28 | 7–12 | 3 | Weapons, Ammo, Food, Alcohol |
| Mutated Beast | 30 | 8–14 | 4 | Hides, Meat, Bones |
| Desperate Survivor | 14 | 3–6 | 1 | Cloth, Food |
| Cultist | 20 | 6–10 | 3 | Books, Herbs, Cloth |
| Rogue Hunter | 24 | 7–11 | 3 | Weapons, Meat, Hides |
| Forest Beast | 22 | 6–10 | 3 | Hides, Meat, Bones |
| Night Stalker | 30 | 9–14 | 4 | Hides, Bones, Herbs |
| Thieves | 14 | 3–6 | 1 | Cloth, Tools, Food |
| Warlord Scout | 30 | 10–15 | 5 | Weapons, Ammo, Steel |

### Huntable animals (ranged hunting)
Requires a **Bow** and **1 Arrow** (arrow consumed). Hit chance = `0.45 + combat×0.04 + (Hunter +0.12)`,
clamped to **0.25–0.88**. Costs **30 min + 4 ⚡**. Animals **flee on contact** if you get close.

| Animal | Icon | ⏳/⚡ | Flee | Loot |
|---|:---:|:---:|:---:|---|
| Rabbit | 🐇 | 30/4 | 85% | Meat, Hides, Bones |
| Deer | 🦌 | 30/4 | 75% | Meat 2–4, Hides 1–2, Bones 1–2 |
| Boar | 🐗 | 30/4 | 55% | Meat 2–3, Hides, Bones · **fights back 3–7** |
| Wild Turkey | 🦃 | 30/4 | 80% | Meat 1–2, Bones |
| Mountain Goat | 🐐 | 30/4 | 65% | Meat 2–3, Hides, Bones |

### Combat math
- **You strike:** `rint(3,7) + weapon damage (Bow 4 / Salvaged 6) + Combat skill + (Brave +2)`.
- **Ammo bonus:** with a Salvaged Weapon, 30% chance per strike to spend 1 Ammo for an extra **6–12** damage.
- **Enemy hits you:** `rint(dmg min, dmg max) − armor (Leather Armor 3)`, minimum 1.
- **Flee chance:** `0.40 + (Quick +0.20) + (Cowardly +0.15) − danger×0.05`.
  - Fled successfully → **−10 ⚡** and **15 min** pass.
- **Win:** **+0.5 Combat skill** (cap 20), **+0.5 Reputation**, loot, **15 min** pass.
- **Lose:** you lose **20%** of carried Wood/Food/Water/Cloth/Metal/Weapons, then **15 min** pass.
  (Food, Water, Medicine, Bandages, Arrows, Ammo, Repair Kits are kept.)

---

## ❤️ 14. Survival reference

### Needs decay — per phase tick (`decaySurvivor`)
| Need | Drain / phase | Notes |
|---|:---:|---|
| 🍽 Hunger | −4 | children ×0.5 |
| 💧 Thirst | −5 | children ×0.5 |
| ⚡ Energy | −3 (player) / −2 (others) | |
| 🔥 Warmth | −6 night / −2 day | children ×0.5; **+4** if a fire burns at night |

### Health damage thresholds
| Condition | Health loss |
|---|---|
| Hunger < 15 | −1 / phase |
| Hunger ≤ 0 | −3 / phase |
| Thirst < 15 | −2 / phase |
| Thirst ≤ 0 | −5 / phase |
| Warmth < 15 | −1 day / −2 night |
| Warmth ≤ 0 | −1 day / −4 night |
| Diseased | −2 / phase |

**Morale** = `happiness × 0.5 + safety × 0.5`.

### Storage
- Base cap **80** per resource; sheds +100, warehouses +400, fuel depots +50.
- Food/Crops/Meat cap = base + **200 per Food Cellar**.
- Overflow produced above the cap is **lost**. Food stored above 90% can spoil.

### Camps & fires
- Field fire: **1 Wood = 240 min (4 h)** of fuel.
- Campfire (settlement): consumes **1 Wood/day** automatically (evening), or goes out.
- Rest recovers **14 ⚡/hour** (cap 60). Sleep recovers 4–14 ⚡/hour by shelter (§5).

### Raids & losses
- Hostile entities near the settlement can **attack** (moved each phase).
- A raid deals damage to defenders/buildings; walls (Palisade/Gate/Trap Line) reduce damage.
- When you lose a fight you lose 20% of Wood/Food/Water/Cloth/Metal/Weapons.

---

## 🗺️ 15. Map features, entities & events

Features are one-shot or charged nodes on the map. Harvesting consumes a charge (if finite)
and the matching tool's durability, and costs time (usually **5–20 min**, minerals use the Mine time).
Loot amounts are ranges.

### Food & forage nodes
| Feature | Icon | Biomes | Loot (per harvest) | Charges |
|---|---|:--:|---|:--:|
| Berry Bush | 🫐 | plains, forest, hills | Food 1–3 | 2 (renewable) |
| Mushroom Patch | 🍄 | forest, deep forest, swamp | Food 1–2, Herbs 0–1 | 2 (renewable) |
| Wild Herbs | 🌿 | plains, forest, swamp, hills | Herbs 1–2 | 2 (renewable) |
| Apple Tree | 🍎 | plains, forest | Food 2–4 | 2 (renewable) |
| Edible Roots | 🥕 | plains, forest, hills | Food 1–2, Seeds 0–1 | 2 (renewable) |
| Wild Wheat | 🌾 | plains | Crops 1–3, Seeds 1–2 | 1 (renewable) |
| Bird Nest | 🥚 | forest, hills, mountain | Food 1–2, Cloth 0–1 | 1 |
| Beehive | 🐝 | forest, hills | Food 2–4, Alcohol 0–1 | 1 · **sting −2–5 HP** |
| Animal Carcass | 🦌 | plains, forest, hills, mountain | Meat 1–3, Hides 0–2, Bones 1–2 | 1 |
| Seed Pods | 🌰 | plains, forest | Seeds 2–4 | 1 (renewable) |
| Fishing Hole | 🐟 | plains, forest, hills | Meat 1–2, Dirty Water 0–1 | 3 |
| Reeds | 🌾 | plains, swamp, forest | Fiber 3–6 | 3 (renewable) |

### Wood / stone / metal nodes
| Feature | Icon | Biomes | Loot | Charges |
|---|---|:--:|---|:--:|
| Dead Tree | 🪾 | plains, forest, desert, radio | Wood 2–4 | 1 |
| Fallen Log | 🪵 | forest, deep forest, hills | Wood 4–8 | 1 |
| Pine Grove | 🌲 | forest, deep forest, mountain | Wood 3–6, Herbs 0–1 | 3 |
| Ancient Oak | 🌳 | deep forest | Wood 8–12, Planks 0–2 | 1 |
| Stone Outcrop | 🪨 | hills, mountain, desert | Stone 2–5 | 2 |
| Boulder Pile | 🗿 | mountain, hills | Stone 3–6 | 2 |
| Clay Deposit | 🟤 | swamp, plains | Clay 2–5 | 2 |
| Sand Bank | 🟤 | plains, desert | Sand 3–5 | 3 |
| Iron Vein | ⛓ | mountain, hills | **Ore 3–5**, Stone 1–2 | 2 |
| Coal Seam | ⬛ | mountain, hills | Charcoal 2–5 | 2 |
| Old Bones | 🦴 | plains, desert, radio | Bones 1–3 | 1 |
| Scrap Pile | 🔩 | ruins, desert, road | Metal 2–4, Nails 0–2 | 2 |
| Glass Shards | 🪟 | ruins | Glass 1–3 | 1 |
| Rope Pile | 🪢 | ruins, road | Rope 2–4 | 1 |

### Water sources
| Feature | Icon | Biomes | Loot | Charges |
|---|---|:--:|---|:--:|
| Spring | 💧 | mountain, hills, forest | Clean Water 1–2 | 99 |
| Old Well | 🕳 | plains, ruins | Clean Water 1–2 | 99 |
| Hot Spring | ♨ | mountain, hills | Clean Water 1–2 · **heal +6, warmth +25** | 99 |
| Pond | 🟦 | plains, forest, swamp | Dirty Water 2–4 | 99 |
| Stream | 〰 | plains, forest, hills | Dirty Water 2–4 | 99 |
| Rain Pool | 💦 | plains, ruins | Dirty Water 1–3 | 1 |

### Ruins & scavenge sites (selection of the richest)
| Feature | Icon | Biomes | Loot |
|---|---|:--:|---|
| Factory Ruins | 🏭 | ruins | Metal 2–5, Parts 1–3, Components 0–2, Iron 0–2 |
| Hospital Ruins | 🏥 | ruins | Medicine 1–3, Herbs 0–2, Cloth 1–3, Books 0–1 |
| Police Station | 🚓 | ruins | Weapons 0–1, Ammo 1–3, Metal 1–3 |
| Library Ruins | 📚 | ruins | Books 2–5 · **+1–3 knowledge** |
| Shopping Mall | 🏬 | ruins | Cloth 2–4, Food 1–2, Glass 0–2, Alcohol 0–1 |
| Train Station | 🚉 | ruins | Metal 2–4, Parts 1–3, Steel 0–2 |
| Power Station | ⚡ | ruins | Batteries 1–2, Components 1–3, Parts 1–2 |
| Wrecked Truck | 🚛 | road | Fuel 1–3, Oil 0–2, Metal 1–3 |
| Crashed Helicopter | 🚁 | plains, desert, radio, mountain | Components 2–4, Fuel 1–2, Steel 1–2, Parts 1–3 (rare) |
| Wrecked Tank | 🪖 | road, ruins, radio | Steel 1–3, Ammo 1–3, Weapons 0–1 (rare) |
| Ammo Crate | 🎁 | ruins, road, radio | Ammo 2–5, Weapons 0–1 (rare) |
| Bunker Hatch | 🔒 | ruins, mountain, radio | Food, Water, Medicine, Weapons, Books, Batteries (rare) |
| (plus houses, cabins, churches, farms, cars, corpses, toolboxes, cellars…) | | | see `MAP_FEATURES` in `js/data.js` |

### Hazards
| Feature | Icon | Biomes | Effect |
|---|---|:--:|---|
| Radioactive Pool | ☢ | radio, swamp | 5–15 damage · may disease · loot Components/Parts |
| Toxic Cloud | 💨 | radio, swamp | 3–8 damage |
| Landmine | 💣 | road, ruins, radio | 15–30 damage (hidden) |
| Rusty Trap | 🪤 | forest, deep forest, plains | 5–12 damage (hidden) |
| Pitfall | 🕳 | forest, ruins, hills | 4–10 damage, −25 ⚡ (hidden) |
| Collapsed Floor | ⚠ | ruins | 3–8 damage (hidden) |
| Spike Trap | ⚠ | forest, ruins | 6–14 damage (hidden) |
| Acid Puddle | 🧪 | radio, ruins | 2–6 damage |
| Quicksand | 🟫 | swamp, desert | −30 ⚡ |
| Plague Nest | 🦠 | swamp, ruins | disease (70% risk) |
| Mass Grave | ⚰ | ruins, radio | Bones 3–5 · disease risk 30% |
| Storm Field | ⛈ | plains, hills | 3–8 damage (30% charge risk) |
| Burning Wreck | 🔥 | road, ruins | Charcoal 2–4 · 2–5 damage |
| Ash Pit | 🌫 | radio, desert | 1–4 damage, −15 ⚡ |

### Oddities & events (`triggerEvent`)
| Feature | Icon | Effect |
|---|---|:--:|
| Strange Shrine | ⛩ | 50%: +2–5 🧠 · else −3–8 HP, −10 morale |
| Old Radio | 📻 | reveals a 7-tile area |
| Music Box | 🎵 | **+15 happiness** |
| Hidden Cache | 💰 | 3 random resource stacks (Food/Water/Cloth/Tools/Medicine/Ammo/Weapons) |
| Glowing Woods | 🌌 | 50%: +3–6 🧠 · else disease |
| Map Fragment | 🗺 | reveals a 10-tile area |
| Old Signal Fire | 🔥 | 50%: a friendly survivor appears nearby |
| Graveyard | 🪦 | Bones 2–4 · 25% morale −10 |

### Hostile & huntable entities on the map
- **Hostile spawns** reference `ENEMIES` (e.g. 🐕 Wild Dogs, 🐺 Wolf, 🐻 Bear, 🧟 Infected, 🥷 Raider,
  ⚔ Bandit Camp, 👹 Mutant Beast, 🕯 Cultist, 🦁 Forest Beast, 🦇 Night Stalker, 🕵 Thief,
  🏹 Rogue Hunter, 🎖 Warlord Scout, 🗡 Scavengers, 😵 Desperate Wanderer).
- **Huntables:** 🐇 Rabbit, 🦌 Deer, 🐗 Boar, 🦃 Wild Turkey, 🐐 Mountain Goat.
- Hostiles within 2 tiles of the settlement **attack** during the phase move.

### Friendly NPCs (interaction outcomes)
| NPC | Icon | Options (summary) |
|---|---|:--:|---|
| Lost Child | 🧒 | recruit the child into your followers |
| Wounded Survivor | 🤕 | spend **1 Medicine** to recruit (70 HP) · or bind wounds (55% survive) · leave |
| Wanderer | 🚶 | recruit |
| Old Hermit | 🧙 | listen: +3–6 🧠, maybe a Book · 35% recruit (Teacher, +2 Medicine) |
| Trader | 🧺 | opens a trade offer |
| Friendly Hunter | 🏹 | recruit (+2–4 Meat, +1–2 Hides) · trade 2 Ammo → 4 Meat |
| Refugees | 👨‍👩‍👧 | take in a family of 2–3 + a child · refuse (−5 morale) |
| Wise Elder | 👴 | listen: +4–8 🧠 · recruit (Leader trait) |
| Doctor | 🩺 | recruit: +30 HP & cures disease (Medic) |
| Mechanic | 🔧 | recruit (+2–4 Parts, +1–2 Tools) · trade 5 Metal → 2 Tools + 2 Parts |
| Wandering Scholar | 📖 | recruit (+1–3 Books, +2–4 🧠, Teacher) |
| Loyal Dog | 🐶 | adopt (combat 3, hunting 3, Guard) |
| The Old Sage | 🧓 | unique chat near the village |

### Trader offers (village or field)
Choose to **give** the left for the **get** right:
- 10 Wood → 6 Food
- 8 Wood → 6 Cloth
- 6 Food → 2 Medicine
- 6 Metal → 2 Tools
- 4 Herbs → 6 Water
- 6 Cloth → 3 Leather
- 4 Bones → 3 Seeds
- 2 Alcohol → 1 Book
- 4 Charcoal → 1 Iron

---

## 📌 Flight plan for future changes

1. Change the data/code.
2. Update the matching section in **this** file and bump the **Last updated** date at the top.
3. Run `node tools/gen-pricing.js` to refresh the generated `PRICING.md`.
4. Syntax-check the JS you touched: `node --check js/<file>.js`.
5. Playtest in the browser — this document was written by reading the code, not by playing.

*End of reference.*
