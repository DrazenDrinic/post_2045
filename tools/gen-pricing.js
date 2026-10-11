#!/usr/bin/env node
"use strict";
/* ============================================================================
 * Post 2045 — PRICING.md generator  (single source of truth)
 *
 *   node tools/gen-pricing.js
 *
 * Reads the live data tables from js/data.js and writes a complete, accurate
 * PRICING.md. Numbers that live in code rather than data (build-time tiers,
 * tool discounts, movement drain, decay, combat math) are mirrored in the
 * MIRRORED-FROM-CODE block below, each tagged with its source.
 *
 * Bulletproofing: the run FAILS (exit 1) if the game adds content this script
 * doesn't know how to render — an unhandled building effect, an unknown
 * resource key, or any building/recipe/job/tech/item/enemy/crop missing from
 * the output. That turns silent drift into a loud error.
 *
 * Not a game build step: the game stays one self-contained HTML file. This is
 * a docs tool, same spirit as the `node --check` syntax check in CLAUDE.md.
 * ========================================================================== */

const vm = require("vm");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "js", "data.js");
const OUT = path.join(ROOT, "PRICING.md");

// ---- load data.js tables ---------------------------------------------------
const ctx = { console, String, Object, Math, Array, Number, Boolean, isNaN, parseInt, parseFloat };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(DATA, "utf8"), ctx);
// top-level `const`s aren't host-visible as context props — read by evaluating names
const T = {};
for (const name of [
  "RESOURCES","RESOURCE_WEIGHTS","BUILDINGS","JOBS","KNOWLEDGE","RECIPES","ITEMS",
  "ENEMIES","MAP_ENTITIES","MAP_FEATURES","CROPS","BIOMES","TRAVEL","ACTION_COSTS",
  "ACTION_ENERGY","LOCATIONS","UNDERGROUND_SITES","STARTING_RESOURCES","BASE_RES_CAP",
  "BUILDING_CAP_MULTIPLIER","REALTIME_MS","SOURCE_RULES","SOURCE_DEFAULT_STOCK","BASE_LIQUID_CAP",
]) T[name] = vm.runInContext(name, ctx);
const STARTER = vm.runInContext("[...STARTER_BUILDINGS]", ctx);
const STARTER_SET = new Set(STARTER);

const {
  RESOURCES:R, RESOURCE_WEIGHTS:WT, BUILDINGS:B, JOBS:J, KNOWLEDGE:K, RECIPES:RC,
  ITEMS:IT, ENEMIES:EN, MAP_ENTITIES:ME, CROPS:CR, BIOMES:BI, TRAVEL:TR,
  ACTION_COSTS:AC, REALTIME_MS:RTMS, STARTING_RESOURCES:START, BASE_RES_CAP:CAP,
  BUILDING_CAP_MULTIPLIER:CAPX, LOCATIONS:LOC,
} = T;

// ===========================================================================
// MIRRORED FROM CODE — keep in sync if these change (source noted per line).
// ===========================================================================
const CODE = {
  buildTiers: { starter:45, housing:180, major:480, other:120, hammer:0.8 }, // helpers.js buildingMinutes()
  toolDiscount: "an axe/pickaxe/shovel cuts time by `max(0.45, 1 − tier×0.15)` → 15 / 30 / 45 % at tier 1 / 2 / 3", // helpers.js actionMinutes()
  sawPlanks: 0.6,                                     // helpers.js recipeMinutes()
  move: { hunger:0.12, thirst:0.18, thirstDry:0.4, canteen:0.8, coldWarmth:0.6 }, // world-map.js tryMove()
  liveTickMin: 15,                                    // render.js realtimeTick()
  decay: { hunger:4, thirst:5, energyPlayer:3, energyOther:2, warmthNight:6, warmthDay:2, childFactor:0.5, fireNight:4 }, // actions.js decaySurvivor()
  sleep: { home:14, tentBag:12, bag:11, roof:10, ground:10, rest:5, restCap:60 }, // actions.js sleepConditions()/sleepFor()
  combat: { meleeLo:3, meleeHi:7, brave:2, armor:3, ammoChance:0.3, ammoLo:6, ammoHi:12,
            fleeBase:0.4, fleeQuick:0.2, fleeCoward:0.15, fleePerDanger:0.05, fleeEnergy:10, minutes:15 }, // actions.js combat*()
  lossPct: 0.2, lossList: ["wood","food","water","cloth","metal","weapons"], // actions.js combatLose()
  raidSteal: ["food","water","metal","weapons","ammo","cloth","tools"],      // actions.js raidEvent()
  weaponsMitigate: 0.8,                               // actions.js raidEvent() (2+ weapons)
  scout: { consume:"1 food + 1 clean water", cooldownH:12 },  // actions.js runScout()
  underground: { shallow:45, deep:90, cooldownH:24 }, // actions.js / data.js UNDERGROUND_SITES
  claim: { cost:"2 wood + 1 rope", min:30 },     // world-map.js claimWorkSite()
  outpost: { cost:"6 wood + 1 rope", min:30, haulPerDay:8 },  // world-map.js establishOutpost()/haulCaches()
  bandage:15, medicine:25,                            // actions.js (bandage / treat)
  featureSearch: { renewable:5, ordinary:20, mineral:30, event:15 }, // world-map.js featureMinutes()
};

