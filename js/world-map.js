"use strict";

// ------------------------- MAP / WORLD ------------------------------

function generateMap(g){
  // Initialize all plains
  const map = [];
  for (let y=0; y<MAP_H; y++){
    const row = [];
    for (let x=0; x<MAP_W; x++){
      row.push({biome:"plains", feature:null, entity:null, settlementBuilding:null});
    }
    map.push(row);
  }
  // Random biome blobs
  const blobs = [
    {biome:"forest",      count:28, size:[4,10]},
    {biome:"deep_forest", count:12, size:[3,7]},
    {biome:"mountain",    count:20, size:[4,9]},
    {biome:"hills",       count:24, size:[3,8]},
    {biome:"swamp",       count:12, size:[3,7]},
    {biome:"ruins",       count:24, size:[3,8]},
    {biome:"radio",       count:8, size:[3,6]},
    {biome:"desert",      count:12, size:[4,9]},
    {biome:"snow",        count:8, size:[3,7]},
    {biome:"lake",        count:10, size:[3,5]},
  ];
  for (const b of blobs){
    for (let i=0; i<b.count; i++){
      const x = rint(2, MAP_W-3), y = rint(2, MAP_H-3);
      const size = rint(b.size[0], b.size[1]);
      paintBlob(map, x, y, size, b.biome);
    }
  }
  // River
  let rx = rint(8, MAP_W-8);
  for (let y=0; y<MAP_H; y++){
    if (rx>=0 && rx<MAP_W) map[y][rx].biome = "river";
    if (chance(0.4)) rx += chance(0.5) ? -1 : 1;
    rx = clamp(rx, 1, MAP_W-2);
  }
  // A horizontal road
  let ry = rint(6, MAP_H-6);
  for (let x=0; x<MAP_W; x++){
    if (map[ry][x].biome !== "river") map[ry][x].biome = "road";
    if (chance(0.25)) ry += chance(0.5) ? -1 : 1;
    ry = clamp(ry, 2, MAP_H-3);
  }

  // Place village near center but on a calm biome
  const vx = Math.floor(MAP_W/2);
  const vy = Math.floor(MAP_H/2);
  // Find a passable, non-hazardous tile near center
  let chosen = null;
  for (let r=0; r<8 && !chosen; r++){
    for (let dy=-r; dy<=r && !chosen; dy++){
      for (let dx=-r; dx<=r && !chosen; dx++){
        const x = vx+dx, y = vy+dy;
        if (x<2||y<2||x>=MAP_W-2||y>=MAP_H-2) continue;
        const b = BIOMES[map[y][x].biome];
        if (!b.blocks && !b.hazard && !b.radiation){ chosen = [x,y]; }
      }
    }
  }
  if (!chosen) chosen = [vx,vy];
  g.villageX = chosen[0]; g.villageY = chosen[1];
  g.playerX = g.villageX; g.playerY = g.villageY;
  // Clear a buildable settlement footprint around the campfire.
  for (let dy=-7; dy<=7; dy++){
    for (let dx=-10; dx<=10; dx++){
      const x = g.villageX+dx, y = g.villageY+dy;
      if (x>=0&&y>=0&&x<MAP_W&&y<MAP_H){
        map[y][x].entity = null;
        map[y][x].feature = null;
        map[y][x].settlementBuilding = null;
        if (BIOMES[map[y][x].biome].blocks || BIOMES[map[y][x].biome].hazard || BIOMES[map[y][x].biome].radiation) map[y][x].biome = "plains";
      }
    }
  }
  map[g.villageY][g.villageX].biome = "village";
  map[g.villageY][g.villageX].settlementBuilding = "campfire";

  g.map = map;
  g.explored = {};

  // Sprinkle features
  populateFeatures(g, 1400);
  // Sprinkle entities
  populateEntities(g, 650);
  // A fresh run always has reachable basics for tools, shelter and drinking water.
  for (const [dx,dy,type] of [[2,0,"spring"],[-2,0,"stone_outcrop"],[0,2,"reeds"],[0,-2,"fallen_log"]]){
    map[g.villageY+dy][g.villageX+dx].feature={type,charges:MAP_FEATURES[type].charges};
    map[g.villageY+dy][g.villageX+dx].entity=null;
  }
  // Place the unique Old Sage within sight of the village
  placeSage(g);

  // Reveal area around village
  for (let dy=-7; dy<=7; dy++)
    for (let dx=-10; dx<=10; dx++){
      const x=g.villageX+dx, y=g.villageY+dy;
      if (inBounds(x,y)) g.explored[x+","+y] = true;
    }
}

