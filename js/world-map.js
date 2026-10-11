"use strict";

// ------------------------- MAP / WORLD ------------------------------

// --- Deterministic noise (integer hash -> value noise -> fBm) -----------
function hashInt(x, y, seed){
  let h = Math.imul(x | 0, 0x27d4eb2d);
  h ^= Math.imul(y | 0, 0x165667b1);
  h ^= Math.imul(seed | 0, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}
function hash2(x, y, seed){ return hashInt(x, y, seed) / 4294967296; }

function valueNoise(x, y, seed){
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi,     yi,     seed), b = hash2(xi + 1, yi,     seed);
  const c = hash2(xi,     yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function fbm(x, y, seed, oct){
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++){
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 1013);
    norm += amp; amp *= 0.5; freq *= 2;
  }
  return sum / norm;
}

// Terrain for an arbitrary world coordinate — continuous across chunk borders.
function biomeAt(g, x, y){
  const s = (g.seed | 0) || 1;
  const e = fbm(x / 56, y / 56, s, 4);                       // elevation
  const m = fbm(x / 42 + 500, y / 42 + 500, s + 7777, 3);    // moisture
  const t = fbm(x / 70 + 900, y / 70 + 900, s + 31337, 2);   // temperature

  // Winding rivers and roads drawn as thin ridged-noise bands.
  const rv = fbm(x / 90 + 2000, y / 34 + 2000, s + 555, 3);
  if (Math.abs(rv - 0.5) < 0.006 && e > 0.25 && e < 0.86) return "river";
  const rd = fbm(x / 40 + 4000, y / 110 + 4000, s + 909, 3);
  if (Math.abs(rd - 0.5) < 0.004 && e >= 0.28 && e <= 0.80) return "road";

  if (e < 0.28) return "lake";
  if (e > 0.76) return "mountain";
  if (e > 0.66) return "hills";
  if (fbm(x / 26 + 8000, y / 26 + 8000, s + 4242, 2) > 0.78 && e > 0.35) return "radio";
  if (fbm(x / 30 + 6000, y / 30 + 6000, s + 1212, 2) > 0.76 && e > 0.30 && e < 0.76) return "ruins";
  if (t < 0.24) return "snow";
  if (m > 0.66) return e < 0.45 ? "swamp" : "deep_forest";
  if (m > 0.52) return "forest";
  if (m < 0.38 && t > 0.58) return "desert";
  return "plains";
}

// --- Chunk storage ------------------------------------------------------
function chunkKey(cx, cy){ return cx + "," + cy; }

// Baselines are runtime-only. Cache them once instead of regenerating terrain on
// every autosave. Tiles remain ordinary live objects for existing action callbacks.
const _chunkBaselines = new WeakMap();
function rememberChunkBaseline(c){
  _chunkBaselines.set(c, c.map(row=>row.map(t=>JSON.stringify(t))));
}

function chunkIsPinned(g, cx, cy){
  return [[g.playerX,g.playerY],[g.villageX,g.villageY]].some(([x,y])=>
    Math.abs(cx-Math.floor(x/CHUNK))<=1 && Math.abs(cy-Math.floor(y/CHUNK))<=1);
}

function getChunk(g, cx, cy){
  const key = chunkKey(cx, cy);
  let c = g.chunks[key];
  if (!c){
    // Evict even modified chunks, after recording their deltas. Keep local tile
    // references alive while a modal or combat callback can still use them.
    if (Object.keys(g.chunks).length >= MAX_CACHED_CHUNKS){
      for (const oldKey of Object.keys(g.chunks)){
        const [ox,oy] = oldKey.split(",").map(Number);
        if (chunkIsPinned(g,ox,oy)) continue;
        captureChunkChanges(g,oldKey);
        delete g.chunks[oldKey];
        break;
      }
    }
    c = generateChunk(g, cx, cy);
    rememberChunkBaseline(c);
    for (const [index,tile] of Object.entries(g.chunkChanges?.[key] || {})){
      const i = Number(index);
      c[Math.floor(i/CHUNK)][i%CHUNK] = JSON.parse(JSON.stringify(tile));
    }
    g.chunks[key] = c;
  }
  return c;
}

// Returns the live tile object at any world coordinate, generating its chunk on demand.
function tileAt(g, x, y){
  if (!inBounds(x,y)) throw new RangeError("World tile coordinates must be safe integers");
  const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK);
  const c = getChunk(g, cx, cy);
  return c[y - cy * CHUNK][x - cx * CHUNK];
}

// Per-biome candidate lists for deterministic node placement.
let _featByBiome = null, _entByBiome = null;
function featureKeysByBiome(){
  if (_featByBiome) return _featByBiome;
  _featByBiome = {};
  for (const k in MAP_FEATURES)
    for (const b of MAP_FEATURES[k].biomes) (_featByBiome[b] = _featByBiome[b] || []).push(k);
  return _featByBiome;
}
function entityKeysByBiome(){
  if (_entByBiome) return _entByBiome;
  _entByBiome = {};
  for (const k in MAP_ENTITIES){
    if (MAP_ENTITIES[k].unique) continue;
    for (const b of MAP_ENTITIES[k].biomes || ["plains"]) (_entByBiome[b] = _entByBiome[b] || []).push(k);
  }
  return _entByBiome;
}

const FEATURE_DENSITY = 0.07, ENTITY_DENSITY = 0.03;

function placeNodeInTile(g, tile, x, y){
  if (BIOMES[tile.biome].blocks) return;
  if (Math.abs(x - g.villageX) <= 2 && Math.abs(y - g.villageY) <= 2) return;
  if (hash2(x, y, (g.seed ^ 0x1a2b) >>> 0) < FEATURE_DENSITY){
    const list = featureKeysByBiome()[tile.biome];
    if (list && list.length){
      const k = list[Math.floor(hash2(x, y, (g.seed ^ 0x2b3c) >>> 0) * list.length)];
      const f = MAP_FEATURES[k];
      if (!(f.rare && hash2(x, y, (g.seed ^ 0x3c4d) >>> 0) > 0.2)){ tile.feature = {type:k, charges:f.charges}; return; }
    }
  }
  if (hash2(x, y, (g.seed ^ 0x4d5e) >>> 0) < ENTITY_DENSITY){
    const list = entityKeysByBiome()[tile.biome];
    if (list && list.length){
      const k = list[Math.floor(hash2(x, y, (g.seed ^ 0x5e6f) >>> 0) * list.length)];
      tile.entity = {type:k};
    }
  }
}

function generateChunk(g, cx, cy){
  const tiles = [];
  for (let ly = 0; ly < CHUNK; ly++){
    const row = [];
    for (let lx = 0; lx < CHUNK; lx++)
      row.push({biome:biomeAt(g, cx * CHUNK + lx, cy * CHUNK + ly), feature:null, entity:null, settlementBuilding:null});
    tiles.push(row);
  }
  for (let ly = 0; ly < CHUNK; ly++)
    for (let lx = 0; lx < CHUNK; lx++)
      placeNodeInTile(g, tiles[ly][lx], cx * CHUNK + lx, cy * CHUNK + ly);
  return tiles;
}

function generateMap(g){
  g.chunks = {};
  g.chunkChanges = {};
  g.worldVersion = WORLD_VERSION;
  g.chunkSize = CHUNK;
  g.villageX = 0; g.villageY = 0;
  g.playerX = 0; g.playerY = 0;
  g.explored = {};

  // Clear a calm, buildable home area around the campfire.
  for (let dy = -10; dy <= 10; dy++){
    for (let dx = -12; dx <= 12; dx++){
      const t = tileAt(g, dx, dy);
      t.entity = null; t.feature = null; t.settlementBuilding = null;
      const b = BIOMES[t.biome];
      if (b.blocks || b.hazard || b.radiation || b.cold || b.dry) t.biome = "plains";
    }
  }
  const home = tileAt(g, 0, 0);
  home.biome = "village";
  home.settlementBuilding = "campfire";

  // A fresh run always has reachable basics for tools, shelter and drinking water.
  for (const [dx,dy,type] of [[2,0,"spring"],[-2,0,"stone_outcrop"],[0,2,"reeds"],[0,-2,"fallen_log"]]){
    const t = tileAt(g, dx, dy);
    if (BIOMES[t.biome].blocks) t.biome = "plains";
    t.feature = {type, charges:MAP_FEATURES[type].charges};
    t.entity = null;
  }
  // Place the unique Old Sage within sight of the village.
  placeSage(g);

  // Reveal the starting area.
  for (let dy = -8; dy <= 8; dy++)
    for (let dx = -12; dx <= 12; dx++)
      g.explored[dx + "," + dy] = true;
}

function inBounds(x,y){ return Number.isSafeInteger(x) && Number.isSafeInteger(y); }

function inSettlementBuildArea(g, x, y){
  return Math.abs(x-g.villageX) <= 10 && Math.abs(y-g.villageY) <= 7;
}