// ---- formatting helpers ----------------------------------------------------
const PSEUDO = { happiness_all:"😊 happiness (all)", morale_all:"✨ morale (all)", reputation:"🤝 reputation", knowledge:"🧠 knowledge" };
const num = n => (n % 1 === 0 ? "" + n : (+n.toFixed(2)).toString());
const rng = v => (v[0] === v[1] ? num(v[0]) : `${num(v[0])}–${num(v[1])}`);
function resLabel(k){ const r = R[k]; return `${r && r.icon ? r.icon + " " : ""}${r ? r.name.toLowerCase() : k}`; }
function fmtCost(obj){ // resources only, scalar or [lo,hi]
  if (!obj || !Object.keys(obj).length) return "—";
  return Object.keys(obj).map(k => `${Array.isArray(obj[k]) ? rng(obj[k]) : num(obj[k])} ${resLabel(k)}`).join(" · ");
}
function fmtProd(obj){ // like fmtCost but understands pseudo-resources (happiness_all…)
  if (!obj || !Object.keys(obj).length) return "—";
  return Object.keys(obj).map(k => {
    const amt = Array.isArray(obj[k]) ? rng(obj[k]) : num(obj[k]);
    return PSEUDO[k] ? `+${amt} ${PSEUDO[k]}` : `${amt} ${resLabel(k)}`;
  }).join(" · ");
}
const tmin = m => (m >= 60 ? `${num(m / 60)}h` : `${m} min`);

// ---- building effects (every key must be handled or the guard throws) ------
const HANDLED_EFFECTS = new Set([
  "warmth","cook","housing","storage","food_storage","produce","produce_per_worker",
  "convert","consume","safety","safety_per_worker","happiness","happiness_all","morale_all",
  "reputation","heal_per_worker","disease_resist","attract_chance","trade_chance","knowledge",
  "knowledge_per_worker","child_growth","warning","wall","combat_train","danger_reduce",
  "order","repair","fuel_safe","farm",
]);
function buildingEffect(b){
  const e = b.effects || {}, out = [];
  if (e.farm) out.push("plant, water, fertilize & harvest crops (farmers automate a plot)");
  if (e.housing) out.push(`houses ${e.housing}`);
  if (e.storage) out.push(`+${e.storage} shared storage load (resources and gear)`);
  if (e.food_storage) out.push(`+${e.food_storage} food/crop/meat-only load`);
  if (e.warmth) out.push("provides warmth");
  if (e.cook) out.push("lets you cook");
  if (e.produce) out.push(`produces ${fmtProd(e.produce)}/day`);
  if (e.produce_per_worker) out.push(`produces ${fmtProd(e.produce_per_worker)} per worker/day`);
  if (e.convert) out.push(`converts ${fmtCost(e.convert.from)} → ${fmtCost(e.convert.to)} (×${e.convert.perWorker}/worker)`);
  if (e.consume) out.push(`uses ${fmtCost(e.consume)}/day`);
  if (e.heal_per_worker) out.push(`heals ${e.heal_per_worker} HP per worker`);
  if (e.disease_resist) out.push("disease resistance");
  if (e.happiness_all) out.push("+happiness for everyone");
  if (e.happiness) out.push("+happiness");
  if (e.morale_all) out.push("+morale for everyone");
  if (e.reputation) out.push("+reputation");
  if (e.knowledge || e.knowledge_per_worker) out.push("generates knowledge");
  if (e.child_growth) out.push("children grow faster");
  if (e.safety || e.safety_per_worker) out.push(`+safety${e.safety_per_worker ? " per guard" : ""}`);
  if (e.wall) out.push(`+${e.wall} wall (reduces raid damage)`);
  if (e.warning) out.push("early raid warning");
  if (e.danger_reduce) out.push(`−${e.danger_reduce} settlement danger`);
  if (e.combat_train) out.push("trains combat skill");
  if (e.attract_chance) out.push("attracts survivors");
  if (e.trade_chance) out.push("attracts traders");
  if (e.repair) out.push("repairs buildings");
  if (e.order) out.push("holds troublemakers");
  if (e.fuel_safe) out.push("safe fuel/oil storage");
  return out.join("; ") || "—";
}

// ---- which research unlocks each building/job ------------------------------
const unlockB = {}, unlockJ = {};
for (const n of K){
  for (const id of (n.unlock && n.unlock.buildings || [])) unlockB[id] = n.name;
  for (const id of (n.unlock && n.unlock.jobs || [])) unlockJ[id] = n.name;
}

// ===========================================================================
// Build the document
// ===========================================================================
let out = "";
const w = (s = "") => (out += s + "\n");
const slug = h => "#" + h.toLowerCase().replace(/[^a-z0-9 \-]/g, "").replace(/ /g, "-");

const SECTIONS = [
  { emoji: "⏳", title: "Time costs" },
  { emoji: "📦", title: "Resource costs — crafting & survival" },
  { emoji: "🏘️", title: "Buildings" },
  { emoji: "🧑‍🔧", title: "Jobs & workers" },
  { emoji: "🧠", title: "Research tree" },
  { emoji: "🎒", title: "Gear & equipment" },
  { emoji: "⚔️", title: "Creatures & combat" },
  { emoji: "❤️", title: "Survival & settlement reference" },
];
const head = i => `${SECTIONS[i].emoji} ${i + 1} · ${SECTIONS[i].title}`;
const H2 = i => w(`\n## ${head(i)}\n`);

