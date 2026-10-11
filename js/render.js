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

function gameClockLabel(g){
  const phaseMinutes = 6 * 60;
  const minutes = (6 * 60) + (g.phase * phaseMinutes) + Math.floor(g.phaseMinutes || 0);
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}

function renderHeader(){
  const g = G;
  document.getElementById("hud-day").textContent = g.day;
  document.getElementById("hud-phase").textContent = PHASES[g.phase];
  document.getElementById("hud-clock").textContent = gameClockLabel(g);
  document.getElementById("hud-pop").textContent = g.survivors.length;
  const dangerEl = document.getElementById("hud-danger");
  const dng = settlementDanger(g);
  dangerEl.textContent = dng;
  dangerEl.className = dng > 30 ? "bad" : dng > 15 ? "warn" : "good";
  document.getElementById("hud-rep").textContent = Math.round(g.reputation*10)/10;
  document.getElementById("hud-know").textContent = Math.floor(g.knowledge*10)/10;
  const phaseIco = document.getElementById("hud-phase-ico");
  if (phaseIco) phaseIco.textContent = ["🌅","☀️","🌇","🌙"][g.phase] || "🌅";
  const weatherIco = document.getElementById("hud-weather-ico");
  if (weatherIco) weatherIco.textContent = {clear:"🌤", rain:"🌧", cold:"❄️"}[g.weather.type] || "🌤";
  const rt = document.getElementById("btn-rt");
  const sp = document.getElementById("btn-speed");
  if (rt) rt.textContent = _rtSpeed ? "Live" : "Paused";
  if (sp) sp.textContent = (_rtSpeed || 1) + "x";
  const weather=document.getElementById("hud-weather");
  if(weather) weather.textContent=weatherLabel(g.weather.type);
}

// ------------------------- CONTEXT-MENU PROVIDERS ------------------------------
// Each returns {title, info, actions} for showContextMenu (modal.js). Reused by
// the right-click handlers wired onto quick actions, the stockpile, town
// buildings, build cards and survivors.

const QUICK_ACTION_ICONS = {
  eat:"🍞", drink:"💧", rest:"💤", bandage:"🩹", warm_fire:"♨️",
  chop_wood:"🪓", gather:"🌿", fetch_water:"🪣", gather_fiber:"🧵", gather_stone:"🪨",
  mine:"⛏", dig:"🪏", fish:"🎣", hunt:"🦌", survey:"🧭",
  cook:"🍳", boil_water:"🔥", purify_water:"🧪", craft_arrows:"🏹", pitch_tent:"⛺",
  lay_bag:"🛌", lean_to:"🛖", light_fire:"🔦", pack_camp:"🎒", gather_spirits:"🎺",
  study:"📖", train:"🥋",
};

function quickActionContext(g, k, icon, label, sub){
  const blocker = quickActionBlocker(g, k),source=gatheringSource(g,k);
  const info = `<b>${timeText(actionMinutes(g,k))}</b> · ${ACTION_ENERGY[k] || 0} energy<br>${escapeHtml(sub)}`
    + (source?`<br>${escapeHtml(sourceStatus(g,source,source.keys))}`:"")
    + (blocker ? `<br><span class="bad">${escapeHtml(blocker)}</span>` : "");
  return { title: `${icon} ${label}`, info, actions: [
    { label: "Do it", sub: timeText(actionMinutes(g,k)), disabled: !!blocker, title: blocker || "", action: ()=>playerAction(k) },
  ]};
}

function resourceContext(g, k){
  const r = RESOURCES[k]; if (!r) return null;
  const makers = new Set(), users = new Set();
  for (const id in BUILDINGS){ const b = BUILDINGS[id], e = b.effects || {};
    if ((e.produce && k in e.produce) || (e.produce_per_worker && k in e.produce_per_worker) || (e.convert && e.convert.to && k in e.convert.to)) makers.add(b.name);
    if ((e.consume && k in e.consume) || (e.convert && e.convert.from && k in e.convert.from)) users.add(b.name);
  }
  for (const id in JOBS){ const j = JOBS[id]; if (j.output && k in j.output) makers.add(j.name); if (j.consume && k in j.consume) users.add(j.name); }
  for (const id in RECIPES){ const rc = RECIPES[id], nm = rc.name || (rc.item && ITEMS[rc.item] ? ITEMS[rc.item].name : id);
    if (rc.output && k in rc.output) makers.add(nm); if (rc.cost && k in rc.cost) users.add(nm); }
  const weight = RESOURCE_WEIGHTS[k] != null ? RESOURCE_WEIGHTS[k] : 0.3;
  const trim = s => [...s].slice(0,10).join(", ") + ([...s].length>10 ? "…" : "");
  const info = `Carried: <b>${fmt(g.inventory.resources[k]||0)}</b> · Stored at base: <b>${fmt(g.resources[k]||0)}</b> · ${weight} load each<br>Base can accept ${fmt(storageRoom(g,k))} more of this resource (shared space)`
    + (makers.size ? `<br><b>Made by:</b> ${trim(makers)}` : "")
    + (users.size ? `<br><b>Used by:</b> ${trim(users)}` : "");
  return { title: `${r.icon} ${r.name}`, info, actions: [] };
}

// Shared storage readout: general space, food cellar, and contributing buildings.
function storageBreakdown(g){
  const u = storageUsage(g);
  const lines = [`General storage <b>${fmt(u.general)} / ${totalStorageCap(g)}</b> load (resources, gear and food not held in a cellar)`,
    (u.cellar>0) ? `Food cellar <b>${fmt(u.food)} / ${fmt(u.cellar)}</b> load (food only; overflow spills into general)` : ""];
  const contrib = [];
  for (const id in g.buildings){
    const b = BUILDINGS[id], e = b.effects || {}, cnt = g.buildings[id].count;
    if (e.storage) contrib.push(`${b.icon} ${b.name} +${e.storage*cnt}`);
    if (e.food_storage) contrib.push(`${b.icon} ${b.name} +${e.food_storage*cnt} food`);
  }
  if (contrib.length) lines.push(`<b>Storage buildings:</b> ${contrib.join(", ")}`);
  lines.push(`Base space starts at ${BASE_RES_CAP} shared load.`);
  return lines.filter(Boolean).join("<br>");
}

function stockpileContext(g){
  const home = storageAccess(g);
  return { title: "🗄 Stored at base", info:
      storageBreakdown(g)
      + `<br><b>Access:</b> ${home?"you are beside the campfire/storage, so carried and base supplies are interchangeable.":"walk beside the campfire or a storage building to transfer supplies."}`
      + `<br><b>Pickups:</b> everything you collect goes into your pack first; food stored in base feeds the camp automatically.`,
    actions: [ { label: "Open Inventory", action: ()=>{ _activeTab="inventory"; render(); } } ] };
}

// Explain one Daily Outlook row: net rate plus each contributing source.
function dailyOutlookContext(g, k){
  const def = k==="knowledge" ? {icon:"📚", name:"Knowledge"} : RESOURCES[k];
  const delta = estimateDailyDelta(g);
  const net = delta[k] || 0;
  const src = (delta.__sources && delta.__sources[k]) || {};
  const rows = Object.entries(src).sort((a,b)=>a[1]-b[1]);
  let info = `<b>${net>0?"+":""}${fmt(net)}/day</b> net`;
  if (rows.length) info += `<br><div class="ctx-break">${rows.map(([label,v])=>
    `<div class="cb-row"><span class="cb-lbl">${escapeHtml(label)}…</span><span class="cb-v ${v<0?"bad":v>0?"good":""}">${v>0?"+":""}${fmt(v)}</span></div>`).join("")}</div>`;
  else info += `<br><span class="dim">No active sources right now.</span>`;
  info += `<br><span class="dim">Rates are estimated: they assume workers are assigned, inputs are in stock, and storage has room.</span>`;
  const actions = [{ label: "Open Jobs tab", action: ()=>{ _activeTab="jobs"; render(); } }];
  if (k==="food" && net<0) actions.unshift(needActionButton(g,"gather"));
  if (k==="water" && net<0) actions.unshift(needActionButton(g,"fetch_water"));
  actions.push({ label: "Open Build tab", action: ()=>{ _activeTab="build"; render(); } });
  return { title: `${def.icon} ${def.name} — daily rate`, info, actions };
}

// Itemised math behind the Settlement "Danger" figure.
function settlementDangerBreakdown(g){
  const parts = [];
  parts.push({ label:`Population (${g.survivors.length} × 1.2)`, v: g.survivors.length * 1.2 });
  const bCount = Object.values(g.buildings).reduce((a,b)=>a+b.count,0);
  if (bCount) parts.push({ label:`Buildings (${bCount} × 0.4)`, v: bCount * 0.4 });
  let stored = 0; for (const k in g.resources) stored += g.resources[k];
  if (stored) parts.push({ label:`Stored supplies (${fmt(stored)} × 0.005)`, v: stored * 0.005 });
  if (g.reputation) parts.push({ label:`Reputation (${fmt(g.reputation)} × 0.1)`, v: g.reputation * 0.1 });
  let walls = 0, guards = 0, dr = 0;
  for (const id in g.buildings){
    const b = BUILDINGS[id], e = b.effects || {}, cnt = g.buildings[id].count;
    if (e.wall) walls += e.wall * cnt;
    if (e.danger_reduce) dr += e.danger_reduce * cnt;
    if (e.safety_per_worker) guards += e.safety_per_worker * (g.workerAssign[id]?.length || 0);
  }
  if (walls) parts.push({ label:`Walls reduce (${fmt(walls)} × -0.15)`, v: -walls*0.15 });
  if (guards) parts.push({ label:`Guards reduce (${fmt(guards)} × -0.3)`, v: -guards*0.3 });
  if (dr) parts.push({ label:`Danger-reduction buildings`, v: -dr });
  return parts;
}

function breakdownInfo(parts){
  return `<div class="ctx-break">${parts.map(({label,v})=>
    `<div class="cb-row"><span class="cb-lbl">${escapeHtml(label)}…</span><span class="cb-v ${v<0?"good":v>0?"bad":""}">${v>0?"+":""}${fmt(v)}</span></div>`).join("")}</div>`;
}

// Right-click a line in the Settlement summary card (left panel).
function settlementStatContext(g, key){
  const a = adults(g).filter(s=>s.health>0), c = children(g).filter(s=>s.health>0);
  const house = getHousing(g);
  switch(key){
    case "population": {
      const info = `Soldiers of the ash: <b>${g.survivors.length}</b> survivors (${a.length} adult${a.length===1?"":"s"}, ${c.length} child${c.length===1?"":"ren"})
        <br><b>Housing:</b> ${g.survivors.length} ${g.survivors.length>house?"<span class='bad'>overcrowded</span> — build beds":"/ "+house+" — room to spare"}.
        <br>New people arrive via courted partners, births (need spare housing), rescues and random arrivals (boosted by the inn, signal tower and reputation).`;
      return { title:"👥 Population", info, actions:[{ label:"Open Survivors tab", action:()=>{ _activeTab="survivors"; render(); } }] };
    }
    case "housing": {
      const lines = [`Housing <b>${house}</b> for ${g.survivors.length} survivors (starts at 1 for the campfire).`];
      for (const id in g.buildings){
        const b = BUILDINGS[id], e = b.effects || {};
        if (e.housing) lines.push(`<b>${b.icon} ${b.name}</b> +${e.housing*b.count}`);
      }
      lines.push(`${g.survivors.length>house?"<span class='bad'>Overcrowded:</span> happiness drops and new births/recruits are blocked.":"Plenty of beds."} Build more housing to grow.`);
      return { title:"🛏 Housing", info: lines.join("<br>"), actions:[{ label:"Open Build tab", action:()=>{ _activeTab="build"; render(); } }] };
    }
    case "workers": {
      let wt = 0, wf = 0;
      for (const s of adults(g)){ if (s.health>0){ wt++; if (!g.jobs[s.id] || g.jobs[s.id]==="none") wf++; } }
      const assigned = wt - wf, denom = Math.max(0, wt-1);
      const free = freeWorkers(g);
      const idle = free.map(s=>escapeHtml(s.name)).join(", ") || "none";
      return { title:"🛠 Workers", info:`<b>${assigned}/${denom}</b> working adults are assigned<br>${free.length?`<b>Idle:</b> ${idle}`:"Everyone healthy is working."}
        <br>Idle workers can be assigned jobs in the Jobs tab; the player scouts, forages and acts directly.`, actions:[{ label:"Open Jobs tab", action:()=>{ _activeTab="jobs"; render(); } }] };
    }
    case "danger": {
      const parts = settlementDangerBreakdown(g);
      return { title:"⚠️ Danger", info:`Rounded to <b>${settlementDanger(g)}</b>.<br><b>What drives danger:</b><br>${breakdownInfo(parts)}
        <br>High danger invites nightly raids and hurts morale. Walls, guard posts and watchtowers cut it.`, actions:[{ label:"Open Build tab", action:()=>{ _activeTab="build"; render(); } }] };
    }
    case "safety": {
      const parts = [];
      parts.push({label:"Base camp", v:30});
      for (const id in g.buildings){
        const b = BUILDINGS[id], e = b.effects || {};
        if (e.safety_per_worker) parts.push({label:`${b.name} guards`, v: e.safety_per_worker * (g.workerAssign[id]?.length || 0)});
        if (e.wall) parts.push({label:`${b.name} walls`, v: e.wall * 0.5 * g.buildings[id].count});
      }
      parts.push({label:`Danger penalty (× -0.6)`, v:-settlementDanger(g)*0.6});
      return { title:"🛡 Safety", info:`<b>${settlementSafety(g)}</b> out of 100.<br>${breakdownInfo(parts)}<br>Safety is the flip side of danger: guard posts, walls, and low danger keep people feeling protected.`, actions:[{ label:"Open Build tab", action:()=>{ _activeTab="build"; render(); } }] };
    }
    case "reputation":
      return { title:"🤝 Reputation", info:`Currently <b>${Math.round(g.reputation*10)/10}</b>.
        <br>Built by community halls, trade posts, market stalls and the runner/barterer jobs; gained from completed trades.
        <br>Reputation raises the trader visit chance and recruitable arrivals, and — being "known" — slightly feeds Danger.`, actions:[] };
    case "knowledge":
      return { title:"📚 Knowledge", info:`<b>${Math.floor(g.knowledge*10)/10}</b> points.
        <br>Accumulates passively (<b>${fmt(0.5 + g.survivors.length*0.05)}/day</b>), from studying books, and from research buildings and their workers.
        <br>Spend it in the Knowledge tab to research new buildings, jobs and recipes.`, actions:[{ label:"Open Knowledge tab", action:()=>{ _activeTab="knowledge"; render(); } }] };
    case "storage":
      return { title:"🗄 Base storage", info: storageBreakdown(g), actions:[{ label:"Open Inventory", action:()=>{ _activeTab="inventory"; render(); } }] };
  }
  return null;
}

