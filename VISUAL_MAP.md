# Post 2045 — Complete Visual & Interaction Map

> **Purpose**: This document maps every emoji icon, every player action, every UI element, every entity, and every interaction in the game. An SVG artist agent should be able to read this file alone and know exactly what custom icons to produce and where they appear.

---

## 1. RESOURCES (46 total)

Every resource appears in the right-panel stockpile list, in cost/loot strings throughout the UI, and in inventory rows.

| ID | Name | Current Icon | Context |
|----|------|-------------|---------|
| wood | Wood | 🪵 | Gathering, building, fuel |
| planks | Planks | 🟫 | Crafted from wood, building material |
| stone | Stone | 🪨 | Gathering, building |
| bricks | Bricks | 🧱 | Crafted from clay, building material |
| clay | Clay | 🟤 | Gathered, ceramics |
| metal | Metal Scraps | 🔩 | Scavenged, smelting input |
| iron | Iron | ⛓ | Smelted from ore/metal |
| steel | Steel | ⚙ | Forged from iron |
| nails | Nails | 📌 | Crafted, building material |
| tools | Tools | 🛠 | Crafted, building/repair |
| rope | Rope | 🪢 | Crafted from fiber |
| cloth | Cloth | 🧵 | Crafted from fiber/hides |
| leather | Leather | 🟫 | Tanned from hides |
| hides | Hides | 🦌 | Hunting loot |
| bones | Bones | 🦴 | Hunting loot, crafting |
| food | Food | 🍞 | Cooked meals, foraged |
| meat | Meat | 🍖 | Hunting, fishing |
| crops | Crops | 🌾 | Farmed |
| seeds | Seeds | 🌱 | Farming input |
| herbs | Herbs | 🌿 | Foraged, medicine input |
| water | Clean Water | 💧 | Boiled/purified, drinking |
| dirty_water | Dirty Water | 💧 | Collected, needs purifying |
| medicine | Medicine | 💊 | Crafted, healing |
| alcohol | Alcohol | 🍺 | Brewed, tavern fuel |
| charcoal | Charcoal | ⬛ | Burned from wood, smelting fuel |
| fuel | Fuel | ⛽ | Scavenged |
| oil | Oil | 🛢 | Scavenged, lantern fuel |
| parts | Parts | 🔧 | Scavenged, engineering |
| components | Components | 🔌 | Scavenged, advanced crafting |
| batteries | Batteries | 🔋 | Scavenged |
| glass | Glass | 🪟 | Crafted from sand |
| weapons | Weapons | 🗡 | Combat, defense |
| ammo | Ammunition | 📦 | Combat ranged bonus |
| arrows | Arrows | 🏹 | Hunting + crafted |
| books | Books | 📖 | Study for knowledge |
| fiber | Plant Fiber | 🧵 | Gathered (shares cloth icon) |
| ore | Iron Ore | ⛓ | Mined (shares iron icon) |
| sand | Sand | 🟤 | Dug (shares clay icon) |
| compost | Compost | 🌱 | Composted (shares seeds icon) |
| bandages | Bandages | 💊 | Crafted (shares medicine icon) |
| repair_kits | Repair Kits | 🛠 | Crafted (shares tools icon) |

**Note**: 6 resources share icons with other resources (fiber→cloth, ore→iron, sand→clay, compost→seeds, bandages→medicine, repair_kits→tools). All 46 need unique SVGs.

---

## 2. SURVIVOR NEED BARS (8 bars)

Shown as colored progress bars in the left panel character card and on the survivors tab.

| Need | Icon in Label | CSS Color Variable |
|------|--------------|-------------------|
| Health | ❤ | `--hp` |
| Hunger | 🍞 | `--hunger` |
| Thirst | 💧 | `--thirst` |
| Energy | ⚡ | `--energy` |
| Happiness | 😊 | `--happy` |
| Safety | 🛡 | `--safety` |
| Morale | ✨ | `--morale` |
| Warmth | 🔥 | `--warm` |

---

## 3. SURVIVOR STATUS ICONS

| Condition | Icon | Where Shown |
|-----------|------|-------------|
| Diseased | 🤒 | Left panel, survivor card badge |
| Injured | 🩹 | Left panel, survivor card badge |
| Player marker | ⭐ | Before player name in survivors tab |
| Child | 👶 | After child's name in survivors tab, follower strip |
| Partner | 💍 | Badge on survivor card |
| Heart (courtship) | ❤ | Badge showing courtship progress X/100 |
| Player character | 👤 | Left panel character card header |
| Player on map | 🧑 | Map tile where player stands |
| Following count | +N | Small text next to player on map |

---

## 4. BUILDINGS (63 total)

Each building has an icon used in: Build tab cards, Town grid tiles, Buildings tab, map settlement tiles, worker slot headers, and cost strings.

### Shelter (6)
| ID | Name | Icon | Workers | Max |
|----|------|------|---------|-----|
| campfire | Campfire | 🔥 | 0 | 1 |
| tent | Tent | ⛺ | 0 | 12 |
| shelter | Shelter | 🛖 | 0 | 18 |
| wooden_hut | Wooden Hut | 🏠 | 0 | 24 |
| stone_hut | Stone Hut | 🏡 | 0 | 24 |
| family_cabin | Family Cabin | 🏘 | 0 | 18 |

### Storage (3)
| ID | Name | Icon | Workers | Max |
|----|------|------|---------|-----|
| storage_shed | Storage Shed | 📦 | 1 | 24 |
| warehouse | Warehouse | 🏬 | 1 | 12 |
| food_cellar | Food Cellar | 🥖 | 0 | 12 |