// ---- banner ----------------------------------------------------------------
w(`<div align="center">`);
w();
w(`# ☢️ Post 2045 — Pricing & Economy Reference`);
w();
w(`**Everything the player pays for, what it costs, and what it returns.**`);
w();
w(`<sub>🤖 Auto-generated from \`js/data.js\` by \`tools/gen-pricing.js\` — <b>do not edit by hand</b>. Run <code>node tools/gen-pricing.js</code> to refresh after changing the game.</sub>`);
w();
w(`</div>`);
w();
w(`---`);
w();
w(`> [!NOTE]`);
w(`> The game runs on **four currencies**:`);
w(`>`);
w(`> | | Currency | Unit | Notes |`);
w(`> |---|---|---|---|`);
w(`> | ⏳ | **Time** | *phases* | \`1 phase = 6 hours\` · \`4 phases = 1 day\`. Most actions cost game minutes. |`);
w(`> | 📦 | **Resources** | items | ${Object.keys(R).length} resource types. |`);
w(`> | 🧠 | **Knowledge** | points | spent only on the research tree. |`);
w(`> | ⚡ | **Energy** | 0–100 | drained by almost every action and every step. |`);
w();
w(`> [!TIP]`);
w(`> This reference is also in-game: **📖 Guide → 💰 Prices & Costs**, with a **🔎 Search the Game** box (type e.g. \`clean water\` to see everything that makes or uses it).`);
w();
w(`### Contents`);
w();
SECTIONS.forEach((s, i) => w(`${i + 1}. [${s.emoji} ${s.title}](${slug(head(i))})`));
w();
w(`---`);

// ===========================================================================
// 1 · TIME
// ===========================================================================
H2(0);
w(`### 🎒 Quick actions`);
w();
w(`| Action | Time | ⚡ | Notes |`);
w(`|---|---:|---:|:--|`);
const QA = [
  ["🪓 Chop wood", "chop_wood", "3–5 wood; axe cuts time (see below)"],
  ["🌿 Forage", "gather", "food, herbs and seeds"],
  ["🔥 Boil water", "boil_water", "2 dirty + 1 wood → 2 clean (at a fire)"],
  ["🧪 Purify water", "purify_water", "2 dirty + 1 charcoal → 2 clean"],
  ["🍳 Cook", "cook", "1 meat or 2 crops + 1 wood → 3 food"],
  ["♨️ Warm up", "warm_fire", "+30 warmth at a fueled fire"],
  ["🎺 Gather spirits", "gather_spirits", "+5 happiness to the nearby group"],
  ["🏹 Craft arrows", "craft_arrows", "1 wood + 1 bones → 5 arrows"],
  ["🦌 Hunt", "hunt", "needs a carried bow + 1 arrow"],
  ["🥋 Train (combat)", "train", "+0.5 combat skill"],
  ["📖 Study a book", "study", "1 book → +2–5 knowledge"],
  ["🪣 Fetch water", "fetch_water", "2 water; canteen 3; bucket 5"],
  ["🧵 Gather fiber", "gather_fiber", "reeds / plant fiber"],
  ["🪨 Collect loose stone", "gather_stone", "no tools needed"],
  ["⛏ Mine", "mine", "needs a pickaxe (before tier bonus)"],
  ["🪏 Dig", "dig", "needs a shovel → 17 min with one"],
  ["🎣 Fish", "fish", "needs a rod beside water"],
  ["🩹 Bandage", "bandage", `1 bandage → +${CODE.bandage} HP, clears injury`],
  ["💊 Treat illness", null, `1 medicine → +${CODE.medicine} HP, clears disease · 5 min`],
  ["💤 Rest", "rest", `+${CODE.sleep.rest} energy up to ${CODE.sleep.restCap} before phase decay`],
];
const AE = T.ACTION_ENERGY;
for (const [name, key, note] of QA){
  if (key === null){ w(`| ${name} | **5 min** | — | ${note} |`); continue; }
  const en = AE[key] != null ? AE[key] : "—";
  w(`| ${name} | **${AC[key]} min** | ${en} | ${note} |`);
}
w(`| 🛏️ Sleep | **2 / 4 / 8 h** | — | recovery ${CODE.sleep.ground}–${CODE.sleep.home} energy/hr by shelter; can be interrupted |`);
w(`| 🍞 Eat / 💧 Drink | **free** | — | eat: 1 food → +30 hunger; drink: 1 clean (+30) or dirty (+20, 15% illness) |`);
w();
w(`<sub>⚙ ${CODE.toolDiscount}. Planks take ×${CODE.sawPlanks} time with a saw (15 → 9 min).</sub>`);
w();

