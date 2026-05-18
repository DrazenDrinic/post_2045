"use strict";

// ------------------------- RENDER ------------------------------

function el(tag, cls, html){
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html!=null) e.innerHTML = html;
  return e;
}

function bar(label, val, max, color){
  const pct = clamp((val/max)*100, 0, 100);
  return `<div class="bar"><div class="fill" style="width:${pct}%;background:${color}"></div><div class="lbl">${label}</div><div class="val">${Math.round(val)}/${max}</div></div>`;
}

function renderHeader(){
  const g = G;
  document.getElementById("hud-day").textContent = g.day;
  document.getElementById("hud-phase").textContent = PHASES[g.phase];
  document.getElementById("hud-pop").textContent = g.survivors.length;
  document.getElementById("hud-danger").textContent = settlementDanger(g);
  document.getElementById("hud-rep").textContent = Math.round(g.reputation*10)/10;
  document.getElementById("hud-know").textContent = Math.floor(g.knowledge*10)/10;
  const rt = document.getElementById("btn-rt");
  const sp = document.getElementById("btn-speed");
  if (rt) rt.textContent = _rtSpeed ? "Live" : "Paused";
  if (sp) sp.textContent = (_rtSpeed || 1) + "x";
}

function renderLeft(){
  const g = G; const p = g.survivors[0];
  const root = document.getElementById("left-panel");
  root.innerHTML = "";
  // Character card
  const ch = el("div","card");
  ch.innerHTML = `<h3>👤 ${p.isPlayer?"You":p.name}</h3>
    ${bar("❤ Health", p.health, p.maxHealth, "var(--hp)")}
    ${bar("🍞 Hunger", p.hunger, 100, "var(--hunger)")}
    ${bar("💧 Thirst", p.thirst, 100, "var(--thirst)")}
    ${bar("⚡ Energy", p.energy, 100, "var(--energy)")}
    ${bar("😊 Happiness", p.happiness, 100, "var(--happy)")}
    ${bar("🛡 Safety", p.safety, 100, "var(--safety)")}
    ${bar("✨ Morale", p.morale, 100, "var(--morale)")}
    ${bar("🔥 Warmth", p.warmth, 100, "var(--warm)")}
    <div class="muted" style="margin-top:4px;font-size:11px">
      Traits: ${p.traits.map(t=>'<span class="badge">'+TRAITS[t].label+'</span>').join(" ")}
      <br/>Combat ${p.skills.combat} • Building ${p.skills.building} • Farming ${p.skills.farming} • Medicine ${p.skills.medicine}
    </div>
    ${p.diseased? '<div class="bad" style="margin-top:4px">🤒 Diseased</div>' : ""}
    ${p.injured? '<div class="warn" style="margin-top:4px">🩹 Injured</div>' : ""}`;
  root.appendChild(ch);

  // Quick actions
  const qa = el("div","card");
  qa.innerHTML = `<h3>Quick Actions</h3>`;
  const grid = el("div","actgrp");
  const actions = [
    ["eat","🍞 Eat","Restore hunger"],
    ["drink","💧 Drink","Restore thirst"],
    ["rest","💤 Rest","Restore energy (1 phase)"],
    ["chop_wood","🪓 Chop Wood","+wood (1 phase)"],
    ["gather","🌿 Forage","+food, herbs, seeds (1 phase)"],
    ["fetch_water","🪣 Fetch Water","+dirty water (1 phase)"],
    ["boil_water","🔥 Boil Water","2 dirty + 1 wood → 2 water"],
    ["cook","🍳 Cook","meat or crops + wood → food"],
    ["study","📚 Study","1 book → knowledge"],
    ["train","🥋 Train","training yard → combat"],
  ];
  for (const [k,label,sub] of actions){
    const b = el("button","",`${label}<span class="sub">${sub}</span>`);
    b.onclick = ()=> playerAction(k);
    if (k==="study" && g.resources.books < 1) b.disabled = true;
    if (k==="train" && !g.buildings.training_yard) b.disabled = true;
    grid.appendChild(b);
  }
  qa.appendChild(grid);
  root.appendChild(qa);

  // Settlement summary
  const ss = el("div","card");
  const housing = getHousing(g);
  const danger = settlementDanger(g);
  const safety = settlementSafety(g);
  let workersTotal = 0; let workersFree = 0;
  for (const s of adults(g)){ if (s.health>0){ workersTotal++; if (!g.jobs[s.id] || g.jobs[s.id]==="none") workersFree++; } }
  ss.innerHTML = `<h3>🏕 Settlement</h3>
    <div>Population: <b>${g.survivors.length}</b> (${children(g).length} children)</div>
    <div>Housing: <b>${housing}</b> ${g.survivors.length>housing?'<span class="bad">(overcrowded)</span>':""}</div>
    <div>Workers: <b>${workersTotal-workersFree}/${workersTotal-1}</b> assigned${workersFree>1?` <span class="warn">(${workersFree-1} idle)</span>`:""}</div>
    <div>Danger: <span class="${danger>30?'bad':danger>15?'warn':'good'}">${danger}</span> · Safety: <b>${safety}</b></div>
    <div>Reputation: <b>${Math.round(g.reputation*10)/10}</b></div>
    <div>Knowledge: <b>${Math.floor(g.knowledge*10)/10}</b></div>
    <div>Storage cap: <b>${totalStorageCap(g)}</b> (food ${foodStorageCap(g)})</div>`;
  root.appendChild(ss);
}

function renderRight(){
  const g = G;
  const root = document.getElementById("right-panel");
  root.innerHTML = "";
  // Resources
  const rc = el("div","card");
  rc.innerHTML = `<h3>📦 Resources</h3>`;
  const list = el("div","reslist");
  const cap = totalStorageCap(g);
  const fcap = foodStorageCap(g);
  for (const k of RES_KEYS){
    const v = g.resources[k];
    if (v <= 0 && k!=="wood" && k!=="food" && k!=="water" && k!=="knowledge") continue; // hide empties
    const realCap = (k==="food"||k==="crops"||k==="meat") ? fcap : cap;
    const full = v >= realCap*0.95;
    list.innerHTML += `<div class="ri"><span class="nm">${RESOURCES[k].icon} ${RESOURCES[k].name}</span><span class="vl ${full?'full':''}">${fmt(v)}</span></div>`;
  }
  rc.appendChild(list);
  root.appendChild(rc);

  const dc = el("div","card");
  dc.innerHTML = `<h3>📈 Daily Outlook</h3>`;
  const delta = estimateDailyDelta(g);
  const rows = ["food","water","dirty_water","wood","crops","meat","metal","cloth","tools","knowledge"];
  const dl = el("div","reslist");
  for (const k of rows){
    const v = delta[k] || 0;
    if (Math.abs(v) < 0.05) continue;
    const def = k==="knowledge" ? {icon:"📚", name:"Knowledge"} : RESOURCES[k];
    dl.innerHTML += `<div class="ri"><span class="nm">${def.icon} ${def.name}</span><span class="vl ${v<0?'bad':'good'}">${v>0?'+':''}${fmt(v)}/day</span></div>`;
  }
  if (!dl.innerHTML) dl.innerHTML = `<div class="muted">No meaningful production yet.</div>`;
  dc.appendChild(dl);
  root.appendChild(dc);

  // Event log
  const lg = el("div","card");
  lg.innerHTML = `<h3>📜 Event Log</h3>`;
  const logBox = el("div","log");
  for (const e of g.log.slice(0,60)){
    logBox.innerHTML += `<div class="e ${e.type}"><span class="t">D${e.day} ${PHASES[e.phase][0]}</span>${e.msg}</div>`;
  }
  lg.appendChild(logBox);
  root.appendChild(lg);
}