### Water (4)
| ID | Name | Icon | Workers | Max |
|----|------|------|---------|-----|
| rain_barrel | Rain Barrel | 🛢 | 1 | 24 |
| water_collector | Water Collector | 💦 | 1 | 12 |
| well | Well | 🕳 | 1 | 9 |
| purifier | Purifier Station | 🧪 | 1 | 9 |

### Food (8)
| ID | Name | Icon | Workers | Max |
|----|------|------|---------|-----|
| garden | Garden Plot | 🌱 | 1 | 24 |
| crop_field | Crop Field | 🌾 | 1 | 24 |
| greenhouse | Greenhouse | 🏡 | 1 | 12 |
| chicken_coop | Chicken Coop | 🐔 | 1 | 12 |
| goat_pen | Goat Pen | 🐐 | 1 | 12 |
| hunting_lodge | Hunting Lodge | 🏹 | 2 | 9 |
| smokehouse | Smokehouse | 🥩 | 1 | 9 |
| kitchen | Kitchen | 🍳 | 1 | 9 |
| fishing_station | Fishing Station | 🐟 | 2 | 12 |
| animal_stable | Animal Stable | 🐎 | 1 | 6 |

### Medicine (3)
| ID | Name | Icon | Workers | Max |
|----|------|------|---------|-----|
| clinic | Clinic | ⚕ | 1 | 6 |
| herbalist | Herbalist Hut | 🌿 | 1 | 9 |
| medicine_workshop | Medicine Workshop | 💊 | 2 | 6 |

### Community (7)
| ID | Name | Icon | Workers | Max |
|----|------|------|---------|-----|
| inn | Inn | 🛏 | 1 | 6 |
| tavern | Tavern | 🍺 | 1 | 6 |
| brewery | Brewery | 🍻 | 1 | 6 |
| shrine | Shrine | ⛩ | 0 | 6 |
| bathhouse | Bathhouse | 🛁 | 1 | 6 |
| community_hall | Community Hall | 🏛 | 0 | 3 |
| town_hall | Town Hall | 🏛 | 0 | 3 |

### Education (2)
| ID | Name | Icon | Workers | Max |
|----|------|------|---------|-----|
| school | School | 📚 | 1 | 3 |
| library | Library | 📖 | 1 | 3 |

### Crafting (8)
| ID | Name | Icon | Workers | Max |
|----|------|------|---------|-----|
| workshop | Workshop | 🛠 | 1 | 9 |
| carpenter | Carpenter Hut | 🪚 | 1 | 9 |
| sawmill | Sawmill | 🪵 | 2 | 6 |
| toolsmith | Toolsmith | 🔨 | 1 | 6 |
| charcoal_kiln | Charcoal Kiln | 🪵 | 1 | 9 |
| tailor | Tailor Hut | 🧵 | 1 | 6 |
| leatherworker | Leatherworker | 🟫 | 1 | 6 |
| crafting_table | Crafting Table | 🛠 | 1 | 18 |

### Engineering (6)
| ID | Name | Icon | Workers | Max |
|----|------|------|---------|-----|
| forge | Forge | ⚒ | 1 | 6 |
| recycler | Metal Recycler | ♻ | 1 | 6 |
| scrapyard | Scrapyard | 🚗 | 1 | 6 |
| mechanics_shed | Mechanics Shed | ⚙ | 1 | 6 |
| repair_station | Repair Station | 🔧 | 1 | 6 |
| fuel_depot | Fuel Depot | ⛽ | 0 | 6 |
| furnace | Furnace | ⚒ | 1 | 12 |

### Defense (9)
| ID | Name | Icon | Workers | Max |
|----|------|------|---------|-----|
| guard_post | Guard Post | 🪧 | 1 | 12 |
| watchtower | Watchtower | 🗼 | 1 | 9 |
| palisade | Palisade Wall | 🟫 | 0 | 24 |
| gate | Gate | 🚪 | 0 | 6 |
| trap_line | Trap Line | 🪤 | 0 | 18 |
| barracks | Barracks | 🪖 | 2 | 6 |
| training_yard | Training Yard | 🥋 | 1 | 6 |
| armory | Armory | 🗡 | 1 | 6 |
| prison_cage | Prison Cage | 🔒 | 1 | 6 |

### Trade (4)
| ID | Name | Icon | Workers | Max |
|----|------|------|---------|-----|
| market_stall | Market Stall | 🏪 | 1 | 9 |
| trading_post | Trading Post | 🛒 | 1 | 3 |
| signal_tower | Signal Tower | 📡 | 1 | 3 |
| scout_camp | Scout Camp | 🏕 | 1 | 6 |

**Note on duplicate icons**: Several buildings share emoji (🏛 community_hall & town_hall, 🛠 workshop & crafting_table, ⚒ forge & furnace, 🪵 sawmill & charcoal_kiln, 🏡 greenhouse & stone_hut, 🟫 palisade & leatherworker). All need unique SVGs.

---

## 5. BIOMES (14 total)

Displayed as the background tile character on the world map grid. Each tile is 24×24px.

