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
    let raw = localStorage.getItem(SAVE_KEY);
    let migrated = false;
    if (!raw){
      for (const key of LEGACY_SAVE_KEYS){
        raw = localStorage.getItem(key);
        if (raw){ migrated = true; break; }
      }
    }
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    G = parsed;
    normalizeGame(G);
    if (migrated) save();
    return true;
  }catch(e){ console.warn("Load failed", e); return false; }
}

function clearSaves(){
  localStorage.removeItem(SAVE_KEY);
  for (const key of LEGACY_SAVE_KEYS) localStorage.removeItem(key);
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
  if (!g.playerSex) g.playerSex = g.survivors?.[0]?.sex || "M";
  if (!g.courtship || typeof g.courtship !== "object" || Array.isArray(g.courtship)) g.courtship = {};
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
  if (g.phaseMinutes==null) g.phaseMinutes = 0;
  g.phaseMinutes = clamp(g.phaseMinutes, 0, 359);
  if (!g.explored) g.explored = {};
  normalizeTown(g);
  if (!g.nextSurvId || g.nextSurvId < 1) g.nextSurvId = 1;
  for (const s of g.survivors.concat(g.followers)) normalizeSurvivor(g, s);
  g.survivors[0].isPlayer = true;
  if (g.playerName && g.survivors[0]) {
    g.survivors[0].firstName = g.playerName;
    g.survivors[0].lastName = "";
    g.survivors[0].name = g.playerName;
    g.survivors[0].sex = g.playerSex === "F" ? "F" : "M";
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
  // Jobs are authoritative; never leave a worker in two buildings or a destroyed workplace.
  g.workerAssign = {};
  for (const s of g.survivors){
    const bid = JOBS[g.jobs[s.id]]?.building;
    if (!bid) continue;
    const ids = g.workerAssign[bid] || (g.workerAssign[bid] = []);
    if (s.isPlayer || s.isChild || s.health<=0 || ids.length >= (BUILDINGS[bid].workers || 0)*(g.buildings[bid]?.count || 0)){
      g.jobs[s.id] = s.job = "none";
    } else ids.push(s.id);
  }
  if (!g.map || !Array.isArray(g.map) || g.map.length!==MAP_H || !Array.isArray(g.map[0]) || g.map[0].length!==MAP_W){
    generateMap(g);
  } else {
    normalizeMap(g);
  }
  g.playerX = clamp(g.playerX ?? g.villageX ?? 0, 0, MAP_W-1);
  g.playerY = clamp(g.playerY ?? g.villageY ?? 0, 0, MAP_H-1);
  if (!inBounds(g.villageX, g.villageY)) { g.villageX = g.playerX; g.villageY = g.playerY; }
  normalizeExpedition(g);
  placeSage(g);
}

function normalizeExpedition(g){
  const first = !g.inventory;
  if (first) g.inventory = {resources:{},gear:[]};
  if (!g.inventory.resources) g.inventory.resources = {};
  if (!Array.isArray(g.inventory.gear)) g.inventory.gear = [];
  if (!Array.isArray(g.townGear)) g.townGear = [];
  if (!g.equipment) g.equipment = {};
  if (!Number.isFinite(g.nextItemId)) g.nextItemId = 1;
  for (const key of ["camps","caches","workSites","markers","orders","reserves","scoutCooldowns","undergroundCooldowns"]){
    if (!g[key] || typeof g[key]!=="object" || Array.isArray(g[key])) g[key] = {};
  }
  if (!Array.isArray(g.farms)) g.farms = [];
  if (!g.weather || !["clear","rain","cold"].includes(g.weather.type)) g.weather = {type:"clear"};
  if (g.stopAtNight==null) g.stopAtNight = true;
  for (const k of RES_KEYS){
    const n = g.inventory.resources[k];
    g.inventory.resources[k] = Number.isFinite(n) ? Math.max(0,n) : 0;
  }
  const allIds = new Set();
  const cleanGear = list => (Array.isArray(list) ? list : []).filter(i=>{
    if (!i || !ITEMS[i.type]) return false;
    if (!Number.isInteger(i.id) || allIds.has(i.id)) i.id = g.nextItemId++;
    g.nextItemId = Math.max(g.nextItemId,i.id+1); allIds.add(i.id);
    if (ITEMS[i.type].durability) i.durability = clamp(Number.isFinite(i.durability) ? i.durability : ITEMS[i.type].durability,0,ITEMS[i.type].durability);
    return true;
  });
  g.inventory.gear = cleanGear(g.inventory.gear); g.townGear = cleanGear(g.townGear);
  const validKey = key => { const xy=key.split(",").map(Number); return xy.length===2 && xy.every(Number.isInteger) && inBounds(...xy); };
  for (const [key,c] of Object.entries(g.caches)){
    if (!validKey(key) || !c){ delete g.caches[key]; continue; }
    if (!c.resources) c.resources = {};
    for (const r of Object.keys(c.resources)) if (!RESOURCES[r] || !Number.isFinite(c.resources[r]) || c.resources[r]<0) delete c.resources[r];
    c.gear = cleanGear(c.gear);
  }
  for (const [key,c] of Object.entries(g.camps)){
    if (!validKey(key) || !c){ delete g.camps[key]; continue; }
    c.gear = cleanGear(c.gear);
    c.fuel = Math.max(0,Number.isFinite(c.fuel) ? c.fuel : 0);
  }
  for (const slot of ["weapon","clothing","pack"]){
    if (!g.inventory.gear.some(i=>i.id===g.equipment[slot] && ITEMS[i.type].slot===slot)) delete g.equipment[slot];
  }
  for (const [id,order] of Object.entries(g.orders)){
    if (!BUILDINGS[id] || !RECIPES[order?.recipe]) { delete g.orders[id]; continue; }
    order.target = clamp(Number(order.target)||0,0,999);
    order.progress = Math.max(0,Number(order.progress)||0);
    order.mode = order.mode==="maintain" ? "maintain" : "count";
  }
  for (const id of ["garden","crop_field","greenhouse"]){
    const count = g.buildings[id]?.count || 0;
    const current = g.farms.filter(f=>f.building===id).slice(0,count);
    while (current.length<count) current.push({id:id+"_"+current.length,building:id,crop:"vegetables",growth:0,water:60,fertility:80,planted:first});
    g.farms = g.farms.filter(f=>f.building!==id).concat(current);
  }
  g.farms = g.farms.filter(f=>["garden","crop_field","greenhouse"].includes(f.building));
  // Bind each plot record to the world tile of its building, for proximity gating.
  if (g.map){
    for (const id of ["garden","crop_field","greenhouse"]){
      const tiles=[];
      for (let y=Math.max(0,g.villageY-7); y<=Math.min(MAP_H-1,g.villageY+7); y++)
        for (let x=Math.max(0,g.villageX-10); x<=Math.min(MAP_W-1,g.villageX+10); x++)
          if (g.map[y] && g.map[y][x] && g.map[y][x].settlementBuilding===id) tiles.push({x,y});
      tiles.sort((a,b)=>a.y-b.y || a.x-b.x);
      g.farms.filter(f=>f.building===id).forEach((f,i)=>{
        if (tiles[i]){ f.x=tiles[i].x; f.y=tiles[i].y; } else { f.x=null; f.y=null; }
      });
    }
  }
  for (const f of g.farms){
    if (!CROPS[f.crop]) f.crop = "vegetables";
    f.growth = clamp(Number(f.growth)||0,0,100); f.water = clamp(Number(f.water)||0,0,100); f.fertility = clamp(Number(f.fertility)||0,0,100);
  }
  if (first){
    // One-time transfer, not a copy: existing town savings are preserved.
    for (const [k,n] of Object.entries({food:3,water:3,wood:4,cloth:2,arrows:4,medicine:1})){
      const amount = Math.min(n,g.resources[k] || 0);
      g.resources[k] -= addCarried(g,k,amount,false);
    }
    if (g.resources.weapons>=1){
      g.resources.weapons--;
      const weapon = giveItem(g,"salvaged_weapon"); g.equipment.weapon = weapon.id;
    }
    g.reserves.wood = 5;
    pushLog(g,"Expedition supplies are now carried in your pack. Town stock stays at home; transfers are available inside the settlement.","info");
  }
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
  if (s.sex !== "F" && s.sex !== "M") s.sex = rng()<0.5 ? "M" : "F";
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
      // Keep tile identity: open dialogs and combat callbacks can still reference it.
      t.feature=t.feature || null; t.entity=t.entity || null; t.settlementBuilding=t.settlementBuilding || null;
      g.map[y][x] = t;
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
      {label:"Reset", primary:true, action:()=>{ clearSaves(); closeModal(); startNewRun(); }}
    ]
  });
}
