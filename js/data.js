"use strict";

/* ============================================================
   POST 2045
   Browser-based post-apocalyptic survival and strategy prototype
   ============================================================ */

// ------------------------- DATA ------------------------------

const RESOURCES = {
  wood:        {name:"Wood",         icon:"🪵"},
  planks:      {name:"Planks",       icon:"🟫"},
  stone:       {name:"Stone",        icon:"🪨"},
  bricks:      {name:"Bricks",       icon:"🧱"},
  clay:        {name:"Clay",         icon:"🟤"},
  metal:       {name:"Metal Scraps", icon:"🔩"},
  iron:        {name:"Iron",         icon:"⛓"},
  steel:       {name:"Steel",        icon:"⚙"},
  nails:       {name:"Nails",        icon:"📌"},
  tools:       {name:"Tools",        icon:"🛠"},
  rope:        {name:"Rope",         icon:"🪢"},
  cloth:       {name:"Cloth",        icon:"🧵"},
  leather:     {name:"Leather",      icon:"🟫"},
  hides:       {name:"Hides",        icon:"🦌"},
  bones:       {name:"Bones",        icon:"🦴"},
  food:        {name:"Food",         icon:"🍞"},
  meat:        {name:"Meat",         icon:"🍖"},
  crops:       {name:"Crops",        icon:"🌾"},
  seeds:       {name:"Seeds",        icon:"🌱"},
  herbs:       {name:"Herbs",        icon:"🌿"},
  water:       {name:"Clean Water",  icon:"💧"},
  dirty_water: {name:"Dirty Water",  icon:"💧"},
  medicine:    {name:"Medicine",     icon:"💊"},
  alcohol:     {name:"Alcohol",      icon:"🍺"},
  charcoal:    {name:"Charcoal",     icon:"⬛"},
  fuel:        {name:"Fuel",         icon:"⛽"},
  oil:         {name:"Oil",          icon:"🛢"},
  parts:       {name:"Parts",        icon:"🔧"},
  components:  {name:"Components",   icon:"🔌"},
  batteries:   {name:"Batteries",    icon:"🔋"},
  glass:       {name:"Glass",        icon:"🪟"},
  weapons:     {name:"Weapons",      icon:"🗡"},
  ammo:        {name:"Ammunition",   icon:"📦"},
  books:       {name:"Books",        icon:"📖"},
};

const RES_KEYS = Object.keys(RESOURCES);

const NEED_DEFS = {
  health:    {label:"Health",    color:"var(--hp)"},
  hunger:    {label:"Hunger",    color:"var(--hunger)"},
  thirst:    {label:"Thirst",    color:"var(--thirst)"},
  energy:    {label:"Energy",    color:"var(--energy)"},
  happiness: {label:"Happiness", color:"var(--happy)"},
  safety:    {label:"Safety",    color:"var(--safety)"},
  morale:    {label:"Morale",    color:"var(--morale)"},
  warmth:    {label:"Warmth",    color:"var(--warm)"},
};

// Locations
const LOCATIONS = {
  forest:        {name:"Forest",            icon:"🌲", danger:1,  time:2, energy:8,  loot:{wood:[2,5], herbs:[0,2], seeds:[0,1], bones:[0,1]}, survChance:.04, foundEnemies:["wild_dogs","wolves","forest_beasts"]},
  road:          {name:"Abandoned Road",    icon:"🛣", danger:1,  time:2, energy:7,  loot:{metal:[1,3], cloth:[0,2], parts:[0,1], fuel:[0,1]}, survChance:.06, foundEnemies:["scavengers","thieves","desperate"]},
  ruined_house:  {name:"Ruined House",      icon:"🏚", danger:2,  time:2, energy:10, loot:{wood:[1,3], cloth:[1,3], food:[0,2], tools:[0,1], books:[0,1]}, survChance:.08, foundEnemies:["infected","scavengers","thieves"]},
  market:        {name:"Old Market",        icon:"🛒", danger:2,  time:3, energy:12, loot:{food:[1,4], cloth:[1,3], medicine:[0,1], alcohol:[0,1], glass:[0,2]}, survChance:.08, foundEnemies:["scavengers","raiders","desperate"]},
  police:        {name:"Police Station",    icon:"🚓", danger:3,  time:3, energy:14, loot:{weapons:[0,1], ammo:[0,3], metal:[1,3], books:[0,1]}, survChance:.06, foundEnemies:["infected","raiders","bandits"]},
  hospital:      {name:"Hospital Ruins",    icon:"🏥", danger:3,  time:3, energy:14, loot:{medicine:[1,3], herbs:[0,2], cloth:[1,3], books:[0,1]}, survChance:.08, foundEnemies:["infected","cultists","desperate"]},
  gas_station:   {name:"Gas Station",       icon:"⛽", danger:2,  time:3, energy:12, loot:{fuel:[1,3], oil:[0,2], parts:[0,2], metal:[1,2]}, survChance:.05, foundEnemies:["raiders","bandits","scavengers"]},
  factory:       {name:"Factory Ruins",     icon:"🏭", danger:3,  time:4, energy:16, loot:{metal:[2,5], parts:[1,3], components:[0,2], iron:[0,2], oil:[0,1]}, survChance:.06, foundEnemies:["mutated_animals","raiders","infected"]},
  farm:          {name:"Farm Ruins",        icon:"🚜", danger:1,  time:3, energy:12, loot:{food:[1,3], seeds:[1,3], crops:[0,2], hides:[0,1], tools:[0,1]}, survChance:.1,  foundEnemies:["wild_dogs","desperate","wolves"]},
  military:      {name:"Military Checkpoint",icon:"🪖",danger:4,  time:4, energy:18, loot:{weapons:[0,2], ammo:[1,4], steel:[0,2], components:[0,2], batteries:[0,1]}, survChance:.05, foundEnemies:["bandits","warlord_scouts","infected"]},
  raider_camp:   {name:"Raider Camp",       icon:"⚔", danger:5,  time:3, energy:18, loot:{weapons:[1,2], ammo:[1,3], food:[1,3], alcohol:[0,2], leather:[0,2]}, survChance:.03, foundEnemies:["raiders","bandits","warlord_scouts"]},
  school:        {name:"Old School",        icon:"🏫", danger:2,  time:3, energy:12, loot:{books:[1,3], cloth:[0,2], glass:[0,2], parts:[0,1]}, survChance:.1,  foundEnemies:["infected","desperate","thieves"]},
  riverbank:     {name:"Riverbank",         icon:"🏞", danger:1,  time:2, energy:8,  loot:{dirty_water:[3,6], clay:[1,3], herbs:[0,2], stone:[0,2]}, survChance:.04, foundEnemies:["wild_dogs","forest_beasts","mutated_animals"]},
  deep_forest:   {name:"Deep Forest",       icon:"🌳", danger:3,  time:4, energy:18, loot:{wood:[3,7], herbs:[1,3], hides:[0,2], meat:[0,2], bones:[0,2]}, survChance:.05, foundEnemies:["bears","wolves","forest_beasts","night_stalkers"]},
  shelter:       {name:"Underground Shelter",icon:"🚪",danger:4,  time:4, energy:18, loot:{food:[1,3], water:[1,3], medicine:[0,2], weapons:[0,1], books:[0,2], batteries:[0,2]}, survChance:.1, foundEnemies:["cultists","infected","rogue_hunters"]},
};

// Enemies
const ENEMIES = {
  wild_dogs:      {name:"Wild Dogs",        hp:12, dmg:[3,6],  danger:1, loot:{hides:[0,1], bones:[1,2], meat:[0,1]}},
  wolves:         {name:"Wolves",           hp:18, dmg:[5,9],  danger:2, loot:{hides:[1,2], bones:[1,2], meat:[1,2]}},
  bears:          {name:"Bear",             hp:36, dmg:[10,16],danger:4, loot:{hides:[2,3], bones:[2,4], meat:[2,4], leather:[0,1]}},
  infected:       {name:"Infected Wanderer",hp:14, dmg:[4,7],  danger:2, loot:{cloth:[0,1], bones:[0,1]}},
  scavengers:     {name:"Scavenger",        hp:16, dmg:[4,8],  danger:2, loot:{metal:[0,2], cloth:[0,2], food:[0,1]}},
  raiders:        {name:"Raider",           hp:22, dmg:[6,10], danger:3, loot:{weapons:[0,1], ammo:[0,2], leather:[0,1]}},
  bandits:        {name:"Bandits",          hp:28, dmg:[7,12], danger:3, loot:{weapons:[0,1], ammo:[0,2], food:[0,2], alcohol:[0,1]}},
  mutated_animals:{name:"Mutated Beast",    hp:30, dmg:[8,14], danger:4, loot:{hides:[1,2], meat:[1,3], bones:[1,3]}},
  desperate:      {name:"Desperate Survivor",hp:14,dmg:[3,6],  danger:1, loot:{cloth:[0,1], food:[0,1]}},
  cultists:       {name:"Cultist",          hp:20, dmg:[6,10], danger:3, loot:{books:[0,1], herbs:[0,2], cloth:[0,1]}},
  rogue_hunters:  {name:"Rogue Hunter",     hp:24, dmg:[7,11], danger:3, loot:{weapons:[0,1], meat:[0,2], hides:[0,2]}},
  forest_beasts:  {name:"Forest Beast",     hp:22, dmg:[6,10], danger:3, loot:{hides:[1,2], meat:[1,2], bones:[1,2]}},
  night_stalkers: {name:"Night Stalker",    hp:30, dmg:[9,14], danger:4, loot:{hides:[1,2], bones:[1,3], herbs:[0,1]}},
  thieves:        {name:"Thieves",          hp:14, dmg:[3,6],  danger:1, loot:{cloth:[0,2], tools:[0,1], food:[0,1]}},
  warlord_scouts: {name:"Warlord Scout",    hp:30, dmg:[10,15],danger:5, loot:{weapons:[0,2], ammo:[1,3], steel:[0,1]}},
};