// Right-click a district chip in the Town tab.
function districtContext(g, id){
  const b = BUILDINGS[id]; if (!b) return null;
  const count = g.buildings[id]?.count || 0;
  const info = `${escapeHtml(b.desc||"")}<br><b>Built:</b> ${count}/${b.max}
    <br><b>Effect:</b> ${buildingYieldText(b)}
    ${b.workers?`<br><b>Workers:</b> ${(g.workerAssign[id]||[]).length}/${b.workers*count}`:""}
    ${b.effects?.farm?`<br><span class="dim">Farm plots are handled on the Farming tab.</span>`:""}`;
  return { title:`${b.icon||""} ${b.name}`, info, actions:[
    { label: "Manage / inspect", action: ()=>openBuildingDialog(g, id) },
    { label: "Open Build tab", action: ()=>{ _activeTab="build"; render(); } },
  ]};
}

function townBuildingContext(g, id, wx, wy){
  const b = BUILDINGS[id]; if (!b) return null;
  const count = g.buildings[id]?.count || 1;
  const assigned = (g.workerAssign[id] || []).length;
  const dmg = g.buildings[id]?.dmg || 0;
  const info = `${escapeHtml(b.desc||"")}<br><b>Effect:</b> ${buildingYieldText(b)}`
    + `<br>Built ${g.buildings[id]?.count||0}/${b.max}`
    + (b.workers ? ` · workers ${assigned}/${b.workers*count}` : "")
    + (dmg ? `<br><span class="warn">Damaged (${Math.round(dmg)})</span>` : "");
  const actions = [{ label: "Manage / inspect", action: ()=>openBuildingDialog(g, id, wx, wy) }];
  if (b.workers){
    const open = openSlots(g, id), free = freeWorkers(g).length;
    actions.push({ label: "Assign worker", disabled: open<=0 || !free, title: open<=0?"No open slot":!free?"No idle workers":"", action: ()=>openWorkerPicker(g, id) });
  }
  if (b.effects?.farm && wx!=null){
    const f = farmAt(g, wx, wy);
    if (f) actions.push(farmPlotAdjacent(g,f)
      ? { label: "Tend this plot", action: ()=>openBuildingDialog(g, id, wx, wy) }
      : { label: "Walk to plot", action: ()=>startAutoWalk(wx, wy) });
  }
  return { title: `${b.icon||""} ${b.name}`, info, actions };
}

function buildCardContext(g, id){
  const b = BUILDINGS[id]; if (!b) return null;
  const unlocked = isUnlocked(g, id), built = g.buildings[id]?.count || 0;
  const info = `${escapeHtml(b.desc||"")}<br><b>Cost:</b> ${costString(b.cost, g) || "Free"}<br><b>Effect:</b> ${buildingYieldText(b)}<br>Build ${timeText(buildingMinutes(g,id))} · ${built}/${b.max}`
    + (unlocked ? "" : `<br><span class="dim">🔒 Requires ${unlockRequirement(g, id)}</span>`);
  const can = unlocked && canPay(g, b.cost) && built < b.max && atSettlement(g);
  const why = !atSettlement(g) ? "Return to the settlement to build." : !unlocked ? "Locked" : built>=b.max ? "At max" : !canPay(g,b.cost) ? "Can't afford" : "";
  return { title: `${b.icon||""} ${b.name}`, info, actions: [
    { label: "Place on map", disabled: !can, title: why, action: ()=>build(id) },
  ]};
}

function survivorContext(g, s){
  const partner = s.partnerId ? survivorById(g, s.partnerId) : null;
  const heart = g.courtship?.[s.id] || 0;
  const job = g.jobs?.[s.id] && JOBS[g.jobs[s.id]] ? JOBS[g.jobs[s.id]].name : "Idle";
  const info = `${s.sex==="F"?"female":"male"}, ${s.isChild?"child":"adult age "+s.age} · ${s.isPlayer?"you":job}`
    + `<br>❤ ${Math.round(s.health)} · 🍞 ${Math.round(s.hunger)} · 💧 ${Math.round(s.thirst)} · ⚡ ${Math.round(s.energy)}`
    + `<br>Traits: ${s.traits.map(t=>TRAITS[t].label).join(", ") || "none"}`
    + (partner ? `<br>💍 ${escapeHtml(partner.name)}` : heart ? `<br>❤ Heart ${heart}/100` : "")
    + (s.diseased ? `<br><span class="bad">🤒 Diseased</span>` : "") + (s.injured ? `<br><span class="warn">🩹 Injured</span>` : "");
  const actions = [];
  if (!s.isPlayer && !s.isChild) actions.push({ label: "Assign job…", sub: JOBS[g.jobs?.[s.id]||"none"].name, action: ()=>openJobPicker(g, s.id) });
  if (typeof eligibleForCourtship === "function" && eligibleForCourtship(g, s)) actions.push({ label: "Court", sub: "30 min", action: ()=>courtSurvivor(s.id) });
  if (heart >= 100 && !partner) actions.push({ label: "Marry", action: ()=>marrySurvivor(s.id) });
  if (s.isPlayer && s.diseased) actions.push({ label: "Treat illness", sub: "1 medicine", action: ()=>useMedicine() });
  return { title: `${s.isPlayer?"⭐ ":""}${escapeHtml(s.name)}`, info, actions };
}

const ACTION_LABELS = {
  eat:"Eat", cook:"Cook", gather:"Forage", drink:"Drink", fetch_water:"Fetch water",
  boil_water:"Boil water", purify_water:"Filter water", rest:"Rest", sleep:"Sleep",
  gather_spirits:"Gather spirits", warm_fire:"Warm up", light_fire:"Fuel fire", bandage:"Bandage",
};
function needActionButton(g, k){
  const b = quickActionBlocker(g, k);
  const icon = QUICK_ACTION_ICONS[k] || (k==="sleep" ? "🛏️" : "⚡");
  return { label: `${icon} ${ACTION_LABELS[k] || k}`, disabled: !!b, title: b || "", action: ()=>playerAction(k) };
}

// Right-click a stat bar → what it means, its state, a tip, and one-click fixes.
function needContext(g, need){
  const p = g.survivors[0]; if (!p) return null;
  const META = {
    health:    { icon:"❤", label:"Health",    max:p.maxHealth, desc:"At 0 you die. Low hunger, thirst or warmth and disease all chip away at it.", tip:"Rest, bandage wounds, use medicine, or soak in a hot spring (♨).", acts:["bandage","rest"] },
    hunger:    { icon:"🍞", label:"Hunger",    max:100, desc:"Falls about 4 each phase; under 15 it starts damaging health.", tip:"Eat food or cook a meal; forage or hunt when stores run low.", acts:["eat","cook","gather"] },
    thirst:    { icon:"💧", label:"Thirst",    max:100, desc:"Falls about 5 each phase — your fastest need; under 15 it damages health.", tip:"Drink clean water. Dirty water risks illness (15%) — boil or filter it first.", acts:["drink","fetch_water","boil_water","purify_water"] },
    energy:    { icon:"⚡", label:"Energy",    max:100, desc:"Every action and step costs energy; under 5 you're too exhausted to act.", tip:"Rest for a quick +7, or Sleep for a full recovery (shelter and a fire help).", acts:["rest","sleep"] },
    happiness: { icon:"😊", label:"Happiness", max:100, desc:"Hurt by hunger, thirst and cold; lifted by company and comforts. Low happiness cuts worker output.", tip:"Gather spirits, keep needs met, and build an inn, tavern or bathhouse.", acts:["gather_spirits"] },
    safety:    { icon:"🛡", label:"Safety",    max:100, desc:"Settlement-wide protection. Low safety drags down morale and invites raids.", tip:"Build guard posts, palisades and watchtowers, and assign guards.", acts:[], tab:"build" },
    morale:    { icon:"✨", label:"Morale",    max:100, desc:"Averages your happiness and settlement safety. Shrines, halls and the town hall raise it.", tip:"Keep people happy and safe; Gather Spirits gives a quick lift.", acts:["gather_spirits"] },
    warmth:    { icon:"🔥", label:"Warmth",    max:100, desc:"Drops at night and in snow (up to 6/phase); under 15 it damages health.", tip:"Warm up at a fueled fire (build or fuel one in the field) and equip a warm coat.", acts:["warm_fire","light_fire"] },
  };
  const m = META[need]; if (!m) return null;
  const v = Math.round(p[need] || 0);
  const state = v<15 ? `<span class="bad">critically low</span>` : v<30 ? `<span class="warn">low</span>` : v>=70 ? `<span class="good">good</span>` : "steady";
  const info = `<b>${v}/${m.max}</b> · ${state}<br>${m.desc}<br><b>Tip:</b> ${m.tip}`;
  const actions = m.acts.map(k=>needActionButton(g,k));
  if (need==="health" && p.diseased){
    const hasMed = playerAmount(g,"medicine")>=1;
    actions.unshift({ label:"💊 Treat illness", disabled:!hasMed, title:hasMed?"":"Need 1 medicine.", action:()=>useMedicine() });
  }
  if (m.tab) actions.push({ label:"🏗 Open Build tab", action:()=>{ _activeTab=m.tab; render(); } });
  return { title:`${m.icon} ${m.label}`, info, actions };
}

// ------------------------- BUILDING / WORKER / JOB DIALOGS ------------------------------

// Pick a survivor to staff a building (choosing the role first if it has several).
function openWorkerPicker(g, id, jobKey){
  const b = BUILDINGS[id]; if (!b) return;
  const roles = jobsForBuilding(id);
  if (!roles.length){ pushLog(g, `${b.name} has no worker roles.`, "info"); render(); return; }
  if (!jobKey && roles.length>1){
    showModal({ title:`Staff the ${b.name}`, body:`<p class="muted">Choose a role — ${openSlots(g,id)} open slot(s).</p>`, buttons:[
      ...roles.map(rk=>({ label:`${JOBS[rk].name}`, action:()=>{ closeModal(); openWorkerPicker(g, id, rk); } })),
      { label:"Cancel", action:closeModal },
    ]});
    return;
  }
  const role = jobKey || roles[0];
  if (openSlots(g,id)<=0){ pushLog(g, `${b.name}: no open worker slot.`, "warn"); render(); return; }
  const cands = eligibleWorkers(g, role);
  if (!cands.length){ pushLog(g, "No survivors available to assign.", "warn"); render(); return; }
  showModal({ title:`Assign to ${b.name} — ${JOBS[role].name}`, body:`<p class="muted">Idle workers first. ⭐ marks a good trait match.</p>`, buttons:[
    ...cands.map(({s,free,match})=>({
      label:`${match?"⭐ ":""}${s.name}${free?"":` (now ${JOBS[g.jobs[s.id]]?.name||"idle"})`}`,
      action:()=>{ closeModal(); assignJob(s.id, role); },
    })),
    { label:"Cancel", action:closeModal },
  ]});
}

// Manage a placed building: workers (assign/unassign) and farm-plot actions.
function openBuildingDialog(g, id, wx, wy){
  const b = BUILDINGS[id]; if (!b) return;
  const built = g.buildings[id]?.count || 0;
  const lines = [`<p>${escapeHtml(b.desc||"")}</p>`, `<p><b>Effect:</b> ${buildingYieldText(b)}</p>`];
  const buttons = [];
  if(!b.effects?.consume) for(const key of new Set([...Object.keys(b.effects?.produce||{}),...Object.keys(b.effects?.produce_per_worker||{})])){
    const source=workerSource(g,key,id);
    lines.push(`<p class="muted">${source?escapeHtml(sourceStatus(g,source,[key])):`No discovered source of ${RESOURCES[key].name} nearby.`}</p>`);
  }
  if(id==="campfire" || b.effects?.storage || b.effects?.food_storage){
    lines.push(`<p>Base storage: ${fmt(storageUsage(g).general)} / ${totalStorageCap(g)} shared load. Cellar: ${fmt(storageUsage(g).food)} / ${storageUsage(g).cellar} food load.</p>`);
    buttons.push({label:"Open inventory / storage",action:()=>{closeModal();_activeTab="inventory";render();}});
  }
  if (b.workers){
    const assigned = (g.workerAssign[id] || []);
    lines.push(`<p><b>Workers:</b> ${assigned.length}/${b.workers*built}${assigned.length?" — "+assigned.map(uid=>survivorById(g,uid)?.name).filter(Boolean).join(", "):""}</p>`);
    const open = openSlots(g,id), free = freeWorkers(g).length;
    buttons.push({ label:"Assign worker", primary:true, disabled:open<=0||!free, title:open<=0?"No open slot":!free?"No idle workers":"", action:()=>{ closeModal(); openWorkerPicker(g, id); } });
    for (const uid of assigned){ const s = survivorById(g,uid); if (!s) continue;
      buttons.push({ label:`✕ ${s.name}`, action:()=>{ closeModal(); assignJob(uid, "none"); } });
    }
  }
  if (b.effects?.farm && wx!=null){
    const f = farmAt(g, wx, wy);
    if (f){
      const crop = CROPS[f.crop];
      lines.push(`<p><b>Plot:</b> ${crop.name} — ${f.planted?(f.growth>=100?"ready to harvest":`growing ${Math.round(f.growth)}%`):"unplanted"} · moisture ${Math.round(f.water)} · fertility ${Math.round(f.fertility)}</p>`);
      if (!farmPlotAdjacent(g,f)){
        lines.push(`<p class="warn">Walk next to the plot to tend it.</p>`);
        buttons.push({ label:"Walk to plot", primary:true, action:()=>{ closeModal(); startAutoWalk(wx, wy); } });
      } else {
        const add=(label,act,disabled,title)=>buttons.push({ label, disabled, title:title||"", action:()=>{ closeModal(); farmAction(f.id, act); } });
        if (!f.planted) add("Plant (1 seed)","plant", playerAmount(g,"seeds")<1, "Need a seed");
        if (f.planted) add("Water (1)","water", f.water>=100||playerAmount(g,"water")<1, "Need clean water");
        add("Compost (1)","fertilize", f.fertility>=100||playerAmount(g,"compost")<1, "Need compost");
        if (f.growth>=100) add("Harvest","harvest", false);
        if (!f.fenced) add("Fence (4 wood)","fence", playerAmount(g,"wood")<4, "Need 4 wood");
        if (!f.irrigated) add("Irrigate","irrigate", !playerCanPay(g,{wood:4,clay:4,rope:1}), "Need 4 wood, 4 clay, 1 rope");
      }
    }
  }
  buttons.push({ label:"Close", action:closeModal });
  showModal({ title:`${b.icon||""} ${b.name}`, body:lines.join(""), buttons });
}