function canPlaceSettlementBuilding(g, id, x, y){
  if (!inBounds(x,y) || !inSettlementBuildArea(g,x,y)) return false;
  if (x===g.villageX && y===g.villageY) return false;
  const t = tileAt(g, x, y);
  if (!t || t.settlementBuilding || t.entity || t.feature || g.camps?.[x+","+y] || g.workSites?.[x+","+y]) return false;
  return !BIOMES[t.biome].blocks && !BIOMES[t.biome].hazard && !BIOMES[t.biome].radiation;
}

function placeSettlementBuilding(g, id, x, y){
  if (!canPlaceSettlementBuilding(g,id,x,y)) return false;
  tileAt(g, x, y).settlementBuilding = id;
  const tx = Math.floor(TOWN_W/2) + (x - g.villageX);
  const ty = Math.floor(TOWN_H/2) + (y - g.villageY);
  if (inTownBounds(tx,ty) && !g.town[ty][tx]) placeTownBuilding(g,id,tx,ty);
  return true;
}

// Place the unique Old Sage NPC a few tiles from the village on a passable tile.
// Idempotent: if a sage is already placed (per g.sageX/sageY), do nothing.
function placeSage(g){
  if (g.sageX!=null && g.sageY!=null
      && inBounds(g.sageX, g.sageY)
      && tileAt(g, g.sageX, g.sageY).entity
      && tileAt(g, g.sageX, g.sageY).entity.type==="sage_npc"){
    return;
  }
  // Search outward from the village for a safe, passable, empty tile.
  for (let r=3; r<=8; r++){
    const candidates = [];
    for (let dy=-r; dy<=r; dy++){
      for (let dx=-r; dx<=r; dx++){
        if (Math.max(Math.abs(dx),Math.abs(dy)) !== r) continue;
        const x = g.villageX+dx, y = g.villageY+dy;
        if (!inBounds(x,y)) continue;
        const t = tileAt(g, x, y);
        const b = BIOMES[t.biome];
        if (b.blocks || b.hazard || b.radiation) continue;
        if (t.entity || t.feature) continue;
        if (x===g.villageX && y===g.villageY) continue;
        candidates.push([x,y]);
      }
    }
    if (candidates.length){
      const [x,y] = pick(candidates);
      tileAt(g, x, y).entity = {type:"sage_npc"};
      g.sageX = x; g.sageY = y;
      return;
    }
  }
  // Fallback: drop him directly east of the village, clearing whatever was there.
  let x = g.villageX+3, y = g.villageY;
  const t = tileAt(g, x, y);
  t.feature = null;
  t.entity = {type:"sage_npc"};
  if (BIOMES[t.biome].blocks) t.biome = "plains";
  g.sageX = x; g.sageY = y;
}

function computeVisible(g){
  const radius = visionRadius(g);
  const vis = {};
  for (let dy=-radius; dy<=radius; dy++){
    for (let dx=-radius; dx<=radius; dx++){
      if (dx*dx + dy*dy > radius*radius) continue;
      const x = g.playerX+dx, y = g.playerY+dy;
      if (!inBounds(x,y)) continue;
      vis[x+","+y] = true;
      g.explored[x+","+y] = true;
    }
  }
  // Village area always at least known
  for (let dy=-1; dy<=1; dy++)
    for (let dx=-1; dx<=1; dx++){
      const x=g.villageX+dx, y=g.villageY+dy;
      if (inBounds(x,y)) g.explored[x+","+y] = true;
    }
  return vis;
}

function visionRadius(g){
  return isNight(g) ? VISION_NIGHT+(ITEMS[carriedTool(g,"light")?.type]?.vision || 0) : VISION_DAY;
}
function travelCost(g,biome){
  const values=TRAVEL[biome] || [15,0.9], penalty=movementPenalty(g.survivors[0]);
  return {minutes:Math.round(values[0]*penalty),energy:values[1]*penalty};
}

function isAdjacentToVillage(g){
  return Math.abs(g.playerX-g.villageX)<=1 && Math.abs(g.playerY-g.villageY)<=1;
}

// Player movement
let _autoWalk = null;

function tryMove(g, dx, dy){
  if (_combat || Math.abs(dx)+Math.abs(dy)!==1) return false;
  const nx = g.playerX + dx, ny = g.playerY + dy;
  if (!inBounds(nx,ny)) return false;
  const t = tileAt(g, nx, ny);
  const b = BIOMES[t.biome];
  if (b.blocks){
    pushLog(g, `Cannot cross ${b.name}.`,"warn");
    return false;
  }
  const p = g.survivors[0];
  if (p.health<=0) return false;
  const cost = travelCost(g,t.biome);
  if (p.energy < cost.energy){
    pushLog(g, movementPenalty(p)>1 ? "Cold, hunger, or thirst slows you too much to keep walking." : "Too tired to keep walking.","warn");
    return false;
  }
  g.playerX = nx; g.playerY = ny;
  p.energy = clamp(p.energy - cost.energy, 0, 100);
  if (b.cold && !ITEMS[equippedItem(g,"clothing")?.type]?.insulation) p.warmth = clamp(p.warmth - 0.6, 0, 100);
  g.stepAccum = 0;
  // small hunger/thirst drift
  p.hunger=clamp(p.hunger-0.12,0,100);
  p.thirst=clamp(p.thirst-(b.dry?0.4:0.18)*(carriedTool(g,"canteen")?0.8:1),0,100);

  // Random biome hazard (radiation, swamp)
  if (b.hazard && chance(b.hazard)){
    const dmg = rint(2,6);
    p.health = clamp(p.health - dmg, 0, p.maxHealth);
    pushLog(g, `The ${b.name.toLowerCase()} hurts you. (-${dmg} HP)`, "bad");
    if (b.radiation && chance(0.2)){ p.diseased = true; pushLog(g,"Radiation sickness sets in.","bad"); }
    if (p.health<=0){ removeDead(g); return true; }
  }

  const epoch=_activityEpoch;
  passMinutes(g,cost.minutes);
  if(p.health<=0 || g.survivors[0]!==p || _activityEpoch!==epoch) return true;
  encounterTile(g, nx, ny);

  // If reached village area, recruit followers
  if (isAdjacentToVillage(g) && g.followers.length > 0){
    recruitFollowersAtVillage(g);
  }

  return true;
}

function movementPenalty(p){
  let mult = 1;
  if (p.warmth < 30) mult += 0.5;
  if (p.warmth < 15) mult += 0.5;
  if (p.hunger < 20) mult += 0.35;
  if (p.thirst < 20) mult += 0.5;
  if (p.injured) mult += 0.25;
  if (p.diseased) mult += 0.25;
  return mult;
}

function recruitFollowersAtVillage(g){
  const incoming = g.followers.slice();
  g.followers = [];
  for (const s of incoming){
    s.id = g.nextSurvId++;
    g.survivors.push(s);
    g.jobs[s.id] = "none";
    pushLog(g, `${s.name} reached the campfire and joined your settlement.`,"good");
  }
  // small happiness bump
  g.survivors[0].happiness = clamp(g.survivors[0].happiness + 5, 0, 100);
}

function startAutoWalk(tx, ty){
  cancelAutoWalk();
  if (G.playerX===tx && G.playerY===ty) return;
  const path = findAutoPath(G, tx, ty);
  if (!path.length){
    pushLog(G, "No known passable route there.", "warn");
    render(); save();
    return;
  }
  _autoWalk = {tx, ty, path, paused:false};
  stepAutoWalk();
}

function cancelAutoWalk(){
  if (_autoWalk && _autoWalk.timer) clearTimeout(_autoWalk.timer);
  _autoWalk = null;
}

function stepAutoWalk(){
  const w = _autoWalk; if (!w) return;
  // stop if encounter modal is open
  if (document.getElementById("modal-root").firstChild){ cancelAutoWalk(); return; }
  if (G.playerX===w.tx && G.playerY===w.ty){ cancelAutoWalk(); render(); return; }
  if (!w.path || !w.path.length){ cancelAutoWalk(); render(); return; }
  const next = w.path.shift();
  const dxRaw = Math.sign(next[0] - G.playerX);
  const dyRaw = Math.sign(next[1] - G.playerY);
  const hpBefore = G.survivors[0].health;
  const nightBefore = isNight(G);
  let moved = tryMoveQuiet(G, dxRaw, dyRaw);
  if (_autoWalk!==w){ render(); save(); return; }
  if (!moved){ cancelAutoWalk(); render(); return; }
  // Stop if damage taken or low energy
  if (G.survivors[0].health < hpBefore){ cancelAutoWalk(); pushLog(G, "You halt — you've been hurt.","warn"); render(); save(); return; }
  if (G.survivors[0].energy < 5){ cancelAutoWalk(); pushLog(G,"You stop, exhausted.","warn"); render(); save(); return; }
  if (!nightBefore && isNight(G) && G.stopAtNight){ cancelAutoWalk(); pushLog(G,"Nightfall. Check your supplies and shelter before continuing.","warn"); render(); save(); return; }
  render();
  save();
  if (_autoWalk===w) w.timer = setTimeout(stepAutoWalk, 70);
}