| ID | Name | Tile Char | BG Color | FG Color | Special |
|----|------|-----------|----------|----------|---------|
| plains | Plains | · | #3a4a26 | #90a050 | Default terrain |
| forest | Forest | ♣ | #1f3018 | #3e6028 | |
| deep_forest | Deep Forest | ♠ | #142010 | #244018 | dark |
| mountain | Mountain | ▲ | #3a3a36 | #7a7570 | |
| hills | Hills | ⌒ | #403624 | #7a6a40 | |
| river | River | ~ | #0e2638 | #5a90b0 | blocks, water |
| lake | Lake | ≈ | #0a1f30 | #4a7090 | blocks, water |
| swamp | Swamp | ≡ | #1a2818 | #5a6530 | hazard |
| radio | Irradiated | ☢ | #3a3a10 | #c0c020 | hazard, radiation |
| ruins | Ruins | ▦ | #2a2825 | #807870 | |
| road | Road | = | #2a2522 | #7a6f68 | fast travel |
| snow | Snow | ❄ | #5a6878 | #d0e0f0 | cold |
| desert | Wasteland | · | #3a3220 | #a08858 | dry |
| village | Village | 🔥 | #5a2818 | #ffaa44 | safe, player home |

---

## 6. MAP FEATURES (72 total)

Placed on world-map tiles; shown as an emoji overlay on the tile. Interacted with via walk-over, search, or right-click.

### Food Features (10)
| ID | Icon | Name |
|----|------|------|
| berry_bush | 🫐 | Berry Bush |
| mushroom_patch | 🍄 | Mushroom Patch |
| wild_herbs | 🌿 | Wild Herbs |
| apple_tree | 🍎 | Apple Tree |
| edible_roots | 🥕 | Edible Roots |
| wild_wheat | 🌾 | Wild Wheat |
| bird_nest | 🥚 | Bird Nest |
| beehive | 🐝 | Beehive |
| animal_carcass | 🦌 | Animal Carcass |
| seed_pod | 🌰 | Seed Pods |
| fish_pool | 🐟 | Fishing Hole |

### Wood/Stone/Metal Features (13)
| ID | Icon | Name |
|----|------|------|
| dead_tree | 🪾 | Dead Tree |
| fallen_log | 🪵 | Fallen Log |
| pine_grove | 🌲 | Pine Grove |
| ancient_oak | 🌳 | Ancient Oak |
| stone_outcrop | 🪨 | Stone Outcrop |
| boulder_pile | 🗿 | Boulder Pile |
| clay_deposit | 🟤 | Clay Deposit |
| iron_vein | ⛓ | Iron Vein |
| coal_seam | ⬛ | Coal Seam |
| old_bones | 🦴 | Old Bones |
| scrap_pile | 🔩 | Scrap Pile |
| glass_shards | 🪟 | Glass Shards |
| reeds | 🌾 | Reeds (shares wild_wheat icon) |
| sand_bank | 🟤 | Sand Bank (shares clay_deposit icon) |

### Water Features (6)
| ID | Icon | Name |
|----|------|------|
| spring | 💧 | Spring |
| old_well | 🕳 | Old Well |
| pond | 🟦 | Pond |
| stream | 〰 | Stream |
| rain_pool | 💦 | Rain Pool |
| hot_spring | ♨ | Hot Spring |

### Ruins / Scavenge Sites (30)
| ID | Icon | Name |
|----|------|------|
| ruined_house | 🏚 | Ruined House |
| burned_cabin | 🔥 | Burned Cabin |
| abandoned_farm | 🚜 | Abandoned Farm |
| church_ruins | ⛪ | Church Ruins |
| hospital_ruins | 🏥 | Hospital Ruins |
| police_station | 🚓 | Police Station |
| fire_station | 🚒 | Fire Station |
| factory_ruins | 🏭 | Factory Ruins |
| power_station | ⚡ | Power Station |
| shopping_mall | 🏬 | Shopping Mall |
| train_station | 🚉 | Train Station |
| school_ruins | 🏫 | School Ruins |
| library_ruins | 📚 | Library Ruins |
| abandoned_car | 🚗 | Abandoned Car |
| crashed_bus | 🚌 | Crashed Bus |
| wrecked_truck | 🚛 | Wrecked Truck |
| crashed_heli | 🚁 | Crashed Helicopter (rare) |
| roadblock | 🚧 | Roadblock |
| abandoned_camp | ⛺ | Abandoned Camp |
| soldier_remains | 💀 | Soldier Remains |
| hiker_corpse | 💀 | Hiker Remains |
| suitcase | 🧳 | Old Suitcase |
| toolbox | 🧰 | Toolbox |
| footlocker | 📦 | Footlocker |
| medicine_cabinet | 💊 | Medicine Cabinet |
| cellar | 🚪 | Cellar |
| storehouse | 🏪 | Storehouse |
| workshop_ruins | 🛠 | Workshop Ruins |
| forge_ruins | ⚒ | Forge Ruins |
| watchtower_ruin | 🗼 | Watchtower |
| bunker_hatch | 🔒 | Bunker Hatch (rare) |
| silo | 🏗 | Farm Silo |
| gas_pump | ⛽ | Gas Pump |
| wrecked_tank | 🪖 | Wrecked Tank (rare) |
| ammo_crate | 🎁 | Ammo Crate (rare) |
| rope_pile | 🪢 | Rope Pile |

### Underground Entrances (4)
| ID | Icon | Name |
|----|------|------|
| mine_entrance | ⛏ | Mine Entrance |
| cave_mouth | 🕳 | Cave Mouth |
| subway_stairs | 🚇 | Subway Stairs (rare) |
| storm_drain | 🕳 | Storm Drain |