w(`### 🏗️ Building & field activities`);
w();
const bt = CODE.buildTiers;
w(`| Activity | Time | Notes |`);
w(`|---|---:|:--|`);
w(`| 🔨 Build tent / crafting table / garden / rain barrel | **${bt.starter} min** | starter builds |`);
w(`| 🔨 Build any housing (shelter, huts, cabin) | **${bt.housing} min** | |`);
w(`| 🔨 Build warehouse / town hall / barracks / community hall | **${bt.major} min** | major structures |`);
w(`| 🔨 Build any other structure | **${bt.other} min** | |`);
w(`| — carried 🔨 hammer | **×${bt.hammer}** | −${Math.round((1 - bt.hammer) * 100)}% on every build |`);
w(`| 🧰 Repair a tool | **10 min** | 1 repair kit |`);
w(`| 🔦 Refuel a light | **10 min** | 1 wood (torch) / 1 oil (lantern) |`);
w(`| ⛺ Pitch portable tent | **${AC.pitch_tent} min** | deploy carried tent |`);
w(`| 🛌 Lay sleeping bag | **${AC.lay_bag} min** | deploy carried bag |`);
w(`| 🛖 Build a lean-to | **${AC.lean_to} min** | 4 wood + 4 fiber |`);
w(`| 🔥 Fuel a field campfire | **${AC.light_fire} min** | 1 wood → 4 h fuel |`);
w(`| 🎒 Pack camp | **${AC.pack_camp} min** | recover gear; extinguish fire |`);
w(`| 🧭 Survey | **${AC.survey} min** | reveal a 10-tile radius |`);
w(`| ⛏ Claim mine / fishing site | **${CODE.claim.min} min** | ${CODE.claim.cost} |`);
w(`| 📦 Establish supply outpost | **${CODE.outpost.min} min** | ${CODE.outpost.cost} |`);
w(`| 💕 Court a survivor | **30 min** | +18–30 heart (leader +8) |`);
w(`| ⚔️ Combat (win / lose / flee) | **${CODE.combat.minutes} min** | charged once; a fatal defeat resolves immediately |`);
w();

w(`### 🗺️ Exploring ruins — *Quick Scout*`);
w();
w(`Departs town, consumes **${CODE.scout.consume}**, and has a **${CODE.scout.cooldownH}-hour cooldown per route**. Loot enters the backpack; excess stays in a ground cache. Combat adds its own ${CODE.combat.minutes} minutes.`);
w();
const scoutByMin = {};
for (const id in LOC){ const l = LOC[id]; (scoutByMin[l.minutes] = scoutByMin[l.minutes] || []).push(`${l.icon} ${l.name}`); }
w(`| Time | Destinations |`);
w(`|---:|:--|`);
for (const m of Object.keys(scoutByMin).map(Number).sort((a, b) => a - b)) w(`| **${m} min** (${num(m / 60)}h) | ${scoutByMin[m].join(" · ")} |`);
w();

w(`### 🕳️ Underground sites`);
w();
w(`Mines, caves, subways and storm drains. Each route has a **${CODE.underground.cooldownH}-hour cooldown**. Shallow searches take **${CODE.underground.shallow} min**, deep searches **${CODE.underground.deep} min** (deep needs a fueled light; mines need a pickaxe). Searching a surface feature costs ${CODE.featureSearch.renewable} min (renewable plants), ${CODE.featureSearch.ordinary} min (ordinary), or ${CODE.featureSearch.mineral} min (mineral nodes, before tool bonus).`);
w();

w(`### 🚶 World-map travel (per tile)`);
w();
w(`From the \`TRAVEL\` table; both values are multiplied by condition penalties (cold, hunger, thirst, injury, disease).`);
w();
w(`| Terrain | Time | ⚡ Energy |`);
w(`|---|---:|---:|`);
const tg = {};
for (const k in TR){ const key = TR[k].join(","); (tg[key] = tg[key] || []).push(BI[k] ? BI[k].name : k); }
for (const key of Object.keys(tg).sort((a, b) => parseFloat(a) - parseFloat(b))){
  const [m, e] = key.split(",").map(Number);
  w(`| ${tg[key].join(" / ")} | **${m} min** | ${e} |`);
}
w(`| River / lake | — | impassable |`);
w();
const mv = CODE.move;
w(`⚙ Each step also drains **${mv.hunger} hunger** and **${mv.thirst} thirst** (**${mv.thirstDry}** in wasteland); a canteen cuts travel thirst ×${mv.canteen}. Cold tiles cost ${mv.coldWarmth} warmth without insulation. Needs also decay on six-hour phase boundaries. Night is 20:00–06:00. In **Live** mode each tick advances **${CODE.liveTickMin} game minutes** (${RTMS.slice(1).map(ms => ms / 1000 + "s").join(" / ")} real-time at 1× / 2× / 3×).`);
w();
w(`---`);

// ===========================================================================
// 2 · RESOURCES & CRAFTING
// ===========================================================================
H2(1);
w(`### 🛠️ Crafting & survival actions`);
w();
w(`| Action | Cost | → Yields |`);
w(`|---|---|---|`);
w(`| 🔥 Boil water | ${fmtCost(RC.clean_water.cost)} | ${fmtCost(RC.clean_water.output)} |`);
w(`| 🧪 Purify water | ${fmtCost(RC.filtered_water.cost)} | ${fmtCost(RC.filtered_water.output)} |`);
w(`| 🍳 Cook (meat) | ${fmtCost(RC.meal.cost)} | ${fmtCost(RC.meal.output)} |`);
w(`| 🍳 Cook (crops) | ${fmtCost(RC.vegetable_meal.cost)} | ${fmtCost(RC.vegetable_meal.output)} |`);
w(`| 🍞 Eat | 1 food | +30 hunger |`);
w(`| 💧 Drink | 1 clean water *(or dirty — 15% illness)* | +30 / +20 thirst |`);
w(`| 🩹 Bandage | ${fmtCost(RC.bandages.cost)} → 3 bandages; 1 per use | +${CODE.bandage} HP, clears injury |`);
w(`| 💊 Treat illness | 1 medicine | +${CODE.medicine} HP, clears disease |`);
w(`| ♨️ Warm by fire | nearby fueled fire | +30 warmth |`);
w(`| 🏹 Craft arrows | ${fmtCost(RC.arrows.cost)} | ${fmtCost(RC.arrows.output)} |`);
w(`| 🦌 Hunt | carried bow + 1 arrow | 🍖 meat · 🦌 hides · 🦴 bones |`);
w(`| 📖 Study | 1 book | +2–5 🧠 knowledge |`);
w();