function findAutoPath(g, tx, ty){
  if (!inBounds(tx,ty)) return [];
  if (!g.explored[tx+","+ty]) return [];
  if (BIOMES[tileAt(g, tx, ty).biome].blocks) return [];
  const start = g.playerX+","+g.playerY;
  const goal = tx+","+ty;
  // A* with an admissible minimum-cost heuristic: roads can still beat a shorter
  // mountain route without searching the entire explored world for nearby goals.
  const minCost = Math.min(...Object.values(TRAVEL).map(([minutes])=>Math.round(minutes*movementPenalty(g.survivors[0]))));
  const estimate = (x,y)=>(Math.abs(tx-x)+Math.abs(ty-y))*minCost;
  const queue = [];
  const push=node=>{
    queue.push(node); let i=queue.length-1;
    while(i>0){ const p=(i-1)>>1; if(queue[p][0]<=node[0]) break; queue[i]=queue[p]; i=p; } queue[i]=node;
  };
  const pop=()=>{
    const first=queue[0],last=queue.pop();
    if(queue.length){ let i=0; while(i*2+1<queue.length){ let c=i*2+1; if(c+1<queue.length && queue[c+1][0]<queue[c][0]) c++; if(queue[c][0]>=last[0]) break; queue[i]=queue[c]; i=c; } queue[i]=last; }
    return first;
  };
  push([estimate(g.playerX,g.playerY),g.playerX,g.playerY,0]);
  const distance = {[start]:0};
  const came = {[start]: null};
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  while(queue.length){
    const [,x,y,d] = pop();
    if(d!==distance[x+","+y]) continue;
    if (x===tx && y===ty) break;
    for (const [dx,dy] of dirs){
      const nx=x+dx, ny=y+dy, key=nx+","+ny;
      if (!inBounds(nx,ny)) continue;
      if (!g.explored[key]) continue;
      const tile = tileAt(g,nx,ny), b = BIOMES[tile.biome];
      if (b.blocks) continue;
      const next=d+travelCost(g,tile.biome).minutes;
      if(next >= (distance[key] ?? Infinity)) continue;
      distance[key]=next;
      came[key] = [x,y];
      push([next+estimate(nx,ny),nx,ny,next]);
    }
  }
  if (came[goal]===undefined) return [];
  const path = [];
  let cur = [tx,ty];
  while (cur){
    path.push(cur);
    cur = came[cur[0]+","+cur[1]];
  }
  path.reverse();
  path.shift();
  return path;
}

// like tryMove but suppresses already-handled modal popping mid-step
function tryMoveQuiet(g, dx, dy){
  return tryMove(g, dx, dy);
}

function tileDistance(g, x, y){
  return Math.max(Math.abs(x-g.playerX), Math.abs(y-g.playerY));
}

function tileWaterKind(tile){
  const ft = tile.feature?.type;
  if (["spring","old_well","hot_spring"].includes(ft)) return "clean";
  if (["pond","stream","rain_pool","fish_pool"].includes(ft)) return "dirty";
  if (BIOMES[tile.biome]?.water) return "dirty";
  return "";
}

function fetchWaterFromTile(g, tile){
  const kind = tileWaterKind(tile);
  if (!kind || g.survivors[0].health<=0 || _combat) return;
  if (!nearbyTile(g,1,t=>t===tile)) { pushLog(g,"Move next to the water first.","warn"); render(); return; }
  const p = g.survivors[0];
  if (p.energy<1) return;
  const spot=nearbyTile(g,1,t=>t===tile);
  const source=sourceAt(g,spot.x,spot.y,"water"),key=kind==="clean"?"water":"dirty_water";
  const blocked=sourceBlocker(g,source,[key]);
  if(blocked){pushLog(g,blocked,"warn");render();return;}
  const amount=carriedTool(g,"bucket")?5:carriedTool(g,"canteen")?3:2;
  collectSource(g,source,{[key]:amount});
  const feature=MAP_FEATURES[tile.feature?.type];
  if(feature?.heal) p.health=clamp(p.health+feature.heal,0,p.maxHealth);
  if(feature?.warmth) p.warmth=clamp(p.warmth+feature.warmth,0,100);
  p.energy = clamp(p.energy - 1, 0, 100);
  passMinutes(g, ACTION_COSTS.fetch_water);
  render(); save();
}

function openTileActionDialog(g, x, y){
  if (!inBounds(x,y)) return;
  const tile = tileAt(g, x, y);
  const dist = tileDistance(g,x,y);
  const biome = BIOMES[tile.biome];
  const feature = tile.feature && MAP_FEATURES[tile.feature.type];
  const entity = tile.entity && MAP_ENTITIES[tile.entity.type];
  const building = tile.settlementBuilding && BUILDINGS[tile.settlementBuilding];
  const titleParts = [];
  if (entity && (!entity.nightOnly || isNight(g))) titleParts.push(`${entity.icon} ${entity.name}`);
  if (feature && !feature.hidden) titleParts.push(`${feature.icon} ${feature.name}`);
  if (building) titleParts.push(`${building.icon} ${building.name}`);
  titleParts.push(`${biome.icon} ${biome.name}`);
  const lines = [];
  if (entity) lines.push(`<p><b>Entity:</b> ${entity.icon} ${escapeHtml(entity.name)}${entity.hostile ? " <span class='bad'>hostile</span>" : ""}</p>`);
  if (feature && !feature.hidden) lines.push(`<p><b>Feature:</b> ${feature.icon} ${escapeHtml(feature.name)} — ${escapeHtml(feature.desc || "")}</p>`);
  const supplyKeys=Object.keys(feature?.loot||{});
  if(tileWaterKind(tile)) supplyKeys.push(tileWaterKind(tile)==="clean"?"water":"dirty_water");
  for(const family of new Set(supplyKeys.map(resourceFamily))){
    lines.push(`<p class="muted">${escapeHtml(sourceStatus(g,sourceAt(g,x,y,family),[...new Set(supplyKeys.filter(k=>resourceFamily(k)===family))]))}</p>`);
  }
  if(entity?.huntable){
    const animal=tile.entity;
    lines.push(`<p class="muted">${escapeHtml(sourceStatus(g,sourceAt(g,animal.originX??x,animal.originY??y,"wildlife"),Object.keys(entity.loot||{})))}</p>`);
  }
  const eventUntil=g.eventCooldowns?.[`feature:${x},${y}`]||0;
  if(eventUntil>gameMinutes(g)) lines.push(`<p class="warn">Searched out. Return in ${timeText(eventUntil-gameMinutes(g))}.</p>`);
  if (building) lines.push(`<p><b>Settlement:</b> ${building.icon} ${escapeHtml(building.name)} — ${escapeHtml(building.desc || "")}</p>`);
  lines.push(`<p class="muted">Distance: ${dist} tile${dist===1?"":"s"}. Right-click nearby tiles to choose an action.</p>`);
  const buttons = [];
  if (!(x===g.playerX && y===g.playerY) && !biome.blocks){
    const route=findAutoPath(g,x,y);
    const minutes=route.reduce((n,[rx,ry])=>n+travelCost(g,tileAt(g, rx, ry).biome).minutes,0);
    const energy=route.reduce((n,[rx,ry])=>n+travelCost(g,tileAt(g, rx, ry).biome).energy,0);
    lines.push(`<p class="info">Known route: ${route.length?`${timeText(minutes)} / ${fmt(energy)} energy`:"no route"}.</p>`);
    buttons.push({label:"Walk here", primary:true, action:()=>{ closeModal(); startAutoWalk(x,y); }});
  }
  if (feature && !feature.hidden){
    const minutes=feature.underground?null:featureMinutes(g,tile.feature.type);
    const blocked=featureSupplyBlocker(g,tile,x,y);
    buttons.push({label:dist<=1 ? `Search / use${minutes!=null?` (${timeText(minutes)})`:""}` : "Walk closer to search",disabled:dist<=1 && !!blocked,title:blocked, action:()=>{
      closeModal();
      if (dist<=1){ handleFeature(g, tile, x, y); render(); save(); }
      else startAutoWalk(x,y);
    }});
  }
  const waterKind = tileWaterKind(tile);
  if (waterKind){
    const why=sourceBlocker(g,sourceAt(g,x,y,"water"),[waterKind==="clean"?"water":"dirty_water"]);
    buttons.push({label:`Fetch ${waterKind} water (10m)`,disabled:dist>1 || !!why,title:why, action:()=>{ closeModal(); fetchWaterFromTile(g, tile); }});
  }
  if (entity && entity.friendly){
    buttons.push({label:dist<=3 ? "Talk" : "Walk to talk", action:()=>{
      closeModal();
      if (dist<=3) openFriendlyDialog(g, entity, x, y);
      else startAutoWalk(x,y);
    }});
  }
  if (entity && entity.huntable){
    const canHunt = dist>=1 && dist<=3 && playerAmount(g,"arrows")>=1 && carriedTool(g,"bow");
    buttons.push({label:"Hunt with arrow", disabled:!canHunt, title:canHunt ? "" : "Need arrows and range 1-3.", action:()=>{
      closeModal(); huntTarget({tile, x, y, entity, dist});
    }});
  }
  if (entity && entity.hostile){
    buttons.push({label:dist<=1 ? "Engage" : "Approach / attack", action:()=>{ closeModal(); if (dist<=1) encounterTile(g,x,y); else startAutoWalk(x,y); }});
  }
  if (dist<=1 && (building || (x===g.villageX && y===g.villageY))){
    buttons.push({label:"Rest here (30m)", action:()=>{ closeModal(); playerAction("rest"); }});
    buttons.push({label:"Warm up", action:()=>{ closeModal(); playerAction("warm_fire"); }});
  }
  if(dist<=1 && tile.feature && ["iron_vein","mine_entrance","fish_pool","spring","stream","pond"].includes(tile.feature.type)){
    buttons.push({label:"Claim site (2 wood + rope, 30m)",disabled:!!g.workSites[x+","+y],action:()=>{closeModal();claimWorkSite(x,y);}});
  }
  if(dist<=1 && building && (tile.settlementBuilding==="campfire" || building.effects?.storage || building.effects?.food_storage)){
    buttons.push({label:"Open base storage",action:()=>{closeModal();_activeTab="inventory";render();}});
  }
  buttons.push({label:"Cancel", action:closeModal});
  showModal({title:titleParts.join(" / "), body:lines.join(""), buttons});
}