// Change a survivor's job via a dropdown (same options as the Jobs tab).
function openJobPicker(g, survId){
  const s = survivorById(g, survId); if (!s || s.isPlayer || s.isChild) return;
  const cur = g.jobs[s.id] || "none";
  const root = document.getElementById("modal-root"); root.innerHTML = "";
  const bg = el("div","modal-bg"), m = el("div","modal");
  m.innerHTML = `<h2>${escapeHtml(s.name)} — job</h2><div class="body"><p class="muted">Current: <b>${JOBS[cur].name}</b>. Building jobs need an open slot.</p></div>`;
  const sel = el("select");
  for (const jk of JOB_KEYS){
    const j = JOBS[jk]; const ok = jk==="none" || jobAvailable(g,jk) || jk===cur;
    const o = el("option","",`${j.name}${j.building?" ("+BUILDINGS[j.building].name+")":""}`);
    o.value = jk; if (jk===cur) o.selected = true; if (!ok) o.disabled = true;
    sel.appendChild(o);
  }
  m.querySelector(".body").appendChild(sel);
  const acts = el("div","actions");
  const ok = el("button","primary","Assign"); ok.onclick = ()=>{ assignJob(s.id, sel.value); closeModal(); };
  const cancel = el("button","","Cancel"); cancel.onclick = closeModal;
  acts.appendChild(ok); acts.appendChild(cancel); m.appendChild(acts);
  bg.appendChild(m); root.appendChild(bg);
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
  const NEED_ORDER = ["health","hunger","thirst","energy","happiness","safety","morale","warmth"];
  ch.querySelectorAll(".bar").forEach((barEl,i)=>{
    const need = NEED_ORDER[i]; if (!need) return;
    barEl.style.cursor = "help"; barEl.title = "Right-click for tips";
    barEl.oncontextmenu = (ev)=>{ ev.preventDefault(); showContextMenu(ev, needContext(G, need)); };
  });
  root.appendChild(ch);
  const expedition=el("div","card",`<h3>Expedition</h3><div class="${packWeight(g)>packCapacity(g)*0.9?"warn":"info"}">Carrying: ${fmt(packWeight(g))} / ${packCapacity(g)} load</div><div>Water containers: ${fmt(liquidAmount(g))} / ${liquidCapacity(g)}</div><div>${storageAccess(g)?"Base storage accessible here":"Using carried supplies; unload beside campfire or storage"}</div><div class="muted">${compassLabel(g)}</div><div>${sleepConditions(g).label}</div>`);
  const inventoryButton=el("button","small","Open inventory"); inventoryButton.onclick=()=>{_activeTab="inventory";render();}; expedition.appendChild(inventoryButton);
  root.appendChild(expedition);

  // Quick actions
  const qa = el("div","card");
  qa.innerHTML = `<h3>Quick Actions</h3>`;
  const groups = [
    ["Survival",[["eat","Eat","1 food / +30 hunger"],["drink","Drink","1 water / +30 thirst"],["rest","Rest","+7 energy up to 60; exposure applies"],["bandage","Bandage","1 bandage / +15 health"],["warm_fire","Warm up","Nearby fire / +30 warmth"]]],
    ["Gather and explore",[["chop_wood","Chop wood","3-5 wood; axes improve yield"],["gather","Forage","Food, herbs and seeds"],["fetch_water","Fetch water","2 water; containers increase batch"],["gather_fiber","Gather fiber","3-5 fiber"],["gather_stone","Gather stone","2-3 stone"],["mine","Mine","Nearby deposit + pickaxe"],["dig","Dig","3 sand + 2 clay"],["fish","Fish","1-3 meat"],["hunt","Hunt","Bow + 1 arrow"],["survey","Survey","Binoculars reveal terrain"]]],
    ["Camp and craft",[["cook","Cook","Meat or 2 crops + wood / 3 food"],["boil_water","Boil water","2 dirty water + wood / 2 water"],["purify_water","Filter water","2 dirty water + charcoal / 2 water"],["craft_arrows","Craft arrows","Wood + bone / 5 arrows"],["pitch_tent","Pitch tent","Deploy carried tent"],["lay_bag","Lay sleeping bag","Deploy carried sleeping bag"],["lean_to","Build lean-to","4 wood + 4 fiber"],["light_fire","Fuel field fire","1 wood / 4h fuel"],["pack_camp","Pack camp","Recover gear and extinguish fire"],["gather_spirits","Share stories","+5 happiness"],["study","Study","1 book / 2-5 knowledge"],["train","Train","Training yard / +0.5 combat"]]],
  ];
  const search=el("button","small","🔍 Search nearby"); search.onclick=searchNearby; qa.appendChild(search);
  for(const [name,actions] of groups){
    const group=el("details","quick-group"); group.open=name==="Survival" || _openQuickGroups.has(name);
    group.ontoggle=()=>{if(group.open) _openQuickGroups.add(name); else _openQuickGroups.delete(name);};
    group.appendChild(el("summary","",name)); const grid=el("div","actgrp");
    for(const [k,label,sub] of actions){
      const icon=QUICK_ACTION_ICONS[k]||"";
      const blocker=quickActionBlocker(g,k), b=el("button","",`${icon?icon+" ":""}${label}<span class="sub">${timeText(actionMinutes(g,k))} · ${ACTION_ENERGY[k] || 0} energy · ${sub}</span>${blocker?`<span class="sub warn">${blocker}</span>`:""}`);
      b.disabled=!!blocker; b.title=blocker||"Right-click for details"; b.onclick=()=>playerAction(k);
      b.oncontextmenu=(ev)=>{ ev.preventDefault(); showContextMenu(ev, quickActionContext(g,k,icon||"⚡",label,sub)); };
      grid.appendChild(b);
    }
    group.appendChild(grid); qa.appendChild(group);
  }
  root.appendChild(qa);

// Settlement summary
  const ss = el("div","card");
  const housing = getHousing(g);
  const danger = settlementDanger(g);
  const safety = settlementSafety(g);
  let workersTotal = 0; let workersFree = 0;
  for (const s of adults(g)){ if (s.health>0){ workersTotal++; if (!g.jobs[s.id] || g.jobs[s.id]==="none") workersFree++; } }
  const statLine = (key, html) => {
    const d = el("div","",html);
    d.title = "Right-click for details";
    d.style.cursor = "help";
    d.oncontextmenu = (ev)=>{ ev.preventDefault(); showContextMenu(ev, settlementStatContext(g, key)); };
    return d;
  };
  ss.innerHTML = `<h3>🏕 Settlement</h3>`;
  ss.appendChild(statLine("population", `Population: <b>${g.survivors.length}</b> (${children(g).length} children)`));
  ss.appendChild(statLine("housing", `Housing: <b>${housing}</b> ${g.survivors.length>housing?'<span class="bad">(overcrowded)</span>':""}`));
  ss.appendChild(statLine("workers", `Workers: <b>${workersTotal-workersFree}/${workersTotal-1}</b> assigned${workersFree>1?` <span class="warn">(${workersFree-1} idle)</span>`:""}`));
  ss.appendChild(statLine("danger", `Danger: <span class="${danger>30?'bad':danger>15?'warn':'good'}">${danger}</span> · Safety: <b>${safety}</b>`));
  ss.appendChild(statLine("reputation", `Reputation: <b>${Math.round(g.reputation*10)/10}</b>`));
  ss.appendChild(statLine("knowledge", `Knowledge: <b>${Math.floor(g.knowledge*10)/10}</b>`));
  ss.appendChild(statLine("storage", `Base storage: <b>${fmt(storageUsage(g).general)} / ${totalStorageCap(g)}</b> shared load`));
  ss.appendChild(statLine("storage", `Food cellar: ${fmt(storageUsage(g).food)} / ${storageUsage(g).cellar} load`));
  root.appendChild(ss);
}

function renderRight(){
  const g = G;
  const root = document.getElementById("right-panel");
  root.innerHTML = "";
  // Resources
  const rc = el("div","card");
  rc.innerHTML = `<h3>Stored at base</h3><div>${fmt(storageUsage(g).general)} / ${totalStorageCap(g)} shared load</div><div class="muted">${storageAccess(g)?"Accessible here":"Return beside the campfire or a storage building to transfer"}</div>${storageUsage(g).general>totalStorageCap(g)+1e-8?'<p class="warn">Over capacity. Existing supplies are preserved; use supplies or expand storage.</p>':""}`;
  rc.title = "Right-click for storage details";
  rc.style.cursor = "help";
  rc.oncontextmenu = (ev)=>{ ev.preventDefault(); showContextMenu(ev, stockpileContext(g)); };
  const list = el("div","reslist");
  const resourceKeys = RES_KEYS.slice().sort((a,b)=>RESOURCES[a].name.localeCompare(RESOURCES[b].name));
  for (const k of resourceKeys){
    const v = g.resources[k];
    if (v <= 0 && k!=="wood" && k!=="food" && k!=="water" && k!=="knowledge") continue; // hide empties
    const full = storageRoom(g,k)<0.001;
    const row = el("div","ri",`<span class="nm">${RESOURCES[k].icon} ${RESOURCES[k].name}</span><span class="vl ${full?'full':''}">${fmt(v)}</span>`);
    row.title = "Right-click for details";
    row.oncontextmenu = (ev)=>{ ev.preventDefault(); showContextMenu(ev, resourceContext(g,k)); };
    list.appendChild(row);
  }
  rc.appendChild(list);
  root.appendChild(rc);

  const dc = el("div","card");
  dc.innerHTML = `<h3>📈 Daily Outlook</h3><div class="muted">Estimated rates; inputs, storage, crop growth and reserves can limit output.</div>`;
  const delta = estimateDailyDelta(g);
  const rows = ["food","water","dirty_water","wood","crops","meat","metal","cloth","tools","knowledge"];
  const dl = el("div","reslist outlook-list");
  for (const k of rows){
    const v = delta[k] || 0;
    if (Math.abs(v) < 0.05) continue;
    const def = k==="knowledge" ? {icon:"📚", name:"Knowledge"} : RESOURCES[k];
    const row = el("div","ri",`<span class="nm">${def.icon} ${def.name}</span><span class="vl ${v<0?'bad':'good'}">${v>0?'+':''}${fmt(v)}/day</span>`);
    row.title = "Right-click for breakdown";
    row.style.cursor = "help";
    row.oncontextmenu = (ev)=>{ ev.preventDefault(); showContextMenu(ev, dailyOutlookContext(g, k)); };
    dl.appendChild(row);
  }
  if (!dl.innerHTML) dl.innerHTML = `<div class="muted">No meaningful production yet.</div>`;
  dc.appendChild(dl);
  root.appendChild(dc);
  const statuses=Object.entries(productionStatuses(g));
  if(statuses.length){
    const status=el("div","card","<h3>Last production check</h3><p class='muted'>Workers retry on the next phase. Inspect the source for its current recovery timer.</p>");
    for(const [id,why] of statuses) status.appendChild(el("p","muted",`${escapeHtml(BUILDINGS[id]?.name||JOBS[id]?.name||id)}: ${escapeHtml(why)}`));
    root.appendChild(status);
  }

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
  const src = {};
  // Tracks each contribution by label so the Daily Outlook can explain its numbers.
  const add = (k,v,label)=>{ if(!v) return; d[k] = (d[k]||0) + v; if (label){ const m = src[k] = src[k] || {}; m[label] = (m[label]||0) + v; } };
  for (const id in g.buildings){
    const b = BUILDINGS[id]; if (!b) continue;
    const count = g.buildings[id].count;
    const assigned = productionWorkers(g,id).filter(sid=>!JOBS[g.jobs[sid]]?.direct);
    const eff = b.effects || {};
    if(!count || eff.farm) continue;
    const order=g.orders[id];
    if(order){
      if(!orderBlocker(g,id,order)){
        const recipe=RECIPES[order.recipe];
        const lbl = `${b.name}: ${recipeName(order.recipe)}`;
        let runs=240*assigned.length*workerSkillBonus(g,id,assigned)/recipe.minutes;
        for(const [r,v] of Object.entries(recipe.cost)) runs=Math.min(runs,Math.max(0,(g.resources[r]||0)-(g.reserves[r]||0))/v);
        if(order.mode==="count") runs=Math.min(runs,order.target);
        else runs=Math.min(runs,Math.ceil(Math.max(0,order.target-orderStock(g,order.recipe))/(recipe.item?1:Math.min(...Object.values(recipe.output)))));
        for(const [r,v] of Object.entries(recipe.output || {})) runs=Math.min(runs,Math.floor(Math.max(0,resourceCap(g,r)-(g.resources[r]||0))/v));
        runs=Math.floor(runs);
        for(const [r,v] of Object.entries(recipe.cost)) add(r,-v*runs,lbl);
        for(const [r,v] of Object.entries(recipe.output || {})) add(r,v*runs,lbl);
      }
      continue;
    }
    if(eff.consume && (!assigned.length && b.workers || !Object.entries(eff.consume).every(([r,v])=>productionStock(g,r)>=v*count/4))) continue;
    const raw={};
    for(const [r,v] of Object.entries(eff.produce||{})) raw[r]=v*count;
    for(const [r,v] of Object.entries(eff.produce_per_worker||{})) raw[r]=(raw[r]||0)+v*assigned.length*workerSkillBonus(g,id,assigned);
    let fraction=1;
    for(const [r,v] of Object.entries(raw)) if(v>0){
      fraction=Math.min(fraction,storageRoom(g,r)/v);
      if(!eff.consume){const source=workerSource(g,r,id);fraction=Math.min(fraction,source?sourceRemaining(g,source,r)/v:0);}
    }
    for(const [r,v] of Object.entries(raw)) add(r,v*fraction,`${b.name} production`);
    if (eff.consume) for (const r in eff.consume) add(r, -eff.consume[r] * count, `${b.name} upkeep`);
    if (eff.convert && assigned.length){
      let runs = (eff.convert.perWorker || 1) * assigned.length * workerSkillBonus(g,id,assigned);
      for(const [r,v] of Object.entries(eff.convert.from)) runs=Math.min(runs,productionStock(g,r)/v);
      for(const [r,v] of Object.entries(eff.convert.to)) runs=Math.min(runs,Math.max(0,resourceCap(g,r)-(g.resources[r]||0))/v);
      const lbl=`${b.name} conversion`;
      for (const r in eff.convert.from) add(r, -eff.convert.from[r] * runs, lbl);
      for (const r in eff.convert.to) add(r, eff.convert.to[r] * runs, lbl);
    }
    if (eff.knowledge) add("knowledge", eff.knowledge * count, b.name);
    if (eff.knowledge_per_worker) add("knowledge", eff.knowledge_per_worker * assigned.length, `${b.name} workers`);
  }
  for (const s of g.survivors){
    if (!s || s.isPlayer || s.isChild || s.health<=0) continue;
    const jobKey = g.jobs[s.id] || s.job || "none";
    const job = JOBS[jobKey];
    if (!job || job.building && !job.direct) continue;
    if(job.building && (!productionWorkers(g,job.building).includes(s.id) || g.orders[job.building])) continue;
    if(job.site && !Object.values(g.workSites).some(v=>v.kind===job.site)) continue;
    if(!Object.entries(job.consume || {}).every(([r,v])=>productionStock(g,r)>=v/4)) continue;
    const boost = workerJobBonus(s, jobKey);
    let fraction=1;
    for(const [r,v] of Object.entries(job.consume || {})) fraction=Math.min(fraction,productionStock(g,r)/v);
    for(const [r,v] of Object.entries(job.output || {})) if(RESOURCES[r]) fraction=Math.min(fraction,Math.max(0,resourceCap(g,r)-(g.resources[r]||0))/(v*boost));
    if(!job.consume){
      const site=job.site && Object.entries(g.workSites).find(([,s])=>s.kind===job.site)?.[0];
      for(const [r,v] of Object.entries(job.output||{})) if(RESOURCES[r] && v>0){const source=workerSource(g,r,job.building,site);fraction=Math.min(fraction,source?sourceRemaining(g,source,r)/(v*boost):0);}
    }
    const lbl = job.name;
    for (const r in job.output || {}) add(r, job.output[r] * boost * fraction, lbl);
    for (const r in job.consume || {}) add(r,-job.consume[r]*fraction, lbl);
  }
  const adultsCount = adults(g).filter(s=>s.health>0 && (!s.isPlayer || storageAccess(g))).length;
  const childCount = children(g).filter(s=>s.health>0 && (!s.isPlayer || storageAccess(g))).length;
  const eatLbl = `Camp consumption (${adultsCount} adult${adultsCount===1?"":"s"}, ${childCount} child${childCount===1?"":"ren"})`;
  add("food", -(adultsCount * 0.65 + childCount * 0.35), eatLbl);
  add("water", -(adultsCount * 0.8 + childCount * 0.45), eatLbl);
  if (g.buildings.campfire?.count) add("wood", -1, "Campfire fuel");
  add("knowledge", 0.5 + g.survivors.length * 0.05, "Passive study");
  d.__sources = src;
  return d;
}

