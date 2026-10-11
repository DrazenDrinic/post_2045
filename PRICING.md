<div align="center">

# ☢️ Post 2045 — Pricing Reference

**Everything the player pays for, and what it costs.**

</div>

---

> [!NOTE]
> The game runs on **four currencies**:
>
> | | Currency | Unit | Notes |
> |---|---|---|---|
> | ⏳ | **Time** | *phases* | `1 phase = 6 hours` · `4 phases = 1 day`. Some actions cost raw minutes. |
> | 📦 | **Resources** | items | wood, stone, food, ammo… |
> | 🧠 | **Knowledge** | points | spent only on the research tree |
> | ⚡ | **Energy** | 0–100 | drained by almost every action (noted where it matters) |

### Contents

1. [⏳ Paid with **Time**](#-1--paid-with-time)
2. [📦 Paid with **Resources**](#-2--paid-with-resources)
3. [🧠 Paid with **Knowledge**](#-3--paid-with-knowledge)
4. [💀 Involuntary losses](#-4--involuntary-losses)

---

## ⏳ 1 · Paid with Time

### 🎒 Quick actions

| Action | Time | |
|---|---:|:--|
| 🪓 Chop wood | **30 min** | Axes reduce time 15/30/45% by tier |
| 🌿 Gather / forage | **20 min** | Food, herbs and seeds |
| 🔥 Boil water | **15 min** | Per batch |
| 🧪 Purify water | **10 min** | Per batch |
| 🍳 Cook | **20 min** | Per batch |
| ♨️ Warm by fire | **15 min** | Requires a fueled nearby fire |
| 🎺 Gather spirits | **30 min** | Nearby group |
| 🏹 Craft arrows | **15 min** | 5 arrows |
| 🦌 Hunt | **30 min** | Requires carried bow + arrow |
| 🥋 Train (combat) | **60 min** | +0.5 combat |
| 📖 Study a book | **60 min** | +2–5 knowledge |
| 🪣 Fetch water | **10 min** | 2 water; canteen 3; bucket 5 |
| 💤 Rest | **30 min** | +7 energy up to 60 before phase decay; exposure applies |
| 🛏️ Sleep | **120 / 240 / 480 min** | Shelter-dependent recovery; can be interrupted |
| 🍞 Eat / 💧 Drink | **free** | — |

### 🏗️ Other time-spending activities

| Activity | Time | |
|---|---:|:--|
| 🔨 Build a starter tent, table, garden or barrel | **45 min** | Hammer reduces time 20% |
| Build other housing | **180 min** | Hammer reduces time 20% |
| Build warehouse, town hall, barracks or community hall | **480 min** | Hammer reduces time 20% |
| Build other structures | **120 min** | Hammer reduces time 20% |
| 💕 Court a survivor | **30 min** | |
| ⚔️ Combat resolution (win / flee) | **15 min** | Charged once; a fatal defeat resolves immediately |

### 🗺️ Exploring ruins — *Quick Scout*

<table>
<tr><th>Time</th><th>Locations</th></tr>
<tr>
<td align="center"><b>60 min</b><br><code>1h</code></td>
<td>🌲 Forest · 🛣️ Abandoned Road · 🏚️ Ruined House · 🏞️ Riverbank</td>
</tr>
<tr>
<td align="center"><b>120 min</b><br><code>2h</code></td>
<td>🛒 Old Market · 🚓 Police Station · 🏥 Hospital · ⛽ Gas Station · 🚜 Farm Ruins · ⚔️ Raider Camp · 🏫 Old School</td>
</tr>
<tr>
<td align="center"><b>180 min</b><br><code>3h</code></td>
<td>🏭 Factory Ruins · 🪖 Military Checkpoint · 🌳 Deep Forest · 🚪 Underground Shelter</td>
</tr>
</table>

Quick Scout departs from town, consumes **1 carried food + 1 carried clean water**, and has a **12-hour cooldown per route**. Loot enters the backpack; excess remains in a ground cache. Combat adds its own 15 minutes.

### 🕳️ Underground sites

| Depth | Time | |
|---|---:|:--|
| Shallow *(all sites)* | **45 min** | Mines require a pickaxe |
| Deep *(all sites)* | **90 min** | Requires a fueled light; mines also require a pickaxe |

Each underground route has a 24-hour cooldown. Renewable plants take 5 minutes to search, ordinary features 20 minutes, and mineral nodes 30 minutes before tool bonuses.

### 🚶 World-map walking

> Travel time and energy are independent values in `TRAVEL` in `js/data.js`. Both are multiplied by condition penalties, without rounding energy up to whole units.

| Biome | Energy / tile | Time / tile |
|---|:---:|---:|
| Road | 0.3 | **5 min** |
| Plains / village | 0.4 | **6 min** |
| Forest / hills / ruins | 0.6 | **10 min** |
| Irradiated / snow / wasteland | 0.7 | **12 min** |
| Deep forest / mountain / swamp | 0.9 | **15 min** |
| River / lake | — | Impassable |

Each step drains 0.12 hunger and 0.18 thirst (0.4 thirst in wasteland). A carried canteen reduces movement thirst drain by 20%. Needs also decay at normal six-hour phase boundaries. Night runs from 20:00 to 06:00. Live mode advances 15 game minutes per timer tick.

---

## 📦 2 · Paid with Resources

### 🛠️ Crafting & survival actions

| Action | Cost | → Yields |
|---|---|---|
| 🔥 Boil water | 2 💧 dirty water + 1 🪵 wood | 2 💧 clean water |
| 🧪 Purify water | 2 💧 dirty water + 1 ⬛ charcoal | 2 💧 clean water |
| 🍳 Cook | 1 🍖 meat + 1 🪵 wood **or** 2 🌾 crops + 1 🪵 wood | 3 🍞 food |
| 🍞 Eat | 1 🍞 food | +30 hunger |
| 💧 Drink | 1 💧 clean water *(or dirty — 15% illness)* | +30 / +20 thirst |
| ♨️ Warm by fire | Nearby fueled fire | +30 warmth |
| 🏹 Craft arrows | 1 🪵 wood + 1 🦴 bones | 5 🏹 arrows |
| 🦌 Hunt | Carried bow + 1 🏹 arrow | 🍖 meat · 🦌 hides · 🦴 bones |
| 📖 Study | 1 📖 book | +2–5 🧠 knowledge |
| ⚔️ Ranged combat shot | 1 📦 ammo per hit *(needs a weapon)* | bonus damage |

### Inventory, camping and field work

Town storage is accessible inside the settlement footprint. Away from town, actions use carried supplies. Pack capacity is **30 load**, **45 with an equipped canvas backpack**, or **65 with a framed backpack**. Most small items weigh 0.05–0.3; wood weighs 1, stone/ore 1.2. Transfers do not create supplies; packing presets draw from town stock.

| Action | Materials | Time |
|---|---|---:|
| Gather fiber | None | 15 min |
| Collect loose stone | None | 20 min |
| Mine | Working pickaxe; uses durability | 30 min before tier bonus |
| Dig | Working shovel; uses durability | 17 min with shovel |
| Fish | Working fishing rod + nearby water | 30 min |
| Pitch portable tent | Deploy carried tent | 15 min |
| Lay sleeping bag | Deploy carried bag | 5 min |
| Build lean-to | 4 wood + 4 fiber | 30 min |
| Fuel field campfire | 1 wood → 4 hours fuel | 10 min |
| Pack camp | Recover gear; extinguish fire | 10 min |
| Bandage | 1 bandage → +15 HP, clears injury | 5 min |
| Use medicine | 1 medicine → +25 HP, clears disease | 5 min |
| Repair tool | 1 repair kit | 10 min |
| Refuel light | 1 wood for torch / 1 oil for lantern | 10 min |
| Claim mine / fishing site | 2 wood + 1 rope | 30 min |
| Establish supply outpost | 6 wood + 1 rope | 30 min |

Sleep restores approximately **4 energy/hour on bare ground**, **7 under a lean-to or tent**, **9 with a sleeping bag**, **12 with tent + bag**, or **14 near housing**. Normal phase decay still applies. Exposure and radiation can kill; ambushes interrupt sleep. Field fires burn down even when you leave. Equipment must be deployed to provide camp shelter.

### Crafting recipes

The Crafting tab reads exact costs and requirements from `RECIPES`. Hand recipes are available immediately; better equipment needs stations and sometimes research.

| Item | Ingredients | Time / station |
|---|---|---|
| Rope | 3 fiber | 10 min / hand |
| Cloth | 4 fiber | 15 min / table |
| Planks x2 | 2 wood | 15 min / table (9 with a saw) |
| Bandages x3 | 1 cloth + 1 water | 10 min / hand |
| Repair kit | 2 metal + 1 cloth | 20 min / table |
| Stone axe | 2 wood + 3 stone + 1 rope | 20 min / hand |
| Stone pickaxe | 2 wood + 4 stone + 1 rope | 25 min / hand |
| Hoe | 2 wood + 2 stone + 1 rope | 20 min / hand |
| Hammer | 1 wood + 2 stone | 20 min / hand |
| Shovel | 2 wood + 2 metal | 25 min / table |
| Knife | 2 metal + 1 wood | 20 min / table |
| Saw | 3 metal + 1 wood | 30 min / table |
| Crowbar | 2 iron | 30 min / forge |
| Bow | 3 wood + 2 rope | 30 min / table |
| Fit salvaged weapon | 1 weapons | 10 min / hand |
| Fishing rod | 2 wood + 1 rope + 1 bones | 20 min / hand |
| Bucket | 2 metal + 1 rope | 20 min / table |
| Canteen | 1 leather + 1 rope | 20 min / table |
| Torch | 1 wood + 1 cloth | 5 min / hand |
| Lantern | 2 metal + 1 glass + 1 oil | 30 min / table |
| Compass | 2 iron + 1 glass + 1 parts | 30 min / table |
| Binoculars | 3 glass + 2 metal + 2 parts | 45 min / workshop |
| Sleeping bag | 4 cloth + 1 rope | 25 min / hand |
| Portable tent | 6 cloth + 2 rope + 2 wood | 40 min / table |
| Canvas backpack | 4 cloth + 2 rope | 30 min / table |
| Framed backpack | 4 leather + 2 planks + 3 rope | 45 min / workshop |
| Warm coat | 4 cloth + 2 hides | 40 min / table |
| Raincoat | 3 cloth + 1 oil | 35 min / table |
| Leather armor | 4 leather + 2 rope | 45 min / workshop |
| Iron axe / pickaxe | 3 iron + 2 wood + 1 rope | 40 min / forge + Toolmaking |
| Steel axe / pickaxe | 3 steel + 2 wood + 1 rope | 40 min / forge + Metalworking |
| Charcoal x2 | 3 wood | 30 min / kiln |
| Iron | 2 ore + 1 charcoal OR 3 metal + 1 charcoal | 30 min / furnace |
| Steel | 2 iron + 2 charcoal | 45 min / forge + Metalworking |
| Glass x2 | 3 sand + 1 charcoal | 30 min / furnace |
| Bricks x3 | 3 clay + 1 charcoal | 30 min / furnace |
| Nails x4 | 1 metal | 15 min / workshop |
| Compost x2 | 1 crops + 2 fiber | 20 min / hand |

### Farming and work orders

- Plant: **1 seed**, 20 minutes (10 with a hoe). Water: **1 clean water**, 5 minutes. Fertilize: **1 compost**, 5 minutes. Harvest: 10 minutes.
- Fence a plot: **4 wood**, 20 minutes; prevents wildlife damage. Irrigate a plot: **4 wood + 4 clay + 1 rope**, 30 minutes; uses 0.25 stored water per phase when needed (dirty preferred).
- Harvests wait on the plot when storage cannot hold the produce. Spoiled food returns one compost per five lost food.
- Vegetables take 2 base days; grain/fiber crops 3; herbs 2.5; orchards 4. Moisture, fertility and cold modify growth. Fields yield 1.5x produce; greenhouses 2x. Seeds are not multiplied.
- Farmers tend one plot each and use actual town seeds/water/compost. Mature crops return seeds; orchards regrow without replanting.
- Work orders contribute **4 productive hours per worker/day**, modified by worker bonuses. They spend the same recipe ingredients as personal crafting and replace the workplace's default production.
- Choose a fixed batch count or a maintained stock target. Wood/food/water/seed reserves protect work-order, building-conversion, farming and general-job inputs. Eating, drinking and the settlement fire still use essential supplies.
- A claimed mine supports 40 worker-days. Fishing sites are renewable. Haulers recover 8 resource units/day from marked supply outposts.

### 🏘️ Buildings

<details open>
<summary><b>🛖 Shelter</b></summary>

| Building | Cost |
|---|---|
| 🔥 Campfire | *free* |
| ⛺ Tent | 4 cloth · 4 wood |
| 🛖 Shelter | 10 wood · 4 cloth |
| 🏠 Wooden Hut | 25 wood · 4 nails · 4 cloth |
| 🏡 Stone Hut | 25 stone · 10 wood · 6 nails |
| 🏘️ Family Cabin | 30 wood · 20 stone · 10 planks · 8 nails |

</details>

<details>
<summary><b>📦 Storage</b></summary>

| Building | Cost |
|---|---|
| 📦 Storage Shed | 15 wood · 4 nails |
| 🏬 Warehouse | 50 wood · 30 stone · 20 nails · 20 planks |
| 🥖 Food Cellar | 20 stone · 10 wood · 10 clay |

</details>

<details>
<summary><b>💦 Water</b></summary>

| Building | Cost |
|---|---|
| 🛢️ Rain Barrel | 8 wood · 2 nails |
| 💦 Water Collector | 12 wood · 6 metal · 4 nails |
| 🕳️ Well | 25 stone · 10 wood · 4 rope |
| 🧪 Purifier Station | 15 metal · 5 glass · 5 parts |

</details>

<details>
<summary><b>🌾 Food</b></summary>

| Building | Cost |
|---|---|
| 🌱 Garden Plot | 6 wood · 2 seeds |
| 🌾 Crop Field | 12 wood · 5 seeds |
| 🏡 Greenhouse | 20 wood · 15 glass · 8 nails |
| 🐔 Chicken Coop | 12 wood · 4 cloth |
| 🐐 Goat Pen | 15 wood · 3 rope |
| 🏹 Hunting Lodge | 18 wood · 1 weapons |
| 🥩 Smokehouse | 10 stone · 10 wood · 5 charcoal |
| 🍳 Kitchen | 12 wood · 6 stone · 1 tools |
| 🐎 Animal Stable | 25 wood · 5 stone · 5 rope |

</details>

<details>
<summary><b>⚕️ Medicine</b></summary>

| Building | Cost |
|---|---|
| ⚕️ Clinic | 15 wood · 10 cloth · 4 glass · 2 medicine |
| 🌿 Herbalist Hut | 10 wood · 5 herbs |
| 💊 Medicine Workshop | 15 stone · 10 wood · 8 glass · 2 tools |

</details>

<details>
<summary><b>🏛️ Community</b></summary>

| Building | Cost |
|---|---|
| 🛏️ Inn | 25 wood · 10 cloth · 4 nails |
| 🍺 Tavern | 20 wood · 10 stone · 5 nails |
| 🍻 Brewery | 15 wood · 5 glass · 2 tools |
| ⛩️ Shrine | 15 stone · 10 wood |
| 🛁 Bathhouse | 20 stone · 10 wood · 10 clay · 5 water |
| 🏛️ Community Hall | 30 wood · 20 stone · 10 planks · 8 nails |
| 🏛️ Town Hall | 40 wood · 30 stone · 15 planks · 10 nails |

</details>

<details>
<summary><b>📚 Education</b></summary>

| Building | Cost |
|---|---|
| 📚 School | 15 wood · 3 books · 5 cloth |
| 📖 Library | 20 wood · 10 books · 5 glass |

</details>

<details>
<summary><b>🪚 Crafting</b></summary>

| Building | Cost |
|---|---|
| 🛠️ Workshop | 15 wood · 5 stone · 1 tools |
| Crafting Table | 6 wood · 2 stone |
| Furnace | 10 stone · 4 clay |
| Fishing Station | 8 wood · 2 rope |
| 🪚 Carpenter Hut | 12 wood · 1 tools |
| 🪵 Sawmill | 25 wood · 5 metal · 2 tools |
| 🔨 Toolsmith | 10 wood · 10 metal · 5 stone |
| 🪵 Charcoal Kiln | 10 stone · 5 clay |
| 🧵 Tailor Hut | 10 wood · 5 cloth |
| 🟫 Leatherworker | 10 wood · 5 stone · 1 tools |

</details>

<details>
<summary><b>⚙️ Engineering</b></summary>

| Building | Cost |
|---|---|
| ⚒️ Forge | 20 stone · 15 metal · 5 charcoal |
| ♻️ Metal Recycler | 15 metal · 5 parts |
| 🚗 Scrapyard | 20 metal · 5 wood |
| ⚙️ Mechanics Shed | 20 metal · 10 parts · 3 tools |
| 🔧 Repair Station | 15 metal · 3 tools · 5 parts |
| ⛽ Fuel Depot | 20 metal · 10 stone |

</details>

<details>
<summary><b>🛡️ Defense</b></summary>

| Building | Cost |
|---|---|
| 🪧 Guard Post | 15 wood · 1 weapons |
| 🗼 Watchtower | 25 wood · 10 stone · 4 nails |
| 🟫 Palisade Wall | 20 wood · 4 nails |
| 🚪 Gate | 15 wood · 10 metal · 4 nails |
| 🪤 Trap Line | 10 wood · 5 metal · 2 rope |
| 🪖 Barracks | 30 wood · 15 stone · 8 nails |
| 🥋 Training Yard | 15 wood · 10 stone · 1 weapons |
| 🗡️ Armory | 20 stone · 8 iron · 10 wood |
| 🔒 Prison Cage | 15 metal · 10 wood · 5 nails |

</details>

<details>
<summary><b>🛒 Trade</b></summary>

| Building | Cost |
|---|---|
| 🏪 Market Stall | 10 wood · 3 cloth |
| 🛒 Trading Post | 20 wood · 10 stone · 5 cloth |
| 📡 Signal Tower | 25 wood · 10 metal · 3 parts |
| 🏕️ Scout Camp | 15 wood · 5 cloth · 1 weapons |

</details>

---

## 🧠 3 · Paid with Knowledge

Spent on the research tree (knowledge points), cheapest first:

| Cost | Tech |
|:---:|---|
| **5** | Survival Basics |
| **6** | Crafting · Basic Building |
| **8** | Firecraft · Foraging · Herbalism · Defense · Literacy |
| **10** | Farming · Toolmaking · Textiles · Trade · Community |
| **12** | Masonry · Water Purification · Brewing |
| **14** | Animal Husbandry · Medicine · Fortifications · Diplomacy · Justice · Metalworking |
| **16** | Scholarship |
| **18** | Large Structures · Greenhouses · Mechanics |
| **20** | Warfare |

---

## 💀 4 · Involuntary losses

> [!WARNING]
> Not purchases, but they still cost you resources:
>
> - **⚔️ Combat defeat** — lose up to **20%** of carried wood, food, water, cloth, metal, and weapons; town stocks are not taken by a field defeat.
> - **🔥 Raids / theft** — attackers can steal food, water, metal, weapons, ammo, cloth, and tools.

<div align="center">

---

*Reference for `js/data.js`, `js/actions.js` and `js/world-map.js` · prices are per single build / action. UI costs are read from the same action and recipe tables.*

</div>