// --- Encounters ---

function encounterTile(g, x, y){
  const t = tileAt(g, x, y);
  if (t.entity){
    const e = MAP_ENTITIES[t.entity.type];
    if (e){
      const dormant = e.nightOnly && !isNight(g);
      if (!dormant){
        if (e.hostile){
          startCombat(e.enemy, ()=>{
            t.entity = null;
            render(); save();
          }, ()=>{
            render(); save();
          });
          return;
        }
        if (e.huntable){
          scareAnimal(g, t, e, x, y);
          return;
        }
        if (e.friendly){
          openFriendlyDialog(g, e, x, y);
          return;
        }
      }
    }
  }
  if (t.feature){
    const f=MAP_FEATURES[t.feature.type];
    if(f.hidden || (f.damage && !f.loot && !f.event) || (f.energyLoss && !f.loot && !f.event)) handleFeature(g,t,x,y);
    else pushLog(g,`Found ${f.name}. Use Search nearby or right-click to investigate.`,"info");
  }
}

function scareAnimal(g, tile, animal, x, y){
  if (chance(animal.fleeChance ?? 0.7) && moveAnimalAway(g, x, y)){
    pushLog(g, `${animal.name} bolts away before you can grab it. Use arrows to hunt from a distance.`, "warn");
  } else {
    tile.entity = null;
    pushLog(g, `${animal.name} vanishes into cover.`, "warn");
  }
}

function moveAnimalAway(g, x, y){
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  const options = [];
  for (const [dx,dy] of dirs){
    const nx=x+dx, ny=y+dy;
    if (!inBounds(nx,ny) || !g.explored[nx+","+ny]) continue;
    const t = tileAt(g, nx, ny);
    if (!t || t.entity || t.feature || t.settlementBuilding) continue;
    if (BIOMES[t.biome].blocks || BIOMES[t.biome].hazard || BIOMES[t.biome].radiation) continue;
    if (Math.abs(nx-g.playerX) <= 1 && Math.abs(ny-g.playerY) <= 1) continue;
    options.push([nx,ny]);
  }
  if (!options.length) return false;
  const [nx,ny] = pick(options);
  const animal=tileAt(g,x,y).entity;
  if(animal){animal.originX=animal.originX??x;animal.originY=animal.originY??y;}
  tileAt(g, nx, ny).entity = animal;
  tileAt(g, x, y).entity = null;
  return true;
}

function featureSupplyBlocker(g,t,x,y){
  const f=MAP_FEATURES[t.feature?.type];if(!f || f.hidden) return "";
  const until=g.eventCooldowns[`feature:${x},${y}`]||0;
  if(f.event && until>gameMinutes(g)) return `This site is searched out. Return in ${timeText(until-gameMinutes(g))}.`;
  if(WATER_FEATURES.has(t.feature.type) && t.feature.type!=="fish_pool") return sourceBlocker(g,sourceAt(g,x,y,"water"),[tileWaterKind(t)==="clean"?"water":"dirty_water"]);
  const families=[...new Set(Object.keys(f.loot||{}).map(resourceFamily))];
  const reasons=families.map(family=>sourceBlocker(g,sourceAt(g,x,y,family),Object.keys(f.loot).filter(k=>resourceFamily(k)===family)));
  return reasons.length && reasons.every(Boolean)?reasons.join(" "):"";
}
function handleFeature(g, t, x, y){
  if (!t.feature || tileDistance(g,x,y)>1 || g.survivors[0].health<=0 || _combat) return;
  const f = MAP_FEATURES[t.feature.type];
  if (!f) return;
  const blocked=featureSupplyBlocker(g,t,x,y);
  if(blocked){pushLog(g,blocked,"warn");return;}
  const p = g.survivors[0];
  if(!f.hidden && (f.loot || f.event || f.underground)){
    if(p.energy<2){ pushLog(g,"Rest before searching.","warn"); return; }
    if(["iron_vein","boulder_pile","coal_seam"].includes(t.feature.type) && !carriedTool(g,"pick")){ pushLog(g,"Carry a working pickaxe to mine this deposit.","warn"); return; }
  }

  // Hidden hazard: trigger immediately
  if (f.hidden){
    if (f.damage){
      const d = rint(f.damage[0], f.damage[1]);
      p.health = clamp(p.health - d, 0, p.maxHealth);
      pushLog(g, `${f.icon} ${f.name}! You take ${d} damage.`, "bad");
    }
    if (f.energyLoss){ p.energy = clamp(p.energy - f.energyLoss, 0, 100); }
    t.feature = null;
    if(p.health<=0) removeDead(g);
    return;
  }

  // Always-on hazards (no charges or many charges)
  if (f.damage && !f.loot && !f.event){
    const d = rint(f.damage[0], f.damage[1]);
    p.health = clamp(p.health - d, 0, p.maxHealth);
    pushLog(g, `${f.icon} ${f.name}: -${d} HP.`,"bad");
    if (f.energyLoss) p.energy = clamp(p.energy - f.energyLoss, 0, 100);
    if (f.curse && chance(0.3)){ p.diseased = true; pushLog(g,`You contracted illness.`,"bad"); }
    if (f.charges < 99) { t.feature.charges--; if (t.feature.charges<=0) t.feature = null; }
    if(p.health<=0) removeDead(g);
    return;
  }
  if (f.energyLoss && !f.loot && !f.event){
    const e = f.energyLoss;
    p.energy = clamp(p.energy - e, 0, 100);
    pushLog(g, `${f.icon} ${f.name}: -${e} energy.`,"warn");
    if (f.charges < 99) { t.feature.charges--; if (t.feature.charges<=0) t.feature = null; }
    return;
  }

  // Events
  if (f.event){
    const key=`feature:${x},${y}`,until=g.eventCooldowns[key]||0;
    if(until>gameMinutes(g)){pushLog(g,`This site is searched out. Return in ${timeText(until-gameMinutes(g))}.`,"warn");return;}
    if(["cache","grave"].includes(f.event) && packWeight(g)>=packCapacity(g)-0.001){pushLog(g,"Pack full. Unload before searching.","warn");return;}
    g.eventCooldowns[key]=gameMinutes(g)+4320;
    triggerEvent(g, f, t, x, y);
    if(p.health<=0) removeDead(g); else passMinutes(g,15);
    return;
  }

  // Underground entrances stay on the map and open a repeatable expedition choice.
  if (f.underground){
    openUndergroundDialog(g, f.underground, t, x, y);
    return;
  }

  if(WATER_FEATURES.has(t.feature.type) && t.feature.type!=="fish_pool"){
    fetchWaterFromTile(g,t);
    return;
  }
  const families=[...new Set(Object.keys(f.loot||{}).map(resourceFamily))];
  if(families.length && families.every(family=>sourceBlocker(g,sourceAt(g,x,y,family),Object.keys(f.loot).filter(k=>resourceFamily(k)===family)))){
    for(const family of families) pushLog(g,sourceBlocker(g,sourceAt(g,x,y,family),Object.keys(f.loot).filter(k=>resourceFamily(k)===family)),"warn");
    return;
  }
  // Harvesting consumes actual local stock, never uncollected overflow.
  const got = {};
  const featureType=t.feature.type, minutes=featureMinutes(g,featureType);
  const mineral=["iron_vein","boulder_pile","coal_seam","stone_outcrop"].includes(t.feature.type);
  const salvage=!!f.loot && ("metal" in f.loot || "parts" in f.loot || "nails" in f.loot);
  const tool=mineral?carriedTool(g,"pick"):WOOD_FEATURES.has(featureType)?carriedTool(g,"axe"):salvage?carriedTool(g,"crowbar"):null;
  if (f.loot){
    for (const r in f.loot){
      const [lo,hi] = f.loot[r];
      const bonus=tool && (mineral || WOOD_FEATURES.has(featureType) || salvage && ["metal","parts","nails"].includes(r)) ? ITEMS[tool.type].tier || 1 : 0;
      const amt = rint(lo, hi)+bonus;
      if (amt>0){
        const gained = collectSource(g,sourceAt(g,x,y,resourceFamily(r)),{[r]:amt},false,true)[r]||0;
        if (gained>0) got[r] = (got[r]||0)+gained;
      }
    }
  }
  if (f.knowledge){
    const k = rint(f.knowledge[0], f.knowledge[1]);
    g.knowledge += k;
    pushLog(g, `You learned from the ${f.name}. +${k} knowledge.`,"good");
  }
  if (f.heal){ p.health = clamp(p.health + f.heal, 0, p.maxHealth); }
  if (f.warmth){ p.warmth = clamp(p.warmth + f.warmth, 0, 100); }
  if (f.sting){
    const d = rint(2,5);
    p.health = clamp(p.health - d, 0, p.maxHealth);
    pushLog(g, `Bee stings! -${d} HP.`,"warn");
  }
  if (f.damage){
    const d = rint(f.damage[0], f.damage[1]);
    p.health = clamp(p.health - d, 0, p.maxHealth);
    pushLog(g, `${f.name} hurts you. -${d} HP.`,"warn");
  }
  if (f.curse && chance(0.3)){ p.diseased = true; pushLog(g,`You feel sick.`,"bad"); }

  // Energy cost for searching
  p.energy = clamp(p.energy - 2, 0, 100);
  wearTool(g,tool);

  const gainedStr = Object.entries(got).map(([k,v])=>`+${fmt(v)} ${RESOURCES[k].name}`).join(", ");
  if (gainedStr) pushLog(g, `${f.icon} ${f.name}: ${gainedStr}.`,"good");
  else if (!f.knowledge && !f.heal) pushLog(g, `${f.icon} ${f.name}: nothing useful.`,"info");

  // Possible enemy popping out
  if (f.enemyChance && chance(f.enemyChance)){
    const ek = pick(["wolves","infected","bears","forest_beasts","mutated_animals","cultists"]);
    pushLog(g, `Something stirs in the dark!`,"bad");
    startCombat(ek, ()=>{ render(); save(); });
  }

  if (!f.loot && f.charges < 99){
    t.feature.charges--;
    if (t.feature.charges <= 0) t.feature = null;
  }
  for(const family of families) pushLog(g,sourceStatus(g,sourceAt(g,x,y,family),Object.keys(f.loot).filter(k=>resourceFamily(k)===family)),"info");
  if (p.health<=0){ removeDead(g); return; }
  if(!_combat) passMinutes(g,minutes);
}