const TABS = [
  {id:"map", label:"🗺 World Map"},
  {id:"town", label:"🏘 Town"},
  {id:"inventory",label:"Inventory"},
  {id:"crafting",label:"Crafting"},
  {id:"farms",label:"Farming"},
  {id:"build", label:"🏗 Build"},
  {id:"survivors", label:"👥 Survivors"},
  {id:"jobs", label:"🛠 Jobs"},
  {id:"knowledge", label:"📚 Knowledge"},
  {id:"buildings", label:"🏠 Buildings"},
  {id:"scout", label:"🧭 Quick Scout"},
  {id:"guide", label:"📖 Guide"},
];
let _activeTab = "map";
let _buildToPlace = null;
let _rtSpeed = 0;
let _rtTimer = null;
const _openQuickGroups = new Set();
let _craftFilter = "all";
const _tabSearch = {};
function tabSearchTokens(tabKey){
  const q = (_tabSearch[tabKey]||"").trim().toLowerCase();
  if (q.length < 2) return null;
  return q.split(/\s+/).filter(Boolean);
}
function matchesTabSearch(tabKey, ...parts){
  const tokens = tabSearchTokens(tabKey);
  if (!tokens) return true;
  const blob = parts.join(" ").toLowerCase();
  return tokens.every(t => blob.includes(t));
}
let _tabSearchFocused = null;
let _tabSearchSelection = null;
function renderTabSearchInput(container, tabKey, placeholder){
  const wrap = el("div","guide-search");
  wrap.style.margin = "6px 0";
  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = placeholder || "Filter…";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.dataset.tabSearch = tabKey;
  input.value = _tabSearch[tabKey] || "";
  input.addEventListener("input", () => {
    _tabSearchFocused = tabKey;
    _tabSearchSelection = [input.selectionStart,input.selectionEnd];
    _tabSearch[tabKey] = input.value;
    render();
  });
  wrap.appendChild(input);
  container.appendChild(wrap);
  if (_tabSearchFocused === tabKey){
    requestAnimationFrame(() => {
      if (!input.isConnected || _tabSearchFocused !== tabKey) return;
      if (document.activeElement && document.activeElement!==document.body && document.activeElement!==input) return;
      input.focus();
      if (_tabSearchSelection) input.setSelectionRange(..._tabSearchSelection);
    });
  }
}

function mapPhaseLabel(phase){
  return ["☀ Morning", "☀ Midday", "🌇 Evening", "🌙 Midnight"][phase] || PHASES[phase] || "Unknown";
}

function mapTimeLabel(g){
  return `${mapPhaseLabel(g.phase)} · ${gameClockLabel(g)}`;
}

function renderTabs(){
  const root = document.getElementById("tabs");
  root.innerHTML = "";
  for (const t of TABS){
    const b = el("button", t.id===_activeTab?"active":"", t.label);
    b.onclick = ()=>{ _tabSearchFocused = null; _activeTab = t.id; render(); };
    root.appendChild(b);
  }
}

function renderContent(){
  const root = document.getElementById("tab-content");
  root.innerHTML = "";
  switch(_activeTab){
    case "map": return renderMapTab(root);
    case "inventory": return renderInventoryTab(root);
    case "crafting": return renderCraftingTab(root);
    case "farms": return renderFarmsTab(root);
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
    <span class="legend">· Energy: ${Math.round(p.energy)}/100 · Vision: ${visionRadius(g)} tiles · ${compassLabel(g)}</span>`;
  if (_buildToPlace){
    const cancel = el("button", "small", "Cancel build");
    cancel.onclick = ()=>{ _buildToPlace = null; render(); };
    ctrls.appendChild(cancel);
  }
  wrap.appendChild(ctrls);
  const mapTools=el("div","row");
  appendButton(mapTools,"Search nearby",searchNearby);
  appendButton(mapTools,"Camp / sleep",openSleepDialog);
  appendButton(mapTools,"Route home",()=>previewRoute(g.villageX,g.villageY));
  appendButton(mapTools,"Mark this location",()=>{g.markers[positionKey(g)] = MAP_FEATURES[tileAt(g, g.playerX, g.playerY).feature?.type]?.name || "Waypoint"; render();save();});
  appendButton(mapTools,"Supply outpost (6 wood + rope)",establishOutpost,atSettlement(g));
  const stop=el("label","muted"),check=el("input");check.type="checkbox";check.checked=g.stopAtNight;check.onchange=()=>{g.stopAtNight=check.checked;save();};stop.appendChild(check);stop.appendChild(document.createTextNode(" Stop walking at nightfall"));mapTools.appendChild(stop);
  wrap.appendChild(mapTools);

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
  const minX = g.playerX - halfW;
  const minY = g.playerY - halfH;

  const grid = el("div","map-grid");
  grid.style.gridTemplateColumns = `repeat(${VIEW_W}, 24px)`;
  grid.style.gridTemplateRows = `repeat(${VIEW_H}, 24px)`;

  for (let vy=0; vy<VIEW_H; vy++){
    for (let vx=0; vx<VIEW_W; vx++){
      const x = minX+vx, y = minY+vy;
      const key = x+","+y;
      const isVisible = !!visible[key];
      const isExplored = !!g.explored[key];
      // Fog cells need no terrain: drawing the viewport must not explore chunks.
      const tile = isExplored ? tileAt(g, x, y) : null;
      const biome = tile && BIOMES[tile.biome];

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
              if (!ent.nightOnly || isNight(g)){
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

      if(isExplored && (g.camps[x+","+y] || g.caches[x+","+y] || g.markers[x+","+y])){
        const mark=el("span","map-marker",g.camps[x+","+y]?"C":g.caches[x+","+y]?"$":"+");
        cell.appendChild(mark); cell.title+=" · "+(g.markers[x+","+y] || (g.camps[x+","+y]?"Camp":"Ground cache"));
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
        if (x===g.playerX && y===g.playerY){openTileActionDialog(g,x,y);return;}
        if (!isExplored) return;
        startAutoWalk(x,y);
      };
      cell.oncontextmenu = (ev)=>{
        ev.preventDefault();
        if (_buildToPlace || !isExplored || !isVisible) return;
        if (Math.max(Math.abs(x-g.playerX), Math.abs(y-g.playerY)) <= 2) openTileActionDialog(g, x, y);
        else pushLog(G, "Move within 2 tiles to inspect that place.", "info");
        render();
      };
      grid.appendChild(cell);
    }
  }
  const mapStage = el("div", "map-stage");
  const phaseBadge = el("div", "map-phase-badge", mapTimeLabel(g));
  mapStage.appendChild(grid);
  mapStage.appendChild(phaseBadge);
  wrap.appendChild(mapStage);

  // Bottom info: current tile / nearby
  const info = el("div","card");
  const here = tileAt(g, g.playerX, g.playerY);
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
    if (!g.explored[x+","+y]) continue;
    const t = tileAt(g, x, y);
    if (t.feature && !MAP_FEATURES[t.feature.type].hidden){
      const f = MAP_FEATURES[t.feature.type];
      nearby.push(`${f.icon} ${f.name}`);
    }
    if (t.entity){
      const e = MAP_ENTITIES[t.entity.type];
      if (e && (!e.nightOnly || isNight(g))) nearby.push(`${e.icon} ${e.name}${e.hostile?" ⚠":""}`);
    }
  }
  info_html += nearby.length ? `<div>${nearby.join(" · ")}</div>` : `<div class="dim">Nothing of note.</div>`;
  info.innerHTML = info_html;
  wrap.appendChild(info);

  // Biome legend
  const legend = el("details","biome-key");
  legend.innerHTML = `<summary>Biomes</summary><div>${Object.values(BIOMES).map(b=>`<span><i style="background:${b.bg}"></i>${b.name}</span>`).join("")}</div>`;
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
       <div class="desc">Time: ${timeText(l.minutes)} · Energy: ${l.energy} · Pack 1 food + 1 water · 12h route cooldown</div>
      <div class="desc">Possible foes: ${l.foundEnemies.map(e=>ENEMIES[e].name).join(", ")}</div>`;
    const btn = el("button","primary small","Explore");
    btn.onclick = ()=> explore(k);
    if (g.survivors[0].energy < l.energy || !atSettlement(g) || (g.scoutCooldowns[k]||0)>gameMinutes(g) || (g.inventory.resources.food||0)<1 || (g.inventory.resources.water||0)<1) {btn.disabled = true;btn.title="Return home, pack food/water, and choose a rested route.";}
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
      <span data-k="housing">Housing <b>${g.survivors.length}/${getHousing(g)}</b></span>
      <span data-k="workers">Workers <b>${workforce(g).length}</b></span>
      <span data-k="safety">Safety <b>${settlementSafety(g)}</b></span>
      <span data-k="danger">Danger <b>${settlementDanger(g)}</b></span>
      <span data-k="storage">Storage <b>${totalStorageCap(g)}</b></span>
    </div>
    <div class="strategy-order">Order: <span class="town-selected">${selected ? selected.icon + " " + selected.name : "Select a building from the Build tab"}</span></div>`;
  controls.querySelectorAll(".strategy-stats span").forEach(sp=>{
    sp.style.cursor = "help"; sp.title = "Right-click for details";
    const key = sp.dataset.k;
    sp.oncontextmenu = (ev)=>{ ev.preventDefault(); showContextMenu(ev, settlementStatContext(g, key)); };
  });
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
        const wx = g.villageX + x - cx, wy = g.villageY + y - cy;
        cell.title = b ? `${b.name}: ${b.desc} — click to manage` : slot.building;
        cell.style.cursor = "pointer";
        cell.onclick = ()=>{ if (_buildToPlace) return; openBuildingDialog(g, slot.building, wx, wy); };
        cell.oncontextmenu = (ev)=>{ ev.preventDefault(); showContextMenu(ev, townBuildingContext(g, slot.building, wx, wy)); };
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
           build(_buildToPlace, g.villageX+x-cx, g.villageY+y-cy);
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
  built.innerHTML = `<h3>City Districts</h3>`;
  for (const [id,n] of Object.entries(placed)){
    const chip = el("span",`district-chip ${buildingClass(id)}`,`${BUILDINGS[id]?.icon||""} ${BUILDINGS[id]?.name||id}: <b>${n}</b>`);
    chip.style.cursor = "help"; chip.title = "Right-click for details";
    chip.oncontextmenu = (ev)=>{ ev.preventDefault(); showContextMenu(ev, districtContext(g, id)); };
    built.appendChild(chip);
  }
  wrap.appendChild(built);
  root.appendChild(wrap);
}

function renderBuildTab(root){
  const g = G;
  const c = el("div","card");
  c.innerHTML = `<h3>🏗 Construct Buildings</h3><div class="muted">Starter strategy buildings are available now. Research expands your city into farms, industry, medicine, trade, and heavier defenses.</div>`;
  renderTabSearchInput(c, "build", "Search buildings: well, wall, farm…");
  const cats = {};
  for (const id in BUILDINGS){
    const b = BUILDINGS[id];
    if (!cats[b.cat]) cats[b.cat] = [];
    cats[b.cat].push(id);
  }
  for (const cat of Object.keys(cats)){
    const matching = cats[cat].filter(id => {
      const b = BUILDINGS[id];
      return matchesTabSearch("build", b.name, id, b.cat, b.desc, buildingYieldText(b));
    });
    if (!matching.length) continue;
    const h = el("h4","muted","— "+cat+" —");
    c.appendChild(h);
    const grid = el("div","grid2");
    for (const id of matching){
      const b = BUILDINGS[id];
      const built = g.buildings[id]?.count || 0;
      const unlocked = isUnlocked(g, id);
      const item = el("div","item");
      item.classList.add("build-card", buildingClass(id));
      item.innerHTML = `<div class="build-preview"><div class="town-building ${buildingClass(id)}"><span class="building-icon">${b.icon}</span></div></div>
        <div class="head"><span class="name">${b.icon} ${b.name}</span> <span class="meta">${built}/${b.max}</span></div>
        <div class="desc">${b.desc}</div>
        <div class="effect">${buildingYieldText(b)}</div>
        <div class="cost">Cost: ${costString(b.cost, g) || "Free"}</div>
        <div class="meta">Build time: ${timeText(buildingMinutes(g,id))}</div>
        ${b.workers?`<div class="effect">Workers: ${b.workers}</div>`:""}`;
      const btn = el("button","primary small", _buildToPlace===id ? "Selected for map placement" : "Place on Map");
      btn.disabled = !unlocked || !canPay(g,b.cost) || built>=b.max || !atSettlement(g);
      if(!atSettlement(g)) btn.title="Return to the settlement to build.";
      btn.onclick = ()=> build(id);
      item.appendChild(btn);
      item.oncontextmenu = (ev)=>{ ev.preventDefault(); showContextMenu(ev, buildCardContext(g, id)); };
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
  renderTabSearchInput(c, "survivors", "Search survivors: name, trait, job…");
  for (const s of g.survivors){
    if(!matchesTabSearch("survivors", s.name, s.traits.map(t=>TRAITS[t].label).join(" "), JOBS[s.job||"none"].name, s.isPlayer?"player":"", s.isChild?"child":"adult")) continue;
    const partner = s.partnerId ? survivorById(g, s.partnerId) : null;
    const heart = g.courtship?.[s.id] || 0;
    const canCourt = typeof eligibleForCourtship === "function" && eligibleForCourtship(g, s);
    const div = el("div","surv");
    div.oncontextmenu = (ev)=>{ ev.preventDefault(); showContextMenu(ev, survivorContext(g, s)); };
    div.innerHTML = `<div class="head"><div><b>${s.isPlayer?"⭐ ":""}${s.name}</b>${s.isChild?" 👶":""} <span class="muted">${s.sex==="F"?"female":"male"}, ${s.isChild?"child":"adult, age "+s.age}</span></div>
      <div class="muted">${s.isPlayer?"(You)":""}</div></div>
      <div class="traits">${s.traits.map(t=>'<span class="badge">'+TRAITS[t].label+'</span>').join(" ")}
        ${partner?'<span class="badge">💍 '+partner.name+'</span>':""}
        ${heart?'<span class="badge">❤ Heart '+heart+'/100</span>':""}
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
    if (canCourt){
      const row = el("div", "row");
      const court = el("button", "small", "Court");
      court.onclick = ()=> courtSurvivor(s.id);
      row.appendChild(court);
      const marry = el("button", "primary small", "Marry");
      marry.disabled = heart < 100;
      marry.title = heart < 100 ? "Win their heart first." : "Marry this survivor";
      marry.onclick = ()=> marrySurvivor(s.id);
      row.appendChild(marry);
      div.appendChild(row);
    }
    if (!s.isPlayer && !s.isChild){
      const jrow = el("div", "row");
      const jb = el("button", "small", `Change job (${JOBS[s.job||"none"].name})`);
      jb.onclick = ()=> openJobPicker(g, s.id);
      jrow.appendChild(jb);
      div.appendChild(jrow);
    }
    c.appendChild(div);
  }
  root.appendChild(c);
}