// Knowledge tree
// Each node: {id, name, cat, cost, req:[ids], desc, unlock:{buildings:[], jobs:[]}}
const KNOWLEDGE = [
  // Survival
  {id:"survival_basics", name:"Survival Basics",  cat:"Survival",   cost:5,  req:[], desc:"Learn essential survival skills.", unlock:{buildings:["tent","rain_barrel"]}},
  {id:"firecraft",       name:"Firecraft",        cat:"Survival",   cost:8,  req:["survival_basics"], desc:"Better use of fuel and warmth.", unlock:{buildings:["charcoal_kiln"]}},
  {id:"foraging",        name:"Foraging",         cat:"Survival",   cost:8,  req:["survival_basics"], desc:"Find more herbs and seeds.", unlock:{}},
  // Building
  {id:"basic_building",  name:"Basic Building",   cat:"Building",   cost:6,  req:[], desc:"Construct simple wooden buildings.", unlock:{buildings:["shelter","wooden_hut","storage_shed"]}},
  {id:"masonry",         name:"Masonry",          cat:"Building",   cost:12, req:["basic_building"], desc:"Work with stone and clay.", unlock:{buildings:["stone_hut","family_cabin","well"]}},
  {id:"large_structures",name:"Large Structures", cat:"Building",   cost:18, req:["masonry"], desc:"Build major town buildings.", unlock:{buildings:["warehouse","town_hall","community_hall","barracks"]}},
  // Farming
  {id:"farming",         name:"Farming",          cat:"Farming",    cost:10, req:["survival_basics"], desc:"Grow crops from seeds.", unlock:{buildings:["garden","crop_field"]}},
  {id:"animal_husbandry",name:"Animal Husbandry", cat:"Farming",    cost:14, req:["farming"], desc:"Raise animals for food.", unlock:{buildings:["chicken_coop","goat_pen","animal_stable"]}},
  {id:"greenhouses",     name:"Greenhouses",      cat:"Farming",    cost:18, req:["farming"], desc:"Year-round food production.", unlock:{buildings:["greenhouse"]}},
  // Medicine
  {id:"herbalism",       name:"Herbalism",        cat:"Medicine",   cost:8,  req:[], desc:"Brew herbal remedies.", unlock:{buildings:["herbalist"]}},
  {id:"medicine",        name:"Medicine",         cat:"Medicine",   cost:14, req:["herbalism"], desc:"Treat disease and wounds.", unlock:{buildings:["clinic","medicine_workshop"]}},
  // Combat
  {id:"defense",         name:"Defense",          cat:"Combat",     cost:8,  req:[], desc:"Defend your settlement.", unlock:{buildings:["guard_post","trap_line"]}},
  {id:"fortifications",  name:"Fortifications",   cat:"Combat",     cost:14, req:["defense"], desc:"Walls, gates, towers.", unlock:{buildings:["palisade","gate","watchtower"]}},
  {id:"warfare",         name:"Warfare",          cat:"Combat",     cost:20, req:["fortifications"], desc:"Train fighters and stockpile arms.", unlock:{buildings:["armory","training_yard"]}},
  // Crafting
  {id:"crafting",        name:"Crafting",         cat:"Crafting",   cost:6,  req:[], desc:"Basic crafted goods.", unlock:{buildings:["workshop","carpenter"]}},
  {id:"toolmaking",      name:"Toolmaking",       cat:"Crafting",   cost:10, req:["crafting"], desc:"Craft and repair tools.", unlock:{buildings:["toolsmith","sawmill"]}},
  {id:"textiles",        name:"Textiles",         cat:"Crafting",   cost:10, req:["crafting"], desc:"Make cloth and leather goods.", unlock:{buildings:["tailor","leatherworker"]}},
  // Engineering
  {id:"metalworking",    name:"Metalworking",     cat:"Engineering",cost:14, req:["crafting"], desc:"Forge iron and steel.", unlock:{buildings:["forge","recycler","scrapyard"]}},
  {id:"mechanics",       name:"Mechanics",        cat:"Engineering",cost:18, req:["metalworking"], desc:"Repair complex machines.", unlock:{buildings:["mechanics_shed","repair_station","fuel_depot"]}},
  {id:"purification",    name:"Water Purification",cat:"Engineering",cost:12,req:["basic_building"], desc:"Clean dirty water reliably.", unlock:{buildings:["water_collector","purifier"]}},
  // Trade
  {id:"trade_basics",    name:"Trade",            cat:"Trade",      cost:10, req:["basic_building"], desc:"Trade with passing strangers.", unlock:{buildings:["market_stall","trading_post"]}},
  {id:"diplomacy",       name:"Diplomacy",        cat:"Trade",      cost:14, req:["trade_basics"], desc:"Better reputation gains.", unlock:{buildings:["signal_tower","scout_camp"]}},
  // Community
  {id:"community",       name:"Community",        cat:"Community",  cost:10, req:[], desc:"Boost morale of all survivors.", unlock:{buildings:["inn","tavern","shrine","bathhouse"]}},
  {id:"brewing",         name:"Brewing",          cat:"Community",  cost:12, req:["community","farming"], desc:"Brew alcohol from crops.", unlock:{buildings:["brewery","kitchen","smokehouse","hunting_lodge"]}},
  {id:"justice",         name:"Justice",          cat:"Community",  cost:14, req:["community"], desc:"Detain troublemakers.", unlock:{buildings:["prison_cage","food_cellar"]}},
  // Education
  {id:"literacy",        name:"Literacy",         cat:"Education",  cost:8,  req:[], desc:"Read and learn from books.", unlock:{buildings:["school"]}},
  {id:"scholarship",     name:"Scholarship",      cat:"Education",  cost:16, req:["literacy"], desc:"Generate knowledge faster.", unlock:{buildings:["library"]}},
];