function featureMinutes(g,type){
  const f=MAP_FEATURES[type];
  if(WATER_FEATURES.has(type) && type!=="fish_pool") return ACTION_COSTS.fetch_water;
  if(f.hidden || f.damage && !f.loot || f.energyLoss && !f.loot) return 0;
  if(f.event) return 15;
  if(["iron_vein","boulder_pile","coal_seam","stone_outcrop"].includes(type)) return actionMinutes(g,"mine");
  if(f.renewable) return 5;
  if(f.loot && ("metal" in f.loot || "parts" in f.loot || "nails" in f.loot) && carriedTool(g,"crowbar")) return 15;
  return 20;
}

function triggerEvent(g, f, t, x, y){
  const p = g.survivors[0];
  switch (f.event){
    case "shrine":{
      if (chance(0.5)){
        const k = rint(2,5); g.knowledge += k;
        pushLog(g, `The shrine grants you insight. +${k} knowledge.`,"good");
      } else {
        const dmg = rint(3,8);
        p.health = clamp(p.health - dmg, 0, p.maxHealth);
        p.morale = clamp(p.morale - 10, 0, 100);
        pushLog(g, `The shrine drains you. -${dmg} HP.`,"bad");
      }
      break;
    }
    case "radio":{
      // reveal a wide area
      revealArea(g, x, y, 7);
      pushLog(g, `The radio crackles weather and warnings — area revealed.`,"info");
      break;
    }
    case "music":{
      p.happiness = clamp(p.happiness + 15, 0, 100);
      pushLog(g, `The melody lifts your spirits. (+15 happiness)`,"good");
      break;
    }
    case "cache":{
      const items = ["food","water","cloth","tools","medicine","ammo","weapons"];
      const got = {};
      for (let i=0;i<3;i++){
        const r = pick(items); const amt = rint(1,3);
        const gain = grantSourceLoot(g,r,amt,x,y);
        got[r] = (got[r]||0)+gain;
      }
      pushLog(g,`Cache opened: ${Object.entries(got).map(([k,v])=>'+'+fmt(v)+' '+RESOURCES[k].name).join(", ")}.`,"good");
      break;
    }
    case "glow":{
      if (chance(0.5)){
        const k = rint(3,6); g.knowledge += k;
        pushLog(g,`The lights show you something. +${k} knowledge.`,"good");
      } else {
        p.diseased = true;
        pushLog(g,`You linger too long. You feel sickly.`,"bad");
      }
      break;
    }
    case "map":{
      revealArea(g, x, y, 10);
      pushLog(g,`The fragment reveals a wider area.`,"info");
      break;
    }
    case "signal":{
      // chance for survivor to be nearby
      if (chance(0.5)){
        const friendlies = ["wanderer_npc","hunter_friendly","scholar_npc","mechanic_npc","doctor_npc"];
        placeNearby(g, x, y, friendlies);
        pushLog(g,`Someone responded to the old signal. A figure approaches in the distance.`,"info");
      } else {
        pushLog(g,`No one answered.`,"info");
      }
      break;
    }
    case "grave":{
      const got = grantSourceLoot(g,"bones",rint(2,4),x,y);
      if (got>0) pushLog(g,`You collect bones from the graveyard. (+${got})`,"info");
      if (chance(0.25)){ p.morale = clamp(p.morale-10,0,100); pushLog(g,"The silence weighs on you.","warn"); }
      break;
    }
  }
  // Keep the searched site visible until its recovery timer expires.
}

function openUndergroundDialog(g, siteKey, tile, x, y){
  const site = UNDERGROUND_SITES[siteKey];
  if (!site) return;
  const p = g.survivors[0];
  showModal({
    title:`${site.icon} ${site.name}`,
    body:`<p>${site.desc}</p><p class="muted">Underground trips use finite local reserves. Uncarried finds remain at the entrance. Each route also needs 24 hours between searches.</p>${["shallow","deep"].map(depth=>`<p>${site[depth].label}: ${(g.undergroundCooldowns[`${x},${y}:${depth}`]||0)>gameMinutes(g)?"return in "+timeText(g.undergroundCooldowns[`${x},${y}:${depth}`]-gameMinutes(g)):"ready"}</p>`).join("")}<p>Energy: <b>${Math.round(p.energy)}/100</b></p>`,
    buttons:[
      {label:`${site.shallow.label} (${site.shallow.energy} energy)`, primary:true, action:()=> undergroundExplore(siteKey, "shallow", tile, x, y)},
      {label:`${site.deep.label} (${site.deep.energy} energy)`, action:()=> undergroundExplore(siteKey, "deep", tile, x, y)},
      {label:"Stay outside", action:()=>{ closeModal(); render(); }}
    ]
  });
}

function undergroundExplore(siteKey, depth, tile, x, y){
  const site = UNDERGROUND_SITES[siteKey];
  const route = site?.[depth];
  if (!site || !route || _combat || G.survivors[0].health<=0 || tileDistance(G,x,y)>1) return;
  const key=`${x},${y}:${depth}`;
  if((G.undergroundCooldowns[key] || 0)>gameMinutes(G)){ pushLog(G,`This route is searched out. Return in ${timeText(G.undergroundCooldowns[key]-gameMinutes(G))}.`,"warn"); closeModal(); render(); return; }
  if(!Object.keys(route.loot||{}).some(k=>carryRoom(G,k)>=0.001)){pushLog(G,"Pack full. Unload before searching.","warn");closeModal();render();return;}
  const keys=Object.keys(route.loot||{});
  if(keys.every(k=>sourceRemaining(G,sourceAt(G,x,y,resourceFamily(k)),k)<0.001)){
    for(const family of new Set(keys.map(resourceFamily))) pushLog(G,sourceStatus(G,sourceAt(G,x,y,family),keys.filter(k=>resourceFamily(k)===family)),"warn");
    closeModal();render();return;
  }
  if(depth==="deep" && (carriedTool(G,"light")?.durability || 0)<route.minutes){ pushLog(G,`Carry a light with at least ${route.minutes} minutes of fuel for this route.`,"warn"); closeModal(); render(); return; }
  if(siteKey==="mine" && !carriedTool(G,"pick")){ pushLog(G,"Carry a pickaxe for a mining expedition.","warn"); closeModal(); render(); return; }
  const p = G.survivors[0];
  if (p.energy < route.energy){
    pushLog(G, `Too exhausted to enter ${site.name}.`, "warn");
    closeModal(); render(); save();
    return;
  }
  closeModal();
  cancelAutoWalk();
  G.undergroundCooldowns[key]=gameMinutes(G)+1440;
  p.energy = clamp(p.energy - route.energy, 0, 100);
  p.hunger = clamp(p.hunger - Math.ceil(route.energy/5), 0, 100);
  p.thirst = clamp(p.thirst - Math.ceil(route.energy/5), 0, 100);
  pushLog(G, `You enter ${site.name}: ${route.label.toLowerCase()}.`, "info");
  const epoch=_activityEpoch;
  // Surface night consumption is handled by passMinutes; charge the remaining underground time here.
  wearTool(G,carriedTool(G,"light"),route.minutes-nightMinutesDuring(G,route.minutes));
  passMinutes(G,route.minutes);
  if(p.health<=0 || G.survivors[0]!==p || epoch!==_activityEpoch){ render(); save(); return; }

  const finish = ()=> finishUndergroundExplore(siteKey, depth, tile, x, y);
  if (chance(route.danger)){
    startCombat(pick(route.enemies), finish, ()=>{
      pushLog(G, `You stumble back out of ${site.name}.`, "warn");
      render(); save();
    });
    return;
  }
  finish();
}

