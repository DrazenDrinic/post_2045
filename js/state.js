"use strict";

// ------------------------- STATE ------------------------------

let G = null; // game state

function newGame(){
  const g = {
    day:1, phase:0,
    log:[],
    knowledge:0, reputation:0, danger:0,
    autoNotice:true,
    knownNodes:{}, // unlocked knowledge nodes
    resources: Object.fromEntries(RES_KEYS.map(k=>[k,0])),
    buildings: {campfire:{count:1, dmg:0}}, // built buildings
    survivors: [], // includes the player at index 0
    jobs: {}, // survivorId -> jobKey
    workerAssign: {}, // buildingId -> [survivorIds]
    nextSurvId: 1,
    relationships: [], // {a,b,type:'partner'|'child'|'parent'}
    eventCooldowns: {},
    seed: Math.floor(Math.random()*1e9),
    // map state
    map: null,
    playerX: 0, playerY: 0,
    villageX: 0, villageY: 0,
    explored: {}, // "x,y" -> true
    followers: [],
    stepAccum: 0,
    town: null,
  };
  // Player
  const player = makeSurvivor("Survivor", true);
  player.firstName = "You";
  player.lastName = "";
  player.name = "You";
  g.survivors.push(player);
  applyStartingResources(g);
  g.knownNodes = {}; // start with nothing unlocked
  // Generate world
  generateMap(g);
  initTown(g);
  // Initial log
  pushLog(g, "Day 1. You wake by a campfire among the ashes. The wind smells of rust.","info");
  pushLog(g, "Walk out into the world — find food, water and other survivors.","info");
  pushLog(g, "Use WASD / arrow keys to move, or click a tile. Step into things to interact.","info");
  return g;
}

function applyStartingResources(g){
  for (const k of RES_KEYS) g.resources[k] = 0;
  for (const k in STARTING_RESOURCES) g.resources[k] = STARTING_RESOURCES[k];
}

function startNewRun(){
  G = newGame();
  G.survivors[0].id = G.nextSurvId++;
  G.jobs[G.survivors[0].id] = "none";
  if (typeof _buildToPlace !== "undefined") _buildToPlace = null;
  if (typeof _combat !== "undefined") _combat = null;
  if (typeof _activeTab !== "undefined") _activeTab = "town";
  cancelAutoWalk();
  save();
  render();
  askPlayerName();
}

function setPlayerName(name){
  const clean = String(name || "").replace(/[<>]/g, "").trim().slice(0, 32) || "You";
  G.playerName = clean;
  const p = G.survivors[0];
  if (p){
    p.firstName = clean;
    p.lastName = "";
    p.name = clean;
  }
}

function askPlayerName(){
  showModal({
    title:"Name Your Survivor",
    body:`<p>The settlement needs someone to follow through the ash.</p>
      <input id="player-name-input" class="name-input" maxlength="32" placeholder="Enter your name" value="${G.playerName || ""}" />`,
    buttons:[{label:"Start", primary:true, action:()=>{
      const input = document.getElementById("player-name-input");
      setPlayerName(input ? input.value : "");
      pushLog(G, `${G.playerName} takes command of the camp.`, "info");
      closeModal();
      render();
      save();
    }}]
  });
  setTimeout(()=>document.getElementById("player-name-input")?.focus(), 0);
}

function makeSurvivor(roleTitle="Survivor", isPlayer=false){
  const first = pick(FIRST_NAMES);
  const last  = pick(LAST_NAMES);
  const traits = randomTraits();
  const s = {
    id: undefined, // filled at insert
    firstName:first, lastName:last,
    name: `${first} ${last}`,
    age: isPlayer ? 28 : (12 + Math.floor(rng()*40)),
    isChild: false,
    isPlayer: !!isPlayer,
    health:100, hunger:80, thirst:80, energy:100, happiness:60, morale:60, warmth:60,
    safety:50, // mostly tracked for player UI
    maxHealth: traits.includes("tough") ? 120 : 100,
    knowledge:0,
    traits,
    job:"none",
    skills: randomSkills(),
    sex: rng()<0.5 ? "M" : "F",
    partnerId: null,
    parentIds: [],
    age_ticks:0,
    daysSurvived:0,
    diseased:false,
    injured:false,
  };
  return s;
}

function randomTraits(){
  const pool = Object.keys(TRAITS);
  const n = 1 + Math.floor(rng()*2);
  const set = new Set();
  while(set.size < n){ set.add(pick(pool)); }
  // remove logical contradictions
  if (set.has("brave") && set.has("cowardly")) set.delete("cowardly");
  if (set.has("hardworking") && set.has("lazy")) set.delete("lazy");
  return Array.from(set);
}

function randomSkills(){
  return {
    combat:    Math.floor(rng()*4),
    building:  Math.floor(rng()*4),
    farming:   Math.floor(rng()*4),
    medicine:  Math.floor(rng()*4),
    crafting:  Math.floor(rng()*4),
    hunting:   Math.floor(rng()*4),
  };
}