function estimateDailyDelta(g){
  const d = {};
  const add = (k,v)=>{ d[k] = (d[k]||0) + v; };
  for (const id in g.buildings){
    const b = BUILDINGS[id]; if (!b) continue;
    const count = g.buildings[id].count;
    const assigned = g.workerAssign[id] || [];
    const eff = b.effects || {};
    if (eff.produce) for (const r in eff.produce) add(r, eff.produce[r] * count);
    if (eff.produce_per_worker) for (const r in eff.produce_per_worker) add(r, eff.produce_per_worker[r] * assigned.length * workerSkillBonus(g, id, assigned));
    if (eff.consume) for (const r in eff.consume) add(r, -eff.consume[r] * count);
    if (eff.convert && assigned.length){
      const runs = (eff.convert.perWorker || 1) * assigned.length;
      for (const r in eff.convert.from) add(r, -eff.convert.from[r] * runs);
      for (const r in eff.convert.to) add(r, eff.convert.to[r] * runs);
    }
    if (eff.knowledge) add("knowledge", eff.knowledge * count);
    if (eff.knowledge_per_worker) add("knowledge", eff.knowledge_per_worker * assigned.length);
  }
  for (const s of g.survivors){
    if (!s || s.isPlayer || s.isChild || s.health<=0) continue;
    const jobKey = g.jobs[s.id] || s.job || "none";
    const job = JOBS[jobKey];
    if (!job || job.building) continue;
    const boost = workerJobBonus(s, jobKey);
    for (const r in job.output || {}) add(r, job.output[r] * boost);
  }
  const adultsCount = adults(g).filter(s=>s.health>0).length;
  const childCount = children(g).filter(s=>s.health>0).length;
  add("food", -(adultsCount * 0.65 + childCount * 0.35));
  add("water", -(adultsCount * 0.8 + childCount * 0.45));
  if (g.buildings.campfire?.count) add("wood", -1);
  add("knowledge", 0.5 + g.survivors.length * 0.05);
  return d;
}

const TABS = [
  {id:"map", label:"🗺 World Map"},
  {id:"town", label:"🏘 Town"},
  {id:"build", label:"🏗 Build"},
  {id:"survivors", label:"👥 Survivors"},
  {id:"jobs", label:"🛠 Jobs"},
  {id:"knowledge", label:"📚 Knowledge"},
  {id:"buildings", label:"🏠 Buildings"},
  {id:"scout", label:"🧭 Quick Scout"},
  {id:"guide", label:"📖 Guide"},
];
let _activeTab = "town";
let _buildToPlace = null;
let _rtSpeed = 0;
let _rtTimer = null;

function renderTabs(){
  const root = document.getElementById("tabs");
  root.innerHTML = "";
  for (const t of TABS){
    const b = el("button", t.id===_activeTab?"active":"", t.label);
    b.onclick = ()=>{ _activeTab = t.id; render(); };
    root.appendChild(b);
  }
}

function renderContent(){
  const root = document.getElementById("tab-content");
  root.innerHTML = "";
  switch(_activeTab){
    case "map": return renderMapTab(root);
    case "town": return renderTownTab(root);
    case "scout": return renderExploreTab(root);
    case "build": return renderBuildTab(root);
    case "survivors": return renderSurvivorsTab(root);
    case "jobs": return renderJobsTab(root);
    case "knowledge": return renderKnowledgeTab(root);
    case "buildings": return renderBuildingsTab(root);
    case "guide": return renderGuideTab(root);
  }
}

function renderMapTab(root){
  const g = G;
  const wrap = el("div","map-wrap");

  // Controls
  const ctrls = el("div","map-controls");
  const p = g.survivors[0];
  ctrls.innerHTML = _buildToPlace ? `<span><b>Build mode:</b> click clear ground near the campfire to place <b>${BUILDINGS[_buildToPlace].icon} ${BUILDINGS[_buildToPlace].name}</b></span>
    <span class="legend">Buildings and walls are placed on the map around your settlement.</span>` : `<span><b>Move:</b> WASD / Arrows · <b>Click</b> a tile to walk · Walk into entities to interact</span>
    <span class="legend">·  Energy: ${Math.round(p.energy)}/100  ·  Phase: ${PHASES[g.phase]}  ·  Vision: ${(g.phase===3?VISION_NIGHT:VISION_DAY)} tiles</span>`;
  if (_buildToPlace){
    const cancel = el("button", "small", "Cancel build");
    cancel.onclick = ()=>{ _buildToPlace = null; render(); };
    ctrls.appendChild(cancel);
  }
  wrap.appendChild(ctrls);

  // Followers strip
  if (g.followers.length>0){
    const fs = el("div","followers-strip");
    fs.innerHTML = `<b>Following:</b> ` + g.followers.map(s=>`<span class="ftag" title="${s.traits.map(t=>TRAITS[t].label).join(', ')}">${s.isChild?"👶 ":""}${s.name}${s.health<50?' 🩹':''}</span>`).join(" ") +
      `<span class="muted">— bring them next to the campfire 🔥 to recruit.</span>`;
    wrap.appendChild(fs);
  }

  // The grid (viewport centered on player)
  const visible = computeVisible(g);
  const halfW = Math.floor(VIEW_W/2), halfH = Math.floor(VIEW_H/2);
  const minX = clamp(g.playerX - halfW, 0, MAP_W - VIEW_W);
  const minY = clamp(g.playerY - halfH, 0, MAP_H - VIEW_H);

  const grid = el("div","map-grid");
  grid.style.gridTemplateColumns = `repeat(${VIEW_W}, 24px)`;
  grid.style.gridTemplateRows = `repeat(${VIEW_H}, 24px)`;

  for (let vy=0; vy<VIEW_H; vy++){
    for (let vx=0; vx<VIEW_W; vx++){
      const x = minX+vx, y = minY+vy;
      const key = x+","+y;
      const tile = g.map[y][x];
      const isVisible = !!visible[key];
      const isExplored = !!g.explored[key];
      const biome = BIOMES[tile.biome];

      const cell = el("div","tile");
      if (!isExplored) cell.classList.add("unseen");
      else if (!isVisible) cell.classList.add("fog");

      if (isExplored){
        cell.style.background = biome.bg;
        cell.style.color = biome.fg;
        // Biome char (lightly drawn)
        const b = document.createElement("span"); b.className = "biome"; b.textContent = biome.icon; cell.appendChild(b);

        if (isVisible){
          if (tile.settlementBuilding){
            const sb = BUILDINGS[tile.settlementBuilding];
            const se = document.createElement("span"); se.className = "settle";
            se.textContent = sb?.icon || "⌂";
            cell.title = sb ? `${sb.name} — ${sb.desc}` : "Settlement building";
            cell.appendChild(se);
            if (sb?.effects?.wall) cell.classList.add("wall-tile");
          }
          // Feature
          if (tile.feature){
            const f = MAP_FEATURES[tile.feature.type];
            if (f && !f.hidden){
              const fe = document.createElement("span"); fe.className = "feat"; fe.textContent = f.icon;
              cell.title = `${f.name} — ${f.desc}`;
              cell.appendChild(fe);
            }
          }
          if (tile.entity){
            const ent = MAP_ENTITIES[tile.entity.type];
            if (ent){
              // Night stalkers only visible at night
              if (!ent.nightOnly || g.phase===3){
                const en = document.createElement("span"); en.className = "ent"; en.textContent = ent.icon;
                cell.title = `${ent.name}${ent.hostile?" (hostile)":""}`;
                cell.appendChild(en);
                if (Math.abs(x-g.playerX)<=1 && Math.abs(y-g.playerY)<=1){
                  cell.classList.add(ent.hostile?"hostile-adj":"friendly-adj");
                }
              }
            }
          }
        }
      }

      // Village marker
      if (x===g.villageX && y===g.villageY){
        cell.classList.add("village-tile");
        if (isExplored){
          const v = document.createElement("span"); v.className = "settle"; v.textContent = "🔥"; cell.appendChild(v);
          cell.title = "Your campfire and settlement";
        }
      }
      if (_buildToPlace && isExplored && inSettlementBuildArea(g,x,y)){
        cell.classList.add(canPlaceSettlementBuilding(g,_buildToPlace,x,y) ? "build-target" : "build-blocked");
      }
      // Player marker
      if (x===g.playerX && y===g.playerY){
        cell.classList.add("player-tile");
        const pl = document.createElement("span"); pl.className = "pl"; pl.textContent = "🧑";
        cell.appendChild(pl);
        if (g.followers.length>0){
          const fol = document.createElement("span"); fol.className = "fol"; fol.textContent = "+"+g.followers.length;
          cell.appendChild(fol);
        }
      }
      // Click handler
      cell.onclick = ()=>{
        if (_buildToPlace){
          build(_buildToPlace, x, y);
          return;
        }
        if (x===g.playerX && y===g.playerY) return;
        if (!isExplored) return;
        startAutoWalk(x,y);
      };
      grid.appendChild(cell);
    }
  }
  wrap.appendChild(grid);

  // Bottom info: current tile / nearby
  const info = el("div","card");
  const here = g.map[g.playerY][g.playerX];
  const bb = BIOMES[here.biome];
  let info_html = `<h3>📍 ${bb.name} (${g.playerX},${g.playerY})</h3>`;
  if (isAdjacentToVillage(g)) info_html += `<div class="good">You are at your settlement. Followers will join here.</div>`;
  if (_buildToPlace) info_html += `<div class="warn">Build mode active: place ${BUILDINGS[_buildToPlace].name} inside the highlighted settlement area.</div>`;
  info_html += `<div class="muted">Nearby:</div>`;
  const nearby = [];
  for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++){
    const x=g.playerX+dx, y=g.playerY+dy;
    if (!inBounds(x,y)) continue;
    if (dx===0 && dy===0) continue;
    const t = g.map[y][x];
    if (!g.explored[x+","+y]) continue;
    if (t.feature && !MAP_FEATURES[t.feature.type].hidden){
      const f = MAP_FEATURES[t.feature.type];
      nearby.push(`${f.icon} ${f.name}`);
    }
    if (t.entity){
      const e = MAP_ENTITIES[t.entity.type];
      if (e && (!e.nightOnly || g.phase===3)) nearby.push(`${e.icon} ${e.name}${e.hostile?" ⚠":""}`);
    }
  }
  info_html += nearby.length ? `<div>${nearby.join(" · ")}</div>` : `<div class="dim">Nothing of note.</div>`;
  info.innerHTML = info_html;
  wrap.appendChild(info);

  // Biome legend
  const legend = el("div","biome-key");
  legend.innerHTML = Object.values(BIOMES).map(b=>`<span><i style="background:${b.bg}"></i>${b.name}</span>`).join("");
  wrap.appendChild(legend);

  root.appendChild(wrap);
}