// Buildings
// {id,name,icon,desc,cost,workers,unlock,effects,cat}
const BUILDINGS = {
  // Starting
  campfire:    {name:"Campfire",        icon:"🔥", cat:"Survival", desc:"Provides warmth and lets you cook food.", cost:{wood:0}, workers:0, max:1, effects:{warmth:1, cook:true}},
  tent:        {name:"Tent",            icon:"⛺", cat:"Shelter",  desc:"Basic shelter for one. +rest quality.", cost:{cloth:4, wood:4}, workers:0, max:4, effects:{housing:1}},
  shelter:     {name:"Shelter",         icon:"🛖", cat:"Shelter",  desc:"Small shelter. Houses 2.", cost:{wood:10, cloth:4}, workers:0, max:6, effects:{housing:2}},
  wooden_hut:  {name:"Wooden Hut",      icon:"🏠", cat:"Shelter",  desc:"Solid wooden home. Houses 3.", cost:{wood:25, nails:4, cloth:4}, workers:0, max:8, effects:{housing:3}},
  stone_hut:   {name:"Stone Hut",       icon:"🏡", cat:"Shelter",  desc:"Durable stone home. Houses 4.", cost:{stone:25, wood:10, nails:6}, workers:0, max:8, effects:{housing:4, safety:1}},
  family_cabin:{name:"Family Cabin",    icon:"🏘", cat:"Shelter",  desc:"Spacious home. Houses 6.", cost:{wood:30, stone:20, planks:10, nails:8}, workers:0, max:6, effects:{housing:6, happiness:1}},

  // Storage
  storage_shed:{name:"Storage Shed",    icon:"📦", cat:"Storage",  desc:"+100 max for all resources.", cost:{wood:15, nails:4}, workers:0, max:8, effects:{storage:100}},
  warehouse:   {name:"Warehouse",       icon:"🏬", cat:"Storage",  desc:"+400 max for all resources.", cost:{wood:50, stone:30, nails:20, planks:20}, workers:1, max:4, effects:{storage:400}},
  food_cellar: {name:"Food Cellar",     icon:"🥖", cat:"Storage",  desc:"+200 food/crops/meat storage. Slows spoilage.", cost:{stone:20, wood:10, clay:10}, workers:0, max:4, effects:{food_storage:200}},

  // Water
  rain_barrel: {name:"Rain Barrel",     icon:"🛢", cat:"Water",    desc:"Slowly collects dirty water.", cost:{wood:8, nails:2}, workers:0, max:8, effects:{produce:{dirty_water:0.5}}},
  water_collector:{name:"Water Collector",icon:"💦",cat:"Water",   desc:"Collects more dirty water.", cost:{wood:12, metal:6, nails:4}, workers:1, max:4, effects:{produce_per_worker:{dirty_water:3}}},
  well:        {name:"Well",            icon:"🕳", cat:"Water",    desc:"Reliable source of clean water.", cost:{stone:25, wood:10, rope:4}, workers:1, max:3, effects:{produce_per_worker:{water:3}}},
  purifier:    {name:"Purifier Station",icon:"🧪", cat:"Water",    desc:"Converts 2 dirty water → 1 clean water/day per worker.", cost:{metal:15, glass:5, parts:5}, workers:1, max:3, effects:{convert:{from:{dirty_water:2}, to:{water:1}, perWorker:3}}},

  // Food production
  garden:      {name:"Garden Plot",     icon:"🌱", cat:"Food",     desc:"Small garden. Needs seeds.", cost:{wood:6, seeds:2}, workers:1, max:8, effects:{produce_per_worker:{crops:1}, consume:{seeds:0.2}}},
  crop_field:  {name:"Crop Field",      icon:"🌾", cat:"Food",     desc:"Larger field. Needs water.", cost:{wood:12, seeds:5}, workers:1, max:8, effects:{produce_per_worker:{crops:3}, consume:{seeds:0.5, water:1}}},
  greenhouse:  {name:"Greenhouse",      icon:"🏡", cat:"Food",     desc:"Year-round crops.", cost:{wood:20, glass:15, nails:8}, workers:1, max:4, effects:{produce_per_worker:{crops:5}, consume:{seeds:0.5, water:2}}},
  chicken_coop:{name:"Chicken Coop",    icon:"🐔", cat:"Food",     desc:"Produces food daily.", cost:{wood:12, cloth:4}, workers:1, max:4, effects:{produce_per_worker:{food:3}}},
  goat_pen:    {name:"Goat Pen",        icon:"🐐", cat:"Food",     desc:"Produces food and hides.", cost:{wood:15, rope:3}, workers:1, max:4, effects:{produce_per_worker:{food:2, hides:0.5}}},
  hunting_lodge:{name:"Hunting Lodge",  icon:"🏹", cat:"Food",     desc:"Hunters bring meat and hides.", cost:{wood:18, weapons:1}, workers:2, max:3, effects:{produce_per_worker:{meat:2, hides:1, bones:1}}},
  smokehouse:  {name:"Smokehouse",      icon:"🥩", cat:"Food",     desc:"Turns meat into food.", cost:{stone:10, wood:10, charcoal:5}, workers:1, max:3, effects:{convert:{from:{meat:2}, to:{food:3}, perWorker:3}}},
  kitchen:     {name:"Kitchen",         icon:"🍳", cat:"Food",     desc:"Turns crops into food.", cost:{wood:12, stone:6, tools:1}, workers:1, max:3, effects:{convert:{from:{crops:2}, to:{food:3}, perWorker:4}}},

  // Health / community
  clinic:      {name:"Clinic",          icon:"⚕", cat:"Medicine", desc:"Heals injured survivors. Slows disease.", cost:{wood:15, cloth:10, glass:4, medicine:2}, workers:1, max:2, effects:{heal_per_worker:8, disease_resist:0.3}},
  herbalist:   {name:"Herbalist Hut",   icon:"🌿", cat:"Medicine", desc:"Brews simple remedies.", cost:{wood:10, herbs:5}, workers:1, max:3, effects:{convert:{from:{herbs:2}, to:{medicine:1}, perWorker:2}}},
  medicine_workshop:{name:"Medicine Workshop",icon:"💊",cat:"Medicine",desc:"Mass medicine production.", cost:{stone:15, wood:10, glass:8, tools:2}, workers:2, max:2, effects:{convert:{from:{herbs:3, water:1}, to:{medicine:2}, perWorker:3}}},
  inn:         {name:"Inn",             icon:"🛏", cat:"Community",desc:"Boosts happiness of all.", cost:{wood:25, cloth:10, nails:4}, workers:1, max:2, effects:{happiness_all:0.5, attract_chance:0.05}},
  tavern:      {name:"Tavern",          icon:"🍺", cat:"Community",desc:"Big happiness boost. Uses alcohol.", cost:{wood:20, stone:10, nails:5}, workers:1, max:2, effects:{happiness_all:1, consume:{alcohol:1}}},
  brewery:     {name:"Brewery",         icon:"🍻", cat:"Community",desc:"Turns crops into alcohol.", cost:{wood:15, glass:5, tools:2}, workers:1, max:2, effects:{convert:{from:{crops:2, water:1}, to:{alcohol:1}, perWorker:2}}},
  shrine:      {name:"Shrine",          icon:"⛩", cat:"Community",desc:"Comforts the bereaved.", cost:{stone:15, wood:10}, workers:0, max:2, effects:{morale_all:0.3}},
  bathhouse:   {name:"Bathhouse",       icon:"🛁", cat:"Community",desc:"+happiness, slight disease resist.", cost:{stone:20, wood:10, clay:10, water:5}, workers:1, max:2, effects:{happiness_all:0.5, disease_resist:0.1, consume:{water:2}}},
  community_hall:{name:"Community Hall",icon:"🏛", cat:"Community",desc:"+morale and reputation.", cost:{wood:30, stone:20, planks:10, nails:8}, workers:0, max:1, effects:{morale_all:1, reputation:0.2}},

  // Education
  school:      {name:"School",          icon:"📚", cat:"Education",desc:"Children grow faster, learn skills.", cost:{wood:15, books:3, cloth:5}, workers:1, max:1, effects:{child_growth:2, knowledge:0.5}},
  library:     {name:"Library",         icon:"📖", cat:"Education",desc:"Generates knowledge from books.", cost:{wood:20, books:10, glass:5}, workers:1, max:1, effects:{knowledge_per_worker:1, knowledge:1}},

  // Crafting
  workshop:    {name:"Workshop",        icon:"🛠", cat:"Crafting", desc:"General crafting station.", cost:{wood:15, stone:5, tools:1}, workers:1, max:3, effects:{produce_per_worker:{tools:0.3, nails:1}}},
  carpenter:   {name:"Carpenter Hut",   icon:"🪚", cat:"Crafting", desc:"Cuts planks from wood.", cost:{wood:12, tools:1}, workers:1, max:3, effects:{convert:{from:{wood:2}, to:{planks:1}, perWorker:5}}},
  sawmill:     {name:"Sawmill",         icon:"🪵", cat:"Crafting", desc:"Mass planks production.", cost:{wood:25, metal:5, tools:2}, workers:2, max:2, effects:{convert:{from:{wood:2}, to:{planks:2}, perWorker:6}}},
  toolsmith:   {name:"Toolsmith",       icon:"🔨", cat:"Crafting", desc:"Produces tools.", cost:{wood:10, metal:10, stone:5}, workers:1, max:2, effects:{produce_per_worker:{tools:1, nails:2}, consume:{metal:1}}},
  forge:       {name:"Forge",           icon:"⚒", cat:"Engineering",desc:"Iron and steel from metal.", cost:{stone:20, metal:15, charcoal:5}, workers:1, max:2, effects:{convert:{from:{metal:3, charcoal:1}, to:{iron:1}, perWorker:3}}},
  recycler:    {name:"Metal Recycler",  icon:"♻", cat:"Engineering",desc:"Salvages metal from scrap.", cost:{metal:15, parts:5}, workers:1, max:2, effects:{produce_per_worker:{metal:3}}},
  scrapyard:   {name:"Scrapyard",       icon:"🚗", cat:"Engineering",desc:"Slowly produces parts.", cost:{metal:20, wood:5}, workers:1, max:2, effects:{produce_per_worker:{parts:1, metal:1}}},
  charcoal_kiln:{name:"Charcoal Kiln",  icon:"🪵", cat:"Crafting", desc:"Turns wood into charcoal.", cost:{stone:10, clay:5}, workers:1, max:3, effects:{convert:{from:{wood:3}, to:{charcoal:1}, perWorker:4}}},
  tailor:      {name:"Tailor Hut",      icon:"🧵", cat:"Crafting", desc:"Produces cloth from hides.", cost:{wood:10, cloth:5}, workers:1, max:2, effects:{convert:{from:{hides:1}, to:{cloth:2}, perWorker:3}}},
  leatherworker:{name:"Leatherworker",  icon:"🟫", cat:"Crafting", desc:"Tans hides into leather.", cost:{wood:10, stone:5, tools:1}, workers:1, max:2, effects:{convert:{from:{hides:2}, to:{leather:1}, perWorker:3}}},

  // Defense
  guard_post:  {name:"Guard Post",      icon:"🪧", cat:"Defense",  desc:"+safety. Houses guards.", cost:{wood:15, weapons:1}, workers:1, max:4, effects:{safety_per_worker:2}},
  watchtower:  {name:"Watchtower",      icon:"🗼", cat:"Defense",  desc:"+safety and early warning.", cost:{wood:25, stone:10, nails:4}, workers:1, max:3, effects:{safety_per_worker:4, warning:1}},
  palisade:    {name:"Palisade Wall",   icon:"🟫", cat:"Defense",  desc:"Each wall reduces raid damage.", cost:{wood:20, nails:4}, workers:0, max:8, effects:{wall:5}},
  gate:        {name:"Gate",            icon:"🚪", cat:"Defense",  desc:"Reinforced gate.", cost:{wood:15, metal:10, nails:4}, workers:0, max:2, effects:{wall:10}},
  trap_line:   {name:"Trap Line",       icon:"🪤", cat:"Defense",  desc:"Slows attackers.", cost:{wood:10, metal:5, rope:2}, workers:0, max:6, effects:{wall:3}},
  barracks:    {name:"Barracks",        icon:"🪖", cat:"Defense",  desc:"Houses soldiers. +housing.", cost:{wood:30, stone:15, nails:8}, workers:2, max:2, effects:{housing:4, safety_per_worker:3}},
  training_yard:{name:"Training Yard",  icon:"🥋", cat:"Defense",  desc:"Improves combat skill.", cost:{wood:15, stone:10, weapons:1}, workers:1, max:2, effects:{combat_train:1}},
  armory:      {name:"Armory",          icon:"🗡", cat:"Defense",  desc:"Produces weapons & ammo.", cost:{stone:20, iron:8, wood:10}, workers:1, max:2, effects:{convert:{from:{metal:3, wood:1}, to:{weapons:1}, perWorker:2}, produce_per_worker:{ammo:1}}},

  // Trade / signal
  market_stall:{name:"Market Stall",    icon:"🏪", cat:"Trade",    desc:"Attracts traders.", cost:{wood:10, cloth:3}, workers:1, max:3, effects:{trade_chance:0.05, reputation:0.05}},
  trading_post:{name:"Trading Post",    icon:"🛒", cat:"Trade",    desc:"Better trade deals.", cost:{wood:20, stone:10, cloth:5}, workers:1, max:1, effects:{trade_chance:0.1, reputation:0.1}},
  signal_tower:{name:"Signal Tower",    icon:"📡", cat:"Trade",    desc:"Attracts traders & survivors.", cost:{wood:25, metal:10, parts:3}, workers:1, max:1, effects:{trade_chance:0.05, attract_chance:0.05}},
  scout_camp:  {name:"Scout Camp",      icon:"🏕", cat:"Trade",    desc:"Early warning of raids.", cost:{wood:15, cloth:5, weapons:1}, workers:1, max:2, effects:{warning:1, safety_per_worker:1}},

  // Misc
  town_hall:   {name:"Town Hall",       icon:"🏛", cat:"Community",desc:"Reduces danger somewhat. +morale.", cost:{wood:40, stone:30, planks:15, nails:10}, workers:0, max:1, effects:{morale_all:1, danger_reduce:5}},
  prison_cage: {name:"Prison Cage",     icon:"🔒", cat:"Defense",  desc:"Detains troublemakers.", cost:{metal:15, wood:10, nails:5}, workers:1, max:2, effects:{order:2}},
  repair_station:{name:"Repair Station",icon:"🔧", cat:"Engineering",desc:"Maintains buildings.", cost:{metal:15, tools:3, parts:5}, workers:1, max:2, effects:{repair:2}},
  mechanics_shed:{name:"Mechanics Shed",icon:"⚙", cat:"Engineering",desc:"Components from parts.", cost:{metal:20, parts:10, tools:3}, workers:1, max:2, effects:{convert:{from:{parts:2}, to:{components:1}, perWorker:2}, produce_per_worker:{parts:1}}},
  fuel_depot:  {name:"Fuel Depot",      icon:"⛽", cat:"Engineering",desc:"+fuel/oil storage.", cost:{metal:20, stone:10}, workers:0, max:2, effects:{storage:50, fuel_safe:1}},
  animal_stable:{name:"Animal Stable",  icon:"🐎", cat:"Food",     desc:"Houses larger animals.", cost:{wood:25, stone:5, rope:5}, workers:1, max:2, effects:{produce_per_worker:{food:1, hides:0.5, leather:0.5}}},
};

