"use strict";

// ------------------------- ACTIONS ------------------------------

let _activityEpoch = 0;
// Transient flag: true only while the (synchronous) sleep/rest loop runs. Kept out
// of G so it is never serialized by save() — a stuck "true" would disable energy decay.
let _sleeping = false;

function passPhase(g, phases=1, reason=""){
  passMinutes(g, phases * 360);
}

function passMinutes(g, minutes){
  const player = g.survivors[0], epoch = _activityEpoch;
  let remaining = Math.max(0,minutes || 0), elapsed = 0;
  while (remaining>0 && player.health>0 && g.survivors[0]===player && _activityEpoch===epoch){
    const step = Math.min(remaining,360-(g.phaseMinutes || 0));
    const darkMinutes=nightMinutesDuring(g,step);
    g.phaseMinutes = (g.phaseMinutes || 0)+step;
    remaining -= step; elapsed += step;
    for(const camp of Object.values(g.camps || {})) camp.fuel=Math.max(0,camp.fuel-step);
    if (darkMinutes) wearTool(g,carriedTool(g,"light"),darkMinutes);
    if (g.phaseMinutes>=360){ g.phaseMinutes = 0; advanceOnePhase(g); }
  }
  return elapsed;
}

function advanceOnePhase(g){
  const epoch=_activityEpoch;
  g.phase++;
  if (g.phase >= TICKS_PER_DAY){
    g.phase = 0;
    g.day++;
    onDayEnd(g);
  }
  if(g.survivors[0].health<=0 || _activityEpoch!==epoch) return;
  applyTick(g);
  if(g.survivors[0].health<=0 || _activityEpoch!==epoch) return;
  moveMapEntities(g);
}

function applyTick(g){
  // Decay needs per tick
  const player = g.survivors[0];
  const night = isNight(g);
  // Player
  decaySurvivor(g, player, /*isPlayer*/true, night);
  // Other survivors
  for (let i=1; i<g.survivors.length; i++){
    decaySurvivor(g, g.survivors[i], false, night);
  }

  // Building production (per tick)
  produceFromBuildings(g);
  produceFromJobs(g);
  updateFarms(g);
  produceOrders(g);

  // Auto-consumption: survivors eat & drink when needed at end of each tick
  autoConsume(g);

  // Update body class for night
  document.body.classList.toggle("night", night);

  // Random small events occasionally
  if (chance(0.15)) maybeRandomEvent(g);
}

function decaySurvivor(g, s, isPlayer, night){
  if (s.health<=0) return;
  // children consume less but still need food/water
  const factor = s.isChild ? 0.5 : 1;
  s.hunger = clamp(s.hunger - 4*factor, 0, 100);
  s.thirst = clamp(s.thirst - 5*factor, 0, 100);
  if (!_sleeping) s.energy = clamp(s.energy - (isPlayer? 3 : 2), 0, 100);
  s.warmth = clamp(s.warmth - (night? 6 : 2)*factor, 0, 100);

  // happiness drifts
  if (s.hunger < 30 || s.thirst < 30) s.happiness = clamp(s.happiness - 2, 0, 100);
  if (s.warmth < 30) s.happiness = clamp(s.happiness - 1, 0, 100);

  // warmth bonus from campfire
  const hasFire = isPlayer ? !!nearbyFire(g) : (g.buildings.campfire?.count||0)>0 && (g.resources.wood>0 || g.resources.charcoal>0);
  if (night && hasFire) s.warmth = clamp(s.warmth + 4, 0, 100);

  // health effects
  if (s.hunger < 15) s.health = clamp(s.health - 1, 0, s.maxHealth);
  if (s.thirst < 15) s.health = clamp(s.health - 2, 0, s.maxHealth);
  if (s.warmth < 15) s.health = clamp(s.health - (night?2:1), 0, s.maxHealth);
  if (s.hunger <= 0) s.health = clamp(s.health - 3, 0, s.maxHealth);
  if (s.thirst <= 0) s.health = clamp(s.health - 5, 0, s.maxHealth);
  if (s.warmth <= 0) s.health = clamp(s.health - (night?4:1), 0, s.maxHealth);

  // disease decays health
  if (s.diseased) s.health = clamp(s.health - 2, 0, s.maxHealth);

  // morale tracked from happiness/safety
  const safety = isPlayer && !atSettlement(g) ? Math.round(100-sleepConditions(g).incident*100) : settlementSafety(g);
  s.morale = clamp((s.happiness*0.5 + safety*0.5), 0, 100);

  // For player, mirror safety to a field
  if (isPlayer) s.safety = safety;

  if (s.health <= 0 && !s._died){
    s._died = true;
    pushLog(g, `${s.isPlayer?"You have":(s.name+" has")} died.`, "bad");
    if (isPlayer) removeDead(g);
  }
}

function produceFromBuildings(g){
  _productionStatuses.set(g,{});
  // Per-tick production = (per-day amount)/TICKS_PER_DAY
  for (const id in g.buildings){
    const b = BUILDINGS[id]; if (!b) continue;
    const count = g.buildings[id].count;
    const assigned = productionWorkers(g,id).filter(sid=>!JOBS[g.jobs[sid]]?.direct);
    const eff = b.effects || {};
    if (count<=0) continue;
    if (g.orders?.[id] || eff.farm) continue;
    const staffed = !b.workers || assigned.length>0;
    if (eff.consume && !Object.entries(eff.consume).every(([r,v])=>productionStock(g,r)>=v*count/TICKS_PER_DAY)) continue;
    if (eff.consume && !staffed) continue;

    const output={},cost={};
    for(const [r,v] of Object.entries(eff.produce||{})) output[r]=v*count/TICKS_PER_DAY;
    for(const [r,v] of Object.entries(eff.produce_per_worker||{})) if(assigned.length) output[r]=(output[r]||0)+v*assigned.length*workerSkillBonus(g,id,assigned)/TICKS_PER_DAY;
    if(staffed) for(const [r,v] of Object.entries(eff.consume||{})) cost[r]=v*count/TICKS_PER_DAY;
    const sources=eff.consume?null:productionSources(g,output,id);
    const blocked=productionBlocker(g,output,cost,sources);
    if(blocked){productionStatuses(g)[id]=blocked;continue;}
    commitProduction(g,output,cost,sources);
    if (eff.convert){
      const conv = eff.convert;
      const max = (conv.perWorker||1) * assigned.length * workerSkillBonus(g,id,assigned);
      let runs = max / TICKS_PER_DAY;
      // limit by inputs
      for (const r in conv.from){
        const possible = productionStock(g,r) / conv.from[r];
        runs = Math.min(runs, possible);
      }
      // Check the whole conversion after freeing its inputs, not each output separately.
      const amounts=(values,n)=>Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v*n]));
      if(!storageFits(g,amounts(conv.to,runs),amounts(conv.from,runs))){
        let lo=0,hi=runs;
        for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(storageFits(g,amounts(conv.to,mid),amounts(conv.from,mid))) lo=mid;else hi=mid;}
        runs=lo;
      }
      if (runs > 0.00001){
        for (const r in conv.from){ g.resources[r] -= conv.from[r] * runs; }
        for (const r in conv.to){ addResource(g, r, conv.to[r] * runs); }
      } else productionStatuses(g)[id]="Missing inputs or base storage full";
    }
    if (eff.knowledge){
      g.knowledge += (eff.knowledge * count)/TICKS_PER_DAY;
    }
    if (eff.knowledge_per_worker){
      g.knowledge += (eff.knowledge_per_worker * assigned.length)/TICKS_PER_DAY;
    }
    if (eff.heal_per_worker){
      // heal injured survivors
      const power = eff.heal_per_worker * assigned.length / TICKS_PER_DAY;
      let pwr = power;
      for (const s of g.survivors){
        if (s.health>0 && (!s.isPlayer || atSettlement(g)) && s.health < s.maxHealth && pwr>0){
          const heal = Math.min(pwr, s.maxHealth-s.health);
          s.health += heal; pwr -= heal;
          if (s.injured && s.health > 60) s.injured = false;
        }
      }
    }
    if (eff.disease_resist && assigned.length){
      for (const s of g.survivors){
        if (s.health>0 && (!s.isPlayer || atSettlement(g)) && s.diseased && chance(eff.disease_resist * assigned.length / TICKS_PER_DAY)){
          s.diseased = false;
          s.health = clamp(s.health + 4, 0, s.maxHealth);
          pushLog(g, `${s.isPlayer?"You":s.name} recovered with help from ${b.name}.`, "good");
        }
      }
    }
    if (eff.combat_train && assigned.length){
      for (const id of assigned){
        const s = survivorById(g, id);
        if (s) s.skills.combat = Math.min(20, s.skills.combat + (eff.combat_train / TICKS_PER_DAY));
      }
    }
    if (eff.repair && assigned.length){
      const power = eff.repair * assigned.length / TICKS_PER_DAY;
      for (const bid in g.buildings){
        const st = g.buildings[bid];
        if (st && st.dmg > 0){
          st.dmg = Math.max(0, st.dmg - power);
          break;
        }
      }
    }
    if (eff.happiness_all && staffed){
      const v = eff.happiness_all * count / TICKS_PER_DAY;
      for (const s of g.survivors) s.happiness = clamp(s.happiness + v, 0, 100);
    }
    if (eff.morale_all && staffed){
      const v = eff.morale_all * count / TICKS_PER_DAY;
      for (const s of g.survivors) s.morale = clamp(s.morale + v, 0, 100);
    }
    if (eff.reputation && staffed){
      g.reputation += eff.reputation * count / TICKS_PER_DAY;
    }
    if (eff.attract_chance && staffed){
      if (chance(eff.attract_chance * count / TICKS_PER_DAY)){
        spawnStranger(g);
      }
    }
    if (eff.trade_chance && staffed){
      if (chance(eff.trade_chance * count / TICKS_PER_DAY)){
        traderArrives(g);
      }
    }
    if (eff.warning){
      // handled at raid roll
    }
    if (eff.cook){
      // cooking is a player action; passive contribution: tiny food gain if meat/crops
    }
  }
}