function renderExploreTab(root){
  const g = G;
  const c = el("div","card");
  c.innerHTML = `<h3>🗺 Scavenging Locations</h3><div class="muted">Each trip takes time and energy. Greater dangers hide greater rewards.</div>`;
  const grid = el("div");
  for (const k in LOCATIONS){
    const l = LOCATIONS[k];
    const item = el("div","item");
    item.innerHTML = `<div class="head"><span class="name">${l.icon} ${l.name}</span> <span class="danger-level">Danger ${l.danger}</span></div>
      <div class="desc">Loot: ${Object.entries(l.loot).map(([r,ab])=>`${RESOURCES[r].icon}${ab[0]}-${ab[1]} ${RESOURCES[r].name}`).join(", ")}</div>
      <div class="desc">Time: ${l.time} phases · Energy: ${l.energy}</div>
      <div class="desc">Possible foes: ${l.foundEnemies.map(e=>ENEMIES[e].name).join(", ")}</div>`;
    const btn = el("button","primary small","Explore");
    btn.onclick = ()=> explore(k);
    if (g.survivors[0].energy < l.energy) btn.disabled = true;
    item.appendChild(btn);
    grid.appendChild(item);
  }
  c.appendChild(grid);
  root.appendChild(c);
}

function buildingClass(id){
  const cat = (BUILDINGS[id]?.cat || "misc").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `cat-${cat}`;
}

function buildingYieldText(b){
  const eff = b.effects || {};
  const bits = [];
  if (eff.housing) bits.push(`Housing +${eff.housing}`);
  if (eff.storage) bits.push(`Storage +${eff.storage}`);
  if (eff.food_storage) bits.push(`Food storage +${eff.food_storage}`);
  if (eff.wall) bits.push(`Defense +${eff.wall}`);
  if (eff.safety_per_worker) bits.push(`Safety/worker +${eff.safety_per_worker}`);
  if (eff.produce) bits.push("Produces " + Object.keys(eff.produce).map(k=>RESOURCES[k]?.name||k).join("/"));
  if (eff.produce_per_worker) bits.push("Workers produce " + Object.keys(eff.produce_per_worker).map(k=>RESOURCES[k]?.name||k).join("/"));
  if (eff.convert) bits.push("Converts resources");
  if (eff.knowledge || eff.knowledge_per_worker) bits.push("Knowledge");
  return bits.slice(0, 2).join(" · ") || b.desc;
}

function townPeopleByTile(g){
  const byTile = {};
  const add = (x,y,s)=>{
    const key = x + "," + y;
    if (!byTile[key]) byTile[key] = [];
    byTile[key].push(s);
  };
  const cx = Math.floor(TOWN_W/2), cy = Math.floor(TOWN_H/2);
  if (g.survivors[0]) add(cx, cy, g.survivors[0]);
  const buildingTiles = {};
  for (let y=0; y<TOWN_H; y++) for (let x=0; x<TOWN_W; x++){
    const id = g.town[y]?.[x]?.building;
    if (!id) continue;
    if (!buildingTiles[id]) buildingTiles[id] = [];
    buildingTiles[id].push([x,y]);
  }
  for (const bid in g.workerAssign){
    const tiles = buildingTiles[bid] || [];
    if (!tiles.length) continue;
    let i = 0;
    for (const sid of g.workerAssign[bid] || []){
      const s = survivorById(g, sid);
      if (!s) continue;
      const pos = tiles[i % tiles.length];
      add(pos[0], pos[1], s);
      i++;
    }
  }
  const idle = g.survivors.filter(s=>s && !s.isPlayer && (!g.jobs[s.id] || g.jobs[s.id]==="none"));
  const campRing = [[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]];
  idle.forEach((s,i)=>{
    const d = campRing[i % campRing.length];
    add(clamp(cx+d[0],0,TOWN_W-1), clamp(cy+d[1],0,TOWN_H-1), s);
  });
  return byTile;
}

function renderTownPeople(people){
  if (!people || !people.length) return "";
  const tokens = people.slice(0, 3).map(s=>{
    const initial = escapeHtml((s.name || "?").trim()[0] || "?");
    return `<span class="person-token ${s.isPlayer?"player":""}" title="${escapeHtml(s.name || "Survivor")}">${initial}</span>`;
  }).join("");
  return `<div class="town-people">${tokens}${people.length>3?`<span class="person-more">+${people.length-3}</span>`:""}</div>`;
}