### Hazards (12)
| ID | Icon | Name | Effect |
|----|------|------|--------|
| radioactive_pool | ☢ | Radioactive Pool | damage + disease |
| toxic_cloud | 💨 | Toxic Cloud | damage |
| landmine | 💣 | Landmine | heavy damage, hidden |
| rusty_trap | 🪤 | Rusty Trap | damage, hidden |
| pitfall | 🕳 | Pitfall | damage + energy loss, hidden |
| collapsed_floor | ⚠ | Collapsed Floor | damage, hidden |
| spike_trap | ⚠ | Spike Trap | damage, hidden |
| acid_puddle | 🧪 | Acid Puddle | damage |
| quicksand | 🟫 | Quicksand | energy loss |
| plague_nest | 🦠 | Plague Nest | disease |
| mass_grave | ⚰ | Mass Grave | disease |
| lightning_zone | ⛈ | Storm Field | damage |
| burning_pile | 🔥 | Burning Wreck | damage |
| ash_pit | 🌫 | Ash Pit | damage + energy loss |

### Events / Oddities (8)
| ID | Icon | Name | Event Type |
|----|------|------|------------|
| strange_shrine | ⛩ | Strange Shrine | shrine |
| old_radio | 📻 | Old Radio | radio |
| music_box | 🎵 | Music Box | music |
| hidden_cache | 💰 | Hidden Cache | cache |
| glowing_woods | 🌌 | Glowing Woods | glow |
| map_fragment | 🗺 | Map Fragment | map |
| signal_fire | 🔥 | Old Signal Fire | signal |
| graveyard | 🪦 | Graveyard | grave |

---

## 7. MAP ENTITIES (31 total)

Visible creatures/NPCs placed on world map tiles; shown as emoji overlay.

### Hostile Entities (15)
| ID | Icon | Name | Enemy Key |
|----|------|------|-----------|
| wild_dogs_pack | 🐕 | Wild Dogs | wild_dogs |
| wolf | 🐺 | Wolf | wolves |
| bear | 🐻 | Bear | bears |
| infected_npc | 🧟 | Infected | infected |
| raider_npc | 🥷 | Raider | raiders |
| bandit_camp | ⚔ | Bandit Camp | bandits |
| mutant_beast | 👹 | Mutant Beast | mutated_animals |
| cultist_npc | 🕯 | Cultist | cultists |
| forest_beast_e | 🦁 | Forest Beast | forest_beasts |
| night_stalker_e | 🦇 | Night Stalker | night_stalkers |
| thief_npc | 🕵 | Thief | thieves |
| rogue_hunter_e | 🏹 | Rogue Hunter | rogue_hunters |
| warlord_scout_e | 🎖 | Warlord Scout | warlord_scouts |
| scavenger_gang | 🗡 | Scavengers | scavengers |
| desperate_npc | 😵 | Desperate Wanderer | desperate |

### Huntable Animals (5)
| ID | Icon | Name |
|----|------|------|
| rabbit | 🐇 | Rabbit |
| deer | 🦌 | Deer |
| boar | 🐗 | Boar |
| wild_turkey | 🦃 | Wild Turkey |
| mountain_goat | 🐐 | Mountain Goat |

### Friendly NPCs (11)
| ID | Icon | Name | Type |
|----|------|------|------|
| lost_child_npc | 🧒 | Lost Child | child |
| wounded_npc | 🤕 | Wounded Survivor | wounded |
| wanderer_npc | 🚶 | Wanderer | easy |
| hermit_npc | 🧙 | Old Hermit | hermit |
| trader_npc | 🧺 | Trader | trader |
| hunter_friendly | 🏹 | Friendly Hunter | hunter |
| refugee_family | 👨‍👩‍👧 | Refugees | family |
| wise_elder | 👴 | Wise Elder | elder |
| doctor_npc | 🩺 | Doctor | doctor |
| mechanic_npc | 🔧 | Mechanic | mechanic |
| scholar_npc | 📖 | Wandering Scholar | scholar |
| loyal_dog | 🐶 | Loyal Dog | dog |
| sage_npc | 🧓 | The Old Sage | sage (unique) |

---

## 8. ENEMIES (16 total)

Used in combat modals, raid events, and scavenging encounter text.

| ID | Name | HP | Damage | Danger |
|----|------|----|--------|--------|
| wild_dogs | Wild Dogs | 12 | 3-6 | 1 |
| wolves | Wolves | 18 | 5-9 | 2 |
| bears | Bear | 36 | 10-16 | 4 |
| infected | Infected Wanderer | 14 | 4-7 | 2 |
| scavengers | Scavenger | 16 | 4-8 | 2 |
| raiders | Raider | 22 | 6-10 | 3 |
| bandits | Bandits | 28 | 7-12 | 3 |
| mutated_animals | Mutated Beast | 30 | 8-14 | 4 |
| desperate | Desperate Survivor | 14 | 3-6 | 1 |
| cultists | Cultist | 20 | 6-10 | 3 |
| rogue_hunters | Rogue Hunter | 24 | 7-11 | 3 |
| forest_beasts | Forest Beast | 22 | 6-10 | 3 |
| night_stalkers | Night Stalker | 30 | 9-14 | 4 |
| thieves | Thieves | 14 | 3-6 | 1 |
| warlord_scouts | Warlord Scout | 30 | 10-15 | 5 |

---

## 9. UNDERGROUND SITES (4 types)

Accessed from mine_entrance, cave_mouth, subway_stairs, storm_drain map features. Each has a shallow and deep expedition option shown in a modal dialog.

| ID | Name | Icon |
|----|------|------|
| mine | Abandoned Mine | ⛏ |
| cave | Natural Cave | 🕳 |
| subway | Buried Subway | 🚇 |
| drain | Storm Drain | 🕳 |

---

## 10. CRAFTABLE ITEMS / GEAR (24 items)

Shown in the Inventory tab gear list and Crafting tab. Equippable items go in slots.