function produceFromJobs(g){
  for (const s of g.survivors){
    if (!s || s.isPlayer || s.isChild || s.health<=0) continue;
    const jobKey = g.jobs[s.id] || s.job || "none";
    const job = JOBS[jobKey];
    if (!job || jobKey==="none") continue;
    if (job.building && !productionWorkers(g,job.building).includes(s.id)) continue;
    if (job.building && g.orders?.[job.building]) continue;
    if (jobKey==="hauler"){ haulCaches(g,2); continue; }
    if ((jobKey==="scout" || jobKey==="pathfinder") && chance(0.25)){
      revealArea(g,g.villageX+rint(-24,24),g.villageY+rint(-18,18),3);
    }
    const sites=job.site?Object.entries(g.workSites||{}).filter(([,v])=>v.kind===job.site):[];
    if(job.site && !sites.length) continue;
    const boost = workerJobBonus(s, jobKey);
    let canWork = true;
    for (const r in job.consume || {}){
      const need = job.consume[r] / TICKS_PER_DAY;
      if ((g.resources[r]||0)-need < (g.reserves[r]||0)) canWork = false;
    }
    if (!canWork) continue;
    const outputs=Object.entries(job.output || {}).filter(([r])=>RESOURCES[r] && (!job.building || job.direct));
    const output=Object.fromEntries(outputs.map(([r,v])=>[r,v*boost/TICKS_PER_DAY]));
    const cost=Object.fromEntries(Object.entries(job.consume||{}).map(([r,v])=>[r,v/TICKS_PER_DAY]));
    let sources=job.consume?null:productionSources(g,output,job.building,sites[0]?.[0]);
    if(job.site) for(const [key] of sites){
      const candidate=productionSources(g,output,job.building,key);
      if(!productionBlocker(g,output,cost,candidate)){sources=candidate;break;}
    }
    const blocked=productionBlocker(g,output,cost,sources);
    if(blocked){productionStatuses(g)[jobKey]=blocked;continue;}
    commitProduction(g,output,cost,sources);
    for (const r in job.output || {}){
      if (job.building && RESOURCES[r] && !job.direct) continue;
      const amount = job.output[r] * boost / TICKS_PER_DAY;
      if (RESOURCES[r]) continue;
      else if (r === "knowledge") g.knowledge += amount;
      else if (r === "reputation") g.reputation += amount;
      else if (r === "happiness_all"){
        for (const o of g.survivors) o.happiness = clamp(o.happiness + amount, 0, 100);
      } else if (r === "morale_all"){
        for (const o of g.survivors) o.morale = clamp(o.morale + amount, 0, 100);
      }
    }
    if (jobKey==="scavenger" && chance(0.08 / TICKS_PER_DAY)){
      const dmg = rint(3,10);
      s.health = clamp(s.health - dmg, 0, s.maxHealth);
      if (s.health < 50) s.injured = true;
      pushLog(g, `${s.name} was hurt while scavenging.`, "warn");
    }
    if ((jobKey==="builder" || jobKey==="wallbuilder") && chance(0.35 / TICKS_PER_DAY)){
      const damaged = Object.keys(g.buildings).find(id => (g.buildings[id]?.dmg||0) > 0);
      if (damaged) g.buildings[damaged].dmg = Math.max(0, g.buildings[damaged].dmg - 1 * boost);
    }
  }
}

function workerJobBonus(s, jobKey){
  let bonus = 1;
  if (s.traits.includes("hardworking")) bonus += 0.25;
  if (s.traits.includes("lazy")) bonus -= 0.25;
  if ((jobKey==="woodcutter" || jobKey==="builder" || jobKey==="wallbuilder") && s.traits.includes("builder")) bonus += 0.2;
  if ((jobKey==="gatherer" || jobKey==="water_carrier") && s.traits.includes("farmer")) bonus += 0.15;
  if (jobKey==="scavenger" && s.traits.includes("quick")) bonus += 0.15;
  if (s.traits.includes("leader")) bonus += 0.1;
  if (s.traits.includes("troublemaker")) bonus -= 0.1;
  if (s.happiness < 30) bonus -= 0.2;
  if (s.health < 50) bonus -= 0.2;
  return Math.max(0.2, bonus);
}

function workerSkillBonus(g, bid, assigned){
  // base 1.0, +trait bonuses
  if (!assigned.length) return 1;
  let total = 0;
  for (const id of assigned){
    const s = survivorById(g, id);
    if (!s) continue;
    let bonus = 1;
    if (s.traits.includes("hardworking")) bonus += 0.25;
    if (s.traits.includes("lazy")) bonus -= 0.25;
    // building-specific
    const b = bid;
    if ((b==="hunting_lodge") && s.traits.includes("hunter")) bonus += 0.3;
    if ((b==="crop_field"||b==="garden"||b==="greenhouse") && s.traits.includes("farmer")) bonus += 0.3;
    if ((b==="clinic"||b==="medicine_workshop"||b==="herbalist") && s.traits.includes("medic")) bonus += 0.3;
    if ((b==="workshop"||b==="toolsmith"||b==="forge"||b==="carpenter"||b==="sawmill") && s.traits.includes("builder")) bonus += 0.2;
    if ((b==="kitchen"||b==="smokehouse") && s.traits.includes("cook")) bonus += 0.3;
    if ((b==="mechanics_shed"||b==="repair_station") && s.traits.includes("mechanic")) bonus += 0.3;
    if ((b==="guard_post"||b==="watchtower"||b==="barracks") && s.traits.includes("guard")) bonus += 0.3;
    if ((b==="school"||b==="library") && s.traits.includes("teacher")) bonus += 0.3;
    if (s.traits.includes("leader")) bonus += 0.1;
    if (s.traits.includes("troublemaker")) bonus -= 0.1;
    // happiness penalty
    if (s.happiness < 30) bonus -= 0.2;
    if (s.health < 50) bonus -= 0.2;
    total += Math.max(0.2, bonus);
  }
  return total / assigned.length;
}

function autoConsume(g){
  // Each tick, each survivor eats a little and drinks a little if available
  for (const s of g.survivors){
    if (s.health<=0) continue;
    if (s.isPlayer){
      if (s.hunger<55 && playerCanPay(g,{food:1})){ playerPay(g,{food:1}); s.hunger=clamp(s.hunger+30,0,100); }
      if (s.thirst<55 && playerCanPay(g,{water:1})){ playerPay(g,{water:1}); s.thirst=clamp(s.thirst+30,0,100); }
      continue;
    }
    if (s.hunger < 70 && g.resources.food >= 1){
      g.resources.food -= 1; s.hunger = clamp(s.hunger + 25, 0, 100);
    } else if (s.hunger < 50 && g.resources.crops >= 2){
      g.resources.crops -= 2; s.hunger = clamp(s.hunger + 15, 0, 100);
    } else if (s.hunger < 50 && g.resources.meat >= 1){
      g.resources.meat -= 1; s.hunger = clamp(s.hunger + 20, 0, 100);
    }
    if (s.thirst < 70 && g.resources.water >= 1){
      g.resources.water -= 1; s.thirst = clamp(s.thirst + 25, 0, 100);
    } else if (s.thirst < 30 && g.resources.dirty_water >= 1){
      g.resources.dirty_water -= 1; s.thirst = clamp(s.thirst + 15, 0, 100);
      if (chance(0.1) && !s.diseased){ s.diseased = true; pushLog(g, `${s.isPlayer?"You":s.name} fell sick from dirty water.`,"bad"); }
    }
  }
  // Campfire consumes 1 wood every full day in evening tick
  if (g.phase===2 && g.buildings.campfire?.count){
    if (g.resources.wood >= 1) g.resources.wood -= 1;
    else if (g.resources.charcoal >= 1) g.resources.charcoal -= 1;
    else { pushLog(g, "Your campfire has gone out. The cold creeps in.","warn"); }
  }
}

function onDayEnd(g){
  g.weather = {type:pick(["clear","clear","clear","rain","cold"])};
  // age survivors, day survived counts
  for (const s of g.survivors){
    s.daysSurvived++;
    if(s.health<=0) continue;
    s.age_ticks += 1;
    if (s.isChild){
      // growth boosted by school
      let g_rate = 1;
      const schoolWorkers = (g.workerAssign.school?.length||0);
      if (g.buildings.school?.count && schoolWorkers>0) g_rate += BUILDINGS.school.effects.child_growth;
      s.age_ticks += g_rate;
      if (s.age_ticks > 80){ // about 20 days base
        s.isChild = false;
        s.age = 14;
        s.skills.crafting += 1;
        pushLog(g, `${s.name} has grown into an adult.`, "good");
      }
    }
    // disease cure chance from medicine
    if (s.diseased){
      if (s.isPlayer ? playerCanPay(g,{medicine:1}) : g.resources.medicine >= 1){
        s.isPlayer ? playerPay(g,{medicine:1}) : g.resources.medicine--;
        s.diseased = false; s.health = clamp(s.health+10,0,s.maxHealth);
        pushLog(g, `${s.isPlayer?"You":s.name} recovered using medicine.`,"good");
      } else if (chance(0.1)) {
        s.diseased = false; pushLog(g, `${s.isPlayer?"You":s.name} recovered from illness.`,"good");
      }
    }
  }

  // Knowledge from surviving
  g.knowledge += 0.5 + g.survivors.length * 0.05;

  // Daily morale roll: relationships forming
  if (chance(0.18)) tryRelationship(g);
  // Daily birth roll
  for (const rel of g.relationships){
    if (rel.type==="partner"){
      const a = survivorById(g,rel.a), b = survivorById(g,rel.b);
      if (!a||!b) continue;
      if (a.isChild||b.isChild || !canHaveChild(a,b)) continue;
      // need housing for new child
      if (getHousing(g) > g.survivors.length){
        if (chance(0.04)){
          birthChild(g, a, b);
        }
      }
    }
  }

  // Threat / raid rolls
  rollThreats(g);

  // Cleanup dead
  removeDead(g);

  // Refresh world map
  refreshMapDaily(g);

  // Notify of new day
  pushLog(g, `— Day ${g.day} begins —`, "info");
}

function removeDead(g){
  // bury dead after a day
  for (let i=g.survivors.length-1; i>=0; i--){
    const s = g.survivors[i];
    if (s.health<=0){
      // unassign
      if (g.jobs[s.id]) delete g.jobs[s.id];
      for (const bid in g.workerAssign){
        g.workerAssign[bid] = g.workerAssign[bid].filter(id=>id!==s.id);
      }
      if (s.isPlayer){
        _activityEpoch++;
        cancelAutoWalk();
        if (attemptPlayerRescue(g, s)) return;
        if (continueAsHeir(g, s)) return;
        // game over modal
        showModal({
          title:"You Have Perished",
          body:`<p>Your watch has ended on day ${g.day}.</p><p>Others may carry on, but without you the settlement falters.</p>`,
          buttons:[{label:"New Run", primary:true, action:()=>{ clearSaves(); closeModal(); startNewRun(); }}]
        });
        return;
      }
      burySurvivor(g, i);
    }
  }
}

function burySurvivor(g, index){
  const s = g.survivors[index];
  if (!s) return;
  if (s.partnerId){
    const partner = survivorById(g, s.partnerId);
    if (partner) partner.partnerId = null;
  }
  g.relationships = g.relationships.filter(r=> r.a!==s.id && r.b!==s.id);
  if (g.courtship) delete g.courtship[s.id];
  g.survivors.splice(index,1);
  for (const o of g.survivors) o.happiness = clamp(o.happiness - 8, 0, 100);
}