function renderTownTab(root){
  const g = G;
  if (!g.town) initTown(g);
  const wrap = el("div","town-wrap");
  const controls = el("div","town-controls");
  const selected = _buildToPlace ? BUILDINGS[_buildToPlace] : null;
  controls.innerHTML = `<div class="strategy-title"><b>Settlement Command</b><span class="muted">Ash-age city building. Pick a structure, then claim a plot.</span></div>
    <div class="strategy-stats">
      <span>Housing <b>${g.survivors.length}/${getHousing(g)}</b></span>
      <span>Workers <b>${workforce(g).length}</b></span>
      <span>Safety <b>${settlementSafety(g)}</b></span>
      <span>Danger <b>${settlementDanger(g)}</b></span>
      <span>Storage <b>${totalStorageCap(g)}</b></span>
    </div>
    <div class="strategy-order">Order: <span class="town-selected">${selected ? selected.icon + " " + selected.name : "Select a building from the Build tab"}</span></div>`;
  if (selected){
    const cancel = el("button", "small", "Cancel placement");
    cancel.onclick = ()=>{ _buildToPlace = null; render(); };
    controls.appendChild(cancel);
  }
  wrap.appendChild(controls);
  const grid = el("div","town-grid");
  const cx = Math.floor(TOWN_W/2), cy = Math.floor(TOWN_H/2);
  const peopleByTile = townPeopleByTile(g);
  for (let y=0; y<TOWN_H; y++){
    for (let x=0; x<TOWN_W; x++){
      const slot = g.town[y][x];
      const cell = el("div","town-tile " + (slot ? "occupied" : "empty"));
      if (x===cx && y===cy) cell.classList.add("center");
      if (slot){
        const b = BUILDINGS[slot.building];
        if (b?.effects?.wall) cell.classList.add("wall");
        cell.innerHTML = `${renderTownPeople(peopleByTile[x+","+y])}<div class="town-building ${buildingClass(slot.building)}">
          <span class="building-icon">${b?.icon || "?"}</span>
          <span class="building-name">${b?.name || slot.building}</span>
        </div>`;
        cell.title = b ? `${b.name}: ${b.desc}` : slot.building;
      } else {
        if (_buildToPlace) {
          const b = BUILDINGS[_buildToPlace];
          cell.classList.add("buildable");
          cell.innerHTML = `${renderTownPeople(peopleByTile[x+","+y])}<div class="town-building ghost ${buildingClass(_buildToPlace)}"><span class="building-icon">${b.icon}</span></div>`;
        } else {
          cell.innerHTML = `${renderTownPeople(peopleByTile[x+","+y])}<span class="terrain-mark">${(x+y)%5===0 ? "·" : ""}</span>`;
        }
        cell.title = _buildToPlace ? `Place ${BUILDINGS[_buildToPlace].name}` : "Empty plot";
        cell.onclick = ()=>{
          if (!_buildToPlace){ pushLog(G,"Select a building from the Build tab first.","info"); render(); return; }
          build(_buildToPlace, x, y);
        };
      }
      grid.appendChild(cell);
    }
  }
  wrap.appendChild(grid);
  const built = el("div","card");
  const placed = {};
  for (let y=0; y<TOWN_H; y++) for (let x=0; x<TOWN_W; x++){
    const id = g.town[y][x]?.building;
    if (id) placed[id] = (placed[id]||0)+1;
  }
  built.innerHTML = `<h3>City Districts</h3>` + Object.entries(placed).map(([id,n])=>`<span class="district-chip ${buildingClass(id)}">${BUILDINGS[id]?.icon||""} ${BUILDINGS[id]?.name||id}: <b>${n}</b></span>`).join(" ");
  wrap.appendChild(built);
  root.appendChild(wrap);
}

function renderBuildTab(root){
  const g = G;
  const c = el("div","card");
  c.innerHTML = `<h3>🏗 Construct Buildings</h3><div class="muted">Starter strategy buildings are available now. Research expands your city into farms, industry, medicine, trade, and heavier defenses.</div>`;
  // categories
  const cats = {};
  for (const id in BUILDINGS){
    const b = BUILDINGS[id];
    if (!cats[b.cat]) cats[b.cat] = [];
    cats[b.cat].push(id);
  }
  for (const cat of Object.keys(cats)){
    const h = el("h4","muted","— "+cat+" —");
    c.appendChild(h);
    const grid = el("div","grid2");
    for (const id of cats[cat]){
      const b = BUILDINGS[id];
      const built = g.buildings[id]?.count || 0;
      const unlocked = isUnlocked(g, id);
      const item = el("div","item");
      item.classList.add("build-card", buildingClass(id));
      item.innerHTML = `<div class="build-preview"><div class="town-building ${buildingClass(id)}"><span class="building-icon">${b.icon}</span></div></div>
        <div class="head"><span class="name">${b.icon} ${b.name}</span> <span class="meta">${built}/${b.max}</span></div>
        <div class="desc">${b.desc}</div>
        <div class="effect">${buildingYieldText(b)}</div>
        <div class="cost">Cost: ${costString(b.cost) || "Free"}</div>
        ${b.workers?`<div class="effect">Workers: ${b.workers}</div>`:""}`;
      const btn = el("button","primary small", _buildToPlace===id ? "Selected for map placement" : "Place on Map");
      btn.disabled = !unlocked || !canPay(g,b.cost) || built>=b.max;
      btn.onclick = ()=> build(id);
      item.appendChild(btn);
      if (!unlocked){
        const lk = el("div","dim","🔒 Locked — requires " + unlockRequirement(g, id));
        item.appendChild(lk);
      }
      grid.appendChild(item);
    }
    c.appendChild(grid);
  }
  root.appendChild(c);
}

function unlockRequirement(g, buildingId){
  const nodes = KNOWLEDGE.filter(n => (n.unlock?.buildings||[]).includes(buildingId));
  if (!nodes.length) return "research";
  const ready = nodes.find(n => n.req.every(r=>g.knownNodes[r]));
  const n = ready || nodes[0];
  return `${n.name} (${n.cost} knowledge)`;
}

function renderSurvivorsTab(root){
  const g = G;
  const c = el("div","card");
  c.innerHTML = `<h3>👥 Survivors (${g.survivors.length})</h3>`;
  for (const s of g.survivors){
    const partner = s.partnerId ? survivorById(g, s.partnerId) : null;
    const div = el("div","surv");
    div.innerHTML = `<div class="head"><div><b>${s.isPlayer?"⭐ ":""}${s.name}</b>${s.isChild?" 👶":""} <span class="muted">${s.isChild?"child":"adult, age "+s.age}</span></div>
      <div class="muted">${s.isPlayer?"(You)":""}</div></div>
      <div class="traits">${s.traits.map(t=>'<span class="badge">'+TRAITS[t].label+'</span>').join(" ")}
        ${partner?'<span class="badge">💞 '+partner.name+'</span>':""}
        ${s.diseased?'<span class="badge" style="background:#5a1f1f;color:#ffb0b0">🤒 Diseased</span>':""}
        ${s.injured?'<span class="badge" style="background:#5a3a1f;color:#ffd5a0">🩹 Injured</span>':""}
      </div>
      <div class="bars">
        ${bar("❤", s.health, s.maxHealth, "var(--hp)")}
        ${bar("🍞", s.hunger, 100, "var(--hunger)")}
        ${bar("💧", s.thirst, 100, "var(--thirst)")}
        ${bar("⚡", s.energy, 100, "var(--energy)")}
        ${bar("😊", s.happiness, 100, "var(--happy)")}
        ${bar("✨", s.morale, 100, "var(--morale)")}
      </div>
      <div class="muted" style="font-size:11px;margin-top:4px">
        Job: <b>${JOBS[s.job||"none"].name}</b> · Days: ${s.daysSurvived}
      </div>`;
    c.appendChild(div);
  }
  root.appendChild(c);
}

