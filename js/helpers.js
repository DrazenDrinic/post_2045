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
  const before = g.resources[key] || 0;
  g.resources[key] = amount>=0 ? before+Math.min(amount,storageRoom(g,key)) : Math.max(0,before+amount);
  return g.resources[key] - before;
}

function foodResource(key){ return ["food","crops","meat"].includes(key); }
function storageUsage(g,resources=g.resources,gear=g.townGear || []){
  let general=gear.reduce((n,i)=>n+(ITEMS[i.type]?.weight || 0),0),food=0;
  for(const [k,v] of Object.entries(resources)){
    if(foodResource(k)) food+=v*resourceWeight(k); else general+=v*resourceWeight(k);
  }
  const cellar=foodStorageCap(g)-totalStorageCap(g);
  return {general:general+Math.max(0,food-cellar),food:Math.min(food,cellar),total:general+food,cellar};
}
function storageRoom(g,key){
  const u=storageUsage(g),free=Math.max(0,totalStorageCap(g)-u.general);
  if(u.general>totalStorageCap(g)+1e-8) return 0;
  return (free+(foodResource(key)?Math.max(0,u.cellar-u.food):0))/resourceWeight(key);
}
function storageFits(g,output={},cost={},item=null){
  const resources={...g.resources};
  for(const [k,v] of Object.entries(cost)) resources[k]=Math.max(0,(resources[k]||0)-v);
  for(const [k,v] of Object.entries(output)) resources[k]=(resources[k]||0)+v;
  const gear=item?[...(g.townGear||[]),{type:item}]:(g.townGear||[]);
  return storageUsage(g,resources,gear).general<=totalStorageCap(g)+1e-8;
}
function storageAccess(g){
  if(Math.max(Math.abs(g.playerX-g.villageX),Math.abs(g.playerY-g.villageY))<=1) return true;
  return !!nearbySettlementBuilding(g,(b,id)=>id==="campfire" || b.effects?.storage || b.effects?.food_storage);
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
  if (j.site && !Object.values(g.workSites || {}).some(s=>s.kind===j.site)) return false;
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
function liquidAmount(g){ return (g.inventory?.resources.water||0)+(g.inventory?.resources.dirty_water||0); }
function liquidCapacity(g){ return BASE_LIQUID_CAP+(g.inventory?.gear||[]).reduce((n,i)=>n+(ITEMS[i.type]?.liquidCapacity||0),0); }
function carryRoom(g,key){
  const room=Math.max(0,packCapacity(g)-packWeight(g))/resourceWeight(key);
  return Math.max(0,Math.min(room,["water","dirty_water"].includes(key)?liquidCapacity(g)-liquidAmount(g):Infinity));
}
function playerOutputFits(g,output={},cost={},item=null){
  const resources={...g.inventory.resources};
  for(const [k,v] of Object.entries(cost)) resources[k]=Math.max(0,(resources[k]||0)-Math.max(0,v-(storageAccess(g)?g.resources[k]||0:0)));
  for(const [k,v] of Object.entries(output)) resources[k]=(resources[k]||0)+v;
  const weight=Object.entries(resources).reduce((n,[k,v])=>n+v*resourceWeight(k),0)+(g.inventory.gear||[]).reduce((n,i)=>n+ITEMS[i.type].weight,0)+(item?ITEMS[item].weight:0);
  return weight<=packCapacity(g)+1e-8 && (resources.water||0)+(resources.dirty_water||0)<=liquidCapacity(g)+(item?ITEMS[item].liquidCapacity||0:0)+1e-8;
}
function playerAmount(g, key){
  return (g.inventory?.resources[key] || 0) + (storageAccess(g) ? (g.resources[key] || 0) : 0);
}
function playerCanPay(g, cost){ return Object.entries(cost).every(([k,v])=>playerAmount(g,k)+1e-8>=v); }
function playerPay(g, cost){
  if (!playerCanPay(g,cost)) return false;
  for (const [k,v] of Object.entries(cost)){
    // Preserve packed rations when working at home.
    const fromTown = storageAccess(g) ? Math.min(g.resources[k] || 0,v) : 0;
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
  if(!Number.isFinite(amount) || amount<=0) return 0;
  const got = Math.min(amount,Math.floor((carryRoom(g,key)+1e-8)*1000)/1000);
  g.inventory.resources[key] = (g.inventory.resources[key] || 0)+got;
  if (leaveOverflow && amount-got>0.001){
    const cache = cacheAt(g);
    cache.resources[key] = (cache.resources[key] || 0)+amount-got;
    pushLog(g, `${fmt(amount-got)} ${RESOURCES[key].name} left in a cache here (pack full).`, "warn");
  }
  return got;
}
function addPlayerResource(g,key,amount){ return addCarried(g,key,amount); }
function grantSourceLoot(g,key,amount,x,y){
  const got=addCarried(g,key,amount,false),left=amount-got;
  if(left>0.001){
    const cache=cacheAt(g,`${x},${y}`);cache.resources[key]=(cache.resources[key]||0)+left;
    pushLog(g,`${fmt(left)} ${RESOURCES[key].name} remain at (${x}, ${y}).`,"warn");
  }
  return got;
}
function makeItem(g,type){
  const item = {id:g.nextItemId++,type};
  if (ITEMS[type].durability) item.durability = ITEMS[type].durability;
  return item;
}
function giveItem(g,type,town=false){
  const item = makeItem(g,type);
  if (town && storageFits(g,{}, {},type)) g.townGear.push(item);
  else if(town) return null;
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
  if (!(worker ? storageFits(g,r.output,r.cost,r.item) : playerOutputFits(g,r.output,r.cost,r.item))) return worker ? "Base storage full." : "Free pack or water-container space before crafting.";
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
// Reserves live outside the disposable chunk cache, keyed by location and resource family.
function resourceFamily(key){
  for(const [family,rule] of Object.entries(SOURCE_RULES)) if(key in rule.stock) return family;
  return "salvage";
}
function sourceAt(g,x,y,family){
  const tile=tileAt(g,x,y),feature=MAP_FEATURES[tile.feature?.type];
  const rule=SOURCE_RULES[family],stock={...rule.stock};
  for(const [k,range] of Object.entries(feature?.loot||{})){
    if(resourceFamily(k)===family && !(k in stock)) stock[k]=Math.max(1,range[1]*4);
  }
  const area=family==="wildlife"?`${Math.floor(x/8)},${Math.floor(y/8)}:wildlife-area`:`${x},${y}:${family}`;
  return {key:area,x,y,family,stock,minutes:rule.minutes,label:family==="wildlife"?rule.name:feature?.name || rule.name};
}
function sourceState(g,source){
  if(!g.sourceStocks) g.sourceStocks={};
  let state=g.sourceStocks[source.key];
  if(!state || state.refillAt && state.refillAt<=gameMinutes(g)){
    state={stock:{...source.stock},refillAt:0};
  }
  return state;
}
function sourceRemaining(g,source,key){
  const state=sourceState(g,source);
  return state.stock[key] ?? source.stock[key] ?? SOURCE_DEFAULT_STOCK;
}
function spendSource(g,source,key,amount){
  const before=sourceRemaining(g,source,key),state=sourceState(g,source);
  state.stock[key]=Math.max(0,before-amount);
  if(amount>0 && !state.refillAt) state.refillAt=gameMinutes(g)+source.minutes;
  g.sourceStocks[source.key]=state;
}
function sourceStatus(g,source,keys=Object.keys(source.stock)){
  const state=sourceState(g,source);
  const amounts=keys.map(k=>`${fmt(sourceRemaining(g,source,k))} ${RESOURCES[k]?.name||k}`);
  const empty=keys.length && keys.every(k=>sourceRemaining(g,source,k)<0.001);
  const low=keys.some(k=>sourceRemaining(g,source,k)<=(source.stock[k]??SOURCE_DEFAULT_STOCK)*0.25);
  const status=empty?(source.family==="water"?"has run dry":"is depleted"):low?"is running low":"has supplies";
  return `${source.label} ${status}: ${amounts.join(", ")}.${state.refillAt?` Replenishes in ${timeText(Math.max(0,state.refillAt-gameMinutes(g)))}.`:""}`;
}
function sourceBlocker(g,source,keys,town=false){
  if(!keys.some(k=>sourceRemaining(g,source,k)>0.001)) return sourceStatus(g,source,keys);
  if(!keys.some(k=>sourceRemaining(g,source,k)>0.001 && (town?storageRoom(g,k):carryRoom(g,k))>=0.001)) return town?"Base storage full.":"Pack or water containers full. Unload supplies first.";
  return "";
}
function collectSource(g,source,wanted,town=false,quiet=false){
  const got={};
  for(const [key,amount] of Object.entries(wanted)){
    const available=Math.min(amount,sourceRemaining(g,source,key));
    const n=town?addResource(g,key,available):addCarried(g,key,available,false);
    if(n>0){ spendSource(g,source,key,n);got[key]=n; }
  }
  if(!quiet){
    const text=Object.entries(got).map(([k,v])=>`${fmt(v)} ${RESOURCES[k].name}`).join(", ");
    pushLog(g,text?`Collected ${text} into your pack.`:sourceBlocker(g,source,Object.keys(wanted),town),text?"good":"warn");
    if(text) pushLog(g,sourceStatus(g,source,Object.keys(wanted)),"info");
  }
  return got;
}
const _workerSourceTiles=new WeakMap();
const _productionStatuses=new WeakMap();
function productionStatuses(g){ if(!_productionStatuses.has(g)) _productionStatuses.set(g,{});return _productionStatuses.get(g); }
function workerSource(g,key,building=null,siteKey=null){
  const family=resourceFamily(key);
  if(siteKey){
    const [x,y]=siteKey.split(",").map(Number);
    const active=Math.max(Math.abs(x-g.villageX),Math.abs(y-g.villageY))<=ACTIVE_MAP_RADIUS || Math.max(Math.abs(x-g.playerX),Math.abs(y-g.playerY))<=ACTIVE_MAP_RADIUS;
    return active && g.explored[siteKey]?sourceAt(g,x,y,family):null;
  }
  // Constructed wells, collectors and animal pens have their own recoverable reserves.
  if(["well","rain_barrel","water_collector","chicken_coop","goat_pen","animal_stable"].includes(building)){
    const rule=SOURCE_RULES[family],count=g.buildings[building]?.count||1;
    return {key:`building:${building}:${family}`,family,minutes:rule.minutes,label:BUILDINGS[building].name,stock:Object.fromEntries(Object.entries(rule.stock).map(([k,v])=>[k,v*count]))};
  }
  let cached=_workerSourceTiles.get(g);
  if(!cached || cached.minute!==gameMinutes(g)){
    const tiles=[];
    for(let dy=-8;dy<=8;dy++) for(let dx=-8;dx<=8;dx++){
      const x=g.villageX+dx,y=g.villageY+dy;
      if(g.explored[`${x},${y}`]) tiles.push({x,y,tile:tileAt(g,x,y),distance:Math.max(Math.abs(dx),Math.abs(dy))});
    }
    tiles.sort((a,b)=>a.distance-b.distance);
    cached={minute:gameMinutes(g),tiles};_workerSourceTiles.set(g,cached);
  }
  let depleted=null;
  for(const {x,y,tile} of cached.tiles){
    const feature=MAP_FEATURES[tile.feature?.type],has=!!feature?.loot?.[key];
    const fits=has || (family==="water" ? tileWaterKind(tile)===(key==="water"?"clean":"dirty") :
      family==="wood" ? ["forest","deep_forest"].includes(tile.biome) :
      family==="forage" ? ["plains","forest","deep_forest","hills"].includes(tile.biome) :
      family==="mineral" ? ["stone","sand","clay"].includes(key) && !BIOMES[tile.biome].blocks :
      family==="wildlife" ? !!MAP_ENTITIES[tile.entity?.type]?.huntable : tile.biome==="ruins");
    if(!fits) continue;
    const animal=family==="wildlife" && MAP_ENTITIES[tile.entity?.type]?.huntable ? tile.entity:null;
    const source=sourceAt(g,animal?.originX??x,animal?.originY??y,family);
    if(!depleted) depleted=source;
    if(sourceRemaining(g,source,key)>0.001) return source;
  }
  return depleted;
}
function productionSources(g,output,building=null,siteKey=null){
  const sources={};
  for(const key of Object.keys(output)) sources[key]=workerSource(g,key,building,siteKey);
  return sources;
}
function productionBlocker(g,output,cost={},sources=null){
  if(Object.keys(output).length && !storageFits(g,output,cost)) return "Base storage full";
  if(sources) for(const [key,n] of Object.entries(output)){
    const source=sources[key];
    if(!source) return `No discovered source of ${RESOURCES[key].name} near home`;
    if(sourceRemaining(g,source,key)+1e-8<n) return sourceStatus(g,source,[key]);
  }
  return "";
}
function commitProduction(g,output,cost={},sources=null){
  pay(g,cost);
  for(const [key,n] of Object.entries(output)){
    const got=addResource(g,key,n);
    if(sources?.[key]) spendSource(g,sources[key],key,got);
  }
}
function resourceCap(g,key){ return (g.resources[key]||0)+storageRoom(g,key); }
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