// ===== WORLD MAP DATA =====

const MAP_W = 180, MAP_H = 120;
const VIEW_W = 31, VIEW_H = 21;
const VISION_DAY = 6;
const VISION_NIGHT = 3;
const STEP_PER_PHASE = 14; // accumulated movement cost per phase tick
const TOWN_W = 24, TOWN_H = 16;
const REALTIME_MS = [0, 12000, 6000, 2500];

const BIOMES = {
  plains:      {name:"Plains",       icon:"·", bg:"#3a4a26", fg:"#90a050", cost:1},
  forest:      {name:"Forest",       icon:"♣", bg:"#1f3018", fg:"#3e6028", cost:2},
  deep_forest: {name:"Deep Forest",  icon:"♠", bg:"#142010", fg:"#244018", cost:3, dark:true},
  mountain:    {name:"Mountain",     icon:"▲", bg:"#3a3a36", fg:"#7a7570", cost:3},
  hills:       {name:"Hills",        icon:"⌒", bg:"#403624", fg:"#7a6a40", cost:2},
  river:       {name:"River",        icon:"~", bg:"#0e2638", fg:"#5a90b0", cost:99, blocks:true, water:true},
  lake:        {name:"Lake",         icon:"≈", bg:"#0a1f30", fg:"#4a7090", cost:99, blocks:true, water:true},
  swamp:       {name:"Swamp",        icon:"≡", bg:"#1a2818", fg:"#5a6530", cost:3, hazard:0.06},
  radio:       {name:"Irradiated",   icon:"☢", bg:"#3a3a10", fg:"#c0c020", cost:2, hazard:0.18, radiation:true},
  ruins:       {name:"Ruins",        icon:"▦", bg:"#2a2825", fg:"#807870", cost:2},
  road:        {name:"Road",         icon:"=", bg:"#2a2522", fg:"#7a6f68", cost:1},
  snow:        {name:"Snow",         icon:"❄", bg:"#5a6878", fg:"#d0e0f0", cost:2, cold:true},
  desert:      {name:"Wasteland",    icon:"·", bg:"#3a3220", fg:"#a08858", cost:2, dry:true},
  village:     {name:"Village",      icon:"🔥", bg:"#5a2818", fg:"#ffaa44", cost:1, safe:true},
};