function renderJobsTab(root){
  const g = G;
  const c = el("div","card");
  c.innerHTML = `<h3>🛠 Assign Jobs</h3><div class="muted">Buildings have worker slots. General jobs (woodcutter, gatherer, water carrier, scavenger) don't need a building.</div>`;
  const list = el("div");
  for (const s of adults(g)){
    if (s.isPlayer) continue;
    const cur = g.jobs[s.id] || "none";
    const item = el("div","item");
    let opts = "";
    for (const jk of JOB_KEYS){
      const j = JOBS[jk];
      const available = jobAvailable(g, jk) || jk===cur;
      if (j.building){
        if (!g.buildings[j.building]) continue;
      }
      opts += `<option value="${jk}" ${jk===cur?"selected":""} ${available?"":"disabled"}>${j.name}${j.building?" ("+BUILDINGS[j.building].name+")":""}</option>`;
    }
    item.innerHTML = `<div class="head"><span class="name">${s.name}</span> <span class="muted">${s.traits.map(t=>TRAITS[t].label).join(", ")}</span></div>
      <div class="desc">${JOBS[cur].desc}</div>`;
    const sel = el("select");
    sel.innerHTML = opts;
    sel.onchange = ()=> assignJob(s.id, sel.value);
    item.appendChild(sel);
    list.appendChild(item);
  }
  if (adults(g).length<=1){
    list.innerHTML = `<div class="muted">No other survivors yet. Explore to find some.</div>`;
  }
  c.appendChild(list);
  root.appendChild(c);

  // Building worker assignments
  const wc = el("div","card");
  wc.innerHTML = `<h3>🏠 Worker Slots</h3>`;
  for (const id in g.buildings){
    const b = BUILDINGS[id]; if (!b) continue;
    if (!b.workers) continue;
    const slots = b.workers * g.buildings[id].count;
    const used = (g.workerAssign[id]||[]).length;
    const item = el("div","item");
    item.innerHTML = `<div class="head"><span class="name">${b.icon} ${b.name}</span> <span class="meta">${used}/${slots} workers</span></div>
      <div class="desc">${(g.workerAssign[id]||[]).map(uid=>survivorById(g,uid)?.name).filter(Boolean).join(", ") || "(none)"}</div>`;
    wc.appendChild(item);
  }
  root.appendChild(wc);
}

function renderKnowledgeTab(root){
  const g = G;
  const c = el("div","card");
  c.innerHTML = `<h3>📚 Knowledge Tree</h3><div class="muted">Knowledge: <b>${Math.floor(g.knowledge*10)/10}</b>. Earn it by surviving, scavenging books, libraries, and schools.</div>`;
  const cats = {};
  for (const n of KNOWLEDGE){ if(!cats[n.cat]) cats[n.cat] = []; cats[n.cat].push(n); }
  for (const cat in cats){
    const wrap = el("div","kcat");
    wrap.innerHTML = `<h4>${cat}</h4>`;
    for (const n of cats[cat]){
      const have = !!g.knownNodes[n.id];
      const reqMet = n.req.every(r=>g.knownNodes[r]);
      const canBuy = reqMet && g.knowledge >= n.cost && !have;
      const cls = have ? "unlocked" : (canBuy?"available":"locked");
      const node = el("span","knode "+cls);
      const unlocks = (n.unlock?.buildings||[]).map(b=>BUILDINGS[b]?.name).filter(Boolean).join(", ");
      node.innerHTML = `${have?"✔ ":""}${n.name} <span class="muted">(${n.cost})</span>`;
      node.title = `${n.desc}${unlocks?"\nUnlocks: "+unlocks:""}${n.req.length?"\nRequires: "+n.req.map(r=>KNOWLEDGE.find(x=>x.id===r).name).join(", "):""}`;
      if (canBuy) node.onclick = ()=> research(n.id);
      wrap.appendChild(node);
    }
    c.appendChild(wrap);
  }
  root.appendChild(c);
}

function renderBuildingsTab(root){
  const g = G;
  const c = el("div","card");
  c.innerHTML = `<h3>🏠 Built Structures</h3>`;
  const ids = Object.keys(g.buildings).filter(id=>g.buildings[id].count>0);
  if (ids.length===0){
    c.innerHTML += `<div class="muted">Nothing built yet.</div>`;
  } else {
    const grid = el("div","grid2");
    for (const id of ids){
      const b = BUILDINGS[id]; if (!b) continue;
      const item = el("div","item");
      const eff = describeEffects(b);
      item.innerHTML = `<div class="head"><span class="name">${b.icon} ${b.name}</span> <span class="meta">x${g.buildings[id].count}</span></div>
        <div class="desc">${b.desc}</div>
        <div class="effect">${eff}</div>
        ${b.workers? `<div class="meta">${(g.workerAssign[id]||[]).length}/${b.workers*g.buildings[id].count} workers</div>`:""}`;
      grid.appendChild(item);
    }
    c.appendChild(grid);
  }
  root.appendChild(c);
}

function describeEffects(b){
  const eff = b.effects || {};
  const parts = [];
  if (eff.housing) parts.push("+"+eff.housing+" housing");
  if (eff.storage) parts.push("+"+eff.storage+" storage");
  if (eff.food_storage) parts.push("+"+eff.food_storage+" food storage");
  if (eff.warmth) parts.push("warmth");
  if (eff.produce) parts.push(Object.entries(eff.produce).map(([k,v])=>"+"+v+" "+RESOURCES[k].name+"/day").join(", "));
  if (eff.produce_per_worker) parts.push(Object.entries(eff.produce_per_worker).map(([k,v])=>"+"+v+" "+RESOURCES[k].name+"/worker/day").join(", "));
  if (eff.convert) parts.push("converts "+Object.entries(eff.convert.from).map(([k,v])=>v+" "+RESOURCES[k].name).join("+")+" → "+Object.entries(eff.convert.to).map(([k,v])=>v+" "+RESOURCES[k].name).join("+")+" /worker");
  if (eff.knowledge_per_worker) parts.push("+"+eff.knowledge_per_worker+" knowledge/worker/day");
  if (eff.heal_per_worker) parts.push("heals "+eff.heal_per_worker+"/worker/day");
  if (eff.happiness_all) parts.push("+"+eff.happiness_all+" happiness aura");
  if (eff.morale_all) parts.push("+"+eff.morale_all+" morale aura");
  if (eff.safety_per_worker) parts.push("+"+eff.safety_per_worker+" safety/worker");
  if (eff.wall) parts.push("+"+eff.wall+" wall");
  if (eff.warning) parts.push("early warning");
  if (eff.danger_reduce) parts.push("-"+eff.danger_reduce+" danger");
  if (eff.attract_chance) parts.push("attracts newcomers");
  if (eff.trade_chance) parts.push("attracts traders");
  if (eff.reputation) parts.push("+reputation");
  return parts.join(" • ");
}

