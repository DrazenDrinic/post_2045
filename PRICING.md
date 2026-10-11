<div align="center">

# ☢️ Post 2045 — Pricing & Economy Reference

**Everything the player pays for, what it costs, and what it returns.**

<sub>🤖 Auto-generated from `js/data.js` by `tools/gen-pricing.js` — <b>do not edit by hand</b>. Run <code>node tools/gen-pricing.js</code> to refresh after changing the game.</sub>

</div>

---

> [!NOTE]
> The game runs on **four currencies**:
>
> | | Currency | Unit | Notes |
> |---|---|---|---|
> | ⏳ | **Time** | *phases* | `1 phase = 6 hours` · `4 phases = 1 day`. Most actions cost game minutes. |
> | 📦 | **Resources** | items | 41 resource types. |
> | 🧠 | **Knowledge** | points | spent only on the research tree. |
> | ⚡ | **Energy** | 0–100 | drained by almost every action and every step. |

> [!TIP]
> This reference is also in-game: **📖 Guide → 💰 Prices & Costs**, with a **🔎 Search the Game** box (type e.g. `clean water` to see everything that makes or uses it).

### Contents

1. [⏳ Time costs](#-1--time-costs)
2. [📦 Resource costs — crafting & survival](#-2--resource-costs--crafting--survival)
3. [🏘️ Buildings](#-3--buildings)
4. [🧑‍🔧 Jobs & workers](#-4--jobs--workers)
5. [🧠 Research tree](#-5--research-tree)
6. [🎒 Gear & equipment](#-6--gear--equipment)
7. [⚔️ Creatures & combat](#-7--creatures--combat)
8. [❤️ Survival & settlement reference](#-8--survival--settlement-reference)

---

## ⏳ 1 · Time costs

### 🎒 Quick actions

| Action | Time | ⚡ | Notes |
|---|---:|---:|:--|
| 🪓 Chop wood | **30 min** | 3 | 3–5 wood; axe cuts time (see below) |
| 🌿 Forage | **20 min** | 2 | food, herbs and seeds |
| 🔥 Boil water | **15 min** | 1 | 2 dirty + 1 wood → 2 clean (at a fire) |
| 🧪 Purify water | **10 min** | 1 | 2 dirty + 1 charcoal → 2 clean |
| 🍳 Cook | **20 min** | 1 | 1 meat or 2 crops + 1 wood → 3 food |
| ♨️ Warm up | **15 min** | — | +30 warmth at a fueled fire |
| 🎺 Gather spirits | **30 min** | 2 | +5 happiness to the nearby group |
| 🏹 Craft arrows | **15 min** | 1 | 1 wood + 1 bones → 5 arrows |
| 🦌 Hunt | **30 min** | 4 | needs a carried bow + 1 arrow |
| 🥋 Train (combat) | **60 min** | 5 | +0.5 combat skill |
| 📖 Study a book | **60 min** | 2 | 1 book → +2–5 knowledge |
| 🪣 Fetch water | **10 min** | 1 | 2 water; canteen 3; bucket 5 |
| 🧵 Gather fiber | **15 min** | 2 | reeds / plant fiber |
| 🪨 Collect loose stone | **20 min** | 2 | no tools needed |
| ⛏ Mine | **30 min** | 2 | needs a pickaxe (before tier bonus) |
| 🪏 Dig | **20 min** | 3 | needs a shovel → 17 min with one |
| 🎣 Fish | **30 min** | 2 | needs a rod beside water |
| 🩹 Bandage | **5 min** | — | 1 bandage → +15 HP, clears injury |
| 💊 Treat illness | **5 min** | — | 1 medicine → +25 HP, clears disease · 5 min |
| 💤 Rest | **30 min** | — | +5 energy up to 60 before phase decay |
| 🛏️ Sleep | **2 / 4 / 8 h** | — | recovery 10–14 energy/hr by shelter; can be interrupted |
| 🍞 Eat / 💧 Drink | **free** | — | eat: 1 food → +30 hunger; drink: 1 clean (+30) or dirty (+20, 15% illness) |

<sub>⚙ an axe/pickaxe/shovel cuts time by `max(0.45, 1 − tier×0.15)` → 15 / 30 / 45 % at tier 1 / 2 / 3. Planks take ×0.6 time with a saw (15 → 9 min).</sub>

### 🏗️ Building & field activities

| Activity | Time | Notes |
|---|---:|:--|
| 🔨 Build tent / crafting table / garden / rain barrel | **45 min** | starter builds |
| 🔨 Build any housing (shelter, huts, cabin) | **180 min** | |
| 🔨 Build warehouse / town hall / barracks / community hall | **480 min** | major structures |
| 🔨 Build any other structure | **120 min** | |
| — carried 🔨 hammer | **×0.8** | −20% on every build |
| 🧰 Repair a tool | **10 min** | 1 repair kit |
| 🔦 Refuel a light | **10 min** | 1 wood (torch) / 1 oil (lantern) |
| ⛺ Pitch portable tent | **15 min** | deploy carried tent |
| 🛌 Lay sleeping bag | **5 min** | deploy carried bag |
| 🛖 Build a lean-to | **30 min** | 4 wood + 4 fiber |
| 🔥 Fuel a field campfire | **10 min** | 1 wood → 4 h fuel |
| 🎒 Pack camp | **10 min** | recover gear; extinguish fire |
| 🧭 Survey | **15 min** | reveal a 10-tile radius |
| ⛏ Claim mine / fishing site | **30 min** | 2 wood + 1 rope |
| 📦 Establish supply outpost | **30 min** | 6 wood + 1 rope |
| 💕 Court a survivor | **30 min** | +18–30 heart (leader +8) |
| ⚔️ Combat (win / lose / flee) | **15 min** | charged once; a fatal defeat resolves immediately |

### 🗺️ Exploring ruins — *Quick Scout*

Departs town, consumes **1 food + 1 clean water**, and has a **12-hour cooldown per route**. Loot enters the backpack; excess stays in a ground cache. Combat adds its own 15 minutes.

| Time | Destinations |
|---:|:--|
| **60 min** (1h) | 🌲 Forest · 🛣 Abandoned Road · 🏚 Ruined House · 🏞 Riverbank |
| **120 min** (2h) | 🛒 Old Market · 🚓 Police Station · 🏥 Hospital Ruins · ⛽ Gas Station · 🚜 Farm Ruins · ⚔ Raider Camp · 🏫 Old School |
| **180 min** (3h) | 🏭 Factory Ruins · 🪖 Military Checkpoint · 🌳 Deep Forest · 🚪 Underground Shelter |

### 🕳️ Underground sites

Mines, caves, subways and storm drains. Each route has a **24-hour cooldown**. Shallow searches take **45 min**, deep searches **90 min** (deep needs a fueled light; mines need a pickaxe). Searching a surface feature costs 5 min (renewable plants), 20 min (ordinary), or 30 min (mineral nodes, before tool bonus).

### 🚶 World-map travel (per tile)

From the `TRAVEL` table; both values are multiplied by condition penalties (cold, hunger, thirst, injury, disease).

| Terrain | Time | ⚡ Energy |
|---|---:|---:|
| Road | **5 min** | 0.3 |
| Plains / Village | **6 min** | 0.4 |
| Forest / Hills / Ruins | **10 min** | 0.6 |
| Snow / Irradiated / Wasteland | **12 min** | 0.7 |
| Deep Forest / Mountain / Swamp | **15 min** | 0.9 |
| River / lake | — | impassable |

⚙ Each step also drains **0.12 hunger** and **0.18 thirst** (**0.4** in wasteland); a canteen cuts travel thirst ×0.8. Cold tiles cost 0.6 warmth without insulation. Needs also decay on six-hour phase boundaries. Night is 20:00–06:00. In **Live** mode each tick advances **15 game minutes** (12s / 6s / 2.5s real-time at 1× / 2× / 3×).

---

## 📦 2 · Resource costs — crafting & survival

### 🛠️ Crafting & survival actions

| Action | Cost | → Yields |
|---|---|---|
| 🔥 Boil water | 2 💧 dirty water · 1 🪵 wood | 2 💧 clean water |
| 🧪 Purify water | 2 💧 dirty water · 1 ⬛ charcoal | 2 💧 clean water |
| 🍳 Cook (meat) | 1 🍖 meat · 1 🪵 wood | 3 🍞 food |
| 🍳 Cook (crops) | 2 🌾 crops · 1 🪵 wood | 3 🍞 food |
| 🍞 Eat | 1 food | +30 hunger |
| 💧 Drink | 1 clean water *(or dirty — 15% illness)* | +30 / +20 thirst |
| 🩹 Bandage | 1 🧵 cloth · 1 💧 clean water → 3 bandages; 1 per use | +15 HP, clears injury |
| 💊 Treat illness | 1 medicine | +25 HP, clears disease |
| ♨️ Warm by fire | nearby fueled fire | +30 warmth |
| 🏹 Craft arrows | 1 🪵 wood · 1 🦴 bones | 5 🏹 arrows |
| 🦌 Hunt | carried bow + 1 arrow | 🍖 meat · 🦌 hides · 🦴 bones |
| 📖 Study | 1 book | +2–5 🧠 knowledge |

### 🧪 Crafting recipes

Read straight from `RECIPES`. Hand recipes work anywhere; others need a station and sometimes research.

| Item | Ingredients | → Yields | Time | Station |
|---|---|---|---:|:--|
| Twist rope | 3 🧵 plant fiber | 1 🪢 rope | 10 min | hand |
| Weave cloth | 4 🧵 plant fiber | 1 🧵 cloth | 15 min | Crafting Table |
| Cut planks | 2 🪵 wood | 2 🟫 planks | 15 min | Crafting Table |
| Clean bandages | 1 🧵 cloth · 1 💧 clean water | 3 💊 bandages | 10 min | hand |
| Repair kit | 2 🔩 metal scraps · 1 🧵 cloth | 1 🛠 repair kits | 20 min | Crafting Table |
| Stone Axe | 2 🪵 wood · 3 🪨 stone · 1 🪢 rope | Stone Axe | 20 min | hand |
| Stone Pickaxe | 2 🪵 wood · 4 🪨 stone · 1 🪢 rope | Stone Pickaxe | 25 min | hand |
| Shovel | 2 🪵 wood · 2 🔩 metal scraps | Shovel | 25 min | Crafting Table |
| Hoe | 2 🪵 wood · 2 🪨 stone · 1 🪢 rope | Hoe | 20 min | hand |
| Knife | 2 🔩 metal scraps · 1 🪵 wood | Knife | 20 min | Crafting Table |
| Hammer | 1 🪵 wood · 2 🪨 stone | Hammer | 20 min | hand |
| Saw | 3 🔩 metal scraps · 1 🪵 wood | Saw | 30 min | Crafting Table |
| Crowbar | 2 ⛓ iron | Crowbar | 30 min | Forge |
| Bow | 3 🪵 wood · 2 🪢 rope | Bow | 30 min | Crafting Table |
| Fit a salvaged weapon | 1 🗡 weapons | Salvaged Weapon | 10 min | hand |
| Fishing Rod | 2 🪵 wood · 1 🪢 rope · 1 🦴 bones | Fishing Rod | 20 min | hand |
| Bucket | 2 🔩 metal scraps · 1 🪢 rope | Bucket | 20 min | Crafting Table |
| Canteen | 1 🟫 leather · 1 🪢 rope | Canteen | 20 min | Crafting Table |
| Torch | 1 🪵 wood · 1 🧵 cloth | Torch | 5 min | hand |
| Lantern | 2 🔩 metal scraps · 1 🪟 glass · 1 🛢 oil | Lantern | 30 min | Crafting Table |
| Home Compass | 2 ⛓ iron · 1 🪟 glass · 1 🔧 parts | Home Compass | 30 min | Crafting Table |
| Binoculars | 3 🪟 glass · 2 🔩 metal scraps · 2 🔧 parts | Binoculars | 45 min | Workshop |
| Sleeping Bag | 4 🧵 cloth · 1 🪢 rope | Sleeping Bag | 25 min | hand |
| Portable Tent | 6 🧵 cloth · 2 🪢 rope · 2 🪵 wood | Portable Tent | 40 min | Crafting Table |
| Canvas Backpack | 4 🧵 cloth · 2 🪢 rope | Canvas Backpack | 30 min | Crafting Table |
| Framed Backpack | 4 🟫 leather · 2 🟫 planks · 3 🪢 rope | Framed Backpack | 45 min | Workshop |
| Warm Coat | 4 🧵 cloth · 2 🦌 hides | Warm Coat | 40 min | Crafting Table |
| Raincoat | 3 🧵 cloth · 1 🛢 oil | Raincoat | 35 min | Crafting Table |
| Leather Armor | 4 🟫 leather · 2 🪢 rope | Leather Armor | 45 min | Workshop |
| Bone arrows | 1 🪵 wood · 1 🦴 bones | 5 🏹 arrows | 15 min | hand |
| Burn charcoal | 3 🪵 wood | 2 ⬛ charcoal | 30 min | Charcoal Kiln |
| Smelt ore | 2 ⛓ iron ore · 1 ⬛ charcoal | 1 ⛓ iron | 30 min | Furnace |
| Recycle scrap iron | 3 🔩 metal scraps · 1 ⬛ charcoal | 1 ⛓ iron | 30 min | Furnace |
| Forge steel | 2 ⛓ iron · 2 ⬛ charcoal | 1 ⚙ steel | 45 min | Forge + Metalworking |
| Fire glass | 3 🟤 sand · 1 ⬛ charcoal | 2 🪟 glass | 30 min | Furnace |
| Fire bricks | 3 🟤 clay · 1 ⬛ charcoal | 3 🧱 bricks | 30 min | Furnace |
| Forge nails | 1 🔩 metal scraps | 4 📌 nails | 15 min | Workshop |
| Boil water | 2 💧 dirty water · 1 🪵 wood | 2 💧 clean water | 15 min | fire |
| Filter water | 2 💧 dirty water · 1 ⬛ charcoal | 2 💧 clean water | 10 min | hand |
| Cook meat | 1 🍖 meat · 1 🪵 wood | 3 🍞 food | 20 min | fire |
| Cook crops | 2 🌾 crops · 1 🪵 wood | 3 🍞 food | 20 min | fire |
| Compost scraps | 1 🌾 crops · 2 🧵 plant fiber | 2 🌱 compost | 20 min | hand |
| Iron Axe | 3 ⛓ iron · 2 🪵 wood · 1 🪢 rope | Iron Axe | 40 min | Forge + Toolmaking |
| Steel Axe | 3 ⚙ steel · 2 🪵 wood · 1 🪢 rope | Steel Axe | 40 min | Forge + Metalworking |
| Iron Pickaxe | 3 ⛓ iron · 2 🪵 wood · 1 🪢 rope | Iron Pickaxe | 40 min | Forge + Toolmaking |
| Steel Pickaxe | 3 ⚙ steel · 2 🪵 wood · 1 🪢 rope | Steel Pickaxe | 40 min | Forge + Metalworking |

### 🎒 Camping & field work

All personal pickups and crafting outputs enter your pack, even at home. Return on or next to the home campfire or a storage building to transfer. Pack capacity is **30 load**, **45 with a canvas backpack**, or **65 with a framed backpack**, including equipped gear. Most small items weigh 0.05–0.3; wood weighs 1, stone/ore 1.2. Water containers hold **3 units** initially; each carried canteen adds **3**, each bucket **5**. Clean and dirty water share container capacity and also count toward pack weight.

| Field action | Materials | Time |
|---|---|---:|
| Gather fiber | none | 15 min |
| Collect loose stone | none | 20 min |
| Mine | pickaxe (uses durability) | 30 min (before tier bonus) |
| Dig | shovel (uses durability) | 17 min with a shovel |
| Fish | rod + nearby water | 30 min |
| Build lean-to | 4 wood + 4 fiber | 30 min |
| Fuel field campfire | 1 wood → 4 h fuel | 10 min |
| Repair tool | 1 repair kit | 10 min |
| Refuel light | 1 wood / 1 oil | 10 min |
| Claim mine / fishing site | 2 wood + 1 rope | 30 min |
| Establish supply outpost | 6 wood + 1 rope | 30 min |

Claimed mines and fishing sites draw from finite reserves shared with the player; exhausted sources recover on their game-time schedule. Haulers recover up to **8 resource units/day** from supply outposts, limited by base space. Full storage pauses production before inputs are spent.

### 🌾 Farming & work orders

- **Plant:** 1 seed, 20 min (10 with a hoe). **Water:** 1 clean water, 5 min. **Fertilize:** 1 compost, 5 min (+30 fertility). **Harvest:** 10 min.
- **Fence a plot:** 4 wood, 20 min (stops wildlife). **Irrigate a plot:** 4 wood + 4 clay + 1 rope, 30 min (auto-draws stored water).
- Base growth: vegetables 2d, grain 3d, fiber crop 3d, medicinal herbs 2.5d, orchard 4d. Moisture, fertility and cold modify growth.
- Yields ×1.5 on a crop field, ×2 in a greenhouse; **seeds are never multiplied**. Mature crops return seeds; orchards regrow without replanting.
- Work orders at a workplace spend the same recipe ingredients as hand crafting and replace the building's default output; reserves protect essential inputs.

| Crop | Grow time | → Harvest |
|---|---:|---|
| Vegetables | 2 d | 6 🌾 crops · 2 🌱 seeds |
| Grain | 3 d | 10 🌾 crops · 3 🌱 seeds |
| Fiber crop | 3 d | 12 🧵 plant fiber · 2 🌱 seeds |
| Medicinal herbs | 2.5 d | 7 🌿 herbs · 2 🌱 seeds |
| Orchard | 4 d | 10 🍞 food · 2 🌱 seeds *(perennial)* |

---

## 🏘️ 3 · Buildings

Costs, effects and build limits from `BUILDINGS`. **Max** is the build cap (×3 multiplier applied at load); **W** is worker slots each. *Unlock* is the research that enables it — "start" means it is buildable from the beginning.

<details open>
<summary><b>🛖 Shelter</b></summary>

| Building | Cost | Effect | Max | W | Unlock |
|---|---|---|---:|---:|:--|
| ⛺ Tent | 4 🧵 cloth · 4 🪵 wood | houses 1 | 12 | 0 | start |
| 🛖 Shelter | 10 🪵 wood · 4 🧵 cloth | houses 2 | 18 | 0 | Basic Building |
| 🏠 Wooden Hut | 25 🪵 wood · 4 📌 nails · 4 🧵 cloth | houses 3 | 24 | 0 | Basic Building |
| 🏡 Stone Hut | 25 🪨 stone · 10 🪵 wood · 6 📌 nails | houses 4; +safety | 24 | 0 | Masonry |
| 🏘 Family Cabin | 30 🪵 wood · 20 🪨 stone · 10 🟫 planks · 8 📌 nails | houses 6; +happiness | 18 | 0 | Masonry |

</details>
<details>
<summary><b>📦 Storage</b></summary>

| Building | Cost | Effect | Max | W | Unlock |
|---|---|---|---:|---:|:--|
| 📦 Storage Shed | 15 🪵 wood · 4 📌 nails | +100 shared storage load (resources and gear) | 24 | 1 | start |
| 🏬 Warehouse | 50 🪵 wood · 30 🪨 stone · 20 📌 nails · 20 🟫 planks | +400 shared storage load (resources and gear) | 12 | 1 | Large Structures |
| 🥖 Food Cellar | 20 🪨 stone · 10 🪵 wood · 10 🟤 clay | +200 food/crop/meat-only load | 12 | 0 | Justice |

</details>
<details>
<summary><b>💦 Water</b></summary>

| Building | Cost | Effect | Max | W | Unlock |
|---|---|---|---:|---:|:--|
| 🛢 Rain Barrel | 8 🪵 wood · 2 📌 nails | produces 0.5 💧 dirty water/day | 24 | 1 | start |
| 💦 Water Collector | 12 🪵 wood · 6 🔩 metal scraps · 4 📌 nails | produces 3 💧 dirty water per worker/day | 12 | 1 | Water Purification |
| 🕳 Well | 25 🪨 stone · 10 🪵 wood · 4 🪢 rope | produces 3 💧 clean water per worker/day | 9 | 1 | Masonry |
| 🧪 Purifier Station | 15 🔩 metal scraps · 5 🪟 glass · 5 🔧 parts | converts 2 💧 dirty water → 1 💧 clean water (×3/worker) | 9 | 1 | Water Purification |

</details>
<details>
<summary><b>🌾 Food</b></summary>

| Building | Cost | Effect | Max | W | Unlock |
|---|---|---|---:|---:|:--|
| 🌱 Garden Plot | 6 🪵 wood · 2 🌱 seeds | plant, water, fertilize & harvest crops (farmers automate a plot) | 24 | 1 | start |
| 🌾 Crop Field | 12 🪵 wood · 5 🌱 seeds | plant, water, fertilize & harvest crops (farmers automate a plot) | 24 | 1 | Farming |
| 🏡 Greenhouse | 20 🪵 wood · 15 🪟 glass · 8 📌 nails | plant, water, fertilize & harvest crops (farmers automate a plot) | 12 | 1 | Greenhouses |
| 🐔 Chicken Coop | 12 🪵 wood · 4 🧵 cloth | produces 3 🍞 food per worker/day | 12 | 1 | Animal Husbandry |
| 🐐 Goat Pen | 15 🪵 wood · 3 🪢 rope | produces 2 🍞 food · 0.5 🦌 hides per worker/day | 12 | 1 | Animal Husbandry |
| 🏹 Hunting Lodge | 18 🪵 wood · 1 🗡 weapons | produces 2 🍖 meat · 1 🦌 hides · 1 🦴 bones per worker/day | 9 | 2 | Brewing |
| 🥩 Smokehouse | 10 🪨 stone · 10 🪵 wood · 5 ⬛ charcoal | converts 2 🍖 meat → 3 🍞 food (×3/worker) | 9 | 1 | Brewing |
| 🍳 Kitchen | 12 🪵 wood · 6 🪨 stone · 1 🛠 tools | converts 2 🌾 crops → 3 🍞 food (×4/worker) | 9 | 1 | Brewing |
| 🐎 Animal Stable | 25 🪵 wood · 5 🪨 stone · 5 🪢 rope | produces 1 🍞 food · 0.5 🦌 hides · 0.5 🟫 leather per worker/day | 6 | 1 | Animal Husbandry |
| 🐟 Fishing Station | 8 🪵 wood · 2 🪢 rope | — | 4 | 2 | start |

</details>
<details>
<summary><b>⚕️ Medicine</b></summary>

| Building | Cost | Effect | Max | W | Unlock |
|---|---|---|---:|---:|:--|
| ⚕ Clinic | 15 🪵 wood · 10 🧵 cloth · 4 🪟 glass · 2 💊 medicine | heals 8 HP per worker; disease resistance | 6 | 1 | Medicine |
| 🌿 Herbalist Hut | 10 🪵 wood · 5 🌿 herbs | converts 2 🌿 herbs → 1 💊 medicine (×2/worker) | 9 | 1 | Herbalism |
| 💊 Medicine Workshop | 15 🪨 stone · 10 🪵 wood · 8 🪟 glass · 2 🛠 tools | converts 3 🌿 herbs · 1 💧 clean water → 2 💊 medicine (×3/worker) | 6 | 2 | Medicine |

</details>
<details>
<summary><b>🏛️ Community</b></summary>

| Building | Cost | Effect | Max | W | Unlock |
|---|---|---|---:|---:|:--|
| 🛏 Inn | 25 🪵 wood · 10 🧵 cloth · 4 📌 nails | +happiness for everyone; attracts survivors | 6 | 1 | Community |
| 🍺 Tavern | 20 🪵 wood · 10 🪨 stone · 5 📌 nails | uses 1 🍺 alcohol/day; +happiness for everyone | 6 | 1 | Community |
| 🍻 Brewery | 15 🪵 wood · 5 🪟 glass · 2 🛠 tools | converts 2 🌾 crops · 1 💧 clean water → 1 🍺 alcohol (×2/worker) | 6 | 1 | Brewing |
| ⛩ Shrine | 15 🪨 stone · 10 🪵 wood | +morale for everyone | 6 | 0 | Community |
| 🛁 Bathhouse | 20 🪨 stone · 10 🪵 wood · 10 🟤 clay · 5 💧 clean water | uses 2 💧 clean water/day; disease resistance; +happiness for everyone | 6 | 1 | Community |
| 🏛 Community Hall | 30 🪵 wood · 20 🪨 stone · 10 🟫 planks · 8 📌 nails | +morale for everyone; +reputation | 3 | 0 | Large Structures |
| 🏛 Town Hall | 40 🪵 wood · 30 🪨 stone · 15 🟫 planks · 10 📌 nails | +morale for everyone; −5 settlement danger | 3 | 0 | Large Structures |

</details>
<details>
<summary><b>📚 Education</b></summary>

| Building | Cost | Effect | Max | W | Unlock |
|---|---|---|---:|---:|:--|
| 📚 School | 15 🪵 wood · 3 📖 books · 5 🧵 cloth | generates knowledge; children grow faster | 3 | 1 | Literacy |
| 📖 Library | 20 🪵 wood · 10 📖 books · 5 🪟 glass | generates knowledge | 3 | 1 | Scholarship |

</details>
<details>
<summary><b>🪚 Crafting</b></summary>

| Building | Cost | Effect | Max | W | Unlock |
|---|---|---|---:|---:|:--|
| 🛠 Workshop | 15 🪵 wood · 5 🪨 stone · 1 🛠 tools | converts 1 🔩 metal scraps · 1 🪵 wood → 0.3 🛠 tools · 2 📌 nails (×3/worker) | 9 | 1 | Crafting |
| 🪚 Carpenter Hut | 12 🪵 wood · 1 🛠 tools | converts 2 🪵 wood → 1 🟫 planks (×5/worker) | 9 | 1 | Crafting |
| 🪵 Sawmill | 25 🪵 wood · 5 🔩 metal scraps · 2 🛠 tools | converts 2 🪵 wood → 2 🟫 planks (×6/worker) | 6 | 2 | Toolmaking |
| 🔨 Toolsmith | 10 🪵 wood · 10 🔩 metal scraps · 5 🪨 stone | converts 2 🔩 metal scraps · 1 🪵 wood → 1 🛠 tools · 2 📌 nails (×2/worker) | 6 | 1 | Toolmaking |
| 🪵 Charcoal Kiln | 10 🪨 stone · 5 🟤 clay | converts 3 🪵 wood → 1 ⬛ charcoal (×4/worker) | 9 | 1 | Firecraft |
| 🧵 Tailor Hut | 10 🪵 wood · 5 🧵 cloth | converts 1 🦌 hides → 2 🧵 cloth (×3/worker) | 6 | 1 | Textiles |
| 🟫 Leatherworker | 10 🪵 wood · 5 🪨 stone · 1 🛠 tools | converts 2 🦌 hides → 1 🟫 leather (×3/worker) | 6 | 1 | Textiles |
| 🛠 Crafting Table | 6 🪵 wood · 2 🪨 stone | — | 6 | 1 | start |
| ⚒ Furnace | 10 🪨 stone · 4 🟤 clay | — | 4 | 1 | start |

</details>
<details>
<summary><b>⚙️ Engineering</b></summary>

| Building | Cost | Effect | Max | W | Unlock |
|---|---|---|---:|---:|:--|
| ⚒ Forge | 20 🪨 stone · 15 🔩 metal scraps · 5 ⬛ charcoal | converts 3 🔩 metal scraps · 1 ⬛ charcoal → 1 ⛓ iron (×3/worker) | 6 | 1 | Metalworking |
| ♻ Metal Recycler | 15 🔩 metal scraps · 5 🔧 parts | produces 3 🔩 metal scraps per worker/day | 6 | 1 | Metalworking |
| 🚗 Scrapyard | 20 🔩 metal scraps · 5 🪵 wood | produces 1 🔧 parts · 1 🔩 metal scraps per worker/day | 6 | 1 | Metalworking |
| 🔧 Repair Station | 15 🔩 metal scraps · 3 🛠 tools · 5 🔧 parts | repairs buildings | 6 | 1 | Mechanics |
| ⚙ Mechanics Shed | 20 🔩 metal scraps · 10 🔧 parts · 3 🛠 tools | produces 1 🔧 parts per worker/day; converts 2 🔧 parts → 1 🔌 components (×2/worker) | 6 | 1 | Mechanics |
| ⛽ Fuel Depot | 20 🔩 metal scraps · 10 🪨 stone | +50 shared storage load (resources and gear); safe fuel/oil storage | 6 | 0 | Mechanics |

</details>
<details>
<summary><b>🛡️ Defense</b></summary>

| Building | Cost | Effect | Max | W | Unlock |
|---|---|---|---:|---:|:--|
| 🪧 Guard Post | 15 🪵 wood · 1 🗡 weapons | +safety per guard | 12 | 1 | start |
| 🗼 Watchtower | 25 🪵 wood · 10 🪨 stone · 4 📌 nails | +safety per guard; early raid warning | 9 | 1 | Fortifications |
| 🟫 Palisade Wall | 20 🪵 wood · 4 📌 nails | +5 wall (reduces raid damage) | 24 | 0 | Fortifications |
| 🚪 Gate | 15 🪵 wood · 10 🔩 metal scraps · 4 📌 nails | +10 wall (reduces raid damage) | 6 | 0 | Fortifications |
| 🪤 Trap Line | 10 🪵 wood · 5 🔩 metal scraps · 2 🪢 rope | +3 wall (reduces raid damage) | 18 | 0 | Defense |
| 🪖 Barracks | 30 🪵 wood · 15 🪨 stone · 8 📌 nails | houses 4; +safety per guard | 6 | 2 | Large Structures |
| 🥋 Training Yard | 15 🪵 wood · 10 🪨 stone · 1 🗡 weapons | trains combat skill | 6 | 1 | Warfare |
| 🗡 Armory | 20 🪨 stone · 8 ⛓ iron · 10 🪵 wood | produces 1 📦 ammunition per worker/day; converts 3 🔩 metal scraps · 1 🪵 wood → 1 🗡 weapons (×2/worker) | 6 | 1 | Warfare |
| 🔒 Prison Cage | 15 🔩 metal scraps · 10 🪵 wood · 5 📌 nails | holds troublemakers | 6 | 1 | Justice |

</details>
<details>
<summary><b>🛒 Trade</b></summary>

| Building | Cost | Effect | Max | W | Unlock |
|---|---|---|---:|---:|:--|
| 🏪 Market Stall | 10 🪵 wood · 3 🧵 cloth | +reputation; attracts traders | 9 | 1 | Trade |
| 🛒 Trading Post | 20 🪵 wood · 10 🪨 stone · 5 🧵 cloth | +reputation; attracts traders | 3 | 1 | Trade |
| 📡 Signal Tower | 25 🪵 wood · 10 🔩 metal scraps · 3 🔧 parts | attracts survivors; attracts traders | 3 | 1 | Diplomacy |
| 🏕 Scout Camp | 15 🪵 wood · 5 🧵 cloth · 1 🗡 weapons | +safety per guard; early raid warning | 6 | 1 | Diplomacy |

</details>
<details>
<summary><b>🔥 Survival</b></summary>

| Building | Cost | Effect | Max | W | Unlock |
|---|---|---|---:|---:|:--|
| 🔥 Campfire | *free* | provides warmth; lets you cook | 1 | 0 | start |

</details>

**Storage:** the campfire provides 80 shared load; each storage shed adds 100, warehouse 400, and fuel depot 50. Stored gear counts. Each food cellar adds 200 food/crops/meat-only load, used before general storage. Transfers move only what fits; the rest remains in the pack. Existing over-capacity saves retain their supplies. Food can spoil when total storage load exceeds 90% of general + cellar capacity.

### Finite resource reserves and recovery
All gathering methods and worker collection share location-based stock. Recovery starts on the first withdrawal, uses game time, and survives saves and chunk eviction. Empty sources and full packs block collection without spending time, energy or durability. Finite loot overflow stays at the source; ordinary gathering leaves uncollected stock untouched.

| Reserve family | Starting supply | Recovery cycle |
|---|---|---|
| Water source | 20 💧 clean water · 20 💧 dirty water | 5h |
| Timber | 30 🪵 wood | 48h |
| Foraging ground | 12 🍞 food · 8 🌿 herbs · 8 🌱 seeds · 20 🧵 plant fiber · 12 🌾 crops | 24h |
| Accessible deposit | 24 🪨 stone · 16 ⛓ iron ore · 16 ⬛ charcoal · 20 🟤 clay · 20 🟤 sand | 72h |
| Local wildlife | 12 🍖 meat · 8 🦌 hides · 8 🦴 bones | 24h |
| Salvage | Feature loot maximum ×4 for each material; otherwise 12 per material | 72h |

Wildlife reserves are shared within 8×8 areas; moving animals retain their origin. Built water collectors and livestock buildings have recoverable reserves scaled by building count. Crops require another growth cycle. Quick Scout retains a 12-hour route cooldown, underground routes 24 hours and event sites 72 hours. A trader has one bundle, restocking 24 hours after purchase; both payment and pack/container space are checked before exchange.

---

## 🧑‍🔧 4 · Jobs & workers

Every assignable job from `JOBS` (daily figures, before trait and condition modifiers).

<sub>⚙ Output scales with traits — hardworking +25%, lazy −25%, and matching specialists (hunter at a lodge, farmer at a field, medic at a clinic, etc.) +25–30% — and drops when a worker's happiness or health is low (floor ×0.2).</sub>

<details open>
<summary><b>General jobs (no building needed)</b></summary>

| Job | Workplace | Produces/day | Consumes/day | Notes |
|---|---|---|---|:--|
| Woodcutter | — | 3 🪵 wood | — | Cuts wood from nearby trees. |
| Lumber Picker | — | 1 🪵 wood | — | Collects loose wood safely near camp. |
| Charcoal Burner | — | 1 ⬛ charcoal | 2 🪵 wood | Burns 2 wood into 1 charcoal per day without a kiln. |
| Gatherer | — | 1 🌿 herbs · 1 🌱 seeds · 1 🍞 food | — | Forages for herbs and seeds. |
| Trapper | — | 0.5 🍖 meat · 0.5 🦌 hides · 0.5 🦴 bones | — | Sets small snares near camp. |
| Water Carrier | — | 4 💧 dirty water | — | Brings dirty water from the river. |
| Camp Cook | — | 3 🍞 food · +0.15 😊 happiness (all) | 2 🌾 crops · 1 🪵 wood | Stretches meals and keeps spirits up. |
| Chronicler | — | +0.25 🧠 knowledge | — | Records lessons learned each day. |
| Mediator | — | +0.15 ✨ morale (all) | — | Settles arguments before they sour morale. |
| Runner | — | +0.03 🤝 reputation | — | Carries messages and rumors between camps. |
| Scavenger | — | 1 🔩 metal scraps · 1 🧵 cloth · 0.5 🔧 parts | — | Scavenges nearby ruins (chance of injury). |
| Junk Picker | — | 0.5 🔩 metal scraps · 0.5 🧵 cloth · 0.25 🪟 glass | — | Searches safer scrap piles for basics. |
| Builder | — | — | — | Slowly repairs buildings. |
| Wall Builder | — | — | — | Maintains walls. |
| Stone Collector | — | 4 🪨 stone | — | Collects loose stone near the settlement. |
| Fiber Gatherer | — | 5 🧵 plant fiber | — | Collects reeds and useful plant fibers. |
| Clay Digger | — | 3 🟤 clay · 2 🟤 sand | — | Digs clay and sand for ceramics. |
| Rope Maker | — | 2 🪢 rope | 6 🧵 plant fiber | Twists fiber into useful rope. |
| Miner | — | 3 ⛓ iron ore · 2 🪨 stone | — | Works a claimed ore deposit. Claim a vein while exploring. |
| Camp Water Purifier | — | 6 💧 clean water | 6 💧 dirty water · 3 🪵 wood | Boils clean water for the settlement. |
| Fletcher | — | 10 🏹 arrows | 2 🪵 wood · 2 🦴 bones | Makes arrows for expeditions. |
| Composter | — | 3 🌱 compost | 1 🌾 crops · 2 🧵 plant fiber | Turns plant scraps into compost. |
| Expedition Hauler | — | — | — | Returns up to 8 resource units/day from caches at claimed outposts. |

</details>

<details>
<summary><b>Workplace jobs (need the building + an open slot)</b></summary>

| Job | Workplace | Produces/day | Consumes/day | Notes |
|---|---|---|---|:--|
| Hunter | Hunting Lodge | 2 🍖 meat · 1 🦌 hides · 1 🦴 bones | — | Hunts game. |
| Guard | Guard Post | — | — | Defends the settlement. |
| Watchman | Watchtower | — | — | Watches for threats. |
| Drill Sergeant | Barracks | — | — | Keeps fighters organized and ready. |
| Farmer | Crop Field | 3 🌾 crops | — | Tends the crops. |
| Gardener | Garden Plot | 1 🌾 crops | — | Tends the garden. |
| Seed Saver | Garden Plot | 2 🌱 seeds | 1 🌾 crops | Protects and sorts viable seeds. |
| Greenhouse Worker | Greenhouse | 5 🌾 crops | — | Year-round crops. |
| Rancher | Animal Stable | 1 🍞 food · 0.5 🦌 hides | — | Tends animals. |
| Chickenkeeper | Chicken Coop | 3 🍞 food | — | Manages chickens. |
| Goatkeeper | Goat Pen | 2 🍞 food · 0.5 🦌 hides | — | Manages goats. |
| Toolmaker | Toolsmith | 1 🛠 tools · 2 📌 nails | — | Makes tools. |
| Workshop Tinker | Workshop | 0.3 🛠 tools · 1 📌 nails | — | Turns scrap into useful bits. |
| Carpenter | Carpenter Hut | 1 🟫 planks | — | Cuts planks. |
| Sawyer | Sawmill | 2 🟫 planks | — | Operates the sawmill. |
| Smith | Forge | 1 ⛓ iron | — | Smelts iron. |
| Recycler | Metal Recycler | 3 🔩 metal scraps | — | Recycles metal. |
| Scrapper | Scrapyard | 1 🔧 parts · 1 🔩 metal scraps | — | Strips scrap. |
| Charcoal Maker | Charcoal Kiln | 1 ⬛ charcoal | — | Burns wood to charcoal. |
| Tailor | Tailor Hut | 2 🧵 cloth | — | Sews cloth. |
| Leatherworker | Leatherworker | 1 🟫 leather | — | Tans leather. |
| Cook | Kitchen | 3 🍞 food | — | Prepares meals. |
| Smoker | Smokehouse | 3 🍞 food | — | Smokes meat. |
| Brewer | Brewery | 1 🍺 alcohol | — | Brews alcohol. |
| Alchemist | Medicine Workshop | 2 💊 medicine | — | Brews medicine. |
| Herbalist | Herbalist Hut | 1 💊 medicine | — | Brews simple medicine. |
| Healer | Clinic | — | — | Treats the sick & wounded. |
| Nurse | Clinic | — | — | Tends recovery beds and infections. |
| Teacher | School | — | — | Teaches children. |
| Tutor | School | +0.5 🧠 knowledge | — | Turns lessons into practical knowledge. |
| Scholar | Library | — | — | Generates knowledge. |
| Archivist | Library | +1 🧠 knowledge | — | Preserves books and extracts useful ideas. |
| Innkeeper | Inn | — | — | Cheers up everyone. |
| Barkeep | Tavern | — | — | Cheers up everyone (uses alcohol). |
| Trader | Trading Post | — | — | Negotiates trade. |
| Shopkeeper | Market Stall | — | — | Runs a market stall. |
| Barterer | Market Stall | +0.05 🤝 reputation | — | Builds trust through small trades. |
| Storekeeper | Warehouse | — | — | Manages stored goods. |
| Quartermaster | Storage Shed | — | — | Keeps supplies counted and accessible. |
| Signaller | Signal Tower | — | — | Sends and reads signals. |
| Scout | Scout Camp | — | — | Scouts the wastes. |
| Pathfinder | Scout Camp | +0.35 🧠 knowledge | — | Maps safe paths and landmarks. |
| Bathhouse Keeper | Bathhouse | — | — | Runs the baths. |
| Water Worker | Water Collector | 3 💧 dirty water | — | Operates water collector. |
| Rain Tender | Rain Barrel | 0.5 💧 dirty water | — | Maintains barrels and catches runoff. |
| Well Worker | Well | 3 💧 clean water | — | Draws clean water. |
| Purifier Op | Purifier Station | 3 💧 clean water | — | Operates the purifier. |
| Armorer | Armory | 1 🗡 weapons · 1 📦 ammunition | — | Produces arms. |
| Trainer | Training Yard | — | — | Trains fighters. |
| Mechanic | Mechanics Shed | 1 🔌 components · 1 🔧 parts | — | Repairs machinery. |
| Repairman | Repair Station | — | — | Repairs buildings. |
| Warden | Prison Cage | — | — | Watches prisoners. |
| Fisher | Fishing Station | 4 🍖 meat | — | Works a claimed fishing site. |
| Equipment Crafter | Crafting Table | — | — | Fulfills the crafting table's production order. |
| Smelter | Furnace | — | — | Fulfills the furnace's production order. |

</details>

---

## 🧠 5 · Research tree

From `KNOWLEDGE`. Spend knowledge points to unlock buildings (and some jobs). Quick view by cost:

| Cost | Tech |
|:---:|---|
| **5** | Survival Basics |
| **6** | Basic Building · Crafting |
| **8** | Firecraft · Foraging · Herbalism · Defense · Literacy |
| **10** | Farming · Toolmaking · Textiles · Trade · Community |
| **12** | Masonry · Water Purification · Brewing |
| **14** | Animal Husbandry · Medicine · Fortifications · Metalworking · Diplomacy · Justice |
| **16** | Scholarship |
| **18** | Large Structures · Greenhouses · Mechanics |
| **20** | Warfare |

<details>
<summary><b>Survival</b></summary>

| Tech | Cost | Requires | Unlocks |
|---|---:|:--|:--|
| Survival Basics | 5 | — | Tent, Rain Barrel |
| Firecraft | 8 | Survival Basics | Charcoal Kiln |
| Foraging | 8 | Survival Basics | — |

</details>
<details>
<summary><b>Building</b></summary>

| Tech | Cost | Requires | Unlocks |
|---|---:|:--|:--|
| Basic Building | 6 | — | Shelter, Wooden Hut, Storage Shed |
| Masonry | 12 | Basic Building | Stone Hut, Family Cabin, Well |
| Large Structures | 18 | Masonry | Warehouse, Town Hall, Community Hall, Barracks |

</details>
<details>
<summary><b>Farming</b></summary>

| Tech | Cost | Requires | Unlocks |
|---|---:|:--|:--|
| Farming | 10 | Survival Basics | Garden Plot, Crop Field |
| Animal Husbandry | 14 | Farming | Chicken Coop, Goat Pen, Animal Stable |
| Greenhouses | 18 | Farming | Greenhouse |

</details>
<details>
<summary><b>Medicine</b></summary>

| Tech | Cost | Requires | Unlocks |
|---|---:|:--|:--|
| Herbalism | 8 | — | Herbalist Hut |
| Medicine | 14 | Herbalism | Clinic, Medicine Workshop |

</details>
<details>
<summary><b>Combat</b></summary>

| Tech | Cost | Requires | Unlocks |
|---|---:|:--|:--|
| Defense | 8 | — | Guard Post, Trap Line |
| Fortifications | 14 | Defense | Palisade Wall, Gate, Watchtower |
| Warfare | 20 | Fortifications | Armory, Training Yard |

</details>
<details>
<summary><b>Crafting</b></summary>

| Tech | Cost | Requires | Unlocks |
|---|---:|:--|:--|
| Crafting | 6 | — | Workshop, Carpenter Hut |
| Toolmaking | 10 | Crafting | Toolsmith, Sawmill |
| Textiles | 10 | Crafting | Tailor Hut, Leatherworker |

</details>
<details>
<summary><b>Engineering</b></summary>

| Tech | Cost | Requires | Unlocks |
|---|---:|:--|:--|
| Metalworking | 14 | Crafting | Forge, Metal Recycler, Scrapyard |
| Mechanics | 18 | Metalworking | Mechanics Shed, Repair Station, Fuel Depot |
| Water Purification | 12 | Basic Building | Water Collector, Purifier Station |

</details>
<details>
<summary><b>Trade</b></summary>

| Tech | Cost | Requires | Unlocks |
|---|---:|:--|:--|
| Trade | 10 | Basic Building | Market Stall, Trading Post |
| Diplomacy | 14 | Trade | Signal Tower, Scout Camp |

</details>
<details>
<summary><b>Community</b></summary>

| Tech | Cost | Requires | Unlocks |
|---|---:|:--|:--|
| Community | 10 | — | Inn, Tavern, Shrine, Bathhouse |
| Brewing | 12 | Community, Farming | Brewery, Kitchen, Smokehouse, Hunting Lodge |
| Justice | 14 | Community | Prison Cage, Food Cellar |

</details>
<details>
<summary><b>Education</b></summary>

| Tech | Cost | Requires | Unlocks |
|---|---:|:--|:--|
| Literacy | 8 | — | School |
| Scholarship | 16 | Literacy | Library |

</details>

Knowledge is earned by surviving each day (+0.5 +0.05/survivor), studying books, libraries/schools, and some NPCs and map events.

---

## 🎒 6 · Gear & equipment

Craftable equipment from `ITEMS` (+ its `RECIPES` entry). Tools wear down and are repaired with repair kits; lights burn fuel.

<details open>
<summary><b>All gear</b></summary>

| Item | Type | Key stats | Craft | What it does |
|---|---|---|---|:--|
| Stone Axe | axe | dur 60, wt 1.5 | 2 🪵 wood · 3 🪨 stone · 1 🪢 rope · 20m · hand | Faster wood gathering with increased yield. |
| Iron Axe | axe | dur 140, wt 1.5 | 3 ⛓ iron · 2 🪵 wood · 1 🪢 rope · 40m · Forge + Toolmaking | Faster wood gathering with increased yield. |
| Steel Axe | axe | dur 240, wt 1.5 | 3 ⚙ steel · 2 🪵 wood · 1 🪢 rope · 40m · Forge + Metalworking | Faster wood gathering with increased yield. |
| Stone Pickaxe | pick | dur 60, wt 2 | 2 🪵 wood · 4 🪨 stone · 1 🪢 rope · 25m · hand | Mine ore, coal and stone; higher tiers improve speed and yield. |
| Iron Pickaxe | pick | dur 140, wt 2 | 3 ⛓ iron · 2 🪵 wood · 1 🪢 rope · 40m · Forge + Toolmaking | Mine ore, coal and stone; higher tiers improve speed and yield. |
| Steel Pickaxe | pick | dur 240, wt 2 | 3 ⚙ steel · 2 🪵 wood · 1 🪢 rope · 40m · Forge + Metalworking | Mine ore, coal and stone; higher tiers improve speed and yield. |
| Shovel | shovel | dur 100, wt 1.5 | 2 🪵 wood · 2 🔩 metal scraps · 25m · Crafting Table | Dig sand and clay. |
| Hoe | hoe | dur 100, wt 1.5 | 2 🪵 wood · 2 🪨 stone · 1 🪢 rope · 20m · hand | Halves planting time. |
| Knife | knife | dur 100, wt 0.4 | 2 🔩 metal scraps · 1 🪵 wood · 20m · Crafting Table | More meat, hides and bones from hunting. |
| Hammer | hammer | dur 100, wt 1 | 1 🪵 wood · 2 🪨 stone · 20m · hand | Build 20% faster. |
| Saw | saw | dur 100, wt 1 | 3 🔩 metal scraps · 1 🪵 wood · 30m · Crafting Table | Cut planks 40% faster. |
| Crowbar | crowbar | dur 120, wt 1.5 | 2 ⛓ iron · 30m · Forge | Faster salvage and extra scrap from ruins. |
| Bow | weapon | dur 100, wt 1, dmg 4 | 3 🪵 wood · 2 🪢 rope · 30m · Crafting Table | Required for ranged hunting; equip for combat. |
| Salvaged Weapon | weapon | dur 140, wt 2, dmg 6 | 1 🗡 weapons · 10m · hand | Equip for combat; carried ammo can add damage. |
| Fishing Rod | rod | dur 100, wt 0.8 | 2 🪵 wood · 1 🪢 rope · 1 🦴 bones · 20m · hand | Fish beside water; local fish stocks need time to recover. |
| Bucket | bucket | wt 0.8, water capacity +5 | 2 🔩 metal scraps · 1 🪢 rope · 20m · Crafting Table | Adds 5 water capacity; fetch up to 5 at once. |
| Canteen | canteen | wt 0.3, water capacity +3 | 1 🟫 leather · 1 🪢 rope · 20m · Crafting Table | Adds 3 water capacity; fetch up to 3 and use 20% less travel thirst. |
| Torch | light | dur 240, wt 0.3, +2 vision | 1 🪵 wood · 1 🧵 cloth · 5m · hand | Adds night vision and permits deep underground searches; consumes fuel minutes. |
| Lantern | light | dur 720, wt 0.8, +3 vision | 2 🔩 metal scraps · 1 🪟 glass · 1 🛢 oil · 30m · Crafting Table | Adds night vision and permits deep underground searches; consumes fuel minutes. |
| Home Compass | compass | wt 0.2 | 2 ⛓ iron · 1 🪟 glass · 1 🔧 parts · 30m · Crafting Table | Points toward the settlement while carried. |
| Binoculars | survey | wt 0.5 | 3 🪟 glass · 2 🔩 metal scraps · 2 🔧 parts · 45m · Workshop | Survey a ten-tile radius. |
| Sleeping Bag | bedroll | wt 2 | 4 🧵 cloth · 1 🪢 rope · 25m · hand | Deploy to improve sleep warmth and recovery. |
| Portable Tent | tent | wt 3 | 6 🧵 cloth · 2 🪢 rope · 2 🪵 wood · 40m · Crafting Table | Deploy to shelter from rain and reduce incidents. |
| Canvas Backpack | pack | wt 1, pack 45 | 4 🧵 cloth · 2 🪢 rope · 30m · Crafting Table | Equip to increase carrying capacity. |
| Framed Backpack | pack | wt 1.5, pack 65 | 4 🟫 leather · 2 🟫 planks · 3 🪢 rope · 45m · Workshop | Equip to increase carrying capacity. |
| Warm Coat | clothing | wt 1.5, insul 3 | 4 🧵 cloth · 2 🦌 hides · 40m · Crafting Table | Equip for weather protection. |
| Raincoat | clothing | wt 1, insul 1 | 3 🧵 cloth · 1 🛢 oil · 35m · Crafting Table | Equip for weather protection. |
| Leather Armor | clothing | wt 2, armor 3 | 4 🟫 leather · 2 🪢 rope · 45m · Workshop | Equip to reduce incoming damage by 3. |

</details>

---

## ⚔️ 7 · Creatures & combat

### 👹 Enemies

From `ENEMIES`. You meet these on the map, in ruins, underground and in raids.

| Enemy | HP | Damage | Danger | Loot |
|---|---:|---:|---:|:--|
| Wild Dogs | 12 | 3–6 | 1 | 0–1 🦌 hides · 1–2 🦴 bones · 0–1 🍖 meat |
| Wolves | 18 | 5–9 | 2 | 1–2 🦌 hides · 1–2 🦴 bones · 1–2 🍖 meat |
| Bear | 36 | 10–16 | 4 | 2–3 🦌 hides · 2–4 🦴 bones · 2–4 🍖 meat · 0–1 🟫 leather |
| Infected Wanderer | 14 | 4–7 | 2 | 0–1 🧵 cloth · 0–1 🦴 bones |
| Scavenger | 16 | 4–8 | 2 | 0–2 🔩 metal scraps · 0–2 🧵 cloth · 0–1 🍞 food |
| Raider | 22 | 6–10 | 3 | 0–1 🗡 weapons · 0–2 📦 ammunition · 0–1 🟫 leather |
| Bandits | 28 | 7–12 | 3 | 0–1 🗡 weapons · 0–2 📦 ammunition · 0–2 🍞 food · 0–1 🍺 alcohol |
| Mutated Beast | 30 | 8–14 | 4 | 1–2 🦌 hides · 1–3 🍖 meat · 1–3 🦴 bones |
| Desperate Survivor | 14 | 3–6 | 1 | 0–1 🧵 cloth · 0–1 🍞 food |
| Cultist | 20 | 6–10 | 3 | 0–1 📖 books · 0–2 🌿 herbs · 0–1 🧵 cloth |
| Rogue Hunter | 24 | 7–11 | 3 | 0–1 🗡 weapons · 0–2 🍖 meat · 0–2 🦌 hides |
| Forest Beast | 22 | 6–10 | 3 | 1–2 🦌 hides · 1–2 🍖 meat · 1–2 🦴 bones |
| Night Stalker | 30 | 9–14 | 4 | 1–2 🦌 hides · 1–3 🦴 bones · 0–1 🌿 herbs |
| Thieves | 14 | 3–6 | 1 | 0–2 🧵 cloth · 0–1 🛠 tools · 0–1 🍞 food |
| Warlord Scout | 30 | 10–15 | 5 | 0–2 🗡 weapons · 1–3 📦 ammunition · 0–1 ⚙ steel |

### 🦌 Huntable animals

Flee on contact — shoot with a bow from 1–3 tiles.

| Animal | Loot | Flee chance |
|---|---|---:|
| 🐇 Rabbit | 1 🍖 meat · 0–1 🦌 hides · 0–1 🦴 bones | 85% |
| 🦌 Deer | 2–4 🍖 meat · 1–2 🦌 hides · 1–2 🦴 bones | 75% |
| 🐗 Boar | 2–3 🍖 meat · 0–1 🦌 hides · 1–2 🦴 bones | 55% |
| 🦃 Wild Turkey | 1–2 🍖 meat · 0–1 🦴 bones | 80% |
| 🐐 Mountain Goat | 2–3 🍖 meat · 1 🦌 hides · 1–2 🦴 bones | 65% |

### ⚔️ Combat math

- **Melee hit** = 3–7 + weapon bonus (salvaged weapon +6, bow +4) + combat skill + 2 if brave.
- **Ranged proc:** with a salvaged weapon, 30% chance to spend 1 ammo for +6–12 extra damage.
- **Armor:** equipped leather armor blocks 3 damage.
- **Flee:** 40% base +20% quick +15% cowardly −5% per enemy danger; costs 10 energy.
- Win / lose / flee each resolve in 15 minutes.

### 💀 Involuntary losses

> [!WARNING]
> - **Combat defeat** — lose **20%** of carried wood, food, water, cloth, metal, weapons; town stocks are safe from a field defeat.
> - **Raids / theft** — attackers can steal food, water, metal, weapons, ammo, cloth, tools, and may damage buildings. Stockpiling 2+ weapons cuts raid damage ×0.8.

---

## ❤️ 8 · Survival & settlement reference

### ❤️ Needs decay (per 6-hour phase)

| Need | Drain / phase | Notes |
|---|---|:--|
| 🍞 Hunger | −4 | children ×0.5 |
| 💧 Thirst | −5 | children ×0.5 |
| ⚡ Energy | −3 (you) / −2 (others) | actions & steps drain more |
| 🔥 Warmth | −6 night / −2 day | children ×0.5; +4 near a night fire |

**Health damage** when a need runs low: hunger <15 → −1 (≤0 → −3); thirst <15 → −2 (≤0 → −5); warmth <15 → −1 day/−2 night (≤0 → −1 day/−4 night); disease → −2 per phase. **Morale** = happiness×0.5 + safety×0.5.

### 🛌 Sleep recovery (energy / hour)

Bare ground **10** · lean-to or tent **10** · sleeping bag **11** · tent + bag **12** · near housing **14**. A short Rest gives +5 (up to 60). Energy decay pauses while you sleep or rest (so 8 h on bare ground nets ~80), but hunger, thirst and warmth keep draining, and exposure, radiation and ambushes can interrupt or kill.

### 🧳 Starting kit

New survivors begin with: 40 🪵 wood · 5 🍞 food · 4 💧 clean water · 8 🧵 cloth · 6 📌 nails · 3 🌱 seeds · 1 🗡 weapons · 4 🏹 arrows · 1 🌿 herbs.

Starter buildings (buildable immediately): 🔥 Campfire · ⛺ Tent · 📦 Storage Shed · 🛢 Rain Barrel · 🌱 Garden Plot · 🪧 Guard Post · 🛠 Crafting Table · ⚒ Furnace · 🐟 Fishing Station.

<div align="center">

---

<sub>Generated by `tools/gen-pricing.js` from `js/data.js` — plus constants mirrored from `js/actions.js`, `js/helpers.js` and `js/world-map.js` (see the generator's MIRRORED-FROM-CODE block).</sub>

</div>