// Map features (consumable resource nodes, ruins, hazards, oddities)
// Each: {icon, name, desc, biomes[], loot?, charges, hidden?, damage?, energyLoss?, curse?, event?, heal?, warmth?, enemyChance?, rare?, sting?, chargeRisk?}
const MAP_FEATURES = {
  // -- Food --
  berry_bush:     {icon:"🫐", name:"Berry Bush",      desc:"Wild berries to forage.",     biomes:["plains","forest","hills"],            loot:{food:[1,3]},                          charges:2},
  mushroom_patch: {icon:"🍄", name:"Mushroom Patch",  desc:"Edible mushrooms.",           biomes:["forest","deep_forest","swamp"],       loot:{food:[1,2],herbs:[0,1]},              charges:2},
  wild_herbs:     {icon:"🌿", name:"Wild Herbs",      desc:"Medicinal plants.",           biomes:["plains","forest","swamp","hills"],    loot:{herbs:[1,2]},                         charges:2},
  apple_tree:     {icon:"🍎", name:"Apple Tree",      desc:"Wild fruit.",                 biomes:["plains","forest"],                    loot:{food:[2,4]},                          charges:2},
  edible_roots:   {icon:"🥕", name:"Edible Roots",    desc:"Dig for roots.",              biomes:["plains","forest","hills"],            loot:{food:[1,2],seeds:[0,1]},              charges:2},
  wild_wheat:     {icon:"🌾", name:"Wild Wheat",      desc:"Grain ready to harvest.",     biomes:["plains"],                             loot:{crops:[1,3],seeds:[1,2]},             charges:1},
  bird_nest:      {icon:"🥚", name:"Bird Nest",       desc:"Eggs in a nest.",             biomes:["forest","hills","mountain"],          loot:{food:[1,2],cloth:[0,1]},              charges:1},
  beehive:        {icon:"🐝", name:"Beehive",         desc:"Honey, but stings.",          biomes:["forest","hills"],                     loot:{food:[2,4],alcohol:[0,1]},            charges:1, sting:true},
  animal_carcass: {icon:"🦌", name:"Animal Carcass",  desc:"A recent kill.",              biomes:["plains","forest","hills","mountain"], loot:{meat:[1,3],hides:[0,2],bones:[1,2]},  charges:1},
  seed_pod:       {icon:"🌰", name:"Seed Pods",       desc:"Wild plant seeds.",           biomes:["plains","forest"],                    loot:{seeds:[2,4]},                         charges:1},
  fish_pool:      {icon:"🐟", name:"Fishing Hole",    desc:"Fish flash beneath.",         biomes:["plains","forest","hills"],            loot:{meat:[1,2],dirty_water:[0,1]},        charges:3},

  // -- Wood / stone / metal --
  dead_tree:      {icon:"🪾", name:"Dead Tree",       desc:"Dry and easy to chop.",       biomes:["plains","forest","desert","radio"],   loot:{wood:[2,4]},                          charges:1},
  fallen_log:     {icon:"🪵", name:"Fallen Log",      desc:"Plenty of wood.",             biomes:["forest","deep_forest","hills"],       loot:{wood:[4,8]},                          charges:1},
  pine_grove:     {icon:"🌲", name:"Pine Grove",      desc:"Tall pines.",                 biomes:["forest","deep_forest","mountain"],    loot:{wood:[3,6],herbs:[0,1]},              charges:3},
  ancient_oak:    {icon:"🌳", name:"Ancient Oak",     desc:"A giant of the woods.",       biomes:["deep_forest"],                        loot:{wood:[8,12],planks:[0,2]},            charges:1},
  stone_outcrop:  {icon:"🪨", name:"Stone Outcrop",   desc:"Loose stones.",               biomes:["hills","mountain","desert"],          loot:{stone:[2,5]},                         charges:2},
  boulder_pile:   {icon:"🗿", name:"Boulder Pile",    desc:"Heavy stones.",               biomes:["mountain","hills"],                   loot:{stone:[3,6]},                         charges:2},
  clay_deposit:   {icon:"🟤", name:"Clay Deposit",    desc:"Wet clay.",                   biomes:["swamp","plains"],                     loot:{clay:[2,5]},                          charges:2},
  iron_vein:      {icon:"⛓", name:"Iron Vein",       desc:"Iron ore in the rock.",       biomes:["mountain","hills"],                   loot:{iron:[1,3],stone:[1,2]},              charges:2},
  coal_seam:      {icon:"⬛", name:"Coal Seam",       desc:"Black coal for fuel.",        biomes:["mountain","hills"],                   loot:{charcoal:[2,5]},                      charges:2},
  old_bones:      {icon:"🦴", name:"Old Bones",       desc:"Sun-bleached remains.",       biomes:["plains","desert","radio"],            loot:{bones:[1,3]},                         charges:1},
  scrap_pile:     {icon:"🔩", name:"Scrap Pile",      desc:"Twisted metal junk.",         biomes:["ruins","desert","road"],              loot:{metal:[2,4],nails:[0,2]},             charges:2},
  glass_shards:   {icon:"🪟", name:"Glass Shards",    desc:"Shards of old windows.",      biomes:["ruins"],                              loot:{glass:[1,3]},                         charges:1},

  // -- Water --
  spring:         {icon:"💧", name:"Spring",          desc:"Clean spring water.",         biomes:["mountain","hills","forest"],          loot:{water:[1,2]},                         charges:99},
  old_well:       {icon:"🕳", name:"Old Well",        desc:"A dusty well.",               biomes:["plains","ruins"],                     loot:{water:[1,2]},                         charges:99},
  pond:           {icon:"🟦", name:"Pond",            desc:"Murky pond water.",           biomes:["plains","forest","swamp"],            loot:{dirty_water:[2,4]},                   charges:99},
  stream:         {icon:"〰", name:"Stream",          desc:"Running water.",              biomes:["plains","forest","hills"],            loot:{dirty_water:[2,4]},                   charges:99},
  rain_pool:      {icon:"💦", name:"Rain Pool",       desc:"Collected rainwater.",        biomes:["plains","ruins"],                     loot:{dirty_water:[1,3]},                   charges:1},
  hot_spring:     {icon:"♨", name:"Hot Spring",      desc:"Warming, soothing waters.",   biomes:["mountain","hills"],                   loot:{water:[1,2]},                         charges:99, heal:6, warmth:25},

  // -- Ruins / scavenge sites --
  ruined_house:   {icon:"🏚", name:"Ruined House",    desc:"What's left of a home.",      biomes:["plains","ruins"],                     loot:{wood:[1,3],cloth:[1,3],food:[0,2],tools:[0,1],books:[0,1]},                charges:2},
  burned_cabin:   {icon:"🔥", name:"Burned Cabin",    desc:"Scorched timber.",            biomes:["forest","plains"],                    loot:{charcoal:[1,3],metal:[0,2],nails:[0,2]},                                    charges:1},
  abandoned_farm: {icon:"🚜", name:"Abandoned Farm",  desc:"Old farm equipment.",         biomes:["plains"],                             loot:{seeds:[1,3],food:[1,2],tools:[0,2],hides:[0,1]},                            charges:2},
  church_ruins:   {icon:"⛪", name:"Church Ruins",    desc:"A broken steeple.",           biomes:["ruins","plains"],                     loot:{books:[1,2],herbs:[0,2],cloth:[0,2]},                                       charges:2},
  hospital_ruins: {icon:"🏥", name:"Hospital Ruins",  desc:"Dusty wards.",                biomes:["ruins"],                              loot:{medicine:[1,3],herbs:[0,2],cloth:[1,3],books:[0,1]},                        charges:2},
  police_station: {icon:"🚓", name:"Police Station",  desc:"A locker of arms.",           biomes:["ruins"],                              loot:{weapons:[0,1],ammo:[1,3],metal:[1,3]},                                       charges:2},
  fire_station:   {icon:"🚒", name:"Fire Station",    desc:"Tools and gear.",             biomes:["ruins"],                              loot:{tools:[1,2],cloth:[1,3],metal:[1,3]},                                        charges:2},
  factory_ruins:  {icon:"🏭", name:"Factory Ruins",   desc:"Industrial wreckage.",        biomes:["ruins"],                              loot:{metal:[2,5],parts:[1,3],components:[0,2],iron:[0,2]},                       charges:3},
  power_station:  {icon:"⚡", name:"Power Station",   desc:"Burnt transformers.",         biomes:["ruins"],                              loot:{batteries:[1,2],components:[1,3],parts:[1,2]},                              charges:2},
  shopping_mall:  {icon:"🏬", name:"Shopping Mall",   desc:"Picked-over stores.",         biomes:["ruins"],                              loot:{cloth:[2,4],food:[1,2],glass:[0,2],alcohol:[0,1]},                          charges:3},
  train_station:  {icon:"🚉", name:"Train Station",   desc:"Rusted tracks.",              biomes:["ruins"],                              loot:{metal:[2,4],parts:[1,3],steel:[0,2]},                                       charges:2},
  school_ruins:   {icon:"🏫", name:"School Ruins",    desc:"Empty classrooms.",           biomes:["ruins","plains"],                     loot:{books:[1,3],cloth:[0,2],glass:[0,2]},                                       charges:2},
  library_ruins:  {icon:"📚", name:"Library Ruins",  desc:"Knowledge in tatters.",       biomes:["ruins"],                              loot:{books:[2,5]},                                                                charges:2, knowledge:[1,3]},
  abandoned_car:  {icon:"🚗", name:"Abandoned Car",   desc:"Stripped vehicle.",           biomes:["road","ruins","plains"],              loot:{metal:[1,3],parts:[0,2],fuel:[0,2]},                                        charges:1},
  crashed_bus:    {icon:"🚌", name:"Crashed Bus",     desc:"Rolled and rusting.",         biomes:["road","ruins"],                       loot:{metal:[2,4],cloth:[1,3],parts:[0,2]},                                       charges:1},
  wrecked_truck:  {icon:"🚛", name:"Wrecked Truck",   desc:"On its side.",                biomes:["road"],                               loot:{fuel:[1,3],oil:[0,2],metal:[1,3]},                                          charges:1},
  crashed_heli:   {icon:"🚁", name:"Crashed Helicopter",desc:"Twisted blades.",          biomes:["plains","desert","radio","mountain"], loot:{components:[2,4],fuel:[1,2],steel:[1,2],parts:[1,3]},                       charges:1, rare:true},
  roadblock:      {icon:"🚧", name:"Roadblock",       desc:"Old barricade.",              biomes:["road"],                               loot:{metal:[1,3],weapons:[0,1],ammo:[0,1]},                                      charges:1},
  abandoned_camp: {icon:"⛺", name:"Abandoned Camp",  desc:"A cold fire pit.",            biomes:["plains","forest","hills"],            loot:{cloth:[1,3],food:[0,2],tools:[0,1]},                                        charges:1},
  soldier_remains:{icon:"💀", name:"Soldier Remains", desc:"Armor and arms.",             biomes:["ruins","radio","road"],               loot:{weapons:[0,1],ammo:[1,3],steel:[0,1],bones:[1,2]},                          charges:1},
  hiker_corpse:   {icon:"💀", name:"Hiker Remains",   desc:"A lone traveler.",            biomes:["forest","mountain","hills"],          loot:{cloth:[1,2],tools:[0,1],food:[0,1],bones:[1,2]},                            charges:1},
  suitcase:       {icon:"🧳", name:"Old Suitcase",    desc:"Someone's belongings.",       biomes:["road","ruins"],                       loot:{cloth:[1,3],alcohol:[0,1],books:[0,1]},                                     charges:1},
  toolbox:        {icon:"🧰", name:"Toolbox",         desc:"Useful gear.",                biomes:["ruins","road"],                       loot:{tools:[1,2],nails:[2,5]},                                                    charges:1},
  footlocker:     {icon:"📦", name:"Footlocker",     desc:"Rusted military case.",       biomes:["ruins","radio"],                      loot:{weapons:[0,1],cloth:[1,3],ammo:[0,2]},                                      charges:1},
  medicine_cabinet:{icon:"💊",name:"Medicine Cabinet",desc:"Pills and bandages.",        biomes:["ruins"],                              loot:{medicine:[1,2],herbs:[0,2]},                                                 charges:1},
  cellar:         {icon:"🚪", name:"Cellar",          desc:"A musty cellar.",             biomes:["ruins","plains"],                     loot:{food:[1,3],alcohol:[0,2],crops:[0,2]},                                      charges:1},
  storehouse:     {icon:"🏪", name:"Storehouse",      desc:"Faded canned goods.",         biomes:["ruins"],                              loot:{food:[2,4],cloth:[1,2],water:[0,1]},                                        charges:2},
  workshop_ruins: {icon:"🛠", name:"Workshop Ruins", desc:"Old tools and parts.",        biomes:["ruins"],                              loot:{tools:[1,3],parts:[1,2],nails:[2,4]},                                       charges:1},
  forge_ruins:    {icon:"⚒", name:"Forge Ruins",    desc:"Smelting remains.",           biomes:["ruins"],                              loot:{iron:[1,2],metal:[2,4],charcoal:[1,2]},                                     charges:1},
  watchtower_ruin:{icon:"🗼", name:"Watchtower",    desc:"Crumbled defenses.",          biomes:["plains","hills","ruins"],             loot:{weapons:[0,1],ammo:[0,2],wood:[1,3]},                                       charges:1},
  bunker_hatch:   {icon:"🔒", name:"Bunker Hatch",    desc:"A sealed shelter.",           biomes:["ruins","mountain","radio"],           loot:{food:[2,4],water:[1,3],medicine:[0,2],weapons:[0,1],books:[0,2],batteries:[0,2]}, charges:1, rare:true},
  mine_entrance:  {icon:"⛏", name:"Mine Entrance",  desc:"Tunnels going down.",         biomes:["mountain","hills"],                   underground:"mine",                                                                 charges:99},
  cave_mouth:     {icon:"🕳", name:"Cave Mouth",     desc:"A dark opening.",             biomes:["mountain","hills","forest"],          underground:"cave",                                                                 charges:99},
  subway_stairs:  {icon:"🚇", name:"Subway Stairs",  desc:"Concrete steps into blackness.",biomes:["ruins","road"],                    underground:"subway", rare:true,                                                   charges:99},
  storm_drain:    {icon:"🕳", name:"Storm Drain",    desc:"A culvert below the old roads.",biomes:["road","ruins","plains"],          underground:"drain",                                                                charges:99},
  silo:           {icon:"🏗", name:"Farm Silo",      desc:"Grain silo.",                 biomes:["plains"],                             loot:{crops:[2,5],seeds:[1,3]},                                                    charges:1},
  gas_pump:       {icon:"⛽", name:"Gas Pump",       desc:"A rusted fuel pump.",         biomes:["road","ruins"],                       loot:{fuel:[1,3],oil:[0,2]},                                                       charges:1},
  wrecked_tank:   {icon:"🪖", name:"Wrecked Tank",   desc:"A military relic.",           biomes:["road","ruins","radio"],               loot:{steel:[1,3],ammo:[1,3],weapons:[0,1]},                                      charges:1, rare:true},
  ammo_crate:     {icon:"🎁", name:"Ammo Crate",     desc:"Sealed crate.",               biomes:["ruins","road","radio"],               loot:{ammo:[2,5],weapons:[0,1]},                                                   charges:1, rare:true},
  rope_pile:      {icon:"🪢", name:"Rope Pile",      desc:"Coils of old rope.",          biomes:["ruins","road"],                       loot:{rope:[2,4]},                                                                  charges:1},

  // -- Hazards --
  radioactive_pool:{icon:"☢", name:"Radioactive Pool",desc:"Glowing slime.",             biomes:["radio","swamp"],                      damage:[5,15], curse:"diseased", loot:{components:[0,2],parts:[0,2]},                charges:1},
  toxic_cloud:    {icon:"💨", name:"Toxic Cloud",    desc:"Choking vapors.",             biomes:["radio","swamp"],                      damage:[3,8],                                                                       charges:99},
  landmine:       {icon:"💣", name:"Landmine",       desc:"Hidden explosive.",           biomes:["road","ruins","radio"],               damage:[15,30], hidden:true,                                                        charges:1},
  rusty_trap:     {icon:"🪤", name:"Rusty Trap",     desc:"Snap of old steel.",          biomes:["forest","deep_forest","plains"],      damage:[5,12], hidden:true,                                                         charges:1},
  pitfall:        {icon:"🕳", name:"Pitfall",        desc:"A hidden hole.",              biomes:["forest","ruins","hills"],             damage:[4,10], hidden:true, energyLoss:25,                                          charges:1},
  collapsed_floor:{icon:"⚠", name:"Collapsed Floor",desc:"Unstable rubble.",            biomes:["ruins"],                              damage:[3,8], hidden:true,                                                          charges:1},
  spike_trap:     {icon:"⚠", name:"Spike Trap",     desc:"Sharpened stakes.",           biomes:["forest","ruins"],                     damage:[6,14], hidden:true,                                                         charges:1},
  acid_puddle:    {icon:"🧪", name:"Acid Puddle",    desc:"Hissing liquid.",             biomes:["radio","ruins"],                      damage:[2,6],                                                                       charges:99},
  quicksand:      {icon:"🟫", name:"Quicksand",      desc:"You sink slowly.",            biomes:["swamp","desert"],                     energyLoss:30,                                                                      charges:99},
  plague_nest:    {icon:"🦠", name:"Plague Nest",    desc:"Buzzing with sickness.",      biomes:["swamp","ruins"],                      curse:"diseased", chargeRisk:0.7,                                                   charges:1},
  mass_grave:     {icon:"⚰", name:"Mass Grave",     desc:"Loose earth and bones.",      biomes:["ruins","radio"],                      loot:{bones:[3,5]}, curse:"diseased", chargeRisk:0.3,                                charges:1},
  lightning_zone: {icon:"⛈", name:"Storm Field",    desc:"Static crackles.",            biomes:["plains","hills"],                     damage:[3,8], chargeRisk:0.3,                                                       charges:99},
  burning_pile:   {icon:"🔥", name:"Burning Wreck",  desc:"Still smouldering.",          biomes:["road","ruins"],                       loot:{charcoal:[2,4]}, damage:[2,5],                                                charges:1},
  ash_pit:        {icon:"🌫", name:"Ash Pit",        desc:"Hot cinders underfoot.",      biomes:["radio","desert"],                     damage:[1,4], energyLoss:15,                                                        charges:99},

  // -- Events / oddities --
  strange_shrine: {icon:"⛩", name:"Strange Shrine", desc:"Eerie offerings.",            biomes:["forest","mountain","ruins","radio"],  event:"shrine",                                                                     charges:1},
  old_radio:      {icon:"📻", name:"Old Radio",      desc:"Crackles and hum.",           biomes:["ruins","road"],                       event:"radio",                                                                      charges:1},
  music_box:      {icon:"🎵", name:"Music Box",      desc:"Plays a sad tune.",           biomes:["ruins"],                              event:"music",                                                                      charges:1},
  hidden_cache:   {icon:"💰", name:"Hidden Cache",   desc:"Someone's stash.",            biomes:["forest","ruins","mountain","plains"], event:"cache",                                                                      charges:1},
  glowing_woods:  {icon:"🌌", name:"Glowing Woods",  desc:"Faint blue lights.",          biomes:["deep_forest","forest","radio"],       event:"glow",                                                                       charges:1},
  map_fragment:   {icon:"🗺", name:"Map Fragment",   desc:"Reveals nearby terrain.",     biomes:["ruins","road","mountain"],            event:"map",                                                                        charges:1},
  signal_fire:    {icon:"🔥", name:"Old Signal Fire",desc:"Cold ashes — was someone here?",biomes:["mountain","hills","plains"],        event:"signal",                                                                     charges:1},
  graveyard:      {icon:"🪦", name:"Graveyard",      desc:"Stones in rows.",             biomes:["plains","ruins"],                     event:"grave",                                                                      charges:1},
};