w(`### 🧪 Crafting recipes`);
w();
w(`Read straight from \`RECIPES\`. Hand recipes work anywhere; others need a station and sometimes research.`);
w();
w(`| Item | Ingredients | → Yields | Time | Station |`);
w(`|---|---|---|---:|:--|`);
const STATION = { crafting_table:"Crafting Table", furnace:"Furnace", forge:"Forge", workshop:"Workshop", charcoal_kiln:"Charcoal Kiln", fire:"fire" };
function recStation(r){ let s = r.station ? (STATION[r.station] || r.station) : "hand"; if (r.tech) s += ` + ${cap1(r.tech)}`; return s; }
function cap1(s){ return s.charAt(0).toUpperCase() + s.slice(1); }
function recYield(r){ return r.output ? fmtCost(r.output) : (r.item && IT[r.item] ? IT[r.item].name : (r.item || "?")); }
for (const id in RC){ const r = RC[id]; const name = r.name || (r.item && IT[r.item] ? IT[r.item].name : id);
  w(`| ${name} | ${fmtCost(r.cost)} | ${recYield(r)} | ${r.minutes} min | ${recStation(r)} |`);
}
w();

w(`### 🎒 Camping & field work`);
w();
w(`All personal pickups and crafting outputs enter your pack, even at home. Return on or next to the home campfire or a storage building to transfer. Pack capacity is **30 load**, **45 with a canvas backpack**, or **65 with a framed backpack**, including equipped gear. Most small items weigh 0.05–0.3; wood weighs ${WT.wood}, stone/ore ${WT.stone}. Water containers hold **${T.BASE_LIQUID_CAP} units** initially; each carried canteen adds **${IT.canteen.liquidCapacity}**, each bucket **${IT.bucket.liquidCapacity}**. Clean and dirty water share container capacity and also count toward pack weight.`);
w();
w(`| Field action | Materials | Time |`);
w(`|---|---|---:|`);
w(`| Gather fiber | none | ${AC.gather_fiber} min |`);
w(`| Collect loose stone | none | ${AC.gather_stone} min |`);
w(`| Mine | pickaxe (uses durability) | ${AC.mine} min (before tier bonus) |`);
w(`| Dig | shovel (uses durability) | 17 min with a shovel |`);
w(`| Fish | rod + nearby water | ${AC.fish} min |`);
w(`| Build lean-to | 4 wood + 4 fiber | ${AC.lean_to} min |`);
w(`| Fuel field campfire | 1 wood → 4 h fuel | ${AC.light_fire} min |`);
w(`| Repair tool | 1 repair kit | 10 min |`);
w(`| Refuel light | 1 wood / 1 oil | 10 min |`);
w(`| Claim mine / fishing site | ${CODE.claim.cost} | ${CODE.claim.min} min |`);
w(`| Establish supply outpost | ${CODE.outpost.cost} | ${CODE.outpost.min} min |`);
w();
w(`Claimed mines and fishing sites draw from finite reserves shared with the player; exhausted sources recover on their game-time schedule. Haulers recover up to **${CODE.outpost.haulPerDay} resource units/day** from supply outposts, limited by base space. Full storage pauses production before inputs are spent.`);
w();

w(`### 🌾 Farming & work orders`);
w();
w(`- **Plant:** 1 seed, 20 min (10 with a hoe). **Water:** 1 clean water, 5 min. **Fertilize:** 1 compost, 5 min (+30 fertility). **Harvest:** 10 min.`);
w(`- **Fence a plot:** 4 wood, 20 min (stops wildlife). **Irrigate a plot:** 4 wood + 4 clay + 1 rope, 30 min (auto-draws stored water).`);
w(`- Base growth: ${Object.values(CR).map(c => `${c.name.toLowerCase()} ${num(c.days)}d`).join(", ")}. Moisture, fertility and cold modify growth.`);
w(`- Yields ×1.5 on a crop field, ×2 in a greenhouse; **seeds are never multiplied**. Mature crops return seeds; orchards regrow without replanting.`);
w(`- Work orders at a workplace spend the same recipe ingredients as hand crafting and replace the building's default output; reserves protect essential inputs.`);
w();
w(`| Crop | Grow time | → Harvest |`);
w(`|---|---:|---|`);
for (const k in CR){ const c = CR[k]; w(`| ${c.name} | ${num(c.days)} d | ${fmtCost(c.output)}${c.perennial ? " *(perennial)*" : ""} |`); }
w();
w(`---`);