function jobOutputText(job){
  if(job.building && !job.direct){
    const b=BUILDINGS[job.building];
    if(b.effects.farm) return "Tends one plot: waters, harvests and replants using town supplies.";
    if(b.effects.convert){
      const c=b.effects.convert,n=c.perWorker || 1;
      return Object.entries(c.from).map(([k,v])=>`${fmt(v*n)} ${RESOURCES[k].name}`).join(" + ")+" -> "+Object.entries(c.to).map(([k,v])=>`${fmt(v*n)} ${RESOURCES[k].name}/day`).join(", ")+"; work orders override this.";
    }
  }
  const parts = [];
  for (const r in job.output || {}){
    const v = job.output[r];
    if (!v) continue;
    if (RESOURCES[r]) parts.push(`${RESOURCES[r].icon} +${v}/day ${RESOURCES[r].name}`);
    else if (r === "knowledge") parts.push(`📚 +${v}/day Knowledge`);
    else if (r === "reputation") parts.push(`🤝 +${v}/day Reputation`);
    else if (r === "happiness_all") parts.push(`😊 +${v}/day Happiness to all`);
    else if (r === "morale_all") parts.push(`✨ +${v}/day Morale to all`);
  }
  for (const r in job.consume || {}){
    const v = job.consume[r];
    if (RESOURCES[r]) parts.push(`${RESOURCES[r].icon} -${v}/day ${RESOURCES[r].name}`);
  }
  return parts.length ? parts.join(", ") : "No direct daily output; works through building effects or defense.";
}