const UNDERGROUND_SITES = {
  mine: {
    name:"Abandoned Mine", icon:"⛏",
    desc:"Timbers creak above seams of iron, coal, and old bones.",
    shallow:{label:"Search the upper shafts", time:1, energy:10, danger:0.22, loot:{stone:[2,5], iron:[1,3], charcoal:[0,2], metal:[0,2]}, enemies:["wild_dogs","infected","scavengers"]},
    deep:{label:"Descend to the deep seam", time:2, energy:18, danger:0.45, loot:{iron:[2,5], charcoal:[2,5], steel:[0,2], components:[0,1]}, damage:[3,10], enemies:["mutated_animals","infected","cultists"]}
  },
  cave: {
    name:"Natural Cave", icon:"🕳",
    desc:"Cold air breathes from stone. Something has been nesting inside.",
    shallow:{label:"Explore the mouth", time:1, energy:8, danger:0.2, loot:{stone:[1,4], bones:[1,3], herbs:[0,1]}, enemies:["wolves","wild_dogs","forest_beasts"]},
    deep:{label:"Push into the dark", time:2, energy:16, danger:0.5, loot:{stone:[2,5], bones:[2,5], medicine:[0,1], books:[0,1]}, damage:[2,8], enemies:["bears","forest_beasts","night_stalkers"]}
  },
  subway: {
    name:"Buried Subway", icon:"🚇",
    desc:"Rails vanish beneath collapsed platforms and dead advertisements.",
    shallow:{label:"Sweep the platform", time:1, energy:10, danger:0.28, loot:{metal:[1,4], cloth:[1,3], parts:[0,2], books:[0,1]}, enemies:["infected","thieves","scavengers"]},
    deep:{label:"Follow the tunnel", time:2, energy:18, danger:0.55, loot:{metal:[2,5], parts:[1,3], components:[0,2], batteries:[0,1]}, damage:[3,9], enemies:["infected","raiders","mutated_animals"]}
  },
  drain: {
    name:"Storm Drain", icon:"🕳",
    desc:"Wet concrete channels run under the roads. The water smells wrong.",
    shallow:{label:"Check the culvert", time:1, energy:8, danger:0.18, loot:{dirty_water:[2,5], metal:[0,2], parts:[0,1]}, enemies:["wild_dogs","desperate","infected"]},
    deep:{label:"Crawl deeper", time:2, energy:15, danger:0.42, loot:{dirty_water:[3,7], medicine:[0,1], components:[0,1], bones:[0,2]}, damage:[2,7], curse:"diseased", enemies:["infected","mutated_animals","cultists"]}
  }
};