function continueAsHeir(g, player){
  const heirs = g.survivors.filter(s => s && !s.isPlayer && s.health>0 && s.parentIds?.includes(player.id));
  if (!heirs.length) return false;
  heirs.sort((a,b)=>(b.age||0)-(a.age||0));
  const heir = heirs[0];
  if (!atSettlement(g)){
    const cache = cacheAt(g);
    for (const [k,v] of Object.entries(g.inventory.resources)) cache.resources[k]=(cache.resources[k]||0)+v;
    cache.gear.push(...g.inventory.gear);
    g.inventory = {resources:{},gear:[]}; g.equipment = {};
  }
  g.playerX = g.villageX; g.playerY = g.villageY;
  const oldIndex = g.survivors.indexOf(player);
  player.isPlayer = false;
  heir.isPlayer = true;
  heir.isChild = false;
  heir.age = Math.max(14, heir.age || 14);
  heir.maxHealth = Math.max(heir.maxHealth || 60, 90);
  heir.health = Math.max(heir.health, 50);
  heir.energy = Math.max(heir.energy, 60);
  heir.hunger = Math.max(heir.hunger, 50);
  heir.thirst = Math.max(heir.thirst, 50);
  heir.warmth = Math.max(heir.warmth, 50);
  g.playerName = heir.name;
  g.playerSex = heir.sex;
  if (oldIndex >= 0) burySurvivor(g, oldIndex);
  const heirIndex = g.survivors.indexOf(heir);
  if (heirIndex > 0){
    g.survivors.splice(heirIndex, 1);
    g.survivors.unshift(heir);
  }
  pushLog(g, `${heir.name}, your child, takes up your line and leads the settlement.`, "good");
  showModal({
    title:"The Line Continues",
    body:`<p>You died on day ${g.day}, but your child <b>${heir.name}</b> survives.</p><p>You now continue as ${heir.name}. Your family line has not ended.</p>`,
    buttons:[{label:"Continue", primary:true, action:()=>{ closeModal(); render(); save(); }}]
  });
  return true;
}

function attemptPlayerRescue(g, player){
  if (player.lastRescueDay === g.day) return false;
  const helpers = (atSettlement(g) ? g.survivors : (g.followers || [])).filter(s => s && !s.isPlayer && s.health > 0);
  if (!helpers.length) return false;
  const medic = helpers.find(s => s.traits?.includes("medic") || s.skills?.medicine >= 4);
  if (!medic && !playerCanPay(g,{medicine:1})) return false;
  if (playerCanPay(g,{medicine:1})) playerPay(g,{medicine:1});
  const healer = medic || pick(helpers);
  player.health = medic ? 35 : 22;
  player.energy = clamp(player.energy + 20, 0, 100);
  player.hunger = Math.max(player.hunger, 20);
  player.thirst = Math.max(player.thirst, 20);
  player.warmth = Math.max(player.warmth, 20);
  player.injured = true;
  player._died = false;
  player.lastRescueDay = g.day;
  if (player.diseased && medic && chance(0.7)) player.diseased = false;
  pushLog(g, `${healer.name} drags you back from death. Next time may be final.`, "good");
  showModal({
    title:"Pulled Back From Death",
    body:`<p>${healer.name} found you fading and patched you up.</p><p>You are alive, injured, and badly shaken.</p>`,
    buttons:[{label:"Keep going", primary:true, action:()=>{ closeModal(); render(); save(); }}]
  });
  return true;
}

// --- Player Actions ---

const RECOVERY_ACTIONS = new Set(["rest","sleep","eat","drink","warm_fire","bandage","pitch_tent","lay_bag","light_fire","lean_to"]);

const WOOD_FEATURES = new Set(["dead_tree","fallen_log","pine_grove","ancient_oak"]);
const FORAGE_FEATURES = new Set(["berry_bush","mushroom_patch","wild_herbs","apple_tree","edible_roots","wild_wheat","bird_nest","beehive","seed_pod"]);
const WATER_FEATURES = new Set(["spring","old_well","pond","stream","rain_pool","hot_spring","fish_pool"]);

function nearbySettlementBuilding(g, predicate){
  if (!g.chunks) return null;
  for (let dy=-1; dy<=1; dy++){
    for (let dx=-1; dx<=1; dx++){
      const x = g.playerX + dx, y = g.playerY + dy;
      if (!inBounds(x,y)) continue;
      const id = tileAt(g, x, y)?.settlementBuilding;
      const b = id && BUILDINGS[id];
      if (b && g.buildings[id]?.count>0 && predicate(b, id)) return {id, building:b};
    }
  }
  return null;
}

function nearbyTile(g, radius, predicate){
  if (!g.chunks) return null;
  for (let dy=-radius; dy<=radius; dy++){
    for (let dx=-radius; dx<=radius; dx++){
      const x = g.playerX + dx, y = g.playerY + dy;
      if (!inBounds(x,y)) continue;
      const t = tileAt(g, x, y);
      if (t && predicate(t, x, y, dx, dy)) return {tile:t, x, y, dx, dy};
    }
  }
  return null;
}

function nearbyWaterSource(g){
  return nearbyTile(g, 1, t => BIOMES[t.biome]?.water || (t.feature && WATER_FEATURES.has(t.feature.type)));
}

function gatheringSource(g,action){
  const config={chop_wood:["wood",["wood"]],gather:["forage",["food","herbs","seeds"]],gather_fiber:["forage",["fiber"]],gather_stone:["mineral",["stone"]],dig:["mineral",["sand","clay"]],fish:["wildlife",["meat"]],fetch_water:["water",[]],mine:["mineral",[]]}[action];
  if(!config) return null;
  let spot;
  if(action==="fetch_water" || action==="fish") spot=nearbyWaterSource(g);
  else {
    spot=nearbyTile(g,1,t=>action==="mine" ? ["iron_vein","stone_outcrop","boulder_pile","coal_seam"].includes(t.feature?.type) : Object.keys(MAP_FEATURES[t.feature?.type]?.loot||{}).some(k=>config[1].includes(k)));
    if(!spot && action==="chop_wood") spot=nearbyWoodSource(g);
    if(!spot && ["gather","gather_fiber"].includes(action)) spot=nearbyForageSource(g);
    if(!spot && ["gather_stone","dig"].includes(action)) spot={x:g.playerX,y:g.playerY,tile:tileAt(g,g.playerX,g.playerY)};
  }
  if(!spot) return null;
  const source=sourceAt(g,spot.x,spot.y,config[0]);
  source.keys=action==="fetch_water"?[tileWaterKind(spot.tile)==="clean"?"water":"dirty_water"]:action==="mine"?Object.keys(MAP_FEATURES[spot.tile.feature?.type]?.loot||{}).filter(k=>resourceFamily(k)==="mineral"):config[1];
  return source;
}

function gatherPersonal(g,action){
  const source=gatheringSource(g,action); if(!source) return false;
  const axe=carriedTool(g,"axe");
  const output={chop_wood:()=>({wood:rint(3,5)+(axe?ITEMS[axe.type].tier*2:0)}),gather:()=>({food:rint(1,3),herbs:rint(0,2),seeds:rint(0,2)}),gather_fiber:()=>({fiber:rint(3,5)}),gather_stone:()=>({stone:rint(2,3)}),dig:()=>({sand:3,clay:2}),fish:()=>({meat:rint(1,3)})}[action];
  if(!output) return false;
  collectSource(g,source,output());
  const tool={chop_wood:"axe",dig:"shovel",fish:"rod"}[action];
  if(tool) wearTool(g,carriedTool(g,tool));
  g.survivors[0].energy=Math.max(0,g.survivors[0].energy-(ACTION_ENERGY[action]||0));
  passMinutes(g,actionMinutes(g,action)); render();save();return true;
}

function nearbyWoodSource(g){
  return nearbyTile(g, 1, t => t.biome==="forest" || t.biome==="deep_forest" || (t.feature && WOOD_FEATURES.has(t.feature.type)));
}

function nearbyForageSource(g){
  return nearbyTile(g, 1, t => ["plains","forest","deep_forest","hills"].includes(t.biome) || (t.feature && FORAGE_FEATURES.has(t.feature.type)));
}

function nearbyRestSpot(g){
  return g.camps?.[positionKey(g)] || nearbySettlementBuilding(g, (b,id) => id==="campfire" || !!b.effects?.housing || !!b.effects?.warmth);
}

function nearbyFire(g){
  if ((g.camps?.[positionKey(g)]?.fuel || 0)>0) return {id:"field_fire"};
  if (g.resources.wood<1 && g.resources.charcoal<1) return null;
  return nearbySettlementBuilding(g, (b,id) => id==="campfire" || !!b.effects?.warmth || !!b.effects?.cook);
}

function findHuntTarget(g){
  const visible = typeof computeVisible === "function" ? computeVisible(g) : {};
  let best = null;
  nearbyTile(g, 3, (t, x, y) => {
    if (!t.entity || !visible[x+","+y]) return false;
    const e = MAP_ENTITIES[t.entity.type];
    if (!e?.huntable) return false;
    const dist = Math.max(Math.abs(x-g.playerX), Math.abs(y-g.playerY));
    if (dist < 1 || dist > 3) return false;
    if (!best || dist < best.dist) best = {tile:t, x, y, entity:e, dist};
    return false;
  });
  return best;
}

function huntTarget(target){
  const g = G;
  const p = g.survivors[0];
  if (!target || !target.tile?.entity || p.health<=0 || _combat) return false;
  if (tileDistance(g,target.x,target.y)>3 || tileDistance(g,target.x,target.y)<1 || !computeVisible(g)[target.x+","+target.y]) return false;
  if (!carriedTool(g,"bow") || !playerCanPay(g,{arrows:1})){ pushLog(g, "Carry a bow and arrows.", "warn"); render(); return false; }
  if (p.energy<4) return false;
  const animal=target.tile.entity;
  const source=sourceAt(g,animal.originX??target.x,animal.originY??target.y,"wildlife");
  const blocked=sourceBlocker(g,source,Object.keys(target.entity.loot||{}));
  if(blocked){pushLog(g,blocked,"warn");render();return false;}
  playerPay(g,{arrows:1}); wearTool(g,carriedTool(g,"bow"));
  const hitChance = clamp(0.45 + p.skills.combat*0.04 + (p.traits.includes("hunter")?0.12:0), 0.25, 0.88);
  p.energy -= 4; p.hunger = clamp(p.hunger-1,0,100); p.thirst = clamp(p.thirst-1,0,100);
  if (chance(hitChance)){
    for (const r in target.entity.loot || {}){
      const amount=Math.min(sourceRemaining(g,source,r),rint(target.entity.loot[r][0],target.entity.loot[r][1])+(carriedTool(g,"knife")?1:0));
      const got=addCarried(g,r,amount,false);spendSource(g,source,r,amount);
      if(amount>got){const cache=cacheAt(g,`${target.x},${target.y}`);cache.resources[r]=(cache.resources[r]||0)+amount-got;}
    }
    wearTool(g,carriedTool(g,"knife"));
    target.tile.entity = null;
    pushLog(g, `Your arrow drops a ${target.entity.name.toLowerCase()}. Uncarried remains stay at the kill site.`, "good");
    pushLog(g,sourceStatus(g,source,Object.keys(target.entity.loot||{})),"info");
  } else {
    if (target.entity.danger && chance(0.25)){
      const d = rint(target.entity.danger[0], target.entity.danger[1]);
      p.health = clamp(p.health - d, 0, p.maxHealth);
      pushLog(g, `You miss. The ${target.entity.name.toLowerCase()} charges before fleeing. (-${d} HP)`, "bad");
    } else {
      pushLog(g, `You miss. The ${target.entity.name.toLowerCase()} runs.`, "warn");
    }
    moveAnimalAway(g, target.x, target.y) || (target.tile.entity = null);
  }
  passMinutes(g,ACTION_COSTS.hunt);
  if (p.health<=0) removeDead(g);
  render(); save();
  return true;
}