function paintBlob(map, cx, cy, size, biome){
  for (let y=Math.max(0,cy-size); y<=Math.min(MAP_H-1,cy+size); y++){
    for (let x=Math.max(0,cx-size); x<=Math.min(MAP_W-1,cx+size); x++){
      const d = Math.hypot(x-cx, y-cy);
      if (d <= size && rng() < (1 - d/size)){
        map[y][x].biome = biome;
      }
    }
  }
}

function inBounds(x,y){ return x>=0 && y>=0 && x<MAP_W && y<MAP_H; }

function inSettlementBuildArea(g, x, y){
  return Math.abs(x-g.villageX) <= 10 && Math.abs(y-g.villageY) <= 7;
}

function canPlaceSettlementBuilding(g, id, x, y){
  if (!inBounds(x,y) || !inSettlementBuildArea(g,x,y)) return false;
  if (x===g.villageX && y===g.villageY) return false;
  const t = g.map[y][x];
  if (!t || t.settlementBuilding || t.entity || t.feature || g.camps?.[x+","+y] || g.workSites?.[x+","+y]) return false;
  return !BIOMES[t.biome].blocks && !BIOMES[t.biome].hazard && !BIOMES[t.biome].radiation;
}

function placeSettlementBuilding(g, id, x, y){
  if (!canPlaceSettlementBuilding(g,id,x,y)) return false;
  g.map[y][x].settlementBuilding = id;
  const tx = Math.floor(TOWN_W/2) + (x - g.villageX);
  const ty = Math.floor(TOWN_H/2) + (y - g.villageY);
  if (inTownBounds(tx,ty) && !g.town[ty][tx]) placeTownBuilding(g,id,tx,ty);
  return true;
}

function tilesByBiome(g){
  const idx = {};
  for (let y=0;y<MAP_H;y++) for (let x=0;x<MAP_W;x++){
    const b = g.map[y][x].biome;
    if (!idx[b]) idx[b] = [];
    idx[b].push([x,y]);
  }
  return idx;
}

function populateFeatures(g, target){
  const featureKeys = Object.keys(MAP_FEATURES);
  let placed = 0, tries = 0;
  while (placed < target && tries < target*30){
    tries++;
    const fk = pick(featureKeys);
    const f = MAP_FEATURES[fk];
    if (f.rare && !chance(0.2)) continue;
    const bk = pick(f.biomes);
    // Find a tile of that biome
    const x = rint(0, MAP_W-1), y = rint(0, MAP_H-1);
    if (!inBounds(x,y)) continue;
    const t = g.map[y][x];
    if (t.biome !== bk) continue;
    if (t.feature || t.entity) continue;
    // Don't place on village or directly adjacent
    if (Math.abs(x-g.villageX)<=1 && Math.abs(y-g.villageY)<=1) continue;
    t.feature = {type:fk, charges:f.charges};
    placed++;
  }
}

function populateEntities(g, target){
  const entityKeys = Object.keys(MAP_ENTITIES);
  let placed = 0, tries = 0;
  while (placed < target && tries < target*40){
    tries++;
    const ek = pick(entityKeys);
    const e = MAP_ENTITIES[ek];
    if (e.unique) continue;
    const bk = pick(e.biomes||["plains"]);
    const x = rint(0, MAP_W-1), y = rint(0, MAP_H-1);
    if (!inBounds(x,y)) continue;
    const t = g.map[y][x];
    if (t.biome !== bk) continue;
    if (t.feature || t.entity) continue;
    if (BIOMES[t.biome].blocks) continue;
    if (Math.abs(x-g.villageX)<=2 && Math.abs(y-g.villageY)<=2) continue;
    t.entity = {type:ek};
    placed++;
  }
}