function finishUndergroundExplore(siteKey, depth, tile, x, y){
  const site = UNDERGROUND_SITES[siteKey];
  const route = site?.[depth];
  if (!site || !route) return;
  const p = G.survivors[0];
  const got = {};
  for (const r in route.loot || {}){
    const [lo, hi] = route.loot[r];
    const source=sourceAt(G,x,y,resourceFamily(r));
    const amt = Math.min(rint(lo, hi),sourceRemaining(G,source,r));
    if (amt>0){
      const gained = addCarried(G, r, amt,false);
      spendSource(G,source,r,amt);
      if(amt>gained){const cache=cacheAt(G,`${x},${y}`);cache.resources[r]=(cache.resources[r]||0)+amt-gained;}
      if (gained>0) got[r] = (got[r]||0) + gained;
    }
  }
  if (route.damage && chance(depth==="deep" ? 0.55 : 0.25)){
    const d = rint(route.damage[0], route.damage[1]);
    p.health = clamp(p.health - d, 0, p.maxHealth);
    if (p.health < 50) p.injured = true;
    pushLog(G, `${site.name} bites back. -${d} HP.`, "warn");
    if (p.health<=0){ removeDead(G); render(); save(); return; }
  }
  if (route.curse && chance(0.25)){
    p[route.curse] = true;
    pushLog(G, `The filth below leaves you ${route.curse}.`, "bad");
  }
  if (chance(depth==="deep" ? 0.35 : 0.15)){
    const k = rint(1, depth==="deep" ? 3 : 2);
    G.knowledge += k;
    pushLog(G, `Old markings underground teach you something. +${k} knowledge.`, "good");
  }
  const gainedStr = Object.entries(got).map(([k,v])=>`+${fmt(v)} ${RESOURCES[k].name}`).join(", ");
  pushLog(G, `${site.icon} ${site.name}: ${gainedStr || "nothing useful"}.`, gainedStr ? "good" : "info");
  pushLog(G,"Uncarried finds remain at the entrance. This route recovers after its 24-hour search cycle.","info");
  render(); save();
}

function revealArea(g, cx, cy, r){
  for (let dy=-r; dy<=r; dy++)
    for (let dx=-r; dx<=r; dx++){
      if (dx*dx+dy*dy>r*r) continue;
      const x=cx+dx, y=cy+dy;
      if (inBounds(x,y)) g.explored[x+","+y] = true;
    }
}

function placeNearby(g, cx, cy, entityTypes){
  for (let r=1; r<5; r++){
    for (let dy=-r; dy<=r; dy++){
      for (let dx=-r; dx<=r; dx++){
        const x = cx+dx, y = cy+dy;
        if (!inBounds(x,y)) continue;
        const t = tileAt(g, x, y);
        if (t.feature || t.entity) continue;
        if (BIOMES[t.biome].blocks) continue;
        const ek = pick(entityTypes);
        const e = MAP_ENTITIES[ek];
        // Don't require strict biome match here — they're heading to player
        t.entity = {type:ek};
        return [x,y];
      }
    }
  }
  return null;
}

