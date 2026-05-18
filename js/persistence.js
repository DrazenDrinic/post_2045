"use strict";

// ------------------------- SAVE / LOAD ------------------------------

function save(){
  try{
    normalizeGame(G);
    // assign ids to survivors that lack them
    for (const s of G.survivors){ if (s.id===undefined) s.id = G.nextSurvId++; }
    localStorage.setItem(SAVE_KEY, JSON.stringify(G));
  }catch(e){ console.warn("Save failed", e); }
}

function load(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    G = parsed;
    normalizeGame(G);
    return true;
  }catch(e){ console.warn("Load failed", e); return false; }
}

function normalizeGame(g){
  if (!g || typeof g !== "object") return;
  if (g.day==null) g.day = 1;
  if (g.phase==null) g.phase = 0;
  if (!Array.isArray(g.log)) g.log = [];
  if (g.knowledge==null) g.knowledge = 0;
  if (g.reputation==null) g.reputation = 0;
  if (g.danger==null) g.danger = 0;
  if (!g.playerName) g.playerName = g.survivors?.[0]?.name || "You";
  if (!g.resources) g.resources = {};
  for (const k of RES_KEYS) if (g.resources[k]==null || !isFinite(g.resources[k])) g.resources[k] = 0;
  if (!g.buildings) g.buildings = {campfire:{count:1,dmg:0}};
  if (!g.buildings.campfire) g.buildings.campfire = {count:1,dmg:0};
  for (const id of Object.keys(g.buildings)){
    if (!BUILDINGS[id]) { delete g.buildings[id]; continue; }
    const st = g.buildings[id] || {};
    st.count = Math.max(0, Math.floor(st.count || 0));
    st.dmg = Math.max(0, st.dmg || 0);
    g.buildings[id] = st;
  }
  if (!Array.isArray(g.survivors)) g.survivors = [];
  if (!g.survivors.length) g.survivors.push(makeSurvivor("Survivor", true));
  if (!g.jobs) g.jobs = {};
  if (!g.workerAssign) g.workerAssign = {};
  if (!g.knownNodes) g.knownNodes = {};
  if (!Array.isArray(g.relationships)) g.relationships = [];
  if (!Array.isArray(g.followers)) g.followers = [];
  if (g.stepAccum==null) g.stepAccum = 0;
  if (!g.explored) g.explored = {};
  normalizeTown(g);
  if (!g.nextSurvId || g.nextSurvId < 1) g.nextSurvId = 1;
  for (const s of g.survivors.concat(g.followers)) normalizeSurvivor(g, s);
  g.survivors[0].isPlayer = true;
  if (g.playerName && g.survivors[0]) {
    g.survivors[0].firstName = g.playerName;
    g.survivors[0].lastName = "";
    g.survivors[0].name = g.playerName;
  }
  const aliveIds = new Set(g.survivors.map(s=>s.id));
  for (const id of Object.keys(g.jobs)){
    const sid = Number(id);
    if (!aliveIds.has(sid) || !JOBS[g.jobs[id]]) delete g.jobs[id];
  }
  for (const s of g.survivors){
    if (!JOBS[g.jobs[s.id]]) g.jobs[s.id] = s.job || "none";
    if (!JOBS[g.jobs[s.id]]) g.jobs[s.id] = "none";
    s.job = g.jobs[s.id];
  }
  for (const bid of Object.keys(g.workerAssign)){
    if (!BUILDINGS[bid]) { delete g.workerAssign[bid]; continue; }
    const slots = (BUILDINGS[bid].workers || 0) * (g.buildings[bid]?.count || 0);
    const clean = [];
    for (const id of g.workerAssign[bid] || []){
      if (aliveIds.has(id) && clean.length < slots && !clean.includes(id)) clean.push(id);
    }
    g.workerAssign[bid] = clean;
  }
  if (!g.map || !Array.isArray(g.map) || g.map.length!==MAP_H || !Array.isArray(g.map[0]) || g.map[0].length!==MAP_W){
    generateMap(g);
  } else {
    normalizeMap(g);
  }
  g.playerX = clamp(g.playerX ?? g.villageX ?? 0, 0, MAP_W-1);
  g.playerY = clamp(g.playerY ?? g.villageY ?? 0, 0, MAP_H-1);
  if (!inBounds(g.villageX, g.villageY)) { g.villageX = g.playerX; g.villageY = g.playerY; }
  placeSage(g);
}