// Place the unique Old Sage NPC a few tiles from the village on a passable tile.
// Idempotent: if a sage is already placed (per g.sageX/sageY), do nothing.
function placeSage(g){
  if (g.sageX!=null && g.sageY!=null
      && inBounds(g.sageX, g.sageY)
      && g.map[g.sageY][g.sageX].entity
      && g.map[g.sageY][g.sageX].entity.type==="sage_npc"){
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
        const t = g.map[y][x];
        const b = BIOMES[t.biome];
        if (b.blocks || b.hazard || b.radiation) continue;
        if (t.entity || t.feature) continue;
        if (x===g.villageX && y===g.villageY) continue;
        candidates.push([x,y]);
      }
    }
    if (candidates.length){
      const [x,y] = pick(candidates);
      g.map[y][x].entity = {type:"sage_npc"};
      g.sageX = x; g.sageY = y;
      return;
    }
  }
  // Fallback: drop him directly east of the village, clearing whatever was there.
  let x = clamp(g.villageX+3, 1, MAP_W-2), y = g.villageY;
  g.map[y][x].feature = null;
  g.map[y][x].entity = {type:"sage_npc"};
  if (BIOMES[g.map[y][x].biome].blocks) g.map[y][x].biome = "plains";
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
  const t = g.map[ny][nx];
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
  if (BIOMES[g.map[ty][tx].biome].blocks) return [];
  const start = g.playerX+","+g.playerY;
  const goal = tx+","+ty;
  // Dijkstra with a binary heap: roads can beat a shorter mountain route.
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
  push([0,g.playerX,g.playerY]);
  const distance = {[start]:0};
  const came = {[start]: null};
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  while(queue.length){
    const [d,x,y] = pop();
    if(d!==distance[x+","+y]) continue;
    if (x===tx && y===ty) break;
    for (const [dx,dy] of dirs){
      const nx=x+dx, ny=y+dy, key=nx+","+ny;
      if (!inBounds(nx,ny)) continue;
      if (!g.explored[key]) continue;
      const b = BIOMES[g.map[ny][nx].biome];
      if (b.blocks) continue;
      const next=d+travelCost(g,g.map[ny][nx].biome).minutes;
      if(next >= (distance[key] ?? Infinity)) continue;
      distance[key]=next;
      came[key] = [x,y];
      push([next,nx,ny]);
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
  const amount=carriedTool(g,"bucket")?5:carriedTool(g,"canteen")?3:2;
  addPlayerResource(g, kind==="clean" ? "water" : "dirty_water", amount);
  p.energy = clamp(p.energy - 1, 0, 100);
  pushLog(g, `Fetched ${amount} ${kind==="clean"?"clean":"dirty"} water.`, "good");
  passMinutes(g, ACTION_COSTS.fetch_water);
  render(); save();
}

function openTileActionDialog(g, x, y){
  if (!inBounds(x,y)) return;
  const tile = g.map[y][x];
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
  if (building) lines.push(`<p><b>Settlement:</b> ${building.icon} ${escapeHtml(building.name)} — ${escapeHtml(building.desc || "")}</p>`);
  lines.push(`<p class="muted">Distance: ${dist} tile${dist===1?"":"s"}. Right-click nearby tiles to choose an action.</p>`);
  const buttons = [];
  if (!(x===g.playerX && y===g.playerY) && !biome.blocks){
    const route=findAutoPath(g,x,y);
    const minutes=route.reduce((n,[rx,ry])=>n+travelCost(g,g.map[ry][rx].biome).minutes,0);
    const energy=route.reduce((n,[rx,ry])=>n+travelCost(g,g.map[ry][rx].biome).energy,0);
    lines.push(`<p class="info">Known route: ${route.length?`${timeText(minutes)} / ${fmt(energy)} energy`:"no route"}.</p>`);
    buttons.push({label:"Walk here", primary:true, action:()=>{ closeModal(); startAutoWalk(x,y); }});
  }
  if (feature && !feature.hidden){
    const minutes=feature.underground?null:featureMinutes(g,t.feature.type);
    buttons.push({label:dist<=1 ? `Search / use${minutes!=null?` (${timeText(minutes)})`:""}` : "Walk closer to search", action:()=>{
      closeModal();
      if (dist<=1){ handleFeature(g, tile, x, y); render(); save(); }
      else startAutoWalk(x,y);
    }});
  }
  const waterKind = tileWaterKind(tile);
  if (waterKind){
    buttons.push({label:`Fetch ${waterKind} water (10m)`,disabled:dist>1, action:()=>{ closeModal(); fetchWaterFromTile(g, tile); }});
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
  buttons.push({label:"Cancel", action:closeModal});
  showModal({title:titleParts.join(" / "), body:lines.join(""), buttons});
}

// --- Encounters ---

function encounterTile(g, x, y){
  const t = g.map[y][x];
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
    if (!inBounds(nx,ny)) continue;
    const t = g.map[ny][nx];
    if (!t || t.entity || t.feature || t.settlementBuilding) continue;
    if (BIOMES[t.biome].blocks || BIOMES[t.biome].hazard || BIOMES[t.biome].radiation) continue;
    if (Math.abs(nx-g.playerX) <= 1 && Math.abs(ny-g.playerY) <= 1) continue;
    options.push([nx,ny]);
  }
  if (!options.length) return false;
  const [nx,ny] = pick(options);
  g.map[ny][nx].entity = g.map[y][x].entity;
  g.map[y][x].entity = null;
  return true;
}

function handleFeature(g, t, x, y){
  if (!t.feature || tileDistance(g,x,y)>1 || g.survivors[0].health<=0 || _combat) return;
  const f = MAP_FEATURES[t.feature.type];
  if (!f) return;
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
    triggerEvent(g, f, t, x, y);
    if(p.health<=0) removeDead(g); else passMinutes(g,15);
    return;
  }

  // Underground entrances stay on the map and open a repeatable expedition choice.
  if (f.underground){
    openUndergroundDialog(g, f.underground, t, x, y);
    return;
  }

  // Explicit harvesting consumes a node charge and the matching tool's durability.
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
        const gained = addPlayerResource(g, r, amt);
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

  if (f.charges < 99){
    t.feature.charges--;
    if (t.feature.charges <= 0) t.feature = null;
  }
  if (p.health<=0){ removeDead(g); return; }
  if(!_combat) passMinutes(g,minutes);
}