function quickActionBlocker(g, actionKey){
  const p = g.survivors[0];
  if (!p || p.health<=0) return "You are down.";
  if (_combat) return "Resolve combat first.";
  if (p.energy < (ACTION_ENERGY[actionKey] || 0) && !RECOVERY_ACTIONS.has(actionKey)) return "Too exhausted.";
  const recipes = {boil_water:"clean_water",purify_water:"filtered_water",cook:playerAmount(g,"meat")>=1?"meal":"vegetable_meal",craft_arrows:"arrows"};
  if (recipes[actionKey]) return recipeBlocker(g,recipes[actionKey]);
  const source=gatheringSource(g,actionKey);
  if(source){ const blocked=sourceBlocker(g,source,source.keys);if(blocked) return blocked; }
  switch(actionKey){
    case "chop_wood": return nearbyWoodSource(g) ? "" : "Stand on or next to forest, deep forest, or wood.";
    case "gather": return nearbyForageSource(g) ? "" : "Stand on or next to forageable land or plants.";
    case "fetch_water": return nearbyWaterSource(g) ? "" : "Stand on or next to water.";
    case "eat": return playerAmount(g,"food")>=1 ? "" : "No accessible food. Pack supplies at home.";
    case "drink": return playerAmount(g,"water")>=1 || playerAmount(g,"dirty_water")>=1 ? "" : "No carried water.";
    case "rest": return "";
    case "warm_fire": return nearbyFire(g) ? "" : "Light a fire or stand near the town campfire.";
    case "gather_spirits": return nearbyRestSpot(g) ? "" : "Gather near camp or housing.";
    case "hunt": {
      if(!carriedTool(g,"bow") || playerAmount(g,"arrows")<1) return "Carry a bow and arrows.";
      const target=findHuntTarget(g);if(!target) return "Need a visible animal 1-3 tiles away.";
      const animal=target.tile.entity;
      return sourceBlocker(g,sourceAt(g,animal.originX??target.x,animal.originY??target.y,"wildlife"),Object.keys(target.entity.loot||{}));
    }
    case "study": return playerAmount(g,"books")>=1 ? "" : "Need a book.";
    case "train": return atSettlement(g) && g.buildings.training_yard?.count ? "" : "Need a training yard at home.";
    case "gather_fiber": return nearbyForageSource(g) ? "" : "Find plants or reeds.";
    case "gather_stone": return "";
    case "mine": return carriedTool(g,"pick") ? (nearbyTile(g,1,t=>["iron_vein","stone_outcrop","boulder_pile","coal_seam"].includes(t.feature?.type)) ? "" : "Stand near a mineral deposit.") : "Carry a working pickaxe.";
    case "dig": return carriedTool(g,"shovel") ? "" : "Carry a shovel.";
    case "fish": return carriedTool(g,"rod") && nearbyWaterSource(g) ? "" : "Need a fishing rod and nearby water.";
    case "bandage": return playerAmount(g,"bandages")>=1 ? "" : "Craft bandages first.";
    case "pitch_tent": return carriedTool(g,"tent") ? "" : "Carry a portable tent.";
    case "lay_bag": return carriedTool(g,"bedroll") ? "" : "Carry a sleeping bag.";
    case "light_fire": return playerCanPay(g,{wood:1}) ? "" : "Need 1 accessible wood.";
    case "pack_camp": { const c=g.camps?.[positionKey(g)]; return c && (c.gear.length || c.fuel>0) ? "" : "Nothing to pack up here."; }
    case "lean_to": return playerCanPay(g,{wood:4,fiber:4}) ? "" : "Need 4 wood and 4 fiber.";
    case "survey": return carriedTool(g,"survey") ? "" : "Carry binoculars.";
  }
  return "";
}

function restEnergyBonus(g){
  const nearbyHome = nearbySettlementBuilding(g, b => !!b.effects?.housing);
  if (nearbyHome) return {amount:15, label:`near ${nearbyHome.building.name}`};
  const fire = nearbyFire(g);
  if (fire) return {amount:8, label:`near ${fire.building.name}`};
  return {amount:0, label:""};
}

function playerAction(actionKey){
  const g = G;
  const p = g.survivors[0];
  const blocker = quickActionBlocker(g, actionKey);
  if (blocker){ pushLog(g, blocker, "warn"); render(); return; }
  const recipe = {boil_water:"clean_water",purify_water:"filtered_water",cook:playerAmount(g,"meat")>=1?"meal":"vegetable_meal",craft_arrows:"arrows"}[actionKey];
  if (recipe){ craftRecipe(recipe); return; }
  if (actionKey==="sleep"){ openSleepDialog(); return; }
  if (actionKey==="hunt"){ huntTarget(findHuntTarget(g)); return; }
  if (["pitch_tent","lay_bag","light_fire","pack_camp","lean_to"].includes(actionKey)){ campAction(actionKey); return; }
  if(gatherPersonal(g,actionKey)) return;
  const minutes = actionMinutes(g,actionKey);
  const epoch = _activityEpoch;
  let energy = 0;
  switch(actionKey){
    case "fetch_water":{
      fetchWaterFromTile(g,nearbyWaterSource(g).tile); return;
    }
    case "eat":{
      playerPay(g,{food:1}); p.hunger=clamp(p.hunger+30,0,100); pushLog(g,"You ate a meal.","good"); break;
    }
    case "drink":{
      const clean=playerAmount(g,"water")>=1;
      playerPay(g,{[clean?"water":"dirty_water"]:1}); p.thirst=clamp(p.thirst+(clean?30:20),0,100);
      if (!clean && chance(0.15)) p.diseased=true;
      pushLog(g,clean?"You drank clean water.":"You drank untreated water; illness is possible.",clean?"good":"warn"); break;
    }
    case "rest":{
      sleepFor(30,true); return;
    }
    case "warm_fire":{
      p.warmth=clamp(p.warmth+30,0,100); pushLog(g,"You warm yourself by the fire.","good"); break;
    }
    case "gather_spirits":{
      for (const s of atSettlement(g)?g.survivors:[p,...g.followers]) s.happiness=clamp(s.happiness+5,0,100);
      energy=2; pushLog(g,"Stories around camp lift your spirits.","good"); break;
    }
    case "train":{
      p.skills.combat=Math.min(20,p.skills.combat+0.5); energy=5; pushLog(g,"Combat practice improves your skill.","good"); break;
    }
    case "study":{
      playerPay(g,{books:1}); const kp=rint(2,5); g.knowledge+=kp; energy=2; pushLog(g,`Studied a book: +${kp} knowledge.`,"good"); break;
    }
    case "mine": { const source=gatheringSource(g,"mine"); if(source) handleFeature(g,tileAt(g,source.x,source.y),source.x,source.y); render(); save(); return; }
    case "bandage": playerPay(g,{bandages:1}); p.health=clamp(p.health+15,0,p.maxHealth); p.injured=false; pushLog(g,"Clean bandages treat your wounds.","good"); break;
    case "survey": revealArea(g,g.playerX,g.playerY,10); g.knowledge+=0.2; pushLog(g,"You survey the surrounding land.","info"); break;
    default: return;
  }
  p.energy=clamp(p.energy-energy,0,100);
  if (_activityEpoch===epoch) passMinutes(g,minutes);
  render(); save();
}

function explore(locKey){
  const g = G;
  const p = g.survivors[0];
  if (p.health<=0 || _combat) return;
  const loc = LOCATIONS[locKey]; if (!loc) return;
  if (!atSettlement(g)){ pushLog(g,"Quick Scout departs from the settlement. Search local features while away.","warn"); render(); return; }
  if ((g.scoutCooldowns[locKey] || 0)>gameMinutes(g)){ pushLog(g,`That route is searched out. Return in ${timeText(g.scoutCooldowns[locKey]-gameMinutes(g))}.`,"warn"); render(); return; }
  if(!Object.keys(loc.loot).some(k=>carryRoom(g,k)>0.001)){pushLog(g,"Pack full. Unload before scouting.","warn");render();return;}
  if ((g.inventory.resources.food||0)<1 || (g.inventory.resources.water||0)<1){ pushLog(g,"Pack 1 food and 1 clean water for this trip.","warn"); render(); return; }
  if (p.energy < loc.energy){ pushLog(g,`Too exhausted to explore ${loc.name}.`,"warn"); render(); return; }
  pushLog(g, `You set out to ${loc.name}.`,"info");
  g.inventory.resources.food--; g.inventory.resources.water--;
  g.scoutCooldowns[locKey]=gameMinutes(g)+720;
  p.energy=clamp(p.energy-loc.energy,0,100);
  const epoch=_activityEpoch;
  passMinutes(g,loc.minutes);
  if(p.health<=0 || g.survivors[0]!==p || epoch!==_activityEpoch){ render(); save(); return; }

  // enemy encounter chance scales with danger
  if (chance(0.18 + loc.danger * 0.07)){
    const enemyKey = pick(loc.foundEnemies);
    startCombat(enemyKey, ()=> doScavenge(g, loc, locKey, p));
    return;
  }
  doScavenge(g, loc, locKey, p);
}

function doScavenge(g, loc, locKey, p){
  // gather loot
  let gained = {};
  for (const r in loc.loot){
    const [lo, hi] = loc.loot[r];
    const amt = rint(lo, hi);
    if (amt>0){
      const stock=Object.fromEntries(Object.entries(loc.loot).map(([k,range])=>[k,range[1]*2]));
      const source={key:`scout:${locKey}`,family:"salvage",label:loc.name,minutes:720,stock};
      const got = collectSource(g,source,{[r]:amt},false,true)[r]||0;
      if (got>0) gained[r] = (gained[r]||0) + got;
    }
  }
  // survivor find
  if (chance(loc.survChance)){
    spawnStranger(g);
  }
  // book chance
  if (locKey==="school" || locKey==="hospital" || locKey==="shelter"){
    if (chance(0.2)){ const k = rint(1,3); g.knowledge += k; pushLog(g, `You found notes worth ${k} knowledge.`, "good"); }
  }

  const gainedStr = Object.entries(gained).map(([k,v])=>`+${fmt(v)} ${RESOURCES[k].name}`).join(", ");
  if (gainedStr) pushLog(g, `You returned from ${loc.name}: ${gainedStr}.`, "good");
  else pushLog(g, `You returned from ${loc.name} empty-handed.`, "warn");

  render(); save();
}

// --- Inventory, camp and production ---