function normalizeTown(g){
  if (!Array.isArray(g.town) || g.town.length!==TOWN_H || !Array.isArray(g.town[0]) || g.town[0].length!==TOWN_W){
    initTown(g);
  }
  for (let y=0; y<TOWN_H; y++){
    if (!Array.isArray(g.town[y])) g.town[y] = [];
    for (let x=0; x<TOWN_W; x++){
      const slot = g.town[y][x];
      if (!slot || !BUILDINGS[slot.building]) g.town[y][x] = null;
    }
  }
  if (!townBuildingCount(g, "campfire")){
    g.town[Math.floor(TOWN_H/2)][Math.floor(TOWN_W/2)] = {building:"campfire"};
  }
}

function normalizeSurvivor(g, s){
  if (!s.id && s.id!==0) s.id = g.nextSurvId++;
  if (s.id >= g.nextSurvId) g.nextSurvId = s.id + 1;
  if (!s.firstName) s.firstName = "Ash";
  if (s.lastName==null) s.lastName = "";
  if (!s.name) s.name = `${s.firstName} ${s.lastName}`.trim();
  if (s.maxHealth==null) s.maxHealth = 100;
  for (const k of ["health","hunger","thirst","energy","happiness","morale","warmth","safety"]){
    if (s[k]==null || !isFinite(s[k])) s[k] = k==="health" ? s.maxHealth : 60;
  }
  s.health = clamp(s.health, 0, s.maxHealth);
  s.hunger = clamp(s.hunger, 0, 100); s.thirst = clamp(s.thirst, 0, 100); s.energy = clamp(s.energy, 0, 100);
  s.happiness = clamp(s.happiness, 0, 100); s.morale = clamp(s.morale, 0, 100); s.warmth = clamp(s.warmth, 0, 100); s.safety = clamp(s.safety, 0, 100);
  if (!Array.isArray(s.traits)) s.traits = [];
  s.traits = s.traits.filter(t=>TRAITS[t]);
  if (!s.skills) s.skills = {};
  for (const k of ["combat","building","farming","medicine","crafting","hunting"]) if (s.skills[k]==null) s.skills[k] = 0;
  if (s.age==null) s.age = s.isChild ? 8 : 28;
  if (s.age_ticks==null) s.age_ticks = 0;
  if (s.daysSurvived==null) s.daysSurvived = 0;
  if (!Array.isArray(s.parentIds)) s.parentIds = [];
  if (!JOBS[s.job]) s.job = "none";
}

function normalizeMap(g){
  for (let y=0; y<MAP_H; y++){
    if (!Array.isArray(g.map[y])) g.map[y] = [];
    for (let x=0; x<MAP_W; x++){
      const t = g.map[y][x] || {};
      if (!BIOMES[t.biome]) t.biome = "plains";
      if (t.feature && !MAP_FEATURES[t.feature.type]) t.feature = null;
      if (t.feature && t.feature.charges==null) t.feature.charges = MAP_FEATURES[t.feature.type].charges;
      if (t.entity && !MAP_ENTITIES[t.entity.type]) t.entity = null;
      if (t.settlementBuilding && !BUILDINGS[t.settlementBuilding]) t.settlementBuilding = null;
      g.map[y][x] = {biome:t.biome, feature:t.feature||null, entity:t.entity||null, settlementBuilding:t.settlementBuilding||null};
    }
  }
  if (inBounds(g.villageX, g.villageY)) g.map[g.villageY][g.villageX].settlementBuilding = "campfire";
}

function reset(){
  showModal({
    title:"Reset Game?",
    body:"<p>This will erase your save and start over.</p>",
    buttons:[
      {label:"Cancel", action:closeModal},
      {label:"Reset", primary:true, action:()=>{ localStorage.removeItem(SAVE_KEY); closeModal(); startNewRun(); }}
    ]
  });
}