function featureMinutes(g,type){
  const f=MAP_FEATURES[type];
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
        const gain = addPlayerResource(g,r,amt);
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
      const got = addPlayerResource(g,"bones",rint(2,4));
      if (got>0) pushLog(g,`You collect bones from the graveyard. (+${got})`,"info");
      if (chance(0.25)){ p.morale = clamp(p.morale-10,0,100); pushLog(g,"The silence weighs on you.","warn"); }
      break;
    }
  }
  t.feature = null;
}

function openUndergroundDialog(g, siteKey, tile, x, y){
  const site = UNDERGROUND_SITES[siteKey];
  if (!site) return;
  const p = g.survivors[0];
  showModal({
    title:`${site.icon} ${site.name}`,
    body:`<p>${site.desc}</p><p class="muted">Underground trips cost energy and time. Deeper routes offer better loot, but may hurt you or trigger combat.</p><p>Energy: <b>${Math.round(p.energy)}/100</b></p>`,
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
  if((G.undergroundCooldowns[key] || 0)>gameMinutes(G)){ pushLog(G,"This route needs a day before another search.","warn"); closeModal(); render(); return; }
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
    const amt = rint(lo, hi);
    if (amt>0){
      const gained = addCarried(G, r, amt);
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
  if (tile?.feature && tile.feature.charges < 99){
    tile.feature.charges--;
    if (tile.feature.charges<=0) tile.feature = null;
  }
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
        const t = g.map[y][x];
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
            g.map[y][x].entity = null;
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
              g.map[y][x].entity = null;
              pushLog(g, `You patched up ${surv.name}, who now follows you.`, "good");
              closeModal(); render(); save();
            }},
          {label:"Bind their wounds (slow, no medicine, may die)", action:()=>{
            if (chance(0.55)){
              surv.health = 50;
              g.followers.push(surv);
              g.map[y][x].entity = null;
              pushLog(g, `${surv.name} survives your rough care and follows you.`,"good");
            } else {
              g.map[y][x].entity = null;
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
            g.map[y][x].entity = null;
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
            addPlayerResource(g, "books", rint(0,1));
            pushLog(g, `The hermit shares wisdom. +${k} knowledge.`,"good");
            g.map[y][x].entity = null;
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
            g.map[y][x].entity = null;
            closeModal(); render(); save();
          }},
          {label:"Leave them be", action:()=>{ closeModal(); }}
        ]
      });
      return;
    }
    case "trader":{
      g.map[y][x].entity = null;
      traderArrives(g,true);
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
            const m = addPlayerResource(g,"meat",rint(2,4));
            const h = addPlayerResource(g,"hides",rint(1,2));
            g.followers.push(s);
            g.map[y][x].entity = null;
            pushLog(g, `${s.name} joins you. (+${m} meat, +${h} hides)`,"good");
            closeModal(); render(); save();
          }},
          {label:"Trade meat for ammo", action:()=>{
            if (!playerPay(g,{ammo:2})){ pushLog(g,"Not enough carried ammo to trade.","warn"); closeModal(); return; }
            addPlayerResource(g,"meat",4);
            g.map[y][x].entity = null;
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
            g.map[y][x].entity = null;
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
            g.map[y][x].entity = null;
            closeModal(); render(); save();
          }},
          {label:"Help them home (recruit)", action:()=>{
            const s = makeSurvivor();
            s.firstName = pick(FIRST_NAMES); s.lastName = pick(LAST_NAMES);
            s.name = `${s.firstName} ${s.lastName}`;
            s.age = rint(60,80);
            if (!s.traits.includes("leader")) s.traits.push("leader");
            g.followers.push(s);
            g.map[y][x].entity = null;
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
            g.map[y][x].entity = null;
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
            addPlayerResource(g,"parts",rint(2,4));
            addPlayerResource(g,"tools",rint(1,2));
            g.followers.push(s);
            g.map[y][x].entity = null;
            pushLog(g, `${s.name} joins your party.`, "good");
            closeModal(); render(); save();
          }},
          {label:"Trade parts for tools", action:()=>{
            if (!playerPay(g,{metal:5})){ pushLog(g,"Need 5 accessible metal.","warn"); closeModal(); return; }
            addPlayerResource(g,"tools",2); addPlayerResource(g,"parts",2);
            g.map[y][x].entity = null;
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
            addPlayerResource(g,"books",rint(1,3));
            g.knowledge += rint(2,4);
            g.followers.push(s);
            g.map[y][x].entity = null;
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
            g.map[y][x].entity = null;
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

// Daily map refresh — restock some features and entities
function refreshMapDaily(g){
  if (!g.map) return;
  // Sometimes regrow resource nodes
  for (let i=0; i<35; i++){
    const x = rint(0, MAP_W-1), y = rint(0, MAP_H-1);
    const t = g.map[y][x];
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
  for (let i=0; i<12; i++){
    if (!chance(0.6)) continue;
    const x = rint(0, MAP_W-1), y = rint(0, MAP_H-1);
    const t = g.map[y][x];
    if (t.feature || t.entity || t.settlementBuilding || g.camps[x+","+y] || BIOMES[t.biome].blocks) continue;
    if (Math.abs(x-g.villageX)<=3 && Math.abs(y-g.villageY)<=3) continue;
    // mostly hostile to keep pressure
    const roll = rng();
    const pool = roll < 0.35 ? Object.keys(MAP_ENTITIES).filter(k=>MAP_ENTITIES[k].friendly)
               : roll < 0.7 ? Object.keys(MAP_ENTITIES).filter(k=>MAP_ENTITIES[k].huntable)
               : Object.keys(MAP_ENTITIES).filter(k=>MAP_ENTITIES[k].hostile);
    const fits = pool.filter(k=>(MAP_ENTITIES[k].biomes||[]).includes(t.biome));
    if (!fits.length) continue;
    t.entity = {type:pick(fits)};
  }
}

function moveMapEntities(g){
  const moves = [];
  for (let y=0; y<MAP_H; y++) for (let x=0; x<MAP_W; x++){
    const entState = g.map[y][x].entity;
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
    const current = g.map[m.y]?.[m.x]?.entity;
    if (!current) continue;
    if (m.attack){
      g.map[m.y][m.x].entity = null;
      pushLog(g, `${ENEMIES[m.enemy]?.name || "Hostiles"} reached the outskirts and attacked the town.`, "bad");
      raidEvent(g, m.enemy);
      continue;
    }
    if (!inBounds(m.nx,m.ny)) continue;
    if (Math.abs(m.nx-g.villageX)<=1 && Math.abs(m.ny-g.villageY)<=1) continue;
    const to = g.map[m.ny][m.nx];
    if (!to || to.entity || to.feature || to.settlementBuilding || (m.nx===g.playerX && m.ny===g.playerY) || BIOMES[to.biome].blocks) continue;
    to.entity = current;
    g.map[m.y][m.x].entity = null;
  }
}

function claimWorkSite(x,y){
  const g=G;
  if(!inBounds(x,y) || tileDistance(g,x,y)>1 || _combat || g.survivors[0].health<=0) return;
  const type=g.map[y][x].feature?.type, key=x+","+y;
  const kind=["iron_vein","mine_entrance"].includes(type)?"mine":["fish_pool","spring","stream","pond"].includes(type)?"fish":null;
  if(!kind || g.workSites[key]) return;
  if(!playerPay(g,{wood:2,rope:1})){ pushLog(g,"Marking a worker site needs 2 wood and 1 rope.","warn"); render(); return; }
  g.workSites[key]={kind,remaining:kind==="mine"?40:1000000};
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
  showModal({title:"Search nearby",body:"<p>Harvesting and searching take time and use carried tools. Minerals need a pickaxe; deep routes need light.</p>",buttons:[
    ...spots.map(s=>({label:MAP_FEATURES[s.t.feature.type].name,action:()=>{closeModal();openTileActionDialog(g,s.x,s.y);}})),
    {label:"Cancel",action:closeModal}
  ]});
}

function previewRoute(x,y){
  if(_combat || G.survivors[0].health<=0) return;
  const route=findAutoPath(G,x,y);
  if(!route.length){pushLog(G,"No known passable route there.","warn");render();return;}
  const cost=route.reduce((sum,[rx,ry])=>{const c=travelCost(G,G.map[ry][rx].biome);sum.minutes+=c.minutes;sum.energy+=c.energy;return sum;},{minutes:0,energy:0});
  const arrival=(360+gameMinutes(G)+cost.minutes)%1440;
  const clock=String(Math.floor(arrival/60)).padStart(2,"0")+":"+String(arrival%60).padStart(2,"0");
  showModal({title:"Travel route",body:`<p>${route.length} tiles · ${timeText(cost.minutes)} · ${fmt(cost.energy)} movement energy.</p><p>Estimated arrival ${clock}, before encounters, condition changes and normal phase decay.</p><p>${compassLabel(G)}</p>`,buttons:[
    {label:"Walk route",primary:true,action:()=>{closeModal();startAutoWalk(x,y);}},{label:"Cancel",action:closeModal}
  ]});
}