// ===========================================================================
// 3 · BUILDINGS
// ===========================================================================
H2(2);
w(`Costs, effects and build limits from \`BUILDINGS\`. **Max** is the build cap (×${CAPX} multiplier applied at load); **W** is worker slots each. *Unlock* is the research that enables it — "start" means it is buildable from the beginning.`);
w();
const CAT_META = {
  Shelter:["🛖 Shelter", true], Storage:["📦 Storage", false], Water:["💦 Water", false],
  Food:["🌾 Food", false], Medicine:["⚕️ Medicine", false], Community:["🏛️ Community", false],
  Education:["📚 Education", false], Crafting:["🪚 Crafting", false], Engineering:["⚙️ Engineering", false],
  Defense:["🛡️ Defense", false], Trade:["🛒 Trade", false], Survival:["🔥 Survival", false],
};
const byCat = {};
for (const id in B){ (byCat[B[id].cat] = byCat[B[id].cat] || []).push([id, B[id]]); }
const catOrder = Object.keys(CAT_META).filter(c => byCat[c]).concat(Object.keys(byCat).filter(c => !CAT_META[c]));
for (const cat of catOrder){
  const [label, open] = CAT_META[cat] || [cat, false];
  w(`<details${open ? " open" : ""}>`);
  w(`<summary><b>${label}</b></summary>`);
  w();
  w(`| Building | Cost | Effect | Max | W | Unlock |`);
  w(`|---|---|---|---:|---:|:--|`);
  for (const [id, b] of byCat[cat]){
    const free = !b.cost || !Object.keys(b.cost).length || (Object.keys(b.cost).length === 1 && b.cost.wood === 0);
    const unlock = STARTER_SET.has(id) ? "start" : (unlockB[id] || "—");
    w(`| ${b.icon ? b.icon + " " : ""}${b.name} | ${free ? "*free*" : fmtCost(b.cost)} | ${buildingEffect(b)} | ${b.max} | ${b.workers} | ${unlock} |`);
  }
  w();
  w(`</details>`);
}
w();
w(`**Storage:** the campfire provides ${CAP} shared load; each storage shed adds ${B.storage_shed.effects.storage}, warehouse ${B.warehouse.effects.storage}, and fuel depot ${B.fuel_depot.effects.storage}. Stored gear counts. Each food cellar adds ${B.food_cellar.effects.food_storage} food/crops/meat-only load, used before general storage. Transfers move only what fits; the rest remains in the pack. Existing over-capacity saves retain their supplies. Food can spoil when total storage load exceeds 90% of general + cellar capacity.`);
w(``);
w(`### Finite resource reserves and recovery`);
w(`All gathering methods and worker collection share location-based stock. Recovery starts on the first withdrawal, uses game time, and survives saves and chunk eviction. Empty sources and full packs block collection without spending time, energy or durability. Finite loot overflow stays at the source; ordinary gathering leaves uncollected stock untouched.`);
w(``);
w(`| Reserve family | Starting supply | Recovery cycle |`);
w(`|---|---|---|`);
for(const rule of Object.values(T.SOURCE_RULES)) w(`| ${rule.name} | ${Object.keys(rule.stock).length?fmtCost(rule.stock):`Feature loot maximum ×4 for each material; otherwise ${T.SOURCE_DEFAULT_STOCK} per material`} | ${tmin(rule.minutes)} |`);
w(``);
w(`Wildlife reserves are shared within 8×8 areas; moving animals retain their origin. Built water collectors and livestock buildings have recoverable reserves scaled by building count. Crops require another growth cycle. Quick Scout retains a 12-hour route cooldown, underground routes 24 hours and event sites 72 hours. A trader has one bundle, restocking 24 hours after purchase; both payment and pack/container space are checked before exchange.`);
w();
w(`---`);

// ===========================================================================
// 4 · JOBS
// ===========================================================================
H2(3);
w(`Every assignable job from \`JOBS\` (daily figures, before trait and condition modifiers).`);
w();
w(`<sub>⚙ Output scales with traits — hardworking +25%, lazy −25%, and matching specialists (hunter at a lodge, farmer at a field, medic at a clinic, etc.) +25–30% — and drops when a worker's happiness or health is low (floor ×0.2).</sub>`);
w();
const jobsGeneral = [], jobsBuilding = [];
for (const id in J){ if (id === "none") continue; (J[id].building ? jobsBuilding : jobsGeneral).push([id, J[id]]); }
function jobRows(list){
  w(`| Job | Workplace | Produces/day | Consumes/day | Notes |`);
  w(`|---|---|---|---|:--|`);
  for (const [id, j] of list){
    const place = j.building ? (B[j.building] ? B[j.building].name : j.building) : "—";
    w(`| ${j.name} | ${place} | ${fmtProd(j.output)} | ${j.consume ? fmtCost(j.consume) : "—"} | ${j.desc || ""} |`);
  }
}
w(`<details open>`);
w(`<summary><b>General jobs (no building needed)</b></summary>`);
w();
jobRows(jobsGeneral);
w();
w(`</details>`);
w();
w(`<details>`);
w(`<summary><b>Workplace jobs (need the building + an open slot)</b></summary>`);
w();
jobRows(jobsBuilding);
w();
w(`</details>`);
w();
w(`---`);