function openFriendlyDialog(g, ent, x, y){
  const p = g.survivors[0];
  switch (ent.friendly){
    case "child": {
      const child = makeSurvivor("Child");
      child.firstName = pick(FIRST_NAMES); child.lastName = pick(LAST_NAMES);
      child.name = `${child.firstName} ${child.lastName}`;
      child.isChild = true; child.age = rint(5,10); child.age_ticks = rint(20,50);
      child.health = 40; child.maxHealth = 60;
      child.skills = {combat:0,building:0,farming:0,medicine:0,crafting:0,hunting:0};
      showModal({
        title:"🧒 A Lost Child",
        body:`<p>A small child, ${child.name}, looks up at you with tear-streaked cheeks.</p><p>"Please... I don't know where my family went."</p>`,
        buttons:[
          {label:"Take with you", primary:true, action:()=>{
            g.followers.push(child);
            tileAt(g, x, y).entity = null;
            pushLog(g, `${child.name} clings to your sleeve and follows.`,"good");
            closeModal(); render(); save();
          }},
          {label:"Leave them", action:()=>{ closeModal(); render(); }}
        ]
      });
      return;
    }
    case "wounded":{
      const surv = makeSurvivor();
      surv.firstName = pick(FIRST_NAMES); surv.lastName = pick(LAST_NAMES);
      surv.name = `${surv.firstName} ${surv.lastName}`;
      surv.health = 25;
      showModal({
        title:"🤕 A Wounded Survivor",
        body:`<p>${surv.name} is bleeding and pale. They need treatment.</p>`,
        buttons:[
          {label:`Use 1 medicine, then recruit (have: ${Math.floor(playerAmount(g,"medicine"))})`, primary:true,
            action:()=>{
              if (!playerPay(g,{medicine:1})){ pushLog(g,"You have no accessible medicine.","warn"); closeModal(); return; }
              surv.health = 70;
              g.followers.push(surv);
              tileAt(g, x, y).entity = null;
              pushLog(g, `You patched up ${surv.name}, who now follows you.`, "good");
              closeModal(); render(); save();
            }},
          {label:"Bind their wounds (slow, no medicine, may die)", action:()=>{
            if (chance(0.55)){
              surv.health = 50;
              g.followers.push(surv);
              tileAt(g, x, y).entity = null;
              pushLog(g, `${surv.name} survives your rough care and follows you.`,"good");
            } else {
              tileAt(g, x, y).entity = null;
              pushLog(g, `${surv.name} died from their wounds.`,"bad");
              p.morale = clamp(p.morale - 5, 0, 100);
            }
            closeModal(); render(); save();
          }},
          {label:"Leave them", action:()=>{ closeModal(); }}
        ]
      });
      return;
    }
    case "easy":{
      const surv = makeSurvivor();
      surv.firstName = pick(FIRST_NAMES); surv.lastName = pick(LAST_NAMES);
      surv.name = `${surv.firstName} ${surv.lastName}`;
      showModal({
        title:`🚶 ${surv.name}`,
        body:`<p>A wandering survivor stops as you approach.</p><p>"Got room at your fire? I'll pull my weight."</p><p class="muted">Traits: ${surv.traits.map(t=>TRAITS[t].label).join(", ")}</p>`,
        buttons:[
          {label:"Welcome them", primary:true, action:()=>{
            g.followers.push(surv);
            tileAt(g, x, y).entity = null;
            pushLog(g, `${surv.name} joins you on the road.`, "good");
            closeModal(); render(); save();
          }},
          {label:"Refuse", action:()=>{ closeModal(); }}
        ]
      });
      return;
    }
    case "hermit":{
      showModal({
        title:"🧙 An Old Hermit",
        body:`<p>An old recluse studies you with bright eyes.</p>`,
        buttons:[
          {label:"Listen (gain knowledge)", primary:true, action:()=>{
            const k = rint(3,6); g.knowledge += k;
            grantSourceLoot(g, "books", rint(0,1),x,y);
            pushLog(g, `The hermit shares wisdom. +${k} knowledge.`,"good");
            tileAt(g, x, y).entity = null;
            closeModal(); render(); save();
          }},
          {label:"Ask them to follow", action:()=>{
            if (chance(0.35)){
              const s = makeSurvivor();
              s.firstName = pick(FIRST_NAMES); s.lastName = pick(LAST_NAMES);
              s.name = `${s.firstName} ${s.lastName}`;
              s.age = rint(55,75);
              if (!s.traits.includes("teacher")) s.traits.push("teacher");
              s.skills.medicine += 2;
              g.followers.push(s);
              pushLog(g, `The hermit, ${s.name}, decides to follow you.`,"good");
            } else {
              pushLog(g, `The hermit waves you away.`,"info");
            }
            tileAt(g, x, y).entity = null;
            closeModal(); render(); save();
          }},
          {label:"Leave them be", action:()=>{ closeModal(); }}
        ]
      });
      return;
    }
    case "trader":{
      const entity=tileAt(g,x,y).entity;
      if(!entity) return;
      entity.originX=entity.originX??x;entity.originY=entity.originY??y;
      traderArrives(g,true,`trader:${entity.originX},${entity.originY}`);
      return;
    }
    case "hunter":{
      const s = makeSurvivor();
      s.firstName = pick(FIRST_NAMES); s.lastName = pick(LAST_NAMES);
      s.name = `${s.firstName} ${s.lastName}`;
      if (!s.traits.includes("hunter")) s.traits.push("hunter");
      s.skills.hunting += 3;
      showModal({
        title:`🏹 ${s.name}, Hunter`,
        body:`<p>A skilled hunter offers to share game and join you, in exchange for shelter.</p>`,
        buttons:[
          {label:"Recruit (gain meat + hides)", primary:true, action:()=>{
            const m = grantSourceLoot(g,"meat",rint(2,4),x,y);
            const h = grantSourceLoot(g,"hides",rint(1,2),x,y);
            g.followers.push(s);
            tileAt(g, x, y).entity = null;
            pushLog(g, `${s.name} joins you. (+${m} meat, +${h} hides)`,"good");
            closeModal(); render(); save();
          }},
          {label:"Trade meat for ammo", action:()=>{
            if (!personalTrade(g,{ammo:2},{meat:4})){closeModal();render();return;}
            tileAt(g, x, y).entity = null;
            pushLog(g,"You traded ammo for meat.","info");
            closeModal(); render(); save();
          }},
          {label:"Walk on", action:()=>{ closeModal(); }}
        ]
      });
      return;
    }
    case "family":{
      const n = rint(2,3);
      const family = [];
      for (let i=0;i<n;i++){
        const s = makeSurvivor();
        s.firstName = pick(FIRST_NAMES);
        s.lastName = family[0]?.lastName || pick(LAST_NAMES);
        s.name = `${s.firstName} ${s.lastName}`;
        family.push(s);
      }
      // a child
      const child = makeSurvivor();
      child.firstName = pick(FIRST_NAMES);
      child.lastName = family[0].lastName;
      child.name = `${child.firstName} ${child.lastName}`;
      child.isChild = true; child.age = rint(4,11); child.age_ticks = rint(20,60);
      child.maxHealth = 60; child.health = 50;
      child.skills = {combat:0,building:0,farming:0,medicine:0,crafting:0,hunting:0};
      family.push(child);
      showModal({
        title:"👨‍👩‍👧 Refugees",
        body:`<p>A family of ${family.length} asks for refuge.</p><p>${family.map(s=>s.name+(s.isChild?" (child)":"")).join(", ")}</p>`,
        buttons:[
          {label:"Take them all in", primary:true, action:()=>{
            for (const s of family) g.followers.push(s);
            tileAt(g, x, y).entity = null;
            pushLog(g, `The ${family[0].lastName} family follows you home.`,"good");
            closeModal(); render(); save();
          }},
          {label:"Refuse them", action:()=>{
            g.survivors[0].morale = clamp(g.survivors[0].morale - 5, 0, 100);
            closeModal(); render();
          }}
        ]
      });
      return;
    }
    case "elder":{
      const k = rint(4,8);
      showModal({
        title:"👴 Wise Elder",
        body:`<p>An old elder tells you stories of the world before.</p><p>You feel you understand more.</p>`,
        buttons:[
          {label:`Listen (+${k} knowledge)`, primary:true, action:()=>{
            g.knowledge += k;
            pushLog(g, `+${k} knowledge from the elder.`, "good");
            tileAt(g, x, y).entity = null;
            closeModal(); render(); save();
          }},
          {label:"Help them home (recruit)", action:()=>{
            const s = makeSurvivor();
            s.firstName = pick(FIRST_NAMES); s.lastName = pick(LAST_NAMES);
            s.name = `${s.firstName} ${s.lastName}`;
            s.age = rint(60,80);
            if (!s.traits.includes("leader")) s.traits.push("leader");
            g.followers.push(s);
            tileAt(g, x, y).entity = null;
            pushLog(g, `${s.name}, an elder, follows you home.`,"good");
            closeModal(); render(); save();
          }}
        ]
      });
      return;
    }
    case "doctor":{
      const s = makeSurvivor();
      s.firstName = pick(FIRST_NAMES); s.lastName = pick(LAST_NAMES);
      s.name = `${s.firstName} ${s.lastName}`;
      if (!s.traits.includes("medic")) s.traits.push("medic");
      s.skills.medicine = Math.max(s.skills.medicine, 4);
      showModal({
        title:`🩺 Doctor ${s.name}`,
        body:`<p>A trained physician. Willing to follow if you can promise safety.</p>`,
        buttons:[
          {label:"Recruit (and they heal you)", primary:true, action:()=>{
            p.health = clamp(p.health + 30, 0, p.maxHealth);
            if (p.diseased) { p.diseased = false; pushLog(g,"The doctor cures your illness.","good"); }
            g.followers.push(s);
            tileAt(g, x, y).entity = null;
            pushLog(g, `Doctor ${s.name} joins your party.`, "good");
            closeModal(); render(); save();
          }},
          {label:"Refuse", action:()=>{ closeModal(); }}
        ]
      });
      return;
    }
    case "mechanic":{
      const s = makeSurvivor();
      s.firstName = pick(FIRST_NAMES); s.lastName = pick(LAST_NAMES);
      s.name = `${s.firstName} ${s.lastName}`;
      if (!s.traits.includes("mechanic")) s.traits.push("mechanic");
      s.skills.crafting = Math.max(s.skills.crafting, 4);
      showModal({
        title:`🔧 ${s.name}, Mechanic`,
        body:`<p>A mechanic offering parts and skill.</p>`,
        buttons:[
          {label:"Recruit (+parts, +tools)", primary:true, action:()=>{
            grantSourceLoot(g,"parts",rint(2,4),x,y);
            grantSourceLoot(g,"tools",rint(1,2),x,y);
            g.followers.push(s);
            tileAt(g, x, y).entity = null;
            pushLog(g, `${s.name} joins your party.`, "good");
            closeModal(); render(); save();
          }},
          {label:"Trade parts for tools", action:()=>{
            if(!personalTrade(g,{metal:5},{tools:2,parts:2})){closeModal();render();return;}
            tileAt(g, x, y).entity = null;
            closeModal(); render(); save();
          }},
          {label:"Refuse", action:()=>{ closeModal(); }}
        ]
      });
      return;
    }
    case "scholar":{
      const s = makeSurvivor();
      s.firstName = pick(FIRST_NAMES); s.lastName = pick(LAST_NAMES);
      s.name = `${s.firstName} ${s.lastName}`;
      if (!s.traits.includes("teacher")) s.traits.push("teacher");
      showModal({
        title:`📖 ${s.name}, Scholar`,
        body:`<p>A scholar carrying books and notes.</p>`,
        buttons:[
          {label:"Recruit (+books, +knowledge)", primary:true, action:()=>{
            grantSourceLoot(g,"books",rint(1,3),x,y);
            g.knowledge += rint(2,4);
            g.followers.push(s);
            tileAt(g, x, y).entity = null;
            pushLog(g, `${s.name} joins your party.`, "good");
            closeModal(); render(); save();
          }},
          {label:"Refuse", action:()=>{ closeModal(); }}
        ]
      });
      return;
    }
    case "dog":{
      showModal({
        title:"🐶 A Loyal Dog",
        body:`<p>A scruffy dog wags its tail at you.</p>`,
        buttons:[
          {label:"Take it with you", primary:true, action:()=>{
            const s = makeSurvivor();
            s.firstName = "Dog"; s.lastName = pick(["Rex","Shadow","Brisk","Bones","Soot","Ash","Fang"]);
            s.name = `${s.firstName} ${s.lastName}`;
            s.maxHealth = 40; s.health = 40;
            if (!s.traits.includes("guard")) s.traits.push("guard");
            s.skills.combat = 3; s.skills.hunting = 3;
            g.followers.push(s);
            tileAt(g, x, y).entity = null;
            g.survivors[0].morale = clamp(g.survivors[0].morale + 5, 0, 100);
            pushLog(g, `${s.name} the dog follows happily.`, "good");
            closeModal(); render(); save();
          }},
          {label:"Wave it off", action:()=>{ closeModal(); }}
        ]
      });
      return;
    }
    case "sage": {
      openSageChat(g);
      return;
    }
  }
}