// Visible entities placed on tiles — hostile creatures and friendly NPCs.
// For hostiles: enemy refers to ENEMIES key. Friendlies have a 'friendly' type.
const MAP_ENTITIES = {
  // Hostile
  wild_dogs_pack: {icon:"🐕", name:"Wild Dogs",       hostile:true, enemy:"wild_dogs",       biomes:["plains","forest","road"]},
  wolf:           {icon:"🐺", name:"Wolf",            hostile:true, enemy:"wolves",          biomes:["forest","deep_forest","mountain","snow"]},
  bear:           {icon:"🐻", name:"Bear",            hostile:true, enemy:"bears",           biomes:["deep_forest","mountain","forest"]},
  infected_npc:   {icon:"🧟", name:"Infected",        hostile:true, enemy:"infected",        biomes:["ruins","road","swamp"]},
  raider_npc:     {icon:"🥷", name:"Raider",          hostile:true, enemy:"raiders",         biomes:["road","ruins","plains","hills"]},
  bandit_camp:    {icon:"⚔", name:"Bandit Camp",     hostile:true, enemy:"bandits",         biomes:["forest","hills","road","ruins"]},
  mutant_beast:   {icon:"👹", name:"Mutant Beast",    hostile:true, enemy:"mutated_animals", biomes:["radio","swamp","deep_forest"]},
  cultist_npc:    {icon:"🕯", name:"Cultist",        hostile:true, enemy:"cultists",        biomes:["ruins","deep_forest","mountain"]},
  forest_beast_e: {icon:"🦁", name:"Forest Beast",    hostile:true, enemy:"forest_beasts",   biomes:["deep_forest","forest"]},
  night_stalker_e:{icon:"🦇", name:"Night Stalker",   hostile:true, enemy:"night_stalkers",  biomes:["deep_forest","ruins","mountain"], nightOnly:true},
  thief_npc:      {icon:"🕵", name:"Thief",          hostile:true, enemy:"thieves",         biomes:["road","ruins","plains"]},
  rogue_hunter_e: {icon:"🏹", name:"Rogue Hunter",    hostile:true, enemy:"rogue_hunters",   biomes:["forest","mountain","hills"]},
  warlord_scout_e:{icon:"🎖", name:"Warlord Scout",   hostile:true, enemy:"warlord_scouts",  biomes:["road","ruins","desert"]},
  scavenger_gang: {icon:"🗡", name:"Scavengers",      hostile:true, enemy:"scavengers",      biomes:["ruins","road","plains"]},
  desperate_npc:  {icon:"😵", name:"Desperate Wanderer",hostile:true, enemy:"desperate",    biomes:["road","plains","ruins"]},
  // Friendly
  lost_child_npc: {icon:"🧒", name:"Lost Child",      friendly:"child",   biomes:["plains","forest","ruins","road"]},
  wounded_npc:    {icon:"🤕", name:"Wounded Survivor",friendly:"wounded", biomes:["road","ruins","forest","plains"]},
  wanderer_npc:   {icon:"🚶", name:"Wanderer",        friendly:"easy",    biomes:["road","plains","desert"]},
  hermit_npc:     {icon:"🧙", name:"Old Hermit",      friendly:"hermit",  biomes:["mountain","deep_forest","hills"]},
  trader_npc:     {icon:"🧺", name:"Trader",          friendly:"trader",  biomes:["road","plains","ruins"]},
  hunter_friendly:{icon:"🏹", name:"Friendly Hunter", friendly:"hunter",  biomes:["forest","hills","mountain","plains"]},
  refugee_family: {icon:"👨‍👩‍👧",name:"Refugees",        friendly:"family",  biomes:["road","plains","ruins"]},
  wise_elder:     {icon:"👴", name:"Wise Elder",      friendly:"elder",   biomes:["ruins","plains","mountain"]},
  doctor_npc:     {icon:"🩺", name:"Doctor",          friendly:"doctor",  biomes:["ruins","road","plains"]},
  mechanic_npc:   {icon:"🔧", name:"Mechanic",        friendly:"mechanic",biomes:["ruins","road"]},
  scholar_npc:    {icon:"📖", name:"Wandering Scholar",friendly:"scholar",biomes:["ruins","road","plains"]},
  loyal_dog:      {icon:"🐶", name:"Loyal Dog",       friendly:"dog",     biomes:["plains","road","forest"]},
  // Unique: hand-placed near the village by generateMap. Not eligible for random spawn.
  sage_npc:       {icon:"🧓", name:"The Old Sage",    friendly:"sage",    biomes:["plains"], unique:true},
};