function renderGuideTab(root){
  const c = el("div","card");
  c.innerHTML = `
    <h3>📖 Post 2045 — Player Guide</h3>
    <div class="muted">Everything you need to know to survive and rebuild. Use the table of contents to jump to a section.</div>
    <div class="guide-toc">
      <a href="#g-overview">Overview</a>
      <a href="#g-controls">Controls</a>
      <a href="#g-needs">Needs &amp; Status</a>
      <a href="#g-actions">Quick Actions</a>
      <a href="#g-map">World Map</a>
      <a href="#g-encounters">Encounters</a>
      <a href="#g-combat">Combat</a>
      <a href="#g-build">Building</a>
      <a href="#g-jobs">Jobs &amp; Workers</a>
      <a href="#g-knowledge">Knowledge</a>
      <a href="#g-survivors">Survivors &amp; Family</a>
      <a href="#g-defense">Defense &amp; Raids</a>
      <a href="#g-progression">Early-Game Walkthrough</a>
      <a href="#g-tips">Tips</a>
      <a href="#g-save">Save / Load</a>
    </div>

    <div class="guide-section" id="g-overview">
      <h3>🌍 Overview</h3>
      <p>You wake by a campfire in a ruined world. The goal is simple: <b>survive, find other people, and rebuild a settlement</b>. Each day passes in four phases (Morning, Midday, Evening, Night). Actions and movement consume time; the world ticks around you.</p>
      <p>You play one named survivor (you). As you recruit others, they take jobs and produce resources automatically while you continue exploring.</p>
    </div>

    <div class="guide-section" id="g-controls">
      <h3>🎮 Controls</h3>
      <ul>
        <li><b>Move</b>: <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd></li>
        <li><b>Click a tile</b> on the World Map to auto-walk to it.</li>
        <li><kbd>Space</kbd> cancels auto-walk.</li>
        <li><b>Live / Paused</b> in the header toggles real-time ticking. The speed button cycles 1x / 2x / 3x.</li>
        <li><b>Sleep</b> button (top-right) sleeps until next morning.</li>
        <li><b>Save / Load / Reset</b> are in the header. Game also autosaves after every action.</li>
        <li>Tabs switch between map, build, survivors, jobs, knowledge, buildings, scout, and this guide.</li>
      </ul>
    </div>

    <div class="guide-section" id="g-needs">
      <h3>❤️ Needs &amp; Status</h3>
      <p>Each survivor (including you) tracks these stats — shown as bars in the left panel:</p>
      <ul>
        <li><b>❤ Health</b> — max usually 100 (tough trait = 120). At 0, you die.</li>
        <li><b>🍞 Hunger</b> — drops every tick. Eat food / cooked meals to refill.</li>
        <li><b>💧 Thirst</b> — drops faster than hunger. Drink clean water (or risky dirty water).</li>
        <li><b>⚡ Energy</b> — used by every action and step. Below 5 = too exhausted to do anything. Rest or sleep restores it.</li>
        <li><b>🔥 Warmth</b> — drops at night and in cold biomes (snow). Campfire and shelter help.</li>
        <li><b>😊 Happiness</b> — affected by hunger, thirst, cold, building auras (inn, tavern, shrine).</li>
        <li><b>✨ Morale</b> — average of happiness and settlement safety.</li>
        <li><b>🛡 Safety</b> — settlement-wide; raised by guards, walls and watchtowers.</li>
      </ul>
      <p><b>Conditions</b>: <span class="bad">🤒 Diseased</span> drains health every tick — cure with medicine or wait. <span class="warn">🩹 Injured</span> when below 50 HP; clinic workers heal it.</p>
    </div>

    <div class="guide-section" id="g-actions">
      <h3>⚡ Quick Actions (Left Panel)</h3>
      <p>These let you do small chores anywhere on the map. Each costs energy and most consume one phase of time.</p>
      <ul>
        <li><b>🍞 Eat</b> — instant, uses 1 food, +30 hunger.</li>
        <li><b>💧 Drink</b> — instant, uses water or risky dirty water.</li>
        <li><b>💤 Rest</b> — short rest, +15–25 energy (1 phase).</li>
        <li><b>🪓 Chop Wood</b> — +3–6 wood (1 phase).</li>
        <li><b>🌿 Forage</b> — +food, herbs, seeds (1 phase).</li>
        <li><b>🪣 Fetch Water</b> — +3–6 dirty water (1 phase).</li>
        <li><b>🔥 Boil Water</b> — 2 dirty + 1 wood → 2 clean water.</li>
        <li><b>🍳 Cook</b> — 1 meat or 2 crops + 1 wood → 3 food.</li>
      </ul>
      <p>Also via the header: <b>Sleep</b> jumps to next morning (+60 energy), and there's <b>Train</b> and <b>Study</b> if you've built the right things.</p>
    </div>

    <div class="guide-section" id="g-map">
      <h3>🗺 World Map</h3>
      <p>The map is a 60×36 grid of biomes. Your viewport follows you. Tiles you've seen are remembered (fog); unseen tiles are black. <b>Vision shrinks at night</b> from 6 tiles to 3.</p>
      <p>Movement cost depends on biome — roads (1) are fastest, plains (1), forest (2), mountains/deep forest (3). Rivers and lakes <b>block</b> movement entirely. Low warmth, hunger, thirst, injury, and disease make walking cost more energy. Each step drains energy and, after enough steps, advances the world clock by a phase.</p>
      <p><b>Hazardous biomes</b>: swamps and irradiated zones can damage you when you walk through; radiation can give you disease. Snow drains warmth fast.</p>
      <p><b>Your village</b> is the 🔥 marker — adjacent to it, your followers join your settlement and you're "at home" for trading/recruiting purposes.</p>
    </div>

    <div class="guide-section" id="g-encounters">
      <h3>🧭 Encounters (walk into things)</h3>
      <p>The map is full of <b>features</b> (resource nodes, ruins, oddities) and <b>entities</b> (people and creatures). To interact, just walk onto the tile.</p>
      <ul>
        <li><b>Resource features</b> (berry bushes, dead trees, stone outcrops, scrap piles…) — auto-looted. They have a number of charges and disappear when depleted.</li>
        <li><b>Underground entrances</b> (⛏ mines, 🕳 caves / drains, 🚇 subway stairs) — open an expedition dialog. Shallow routes are safer; deep routes take more time and energy but have better loot and more danger.</li>
        <li><b>Water sources</b> (springs, ponds, streams, wells) — unlimited charges; springs/wells give clean water.</li>
        <li><b>Ruins</b> (houses, hospitals, factories, libraries…) — best loot, often dangerous nearby.</li>
        <li><b>Hidden hazards</b> (landmines, traps, pitfalls) — invisible until you step on them. Hurt!</li>
        <li><b>Friendly NPCs</b> (🧒 child, 🤕 wounded, 🚶 wanderer, 🧙 hermit, 🩺 doctor, 🔧 mechanic, 📖 scholar, 🐶 dog, 👨‍👩‍👧 refugees…) — open a dialog with options. Pick "Take with you" and they'll appear in the "Following" strip. Walk to your 🔥 campfire to recruit them.</li>
        <li><b>Hostile entities</b> (🐺 wolves, 🐻 bears, 🧟 infected, 🥷 raiders, 👹 mutants…) — start combat on contact. Some (🦇 night stalkers) only appear at night.</li>
        <li><b>Events</b> (strange shrines, old radios, music boxes, caches, glowing woods, map fragments, signal fires, graveyards) — trigger random good or bad effects.</li>
      </ul>
    </div>

    <div class="guide-section" id="g-combat">
      <h3>⚔ Combat</h3>
      <p>When you bump into a hostile entity a combat modal opens. Two buttons:</p>
      <ul>
        <li><b>Attack</b> — deal damage based on combat skill + weapon bonus + traits. With <b>weapons</b> equipped, you get +6 dmg, and with <b>ammo</b> there's a 30% chance to fire for +6–12 extra (consumes ammo).</li>
        <li><b>Flee</b> — 40% base chance, +20% if quick trait, −5% per enemy danger level. Costs energy.</li>
      </ul>
      <p><b>Damage mitigation</b>: 1 leather in storage reduces enemy hits by 2; 1 tools by 1.</p>
      <p><b>Losing</b> doesn't auto-kill — you crawl home, losing ~20% of supplies. If your HP hits 0, the game ends.</p>
    </div>

    <div class="guide-section" id="g-build">
      <h3>🏗 Building</h3>
      <p>Open the <b>Build</b> tab, choose <b>Place</b>, then click an empty plot in the <b>Town</b> tab. Buildings are grouped by category: Shelter, Storage, Water, Food, Medicine, Community, Education, Crafting, Engineering, Defense, Trade.</p>
      <ul>
        <li>Buildings cost resources up-front and take 1 phase to construct.</li>
        <li>Each building has a <b>max count</b> — you can't spam the same thing forever.</li>
        <li>Most buildings need to be <b>unlocked by research</b> first.</li>
        <li>Many buildings provide <b>worker slots</b>; assign survivors in the Jobs tab to make them produce.</li>
      </ul>
      <p><b>Storage</b>: base cap is 80 per resource. Storage sheds (+100), warehouses (+400), food cellars (+200 food/crops/meat) raise it. Excess food spoils.</p>
      <p><b>Housing</b>: each survivor needs a roof. Overcrowding hurts happiness and blocks new births / recruits leaving.</p>
    </div>

    <div class="guide-section" id="g-jobs">
      <h3>🛠 Jobs &amp; Workers</h3>
      <p>Adults (not you) can be assigned a job in the Jobs tab.</p>
      <ul>
        <li><b>General jobs</b> (woodcutter, gatherer, water carrier, scavenger) need no building — they go out and bring back resources daily. Scavengers risk injury.</li>
        <li><b>Building jobs</b> (carpenter, hunter, healer, smith…) only work when the matching building is built and has open slots.</li>
        <li>Worker output is multiplied by <b>traits</b> (hardworking +25%, hunter at lodge +30%, farmer at field +30%, etc.) and reduced by low happiness or low health.</li>
        <li>Use the Worker Slots card to see which buildings have open slots.</li>
      </ul>
      <p>The player (you) can't take a job — you're the active actor.</p>
    </div>

    <div class="guide-section" id="g-knowledge">
      <h3>📚 Knowledge &amp; Research</h3>
      <p>Knowledge is earned by:</p>
      <ul>
        <li>Surviving each day (+0.5 base + 0.05 per survivor)</li>
        <li>Reading books (Study action, +2–5 each)</li>
        <li>Libraries and Schools (per worker / per day)</li>
        <li>Library ruins, Hermits, Wise Elders, Scholars, and a few map events</li>
      </ul>
      <p>Spend knowledge in the <b>Knowledge</b> tab to unlock nodes. Nodes are gated by prerequisites and grouped by category: Survival → Building → Farming → Medicine → Combat → Crafting → Engineering → Trade → Community → Education. Each unlocked node enables new buildings (and sometimes jobs).</p>
    </div>

    <div class="guide-section" id="g-survivors">
      <h3>👥 Survivors &amp; Family</h3>
      <p>Other survivors arrive by:</p>
      <ul>
        <li>Walking into a friendly NPC on the map and recruiting them.</li>
        <li>Random arrivals (boosted by Inn, Signal Tower, reputation).</li>
        <li>Scavenging in old ruins.</li>
      </ul>
      <p><b>Traits</b> (Brave, Hardworking, Medic, Hunter, Builder, Cook, etc.) modify combat, job output, and morale auras.</p>
      <p><b>Relationships</b>: unpartnered adults may form bonds (if housing allows). Partners may have a <b>child</b> on day-end (slow rate, needs spare housing). Children grow over ~20 days into adults; <b>schools</b> double growth speed.</p>
    </div>

    <div class="guide-section" id="g-defense">
      <h3>🛡 Defense &amp; Raids</h3>
      <p>As your settlement grows (population × buildings × stored loot × reputation) the <b>Danger</b> stat rises. Each day there's a chance of:</p>
      <ul>
        <li><b>Raids</b> — raiders, bandits, wolves, infected. They deal damage to random survivors and may steal supplies or damage buildings.</li>
        <li><b>Disease</b> — more likely when water is scarce.</li>
        <li><b>Fires</b> — small chance to destroy a building.</li>
      </ul>
      <p><b>Mitigations</b>: Palisades / Gates / Trap Lines add wall value. Guard Posts / Watchtowers / Barracks add safety per assigned worker. Watchtowers and Scout Camps reduce raid chance via early warning. Town Hall reduces danger directly. Stockpiled weapons reduce raid damage by 20%.</p>
    </div>

    <div class="guide-section" id="g-progression">
      <h3>🚀 Early-Game Walkthrough</h3>
      <ol>
        <li><b>Day 1</b>: Stay near the campfire. Chop wood (×2), fetch dirty water, boil it.</li>
        <li><b>Day 2</b>: Find a nearby <b>spring</b> or <b>pond</b> on the map for water. Forage berry bushes / mushrooms for food.</li>
        <li><b>Research</b> <b>Survival Basics</b> → unlocks tents and rain barrels. Build a tent for a roof.</li>
        <li><b>Research</b> <b>Basic Building</b> → unlocks shelter and storage shed. Build a storage shed to raise resource caps.</li>
        <li><b>Find a survivor</b> — walk the map looking for 🚶 wanderers, 🧒 lost children, 🩺 doctors, etc. Bring them to your campfire.</li>
        <li>Once you have helpers: research <b>Farming</b> → build a garden, assign a Gardener. Research <b>Crafting</b> → workshop, carpenter.</li>
        <li><b>Mid-game</b>: <b>Defense</b> → guard post + palisades before danger gets above 15. <b>Medicine</b> → herbalist for disease cures. <b>Masonry</b> → stone huts for better housing.</li>
        <li><b>Late game</b>: Large Structures (warehouse, town hall, barracks), Greenhouses, Forge, Mechanics, Library.</li>
      </ol>
    </div>

    <div class="guide-section" id="g-tips">
      <h3>💡 Tips</h3>
      <ul>
        <li><b>Never drink dirty water at full thirst</b> — 15% chance of disease. Boil it instead.</li>
        <li><b>Watch energy at dusk</b>. Don't get caught far from your camp at night — vision drops and warmth drains.</li>
        <li>Auto-walk halts on damage taken or low energy, so it's safe to click ahead.</li>
        <li>Some tiles are <b>hidden hazards</b> — landmines on roads, traps in forests. Watch your HP and don't take shortcuts through ruins.</li>
        <li>If you find a 🗺 map fragment or 📻 old radio, use them — they reveal big chunks of the map.</li>
        <li>Hot springs (♨) heal 6 HP and add 25 warmth — bookmark their location!</li>
        <li>Excess food spoils when storage is &gt;90% full. Build a food cellar before scaling up farms.</li>
        <li><b>The Inn / Signal Tower</b> attracts new survivors over time — let it tick while you're away exploring.</li>
        <li>Stockpile <b>weapons + ammo</b> before researching big builds — they reduce raid damage.</li>
      </ul>
    </div>

    <div class="guide-section" id="g-save">
      <h3>💾 Save / Load</h3>
      <p>The game autosaves after every action to your browser's local storage. Use the <b>Save</b> / <b>Load</b> buttons in the header for manual control. <b>Reset</b> wipes your save and starts a new run. If you clear browser data, your run is gone.</p>
    </div>
  `;
  root.appendChild(c);
}