// ===========================================================================
// 5 · RESEARCH
// ===========================================================================
H2(4);
w(`From \`KNOWLEDGE\`. Spend knowledge points to unlock buildings (and some jobs). Quick view by cost:`);
w();
w(`| Cost | Tech |`);
w(`|:---:|---|`);
const byCost = {};
for (const n of K){ (byCost[n.cost] = byCost[n.cost] || []).push(n.name); }
for (const c of Object.keys(byCost).map(Number).sort((a, b) => a - b)) w(`| **${c}** | ${byCost[c].join(" · ")} |`);
w();
const byCatK = {};
for (const n of K){ (byCatK[n.cat] = byCatK[n.cat] || []).push(n); }
for (const catk of Object.keys(byCatK)){
  w(`<details>`);
  w(`<summary><b>${catk}</b></summary>`);
  w();
  w(`| Tech | Cost | Requires | Unlocks |`);
  w(`|---|---:|:--|:--|`);
  for (const n of byCatK[catk]){
    const req = (n.req || []).map(r => { const f = K.find(x => x.id === r); return f ? f.name : r; }).join(", ") || "—";
    const unl = [...(n.unlock && n.unlock.buildings || []).map(b => B[b] ? B[b].name : b),
                 ...(n.unlock && n.unlock.jobs || []).map(j => J[j] ? J[j].name : j)].join(", ") || "—";
    w(`| ${n.name} | ${n.cost} | ${req} | ${unl} |`);
  }
  w();
  w(`</details>`);
}
w();
w(`Knowledge is earned by surviving each day (+0.5 +0.05/survivor), studying books, libraries/schools, and some NPCs and map events.`);
w();
w(`---`);

// ===========================================================================
// 6 · GEAR
// ===========================================================================
H2(5);
w(`Craftable equipment from \`ITEMS\` (+ its \`RECIPES\` entry). Tools wear down and are repaired with repair kits; lights burn fuel.`);
w();
w(`<details open>`);
w(`<summary><b>All gear</b></summary>`);
w();
w(`| Item | Type | Key stats | Craft | What it does |`);
w(`|---|---|---|---|:--|`);
for (const id in IT){ const it = IT[id], r = RC[id], s = [];
  if (it.durability) s.push(`dur ${it.durability}`);
  if (it.weight != null) s.push(`wt ${it.weight}`);
  if (it.capacity) s.push(`pack ${it.capacity}`);
  if (it.liquidCapacity) s.push(`water capacity +${it.liquidCapacity}`);
  if (it.armor) s.push(`armor ${it.armor}`);
  if (it.insulation) s.push(`insul ${it.insulation}`);
  if (it.vision) s.push(`+${it.vision} vision`);
  if (it.damage) s.push(`dmg ${it.damage}`);
  const craft = r ? `${fmtCost(r.cost)} · ${r.minutes}m · ${recStation(r)}` : "—";
  w(`| ${it.name} | ${it.slot || it.kind} | ${s.join(", ") || "—"} | ${craft} | ${it.desc || ""} |`);
}
w();
w(`</details>`);
w();
w(`---`);

// ===========================================================================
// 7 · COMBAT
// ===========================================================================
H2(6);
w(`### 👹 Enemies`);
w();
w(`From \`ENEMIES\`. You meet these on the map, in ruins, underground and in raids.`);
w();
w(`| Enemy | HP | Damage | Danger | Loot |`);
w(`|---|---:|---:|---:|:--|`);
for (const id in EN){ const e = EN[id]; w(`| ${e.name} | ${e.hp} | ${e.dmg[0]}–${e.dmg[1]} | ${e.danger} | ${fmtCost(e.loot)} |`); }
w();
w(`### 🦌 Huntable animals`);
w();
w(`Flee on contact — shoot with a bow from 1–3 tiles.`);
w();
w(`| Animal | Loot | Flee chance |`);
w(`|---|---|---:|`);
for (const id in ME){ const m = ME[id]; if (!m.huntable) continue;
  w(`| ${m.icon} ${m.name} | ${fmtCost(m.loot)} | ${Math.round((m.fleeChance != null ? m.fleeChance : 0.7) * 100)}% |`);
}
w();
const cb = CODE.combat;
w(`### ⚔️ Combat math`);
w();
w(`- **Melee hit** = ${cb.meleeLo}–${cb.meleeHi} + weapon bonus (salvaged weapon +${IT.salvaged_weapon.damage}, bow +${IT.bow.damage}) + combat skill + ${cb.brave} if brave.`);
w(`- **Ranged proc:** with a salvaged weapon, ${Math.round(cb.ammoChance * 100)}% chance to spend 1 ammo for +${cb.ammoLo}–${cb.ammoHi} extra damage.`);
w(`- **Armor:** equipped leather armor blocks ${cb.armor} damage.`);
w(`- **Flee:** ${Math.round(cb.fleeBase * 100)}% base +${Math.round(cb.fleeQuick * 100)}% quick +${Math.round(cb.fleeCoward * 100)}% cowardly −${Math.round(cb.fleePerDanger * 100)}% per enemy danger; costs ${cb.fleeEnergy} energy.`);
w(`- Win / lose / flee each resolve in ${cb.minutes} minutes.`);
w();
w(`### 💀 Involuntary losses`);
w();
w(`> [!WARNING]`);
w(`> - **Combat defeat** — lose **${Math.round(CODE.lossPct * 100)}%** of carried ${CODE.lossList.join(", ")}; town stocks are safe from a field defeat.`);
w(`> - **Raids / theft** — attackers can steal ${CODE.raidSteal.join(", ")}, and may damage buildings. Stockpiling 2+ weapons cuts raid damage ×${CODE.weaponsMitigate}.`);
w();
w(`---`);

