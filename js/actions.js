"use strict";

// ------------------------- ACTIONS ------------------------------

function passPhase(g, phases=1, reason=""){
  for (let i=0; i<phases; i++){
    advanceOnePhase(g);
  }
}

function advanceOnePhase(g){
  g.phase++;
  if (g.phase >= TICKS_PER_DAY){
    g.phase = 0;
    g.day++;
    onDayEnd(g);
  }
  applyTick(g);
  moveMapEntities(g);
}

function applyTick(g){
  // Decay needs per tick
  const player = g.survivors[0];
  const night = g.phase===3;
  // Player
  decaySurvivor(g, player, /*isPlayer*/true, night);
  // Other survivors
  for (let i=1; i<g.survivors.length; i++){
    decaySurvivor(g, g.survivors[i], false, night);
  }

  // Building production (per tick)
  produceFromBuildings(g);
  produceFromJobs(g);

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
  s.energy = clamp(s.energy - (isPlayer? 3 : 2), 0, 100);
  s.warmth = clamp(s.warmth - (night? 6 : 2)*factor, 0, 100);

  // happiness drifts
  if (s.hunger < 30 || s.thirst < 30) s.happiness = clamp(s.happiness - 2, 0, 100);
  if (s.warmth < 30) s.happiness = clamp(s.happiness - 1, 0, 100);

  // warmth bonus from campfire
  const hasFire = (g.buildings.campfire?.count||0) > 0 && (g.resources.wood>0 || g.resources.charcoal>0);
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
  const safety = settlementSafety(g);
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
  // Per-tick production = (per-day amount)/TICKS_PER_DAY
  for (const id in g.buildings){
    const b = BUILDINGS[id]; if (!b) continue;
    const count = g.buildings[id].count;
    const assigned = g.workerAssign[id] || [];
    const eff = b.effects || {};

    if (eff.produce){
      for (const r in eff.produce){
        addResource(g, r, (eff.produce[r] * count)/TICKS_PER_DAY);
      }
    }
    if (eff.produce_per_worker){
      for (const r in eff.produce_per_worker){
        const skillBoost = workerSkillBonus(g, id, assigned);
        addResource(g, r, (eff.produce_per_worker[r] * assigned.length * skillBoost)/TICKS_PER_DAY);
      }
    }
    if (eff.consume){
      for (const r in eff.consume){
        const need = (eff.consume[r] * count)/TICKS_PER_DAY;
        if ((g.resources[r]||0) >= need) g.resources[r] -= need;
      }
    }
    if (eff.convert){
      const conv = eff.convert;
      const max = (conv.perWorker||1) * assigned.length;
      let runs = max / TICKS_PER_DAY;
      // limit by inputs
      for (const r in conv.from){
        const possible = (g.resources[r]||0) / conv.from[r];
        runs = Math.min(runs, possible);
      }
      if (runs > 0){
        for (const r in conv.from){ g.resources[r] -= conv.from[r] * runs; }
        for (const r in conv.to){ addResource(g, r, conv.to[r] * runs); }
      }
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
        if (s.health < s.maxHealth && pwr>0){
          const heal = Math.min(pwr, s.maxHealth-s.health);
          s.health += heal; pwr -= heal;
          if (s.injured && s.health > 60) s.injured = false;
        }
      }
    }
    if (eff.disease_resist && assigned.length){
      for (const s of g.survivors){
        if (s.diseased && chance(eff.disease_resist * assigned.length / TICKS_PER_DAY)){
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
    if (eff.happiness_all){
      const v = eff.happiness_all * count / TICKS_PER_DAY;
      for (const s of g.survivors) s.happiness = clamp(s.happiness + v, 0, 100);
    }
    if (eff.morale_all){
      const v = eff.morale_all * count / TICKS_PER_DAY;
      for (const s of g.survivors) s.morale = clamp(s.morale + v, 0, 100);
    }
    if (eff.reputation){
      g.reputation += eff.reputation * count / TICKS_PER_DAY;
    }
    if (eff.attract_chance){
      if (chance(eff.attract_chance * count / TICKS_PER_DAY)){
        spawnStranger(g);
      }
    }
    if (eff.trade_chance){
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
    if (!job || jobKey==="none" || job.building) continue;
    const boost = workerJobBonus(s, jobKey);
    for (const r in job.output || {}){
      addResource(g, r, job.output[r] * boost / TICKS_PER_DAY);
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
  // age survivors, day survived counts
  for (const s of g.survivors){
    s.daysSurvived++;
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
      if (g.resources.medicine >= 1){
        g.resources.medicine -= 1; s.diseased = false; s.health = clamp(s.health+10,0,s.maxHealth);
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
      if (a.isChild||b.isChild) continue;
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
        if (attemptPlayerRescue(g, s)) return;
        // game over modal
        showModal({
          title:"You Have Perished",
          body:`<p>Your watch has ended on day ${g.day}.</p><p>Others may carry on, but without you the settlement falters.</p>`,
          buttons:[{label:"New Run", primary:true, action:()=>{ clearSaves(); closeModal(); startNewRun(); }}]
        });
        return;
      }
      // remove relationships
      g.relationships = g.relationships.filter(r=> r.a!==s.id && r.b!==s.id);
      g.survivors.splice(i,1);
      // morale drop
      for (const o of g.survivors) o.happiness = clamp(o.happiness - 8, 0, 100);
    }
  }
}

function attemptPlayerRescue(g, player){
  if (player.lastRescueDay === g.day) return false;
  const helpers = g.survivors.concat(g.followers || []).filter(s => s && !s.isPlayer && s.health > 0);
  if (!helpers.length) return false;
  const medic = helpers.find(s => s.traits?.includes("medic") || s.skills?.medicine >= 4);
  if (!medic && g.resources.medicine < 1) return false;
  if (g.resources.medicine >= 1) g.resources.medicine -= 1;
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

const RECOVERY_ACTIONS = new Set(["rest","sleep","eat","drink"]);

function playerAction(actionKey){
  const g = G;
  const p = g.survivors[0];
  if (p.health<=0) return;
  if (p.energy < 5 && !RECOVERY_ACTIONS.has(actionKey)){
    pushLog(g, "You are too exhausted. Rest or sleep first.","warn");
    render(); return;
  }
  switch(actionKey){
    case "chop_wood":{
      const amount = rint(3,6) + (p.traits.includes("hardworking")?1:0);
      addResource(g, "wood", amount);
      p.energy -= 10; p.hunger -= 4; p.thirst -= 4;
      pushLog(g, `You chopped wood. (+${amount} wood)`, "good");
      passPhase(g,1); break;
    }
    case "gather":{
      const food = rint(1,3), herbs = rint(0,2), seeds = rint(0,2);
      addResource(g,"food",food); addResource(g,"herbs",herbs); addResource(g,"seeds",seeds);
      p.energy -= 8; p.hunger -= 3; p.thirst -= 3;
      pushLog(g,`You foraged. (+${food} food, +${herbs} herbs, +${seeds} seeds)`,"good");
      passPhase(g,1); break;
    }
    case "fetch_water":{
      const amt = rint(3,6);
      addResource(g, "dirty_water", amt);
      p.energy -= 8; p.hunger -= 2; p.thirst -= 5;
      pushLog(g, `You fetched water. (+${amt} dirty water)`, "good");
      passPhase(g,1); break;
    }
    case "boil_water":{
      const cost = {dirty_water:2, wood:1};
      if (!canPay(g,cost)){ pushLog(g,"Need 2 dirty water and 1 wood.","warn"); render(); return; }
      pay(g,cost); addResource(g,"water",2);
      p.energy -= 4;
      pushLog(g,"You boiled water. (+2 clean water)","good");
      passPhase(g,1); break;
    }
    case "cook":{
      const cost = (g.resources.meat>=1?{meat:1, wood:1}:{crops:2, wood:1});
      if (!canPay(g,cost)){ pushLog(g,"Need either 1 meat or 2 crops, and 1 wood.","warn"); render(); return; }
      pay(g,cost); addResource(g,"food",3);
      p.energy -= 5;
      pushLog(g,"You cooked a meal. (+3 food)","good");
      passPhase(g,1); break;
    }
    case "eat":{
      if (g.resources.food<1){ pushLog(g,"No food to eat.","warn"); render(); return; }
      g.resources.food -= 1; p.hunger = clamp(p.hunger+30,0,100);
      pushLog(g,"You ate a small meal.","good"); render(); save(); return;
    }
    case "drink":{
      if (g.resources.water>=1){ g.resources.water -= 1; p.thirst = clamp(p.thirst+30,0,100); pushLog(g,"You drank clean water.","good"); }
      else if (g.resources.dirty_water>=1){ g.resources.dirty_water -= 1; p.thirst = clamp(p.thirst+20,0,100); if (chance(0.15)){ p.diseased = true; pushLog(g,"You drank dirty water and fell ill.","bad"); } else pushLog(g,"You drank dirty water uneasily.","warn");}
      else { pushLog(g,"No water available.","warn"); }
      render(); save(); return;
    }
    case "rest":{
      // short rest restores energy
      const gain = rint(15,25);
      p.energy = clamp(p.energy + gain, 0, 100);
      pushLog(g, `You rested briefly. (+${gain} energy)`, "info");
      passPhase(g,1); break;
    }
    case "sleep":{
      // sleep until next morning
      const phases = (TICKS_PER_DAY - g.phase) + 0; // remaining phases of today end the day at next morning
      passPhase(g, phases);
      p.energy = clamp(p.energy + 60, 0, 100);
      p.hunger = clamp(p.hunger - 6, 0, 100);
      p.thirst = clamp(p.thirst - 6, 0, 100);
      pushLog(g, "You slept until morning.", "info");
      break;
    }
    case "train":{
      // train combat
      if (!g.buildings.training_yard){ pushLog(g,"No training yard available.","warn"); render(); return; }
      p.skills.combat += 1;
      p.energy -= 12; p.hunger -= 4;
      pushLog(g,"You trained at the yard. (+combat)","good");
      passPhase(g,1); break;
    }
    case "study":{
      if (g.resources.books < 1){ pushLog(g,"Need a book to study.","warn"); render(); return; }
      g.resources.books -= 1;
      const kp = rint(2,5);
      g.knowledge += kp;
      p.energy -= 6;
      pushLog(g,`You studied a book. (+${kp} knowledge)`,"good");
      passPhase(g,1); break;
    }
  }
  render(); save();
}

function explore(locKey){
  const g = G;
  const p = g.survivors[0];
  if (p.health<=0) return;
  const loc = LOCATIONS[locKey]; if (!loc) return;
  if (p.energy < loc.energy){ pushLog(g,`Too exhausted to explore ${loc.name}.`,"warn"); render(); return; }
  pushLog(g, `You set out to ${loc.name}.`,"info");

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
      const got = addResource(g, r, amt);
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

  p.energy -= loc.energy;
  p.hunger -= 6; p.thirst -= 6;
  passPhase(g, loc.time);

  const gainedStr = Object.entries(gained).map(([k,v])=>`+${fmt(v)} ${RESOURCES[k].name}`).join(", ");
  if (gainedStr) pushLog(g, `You returned from ${loc.name}: ${gainedStr}.`, "good");
  else pushLog(g, `You returned from ${loc.name} empty-handed.`, "warn");

  render(); save();
}

// --- Combat ---

let _combat = null;

function startCombat(enemyKey, onWinAfter, onFleeAfter){
  const e = ENEMIES[enemyKey];
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
  if (G.resources.weapons >= 1){ weaponBonus = 6; }
  const skill = p.skills.combat || 0;
  const dmg = rint(3,7) + weaponBonus + skill + (p.traits.includes("brave")?2:0);
  c.hp -= dmg;
  c.log.push(`You strike ${c.name} for ${dmg}.`);
  if (G.resources.ammo>=1 && G.resources.weapons>=1 && chance(0.3)){
    G.resources.ammo -= 1;
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
    passPhase(G,1);
    if (fa) fa();
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
  // armor: 1 leather reduces dmg by 1, capped
  let mitig = 0;
  if (G.resources.leather >= 1) mitig += 2;
  if (G.resources.tools >= 1) mitig += 1;
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
    if (amt>0){ const got = addResource(G, r, amt); if (got>0) loot[r]=got; }
  }
  const lootStr = Object.entries(loot).map(([k,v])=>`+${fmt(v)} ${RESOURCES[k].name}`).join(", ");
  pushLog(G, `You defeated ${c.name}.${lootStr?" Loot: "+lootStr:""}`, "good");
  G.survivors[0].skills.combat = Math.min(20, G.survivors[0].skills.combat + 0.5);
  G.reputation += 0.5;
  const after = c.onWinAfter;
  _combat = null; closeModal();
  if (after) after();
  else { passPhase(G,1); render(); save(); }
}

function combatLose(){
  const c = _combat; if (!c) return;
  pushLog(G, `You were beaten by ${c.name}. You lose resources crawling back.`, "bad");
  // lose resources
  const losses = ["wood","food","water","cloth","metal","weapons"];
  for (const r of losses){ if (G.resources[r] > 0){ const l = Math.ceil(G.resources[r]*0.2); G.resources[r] -= l; } }
  _combat = null; closeModal();
  if (G.survivors[0].health<=0){ removeDead(G); save(); render(); return; }
  passPhase(G,1);
  render(); save();
}

// --- Building ---

function build(buildingId, townX=null, townY=null){
  const g = G;
  const b = BUILDINGS[buildingId]; if (!b) return;
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
  // building takes one phase of time
  passPhase(g,1);
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
  if (s.isChild) return;
  if (s.isPlayer && jobKey!=="none"){ pushLog(g,"You manage things yourself — assign others.","warn"); render(); return; }
  // unassign from previous building slot
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

function traderArrives(g){
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
  const offer = pick(offers);
  showModal({
    title:"A Trader Arrives",
    body:`<p>A wanderer offers to trade:</p>
      <p><b>Give:</b> ${Object.entries(offer.give).map(([k,v])=>v+" "+RESOURCES[k].name).join(", ")}<br/>
      <b>Get:</b> ${Object.entries(offer.get).map(([k,v])=>v+" "+RESOURCES[k].name).join(", ")}</p>`,
    buttons:[
      {label:"Accept", primary:true, action:()=>{
        if (!canPay(G, offer.give)){ pushLog(G,"You couldn't fulfill the trade.","warn"); }
        else { pay(G, offer.give); for (const k in offer.get) addResource(G,k,offer.get[k]); pushLog(G,"Trade complete.","good"); G.reputation += 0.5; }
        closeModal(); render(); save();
      }},
      {label:"Decline", action:()=>{ closeModal(); }}
    ]
  });
}

function tryRelationship(g){
  // pair eligible unpartnered adults
  const eligible = adults(g).filter(s=> !s.partnerId && s.health>0 && !s.isChild);
  if (eligible.length < 2) return;
  const a = pick(eligible);
  const others = eligible.filter(s=> s.id!==a.id);
  if (others.length===0) return;
  const b = pick(others);
  // require a roof
  if (getHousing(g) < g.survivors.length) return;
  a.partnerId = b.id; b.partnerId = a.id;
  g.relationships.push({a:a.id, b:b.id, type:"partner"});
  pushLog(g, `${a.name} and ${b.name} have become partners.`, "good");
  a.happiness = clamp(a.happiness+10,0,100); b.happiness = clamp(b.happiness+10,0,100);
}

function birthChild(g, a, b){
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
      g.buildings[bid].count = Math.max(0, g.buildings[bid].count - 1);
      pushLog(g, `Fire damaged your ${BUILDINGS[bid].name}.`, "bad");
    }
  }
  // food spoilage if too much
  if (g.resources.food > foodStorageCap(g)*0.9){
    const spoil = Math.ceil(g.resources.food * 0.05);
    g.resources.food = Math.max(0, g.resources.food - spoil);
    pushLog(g, `${spoil} food spoiled.`, "warn");
  }
  // trader random
  if (chance(0.04 + g.reputation*0.002)) traderArrives(g);
  // resource discovery
  if (chance(0.03)){
    const r = pick(["wood","stone","herbs","seeds","metal"]);
    const amt = rint(3,8);
    addResource(g, r, amt);
    pushLog(g, `You discovered ${amt} ${RESOURCES[r].name} nearby.`, "good");
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
      addResource(g,"dirty_water", amt);
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
    const t = pick(g.survivors);
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
      g.buildings[bid].count = Math.max(0, g.buildings[bid].count - 1);
      pushLog(g, `${BUILDINGS[bid].name} was damaged in the raid.`,"bad");
    }
  }
  pushLog(g, `Raid! ${count} ${e.name}${count>1?"s":""} attacked. ${casualties? casualties+" lost.":""} ${lostRes? lostRes+" supplies stolen.":""}`, "bad");
  for (const s of g.survivors) s.happiness = clamp(s.happiness-5,0,100);
  removeDead(g);
}
