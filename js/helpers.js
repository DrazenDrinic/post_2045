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
  const before = g.resources[key] || 0;
  g.resources[key] = amount>=0 ? before+Math.min(amount,Math.max(0,cap-before)) : Math.max(0,before+amount);
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
  if (j.site && !Object.values(g.workSites || {}).some(s=>s.kind===j.site && s.remaining>0)) return false;
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

// ---- Worker / plot helpers (direct in-place assignment & farming) ----------
// Preferred trait per building, mirroring the bonus rules in workerJobBonus/getJobBonus.
const BUILDING_TRAIT = {
  garden:"farmer", crop_field:"farmer", greenhouse:"farmer", animal_stable:"farmer",
  chicken_coop:"farmer", goat_pen:"farmer",
  clinic:"medic", herbalist:"medic", medicine_workshop:"medic",
  hunting_lodge:"hunter",
  workshop:"builder", toolsmith:"builder", forge:"builder", carpenter:"builder",
  sawmill:"builder", crafting_table:"builder", furnace:"builder",
  mechanics_shed:"mechanic", repair_station:"mechanic",
  kitchen:"cook", smokehouse:"cook", brewery:"cook",
  guard_post:"guard", watchtower:"guard", barracks:"guard", training_yard:"guard", scout_camp:"guard",
  school:"teacher", library:"teacher",
};
function jobsForBuilding(id){ return JOB_KEYS.filter(k=>JOBS[k].building===id); }
function jobPreferredTrait(jobKey){ const j=JOBS[jobKey]; return j && j.building ? BUILDING_TRAIT[j.building] : null; }
function freeWorkers(g){ return adults(g).filter(s=>!s.isPlayer && !s.isChild && s.health>0 && (!g.jobs[s.id] || g.jobs[s.id]==="none")); }
function eligibleWorkers(g, jobKey){
  const pref=jobPreferredTrait(jobKey);
  return adults(g).filter(s=>!s.isPlayer && !s.isChild && s.health>0)
    .map(s=>({s, free:(!g.jobs[s.id] || g.jobs[s.id]==="none"), match:!!(pref && s.traits.includes(pref))}))
    .sort((a,b)=> (b.free-a.free) || (b.match-a.match) || a.s.name.localeCompare(b.s.name));
}
function bestWorkerFor(g, jobKey){
  const free=freeWorkers(g); if(!free.length) return null;
  const pref=jobPreferredTrait(jobKey);
  let best=null, score=-Infinity;
  for(const s of free){
    let sc=0;
    if(pref && s.traits.includes(pref)) sc+=2;
    if(s.traits.includes("hardworking")) sc+=1;
    if(s.traits.includes("lazy")) sc-=1;
    if(s.health>=50) sc+=0.1;
    if(sc>score){ score=sc; best=s; }
  }
  return best;
}
function openSlots(g, id){
  const b=BUILDINGS[id]; if(!b || !b.workers) return 0;
  return b.workers*(g.buildings[id]?.count || 0) - (g.workerAssign[id]||[]).length;
}
function farmAt(g, x, y){ return (g.farms||[]).find(f=>f.x===x && f.y===y) || null; }
function farmPlotAdjacent(g, f){ return !!f && f.x!=null && Math.max(Math.abs(g.playerX-f.x), Math.abs(g.playerY-f.y))<=1; }

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