// ===========================================================================
// 8 · SURVIVAL
// ===========================================================================
H2(7);
const d = CODE.decay, sl = CODE.sleep;
w(`### ❤️ Needs decay (per 6-hour phase)`);
w();
w(`| Need | Drain / phase | Notes |`);
w(`|---|---|:--|`);
w(`| 🍞 Hunger | −${d.hunger} | children ×${d.childFactor} |`);
w(`| 💧 Thirst | −${d.thirst} | children ×${d.childFactor} |`);
w(`| ⚡ Energy | −${d.energyPlayer} (you) / −${d.energyOther} (others) | actions & steps drain more |`);
w(`| 🔥 Warmth | −${d.warmthNight} night / −${d.warmthDay} day | children ×${d.childFactor}; +${d.fireNight} near a night fire |`);
w();
w(`**Health damage** when a need runs low: hunger <15 → −1 (≤0 → −3); thirst <15 → −2 (≤0 → −5); warmth <15 → −1 day/−2 night (≤0 → −1 day/−4 night); disease → −2 per phase. **Morale** = happiness×0.5 + safety×0.5.`);
w();
w(`### 🛌 Sleep recovery (energy / hour)`);
w();
w(`Bare ground **${sl.ground}** · lean-to or tent **${sl.roof}** · sleeping bag **${sl.bag}** · tent + bag **${sl.tentBag}** · near housing **${sl.home}**. A short Rest gives +${sl.rest} (up to ${sl.restCap}). Energy decay pauses while you sleep or rest (so 8 h on bare ground nets ~80), but hunger, thirst and warmth keep draining, and exposure, radiation and ambushes can interrupt or kill.`);
w();
w(`### 🧳 Starting kit`);
w();
w(`New survivors begin with: ${fmtCost(START)}.`);
w();
w(`Starter buildings (buildable immediately): ${STARTER.map(id => (B[id] ? (B[id].icon ? B[id].icon + " " : "") + B[id].name : id)).join(" · ")}.`);
w();
w(`<div align="center">`);
w();
w(`---`);
w();
w(`<sub>Generated by \`tools/gen-pricing.js\` from \`js/data.js\` — plus constants mirrored from \`js/actions.js\`, \`js/helpers.js\` and \`js/world-map.js\` (see the generator's MIRRORED-FROM-CODE block).</sub>`);
w();
w(`</div>`);

// ===========================================================================
// GUARDS — fail loudly if the game grew content this script can't render
// ===========================================================================
const problems = [];

// 1) unhandled building effect keys
const unknownEffects = new Set();
for (const id in B){ for (const k in (B[id].effects || {})) if (!HANDLED_EFFECTS.has(k)) unknownEffects.add(k); }
if (unknownEffects.size) problems.push(`Unhandled building effect key(s): ${[...unknownEffects].join(", ")} — extend buildingEffect()/HANDLED_EFFECTS.`);

// 2) unknown resource keys in any cost/output/loot/consume
const known = new Set([...Object.keys(R), ...Object.keys(PSEUDO)]);
const seen = new Set();
const scan = obj => { for (const k in (obj || {})) seen.add(k); };
for (const id in B){ const e = B[id].effects || {}; scan(B[id].cost); scan(e.produce); scan(e.produce_per_worker); scan(e.consume); if (e.convert){ scan(e.convert.from); scan(e.convert.to); } }
for (const id in RC){ scan(RC[id].cost); scan(RC[id].output); }
for (const id in J){ scan(J[id].output); scan(J[id].consume); }
for (const id in EN) scan(EN[id].loot);
for (const id in ME) scan(ME[id].loot);
for (const id in CR) scan(CR[id].output);
scan(START);
const unknownRes = [...seen].filter(k => !known.has(k) && !["from","to","perWorker"].includes(k));
if (unknownRes.length) problems.push(`Unknown resource key(s): ${unknownRes.join(", ")} — add to RESOURCES or PSEUDO.`);

// 3) coverage — every named entity must appear in the document
const missing = [];
const must = [
  ...Object.values(B).map(x => x.name),
  ...Object.values(J).filter((_, i) => Object.keys(J)[i] !== "none").map(x => x.name),
  ...K.map(x => x.name),
  ...Object.values(IT).map(x => x.name),
  ...Object.values(EN).map(x => x.name),
  ...Object.values(CR).map(x => x.name),
];
for (const id in RC){ const r = RC[id]; must.push(r.name || (r.item && IT[r.item] ? IT[r.item].name : id)); }
for (const name of new Set(must)) if (name && !out.includes(name)) missing.push(name);
if (missing.length) problems.push(`Missing from output: ${missing.join(", ")}`);

if (problems.length){
  console.error("✗ gen-pricing FAILED:\n  - " + problems.join("\n  - "));
  process.exit(1);
}

// ---- write -----------------------------------------------------------------
fs.writeFileSync(OUT, out);
const huntable = Object.values(ME).filter(m => m.huntable).length;
console.log(`✓ Wrote ${path.relative(ROOT, OUT)} — ${out.length} chars, ${out.split("\n").length} lines`);
console.log(`  ${Object.keys(B).length} buildings · ${Object.keys(RC).length} recipes · ${Object.keys(J).length - 1} jobs · ${K.length} techs · ${Object.keys(IT).length} items · ${Object.keys(EN).length} enemies · ${huntable} huntable · ${Object.keys(CR).length} crops`);
console.log("  all guards passed ✓");
