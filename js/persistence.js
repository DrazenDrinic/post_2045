"use strict";

// ------------------------- SAVE / LOAD ------------------------------

let _saveFailed = false;
function save(){
  try{
    normalizeGame(G);
    pruneChunks(G);
    // assign ids to survivors that lack them
    for (const s of G.survivors){ if (s.id===undefined) s.id = G.nextSurvId++; }
    // The live cache is disposable. Persist only seed, exploration and tile deltas.
    const snapshot = Object.assign({}, G);
    delete snapshot.chunks;
    snapshot.chunkChanges = packChunkChanges(G.chunkChanges);
    snapshot.exploredChunks = packExplored(G.explored);
    delete snapshot.explored;
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    _saveFailed = false;
    return true;
  }catch(e){
    console.warn("Save failed", e);
    if (!_saveFailed && G) pushLog(G,"Save failed. Browser storage may be full or unavailable; your latest progress has not been saved.","bad");
    _saveFailed = true;
    return false;
  }
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
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid save data");
    normalizeGame(parsed);
    G = parsed;
    if (migrated) save();
    return true;
  }catch(e){ console.warn("Load failed", e); return null; }
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
  if (!Number.isFinite(g.seed)) g.seed = Math.floor(Math.random()*1e9);
  if (g.phaseMinutes==null) g.phaseMinutes = 0;
  g.phaseMinutes = clamp(g.phaseMinutes, 0, 359);
  if (!g.explored || typeof g.explored!=="object" || Array.isArray(g.explored)) g.explored = {};
  if (g.exploredChunks){
    unpackExplored(g.exploredChunks,g.explored);
    delete g.exploredChunks;
  }
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
  if (!Number.isSafeInteger(g.villageX)) g.villageX = 0;
  if (!Number.isSafeInteger(g.villageY)) g.villageY = 0;
  if (!Number.isSafeInteger(g.playerX)) g.playerX = g.villageX;
  if (!Number.isSafeInteger(g.playerY)) g.playerY = g.villageY;
  normalizeWorld(g);
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
  for (const key of ["camps","caches","workSites","markers","orders","reserves","scoutCooldowns","undergroundCooldowns","sourceStocks","traderOffers"]){
    if (!g[key] || typeof g[key]!=="object" || Array.isArray(g[key])) g[key] = {};
  }
  if (!Array.isArray(g.farms)) g.farms = [];
  for(const [key,state] of Object.entries(g.sourceStocks)){
    if(!state || typeof state.stock!=="object" || !state.stock || Array.isArray(state.stock)){ delete g.sourceStocks[key];continue; }
    state.refillAt=Number.isFinite(state.refillAt)?Math.max(0,state.refillAt):0;
    for(const k of Object.keys(state.stock)) if(!RESOURCES[k] || !Number.isFinite(state.stock[k]) || state.stock[k]<0) delete state.stock[k];
  }
  for(const site of Object.values(g.workSites)) if(site && site.kind!=="outpost") delete site.remaining;
  for(const [key,offer] of Object.entries(g.traderOffers)){
    if(!offer || ![offer.give,offer.get].every(values=>values && typeof values==="object" && Object.entries(values).length && Object.entries(values).every(([k,v])=>RESOURCES[k] && Number.isFinite(v) && v>0))) delete g.traderOffers[key];
  }
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
  if (g.chunks){
    for (const id of ["garden","crop_field","greenhouse"]){
      if (!g.farms.some(f=>f.building===id)) continue;
      const tiles=[];
      for (let y=g.villageY-7; y<=g.villageY+7; y++)
        for (let x=g.villageX-10; x<=g.villageX+10; x++)
          if (tileAt(g, x, y).settlementBuilding===id) tiles.push({x,y});
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
    pushLog(g,"Expedition supplies are carried in your pack. Base stock stays at home; transfer supplies beside the campfire or a storage building.","info");
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

function normalizeWorldTile(t){
  if (!t || typeof t !== "object" || Array.isArray(t)) t = {};
  if (!BIOMES[t.biome]) t.biome = "plains";
  if (t.feature && !MAP_FEATURES[t.feature.type]) t.feature = null;
  if (t.feature && !Number.isFinite(t.feature.charges)) t.feature.charges = MAP_FEATURES[t.feature.type].charges;
  if (t.entity && !MAP_ENTITIES[t.entity.type]) t.entity = null;
  if (t.settlementBuilding && !BUILDINGS[t.settlementBuilding]) t.settlementBuilding = null;
  t.feature=t.feature || null; t.entity=t.entity || null; t.settlementBuilding=t.settlementBuilding || null;
  return t;
}

function validChunkKey(key){
  const xy = key.split(",").map(Number);
  return xy.length===2 && xy.every(Number.isSafeInteger) && chunkKey(...xy)===key
    && inBounds(xy[0]*CHUNK,xy[1]*CHUNK) && inBounds(xy[0]*CHUNK+CHUNK-1,xy[1]*CHUNK+CHUNK-1);
}

// Many changed tiles (especially migrated fixed maps) have identical state.
// A small per-chunk palette avoids repeating the same tile object hundreds of
// times and leaves room for the original legacy save during migration.
const _packedChanges = new WeakMap();
function packChunkChanges(chunks){
  const packed = {};
  for (const [key,changes] of Object.entries(chunks)){
    let record = _packedChanges.get(changes);
    if (!record){
      record = {tiles:[],cells:{}};
      const lookup = new Map();
      for (const [index,tile] of Object.entries(changes)){
        const text=JSON.stringify(tile);
        if (!lookup.has(text)){
          lookup.set(text,record.tiles.length);
          record.tiles.push(tile);
        }
        record.cells[index]=lookup.get(text);
      }
      _packedChanges.set(changes,record);
    }
    packed[key]=record;
  }
  return packed;
}

// Four explored tiles per hex digit: a fully explored 20x20 chunk takes 100
// characters rather than 400 repeated world-coordinate keys. Runtime lookups
// still use the existing explored dictionary.
function packExplored(explored){
  const masks = {};
  for (const key of Object.keys(explored)){
    if (!explored[key]) continue;
    const xy=key.split(",").map(Number);
    if (xy.length!==2 || !inBounds(...xy)) continue;
    const [x,y]=xy, cx=Math.floor(x/CHUNK), cy=Math.floor(y/CHUNK);
    const ck=chunkKey(cx,cy), index=(y-cy*CHUNK)*CHUNK+x-cx*CHUNK;
    const mask=masks[ck] || (masks[ck]=new Uint8Array(Math.ceil(CHUNK*CHUNK/4)));
    mask[Math.floor(index/4)] |= 1<<(index%4);
  }
  const packed={};
  for (const [key,mask] of Object.entries(masks)) packed[key]=Array.from(mask,n=>n.toString(16)).join("");
  return packed;
}

function unpackExplored(packed,explored){
  for (const [key,mask] of Object.entries(packed)){
    if (!validChunkKey(key) || typeof mask!=="string" || mask.length!==Math.ceil(CHUNK*CHUNK/4) || !/^[0-9a-f]+$/.test(mask)) continue;
    const [cx,cy]=key.split(",").map(Number);
    for (let i=0; i<CHUNK*CHUNK; i++){
      if (parseInt(mask[Math.floor(i/4)],16) & (1<<(i%4)))
        explored[(cx*CHUNK+i%CHUNK)+","+(cy*CHUNK+Math.floor(i/CHUNK))]=true;
    }
  }
}

const _normalizedWorlds = new WeakSet();
function normalizeWorld(g){
  if (_normalizedWorlds.has(g)) return;
  if (g.worldVersion!=null && g.worldVersion!==WORLD_VERSION) throw new Error("Unsupported world generator version");
  if (g.chunkSize!=null && g.chunkSize!==CHUNK) throw new Error("Unsupported world chunk size");
  const hadWorld = Array.isArray(g.map) || g.chunks || g.chunkChanges || g.worldVersion!=null;
  g.worldVersion = WORLD_VERSION;
  g.chunkSize = CHUNK;
  if (!g.chunkChanges || typeof g.chunkChanges!=="object" || Array.isArray(g.chunkChanges)) g.chunkChanges = {};
  for (const [key,changes] of Object.entries(g.chunkChanges)){
    if (!validChunkKey(key) || !changes || typeof changes!=="object" || Array.isArray(changes)){
      delete g.chunkChanges[key]; continue;
    }
    // Earlier delta saves stored full tile objects directly; accept both forms.
    let tiles=changes;
    if (Array.isArray(changes.tiles) && changes.cells && typeof changes.cells==="object"){
      tiles={};
      for (const [index,id] of Object.entries(changes.cells)){
        if (Number.isInteger(id) && id>=0 && id<changes.tiles.length)
          tiles[index]=JSON.parse(JSON.stringify(changes.tiles[id]));
      }
      g.chunkChanges[key]=tiles;
    }
    for (const [index,tile] of Object.entries(tiles)){
      const i=Number(index);
      if (!Number.isInteger(i) || i<0 || i>=CHUNK*CHUNK || String(i)!==index){ delete tiles[index]; continue; }
      tiles[index] = normalizeWorldTile(tile);
    }
  }
  if (!g.chunks || typeof g.chunks!=="object" || Array.isArray(g.chunks)) g.chunks = {};
  // Accept saves made by the earlier full-chunk implementation as well.
  for (const key of Object.keys(g.chunks)){
    const c=g.chunks[key];
    if (!validChunkKey(key) || !Array.isArray(c)){ delete g.chunks[key]; continue; }
    const [cx,cy]=key.split(",").map(Number);
    let reference;
    for (let y=0; y<CHUNK; y++){
      if (!Array.isArray(c[y])) c[y]=[];
      for (let x=0; x<CHUNK; x++){
        if (!c[y][x]){
          reference = reference || generateChunk(g,cx,cy);
          c[y][x] = reference[y][x];
        }
        c[y][x]=normalizeWorldTile(c[y][x]);
      }
      c[y].length=CHUNK;
    }
    c.length=CHUNK;
  }
  // Preserve every old fixed-map tile, including unrevealed terrain, depletion,
  // buildings and NPCs. Coordinates of camps, farms and markers stay unchanged.
  if (Array.isArray(g.map)){
    for (let y=0; y<g.map.length; y++){
      if (!Array.isArray(g.map[y])) continue;
      for (let x=0; x<g.map[y].length; x++){
        if (!g.map[y][x]) continue;
        const c=getChunk(g,Math.floor(x/CHUNK),Math.floor(y/CHUNK));
        c[y%CHUNK][x%CHUNK]=normalizeWorldTile(g.map[y][x]);
      }
    }
    delete g.map;
  }
  if (!hadWorld) generateMap(g);
  tileAt(g,g.villageX,g.villageY).settlementBuilding = "campfire";
  pruneChunks(g);
  _normalizedWorlds.add(g);
}

// Compare only the bounded live cache, using a baseline generated once per load.
// Entire tile state is compared so future entity/feature fields are preserved too.
function captureChunkChanges(g,key){
  const c=g.chunks[key];
  if (!_chunkBaselines.has(c)){
    const [cx,cy]=key.split(",").map(Number);
    const ref=generateChunk(g,cx,cy);
    _chunkBaselines.set(c,ref.map(row=>row.map(t=>JSON.stringify(t))));
  }
  const baseline=_chunkBaselines.get(c), changes={};
  for (let y=0; y<CHUNK; y++) for (let x=0; x<CHUNK; x++){
    const text=JSON.stringify(c[y][x]);
    if (text!==baseline[y][x]) changes[y*CHUNK+x]=JSON.parse(text);
  }
  if (Object.keys(changes).length) g.chunkChanges[key]=changes;
  else delete g.chunkChanges[key];
}

function pruneChunks(g){
  for (const key of Object.keys(g.chunks)){
    captureChunkChanges(g,key);
    const [cx,cy]=key.split(",").map(Number);
    if (!chunkIsPinned(g,cx,cy)) delete g.chunks[key];
  }
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
