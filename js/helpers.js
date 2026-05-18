"use strict";

// ------------------------- HELPERS ------------------------------

let _seed = 12345;
function srand(s){ _seed = s|0 || 12345; }
function rng(){
  // xorshift for reproducible-ish randomness, but Math.random for most calls
  return Math.random();
}
function pick(arr){ return arr[Math.floor(rng()*arr.length)]; }
function rint(min,max){ return min + Math.floor(rng()*(max-min+1)); }
function chance(p){ return rng() < p; }
function clamp(x,lo,hi){ return Math.max(lo, Math.min(hi,x)); }
function fmt(n){ return (Math.round(n*10)/10).toString(); }

function pushLog(g, msg, type="info"){
  if (type==="dim") type = "info";
  g.log.unshift({day:g.day, phase:g.phase, msg, type});
  if (g.log.length > 200) g.log.length = 200;
}

function totalStorageCap(g){
  let cap = BASE_RES_CAP;
  for (const id in g.buildings){
    const b = BUILDINGS[id]; if (!b) continue;
    const eff = b.effects || {};
    if (eff.storage) cap += eff.storage * g.buildings[id].count;
  }
  return cap;
}

function foodStorageCap(g){
  let cap = totalStorageCap(g);
  for (const id in g.buildings){
    const b = BUILDINGS[id]; if (!b) continue;
    const eff = b.effects || {};
    if (eff.food_storage) cap += eff.food_storage * g.buildings[id].count;
  }
  return cap;
}

function addResource(g, key, amount){
  const cap = (key==="food"||key==="crops"||key==="meat") ? foodStorageCap(g) : totalStorageCap(g);
  const before = g.resources[key];
  g.resources[key] = clamp(g.resources[key] + amount, 0, cap);
  return g.resources[key] - before;
}

function initTown(g){
  g.town = [];
  for (let y=0; y<TOWN_H; y++){
    const row = [];
    for (let x=0; x<TOWN_W; x++) row.push(null);
    g.town.push(row);
  }
  const cx = Math.floor(TOWN_W/2), cy = Math.floor(TOWN_H/2);
  g.town[cy][cx] = {building:"campfire"};
}

function townBuildingCount(g, id){
  if (!g.town) return 0;
  let n = 0;
  for (let y=0; y<TOWN_H; y++) for (let x=0; x<TOWN_W; x++){
    if (g.town[y]?.[x]?.building === id) n++;
  }
  return n;
}

function placeTownBuilding(g, id, x, y){
  if (!g.town || !inTownBounds(x,y) || g.town[y][x]) return false;
  g.town[y][x] = {building:id};
  return true;
}

function inTownBounds(x,y){ return x>=0 && y>=0 && x<TOWN_W && y<TOWN_H; }

function canPay(g, cost){
  for (const k in cost){ if ((g.resources[k]||0) < cost[k]) return false; }
  return true;
}
function pay(g, cost){
  for (const k in cost){ g.resources[k] -= cost[k]; }
}
function costString(cost, g=null){
  return Object.entries(cost).map(([k,v])=>{
    const text = `${RESOURCES[k]?.icon||""}${v} ${RESOURCES[k]?.name||k}`;
    return g && (g.resources[k]||0) < v ? `<span class="bad">${text}</span>` : text;
  }).join(", ");
}

function getHousing(g){
  let cap = 1; // campfire houses 1 minimally
  for (const id in g.buildings){
    const b = BUILDINGS[id]; if (!b) continue;
    const eff = b.effects || {};
    if (eff.housing) cap += eff.housing * g.buildings[id].count;
  }
  return cap;
}

function adults(g){ return g.survivors.filter(s=>!s.isChild); }
function children(g){ return g.survivors.filter(s=>s.isChild); }
function workforce(g){ return adults(g).filter(s=>s.health>0); }
function nonPlayerAdults(g){ return adults(g).filter(s=>!s.isPlayer); }

function survivorById(g,id){ return g.survivors.find(s=>s.id===id); }

function workersAt(g, bid){
  return (g.workerAssign[bid] || []).map(id=>survivorById(g,id)).filter(Boolean);
}

function isUnlocked(g, buildingId){
  if (STARTER_BUILDINGS.has(buildingId)) return true;
  for (const node of KNOWLEDGE){
    if (g.knownNodes[node.id]) continue;
    const ub = node.unlock?.buildings || [];
    if (ub.includes(buildingId)) {
      // not yet unlocked
    }
  }
  // Check all nodes; building is unlocked if at least one unlocked node grants it
  for (const node of KNOWLEDGE){
    if (!g.knownNodes[node.id]) continue;
    const ub = node.unlock?.buildings || [];
    if (ub.includes(buildingId)) return true;
  }
  return false;
}

function jobAvailable(g, jobKey){
  if (jobKey==="none") return true;
  const j = JOBS[jobKey];
  if (!j) return false;
  if (j.building){
    if (!g.buildings[j.building]) return false;
    // Count workers vs slots
    const built = g.buildings[j.building].count;
    const slots = (BUILDINGS[j.building].workers || 0) * built;
    const used = (g.workerAssign[j.building] || []).length;
    return used < slots;
  }
  return true;
}

function settlementDanger(g){
  let d = 0;
  d += g.survivors.length * 1.2;
  d += Object.values(g.buildings).reduce((a,b)=>a+b.count,0) * 0.4;
  let stored = 0; for (const k in g.resources) stored += g.resources[k];
  d += stored * 0.005;
  d += g.reputation * 0.1;
  // Reduce by defenses
  let walls = 0, guards = 0, danger_reduce=0;
  for (const id in g.buildings){
    const b = BUILDINGS[id]; if (!b) continue;
    const eff = b.effects || {};
    if (eff.wall) walls += eff.wall * g.buildings[id].count;
    if (eff.danger_reduce) danger_reduce += eff.danger_reduce * g.buildings[id].count;
    if (eff.safety_per_worker) guards += eff.safety_per_worker * (g.workerAssign[id]?.length || 0);
  }
  d -= walls * 0.15;
  d -= guards * 0.3;
  d -= danger_reduce;
  return Math.max(0, Math.round(d));
}

function settlementSafety(g){
  let s = 30;
  for (const id in g.buildings){
    const b = BUILDINGS[id]; if (!b) continue;
    const eff = b.effects || {};
    if (eff.safety_per_worker) s += eff.safety_per_worker * (g.workerAssign[id]?.length || 0);
    if (eff.wall) s += eff.wall * 0.5 * g.buildings[id].count;
  }
  s -= settlementDanger(g) * 0.6;
  return clamp(Math.round(s),0,100);
}