// Jobs (linked to buildings + general tasks)
const JOBS = {
  none:          {name:"Idle",           building:null,           output:{}, desc:"No assignment."},
  woodcutter:    {name:"Woodcutter",     building:null,           output:{wood:3}, desc:"Cuts wood from nearby trees."},
  gatherer:      {name:"Gatherer",       building:null,           output:{herbs:1, seeds:1, food:1}, desc:"Forages for herbs and seeds."},
  water_carrier: {name:"Water Carrier",  building:null,           output:{dirty_water:4}, desc:"Brings dirty water from the river."},
  hunter:        {name:"Hunter",         building:"hunting_lodge",output:{meat:2, hides:1, bones:1}, desc:"Hunts game."},
  scavenger:     {name:"Scavenger",      building:null,           output:{metal:1, cloth:1, parts:0.5}, desc:"Scavenges nearby ruins (chance of injury)."},
  guard:         {name:"Guard",          building:"guard_post",   output:{}, desc:"Defends the settlement."},
  watchman:      {name:"Watchman",       building:"watchtower",   output:{}, desc:"Watches for threats."},
  farmer:        {name:"Farmer",         building:"crop_field",   output:{crops:3}, desc:"Tends the crops."},
  gardener:      {name:"Gardener",       building:"garden",       output:{crops:1}, desc:"Tends the garden."},
  greenhouse:    {name:"Greenhouse Worker",building:"greenhouse", output:{crops:5}, desc:"Year-round crops."},
  rancher:       {name:"Rancher",        building:"animal_stable",output:{food:1, hides:0.5}, desc:"Tends animals."},
  chickenkeeper: {name:"Chickenkeeper",  building:"chicken_coop", output:{food:3}, desc:"Manages chickens."},
  goatkeeper:    {name:"Goatkeeper",     building:"goat_pen",     output:{food:2, hides:0.5}, desc:"Manages goats."},
  toolmaker:     {name:"Toolmaker",      building:"toolsmith",    output:{tools:1, nails:2}, desc:"Makes tools."},
  carpenter:     {name:"Carpenter",      building:"carpenter",    output:{planks:1}, desc:"Cuts planks."},
  sawyer:        {name:"Sawyer",         building:"sawmill",      output:{planks:2}, desc:"Operates the sawmill."},
  smith:         {name:"Smith",          building:"forge",        output:{iron:1}, desc:"Smelts iron."},
  recycler:      {name:"Recycler",       building:"recycler",     output:{metal:3}, desc:"Recycles metal."},
  scrapper:      {name:"Scrapper",       building:"scrapyard",    output:{parts:1, metal:1}, desc:"Strips scrap."},
  charcoal_maker:{name:"Charcoal Maker", building:"charcoal_kiln",output:{charcoal:1}, desc:"Burns wood to charcoal."},
  tailor:        {name:"Tailor",         building:"tailor",       output:{cloth:2}, desc:"Sews cloth."},
  leatherworker: {name:"Leatherworker",  building:"leatherworker",output:{leather:1}, desc:"Tans leather."},
  cook:          {name:"Cook",           building:"kitchen",      output:{food:3}, desc:"Prepares meals."},
  smoker:        {name:"Smoker",         building:"smokehouse",   output:{food:3}, desc:"Smokes meat."},
  brewer:        {name:"Brewer",         building:"brewery",      output:{alcohol:1}, desc:"Brews alcohol."},
  alchemist:     {name:"Alchemist",      building:"medicine_workshop",output:{medicine:2}, desc:"Brews medicine."},
  herbalist:     {name:"Herbalist",      building:"herbalist",    output:{medicine:1}, desc:"Brews simple medicine."},
  healer:        {name:"Healer",         building:"clinic",       output:{}, desc:"Treats the sick & wounded."},
  teacher:       {name:"Teacher",        building:"school",       output:{}, desc:"Teaches children."},
  scholar:       {name:"Scholar",        building:"library",      output:{}, desc:"Generates knowledge."},
  builder:       {name:"Builder",        building:null,           output:{}, desc:"Slowly repairs buildings."},
  wallbuilder:   {name:"Wall Builder",   building:null,           output:{}, desc:"Maintains walls."},
  innkeeper:     {name:"Innkeeper",      building:"inn",          output:{}, desc:"Cheers up everyone."},
  barkeep:       {name:"Barkeep",        building:"tavern",       output:{}, desc:"Cheers up everyone (uses alcohol)."},
  trader:        {name:"Trader",         building:"trading_post", output:{}, desc:"Negotiates trade."},
  shopkeeper:    {name:"Shopkeeper",     building:"market_stall", output:{}, desc:"Runs a market stall."},
  storekeeper:   {name:"Storekeeper",    building:"warehouse",    output:{}, desc:"Manages stored goods."},
  signaller:     {name:"Signaller",      building:"signal_tower", output:{}, desc:"Sends and reads signals."},
  scout:         {name:"Scout",          building:"scout_camp",   output:{}, desc:"Scouts the wastes."},
  bathhouse_keeper:{name:"Bathhouse Keeper",building:"bathhouse", output:{}, desc:"Runs the baths."},
  water_worker:  {name:"Water Worker",   building:"water_collector",output:{dirty_water:3}, desc:"Operates water collector."},
  well_worker:   {name:"Well Worker",    building:"well",         output:{water:3}, desc:"Draws clean water."},
  purifier_op:   {name:"Purifier Op",    building:"purifier",     output:{water:3}, desc:"Operates the purifier."},
  armorer:       {name:"Armorer",        building:"armory",       output:{weapons:1, ammo:1}, desc:"Produces arms."},
  trainer:       {name:"Trainer",        building:"training_yard",output:{}, desc:"Trains fighters."},
  mechanic:      {name:"Mechanic",       building:"mechanics_shed",output:{components:1, parts:1}, desc:"Repairs machinery."},
  repairman:     {name:"Repairman",      building:"repair_station",output:{}, desc:"Repairs buildings."},
  warden:        {name:"Warden",         building:"prison_cage",  output:{}, desc:"Watches prisoners."},
};

const JOB_KEYS = Object.keys(JOBS);

// Traits with effects
const TRAITS = {
  brave:        {label:"Brave",        effect:"+combat, -fear"},
  cowardly:     {label:"Cowardly",     effect:"-combat, may flee"},
  hardworking:  {label:"Hardworking",  effect:"+25% job output"},
  lazy:         {label:"Lazy",         effect:"-25% job output"},
  medic:        {label:"Medic",        effect:"better healer"},
  hunter:       {label:"Hunter",       effect:"better hunter"},
  builder:      {label:"Builder",      effect:"better builder"},
  farmer:       {label:"Farmer",       effect:"better farmer"},
  guard:        {label:"Guard",        effect:"better guard"},
  teacher:      {label:"Teacher",      effect:"better teacher"},
  mechanic:     {label:"Mechanic",     effect:"better mechanic"},
  cook:         {label:"Cook",         effect:"better cook"},
  leader:       {label:"Leader",       effect:"+morale aura"},
  troublemaker: {label:"Troublemaker", effect:"-morale aura"},
  tough:        {label:"Tough",        effect:"+max health"},
  quick:        {label:"Quick",        effect:"+flee chance"},
};

// Names
const FIRST_NAMES = ["Avery","Bram","Cora","Daxon","Elin","Finn","Gera","Hale","Iris","Jorah","Kira","Lena","Mara","Nyla","Orin","Pax","Quill","Rook","Sasha","Tyrn","Una","Vesta","Wren","Xander","Yara","Zev","Asha","Brock","Cael","Devi","Eldric","Fern","Garet","Hana","Ivor","Juno","Kade","Liora","Maven","Nox","Odin","Pia","Quinn","Reva","Sten","Talia","Ulric","Vex","Wyn","Zoa","Mira","Ned","Otto","Petra","Roan","Sela","Toren","Vala","Yuri","Briar"];
const LAST_NAMES  = ["Ash","Briar","Coal","Drift","Ember","Forge","Grim","Hollow","Iron","Junipur","Kane","Lark","Marrow","North","Oak","Pyre","Quint","Rust","Stone","Thorn","Vale","Wraith","Yew","Zinn","Black","Hawthorne","Vance"];

// Settings
const TICKS_PER_DAY = 4;     // morning, midday, evening, night
const PHASES = ["Morning","Midday","Evening","Night"];
const BASE_RES_CAP = 80;     // base storage cap
const SAVE_KEY = "post_2045_save_v1";
const LEGACY_SAVE_KEYS = ["ashes_of_tomorrow_save_v1"];
const STARTER_BUILDINGS = new Set(["campfire", "tent", "storage_shed", "rain_barrel", "garden", "guard_post"]);
const STARTING_RESOURCES = {wood:40, food:5, water:4, cloth:8, nails:6, seeds:3, weapons:1, herbs:1};
const BUILDING_CAP_MULTIPLIER = 3;

for (const id in BUILDINGS){
  if (id !== "campfire" && BUILDINGS[id].max) BUILDINGS[id].max *= BUILDING_CAP_MULTIPLIER;
}