// Only explored ground near the player and settlement is simulated. Distant
// regions retain their state without loading or ticking the entire travel history.
function activeMapTiles(g){
  const list = [];
  const seen = new Set();
  for (const [cx,cy] of [[g.playerX,g.playerY],[g.villageX,g.villageY]]){
    for (let dy=-ACTIVE_MAP_RADIUS; dy<=ACTIVE_MAP_RADIUS; dy++){
      for (let dx=-ACTIVE_MAP_RADIUS; dx<=ACTIVE_MAP_RADIUS; dx++){
        const x=cx+dx, y=cy+dy, key=x+","+y;
        if (!inBounds(x,y) || !g.explored[key] || seen.has(key)) continue;
        seen.add(key);
        list.push([x,y]);
      }
    }
  }
  return list;
}

function refreshMapDaily(g){
  if (!g.chunks) return;
  const explored = activeMapTiles(g);
  if (!explored.length) return;
  // Sometimes regrow resource nodes
  for (let i=0; i<35 && explored.length; i++){
    const [x,y] = pick(explored);
    const t = tileAt(g, x, y);
    if (t.feature || t.entity || t.settlementBuilding || g.camps[x+","+y] || g.workSites[x+","+y]) continue;
    if (BIOMES[t.biome].blocks) continue;
    // pick a renewable feature compatible with this biome
    const candidates = [];
    for (const k in MAP_FEATURES){
      const f = MAP_FEATURES[k];
      if (f.biomes.includes(t.biome) && f.renewable) candidates.push(k);
    }
    if (!candidates.length) continue;
    const fk = pick(candidates);
    t.feature = {type:fk, charges:MAP_FEATURES[fk].charges};
  }
  // Occasional new wandering entities
  for (let i=0; i<12 && explored.length; i++){
    if (!chance(0.6)) continue;
    const [x,y] = pick(explored);
    const t = tileAt(g, x, y);
    if (t.feature || t.entity || t.settlementBuilding || g.camps[x+","+y] || g.workSites[x+","+y] || BIOMES[t.biome].blocks) continue;
    if (Math.abs(x-g.villageX)<=3 && Math.abs(y-g.villageY)<=3) continue;
    // mostly hostile to keep pressure
    const roll = rng();
    const pool = roll < 0.35 ? Object.keys(MAP_ENTITIES).filter(k=>MAP_ENTITIES[k].friendly)
               : roll < 0.7 ? Object.keys(MAP_ENTITIES).filter(k=>MAP_ENTITIES[k].huntable)
               : Object.keys(MAP_ENTITIES).filter(k=>MAP_ENTITIES[k].hostile);
    const fits = pool.filter(k=>!MAP_ENTITIES[k].unique && (MAP_ENTITIES[k].biomes||[]).includes(t.biome));
    if (!fits.length) continue;
    const type=pick(fits),animal=MAP_ENTITIES[type];
    if(animal.huntable && Object.keys(animal.loot||{}).every(k=>sourceRemaining(g,sourceAt(g,x,y,"wildlife"),k)<0.001)) continue;
    t.entity = {type};
  }
}

function moveMapEntities(g){
  const moves = [];
  for (const [x,y] of activeMapTiles(g)){
    const entState = tileAt(g, x, y).entity;
    if (!entState || entState.type === "sage_npc") continue;
    const def = MAP_ENTITIES[entState.type];
    if (!def) continue;
    if (def.nightOnly && !isNight(g)) continue;
    const dist = Math.abs(x-g.villageX) + Math.abs(y-g.villageY);
    if (def.hostile && dist <= 2){
      moves.push({x,y,attack:true, enemy:def.enemy});
      continue;
    }
    let dx = 0, dy = 0;
    if (def.hostile && dist < 28 && chance(0.75)){
      dx = Math.sign(g.villageX - x);
      dy = Math.sign(g.villageY - y);
      if (dx && dy) chance(0.5) ? dx = 0 : dy = 0;
    } else {
      const dir = pick([[1,0],[-1,0],[0,1],[0,-1],[0,0]]);
      dx = dir[0]; dy = dir[1];
    }
    moves.push({x,y,nx:x+dx,ny:y+dy});
  }
  for (const m of moves){
    const current = tileAt(g, m.x, m.y).entity;
    if (!current) continue;
    if (m.attack){
      tileAt(g, m.x, m.y).entity = null;
      pushLog(g, `${ENEMIES[m.enemy]?.name || "Hostiles"} reached the outskirts and attacked the town.`, "bad");
      raidEvent(g, m.enemy);
      continue;
    }
    if (!inBounds(m.nx,m.ny) || !g.explored[m.nx+","+m.ny]) continue;
    if (Math.abs(m.nx-g.villageX)<=1 && Math.abs(m.ny-g.villageY)<=1) continue;
    const to = tileAt(g, m.nx, m.ny);
    if (!to || to.entity || to.feature || to.settlementBuilding || (m.nx===g.playerX && m.ny===g.playerY) || BIOMES[to.biome].blocks) continue;
    current.originX=current.originX??m.x;current.originY=current.originY??m.y;
    to.entity = current;
    tileAt(g, m.x, m.y).entity = null;
  }
}

function claimWorkSite(x,y){
  const g=G;
  if(!inBounds(x,y) || tileDistance(g,x,y)>1 || _combat || g.survivors[0].health<=0) return;
  const type=tileAt(g, x, y).feature?.type, key=x+","+y;
  const kind=["iron_vein","mine_entrance"].includes(type)?"mine":["fish_pool","spring","stream","pond"].includes(type)?"fish":null;
  if(!kind || g.workSites[key]) return;
  if(!playerPay(g,{wood:2,rope:1})){ pushLog(g,"Marking a worker site needs 2 wood and 1 rope.","warn"); render(); return; }
  g.workSites[key]={kind};
  g.markers[key]=kind==="mine"?"Mining site":"Fishing site";
  passMinutes(g,30); pushLog(g,"Site claimed. Assign workers from the Jobs tab.","good"); render(); save();
}
function establishOutpost(){
  const g=G,key=positionKey(g);
  if(atSettlement(g) || g.workSites[key] || _combat || g.survivors[0].health<=0) return;
  if(!playerPay(g,{wood:6,rope:1})){ pushLog(g,"An outpost needs 6 wood and 1 rope.","warn"); render(); return; }
  g.workSites[key]={kind:"outpost",remaining:1}; g.markers[key]="Supply outpost";
  cacheAt(g); passMinutes(g,30);
  pushLog(g,"Supply outpost established. Haulers can bring cached materials home.","good"); render(); save();
}
function searchNearby(){
  const g=G,spots=[];
  nearbyTile(g,1,(t,x,y)=>{
    if(t.feature && !MAP_FEATURES[t.feature.type]?.hidden) spots.push({t,x,y});
    return false;
  });
  if(!spots.length){ pushLog(g,"No visible feature in reach.","info"); render(); return; }
  showModal({title:"Search nearby",body:"<p>Harvesting and searching take time and use carried tools. Minerals go faster with a pickaxe; deep routes need light.</p>",buttons:[
    ...spots.map(s=>({label:searchNearbyLabel(g,s.t.feature.type),action:()=>{
      closeModal();
      handleFeature(g,s.t,s.x,s.y); // routes underground entrances to their own dialog
      render(); save();
    }})),
    {label:"Cancel",action:closeModal}
  ]});
}

// Button label for a nearby feature: "🪨 Stone Outcrop — 2–5 stone · 30m".
function searchNearbyLabel(g,type){
  const f=MAP_FEATURES[type];
  let label=`${f.icon} ${f.name}`;
  if(f.underground) return `${label} — enter`;
  const bits=[];
  if(f.loot){
    const parts=[];
    for(const r in f.loot){ const [lo,hi]=f.loot[r]; parts.push(`${lo===hi?lo:lo+"–"+hi} ${RESOURCES[r]?RESOURCES[r].name.toLowerCase():r}`); }
    if(parts.length) bits.push(parts.join(", "));
  }
  if(f.heal) bits.push(`+${f.heal} HP`);
  if(f.warmth) bits.push(`+${f.warmth} warmth`);
  bits.push(timeText(featureMinutes(g,type)));
  return `${label} — ${bits.join(" · ")}`;
}

function previewRoute(x,y){
  if(_combat || G.survivors[0].health<=0) return;
  const route=findAutoPath(G,x,y);
  if(!route.length){pushLog(G,"No known passable route there.","warn");render();return;}
  const cost=route.reduce((sum,[rx,ry])=>{const c=travelCost(G,tileAt(G,rx,ry).biome);sum.minutes+=c.minutes;sum.energy+=c.energy;return sum;},{minutes:0,energy:0});
  const arrival=(360+gameMinutes(G)+cost.minutes)%1440;
  const clock=String(Math.floor(arrival/60)).padStart(2,"0")+":"+String(arrival%60).padStart(2,"0");
  showModal({title:"Travel route",body:`<p>${route.length} tiles · ${timeText(cost.minutes)} · ${fmt(cost.energy)} movement energy.</p><p>Estimated arrival ${clock}, before encounters, condition changes and normal phase decay.</p><p>${compassLabel(G)}</p>`,buttons:[
    {label:"Walk route",primary:true,action:()=>{closeModal();startAutoWalk(x,y);}},{label:"Cancel",action:closeModal}
  ]});
}