function transferResource(key,amount,direction){
  const g=G;
  if (!RESOURCES[key] || !Number.isFinite(amount) || amount<=0 || g.survivors[0].health<=0 || _combat) return;
  const town = storageAccess(g);
  const cache = g.caches[positionKey(g)];
  const source = direction==="take" ? (town?g.resources:cache?.resources) : g.inventory.resources;
  if (!source) return;
  amount=Math.min(amount,source[key] || 0);
  if (direction==="take") source[key]-=addCarried(g,key,amount,false);
  else if (direction==="deposit" && town){
    const stored=addResource(g,key,amount);source[key]-=stored;
    pushLog(g,`Stored ${fmt(stored)} ${RESOURCES[key].name}. ${fmt(source[key])} remain in your pack.${stored<amount?" Base storage full.":""}`,stored<amount?"warn":"good");
  }
  else if (direction==="drop"){
    const dest=cacheAt(g).resources; dest[key]=(dest[key]||0)+amount; source[key]-=amount;
  }
  render(); save();
}
function takeCacheResource(key,amount){
  const c=G.caches[positionKey(G)];
  if (!c || !RESOURCES[key] || !Number.isFinite(amount) || amount<=0 || _combat || G.survivors[0].health<=0) return;
  c.resources[key]-=addCarried(G,key,Math.min(c.resources[key]||0,amount),false);
  render(); save();
}
function moveGear(id,sourceName){
  const g=G;
  if (_combat || g.survivors[0].health<=0) return;
  const source=sourceName==="town" ? (storageAccess(g)?g.townGear:[]) : sourceName==="cache" ? (g.caches[positionKey(g)]?.gear || []) : g.inventory.gear;
  const index=source.findIndex(i=>i.id===id); if(index<0) return;
  const item=source[index];
  if (sourceName==="pack"){
    if (Object.values(g.equipment).includes(id)){ pushLog(g,"Unequip this item first.","warn"); render(); return; }
    if(ITEMS[item.type].liquidCapacity && liquidAmount(g)>liquidCapacity(g)-ITEMS[item.type].liquidCapacity+1e-8){ pushLog(g,"Unload water before removing this container.","warn");render();return; }
    if(storageAccess(g) && !storageFits(g,{}, {},item.type)){ pushLog(g,"Base storage full.","warn");render();return; }
    (storageAccess(g)?g.townGear:cacheAt(g).gear).push(item);
  } else {
    if (packWeight(g)+ITEMS[item.type].weight>packCapacity(g)){ pushLog(g,"Not enough pack space.","warn"); render(); return; }
    g.inventory.gear.push(item);
  }
  source.splice(index,1); render(); save();
}
function equipGear(id){
  const g=G, item=g.inventory.gear.find(i=>i.id===id), def=ITEMS[item?.type];
  if (!def?.slot || _combat || g.survivors[0].health<=0) return;
  const removing=g.equipment[def.slot]===id;
  if (def.slot==="pack" && packWeight(g)>(removing?30:def.capacity)){
    pushLog(g,"Unload supplies before changing to a smaller pack.","warn"); render(); return;
  }
  if(removing) delete g.equipment[def.slot]; else g.equipment[def.slot]=id;
  render(); save();
}
function repairGear(id){
  const g=G, item=g.inventory.gear.find(i=>i.id===id);
  if (!item || item.durability==null || _combat || g.survivors[0].health<=0) return;
  const def=ITEMS[item.type];
  if(item.durability>=def.durability) return;
  const cost=def.kind==="light" ? {[item.type==="lantern"?"oil":"wood"]:1} : {repair_kits:1};
  if (!playerPay(g,cost)){ pushLog(g,"Need "+costString(cost)+".","warn"); render(); return; }
  item.durability=def.durability;
  passMinutes(g,10); pushLog(g,`${def.name} restored.`,"good"); render(); save();
}
function packPreset(name){
  const g=G;
  if(!storageAccess(g) || _combat || g.survivors[0].health<=0) return;
  const supplies=name==="Overnight" ? {food:6,water:6,wood:4,bandages:2,arrows:10} : name==="Mining" ? {food:4,water:4,wood:2,bandages:2} : {food:3,water:3,bandages:1,arrows:5};
  const missing=[];
  for(const [k,n] of Object.entries(supplies)){
    const need=Math.max(0,n-(g.inventory.resources[k]||0));
    g.resources[k]-=addCarried(g,k,Math.min(need,g.resources[k]||0),false);
    if((g.inventory.resources[k]||0)<n) missing.push(RESOURCES[k].name);
  }
  pushLog(g,missing.length?`Packed what fits. Still missing: ${missing.join(", ")}.`:`${name} supplies packed.`,missing.length?"warn":"good");
  render(); save();
}
function depositMaterials(all=false){
  if(!storageAccess(G) || _combat || G.survivors[0].health<=0) return;
  const keep=new Set(["food","water","medicine","bandages","arrows","ammo","repair_kits"]);
  let left=0;
  for(const k of RES_KEYS) if(all || !keep.has(k)){
    G.inventory.resources[k]-=addResource(G,k,G.inventory.resources[k]||0);
    left+=G.inventory.resources[k]||0;
  }
  pushLog(G,left?"Stored what fits. Base storage full; remaining supplies stay in your pack.":"Supplies unloaded into base storage.",left?"warn":"good");
  render(); save();
}
function craftRecipe(id,batches=1){
  const g=G, r=RECIPES[id]; if(!r) return;
  const n=clamp(Math.floor(Number(batches)||1),1,10);
  const p=g.survivors[0], epoch=_activityEpoch;
  let made=0;
  for(let i=0;i<n;i++){
    const blocker=recipeBlocker(g,id);
    if(blocker){ pushLog(g,blocker,"warn"); break; }
    playerPay(g,r.cost); p.energy=clamp(p.energy-1,0,100);
    const minutes=recipeMinutes(g,id), spent=passMinutes(g,minutes);
    if(spent<minutes || _activityEpoch!==epoch || g.survivors[0]!==p || p.health<=0){ pushLog(g,"Crafting interrupted; the current materials were spent.","warn"); break; }
    if(id==="planks") wearTool(g,carriedTool(g,"saw"));
    recipeOutput(g,id); made++;
    if(document.getElementById("modal-root").firstChild) break;
  }
  if(made) pushLog(g,`Crafted ${recipeName(id)} x${made}.`+(r.item?" Check your Pack to equip or take it.":""),"good");
  render(); save();
}
function campAction(action){
  const g=G, key=positionKey(g), p=g.survivors[0];
  const blocked=quickActionBlocker(g,action);
  if(blocked){ pushLog(g,blocked,"warn"); render(); return; }
  const camp=g.camps[key] || (g.camps[key]={gear:[],fuel:0,leanTo:false});
  if(action==="pitch_tent" || action==="lay_bag"){
    const kind=action==="pitch_tent"?"tent":"bedroll";
    if(camp.gear.some(i=>ITEMS[i.type].kind===kind)){ pushLog(g,"Already deployed here.","warn"); render(); return; }
    const item=carriedTool(g,kind); if(!item) return;
    g.inventory.gear.splice(g.inventory.gear.indexOf(item),1); camp.gear.push(item);
    pushLog(g,`${ITEMS[item.type].name} deployed.`,"good");
  } else if(action==="light_fire"){
    if(!playerPay(g,{wood:1})) return;
    camp.fuel+=240; pushLog(g,"Campfire fueled for another 4 hours.","good");
  } else if(action==="lean_to"){
    if(camp.leanTo){ pushLog(g,"A lean-to already stands here.","info"); render(); return; }
    if(!playerPay(g,{wood:4,fiber:4})) return;
    camp.leanTo=true; pushLog(g,"Built an improvised lean-to. It stays on this tile.","good");
  } else if(action==="pack_camp"){
    const hadGear=camp.gear.length>0, hadFire=camp.fuel>0;
    const weight=camp.gear.reduce((s,i)=>s+ITEMS[i.type].weight,0);
    if(packWeight(g)+weight>packCapacity(g)){ pushLog(g,"Free pack space to carry your camping equipment.","warn"); render(); return; }
    g.inventory.gear.push(...camp.gear); camp.gear=[]; camp.fuel=0;
    if(!camp.leanTo) delete g.camps[key];
    const parts=[]; if(hadGear) parts.push("Camping gear packed"); if(hadFire) parts.push("fire extinguished");
    pushLog(g,(parts.join("; ")||"Camp cleared")+".","info");
  }
  p.energy=clamp(p.energy-1,0,100); passMinutes(g,ACTION_COSTS[action]); render(); save();
}
function sleepConditions(g){
  const camp=g.camps?.[positionKey(g)], biome=BIOMES[tileAt(g, g.playerX, g.playerY).biome];
  const home=nearbySettlementBuilding(g,b=>!!b.effects?.housing);
  const tent=camp?.gear.some(i=>ITEMS[i.type].kind==="tent");
  const bag=camp?.gear.some(i=>ITEMS[i.type].kind==="bedroll");
  const coat=ITEMS[equippedItem(g,"clothing")?.type] || {};
  const roof=!!(home || tent || camp?.leanTo), fire=!!nearbyFire(g);
  const rain=g.weather?.type==="rain" && !roof && !coat.rainproof;
  const cold=biome.cold || g.weather?.type==="cold";
  const insulation=(home?8:tent?3:camp?.leanTo?1:0)+(bag?3:0)+(fire?4:0)+(coat.insulation||0);
  const loss=Math.max(0,(isNight(g)?5:2)+(cold?6:0)+(rain?4:0)-insulation);
  let threats=0;
  nearbyTile(g,3,t=>{ if(MAP_ENTITIES[t.entity?.type]?.hostile) threats++; return false; });
  const watch=g.followers.some(s=>s.health>30 && !s.isChild);
  const incident=home?0:clamp(0.30+threats*0.06+(biome.dark?0.1:0)+(isNight(g)?0.05:0)-(tent?0.12:0)-(fire?0.1:0)-(watch?0.06:0),0.04,0.7);
  const recovery=home?14:tent&&bag?12:bag?11:roof?10:10;
  return {roof,fire,loss,incident,recovery,watch,radiation:!!biome.radiation,
    label:home?home.building.name:tent?"Portable tent"+(bag?" + sleeping bag":""):camp?.leanTo?"Lean-to"+(bag?" + sleeping bag":""):bag?"Sleeping bag in the open":"Bare ground"};
}
function openSleepDialog(){
  if(G.survivors[0].health<=0 || _combat) return;
  cancelAutoWalk();
  const c=sleepConditions(G), fuel=G.camps[positionKey(G)]?.fuel || 0;
  showModal({title:"Rest and sleep",body:`<p><b>${c.label}</b> · ${weatherLabel(G.weather.type)} weather</p>
    <p>Recovery: about ${c.recovery} energy/hour. Current exposure: -${c.loss} warmth/hour.</p>
    <p>Incident risk: about ${Math.round(c.incident*100)}% over 8 hours at current conditions. ${c.watch?"A companion keeps watch.":""}</p>
    <p>Field fire: ${timeText(fuel)} fuel. Accessible supplies: ${fmt(playerAmount(G,"food"))} food, ${fmt(playerAmount(G,"water"))} clean water.</p>
    <p class="${c.loss>0 || c.radiation?"bad":"muted"}">${c.radiation?"Radiation continues during sleep and can kill you. ":""}${c.loss>0?"Exposure can become lethal. Conditions and fuel are checked throughout sleep.":"Conditions can change overnight. Shelter does not prevent settlement raids."}</p>`,
    buttons:[...[120,240,480].map(n=>({label:`Sleep ${n/60}h`,action:()=>{closeModal();sleepFor(n);}})),{label:"Cancel",action:closeModal}]});
}
function sleepFor(minutes,rest=false){
  const g=G,p=g.survivors[0],epoch=_activityEpoch;
  if(p.health<=0 || _combat) return;
  cancelAutoWalk();
  _sleeping=true;
  let elapsed=0;
  try{
    while(elapsed<minutes && p.health>0 && g.survivors[0]===p && _activityEpoch===epoch){
      const fuel=g.camps[positionKey(g)]?.fuel || 0;
      const step=Math.min(30,minutes-elapsed,fuel>0?fuel:Infinity), c=sleepConditions(g);
      const spent=passMinutes(g,step); elapsed+=spent;
      if(spent<step || _activityEpoch!==epoch || g.survivors[0]!==p || p.health<=0) break;
      p.warmth=clamp(p.warmth-c.loss*step/60+(c.fire?step/30:0),0,100);
      const damage=(p.warmth<=0?16:p.warmth<15?8:0)+(c.radiation?6:0);
      p.health=clamp(p.health-damage*step/60,0,p.maxHealth);
      if(!rest || p.energy<60) p.energy=clamp(p.energy+(rest?10:c.recovery)*step/60,0,rest?60:100);
      if(p.health<=0){ pushLog(g,"Exposure overtook you while resting.","bad"); removeDead(g); break; }
      if(c.roof && c.loss===0 && !c.radiation && p.hunger>40 && p.thirst>40) p.health=clamp(p.health+step/60,0,p.maxHealth);
      if(chance(1-Math.pow(1-c.incident,step/480))){
        pushLog(g,"Movement outside wakes you. Your rest is interrupted!","bad");
        startCombat(pick(["wild_dogs","wolves","thieves"])); break;
      }
      if(document.getElementById("modal-root").firstChild) break;
    }
  } finally {
    _sleeping=false;
  }
  pushLog(g,`Rested ${timeText(elapsed)}${elapsed<minutes?" before interruption":""}.`,"info"); render(); save();
}