function renderJobsTab(root){
  const g = G;
  const c = el("div","card");
  c.innerHTML = `<h3>🛠 Assign Jobs</h3><div class="muted">General jobs work anywhere. Building jobs stay locked until you build the matching workplace and have an open worker slot.</div>`;
  renderTabSearchInput(c, "jobs", "Search survivors or jobs: cook, guard, Ana…");
  const list = el("div");
  for (const s of adults(g)){
    if (s.isPlayer) continue;
    const curJob = JOBS[s.job||"none"];
    if(!matchesTabSearch("jobs", s.name, curJob.name, s.traits.map(t=>TRAITS[t].label).join(" "))) continue;
    const cur = g.jobs[s.id] || "none";
    const item = el("div","item");
    let opts = "";
    for (const jk of JOB_KEYS){
      const j = JOBS[jk];
      const available = jobAvailable(g, jk) || jk===cur;
      const out = jobOutputText(j);
      opts += `<option value="${jk}" ${jk===cur?"selected":""} ${available?"":"disabled"}>${j.name}${j.building?" ("+BUILDINGS[j.building].name+")":""} - ${out}</option>`;
    }
    item.innerHTML = `<div class="head"><span class="name">${s.name}</span> <span class="muted">${s.traits.map(t=>TRAITS[t].label).join(", ")}</span></div>
      <div class="desc">${JOBS[cur].desc}</div>
      <div class="desc"><b>Per day:</b> ${jobOutputText(JOBS[cur])}</div>`;
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
  const idle = freeWorkers(g).length;
  wc.innerHTML = `<h3>🏠 Worker Slots</h3>`;
  const head = el("div","row");
  head.appendChild(el("div","muted grow", idle ? `${idle} idle worker${idle>1?"s":""} available. Click a building to staff it.` : "No idle workers right now."));
  const autoBtn = el("button","small primary","Auto-assign idle"); autoBtn.disabled = !idle; autoBtn.title = idle ? "Fill open slots with the best-matching idle workers" : "No idle workers"; autoBtn.onclick = autoAssignIdle;
  head.appendChild(autoBtn);
  wc.appendChild(head);
  let anySlots = false;
  for (const id in g.buildings){
    const b = BUILDINGS[id]; if (!b || !b.workers || !g.buildings[id].count) continue;
    anySlots = true;
    const slots = b.workers * g.buildings[id].count;
    const assigned = (g.workerAssign[id]||[]);
    const item = el("div","item");
    item.innerHTML = `<div class="head"><span class="name">${b.icon} ${b.name}</span> <span class="meta">${assigned.length}/${slots} workers</span></div>`;
    const workerRow = el("div","row");
    for (const uid of assigned){ const s = survivorById(g,uid); if (!s) continue;
      const chip = el("button","small",`✕ ${s.name}`); chip.title = "Unassign"; chip.onclick = ()=>assignJob(uid,"none");
      workerRow.appendChild(chip);
    }
    if (!assigned.length) workerRow.appendChild(el("span","desc","(none)"));
    item.appendChild(workerRow);
    const open = openSlots(g,id);
    const assignBtn = el("button","small primary","+ Assign worker");
    assignBtn.disabled = open<=0 || !freeWorkers(g).length;
    assignBtn.title = open<=0 ? "No open slot" : !freeWorkers(g).length ? "No idle workers" : "";
    assignBtn.onclick = ()=>openWorkerPicker(g, id);
    item.appendChild(assignBtn);
    wc.appendChild(item);
  }
  if (!anySlots) wc.appendChild(el("div","muted","Build a workplace (well, garden, workshop…) to open worker slots."));
  root.appendChild(wc);
  renderProductionOrders(root);
}

function renderKnowledgeTab(root){
  const g = G;
  const c = el("div","card");
  c.innerHTML = `<h3>📚 Knowledge Tree</h3><div class="muted">Knowledge: <b>${Math.floor(g.knowledge*10)/10}</b>. Earn it by surviving, scavenging books, libraries, and schools.</div>`;
  renderTabSearchInput(c, "knowledge", "Search research: farming, medicine, forge…");
  const cats = {};
  for (const n of KNOWLEDGE){ if(!cats[n.cat]) cats[n.cat] = []; cats[n.cat].push(n); }
  for (const cat in cats){
    const matching = cats[cat].filter(n => {
      const unlocks = [...(n.unlock?.buildings||[]).map(b=>BUILDINGS[b]?.name||b),...(n.unlock?.jobs||[]).map(j=>JOBS[j]?.name||j)];
      return matchesTabSearch("knowledge", n.name, n.id, n.cat, n.desc, unlocks.join(" "));
    });
    if (!matching.length) continue;
    const wrap = el("div","kcat");
    wrap.innerHTML = `<h4>${cat}</h4>`;
    for (const n of matching){
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
  renderTabSearchInput(c, "buildings", "Search buildings: well, forge, wall…");
  const ids = Object.keys(g.buildings).filter(id=>g.buildings[id].count>0);
  const filteredIds = ids.filter(id => { const b=BUILDINGS[id]; return b && matchesTabSearch("buildings", b.name, id, b.cat, b.desc); });
  if (filteredIds.length===0){
    c.appendChild(el("div","muted",ids.length ? "No matches." : "Nothing built yet."));
  } else {
    const grid = el("div","grid2");
    for (const id of filteredIds){
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
  if (eff.farm) parts.push("Plant, water, grow, harvest; farmers automate tending");
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

// ===================== GUIDE: SEARCH + PRICING =====================
// A searchable, always-accurate reference generated live from the DATA tables
// (RESOURCES, BUILDINGS, JOBS, KNOWLEDGE, RECIPES, ITEMS, MAP_FEATURES,
//  MAP_ENTITIES, ENEMIES, BIOMES, TRAITS, CROPS). Because it reads the real
// tables, it never drifts from the game or from PRICING.md.

let _guideSearch = "";
let _searchIndex = null;

function priceNum(n){ return n % 1 === 0 ? ""+n : (+n.toFixed(2)).toString(); }

// Format a {key:amount} or {key:[lo,hi]} map as "4 🧵 Cloth · 2 🪵 Wood".
function fmtResMap(obj, sep=" · "){
  if (!obj) return "—";
  const parts=[];
  for (const k in obj){
    const v=obj[k], r=RESOURCES[k];
    const amt=Array.isArray(v) ? (v[0]===v[1]?priceNum(v[0]):`${priceNum(v[0])}–${priceNum(v[1])}`) : priceNum(v);
    parts.push(`${amt} ${r&&r.icon?r.icon+" ":""}${r?r.name:k}`);
  }
  return parts.length ? parts.join(sep) : "—";
}
// Human names of every resource referenced by a map — feeds the search text blob.
function resNamesOf(obj){
  return obj ? Object.keys(obj).map(k=>RESOURCES[k]?RESOURCES[k].name:k).join(" ") : "";
}
// Which research unlocks each building / job id.
function buildUnlockMaps(){
  const b={}, j={};
  for (const n of KNOWLEDGE){
    for (const id of (n.unlock&&n.unlock.buildings||[])) b[id]=n.name;
    for (const id of (n.unlock&&n.unlock.jobs||[])) j[id]=n.name;
  }
  return {b,j};
}
function buildingEffectText(b){
  const e=b.effects||{}, out=[];
  if (e.housing) out.push(`houses ${e.housing}`);
  if (e.storage) out.push(`+${e.storage} shared storage load (resources and gear)`);
  if (e.food_storage) out.push(`+${e.food_storage} food/crop/meat-only load`);
  if (e.warmth) out.push("provides warmth");
  if (e.cook) out.push("lets you cook");
  if (e.produce) out.push(`produces ${fmtResMap(e.produce)}/day`);
  if (e.produce_per_worker) out.push(`produces ${fmtResMap(e.produce_per_worker)} per worker/day`);
  if (e.convert) out.push(`converts ${fmtResMap(e.convert.from)} → ${fmtResMap(e.convert.to)} (×${e.convert.perWorker}/worker)`);
  if (e.consume) out.push(`uses ${fmtResMap(e.consume)}/day`);
  if (e.heal_per_worker) out.push(`heals ${e.heal_per_worker} HP per worker`);
  if (e.disease_resist) out.push("disease resistance");
  if (e.happiness_all) out.push("+happiness for everyone");
  if (e.morale_all) out.push("+morale for everyone");
  if (e.happiness) out.push("+happiness");
  if (e.reputation) out.push("+reputation");
  if (e.knowledge || e.knowledge_per_worker) out.push("generates knowledge");
  if (e.child_growth) out.push("children grow faster");
  if (e.safety || e.safety_per_worker) out.push("+settlement safety");
  if (e.wall) out.push(`+${e.wall} wall (reduces raid damage)`);
  if (e.warning) out.push("early raid warning");
  if (e.danger_reduce) out.push(`-${e.danger_reduce} danger`);
  if (e.combat_train) out.push("trains combat skill");
  if (e.attract_chance) out.push("attracts survivors");
  if (e.trade_chance) out.push("attracts traders");
  if (e.repair) out.push("repairs buildings");
  if (e.order) out.push("holds troublemakers");
  return out.join("; ");
}

// Build the full "Prices & Costs" guide section from the live tables.
function guidePriceSection(){
  const U=buildUnlockMaps();

  // Quick & survival actions (times pulled from ACTION_COSTS).
  const qa=[
    ["🍞 Eat","eat","1 food → +30 hunger"],
    ["💧 Drink","drink","1 clean water (+30) or dirty (+20, 15% illness)"],
    ["🪓 Chop Wood","chop_wood","3–5 wood; axes boost speed & yield"],
    ["🌿 Forage","gather","food, herbs and seeds"],
    ["🪣 Fetch Water","fetch_water","2 water (3 w/ canteen, 5 w/ bucket) beside water"],
    ["🔥 Boil Water","boil_water","2 dirty + 1 wood → 2 clean water (needs fire)"],
    ["⬛ Purify Water","purify_water","2 dirty + 1 charcoal → 2 clean water"],
    ["🍳 Cook","cook","1 meat or 2 crops + 1 wood → 3 food"],
    ["♨️ Warm Up","warm_fire","+30 warmth at a fueled fire"],
    ["🎺 Gather Spirits","gather_spirits","+happiness for the nearby group"],
    ["🏹 Craft Arrows","craft_arrows","1 wood + 1 bones → 5 arrows"],
    ["🦌 Hunt","hunt","carry bow + spend 1 arrow → meat, hides, bones"],
    ["💤 Rest","rest","+7 energy (short rest)"],
    ["🥋 Train","train","+0.5 combat skill"],
    ["📖 Study","study","1 book → +2–5 knowledge"],
    ["⛏ Mine","mine","needs pickaxe → ore / stone"],
    ["🕳️ Dig","dig","needs shovel → clay / sand"],
    ["🎣 Fish","fish","needs rod beside water → meat"],
  ];
  let qaRows="";
  for (const [name,key,eff] of qa){
    const t = (key==="eat"||key==="drink") ? "instant" : (ACTION_COSTS[key]!=null?timeText(ACTION_COSTS[key]):"—");
    qaRows+=`<tr><td>${name}</td><td>${t}</td><td>${eff}</td></tr>`;
  }
  qaRows+=`<tr><td>🛏️ Sleep</td><td>2h / 4h / 8h</td><td>recovers 4–14 energy/hr by shelter; exposure applies</td></tr>`;

  // Crafting recipes.
  let recRows="";
  for (const id in RECIPES){
    const r=RECIPES[id];
    const name=r.name || (r.item&&ITEMS[r.item]?ITEMS[r.item].name:id);
    const yields=r.output ? fmtResMap(r.output) : (r.item&&ITEMS[r.item]?`${ITEMS[r.item].icon||""} ${ITEMS[r.item].name}`:id);
    const station=r.station ? r.station.replace(/_/g," ") : "by hand";
    recRows+=`<tr><td>${name}</td><td>${fmtResMap(r.cost)}</td><td>${yields}</td><td>${timeText(r.minutes)}</td><td>${station}${r.tech?` · ${r.tech}`:""}</td></tr>`;
  }

  // Buildings grouped by category.
  const catOrder=["Shelter","Storage","Water","Food","Medicine","Community","Education","Crafting","Engineering","Defense","Trade","Survival"];
  const byCat={};
  for (const id in BUILDINGS){ const b=BUILDINGS[id]; (byCat[b.cat]=byCat[b.cat]||[]).push([id,b]); }
  const cats=[...catOrder.filter(c=>byCat[c]), ...Object.keys(byCat).filter(c=>!catOrder.includes(c))];
  let bldHtml="";
  for (const cat of cats){
    let rows="";
    for (const [id,b] of byCat[cat]){
      const free=!b.cost || Object.keys(b.cost).length===0 || (Object.keys(b.cost).length===1 && b.cost.wood===0);
      const cost=free ? "free" : fmtResMap(b.cost);
      const unlock=U.b[id] ? ` <span class="dim">🔒 ${U.b[id]}</span>` : "";
      rows+=`<tr><td>${b.icon||""} ${b.name}</td><td>${cost}</td><td>${buildingEffectText(b)||"—"}${unlock}</td></tr>`;
    }
    bldHtml+=`<div class="price-cat">${cat}</div><div class="price-wrap"><table class="price-table"><tr><th>Building</th><th>Cost</th><th>Effect</th></tr>${rows}</table></div>`;
  }

  // Research by cost.
  const byCost={};
  for (const n of KNOWLEDGE){ (byCost[n.cost]=byCost[n.cost]||[]).push(n.name); }
  let knowRows="";
  for (const cost of Object.keys(byCost).map(Number).sort((a,b)=>a-b)){
    knowRows+=`<tr><td>${cost} 🧠</td><td>${byCost[cost].join(" · ")}</td></tr>`;
  }

  // World-map travel.
  let travelRows="";
  for (const k in TRAVEL){
    if (k==="village") continue;
    const [mins,en]=TRAVEL[k];
    travelRows+=`<tr><td>${BIOMES[k]?BIOMES[k].name:k}</td><td>${mins}m</td><td>${en}</td></tr>`;
  }
  travelRows+=`<tr><td>River / Lake</td><td colspan="2">impassable</td></tr>`;

  return `
    <div class="guide-section" id="g-pricing">
      <h3>💰 Prices &amp; Costs</h3>
      <p class="muted">A complete reference of what everything costs — generated live from the game data, so it always matches the current build. Use the search box at the top to look up any single item (e.g. “clean water”).</p>
      <p><b>Four currencies:</b> ⏳ Time (phases of 6h; 4 phases = 1 day) · 📦 Resources · 🧠 Knowledge (research only) · ⚡ Energy (drained by most actions &amp; every step).</p>

      <h4>⚡ Quick &amp; survival actions</h4>
      <div class="price-wrap"><table class="price-table"><tr><th>Action</th><th>Time</th><th>Effect / cost</th></tr>${qaRows}</table></div>

      <h4>🛠️ Crafting recipes</h4>
      <div class="price-wrap"><table class="price-table"><tr><th>Item</th><th>Cost</th><th>Yields</th><th>Time</th><th>Station</th></tr>${recRows}</table></div>

      <h4>🏘️ Buildings</h4>
      ${bldHtml}

      <h4>🧠 Research (knowledge points)</h4>
      <div class="price-wrap"><table class="price-table"><tr><th>Cost</th><th>Tech</th></tr>${knowRows}</table></div>

      <h4>🚶 World-map travel (per tile)</h4>
      <div class="price-wrap"><table class="price-table"><tr><th>Terrain</th><th>Time</th><th>Energy</th></tr>${travelRows}</table></div>
      <p class="muted">Each step also drains ~0.12 hunger and ~0.18 thirst (0.4 in wasteland). Condition penalties (cold, injury, disease, hunger, thirst) multiply both time and energy. A carried canteen cuts travel thirst by 20%.</p>

      <h4>💀 Involuntary losses</h4>
      <ul>
        <li><b>Combat defeat</b> — lose 20% of carried wood, food, water, cloth, metal and weapons (town stocks are safe).</li>
        <li><b>Raids / theft</b> — attackers can steal food, water, metal, weapons, ammo, cloth and tools, and may damage buildings.</li>
      </ul>
    </div>
  `;
}

// Build a flat, searchable index of (almost) everything in the game.
function buildSearchIndex(){
  if (_searchIndex) return _searchIndex;
  const U=buildUnlockMaps();
  const idx=[];
  const strip=s=>String(s).replace(/<[^>]+>/g," ");
  const add=(cat,icon,name,id,detail,extra="")=>idx.push({
    cat, icon:icon||"•", name, detail,
    text:(name+" "+id+" "+cat+" "+strip(detail)+" "+extra).toLowerCase()
  });
  const inline=obj=>fmtResMap(obj).replace(/ · /g,", ");

  // Resources
  for (const k in RESOURCES){ const r=RESOURCES[k]; const w=RESOURCE_WEIGHTS[k];
    add("Resource",r.icon,r.name,k,`Raw or crafted resource.${w!=null?` Carry weight ${w} per unit.`:""}`); }

  // Buildings
  for (const id in BUILDINGS){ const b=BUILDINGS[id], e=b.effects||{};
    const free=!b.cost || Object.keys(b.cost).length===0 || (Object.keys(b.cost).length===1 && b.cost.wood===0);
    const detail=`${b.desc||""} <b>Cost:</b> ${free?"free":fmtResMap(b.cost)}. ${buildingEffectText(b)}${b.workers?` · ${b.workers} worker slot${b.workers>1?"s":""}`:""}${U.b[id]?` · unlocked by ${U.b[id]}`:""}.`;
    const extra=[b.cost,e.produce,e.produce_per_worker,e.consume,e.convert&&e.convert.from,e.convert&&e.convert.to]
      .map(resNamesOf).join(" ")+" "+(b.cat||"");
    add("Building",b.icon,b.name,id,detail,extra);
  }

  // Jobs
  for (const id in JOBS){ if (id==="none") continue; const j=JOBS[id];
    const bld=j.building ? ` Works at ${BUILDINGS[j.building]?BUILDINGS[j.building].name:j.building}.` : " General task (no building needed).";
    const con=j.consume ? ` Uses ${inline(j.consume)}/day.` : "";
    const out=Object.keys(j.output||{}).length ? ` Output: ${inline(j.output)}/day.` : "";
    add("Job",(j.building&&BUILDINGS[j.building]&&BUILDINGS[j.building].icon)||"🧑‍🔧",j.name,id,`${j.desc||""}${bld}${out}${con}`,resNamesOf(j.output)+" "+resNamesOf(j.consume));
  }

  // Research
  for (const n of KNOWLEDGE){
    const unl=[...(n.unlock&&n.unlock.buildings||[]).map(b=>BUILDINGS[b]?BUILDINGS[b].name:b),
               ...(n.unlock&&n.unlock.jobs||[]).map(j=>JOBS[j]?JOBS[j].name:j)];
    const req=(n.req||[]).map(r=>{const f=KNOWLEDGE.find(x=>x.id===r);return f?f.name:r;});
    add("Research","🧠",n.name,n.id,`${n.desc||""} <b>Cost:</b> ${n.cost} 🧠.${req.length?` Requires ${req.join(", ")}.`:""}${unl.length?` Unlocks ${unl.join(", ")}.`:""}`,n.cat+" "+unl.join(" "));
  }

  // Recipes
  for (const id in RECIPES){ const r=RECIPES[id];
    const name=r.name || (r.item&&ITEMS[r.item]?ITEMS[r.item].name:id);
    const yields=r.output ? inline(r.output) : (r.item&&ITEMS[r.item]?ITEMS[r.item].name:id);
    add("Recipe","🛠",name,id,`Craft ${fmtResMap(r.cost)} → ${yields}. ${timeText(r.minutes)} at ${r.station?r.station.replace(/_/g," "):"hand"}${r.tech?` (needs ${r.tech})`:""}.`,resNamesOf(r.cost)+" "+resNamesOf(r.output)+" "+(r.item||""));
  }

  // Items / gear
  for (const id in ITEMS){ const it=ITEMS[id], rec=RECIPES[id], s=[];
    if (it.durability) s.push(`durability ${it.durability}`);
    if (it.weight!=null) s.push(`weight ${it.weight}`);
    if (it.capacity) s.push(`carry capacity ${it.capacity}`);
    if (it.armor) s.push(`armor ${it.armor}`);
    if (it.insulation) s.push(`insulation ${it.insulation}`);
    if (it.damage) s.push(`damage ${it.damage}`);
    if (it.vision) s.push(`+${it.vision} night vision`);
    const craft=rec ? ` Craft ${fmtResMap(rec.cost)} (${timeText(rec.minutes)}${rec.station?", "+rec.station.replace(/_/g," "):""}).` : "";
    add("Gear",it.icon||"🎒",it.name,id,`${it.desc||""} ${s.join(", ")}.${craft}`,it.kind||"");
  }

  // Map features
  for (const id in MAP_FEATURES){ const f=MAP_FEATURES[id];
    const biomes=(f.biomes||[]).map(b=>BIOMES[b]?BIOMES[b].name:b).join(", ");
    const bits=[];
    if (f.loot) bits.push(`yields ${inline(f.loot)}`);
    if (f.underground) bits.push("underground expedition entrance");
    if (f.renewable) bits.push("renewable");
    if (f.heal) bits.push(`heals ${f.heal} HP`);
    if (f.warmth) bits.push(`+${f.warmth} warmth`);
    if (f.knowledge) bits.push("gives knowledge");
    if (f.damage) bits.push(`⚠ damage ${f.damage[0]}–${f.damage[1]}`);
    if (f.energyLoss) bits.push(`⚠ -${f.energyLoss} energy`);
    if (f.curse) bits.push(`⚠ risk of ${f.curse}`);
    if (f.hidden) bits.push("hidden until triggered");
    if (f.event) bits.push("random event");
    if (f.rare) bits.push("rare");
    add("Map feature",f.icon,f.name,id,`${f.desc||""} Found in ${biomes}. ${bits.join("; ")}.`,resNamesOf(f.loot)+" "+biomes+(f.hidden?" trap hazard":"")+(f.underground?" underground":""));
  }

  // Map entities (hostiles, huntable animals, friendlies)
  for (const id in MAP_ENTITIES){ const m=MAP_ENTITIES[id];
    const biomes=(m.biomes||[]).map(b=>BIOMES[b]?BIOMES[b].name:b).join(", ");
    let detail="", extra=biomes;
    if (m.hostile){ const en=ENEMIES[m.enemy]||{};
      detail=`Hostile — attacks on contact. HP ${en.hp}, damage ${en.dmg?en.dmg[0]+"–"+en.dmg[1]:"?"}, danger ${en.danger}. Drops ${inline(en.loot)}. Roams ${biomes}.${m.nightOnly?" Appears at night only.":""}`;
      extra+=" hostile enemy combat "+resNamesOf(en.loot);
    } else if (m.huntable){
      detail=`Huntable animal — flees contact; shoot with a bow from 1–3 tiles. Drops ${inline(m.loot)}. Found in ${biomes}.`;
      extra+=" huntable animal hunt "+resNamesOf(m.loot);
    } else if (m.friendly){
      detail=`Friendly NPC — talk, and often recruit by leading them to your campfire. Found in ${biomes}.`;
      extra+=" friendly npc recruit survivor "+m.friendly;
    }
    add("Creature / NPC",m.icon,m.name,id,detail,extra);
  }

  // Biomes
  for (const k in BIOMES){ const b=BIOMES[k], tv=TRAVEL[k], flags=[];
    if (b.blocks) flags.push("impassable"); if (b.hazard) flags.push("hazardous");
    if (b.radiation) flags.push("radioactive"); if (b.cold) flags.push("cold");
    if (b.dry) flags.push("arid"); if (b.dark) flags.push("dark"); if (b.safe) flags.push("safe");
    add("Biome",b.icon||"🗺",b.name,k,`Terrain.${tv?` Travel ${tv[0]}m and ${tv[1]} energy per tile.`:b.blocks?" Blocks movement.":""}${flags.length?` ${flags.join(", ")}.`:""}`);
  }

  // Traits
  for (const k in TRAITS) add("Trait","✨",TRAITS[k].label,k,TRAITS[k].effect);

  // Crops
  for (const k in CROPS){ const c=CROPS[k];
    add("Crop","🌱",c.name,k,`Grows in ${c.days} base days → ${inline(c.output)}.${c.perennial?" Perennial — regrows without replanting.":""}`); }

  _searchIndex=idx;
  return idx;
}

const SEARCH_CAT_ORDER=["Resource","Recipe","Gear","Building","Job","Research","Crop","Map feature","Creature / NPC","Biome","Trait"];

function renderGuideSearchResults(query, container){
  if (!container) return;
  const raw=(query||"").trim();
  const q=raw.toLowerCase();
  if (q.length<2){
    container.innerHTML=`<div class="search-empty">Search anything in the game — resources, buildings, jobs, recipes, research, gear, map features, creatures… <br>Try <b>clean water</b>, <b>iron</b>, <b>wolf</b>, <b>medicine</b> or <b>forge</b>.</div>`;
    return;
  }
  const tokens=q.split(/\s+/).filter(Boolean);
  const hits=buildSearchIndex().filter(e=>tokens.every(t=>e.text.includes(t)));
  if (!hits.length){ container.innerHTML=`<div class="search-empty">No matches for “${escapeHtml(raw)}”.</div>`; return; }
  const score=e=>{
    const n=e.name.toLowerCase(); let s=0;
    if (n===q) s+=1000; else if (n.startsWith(q)) s+=400; else if (n.includes(q)) s+=200;
    for (const t of tokens) if (n.includes(t)) s+=40;
    return s;
  };
  hits.sort((a,b)=>score(b)-score(a) || a.name.localeCompare(b.name));
  const cap=80, shown=hits.slice(0,cap), groups={};
  for (const e of shown) (groups[e.cat]=groups[e.cat]||[]).push(e);
  const cats=[...SEARCH_CAT_ORDER.filter(c=>groups[c]), ...Object.keys(groups).filter(c=>!SEARCH_CAT_ORDER.includes(c))];
  let html=`<div class="search-summary">${hits.length} result${hits.length>1?"s":""}${hits.length>cap?` (showing first ${cap})`:""} for “${escapeHtml(raw)}”</div>`;
  for (const cat of cats){
    html+=`<div class="search-cat">${cat} <span class="dim">(${groups[cat].length})</span></div>`;
    for (const e of groups[cat])
      html+=`<div class="search-result"><div class="sr-icon">${e.icon}</div><div class="sr-body"><div class="sr-name">${escapeHtml(e.name)}</div><div class="sr-detail">${e.detail}</div></div></div>`;
  }
  container.innerHTML=html;
}

function renderGuideTab(root){
  const c = el("div","card");
  c.innerHTML = `
    <h3>📖 Post 2045 — Player Guide</h3>
    <div class="muted">Everything you need to know to survive and rebuild. Use the table of contents to jump to a section.</div>
    <div class="guide-toc">
      <a href="#g-overview">Overview</a>
      <a href="#g-pricing">💰 Prices &amp; Costs</a>
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
        <li><b>Sleep</b> previews exposure, supplies and shelter; choose 2, 4 or 8 hours. Outdoors can be lethal.</li>
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
        <li><b>⚡ Energy</b> — used by every action and step. Below 5 = too exhausted to do anything. Rest or sleep restores it; housing improves recovery.</li>
        <li><b>🔥 Warmth</b> — drops at night and in cold biomes (snow). Campfire and shelter help.</li>
        <li><b>😊 Happiness</b> — affected by hunger, thirst, cold, social actions, and building auras (inn, tavern, bathhouse).</li>
        <li><b>✨ Morale</b> — based mostly on happiness and settlement safety; shrines, halls, town hall, and the Gather Spirits action help.</li>
        <li><b>🛡 Safety</b> — settlement-wide; raised by guards, walls and watchtowers.</li>
      </ul>
      <p><b>Conditions</b>: <span class="bad">🤒 Diseased</span> drains health every tick — cure with medicine or wait. <span class="warn">🩹 Injured</span> when below 50 HP; clinic workers heal it.</p>
    </div>

    <div class="guide-section" id="g-actions">
      <h3>⚡ Quick Actions (Left Panel)</h3>
      <p>These let you do small chores when your current map position and supplies make them possible. Disabled buttons show the missing requirement on hover.</p>
      <ul>
        <li><b>🍞 Eat</b> — instant, uses 1 food, +30 hunger.</li>
        <li><b>💧 Drink</b> — instant, uses water or risky dirty water.</li>
        <li><b>Rest</b> — 30 minutes, +7 energy up to 60 before phase decay; exposure and encounters still apply. Sleep is needed for full recovery.</li>
        <li><b>Chop Wood</b> — 30 minutes, 3–5 wood; axes improve speed and yield.</li>
        <li><b>Forage</b> — food, herbs and seeds in 20 minutes.</li>
        <li><b>Fetch Water</b> — stand next to water; 10 minutes for 2 water, 3 with a canteen, 5 with a bucket.</li>
        <li><b>🔥 Boil Water</b> — 2 dirty + 1 wood → 2 clean water at a nearby fire.</li>
        <li><b>⬛ Purify Water</b> — 2 dirty + 1 charcoal → 2 clean water.</li>
        <li><b>🍳 Cook</b> — 1 meat or 2 crops + 1 wood → 3 food.</li>
        <li><b>Warm Up</b> — 15 minutes at a fueled fire restores 30 warmth.</li>
        <li><b>Share stories</b> — 30 minutes to raise the nearby group's happiness.</li>
        <li><b>Craft Arrows</b> — 1 wood + 1 bone makes 5 arrows in 15 minutes.</li>
        <li><b>Hunt</b> — carry a bow and spend an arrow to shoot a visible animal 1–3 tiles away.</li>
      </ul>
      <p>Expand the action groups for mining, fishing, camp setup and repairs. <b>Train</b> and <b>Study</b> take one hour each.</p>
      <h4>Inventory, crafting and camping</h4>
      <p>Your carrying capacity starts at 30 load; equip backpacks for 45 or 65. Every personal pickup enters your pack. Return beside the home campfire or a storage building to unload. Base storage starts at 80 shared load; sheds add 100, warehouses 400, and food cellars 200 food-only load. Your starting water container holds 3; carried canteens add 3 and buckets add 5. Water also weighs 0.6 load per unit. Finite loot you cannot carry remains at its source.</p>
      <p>Build a <b>Crafting Table</b> for bows, tents and equipment. Stone tools and sleeping bags can be crafted by hand. The Crafting tab lists exact recipes and station requirements. Tools wear down and can be repaired with repair kits. Torches and lanterns need fuel. A carried compass points home.</p>
      <p>Deploy your sleeping bag and portable tent before sleeping. One wood gives a field fire four hours of fuel. Rain, cold, nearby hostiles and radiation matter: check the sleep preview. A lean-to costs 4 wood and 4 fiber. Pack your camp before moving on.</p>
      <h4>Farming and production</h4>
      <p>Build a Garden and plant seeds in Farming. Water, compost and harvest by hand, or assign a farmer to tend each plot. Crops take 2–4 base days and return seeds. Fence crops against wildlife and install irrigation to draw stored water automatically. Seed Savers produce seeds instead of tending plots. In Jobs, set workplace production orders for fixed batches or stock targets; required resources are actually consumed. Claim mines and fishing sites from nearby tile dialogs. Haulers retrieve caches from supply outposts.</p>
    </div>

    <div class="guide-section" id="g-map">
      <h3>🗺 World Map</h3>
      <p>The world grows procedurally in every direction, with no fixed map edges. Terrain is generated in 20×20-tile chunks as you explore; existing saved maps keep their original terrain. Your viewport follows you. Seen tiles are remembered in fog. Wildlife and resource renewal run on explored ground within 28 tiles of you or your settlement; distant regions retain their last state. Night runs from 20:00 to 06:00; vision shrinks from 6 tiles to 3, with carried lights adding visibility.</p>
      <p>Roads cost 5 minutes per tile, plains 6, forests/hills/ruins 10, harsh terrain 12, and mountains/deep forest/swamp 15. Rivers and lakes block walking. Poor condition increases costs. Auto-walk chooses the fastest known route and can stop at nightfall.</p>
      <p><b>Hazardous biomes</b>: swamps and irradiated zones can damage you when you walk through; radiation can give you disease. Snow drains warmth fast.</p>
      <p><b>Your village</b> is the 🔥 marker — adjacent to it, your followers join your settlement and you're "at home" for trading/recruiting purposes.</p>
    </div>

    <div class="guide-section" id="g-encounters">
      <h3>🧭 Encounters (walk into things)</h3>
      <p>Use <b>Search nearby</b> or right-click to harvest features within one tile. Walk into people to talk and enemies to fight. Hidden traps still trigger on contact.</p>
      <ul>
        <li><b>Resource features</b> have finite stock and recovery timers. Harvest plants in 5 minutes, search ordinary features in 20, and mine in 30 before tool bonuses. Exhausted features remain visible; inspect them for remaining supply and recovery time.</li>
        <li><b>Underground entrances</b> (⛏ mines, 🕳 caves / drains, 🚇 subway stairs) — open an expedition dialog. Shallow routes are safer; deep routes take more time and energy but have better loot and more danger.</li>
        <li><b>Every gathering source is finite.</b> Water starts with 20 units and replenishes on a 5-hour cycle after first collection. Plants and wildlife recover in 24 hours, timber in 48 hours, minerals and salvage in 72 hours. Inspect a source for remaining stock and return time. Empty sources and full packs block gathering without spending time or energy. Workers share local reserves.</li>
        <li><b>Ruins</b> (houses, hospitals, factories, libraries…) — best loot, often dangerous nearby.</li>
        <li><b>Hidden hazards</b> (landmines, traps, pitfalls) — invisible until you step on them. Hurt!</li>
        <li><b>Friendly NPCs</b> (🧒 child, 🤕 wounded, 🚶 wanderer, 🧙 hermit, 🩺 doctor, 🔧 mechanic, 📖 scholar, 🐶 dog, 👨‍👩‍👧 refugees…) — open a dialog with options. Pick "Take with you" and they'll appear in the "Following" strip. Walk to your 🔥 campfire to recruit them.</li>
        <li><b>Hostile entities</b> (🐺 wolves, 🐻 bears, 🧟 infected, 🥷 raiders, 👹 mutants…) — start combat on contact. Some (🦇 night stalkers) only appear at night.</li>
        <li><b>Huntable animals</b> (🐇 rabbits, 🦌 deer, 🐗 boar, 🦃 turkeys, 🐐 goats) — run when approached. Use the Hunt quick action from 1–3 tiles away.</li>
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
      <p><b>Damage mitigation</b>: equipped leather armor reduces hits by 3. Stockpiled materials do not protect you in the field.</p>
      <p><b>Losing</b> costs carried supplies. At zero health, a nearby medic or helper with accessible medicine may rescue you; otherwise a living child can continue your line, or the run ends.</p>
    </div>

    <div class="guide-section" id="g-build">
      <h3>🏗 Building</h3>
      <p>Open the <b>Build</b> tab, choose <b>Place</b>, then click an empty plot in the <b>Town</b> tab. Buildings are grouped by category: Shelter, Storage, Water, Food, Medicine, Community, Education, Crafting, Engineering, Defense, Trade.</p>
      <ul>
        <li>Buildings cost town resources up-front. Starter structures take 45 minutes, housing 3 hours, major structures 8 hours, and other buildings 2 hours. A carried hammer saves 20%.</li>
        <li>Each building has a <b>max count</b> — you can't spam the same thing forever.</li>
        <li>Most buildings need to be <b>unlocked by research</b> first.</li>
        <li>Many buildings provide <b>worker slots</b>; assign survivors in the Jobs tab to make them produce.</li>
      </ul>
      <p><b>Storage</b>: the campfire holds 80 shared load, including stored equipment. Sheds add 100, warehouses 400, fuel depots 50; food cellars add 200 food-only load. Return beside the fire or storage to unload. Full storage pauses production and leaves untransferred items in your pack. Crowded stores can cause food spoilage.</p>
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
      <p><b>Relationships</b>: survivors are male or female. Unpartnered adults of opposite sex may form bonds if housing allows. You can also <b>Court</b> an eligible survivor in this tab, then <b>Marry</b> once their heart reaches 100.</p>
      <p><b>Lineage</b>: married partners may have a child on day-end (slow rate, needs spare housing). If you die and have a living child, you continue as that child so your family line survives. Children grow over ~20 days into adults; <b>schools</b> double growth speed.</p>
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
        <li><b>First morning</b>: Build a Crafting Table, make a sleeping bag and stone tools, and pack food and water. A spring, reeds, loose stone and wood are guaranteed near a new camp.</li>
        <li><b>First expedition</b>: Explore, use Search nearby, recruit a survivor and return with supplies. Build a portable tent before overnight travel.</li>
        <li><b>First shelter</b>: Starter tents and rain barrels are available immediately. Build a settlement tent for reliable sleep near home.</li>
        <li><b>First garden</b>: Build a Garden, plant a seed and keep it watered. Add a shed before your stocks fill.</li>
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
    ${guidePriceSection()}
  `;

  // Search card — appended above the guide so it is the first thing you see.
  const sc = el("div","card guide-search-card");
  sc.innerHTML = `
    <h3>🔎 Search the Game</h3>
    <div class="guide-search"><input type="search" id="guide-search-input" placeholder="Search anything: clean water, iron, wolf, medicine…" autocomplete="off" spellcheck="false"></div>
    <div id="guide-search-results"></div>
  `;
  root.appendChild(sc);
  root.appendChild(c);

  const input = sc.querySelector("#guide-search-input");
  const results = sc.querySelector("#guide-search-results");
  input.value = _guideSearch;
  input.addEventListener("input", ()=>{ _guideSearch = input.value; renderGuideSearchResults(_guideSearch, results); });
  renderGuideSearchResults(_guideSearch, results);
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
  if (p.energy < 15) return "I'm exhausted. Check the <b>Sleep</b> preview and deploy shelter before sleeping outside. A short <b>Rest</b> restores some energy but still exposes me to the weather.";
  if (p.thirst < 20){
    if (playerAmount(g,"water") >= 1) return "I'm parched. I have accessible clean water — use <b>Drink</b>.";
    if (playerCanPay(g,{dirty_water:2,charcoal:1})) return "I'm parched. Use <b>Filter Water</b> to filter dirty water through charcoal, then drink.";
    if (playerCanPay(g,{dirty_water:2,wood:1})) return "I'm parched. Use <b>Boil Water</b> near a fire, then drink.";
    return "I'm parched and there's no water at camp. I should find a <b>spring (💧), pond, stream</b>, or the river on the map — then bring it back and boil it.";
  }
  if (p.hunger < 20){
    if (playerAmount(g,"food") >= 1) return "Starving — use <b>Eat</b> in Quick Actions.";
    if (playerAmount(g,"meat") >= 1 || playerAmount(g,"crops") >= 2) return "Starving. I have ingredients — use <b>Cook</b> near a fire, then eat.";
    return "Starving and the larder is empty. I should <b>🌿 Forage</b>, hunt a deer carcass, or walk to a berry bush on the map.";
  }
  if (p.health < 30) return "I'm hurt badly. Get back to camp, rest, and find medicine. Hot springs (♨) on the map also heal.";
  if (p.diseased){
    if (playerAmount(g,"medicine") >= 1) return "I'm sick — use <b>Treat</b> beside Medicine in Inventory to recover.";
    return "I'm <b>diseased</b>. I need medicine — search hospitals, medicine cabinets, or research <b>Herbalism</b> to brew it from herbs.";
  }
  if (p.warmth < 25){
    if (isNight(g)) return "I'm freezing at night. Fuel a field fire with wood, then <b>Warm up</b>, or return to a fueled settlement fire.";
    return "I'm cold. Use <b>🔥 Warm Up</b>, head back toward camp, or find shelter.";
  }

  // Resource shortages
  if (playerAmount(g,"wood") < 2) return "Accessible wood is almost gone. <b>Chop Wood</b>, search a fallen log, or pack supplies from home.";
  if (playerAmount(g,"water") < 1 && playerAmount(g,"dirty_water") < 1) return "No accessible water. Find a spring or stream, or pack water from home.";
  if (playerAmount(g,"food") < 2) return "Accessible food is running low. Forage, fish or cook; grow a Garden at home for future supplies.";

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
  const focused = document.activeElement;
  _tabSearchFocused = focused?.dataset?.tabSearch || null;
  _tabSearchSelection = _tabSearchFocused ? [focused.selectionStart,focused.selectionEnd] : null;
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
  passMinutes(G,15);
  render(); save();
}

function toggleRealtime(){
  setRealtimeSpeed(_rtSpeed ? 0 : 1);
}

function cycleRealtimeSpeed(){
  const next = _rtSpeed === 0 ? 1 : (_rtSpeed % 3) + 1;
  setRealtimeSpeed(next);
}

function appendButton(root,label,action,disabled=false,title=""){
  const b=el("button","small",label); b.onclick=action; b.disabled=!!disabled; b.title=title; root.appendChild(b); return b;
}
function renderInventoryTab(root){
  const g=G,home=storageAccess(g),here=g.caches[positionKey(g)],used=storageUsage(g);
  const card=el("div","card",`<h3>Inventory · ${fmt(packWeight(g))} / ${packCapacity(g)} load</h3><p>Water containers: ${fmt(liquidAmount(g))} / ${liquidCapacity(g)} units<br>Base: ${fmt(used.general)} / ${totalStorageCap(g)} shared load${used.cellar?` · Food cellar: ${fmt(used.food)} / ${used.cellar}`:""}</p><p class="muted">${home?"Unload supplies into base storage, or take what fits.":"Walk beside the home campfire or a storage building to transfer. Only carried supplies are available here."} Every personal pickup enters your pack. Tools are selected automatically; equip weapons, clothing and backpacks.</p>${packWeight(g)>packCapacity(g)+1e-8 || liquidAmount(g)>liquidCapacity(g)+1e-8?'<p class="warn">Existing carried supplies exceed capacity. Unload or use them before collecting more.</p>':""}`);
  const controls=el("div","row");
  for(const preset of ["Day Trip","Overnight","Mining"]) appendButton(controls,"Pack "+preset,()=>packPreset(preset),!home);
  appendButton(controls,"Unload materials",()=>depositMaterials(false),!home);
  appendButton(controls,"Unload all supplies",()=>depositMaterials(true),!home);
  card.appendChild(controls);
  card.appendChild(el("p","muted","Packing presets fill consumables only. Take camping gear and tools separately. Take/drop buttons split stacks; Full transfers as much as fits."));
  renderTabSearchInput(card, "inventory", "Search items: wood, axe, bandage…");
  for(const key of RES_KEYS){
    const carried=g.inventory.resources[key] || 0,stored=g.resources[key] || 0;
    if(!carried && !(home && stored)) continue;
    if(!matchesTabSearch("inventory", RESOURCES[key].name, key)) continue;
    const row=el("div","inventory-row",`<div><b>${RESOURCES[key].name}</b><div class="muted">Pack ${fmt(carried)}${home?` · Town ${fmt(stored)}`:""} · ${resourceWeight(key)} load/unit</div></div>`);
    const buttons=el("div","row");
    if(home){
      appendButton(buttons,"Take 1",()=>transferResource(key,1,"take"),stored<1 || carryRoom(g,key)<1);
      appendButton(buttons,"Take 5",()=>transferResource(key,5,"take"),stored<=0 || carryRoom(g,key)<0.001);
      appendButton(buttons,"Take what fits",()=>transferResource(key,stored,"take"),stored<=0 || carryRoom(g,key)<0.001);
      appendButton(buttons,"Store 1",()=>transferResource(key,1,"deposit"),carried<1 || storageRoom(g,key)<1);
      appendButton(buttons,"Store what fits",()=>transferResource(key,carried,"deposit"),carried<=0 || storageRoom(g,key)<0.001);
    }
    appendButton(buttons,"Drop 1",()=>transferResource(key,1,"drop"),carried<=0);
    const use={food:"eat",water:"drink",dirty_water:"drink",bandages:"bandage"}[key];
    if(use) appendButton(buttons,"Use",()=>playerAction(use),!!quickActionBlocker(g,use));
    if(key==="medicine") appendButton(buttons,"Treat",useMedicine,playerAmount(g,"medicine")<1);
    row.appendChild(buttons); card.appendChild(row);
  }
  root.appendChild(card);
  const gearCard=el("div","card","<h3>Equipment</h3>");
  const showGear=(list,source,label)=>{
    const filtered=list.filter(item=>{const def=ITEMS[item.type];return matchesTabSearch("inventory",def.name,item.type,def.kind||"",def.desc||"");});
    gearCard.appendChild(el("h4","",label));
    if(!filtered.length) gearCard.appendChild(el("div","muted","None."));
    for(const item of filtered){
      const def=ITEMS[item.type],equipped=Object.values(g.equipment).includes(item.id);
      const row=el("div","inventory-row",`<div><b>${def.name}</b> ${equipped?'<span class="good">Equipped</span>':""}<div class="muted">${def.weight} load${item.durability!=null?` · ${Math.ceil(item.durability)}/${def.durability} ${def.kind==="light"?"fuel minutes":"durability"}`:""}${def.capacity?` · ${def.capacity} capacity`:""}${def.tier?` · tier ${def.tier}`:""}</div></div>`);
      const buttons=el("div","row");
      if(source==="pack"){
        if(def.slot) appendButton(buttons,equipped?"Unequip":"Equip",()=>equipGear(item.id));
        if(item.durability!=null) appendButton(buttons,def.kind==="light"?"Refuel":"Repair",()=>repairGear(item.id),item.durability>=def.durability,def.kind==="light"?"1 wood (torch) or oil (lantern)":"1 repair kit");
        if(def.kind==="bedroll" || def.kind==="tent") appendButton(buttons,"Deploy",()=>campAction(def.kind==="tent"?"pitch_tent":"lay_bag"));
        appendButton(buttons,home?"Store":"Drop",()=>moveGear(item.id,"pack"),equipped);
      } else appendButton(buttons,"Take",()=>moveGear(item.id,source));
      row.appendChild(buttons);gearCard.appendChild(row);
    }
  };
  showGear(g.inventory.gear,"pack","Carried gear");
  if(home) showGear(g.townGear,"town","Settlement equipment");
  if(here) showGear(here.gear,"cache","Ground equipment here");
  root.appendChild(gearCard);
  if(here){
    const cache=el("div","card","<h3>Ground cache here</h3>");
    for(const [key,n] of Object.entries(here.resources)) if(n>0){
      const row=el("div","inventory-row",`<span>${RESOURCES[key].name}: ${fmt(n)}</span>`);
      appendButton(row,"Take what fits",()=>takeCacheResource(key,n)); cache.appendChild(row);
    }
    root.appendChild(cache);
  }
  const places=el("div","card","<h3>Known camps, caches and sites</h3>");
  const keys=new Set([...Object.keys(g.markers),...Object.keys(g.camps),...Object.keys(g.workSites),...Object.keys(g.caches)]);
  if(!keys.size) places.appendChild(el("p","muted","Mark locations from the World Map. Build an outpost on a cache to let haulers retrieve materials."));
  for(const key of keys){
    const label=g.markers[key] || (g.camps[key]?"Camp":"Ground cache");
    const site=g.workSites[key],xy=key.split(",").map(Number);
    const status=site && site.kind!=="outpost"?sourceStatus(g,sourceAt(g,xy[0],xy[1],site.kind==="mine"?"mineral":"wildlife"),site.kind==="mine"?["ore","stone"]:["meat"]):"";
    const row=el("div","inventory-row",`<span>${escapeHtml(label)} (${key})${status?`<br>${escapeHtml(status)}`:""}</span>`);
    appendButton(row,"Walk there",()=>{_activeTab="map";render();startAutoWalk(...key.split(",").map(Number));},key===positionKey(g));places.appendChild(row);
  }
  root.appendChild(places);
}
function renderCraftingTab(root){
  const g=G,card=el("div","card",'<h3>Crafting</h3><p class="muted">Basic recipes work by hand. Stations are accessible inside your settlement. All personal crafting outputs enter your pack; free enough space before starting. Stored ingredients are accessible beside the campfire or storage. Worker orders use base supplies. Bulk crafting stops for interruptions.</p>');
  const filter=el("select");
  for(const [value,label] of [["all","All recipes"],["ready","Craftable now"],["gear","Equipment"],["materials","Materials and meals"]]){
    const o=el("option","",label);o.value=value;o.selected=_craftFilter===value;filter.appendChild(o);
  }
  filter.onchange=()=>{_craftFilter=filter.value;render();}; card.appendChild(filter);
  renderTabSearchInput(card, "crafting", "Search recipes: rope, bandage, axe…");
  const grid=el("div","grid2");
  const available={resources:Object.fromEntries(RES_KEYS.map(k=>[k,playerAmount(g,k)]))};
  for(const [id,r] of Object.entries(RECIPES)){
    const blocker=recipeBlocker(g,id);
    if(_craftFilter==="ready" && blocker || _craftFilter==="gear" && !r.item || _craftFilter==="materials" && r.item) continue;
    const rName=recipeName(id);
    const rDesc=r.item?ITEMS[r.item].desc:Object.entries(r.output).map(([k,v])=>`${RESOURCES[k].name}`).join(" ");
    const rStation=r.station?(BUILDINGS[r.station]?.name||r.station):"hand";
    if(!matchesTabSearch("crafting", rName, id, rDesc, rStation, Object.keys(r.cost).map(k=>RESOURCES[k]?.name||k).join(" "))) continue;
    const item=el("div","item",`<div class="name">${recipeName(id)}</div><div class="cost">${costString(r.cost,available)}</div><div class="effect">${r.item?ITEMS[r.item].desc:Object.entries(r.output).map(([k,v])=>`${v} ${RESOURCES[k].name}`).join(", ")}</div><div class="meta">${timeText(recipeMinutes(g,id))} · 1 energy · ${r.station?(BUILDINGS[r.station]?.name || "Fire"):"Hand crafting"}${r.tech?` · ${KNOWLEDGE.find(n=>n.id===r.tech)?.name}`:""}</div>${blocker?`<div class="warn">${blocker}</div>`:""}`);
    appendButton(item,"Craft",()=>craftRecipe(id),!!blocker);
    if(!r.item) appendButton(item,"Craft x5",()=>craftRecipe(id,5),!!blocker);
    grid.appendChild(item);
  }
  card.appendChild(grid);root.appendChild(card);
}
function renderFarmsTab(root){
  const g=G,card=el("div","card",`<h3>Farming · ${weatherLabel(g.weather.type)} weather</h3><p class="muted">Plant one seed, keep soil moist, and harvest mature crops. Farmers tend one plot each, harvest and replant automatically. Seed Savers instead turn crops into seeds. Greenhouses double yield and protect growth from cold.</p>`);
  if(!g.farms.length) card.appendChild(el("p","muted","Build a Garden Plot to begin. Early gardens can be tended by hand; a hoe speeds up planting."));
  renderTabSearchInput(card, "farms", "Search crops: wheat, potato, herb…");
  const grid=el("div","grid2");
  for(const f of g.farms){
    const crop=CROPS[f.crop];
    if(!matchesTabSearch("farms", crop.name, f.crop, BUILDINGS[f.building]?.name||"")) continue;
    const item=el("div","item",`<div class="name">${BUILDINGS[f.building].name} · ${crop.name}</div><div class="meta">${f.planted?(f.growth>=100?"Ready to harvest":"Growing"):"Unplanted"} · base ${crop.days} days</div>${bar("Growth",f.growth,100,"var(--good)")}${bar("Moisture",f.water,100,"var(--thirst)")}${bar("Fertility",f.fertility,100,"var(--accent)")}<div class="desc">Harvest: ${Object.entries(crop.output).map(([k,v])=>`${v} ${RESOURCES[k].name}`).join(", ")} (garden yield)</div>`);
    const select=el("select");for(const [k,c] of Object.entries(CROPS)){const o=el("option","",c.name);o.value=k;o.selected=k===f.crop;select.appendChild(o);}
    select.disabled=f.planted || !atSettlement(g);select.onchange=()=>farmAction(f.id,"select",select.value);item.appendChild(select);
    const near = f.x!=null ? farmPlotAdjacent(g,f) : atSettlement(g);
    if (f.x!=null && !near){
      const dist = Math.max(Math.abs(g.playerX-f.x), Math.abs(g.playerY-f.y));
      item.appendChild(el("div","desc warn",`Walk next to this plot to tend it (${dist} tile${dist===1?"":"s"} away).`));
      appendButton(item,"Walk to plot",()=>{ _activeTab="map"; startAutoWalk(f.x,f.y); },false);
    } else {
      appendButton(item,"Plant (1 seed)",()=>farmAction(f.id,"plant"),!near || f.planted || playerAmount(g,"seeds")<1);
      appendButton(item,"Water (1)",()=>farmAction(f.id,"water"),!near || f.water>=100 || playerAmount(g,"water")<1);
      appendButton(item,"Compost (1)",()=>farmAction(f.id,"fertilize"),!near || f.fertility>=100 || playerAmount(g,"compost")<1);
      appendButton(item,"Harvest",()=>farmAction(f.id,"harvest"),!near || f.growth<100);
      appendButton(item,f.fenced?"Fenced":"Fence (4 wood)",()=>farmAction(f.id,"fence"),!near || f.fenced || playerAmount(g,"wood")<4);
      appendButton(item,f.irrigated?"Irrigated":"Irrigate (4 wood, 4 clay, rope)",()=>farmAction(f.id,"irrigate"),!near || f.irrigated || !playerCanPay(g,{wood:4,clay:4,rope:1}));
    }
    item.appendChild(el("div","muted",`Irrigation uses 0.25 stored water per phase when needed (dirty preferred). ${f.growth>=100?"Personal harvest needs pack space; worker harvest needs base storage space.":""}`));
    grid.appendChild(item);
  }
  card.appendChild(grid);root.appendChild(card);
}
function renderProductionOrders(root){
  const g=G,card=el("div","card",'<h3>Production orders</h3><p class="muted">Orders replace a workplace\'s default resource production. Workers contribute 4 productive hours/day each. Targets count stored output; reserve limits protect ingredients. Jobs and crops continue while you travel.</p>');
  const reserve=el("div","row");
  for(const k of ["wood","food","water","seeds"]){
    const label=el("label","",`Keep ${RESOURCES[k].name} `),input=el("input","quantity");input.type="number";input.min="0";input.max="999";input.value=g.reserves[k]||0;
    input.onchange=()=>{g.reserves[k]=clamp(Number(input.value)||0,0,999);save();render();};label.appendChild(input);reserve.appendChild(label);
  }
  card.appendChild(reserve);
  let shown=0;
  for(const bid of Object.keys(g.buildings)){
    if(!g.buildings[bid].count || !workplaceRecipes(bid).length) continue;
    shown++;const order=g.orders[bid];
    const item=el("div","item",`<div class="name">${BUILDINGS[bid].name} · ${productionWorkers(g,bid).length} workers</div><div class="${order && orderBlocker(g,bid,order)?"warn":"good"}">${order?`${recipeName(order.recipe)} · ${orderBlocker(g,bid,order) || "Working"} · ${order.mode==="maintain"?"Maintain":"Remaining"}: ${order.target}`:"Default building production"}</div>`);
    const select=el("select");for(const id of workplaceRecipes(bid)){const o=el("option","",recipeName(id));o.value=id;o.selected=id===order?.recipe;select.appendChild(o);}item.appendChild(select);
    const mode=el("select");mode.innerHTML='<option value="maintain">Maintain stock target</option><option value="count">Produce this many batches</option>';mode.value=order?.mode || "maintain";item.appendChild(mode);
    const quantity=el("input","quantity");quantity.type="number";quantity.min="1";quantity.max="999";quantity.value=order?.target || 5;quantity.setAttribute("aria-label","Production target");item.appendChild(quantity);
    appendButton(item,"Set order",()=>setWorkOrder(bid,select.value,mode.value,quantity.value));
    if(order) appendButton(item,"Clear order",()=>{delete g.orders[bid];render();save();});
    card.appendChild(item);
  }
  if(!shown) card.appendChild(el("p","muted","Build a Crafting Table or Furnace, assign its worker, then choose a production order."));
  root.appendChild(card);
}