// ------------------------- HINT SYSTEM ------------------------------
// Thinking hint — pops up when the player has been idle and stuck.
// Kept entirely in module-level state, NOT in G.

let _hintTimeout = null;
const HINT_DELAY_MS = 10000;
let _hintLast = "";

function scheduleHint(){
  if (_hintTimeout) clearTimeout(_hintTimeout);
  hideHint();
  _hintTimeout = setTimeout(showHint, HINT_DELAY_MS);
}

function hideHint(){
  const h = document.getElementById("claude-hint");
  if (h) h.classList.add("hidden");
}

function showHint(){
  if (!G) return;
  // Don't show during combat or other modals
  if (document.getElementById("modal-root").firstChild) {
    _hintTimeout = setTimeout(showHint, HINT_DELAY_MS);
    return;
  }
  const text = detectHint(G);
  if (!text) return;
  _hintLast = text;
  let h = document.getElementById("claude-hint");
  if (!h){
    h = document.createElement("div");
    h.id = "claude-hint";
    document.body.appendChild(h);
  }
  h.classList.remove("hidden");
  const thinker = escapeHtml(G.playerName || G.survivors[0]?.name || "Player");
  h.innerHTML = `<div class="hint-avatar" title="Thinking…">🤔</div>
    <div class="hint-bubble">
      <button class="hint-close" title="Dismiss">×</button>
      <span class="hint-label">${thinker} is thinking…</span>
      <div class="hint-text">${text}</div>
    </div>`;
  h.querySelector(".hint-close").onclick = ()=>{
    hideHint();
    // wait longer before nagging again
    if (_hintTimeout) clearTimeout(_hintTimeout);
    _hintTimeout = setTimeout(showHint, HINT_DELAY_MS * 3);
  };
}

