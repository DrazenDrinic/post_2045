<div align="center">

# ☢️ Post 2045 — Pricing Reference

**Everything the player pays for, and what it costs.**

<sub>Regenerated straight from the game's data tables (`js/data.js`) and action code — every figure below matches the current build.</sub>

</div>

---

> [!NOTE]
> The game runs on **four currencies**:
>
> | | Currency | Unit | Notes |
> |---|---|---|---|
> | ⏳ | **Time** | *phases* | `1 phase = 6 hours` · `4 phases = 1 day`. Most actions cost game minutes. |
> | 📦 | **Resources** | items | 41 resource types — wood, stone, food, ammo… |
> | 🧠 | **Knowledge** | points | spent only on the research tree |
> | ⚡ | **Energy** | 0–100 | drained by almost every action and every step |

> [!TIP]
> This same reference is built into the game. Open the **📖 Guide** tab → **💰 Prices & Costs** (generated live from these tables), and use the **🔎 Search the Game** box to look up any single thing — e.g. type `clean water` to see the resource plus every building, job, recipe and feature that makes or uses it.

### Contents

1. [⏳ Paid with **Time**](#-1--paid-with-time)
2. [📦 Paid with **Resources**](#-2--paid-with-resources)
3. [🧠 Paid with **Knowledge**](#-3--paid-with-knowledge)
4. [💀 Involuntary losses](#-4--involuntary-losses)

---

## ⏳ 1 · Paid with Time

### 🎒 Quick actions

| Action | Time | Notes |
|---|---:|:--|
| 🪓 Chop wood | **30 min** | 3–5 wood; an axe cuts time 15 / 30 / 45 % by tier |
| 🌿 Forage | **20 min** | food, herbs and seeds |
| 🔥 Boil water | **15 min** | per batch, at a fire |
| 🧪 Purify water | **10 min** | per batch, with charcoal |
| 🍳 Cook | **20 min** | per batch, at a fire |
| ♨️ Warm up | **15 min** | +30 warmth at a fueled fire |
| 🎺 Gather spirits | **30 min** | +5 happiness to the nearby group |
| 🏹 Craft arrows | **15 min** | makes 5 arrows |
| 🦌 Hunt | **30 min** | needs a carried bow + 1 arrow |
| 🥋 Train (combat) | **60 min** | +0.5 combat skill |
| 📖 Study a book | **60 min** | +2–5 knowledge |
| 🪣 Fetch water | **10 min** | 2 water; canteen 3; bucket 5 |
| 🧵 Gather fiber | **15 min** | reeds / plant fiber |
| 🪨 Collect loose stone | **20 min** | no tools needed |
| ⛏ Mine | **30 min** | needs a pickaxe (before tier bonus) |
| 🪏 Dig | **20 min** | needs a shovel → 17 min with one (−15% tier 1) |
| 🎣 Fish | **30 min** | needs a rod beside water |
| 🩹 Bandage | **5 min** | 1 bandage → +15 HP, clears injury |
| 💤 Rest | **30 min** | +7 energy up to 60 before phase decay; exposure applies |
| 🛏️ Sleep | **120 / 240 / 480 min** | 2 / 4 / 8 h; recovery 4–14 energy/hr by shelter; can be interrupted |
| 🍞 Eat / 💧 Drink / 💊 Treat | **free / 5 min** | eat & drink free; treating illness with medicine costs 5 min |

### 🏗️ Building & other activities

| Activity | Time | Notes |
|---|---:|:--|
| 🔨 Build a tent, crafting table, garden or rain barrel | **45 min** | starter builds |
| 🔨 Build any housing (shelter, huts, cabin) | **180 min** | |
| 🔨 Build a warehouse, town hall, barracks or community hall | **480 min** | major structures |
| 🔨 Build any other structure | **120 min** | |
| — a carried 🔨 hammer | **−20%** | applies to every build |
| 🧰 Repair a tool | **10 min** | costs 1 repair kit |
| 🔦 Refuel a light | **10 min** | 1 wood (torch) or 1 oil (lantern) |
| ⛺ Pitch portable tent | **15 min** | deploy carried tent |
| 🛌 Lay sleeping bag | **5 min** | deploy carried bag |
| 🛖 Build a lean-to | **30 min** | 4 wood + 4 fiber |
| 🔥 Fuel a field campfire | **10 min** | 1 wood → 4 hours of fuel |
| 🎒 Pack camp | **10 min** | recover gear, extinguish fire |
| 🧭 Survey | **15 min** | reveal a 10-tile radius |
| ⛏ Claim a mine / fishing site | **30 min** | 2 wood + 1 rope |
| 📦 Establish a supply outpost | **30 min** | 6 wood + 1 rope |
| 💕 Court a survivor | **30 min** | +18–30 heart (leader +8) |
| ⚔️ Combat resolution (win / lose / flee) | **15 min** | charged once; a fatal defeat resolves immediately |

### 🗺️ Exploring ruins — *Quick Scout*

Quick Scout departs from town, consumes **1 carried food + 1 carried clean water**, and has a **12-hour cooldown per route**. Loot enters the backpack; excess stays in a ground cache. Combat adds its own 15 minutes.

| Time | Locations |
|---:|:--|
| **60 min** (1h) | 🌲 Forest · 🛣 Abandoned Road · 🏚 Ruined House · 🏞 Riverbank |
| **120 min** (2h) | 🛒 Old Market · 🚓 Police Station · 🏥 Hospital Ruins · ⛽ Gas Station · 🚜 Farm Ruins · ⚔ Raider Camp · 🏫 Old School |
| **180 min** (3h) | 🏭 Factory Ruins · 🪖 Military Checkpoint · 🌳 Deep Forest · 🚪 Underground Shelter |

### 🕳️ Underground sites

Each underground route (mines, caves, subways, storm drains) has a **24-hour cooldown**. Shallow searches take **45 min**, deep searches **90 min** (deep needs a fueled light; mines need a pickaxe). Renewable plants take 5 min to search, ordinary features 20 min, and mineral nodes 30 min before tool bonuses.

### 🚶 World-map walking

Travel time and energy per tile come from the `TRAVEL` table. Both are multiplied by condition penalties (cold, hunger, thirst, injury, disease).

| Terrain | Time / tile | Energy / tile |
|---|---:|---:|
| Road | **5 min** | 0.3 |
| Plains / Village | **6 min** | 0.4 |
| Forest / Hills / Ruins | **10 min** | 0.6 |
| Snow / Irradiated / Wasteland | **12 min** | 0.7 |
| Deep Forest / Mountain / Swamp | **15 min** | 0.9 |
| River / lake | — | impassable |

Each step also drains **0.12 hunger** and **0.18 thirst** (**0.4 thirst** in wasteland). A carried canteen cuts movement thirst by **20%**. Needs also decay at normal six-hour phase boundaries. Night runs 20:00–06:00. In **Live** mode each timer tick advances **15 game minutes** (12 s / 6 s / 2.5 s real-time at 1× / 2× / 3×).

---

## 📦 2 · Paid with Resources

### 🛠️ Crafting & survival actions

| Action | Cost | → Yields |
|---|---|---|
| 🔥 Boil water | 2 💧 dirty water · 1 🪵 wood | 2 💧 clean water |
| 🧪 Purify water | 2 💧 dirty water · 1 ⬛ charcoal | 2 💧 clean water |
| 🍳 Cook (meat) | 1 🍖 meat · 1 🪵 wood | 3 🍞 food |
| 🍳 Cook (crops) | 2 🌾 crops · 1 🪵 wood | 3 🍞 food |
| 🍞 Eat | 1 🍞 food | +30 hunger |
| 💧 Drink | 1 💧 clean water *(or dirty — 15% illness)* | +30 / +20 thirst |
| 🩹 Bandage | 1 💊 bandage | +15 HP, clears injury |
| 💊 Treat illness | 1 💊 medicine | +25 HP, clears disease |
| ♨️ Warm by fire | nearby fueled fire | +30 warmth |
| 🏹 Craft arrows | 1 🪵 wood · 1 🦴 bones | 5 🏹 arrows |
| 🦌 Hunt | carried bow + 1 🏹 arrow | 🍖 meat · 🦌 hides · 🦴 bones |
| 📖 Study | 1 📖 book | +2–5 🧠 knowledge |
| ⚔️ Ranged attack | 30% chance to spend 1 📦 ammo *(salvaged weapon only)* | +6–12 bonus damage |

<sub>Melee hit = 3–7 + weapon bonus (salvaged weapon +6, bow +4) + combat skill + 2 if brave. Equipped leather armor blocks 3 damage.</sub>

### 🎒 Inventory, camping & field work

Town storage is reachable only inside the settlement footprint; away from town you use carried supplies. Pack capacity is **30 load**, **45 with a canvas backpack**, or **65 with a framed backpack**. Most small items weigh 0.05–0.3; wood weighs 1, stone/ore 1.2.

| Field action | Materials | Time |
|---|---|---:|
| Gather fiber | none | 15 min |
| Collect loose stone | none | 20 min |
| Mine | working pickaxe (uses durability) | 30 min (before tier bonus) |
| Dig | working shovel (uses durability) | 17 min with a shovel |
| Fish | working rod + nearby water | 30 min |
| Pitch portable tent | deploy carried tent | 15 min |
| Lay sleeping bag | deploy carried bag | 5 min |
| Build lean-to | 4 wood + 4 fiber | 30 min |
| Fuel field campfire | 1 wood → 4 h fuel | 10 min |
| Pack camp | recover gear; extinguish fire | 10 min |
| Repair tool | 1 repair kit | 10 min |
| Refuel light | 1 wood (torch) / 1 oil (lantern) | 10 min |
| Claim mine / fishing site | 2 wood + 1 rope | 30 min |
| Establish supply outpost | 6 wood + 1 rope | 30 min |

Sleep restores about **4 energy/hr on bare ground**, **7 under a lean-to or tent**, **9 with a sleeping bag**, **12 with tent + bag**, or **14 near housing**. Normal phase decay still applies. Exposure and radiation can kill; ambushes interrupt sleep. A claimed mine supports **40 worker-days**; fishing sites are renewable; haulers recover **8 resource units/day** from supply outposts.

### 🧪 Crafting recipes

Read exactly from `RECIPES`. Hand recipes work immediately; better gear needs stations and sometimes research.

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

<sub>Planks drop to 9 min with a saw. Iron can also be smelted from 3 metal scraps + 1 charcoal.</sub>

### 🌾 Farming & work orders

- **Plant:** 1 seed, 20 min (10 with a hoe). **Water:** 1 clean water, 5 min. **Fertilize:** 1 compost, 5 min (+30 fertility). **Harvest:** 10 min.
- **Fence a plot:** 4 wood, 20 min (stops wildlife). **Irrigate a plot:** 4 wood + 4 clay + 1 rope, 30 min (auto-draws stored water).
- Crop base growth: vegetables 2d, grain 3d, fiber crop 3d, medicinal herbs 2.5d, orchard 4d. Moisture, fertility and cold modify growth.
- Yields are ×1.5 on a crop field and ×2 in a greenhouse; **seeds are never multiplied**. Mature crops return seeds; orchards regrow without replanting.
- Work orders at a workplace spend the same recipe ingredients as hand crafting and replace the building's default output; reserves protect essential inputs.

### 🏘️ Buildings

All costs read from `BUILDINGS`. *Max* is the build limit; *W* is worker slots per building.

<details open>
<summary><b>🛖 Shelter</b></summary>

| Building | Cost | Max | W |
|---|---|---:|---:|
| ⛺ Tent | 4 🧵 cloth · 4 🪵 wood | 12 | 0 |
| 🛖 Shelter | 10 🪵 wood · 4 🧵 cloth | 18 | 0 |
| 🏠 Wooden Hut | 25 🪵 wood · 4 📌 nails · 4 🧵 cloth | 24 | 0 |
| 🏡 Stone Hut | 25 🪨 stone · 10 🪵 wood · 6 📌 nails | 24 | 0 |
| 🏘 Family Cabin | 30 🪵 wood · 20 🪨 stone · 10 🟫 planks · 8 📌 nails | 18 | 0 |

</details>

<details>
<summary><b>📦 Storage</b></summary>

| Building | Cost | Max | W |
|---|---|---:|---:|
| 📦 Storage Shed | 15 🪵 wood · 4 📌 nails | 24 | 1 |
| 🏬 Warehouse | 50 🪵 wood · 30 🪨 stone · 20 📌 nails · 20 🟫 planks | 12 | 1 |
| 🥖 Food Cellar | 20 🪨 stone · 10 🪵 wood · 10 🟤 clay | 12 | 0 |

</details>

<details>
<summary><b>💦 Water</b></summary>

| Building | Cost | Max | W |
|---|---|---:|---:|
| 🛢 Rain Barrel | 8 🪵 wood · 2 📌 nails | 24 | 1 |
| 💦 Water Collector | 12 🪵 wood · 6 🔩 metal scraps · 4 📌 nails | 12 | 1 |
| 🕳 Well | 25 🪨 stone · 10 🪵 wood · 4 🪢 rope | 9 | 1 |
| 🧪 Purifier Station | 15 🔩 metal scraps · 5 🪟 glass · 5 🔧 parts | 9 | 1 |

</details>

<details>
<summary><b>🌾 Food</b></summary>

| Building | Cost | Max | W |
|---|---|---:|---:|
| 🌱 Garden Plot | 6 🪵 wood · 2 🌱 seeds | 24 | 1 |
| 🌾 Crop Field | 12 🪵 wood · 5 🌱 seeds | 24 | 1 |
| 🏡 Greenhouse | 20 🪵 wood · 15 🪟 glass · 8 📌 nails | 12 | 1 |
| 🐔 Chicken Coop | 12 🪵 wood · 4 🧵 cloth | 12 | 1 |
| 🐐 Goat Pen | 15 🪵 wood · 3 🪢 rope | 12 | 1 |
| 🏹 Hunting Lodge | 18 🪵 wood · 1 🗡 weapons | 9 | 2 |
| 🥩 Smokehouse | 10 🪨 stone · 10 🪵 wood · 5 ⬛ charcoal | 9 | 1 |
| 🍳 Kitchen | 12 🪵 wood · 6 🪨 stone · 1 🛠 tools | 9 | 1 |
| 🐎 Animal Stable | 25 🪵 wood · 5 🪨 stone · 5 🪢 rope | 6 | 1 |
| 🐟 Fishing Station | 8 🪵 wood · 2 🪢 rope | 4 | 2 |

</details>

<details>
<summary><b>⚕️ Medicine</b></summary>

| Building | Cost | Max | W |
|---|---|---:|---:|
| ⚕ Clinic | 15 🪵 wood · 10 🧵 cloth · 4 🪟 glass · 2 💊 medicine | 6 | 1 |
| 🌿 Herbalist Hut | 10 🪵 wood · 5 🌿 herbs | 9 | 1 |
| 💊 Medicine Workshop | 15 🪨 stone · 10 🪵 wood · 8 🪟 glass · 2 🛠 tools | 6 | 2 |

</details>

<details>
<summary><b>🏛️ Community</b></summary>

| Building | Cost | Max | W |
|---|---|---:|---:|
| 🛏 Inn | 25 🪵 wood · 10 🧵 cloth · 4 📌 nails | 6 | 1 |
| 🍺 Tavern | 20 🪵 wood · 10 🪨 stone · 5 📌 nails | 6 | 1 |
| 🍻 Brewery | 15 🪵 wood · 5 🪟 glass · 2 🛠 tools | 6 | 1 |
| ⛩ Shrine | 15 🪨 stone · 10 🪵 wood | 6 | 0 |
| 🛁 Bathhouse | 20 🪨 stone · 10 🪵 wood · 10 🟤 clay · 5 💧 clean water | 6 | 1 |
| 🏛 Community Hall | 30 🪵 wood · 20 🪨 stone · 10 🟫 planks · 8 📌 nails | 3 | 0 |
| 🏛 Town Hall | 40 🪵 wood · 30 🪨 stone · 15 🟫 planks · 10 📌 nails | 3 | 0 |

</details>

<details>
<summary><b>📚 Education</b></summary>

| Building | Cost | Max | W |
|---|---|---:|---:|
| 📚 School | 15 🪵 wood · 3 📖 books · 5 🧵 cloth | 3 | 1 |
| 📖 Library | 20 🪵 wood · 10 📖 books · 5 🪟 glass | 3 | 1 |

</details>

<details>
<summary><b>🪚 Crafting</b></summary>

| Building | Cost | Max | W |
|---|---|---:|---:|
| 🛠 Workshop | 15 🪵 wood · 5 🪨 stone · 1 🛠 tools | 9 | 1 |
| 🪚 Carpenter Hut | 12 🪵 wood · 1 🛠 tools | 9 | 1 |
| 🪵 Sawmill | 25 🪵 wood · 5 🔩 metal scraps · 2 🛠 tools | 6 | 2 |
| 🔨 Toolsmith | 10 🪵 wood · 10 🔩 metal scraps · 5 🪨 stone | 6 | 1 |
| 🪵 Charcoal Kiln | 10 🪨 stone · 5 🟤 clay | 9 | 1 |
| 🧵 Tailor Hut | 10 🪵 wood · 5 🧵 cloth | 6 | 1 |
| 🟫 Leatherworker | 10 🪵 wood · 5 🪨 stone · 1 🛠 tools | 6 | 1 |
| 🛠 Crafting Table | 6 🪵 wood · 2 🪨 stone | 6 | 1 |
| ⚒ Furnace | 10 🪨 stone · 4 🟤 clay | 4 | 1 |

</details>

<details>
<summary><b>⚙️ Engineering</b></summary>

| Building | Cost | Max | W |
|---|---|---:|---:|
| ⚒ Forge | 20 🪨 stone · 15 🔩 metal scraps · 5 ⬛ charcoal | 6 | 1 |
| ♻ Metal Recycler | 15 🔩 metal scraps · 5 🔧 parts | 6 | 1 |
| 🚗 Scrapyard | 20 🔩 metal scraps · 5 🪵 wood | 6 | 1 |
| 🔧 Repair Station | 15 🔩 metal scraps · 3 🛠 tools · 5 🔧 parts | 6 | 1 |
| ⚙ Mechanics Shed | 20 🔩 metal scraps · 10 🔧 parts · 3 🛠 tools | 6 | 1 |
| ⛽ Fuel Depot | 20 🔩 metal scraps · 10 🪨 stone | 6 | 0 |

</details>

<details>
<summary><b>🛡️ Defense</b></summary>

| Building | Cost | Max | W |
|---|---|---:|---:|
| 🪧 Guard Post | 15 🪵 wood · 1 🗡 weapons | 12 | 1 |
| 🗼 Watchtower | 25 🪵 wood · 10 🪨 stone · 4 📌 nails | 9 | 1 |
| 🟫 Palisade Wall | 20 🪵 wood · 4 📌 nails | 24 | 0 |
| 🚪 Gate | 15 🪵 wood · 10 🔩 metal scraps · 4 📌 nails | 6 | 0 |
| 🪤 Trap Line | 10 🪵 wood · 5 🔩 metal scraps · 2 🪢 rope | 18 | 0 |
| 🪖 Barracks | 30 🪵 wood · 15 🪨 stone · 8 📌 nails | 6 | 2 |
| 🥋 Training Yard | 15 🪵 wood · 10 🪨 stone · 1 🗡 weapons | 6 | 1 |
| 🗡 Armory | 20 🪨 stone · 8 ⛓ iron · 10 🪵 wood | 6 | 1 |
| 🔒 Prison Cage | 15 🔩 metal scraps · 10 🪵 wood · 5 📌 nails | 6 | 1 |

</details>

<details>
<summary><b>🛒 Trade</b></summary>

| Building | Cost | Max | W |
|---|---|---:|---:|
| 🏪 Market Stall | 10 🪵 wood · 3 🧵 cloth | 9 | 1 |
| 🛒 Trading Post | 20 🪵 wood · 10 🪨 stone · 5 🧵 cloth | 3 | 1 |
| 📡 Signal Tower | 25 🪵 wood · 10 🔩 metal scraps · 3 🔧 parts | 3 | 1 |
| 🏕 Scout Camp | 15 🪵 wood · 5 🧵 cloth · 1 🗡 weapons | 6 | 1 |

</details>

<details>
<summary><b>🔥 Survival</b></summary>

| Building | Cost | Max | W |
|---|---|---:|---:|
| 🔥 Campfire | *free* | 1 | 0 |

</details>

---

## 🧠 3 · Paid with Knowledge

Spent on the research tree, cheapest first:

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

---

## 💀 4 · Involuntary losses

> [!WARNING]
> Not purchases, but they still cost you:
>
> - **⚔️ Combat defeat** — lose **20%** of carried wood, food, water, cloth, metal and weapons; town stocks are safe from a field defeat.
> - **🔥 Raids / theft** — attackers can steal food, water, metal, weapons, ammo, cloth and tools, and may damage buildings. Stockpiled weapons (2+) cut raid damage 20%.

<div align="center">

---

*Generated from `js/data.js`, `js/actions.js`, `js/helpers.js` and `js/world-map.js`. Prices are per single build / action.*

</div>