### Tools (no equip slot, auto-selected)
| ID | Name | Kind | Tier | Weight |
|----|------|------|------|--------|
| stone_axe | Stone Axe | axe | 1 | 1.5 |
| iron_axe | Iron Axe | axe | 2 | 1.5 |
| steel_axe | Steel Axe | axe | 3 | 1.5 |
| stone_pick | Stone Pickaxe | pick | 1 | 2 |
| iron_pick | Iron Pickaxe | pick | 2 | 2 |
| steel_pick | Steel Pickaxe | pick | 3 | 2 |
| shovel | Shovel | shovel | 1 | 1.5 |
| hoe | Hoe | hoe | 1 | 1.5 |
| knife | Knife | knife | 1 | 0.4 |
| hammer | Hammer | hammer | 1 | 1 |
| saw | Saw | saw | 1 | 1 |
| crowbar | Crowbar | crowbar | 1 | 1.5 |
| fishing_rod | Fishing Rod | rod | 1 | 0.8 |
| bucket | Bucket | bucket | — | 0.8 |
| canteen | Canteen | canteen | — | 0.3 |

### Weapons (equip to "weapon" slot)
| ID | Name | Kind | Damage | Weight |
|----|------|------|--------|--------|
| bow | Bow | bow | 4 | 1 |
| salvaged_weapon | Salvaged Weapon | weapon | 6 | 2 |

### Light Sources (auto-selected, consume fuel)
| ID | Name | Kind | Vision Bonus | Weight |
|----|------|------|-------------|--------|
| torch | Torch | light | +2 | 0.3 |
| lantern | Lantern | light | +3 | 0.8 |

### Navigation / Utility
| ID | Name | Kind | Weight |
|----|------|------|--------|
| compass | Home Compass | compass | 0.2 |
| binoculars | Binoculars | survey | 0.5 |

### Shelter / Sleep
| ID | Name | Kind | Weight |
|----|------|------|--------|
| sleeping_bag | Sleeping Bag | bedroll | 2 |
| portable_tent | Portable Tent | tent | 3 |

### Packs (equip to "pack" slot)
| ID | Name | Kind | Capacity | Weight |
|----|------|------|----------|--------|
| backpack | Canvas Backpack | pack | 45 | 1 |
| hiking_pack | Framed Backpack | pack | 65 | 1.5 |

### Clothing (equip to "clothing" slot)
| ID | Name | Kind | Insulation/Armor | Weight |
|----|------|------|-----------------|--------|
| warm_coat | Warm Coat | coat | 3 insulation | 1.5 |
| raincoat | Raincoat | coat | 1 insulation, rainproof | 1 |
| leather_armor | Leather Armor | armor | 3 armor | 2 |

---

## 11. TRAITS (16 total)

Shown as badges on survivor cards and in trait lists.

| ID | Label | Effect Description |
|----|-------|-------------------|
| brave | Brave | +combat, -fear |
| cowardly | Cowardly | -combat, may flee |
| hardworking | Hardworking | +25% job output |
| lazy | Lazy | -25% job output |
| medic | Medic | better healer |
| hunter | Hunter | better hunter |
| builder | Builder | better builder |
| farmer | Farmer | better farmer |
| guard | Guard | better guard |
| teacher | Teacher | better teacher |
| mechanic | Mechanic | better mechanic |
| cook | Cook | better cook |
| leader | Leader | +morale aura |
| troublemaker | Troublemaker | -morale aura |
| tough | Tough | +max health |
| quick | Quick | +flee chance |

---

## 12. CROPS (5 types)

Shown in the Farming tab crop selector and farm plot cards.

| ID | Name | Growth Days | Output |
|----|------|-------------|--------|
| vegetables | Vegetables | 2 | 6 crops, 2 seeds |
| grain | Grain | 3 | 10 crops, 3 seeds |
| flax | Fiber crop | 3 | 12 fiber, 2 seeds |
| herbs | Medicinal herbs | 2.5 | 7 herbs, 2 seeds |
| orchard | Orchard | 4 | 10 food, 2 seeds (perennial) |

---

## 13. KNOWLEDGE TREE (24 nodes)

Shown in the Knowledge tab as clickable nodes grouped by category.

| Category | Nodes |
|----------|-------|
| Survival | Survival Basics (5), Firecraft (8), Foraging (8) |
| Building | Basic Building (6), Masonry (12), Large Structures (18) |
| Farming | Farming (10), Animal Husbandry (14), Greenhouses (18) |
| Medicine | Herbalism (8), Medicine (14) |
| Combat | Defense (8), Fortifications (14), Warfare (20) |
| Crafting | Crafting (6), Toolmaking (10), Textiles (10) |
| Engineering | Metalworking (14), Mechanics (18), Water Purification (12) |
| Trade | Trade (10), Diplomacy (14) |
| Community | Community (10), Brewing (12), Justice (14) |
| Education | Literacy (8), Scholarship (16) |

---

## 14. QUICK SCOUT LOCATIONS (14 total)

Shown in the Quick Scout tab with icons, accessed from the settlement.

| ID | Icon | Name | Danger |
|----|------|------|--------|
| forest | 🌲 | Forest | 1 |
| road | 🛣 | Abandoned Road | 1 |
| ruined_house | 🏚 | Ruined House | 2 |
| market | 🛒 | Old Market | 2 |
| police | 🚓 | Police Station | 3 |
| hospital | 🏥 | Hospital Ruins | 3 |
| gas_station | ⛽ | Gas Station | 2 |
| factory | 🏭 | Factory Ruins | 3 |
| farm | 🚜 | Farm Ruins | 1 |
| military | 🪖 | Military Checkpoint | 4 |
| raider_camp | ⚔ | Raider Camp | 5 |
| school | 🏫 | Old School | 2 |
| riverbank | 🏞 | Riverbank | 1 |
| deep_forest | 🌳 | Deep Forest | 3 |
| shelter | 🚪 | Underground Shelter | 4 |