function detectHint(g){
  const p = g.survivors[0];
  if (!p || p.health <= 0) return null;

  // Critical needs first
  if (p.energy < 15) return "I'm exhausted — I should <b>Sleep</b> (top-right button) or use the <b>💤 Rest</b> action. Walking with empty energy will get me stuck.";
  if (p.thirst < 20){
    if (g.resources.water >= 1) return "I'm parched. I have clean water — hit the <b>💧 Drink</b> action in the left panel.";
    if (g.resources.dirty_water >= 2 && g.resources.wood >= 1) return "I'm parched. Use <b>🔥 Boil Water</b> to turn dirty water into safe water, then drink.";
    return "I'm parched and there's no water at camp. I should find a <b>spring (💧), pond, stream</b>, or the river on the map — then bring it back and boil it.";
  }
  if (p.hunger < 20){
    if (g.resources.food >= 1) return "Starving — hit <b>🍞 Eat</b> in Quick Actions.";
    if (g.resources.meat >= 1 || g.resources.crops >= 2) return "Starving. I have ingredients — use <b>🍳 Cook</b> to make food, then eat.";
    return "Starving and the larder is empty. I should <b>🌿 Forage</b>, hunt a deer carcass, or walk to a berry bush on the map.";
  }
  if (p.health < 30) return "I'm hurt badly. Get back to camp, rest, and find medicine. Hot springs (♨) on the map also heal.";
  if (p.diseased){
    if (g.resources.medicine >= 1) return "I'm sick — the day-end will use a medicine to cure me. Sit tight, or build a Clinic / Herbalist for ongoing care.";
    return "I'm <b>diseased</b>. I need medicine — search hospitals, medicine cabinets, or research <b>Herbalism</b> to brew it from herbs.";
  }
  if (p.warmth < 25){
    if (g.phase === 3) return "I'm freezing at night. Get next to the 🔥 campfire — adjacent tiles share warmth. Or find a hot spring.";
    return "I'm cold. Head back toward camp and the campfire, or find shelter.";
  }

  // Resource shortages
  if (g.resources.wood < 2) return "Wood is almost gone — without it I can't boil water or keep the fire going. <b>🪓 Chop Wood</b>, or find a dead tree / fallen log on the map.";
  if (g.resources.water < 1 && g.resources.dirty_water < 1) return "No water at all in storage. Find a water source on the map (springs and wells are best) before thirst becomes critical.";
  if (g.resources.food < 2) return "Food is running low. Forage, hunt, cook meat/crops, or build a Garden once Farming is researched.";

  // Settlement / progression
  const housing = getHousing(g);
  if (housing <= g.survivors.length) return `Housing is full (${g.survivors.length}/${housing}). New recruits and babies need a roof — build a tent or shelter from the <b>🏗 Build</b> tab.`;

  if (g.survivors.length < 2 && g.day >= 2) return "Still alone. Explore the world map looking for friendly NPCs (🚶 wanderers, 🧒 children, 🩺 doctors). Walk into them to talk.";

  // Idle workers
  let workersFree = 0;
  for (const s of g.survivors){
    if (s.isPlayer || s.isChild || s.health <= 0) continue;
    const j = g.jobs[s.id];
    if (!j || j === "none") workersFree++;
  }
  if (workersFree > 0) return `${workersFree} survivor${workersFree>1?'s are':' is'} idle. Open the <b>🛠 Jobs</b> tab and assign them — they'll bring back wood, water, food, or work in buildings.`;

  // Knowledge available
  if (g.knowledge >= 5){
    const ready = KNOWLEDGE.filter(n => !g.knownNodes[n.id] && n.req.every(r=>g.knownNodes[r]) && g.knowledge >= n.cost);
    if (ready.length) return `I have <b>${Math.floor(g.knowledge)} knowledge</b> and ${ready.length} research${ready.length>1?'es':''} I can buy (e.g. <b>${ready[0].name}</b>). Open the <b>📚 Knowledge</b> tab.`;
  }

  // Danger creeping up
  const dng = settlementDanger(g);
  if (dng > 20){
    let walls = 0;
    for (const id in g.buildings){
      const b = BUILDINGS[id];
      if (b?.effects?.wall) walls += b.effects.wall * g.buildings[id].count;
    }
    if (walls < 20) return `Danger is at <b>${dng}</b> and defenses are thin. Research <b>Defense</b> / <b>Fortifications</b>, then build palisades, guard posts and watchtowers before the next raid.`;
  }

  // Player at full energy with nothing pressing — encourage exploration
  if (p.energy > 70 && p.hunger > 60 && p.thirst > 60){
    const generic = [
      "All my needs are met — good time to push out into the map. New tiles often have ruins, caches, or NPCs.",
      "Calm moment. I could spend it researching new knowledge or building something from the Build tab.",
      "Solid state. If I have books, <b>📚 Study</b> is a fast way to earn knowledge.",
      "Maybe scout deeper into the map — library ruins and hidden caches give big rewards.",
    ];
    // avoid repeating last hint
    const filtered = generic.filter(g=>g!==_hintLast);
    return filtered[Math.floor(Math.random()*filtered.length)];
  }

  return null;
}

function render(){
  renderHeader();
  renderLeft();
  renderRight();
  renderTabs();
  renderContent();
  scheduleHint();
}

function setRealtimeSpeed(speed){
  _rtSpeed = clamp(speed, 0, 3);
  if (_rtTimer) clearInterval(_rtTimer);
  _rtTimer = null;
  if (_rtSpeed > 0){
    _rtTimer = setInterval(realtimeTick, REALTIME_MS[_rtSpeed]);
  }
  renderHeader();
}

function realtimeTick(){
  if (!G || document.getElementById("modal-root").firstChild) return;
  if (G.survivors[0]?.health <= 0) return;
  advanceOnePhase(G);
  pushLog(G, "Time passes...", "dim");
  render(); save();
}

function toggleRealtime(){
  setRealtimeSpeed(_rtSpeed ? 0 : 1);
}

function cycleRealtimeSpeed(){
  const next = _rtSpeed === 0 ? 1 : (_rtSpeed % 3) + 1;
  setRealtimeSpeed(next);
}