function atSettlement(g){ return inSettlementBuildArea(g, g.playerX, g.playerY); }
function positionKey(g){ return g.playerX+","+g.playerY; }
function gameMinutes(g){ return ((g.day-1)*4 + g.phase)*360 + (g.phaseMinutes || 0); }
function isNight(g){ const h = (6 + gameMinutes(g)/60)%24; return h>=20 || h<6; }
function nightMinutesDuring(g,minutes){
  let clock=(360+gameMinutes(g))%1440,remaining=minutes,dark=0;
  while(remaining>0){
    const night=clock<360 || clock>=1200;
    const boundary=clock<360?360:clock<1200?1200:1440;
    const step=Math.min(remaining,boundary-clock);
    if(night) dark+=step;
    remaining-=step;clock=(clock+step)%1440;
  }
  return dark;
}
function timeText(minutes){ return minutes>=60 ? `${fmt(minutes/60)}h` : `${Math.round(minutes)}m`; }
function weatherLabel(type){ return ({clear:"Clear", rain:"Rain", cold:"Cold"})[type] || "Clear"; }
function resourceWeight(key){ return RESOURCE_WEIGHTS[key] ?? 0.3; }
function equippedItem(g, slot){
  return (g.inventory?.gear || []).find(i=>i.id===g.equipment?.[slot] && (i.durability==null || i.durability>0)) || null;
}
function carriedTool(g, kind){
  return (g.inventory?.gear || []).filter(i=>ITEMS[i.type]?.kind===kind && (i.durability==null || i.durability>0))
    .sort((a,b)=>(ITEMS[b.type].tier || ITEMS[b.type].vision || 1)-(ITEMS[a.type].tier || ITEMS[a.type].vision || 1))[0] || null;
}
function packCapacity(g){ return ITEMS[equippedItem(g,"pack")?.type]?.capacity || 30; }
function packWeight(g){
  return Object.entries(g.inventory?.resources || {}).reduce((sum,[k,v])=>sum+v*resourceWeight(k),0)
    + (g.inventory?.gear || []).reduce((sum,i)=>sum+(ITEMS[i.type]?.weight || 0),0);
}
function playerAmount(g, key){
  return (g.inventory?.resources[key] || 0) + (atSettlement(g) ? (g.resources[key] || 0) : 0);
}
function playerCanPay(g, cost){ return Object.entries(cost).every(([k,v])=>playerAmount(g,k)+1e-8>=v); }
function playerPay(g, cost){
  if (!playerCanPay(g,cost)) return false;
  for (const [k,v] of Object.entries(cost)){
    // Preserve packed rations when working at home.
    const fromTown = atSettlement(g) ? Math.min(g.resources[k] || 0,v) : 0;
    g.resources[k] = (g.resources[k] || 0)-fromTown;
    const fromBag = v-fromTown;
    g.inventory.resources[k] = Math.max(0,(g.inventory.resources[k] || 0)-fromBag);
  }
  return true;
}
function cacheAt(g, key=positionKey(g)){
  if (!g.caches[key]) g.caches[key] = {resources:{},gear:[]};
  return g.caches[key];
}
function addCarried(g, key, amount, leaveOverflow=true){
  const space = Math.max(0,packCapacity(g)-packWeight(g));
  const got = Math.min(amount,Math.floor((space/resourceWeight(key)+1e-8)*1000)/1000);
  g.inventory.resources[key] = (g.inventory.resources[key] || 0)+got;
  if (leaveOverflow && amount-got>0.001){
    const cache = cacheAt(g);
    cache.resources[key] = (cache.resources[key] || 0)+amount-got;
    pushLog(g, `${fmt(amount-got)} ${RESOURCES[key].name} left in a cache here (pack full).`, "warn");
  }
  return got;
}
function addPlayerResource(g,key,amount){ return atSettlement(g) ? addResource(g,key,amount) : addCarried(g,key,amount); }
function makeItem(g,type){
  const item = {id:g.nextItemId++,type};
  if (ITEMS[type].durability) item.durability = ITEMS[type].durability;
  return item;
}
function giveItem(g,type,town=false){
  const item = makeItem(g,type);
  if (town) g.townGear.push(item);
  else if (packWeight(g)+ITEMS[type].weight <= packCapacity(g)) g.inventory.gear.push(item);
  else { cacheAt(g).gear.push(item); pushLog(g, `${ITEMS[type].name} left in the cache here.`, "warn"); }
  return item;
}
function wearTool(g,item,amount=1){
  if (!item || item.durability==null) return;
  const before = item.durability;
  item.durability = Math.max(0,before-amount);
  if (before>0 && item.durability===0) pushLog(g, `${ITEMS[item.type].name} needs repair.`, "warn");
}
function actionMinutes(g,key){
  let n = ACTION_COSTS[key] || 0;
  const kind = ({chop_wood:"axe",mine:"pick",dig:"shovel"})[key];
  const tool = kind && carriedTool(g,kind);
  if (tool) n *= Math.max(0.45,1-(ITEMS[tool.type].tier || 1)*0.15);
  return Math.round(n);
}
function hasStation(g, station, worker=false){
  if (!station) return true;
  if (station==="fire") return worker ? !!g.buildings.campfire?.count : !!nearbyFire(g);
  const choices = station==="crafting_table" ? [station,"workshop"] : station==="furnace" ? [station,"forge"] : [station];
  return (worker || atSettlement(g)) && choices.some(id=>g.buildings[id]?.count>0);
}
function recipeName(id){ const r = RECIPES[id]; return r.name || ITEMS[r.item]?.name || id; }
function recipeBlocker(g,id,worker=false){
  const r = RECIPES[id];
  if (!r) return "Unknown recipe.";
  if (!worker && (g.survivors[0].health<=0 || _combat)) return "Cannot craft during combat or while down.";
  if (r.tech && !g.knownNodes[r.tech]) return "Research "+(KNOWLEDGE.find(n=>n.id===r.tech)?.name || r.tech)+".";
  if (!hasStation(g,r.station,worker)) return "Need "+(BUILDINGS[r.station]?.name || "a nearby fire")+".";
  if (!(worker ? canPay(g,r.cost) : playerCanPay(g,r.cost))) return "Missing ingredients.";
  if (!worker && g.survivors[0].energy<1) return "Rest first.";
  return "";
}
function recipeOutput(g,id,worker=false){
  const r = RECIPES[id];
  if (r.item) giveItem(g,r.item,worker);
  for (const [k,v] of Object.entries(r.output || {})) worker ? addResource(g,k,v) : addPlayerResource(g,k,v);
}
function recipeMinutes(g,id){
  const r=RECIPES[id];
  return id==="planks" && carriedTool(g,"saw") ? Math.round(r.minutes*0.6) : r.minutes;
}
function resourceCap(g,key){ return ["food","crops","meat"].includes(key) ? foodStorageCap(g) : totalStorageCap(g); }
function productionStock(g,key){ return Math.max(0,(g.resources[key] || 0)-(g.reserves?.[key] || 0)); }
function productionWorkers(g,id){
  const slots = (BUILDINGS[id]?.workers || 0)*(g.buildings[id]?.count || 0);
  return (g.workerAssign[id] || []).filter(sid=>{
    const s = survivorById(g,sid);
    return s && !s.isPlayer && !s.isChild && s.health>0 && JOBS[g.jobs[sid]]?.building===id;
  }).slice(0,slots);
}
function buildingMinutes(g,id){
  const b = BUILDINGS[id];
  let n = ["tent","crafting_table","garden","rain_barrel"].includes(id) ? 45 :
    ["warehouse","town_hall","barracks","community_hall"].includes(id) ? 480 : b.effects?.housing ? 180 : 120;
  if (carriedTool(g,"hammer")) n *= 0.8;
  return Math.round(n);
}
function compassLabel(g){
  if (!carriedTool(g,"compass")) return "Carry a compass to see your home bearing.";
  const dx=g.villageX-g.playerX, dy=g.villageY-g.playerY;
  if (!dx && !dy) return "Home: you are at the campfire.";
  const dir = ["E","SE","S","SW","W","NW","N","NE"][(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];
  const arrow = ["\u2192","\u2198","\u2193","\u2199","\u2190","\u2196","\u2191","\u2197"][(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];
  return `Home ${arrow} ${dir} · ${Math.abs(dx)+Math.abs(dy)} tiles minimum`;
}

function workplaceRecipes(bid){
  const stations={crafting_table:[null,"crafting_table"],workshop:[null,"crafting_table","workshop"],furnace:["furnace"],forge:["forge","furnace"],charcoal_kiln:["charcoal_kiln"],kitchen:["fire"],toolsmith:["forge","workshop"]};
  if(!stations[bid]) return [];
  return Object.keys(RECIPES).filter(id=>stations[bid].includes(RECIPES[id].station || null));
}