---

## 15. WEATHER TYPES (3 states)

Shown as text in the header HUD and affects gameplay.

| Type | Visual | Effect |
|------|--------|--------|
| clear | "clear" text | No special effect |
| rain | "rain" text | Crops get watered, exposure rises outdoors |
| cold | "cold" text | Warmth drains faster, crop growth halved outdoors |

---

## 16. UI TABS (12 tabs)

Shown as buttons in the center panel tab bar.

| ID | Label (with icon) |
|----|-------------------|
| map | 🗺 World Map |
| town | 🏘 Town |
| inventory | Inventory |
| crafting | Crafting |
| farms | Farming |
| build | 🏗 Build |
| survivors | 👥 Survivors |
| jobs | 🛠 Jobs |
| knowledge | 📚 Knowledge |
| buildings | 🏠 Buildings |
| scout | 🧭 Quick Scout |
| guide | 📖 Guide |

---

## 17. HEADER HUD ELEMENTS

Top bar of the game showing global state.

| Element | Content |
|---------|---------|
| Title | "POST 2045" |
| Day counter | "Day **N**" |
| Phase | Morning / Midday / Evening / Night |
| Clock | HH:MM (24h format) |
| Weather | clear / rain / cold |
| Population | "Pop: **N**" |
| Danger | "Danger: **N**" |
| Reputation | "Rep: **N**" |
| Knowledge | "Knowledge: **N**" |

### Header Buttons
| Button | Label | Icon/Style |
|--------|-------|------------|
| btn-rest | Sleep | — |
| btn-rt | Paused / Live | small |
| btn-speed | 1x / 2x / 3x | small |
| btn-save | Save | small |
| btn-load | Load | small |
| btn-reset | Reset | small, danger style |
| btn-help | ? | small |

---

## 18. TIME-OF-DAY PHASE ICONS

Used in the map phase badge and log timestamps.

| Phase | Icon + Label |
|-------|-------------|
| Morning | ☀ Morning |
| Midday | ☀ Midday |
| Evening | 🌇 Evening |
| Night | 🌙 Midnight |

---

## 19. MODAL DIALOGS

Pop-up modals that overlay the game. Each needs distinctive visual treatment.

| Modal | Title Icon | When |
|-------|-----------|------|
| Combat | ⚔ | Walking into hostile entity |
| Trader | — | Random trader event |
| Name Your Survivor | — | New game start |
| You Have Perished | — | Player death (no heir) |
| The Line Continues | — | Player death (heir takes over) |
| Pulled Back From Death | — | Rescue by companion |
| Rest and Sleep | — | Sleep button pressed |
| Friendly NPC Dialog | varies | Walking into friendly entity |
| Underground Expedition | varies | Stepping on underground entrance |
| Tile Action Dialog | — | Right-click or click current tile |

---

## 20. MAP MARKERS & OVERLAYS

Special indicators drawn on map tiles.

| Marker | Character/Icon | Meaning |
|--------|---------------|---------|
| Player | 🧑 | Current player position |
| Village/Home | 🔥 | Settlement campfire tile |
| Camp | C | Field camp on a tile |
| Cache | $ | Ground cache with resources |
| Waypoint | + | Player-placed marker |
| Follower count | +N | Number following the player |
| Settlement building | Building emoji | Built structure on the map |

---

## 21. SETTLEMENT SUMMARY ICONS

Left panel settlement card.

| Element | Icon |
|---------|------|
| Settlement header | 🏕 |
| Population | — |
| Housing | — |
| Workers | — |
| Danger | colored by severity |
| Reputation | — |
| Knowledge | — |
| Storage cap | — |

---

## 22. RIGHT PANEL ELEMENTS

| Section | Header Icon |
|---------|------------|
| Town Stockpile | — |
| Daily Outlook | 📈 |
| Event Log | 📜 |

### Event Log Entry Types (color-coded)
| Type | CSS Class | Meaning |
|------|-----------|---------|
| good | `.good` | Positive event (green) |
| bad | `.bad` | Negative event (red) |
| warn | `.warn` | Warning (amber) |
| info | `.info` | Neutral information |

---

## 23. QUICK ACTION ICONS (used in left panel buttons)

| Action | Implied Icon | Group |
|--------|-------------|-------|
| Eat | 🍞 | Survival |
| Drink | 💧 | Survival |
| Rest | 💤 | Survival |
| Bandage | 🩹 | Survival |
| Warm up | 🔥 | Survival |
| Chop wood | 🪓 | Gather |
| Forage | 🌿 | Gather |
| Fetch water | 🪣 | Gather |
| Gather fiber | — | Gather |
| Gather stone | — | Gather |
| Mine | ⛏ | Gather |
| Dig | 🕳 | Gather |
| Fish | 🎣 | Gather |
| Hunt | 🏹 | Gather |
| Survey | 🔭 | Gather |
| Cook | 🍳 | Camp & Craft |
| Boil water | 🔥 | Camp & Craft |
| Filter water | ⬛ | Camp & Craft |
| Craft arrows | 🏹 | Camp & Craft |
| Pitch tent | ⛺ | Camp & Craft |
| Lay sleeping bag | 🛏 | Camp & Craft |
| Build lean-to | — | Camp & Craft |
| Fuel field fire | 🔥 | Camp & Craft |
| Pack camp | 📦 | Camp & Craft |
| Share stories | 🎺 | Camp & Craft |
| Study | 📖 | Camp & Craft |
| Train | 🥋 | Camp & Craft |
| Sleep | 🛏 | Header button |