function farmAction(id,action,crop){
  const g=G, f=g.farms.find(f=>f.id===id);
  if(!f || _combat || g.survivors[0].health<=0) return;
  // Choosing a crop is just config; the hands-on actions require you beside the plot.
  if(action==="select"){
    if(!atSettlement(g)) return;
  } else {
    const near = f.x!=null ? farmPlotAdjacent(g,f) : atSettlement(g);
    if(!near){ pushLog(g,"Walk next to this plot to tend it.","warn"); render(); return; }
  }
  if(action==="select" && !f.planted && CROPS[crop]) f.crop=crop;
  else if(action==="plant"){
    if(f.planted || !playerPay(g,{seeds:1})) return;
    f.planted=true; f.growth=0; f.water=Math.max(40,f.water); passMinutes(g,carriedTool(g,"hoe")?10:20); wearTool(g,carriedTool(g,"hoe"));
  } else if(action==="water"){
    if(!playerPay(g,{water:1})) return; f.water=100; passMinutes(g,5);
  } else if(action==="fertilize"){
    if(!playerPay(g,{compost:1})) return; f.fertility=clamp(f.fertility+30,0,100); passMinutes(g,5);
  } else if(action==="harvest"){
    if(!harvestFarm(g,f,false)){pushLog(g,"Crop not ready, or not enough pack space for this harvest.","warn");render();return;} passMinutes(g,10);
  } else if(action==="fence"){
    if(f.fenced || !playerPay(g,{wood:4})) return;
    f.fenced=true;passMinutes(g,20);
  } else if(action==="irrigate"){
    if(f.irrigated || !playerPay(g,{wood:4,clay:4,rope:1})) return;
    f.irrigated=true;passMinutes(g,30);
  }
  render(); save();
}
function harvestFarm(g,f,worker=true){
  if(!f.planted || f.growth<100) return false;
  const crop=CROPS[f.crop], scale=f.building==="greenhouse"?2:f.building==="crop_field"?1.5:1;
  const output=Object.fromEntries(Object.entries(crop.output).map(([k,v])=>[k,v*(k==="seeds"?1:scale)]));
  if(!(worker?storageFits(g,output):playerOutputFits(g,output))) return false;
  for(const [k,v] of Object.entries(output)) worker?addResource(g,k,v):addCarried(g,k,v,false);
  f.growth=0; f.planted=!!crop.perennial; f.fertility=Math.max(20,f.fertility-12);
  pushLog(g,`Harvested ${crop.name.toLowerCase()} from ${BUILDINGS[f.building].name}.`,"good"); return true;
}
function updateFarms(g){
  for(const f of g.farms){
    if(!g.buildings[f.building]?.count) continue;
    const workers=productionWorkers(g,f.building).filter(id=>g.jobs[id]!=="seed_saver");
    const index=g.farms.filter(o=>o.building===f.building).indexOf(f);
    const tended=workers.length>index;
    if(tended){
      if(f.growth>=100) harvestFarm(g,f);
      if(!f.planted && productionStock(g,"seeds")>=1){ g.resources.seeds--; f.planted=true; }
      if(f.water<60 && productionStock(g,"water")>=1){ g.resources.water--; f.water=100; }
      if(f.fertility<55 && productionStock(g,"compost")>=1){ g.resources.compost--; f.fertility=clamp(f.fertility+30,0,100); }
    }
    if(f.irrigated && f.water<90){
      const water=productionStock(g,"dirty_water")>=0.25?"dirty_water":"water";
      if(productionStock(g,water)>=0.25){g.resources[water]-=0.25;f.water=clamp(f.water+25,0,100);}
    }
    if(g.weather.type==="rain") f.water=clamp(f.water+35,0,100);
    if(!f.planted){ f.fertility=clamp(f.fertility+2,0,100); continue; }
    if(f.growth>=100) continue;
    if(!f.fenced && f.building!=="greenhouse" && chance(0.02)){
      f.growth=Math.max(0,f.growth-8);pushLog(g,"Wildlife nibbled an unfenced crop. Fences protect plots.","warn");
    }
    if(f.water>=10){
      const temp=g.weather.type==="cold" && f.building!=="greenhouse" ? 0.5 : 1;
      f.growth=clamp(f.growth+100/(CROPS[f.crop].days*4)*(0.5+f.fertility/160)*temp,0,100);
    }
    f.water=Math.max(0,f.water-10);
  }
}
function setWorkOrder(building,recipe,mode,target){
  if(!BUILDINGS[building]?.workers || !G.buildings[building]?.count || !workplaceRecipes(building).includes(recipe)) return;
  G.orders[building]={recipe,mode:mode==="maintain"?mode:"count",target:clamp(Math.floor(Number(target)||1),1,999),progress:0};
  render(); save();
}
function orderStock(g,recipe){
  const r=RECIPES[recipe];
  return r.item ? g.townGear.filter(i=>i.type===r.item).length : Math.min(...Object.keys(r.output).map(k=>g.resources[k]||0));
}
function orderBlocker(g,bid,order){
  if(!productionWorkers(g,bid).length) return "No worker";
  if(!workplaceRecipes(bid).includes(order.recipe)) return "Wrong workplace";
  if(order.mode==="maintain" && orderStock(g,order.recipe)>=order.target || order.mode==="count" && order.target<=0) return "Target reached";
  const why=recipeBlocker(g,order.recipe,true); if(why) return why;
  const r=RECIPES[order.recipe];
  if(Object.entries(r.cost).some(([k,v])=>(g.resources[k]||0)-v<(g.reserves[k]||0))) return "Protected reserves";
  if(!storageFits(g,r.output,r.cost,r.item)) return "Base storage full";
  return "";
}
function produceOrders(g){
  for(const [bid,order] of Object.entries(g.orders)){
    if(!g.buildings[bid]?.count || orderBlocker(g,bid,order)) continue;
    order.progress+=60*productionWorkers(g,bid).length*workerSkillBonus(g,bid,productionWorkers(g,bid));
    const r=RECIPES[order.recipe];
    let limit=40;
    while(order.progress>=r.minutes && limit-- && !orderBlocker(g,bid,order)){
      pay(g,r.cost); recipeOutput(g,order.recipe,true); order.progress-=r.minutes;
      if(order.mode==="count") order.target--;
    }
    order.progress=Math.min(order.progress,r.minutes);
  }
}
function haulCaches(g,amount){
  for(const [key,site] of Object.entries(g.workSites)){
    if(site.kind!=="outpost") continue;
    const cache=g.caches[key]; if(!cache) continue;
    for(const [r,v] of Object.entries(cache.resources)){
      const got=addResource(g,r,Math.min(v,amount)); cache.resources[r]-=got; amount-=got;
      if(amount<=0) return;
    }
  }
}

function useMedicine(){
  const p=G.survivors[0];
  if(p.health<=0 || _combat || !playerPay(G,{medicine:1})) return;
  p.health=clamp(p.health+25,0,p.maxHealth); p.diseased=false;
  passMinutes(G,5); pushLog(G,"Medicine treats your illness and restores 25 health.","good"); render(); save();
}

// --- Combat ---

let _combat = null;

function startCombat(enemyKey, onWinAfter, onFleeAfter){
  const e = ENEMIES[enemyKey];
  if (!e || G.survivors[0].health<=0) return;
  _activityEpoch++;
  cancelAutoWalk();
  _combat = {
    enemyKey, name:e.name, hp:e.hp, maxHp:e.hp, dmg:e.dmg, danger:e.danger, loot:e.loot,
    onWinAfter, onFleeAfter,
    playerHpStart: G.survivors[0].health,
    log:[]
  };
  showCombatModal();
}

function combatAttack(){
  const c = _combat; if (!c) return;
  const p = G.survivors[0];
  // weapon bonus
  let weaponBonus = 0;
  const weapon=equippedItem(G,"weapon");
  if (weapon) weaponBonus=ITEMS[weapon.type].damage || 0;
  const skill = p.skills.combat || 0;
  const dmg = rint(3,7) + weaponBonus + skill + (p.traits.includes("brave")?2:0);
  c.hp -= dmg;
  wearTool(G,weapon);
  c.log.push(`You strike ${c.name} for ${dmg}.`);
  if ((G.inventory.resources.ammo||0)>=1 && weapon?.type==="salvaged_weapon" && chance(0.3)){
    G.inventory.resources.ammo -= 1;
    const ed = rint(6,12);
    c.hp -= ed;
    c.log.push(`You fire and hit for ${ed}.`);
  }
  if (c.hp<=0){ combatWin(); return; }
  enemyTurn();
}

function combatFlee(){
  const c = _combat; if (!c) return;
  const p = G.survivors[0];
  const fleeChance = 0.4 + (p.traits.includes("quick")?0.2:0) + (p.traits.includes("cowardly")?0.15:0) - c.danger*0.05;
  if (chance(fleeChance)){
    pushLog(G, `You fled from ${c.name}.`, "warn");
    const fa = c.onFleeAfter;
    _combat = null; closeModal();
    p.energy = clamp(p.energy-10,0,100);
    const epoch=_activityEpoch;
    passMinutes(G,15);
    if (fa && p.health>0 && G.survivors[0]===p && _activityEpoch===epoch) fa();
    render(); save();
  } else {
    c.log.push(`You failed to flee.`);
    enemyTurn();
  }
}

function enemyTurn(){
  const c = _combat; if (!c) return;
  const p = G.survivors[0];
  const ed = rint(c.dmg[0], c.dmg[1]);
  const armor=equippedItem(G,"clothing");
  const mitig=ITEMS[armor?.type]?.armor || 0;
  const final = Math.max(1, ed - mitig);
  p.health = clamp(p.health - final, 0, p.maxHealth);
  c.log.push(`${c.name} hits you for ${final}.`);
  if (p.health<=0){ combatLose(); return; }
  showCombatModal();
}

function combatWin(){
  const c = _combat; if (!c) return;
  const loot = {};
  for (const r in c.loot){
    const [lo,hi] = c.loot[r]; const amt = rint(lo,hi);
    if (amt>0){ const got = addCarried(G, r, amt); if (got>0) loot[r]=got; }
  }
  const lootStr = Object.entries(loot).map(([k,v])=>`+${fmt(v)} ${RESOURCES[k].name}`).join(", ");
  pushLog(G, `You defeated ${c.name}.${lootStr?" Loot: "+lootStr:""}`, "good");
  G.survivors[0].skills.combat = Math.min(20, G.survivors[0].skills.combat + 0.5);
  G.reputation += 0.5;
  const after = c.onWinAfter;
  _combat = null; closeModal();
  const p=G.survivors[0],epoch=_activityEpoch;
  passMinutes(G,15);
  if (after && p.health>0 && G.survivors[0]===p && _activityEpoch===epoch) after();
  render(); save();
}

function combatLose(){
  const c = _combat; if (!c) return;
  pushLog(G, `You were beaten by ${c.name}. You lose resources crawling back.`, "bad");
  // lose resources
  const losses = ["wood","food","water","cloth","metal","weapons"];
  for (const r of losses){ if (G.inventory.resources[r] > 0){ const l = Math.min(G.inventory.resources[r],Math.ceil(G.inventory.resources[r]*0.2)); G.inventory.resources[r] -= l; } }
  _combat = null; closeModal();
  if (G.survivors[0].health<=0){ removeDead(G); save(); render(); return; }
  passMinutes(G,15);
  render(); save();
}

// --- Building ---

function build(buildingId, townX=null, townY=null){
  const g = G;
  const b = BUILDINGS[buildingId]; if (!b) return;
  if (!atSettlement(g) || g.survivors[0].health<=0 || _combat){ pushLog(g,"Return to the settlement to build.","warn"); render(); return; }
  if (!isUnlocked(g, buildingId)) { pushLog(g,"Not yet researched.","warn"); render(); return; }
  if ((g.buildings[buildingId]?.count||0) >= b.max){ pushLog(g,`${b.name}: max reached.`,"warn"); render(); return; }
  if (!canPay(g, b.cost)){ pushLog(g,`Not enough resources for ${b.name}.`,"warn"); render(); return; }
  if (townX==null || townY==null){
    _buildToPlace = buildingId;
    _activeTab = "map";
    pushLog(g, `Choose a map tile near the campfire for ${b.name}.`, "info");
    render(); save(); return;
  }
  if (!placeSettlementBuilding(g, buildingId, townX, townY)){
    pushLog(g, "Build near the campfire on clear, safe ground.", "warn");
    render(); return;
  }
  pay(g, b.cost);
  if (!g.buildings[buildingId]) g.buildings[buildingId] = {count:0, dmg:0};
  g.buildings[buildingId].count++;
  pushLog(g, `Built ${b.name}.`, "good");
  _buildToPlace = null;
  normalizeExpedition(g);
  passMinutes(g,buildingMinutes(g,buildingId)); wearTool(g,carriedTool(g,"hammer"));
  render(); save();
}

// --- Knowledge ---

function research(nodeId){
  const g = G;
  const node = KNOWLEDGE.find(n=>n.id===nodeId); if (!node) return;
  if (g.knownNodes[nodeId]) return;
  for (const r of node.req){ if (!g.knownNodes[r]){ pushLog(g, `Missing prerequisite for ${node.name}.`,"warn"); render(); return; } }
  if (g.knowledge < node.cost){ pushLog(g, `Need ${node.cost} knowledge for ${node.name}.`,"warn"); render(); return; }
  g.knowledge -= node.cost;
  g.knownNodes[nodeId] = true;
  pushLog(g, `Researched ${node.name}.`, "good");
  render(); save();
}

// --- Jobs ---

function assignJob(survId, jobKey){
  const g = G;
  const s = survivorById(g, survId); if (!s) return;
  if (!JOBS[jobKey] || s.health<=0) return;
  if (s.isChild) return;
  if (s.isPlayer && jobKey!=="none"){ pushLog(g,"You manage things yourself — assign others.","warn"); render(); return; }
  if ((g.jobs[survId] || "none")===jobKey) return;
  if (jobKey!=="none" && !jobAvailable(g,jobKey)){ pushLog(g,"No available workplace or resource site.","warn"); render(); return; }
  // Validate before releasing the previous slot.
  const prev = g.jobs[survId];
  if (prev && JOBS[prev]?.building){
    const bid = JOBS[prev].building;
    if (g.workerAssign[bid]) g.workerAssign[bid] = g.workerAssign[bid].filter(id=>id!==survId);
  }
  if (jobKey==="none"){ g.jobs[survId] = "none"; s.job = "none"; render(); save(); return; }
  if (!jobAvailable(g, jobKey)){ pushLog(g, `No open slot for ${JOBS[jobKey].name}.`,"warn"); render(); return; }
  g.jobs[survId] = jobKey;
  s.job = jobKey;
  const b = JOBS[jobKey].building;
  if (b){
    if (!g.workerAssign[b]) g.workerAssign[b] = [];
    g.workerAssign[b].push(survId);
  }
  pushLog(g, `${s.name} assigned to ${JOBS[jobKey].name}.`,"info");
  render(); save();
}

// Fill open building slots with the best-matching idle workers.
function autoAssignIdle(){
  const g=G; let n=0;
  for (const id in g.buildings){
    const b=BUILDINGS[id]; if (!b || !b.workers) continue;
    const primary=jobsForBuilding(id)[0]; if (!primary) continue;
    while (openSlots(g,id)>0){
      const w=bestWorkerFor(g,primary); if (!w) break;
      assignJob(w.id, primary); n++;
    }
    if (!freeWorkers(g).length) break;
  }
  if (!n){ pushLog(g,"No idle workers or open slots to fill.","info"); render(); }
}

// --- Survivors / families ---

function spawnStranger(g){
  if (g.survivors.length >= getHousing(g) + 1){
    // arrives but might leave
    if (chance(0.5)){
      pushLog(g,"A stranger arrived but left when they saw no place to stay.","warn");
      return;
    }
  }
  const s = makeSurvivor();
  s.id = g.nextSurvId++;
  // assign id properly
  // (push)
  g.survivors.push(s);
  g.jobs[s.id] = "none";
  pushLog(g, `A survivor named ${s.name} (${s.traits.map(t=>TRAITS[t].label).join(", ")}) joined your camp.`, "good");
  // happiness lift for player
  g.survivors[0].happiness = clamp(g.survivors[0].happiness + 3,0,100);
}

function tradeBlocker(g,give,get){
  if(g.survivors[0].health<=0 || _combat) return "Cannot trade while down or in combat.";
  if(!playerCanPay(g,give)) return "Missing payment supplies.";
  if(!playerOutputFits(g,get,give)) return "Free pack or water-container space before trading.";
  return "";
}
function personalTrade(g,give,get){
  const why=tradeBlocker(g,give,get);
  if(why){pushLog(g,why,"warn");return false;}
  playerPay(g,give);
  for(const [k,v] of Object.entries(get)) addCarried(g,k,v,false);
  return true;
}
function traderArrives(g, field=false, traderKey="town-trader"){
  if (!field && !atSettlement(g)) return;
  const until=g.eventCooldowns[traderKey]||0;
  if(until>gameMinutes(g)){if(field) pushLog(g,`The trader is out of stock. Return in ${timeText(until-gameMinutes(g))}.`,"warn");render();return;}
  // simple trade: give random good deal
  const offers = [
    {give:{wood:10}, get:{food:6}},
    {give:{wood:8}, get:{cloth:6}},
    {give:{food:6}, get:{medicine:2}},
    {give:{metal:6}, get:{tools:2}},
    {give:{herbs:4}, get:{water:6}},
    {give:{cloth:6}, get:{leather:3}},
    {give:{bones:4}, get:{seeds:3}},
    {give:{alcohol:2}, get:{books:1}},
    {give:{charcoal:4}, get:{iron:1}},
  ];
  const affordable = offers.filter(o=>!tradeBlocker(g,o.give,o.get));
  if(!g.traderOffers) g.traderOffers={};
  const offer = g.traderOffers[traderKey] || (g.traderOffers[traderKey]=pick(affordable.length ? affordable : offers));
  const why=tradeBlocker(g,offer.give,offer.get),canAccept=!why;
  showModal({
    title:"A Trader Arrives",
    body:`<p>A wanderer offers to trade:</p>
      <p><b>Give:</b> ${costString(offer.give, g)}<br/>
      <b>Get:</b> ${Object.entries(offer.get).map(([k,v])=>v+" "+RESOURCES[k].name).join(", ")}</p><p>One bundle in stock. Restocks 24 game-hours after purchase. Goods enter your pack.</p>${why?`<p class="warn">${why}</p>`:""}`,
    buttons:[
      {label:"Accept", primary:true, disabled:!canAccept, title:why, action:()=>{
        if((g.eventCooldowns[traderKey]||0)<=gameMinutes(g) && personalTrade(g,offer.give,offer.get)){
          g.eventCooldowns[traderKey]=gameMinutes(g)+1440;delete g.traderOffers[traderKey];
          pushLog(g,"Trade complete. Goods are in your pack; the trader will restock in 24 hours.","good");g.reputation+=0.5;
        }
        closeModal(); render(); save();
      }},
      {label:"Decline", action:()=>{ closeModal(); }}
    ]
  });
  save();
}