---

## 24. COMBAT UI ELEMENTS

Shown in the combat modal overlay.

| Element | Description |
|---------|-------------|
| Enemy HP bar | Red bar with enemy name |
| Player HP bar | Green bar |
| Combat skill display | Number |
| Weapon name | Text (or "Unarmed") |
| Ammo count | Number |
| Combat log | Scrollable text area |
| Attack button | Primary action |
| Flee button | Secondary action |

---

## 25. HINT / THINKING SYSTEM

A floating tooltip that appears when the player is idle.

| Element | Icon/Style |
|---------|-----------|
| Thinking avatar | 🤔 |
| Hint bubble | Speech bubble with dismiss button |
| Thinker name | Player's name + "is thinking..." |

---

## 26. FAVICON

The browser tab icon is an inline SVG campfire:
- Dark rounded rectangle background (#120f0b)
- Crossed sticks (#856a46)
- Orange flame (#ff9f1c)
- Yellow inner flame (#ffd166)

---

## 27. CRAFTING RECIPES (41 total)

Each recipe appears in the Crafting tab. Recipes that produce items need an item icon; recipes that produce resources use the resource icon.

### Resource Recipes
| ID | Name | Input → Output |
|----|------|---------------|
| rope | Twist rope | 3 fiber → 1 rope |
| cloth | Weave cloth | 4 fiber → 1 cloth |
| planks | Cut planks | 2 wood → 2 planks |
| bandages | Clean bandages | 1 cloth + 1 water → 3 bandages |
| repair_kits | Repair kit | 2 metal + 1 cloth → 1 repair kit |
| arrows | Bone arrows | 1 wood + 1 bones → 5 arrows |
| charcoal | Burn charcoal | 3 wood → 2 charcoal |
| iron | Smelt ore | 2 ore + 1 charcoal → 1 iron |
| scrap_iron | Recycle scrap iron | 3 metal + 1 charcoal → 1 iron |
| steel | Forge steel | 2 iron + 2 charcoal → 1 steel |
| glass | Fire glass | 3 sand + 1 charcoal → 2 glass |
| bricks | Fire bricks | 3 clay + 1 charcoal → 3 bricks |
| nails | Forge nails | 1 metal → 4 nails |
| clean_water | Boil water | 2 dirty water + 1 wood → 2 water |
| filtered_water | Filter water | 2 dirty water + 1 charcoal → 2 water |
| meal | Cook meat | 1 meat + 1 wood → 3 food |
| vegetable_meal | Cook crops | 2 crops + 1 wood → 3 food |
| compost | Compost scraps | 1 crops + 2 fiber → 2 compost |

### Item Recipes (produce gear)
| ID | Produces | Station |
|----|----------|---------|
| stone_axe | Stone Axe | hand |
| iron_axe | Iron Axe | forge |
| steel_axe | Steel Axe | forge |
| stone_pick | Stone Pickaxe | hand |
| iron_pick | Iron Pickaxe | forge |
| steel_pick | Steel Pickaxe | forge |
| shovel | Shovel | crafting table |
| hoe | Hoe | hand |
| knife | Knife | crafting table |
| hammer | Hammer | hand |
| saw | Saw | crafting table |
| crowbar | Crowbar | forge |
| bow | Bow | crafting table |
| salvaged_weapon | Salvaged Weapon | hand |
| fishing_rod | Fishing Rod | hand |
| bucket | Bucket | crafting table |
| canteen | Canteen | crafting table |
| torch | Torch | hand |
| lantern | Lantern | crafting table |
| compass | Home Compass | crafting table |
| binoculars | Binoculars | workshop |
| sleeping_bag | Sleeping Bag | hand |
| portable_tent | Portable Tent | crafting table |
| backpack | Canvas Backpack | crafting table |
| hiking_pack | Framed Backpack | workshop |
| warm_coat | Warm Coat | crafting table |
| raincoat | Raincoat | crafting table |
| leather_armor | Leather Armor | workshop |

---

## 28. JOBS (55 total)

Each job is shown in the Jobs tab dropdown per survivor.

### General Jobs (no building required)
| ID | Name |
|----|------|
| none | Idle |
| woodcutter | Woodcutter |
| lumber_picker | Lumber Picker |
| charcoal_burner | Charcoal Burner |
| gatherer | Gatherer |
| trapper | Trapper |
| water_carrier | Water Carrier |
| camp_cook | Camp Cook |
| chronicler | Chronicler |
| mediator | Mediator |
| runner | Runner |
| scavenger | Scavenger |
| junk_picker | Junk Picker |
| builder | Builder |
| wallbuilder | Wall Builder |
| stone_collector | Stone Collector |
| fiber_gatherer | Fiber Gatherer |
| clay_digger | Clay Digger |
| rope_maker | Rope Maker |
| miner | Miner |
| purifier_camp | Camp Water Purifier |
| fletcher | Fletcher |
| composter | Composter |
| hauler | Expedition Hauler |

### Building Jobs (require matching building)
| ID | Name | Building |
|----|------|----------|
| hunter | Hunter | hunting_lodge |
| guard | Guard | guard_post |
| watchman | Watchman | watchtower |
| drill_sergeant | Drill Sergeant | barracks |
| farmer | Farmer | crop_field |
| gardener | Gardener | garden |
| seed_saver | Seed Saver | garden |
| greenhouse | Greenhouse Worker | greenhouse |
| rancher | Rancher | animal_stable |
| chickenkeeper | Chickenkeeper | chicken_coop |
| goatkeeper | Goatkeeper | goat_pen |
| toolmaker | Toolmaker | toolsmith |
| workshop_tinker | Workshop Tinker | workshop |
| carpenter | Carpenter | carpenter |
| sawyer | Sawyer | sawmill |
| smith | Smith | forge |
| recycler | Recycler | recycler |
| scrapper | Scrapper | scrapyard |
| charcoal_maker | Charcoal Maker | charcoal_kiln |
| tailor | Tailor | tailor |
| leatherworker | Leatherworker | leatherworker |
| cook | Cook | kitchen |
| smoker | Smoker | smokehouse |
| brewer | Brewer | brewery |
| alchemist | Alchemist | medicine_workshop |
| herbalist | Herbalist | herbalist |
| healer | Healer | clinic |
| nurse | Nurse | clinic |
| teacher | Teacher | school |
| tutor | Tutor | school |
| scholar | Scholar | library |
| archivist | Archivist | library |
| innkeeper | Innkeeper | inn |
| barkeep | Barkeep | tavern |
| trader | Trader | trading_post |
| shopkeeper | Shopkeeper | market_stall |
| barterer | Barterer | market_stall |
| storekeeper | Storekeeper | warehouse |
| quartermaster | Quartermaster | storage_shed |
| signaller | Signaller | signal_tower |
| scout | Scout | scout_camp |
| pathfinder | Pathfinder | scout_camp |
| bathhouse_keeper | Bathhouse Keeper | bathhouse |
| water_worker | Water Worker | water_collector |
| rain_tender | Rain Tender | rain_barrel |
| well_worker | Well Worker | well |
| purifier_op | Purifier Op | purifier |
| armorer | Armorer | armory |
| trainer | Trainer | training_yard |
| mechanic | Mechanic | mechanics_shed |
| repairman | Repairman | repair_station |
| warden | Warden | prison_cage |
| fisher | Fisher | fishing_station |
| equipment_crafter | Equipment Crafter | crafting_table |
| smelter | Smelter | furnace |

---

## 29. COMPLETE ICON INVENTORY (for SVG replacement)

Total unique visual elements needing custom SVGs:

| Category | Count | Notes |
|----------|-------|-------|
| Resources | 46 | 6 currently share icons — need unique designs |
| Buildings | 63 | Multiple duplicates to resolve |
| Biome tile characters | 14 | ASCII/symbol characters on map tiles |
| Map features | 72 | Emoji overlays on map tiles |
| Map entities | 31 | Emoji overlays (hostiles, animals, NPCs) |
| Craftable items/gear | 24 | Currently no dedicated emoji (use resource icons) |
| Survivor need bars | 8 | Small icons in bar labels |
| Survivor conditions | 6 | Status badges (diseased, injured, star, child, partner, heart) |
| UI tab icons | 8 | Tab bar labels with emoji |
| Time-of-day icons | 4 | Phase badges |
| Quick action icons | ~28 | Button decorations |
| Header elements | ~8 | HUD stats and buttons |
| Map markers | 6 | Overlay markers (player, village, camp, cache, waypoint, followers) |
| Combat elements | 2 | Attack/flee button icons |
| Hint avatar | 1 | Thinking emoji |
| Favicon | 1 | Browser tab campfire |
| Weather indicators | 3 | clear/rain/cold |
| **TOTAL** | **~325** | Unique visual elements |

---

## 30. INTERACTION SUMMARY

### Player → World
- **WASD/Arrows**: Move on world map (energy + time cost per biome)
- **Click tile**: Auto-walk pathfinding
- **Space**: Cancel auto-walk
- **Walk into hostile**: Triggers combat modal
- **Walk into friendly**: Triggers dialog modal
- **Walk into feature**: Triggers harvesting/event
- **Right-click tile**: Opens tile action dialog (within 2 tiles)
- **Search nearby button**: Harvests all adjacent features

### Player → Settlement
- **Build tab → Place on Map**: Select building, click town grid tile
- **Jobs tab → Dropdown**: Assign survivor to a job
- **Knowledge tab → Click node**: Spend knowledge to research
- **Farming tab → Plant/Water/Harvest**: Direct farm interaction
- **Production orders**: Set crafting orders for buildings with workers

### Player → Self
- **Quick Actions (left panel)**: Eat, drink, rest, chop, forage, cook, etc.
- **Inventory tab**: Transfer resources, equip/unequip gear, repair, deploy camp
- **Crafting tab**: Craft items and resources at stations
- **Sleep button**: Opens sleep duration modal
- **Court/Marry**: Relationship actions on survivors tab

### World → Player (automatic)
- **Tick decay**: Hunger, thirst, energy, warmth drain every phase
- **Auto-consume**: Survivors eat/drink from stocks when hungry/thirsty
- **Building production**: Workers produce resources each tick
- **Day-end events**: Relationships, births, threats, raids, weather changes
- **Random events**: Disease, fire, stranger arrival, resource discovery
- **Raid events**: Enemies attack, steal resources, damage buildings
- **Hint system**: Floating "thinking" hint after 10s idle

### Combat Flow
1. **Start**: Walk into hostile → modal opens
2. **Attack**: Player deals damage (base + weapon + skill + traits)
3. **Enemy turn**: Enemy deals damage (base - armor)
4. **Flee**: Chance-based escape (40% base ± traits ± danger)
5. **Win**: Loot dropped, +0.5 combat skill, +0.5 reputation
6. **Lose**: Lose 20% of carried resources, possible death

### Death Flow
1. Player health hits 0
2. Check: nearby helper with medicine → rescue (restore to 22-35 HP)
3. Check: living child → continue as heir
4. Otherwise: game over modal → new run