function tryRelationship(g){
  // pair eligible unpartnered adults
  const eligible = adults(g).filter(s=> !s.partnerId && s.health>0 && !s.isChild);
  if (eligible.length < 2) return;
  const a = pick(eligible);
  const others = eligible.filter(s=> s.id!==a.id && s.sex!==a.sex);
  if (others.length===0) return;
  const b = pick(others);
  // require a roof
  if (getHousing(g) < g.survivors.length) return;
  a.partnerId = b.id; b.partnerId = a.id;
  g.relationships.push({a:a.id, b:b.id, type:"partner"});
  pushLog(g, `${a.name} and ${b.name} have become partners.`, "good");
  a.happiness = clamp(a.happiness+10,0,100); b.happiness = clamp(b.happiness+10,0,100);
}

function canHaveChild(a, b){
  return a && b && a.sex && b.sex && a.sex !== b.sex;
}

function birthChild(g, a, b){
  if (!canHaveChild(a,b)) return;
  if (g.survivors.length >= getHousing(g)) return;
  const child = makeSurvivor("Child");
  child.isChild = true;
  child.age = 0;
  child.age_ticks = 0;
  child.lastName = (rng()<0.5? a.lastName : b.lastName);
  child.name = `${child.firstName} ${child.lastName}`;
  child.parentIds = [a.id, b.id];
  child.health = 50; child.maxHealth = 60;
  child.skills = {combat:0,building:0,farming:0,medicine:0,crafting:0,hunting:0};
  child.id = g.nextSurvId++;
  g.survivors.push(child);
  g.jobs[child.id] = "none";
  g.relationships.push({a:a.id, b:child.id, type:"parent"});
  g.relationships.push({a:b.id, b:child.id, type:"parent"});
  pushLog(g, `${a.name} and ${b.name} welcomed a child: ${child.name}.`, "good");
  a.happiness = clamp(a.happiness+8,0,100);
  b.happiness = clamp(b.happiness+8,0,100);
}

function eligibleForCourtship(g, s){
  const p = g.survivors[0];
  return p && s && !s.isPlayer && !s.isChild && s.health>0 && !s.partnerId && !p.partnerId && s.sex !== p.sex;
}

function courtSurvivor(id){
  const g = G;
  const p = g.survivors[0];
  const s = survivorById(g, id);
  if (!eligibleForCourtship(g, s)){ pushLog(g, "Courtship is not possible right now.", "warn"); render(); return; }
  if (p.energy < 6){ pushLog(g, "You are too exhausted to court anyone right now.", "warn"); render(); return; }
  if (getHousing(g) < g.survivors.length){ pushLog(g, "You need enough housing before romance can grow.", "warn"); render(); return; }
  const gain = rint(18,30) + (p.traits.includes("leader") ? 8 : 0);
  g.courtship[id] = clamp((g.courtship[id] || 0) + gain, 0, 100);
  p.energy -= 6;
  p.happiness = clamp(p.happiness + 3, 0, 100);
  s.happiness = clamp(s.happiness + 4, 0, 100);
  pushLog(g, `You spend time with ${s.name}. Heart: ${g.courtship[id]}/100.`, "good");
  passMinutes(g, 30);
  render(); save();
}

function marrySurvivor(id){
  const g = G;
  const p = g.survivors[0];
  const s = survivorById(g, id);
  if (!eligibleForCourtship(g, s)){ pushLog(g, "Marriage is not possible right now.", "warn"); render(); return; }
  if ((g.courtship[id] || 0) < 100){ pushLog(g, "Win their heart first.", "warn"); render(); return; }
  if (getHousing(g) < g.survivors.length){ pushLog(g, "You need enough housing before marriage.", "warn"); render(); return; }
  p.partnerId = s.id;
  s.partnerId = p.id;
  g.relationships.push({a:p.id, b:s.id, type:"partner"});
  delete g.courtship[id];
  p.happiness = clamp(p.happiness + 15, 0, 100);
  s.happiness = clamp(s.happiness + 15, 0, 100);
  pushLog(g, `You and ${s.name} are married. Your family line can continue.`, "good");
  render(); save();
}

// --- Threats / events ---

function rollThreats(g){
  const d = settlementDanger(g);
  g.danger = d;
  let raidChance = 0.04 + d * 0.005;
  // walls reduce
  let warning = 0;
  for (const id in g.buildings){
    const b = BUILDINGS[id]; if (!b) continue;
    if (b.effects?.warning) warning += g.buildings[id].count;
  }
  if (warning>0) raidChance -= 0.02 * warning;
  raidChance = clamp(raidChance, 0.01, 0.5);

  if (chance(raidChance)){
    raidEvent(g);
  }
  // disease event
  if (chance((0.02 + g.survivors.length*0.003) * (1 - diseaseResist(g))) && g.resources.water < g.survivors.length){
    const target = pick(g.survivors.filter(s=>!s.diseased));
    if (target){ target.diseased = true; pushLog(g, `${target.isPlayer?"You":target.name} fell ill.`, "bad"); }
  }
  // fire event
  if (chance(0.01) && Object.keys(g.buildings).length > 4){
    const bid = pick(Object.keys(g.buildings).filter(b=>b!=="campfire"));
    if (bid && g.buildings[bid].count>0){
          loseBuilding(g,bid);
      pushLog(g, `Fire damaged your ${BUILDINGS[bid].name}.`, "bad");
    }
  }
  // food spoilage if too much
  if (g.resources.food>0 && storageUsage(g).total > foodStorageCap(g)*0.9){
    const keeper=g.survivors.some(s=>s.health>0 && ["storekeeper","quartermaster"].includes(g.jobs[s.id]) && productionWorkers(g,JOBS[g.jobs[s.id]].building).includes(s.id));
    const spoil = Math.ceil(g.resources.food * (keeper?0.02:0.05));
    g.resources.food = Math.max(0, g.resources.food - spoil);
    addResource(g,"compost",spoil/5);
    pushLog(g, `${spoil} food spoiled.`, "warn");
  }
  // trader random
  if (chance(0.04 + g.reputation*0.002)) traderArrives(g);
  // resource discovery
  if (chance(0.03)){
    const r = pick(["wood","stone","herbs","seeds","metal"]);
    const amt = rint(3,8);
    collectSource(g,sourceAt(g,g.playerX,g.playerY,resourceFamily(r)),{[r]:amt});
  }
}

function diseaseResist(g){
  let resist = 0;
  for (const id in g.buildings){
    const b = BUILDINGS[id]; if (!b) continue;
    resist += (b.effects?.disease_resist || 0) * g.buildings[id].count;
  }
  return clamp(resist, 0, 0.75);
}

function maybeRandomEvent(g){
  // a few tick-scale events
  const roll = rng();
  if (roll < 0.3){
    // weather effect
    if (chance(0.5)){
      const amt = rint(1,3);
      if(g.buildings.rain_barrel?.count) collectSource(g,workerSource(g,"dirty_water","rain_barrel"),{dirty_water:amt},true,true);
      // pushLog(g,`Light rain. (+${amt} dirty water)`,"info");
    }
  } else if (roll < 0.5){
    // stranger passes by
    if (chance(0.1)) spawnStranger(g);
  } else if (roll < 0.7){
    // worker injured
    if (g.survivors.length > 1 && chance(0.04)){
      const t = pick(nonPlayerAdults(g));
      if (t){
        const inj = rint(5,15);
        t.health = clamp(t.health - inj, 0, t.maxHealth);
        if (t.health < 50) t.injured = true;
        pushLog(g, `${t.name} was injured at work.`, "warn");
      }
    }
  }
}

function raidEvent(g, forcedEnemyKey=null){
  // pick a raid type
  const pool = ["raiders","bandits","wolves","wild_dogs","infected","mutated_animals","warlord_scouts","thieves"];
  // bias toward danger
  const enemyKey = forcedEnemyKey || (g.danger > 30 ? pick(["raiders","bandits","warlord_scouts","mutated_animals"]) : pick(pool));
  const e = ENEMIES[enemyKey];
  const count = 1 + Math.floor(g.danger / 12);
  // defense values
  let defense = 0;
  for (const id in g.buildings){
    const b = BUILDINGS[id]; if (!b) continue;
    const eff = b.effects || {};
    if (eff.wall) defense += eff.wall * g.buildings[id].count;
    if (eff.safety_per_worker) defense += eff.safety_per_worker * (g.workerAssign[id]?.length || 0);
  }
  // guards fight back
  let attackPower = (e.dmg[0]+e.dmg[1])/2 * count;
  let lossDmg = Math.max(0, attackPower - defense*0.6);

  // weapons in armory help
  if (g.resources.weapons>=2) lossDmg *= 0.8;

  // distribute damage
  let casualties = 0, lostRes = 0;
  // hurt random survivors slightly
  for (let i=0;i<count;i++){
    const t = pick(g.survivors.filter(s=>!s.isPlayer || atSettlement(g)));
    if (!t) continue;
    const dmg = Math.ceil(lossDmg / count) + rint(0,4);
    t.health = clamp(t.health - dmg, 0, t.maxHealth);
    if (t.health<=0 && !t.isPlayer) casualties++;
  }
  // steal/damage resources
  if (enemyKey==="thieves" || enemyKey==="raiders" || enemyKey==="bandits" || enemyKey==="warlord_scouts"){
    const stealList = ["food","water","metal","weapons","ammo","cloth","tools"];
    for (const r of stealList){
      const amt = Math.min(g.resources[r]||0, Math.ceil((g.resources[r]||0)*0.15));
      if (amt>0){ g.resources[r] -= amt; lostRes += amt; }
    }
  }
  // possible building damage
  if (chance(0.4) && Object.keys(g.buildings).length>3){
    const bid = pick(Object.keys(g.buildings).filter(b=>b!=="campfire"));
    if (bid && g.buildings[bid].count>0){
      loseBuilding(g,bid);
      pushLog(g, `${BUILDINGS[bid].name} was damaged in the raid.`,"bad");
    }
  }
  pushLog(g, `Raid! ${count} ${e.name}${count>1?"s":""} attacked. ${casualties? casualties+" lost.":""} ${lostRes? lostRes+" supplies stolen.":""}`, "bad");
  for (const s of g.survivors) s.happiness = clamp(s.happiness-5,0,100);
  removeDead(g);
}

function loseBuilding(g,bid){
  if(!g.buildings[bid]?.count) return;
  g.buildings[bid].count--;
  let removed=false;
  for(let dy=-7; dy<=7 && !removed; dy++) for(let dx=-10; dx<=10 && !removed; dx++){
    const x=g.villageX+dx, y=g.villageY+dy;
    if(tileAt(g, x, y).settlementBuilding!==bid) continue;
    tileAt(g, x, y).settlementBuilding=null;
    const tx=Math.floor(TOWN_W/2)+x-g.villageX, ty=Math.floor(TOWN_H/2)+y-g.villageY;
    if(inTownBounds(tx,ty) && g.town[ty][tx]?.building===bid) g.town[ty][tx]=null;
    removed=true;
  }
  if(!removed){
    for(let y=0;y<TOWN_H && !removed;y++) for(let x=0;x<TOWN_W && !removed;x++){
      if(g.town[y][x]?.building===bid){g.town[y][x]=null;removed=true;}
    }
  }
  normalizeExpedition(g);
}
