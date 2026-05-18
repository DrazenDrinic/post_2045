"use strict";

// ------------------------- SAGE (OFFLINE ADVISOR NPC) ------------------------------
// The Old Sage is a local, rule-based advisor. No runtime network calls.
// Per-session conversation memory. Not saved to localStorage on purpose.
let _sageHistory = [];
let _sageBusy = false;
let _sageThinkTimer = null;

function openSageChat(g){
  const root = document.getElementById("modal-root");
  root.innerHTML = "";
  const bg = el("div","modal-bg");
  const m = el("div","modal sage-modal");
  m.innerHTML = `
    <h2>🧓 The Old Sage</h2>
    <div class="body">
      <div id="sage-history" class="sage-history"></div>
      <div id="sage-status" class="sage-status muted">Ask the sage anything about your journey.</div>
      <textarea id="sage-input" class="sage-input" rows="2" placeholder="Speak, traveler... (Enter to send, Shift+Enter for newline)"></textarea>
    </div>
  `;
  const acts = el("div","actions");
  const clearBtn = el("button","","Clear chat");
  clearBtn.onclick = ()=>{ _sageHistory = []; renderSageHistory(); };
  const sendBtn = el("button","primary","Ask");
  sendBtn.id = "sage-send";
  sendBtn.onclick = ()=>sendSageMessage();
  const deepBtn = el("button","primary","Think Deeper");
  deepBtn.id = "sage-deep";
  deepBtn.onclick = ()=>beginSageDeepThink();
  const leaveBtn = el("button","","Leave");
  leaveBtn.onclick = ()=>{ closeModal(); };
  acts.appendChild(clearBtn);
  acts.appendChild(sendBtn);
  acts.appendChild(deepBtn);
  acts.appendChild(leaveBtn);
  m.appendChild(acts);
  bg.appendChild(m);
  root.appendChild(bg);

  renderSageHistory();

  const input = document.getElementById("sage-input");
  input.focus();
  input.addEventListener("keydown", (e)=>{
    if (e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      sendSageMessage();
    }
  });
}

function renderSageHistory(){
  const box = document.getElementById("sage-history");
  if (!box) return;
  if (_sageHistory.length === 0){
    box.innerHTML = `<div class="sage-line sage-assistant"><i>The old sage warms his hands over the embers and looks up at you. "Sit. Ask what you will."</i></div>`;
    return;
  }
  box.innerHTML = _sageHistory.map(msg => {
    const cls = msg.role === "user" ? "sage-user" : "sage-assistant";
    const who = msg.role === "user" ? "You" : "Sage";
    return `<div class="sage-line ${cls}"><b>${who}:</b> ${escapeHtml(msg.content)}</div>`;
  }).join("");
  box.scrollTop = box.scrollHeight;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function setSageStatus(text, cls){
  const s = document.getElementById("sage-status");
  if (!s) return;
  s.textContent = text;
  s.className = "sage-status " + (cls || "muted");
}

function setSageBusyState(busy){
  _sageBusy = busy;
  for (const id of ["sage-send","sage-deep"]){
    const b = document.getElementById(id);
    if (b) b.disabled = busy;
  }
}

function sendSageMessage(){
  if (_sageBusy) return;
  const input = document.getElementById("sage-input");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  _sageHistory.push({role:"user", content:text});
  input.value = "";
  renderSageHistory();
  setSageBusyState(true);
  setSageStatus("The sage strokes his beard...", "info");

  setTimeout(()=>{
    const reply = offlineSageReply(G, text);
    _sageHistory.push({role:"assistant", content: reply});
    renderSageHistory();
    setSageStatus("", "muted");
    setSageBusyState(false);
    const i = document.getElementById("sage-input");
    if (i) i.focus();
  }, 250);
}

function beginSageDeepThink(){
  if (_sageBusy) return;
  const input = document.getElementById("sage-input");
  const prompt = input?.value.trim() || "What should I do next?";
  if (input) input.value = "";
  _sageHistory.push({role:"user", content:`Think deeper: ${prompt}`});
  _sageHistory.push({role:"assistant", content:"(The old sage closes his eyes. The fire gutters low. He is thinking deeper...)"});
  renderSageHistory();
  setSageBusyState(true);
  const modal = document.querySelector(".sage-modal");
  if (modal) modal.classList.add("deep-thinking");
  let step = 0;
  const states = [
    "THINKING DEEPER: reading the smoke...",
    "THINKING DEEPER: weighing hunger, water, warmth, danger...",
    "THINKING DEEPER: tracing the next three days...",
    "THINKING DEEPER: choosing the hard truth..."
  ];
  setSageStatus(states[0], "deep");
  if (_sageThinkTimer) clearInterval(_sageThinkTimer);
  _sageThinkTimer = setInterval(()=>{
    step++;
    setSageStatus(states[step % states.length], "deep");
  }, 700);
  setTimeout(()=>{
    if (_sageThinkTimer) clearInterval(_sageThinkTimer);
    _sageThinkTimer = null;
    const m = document.querySelector(".sage-modal");
    if (m) m.classList.remove("deep-thinking");
    _sageHistory = _sageHistory.filter((msg, idx) => idx !== _sageHistory.length - 1 || !msg.content.includes("thinking deeper"));
    _sageHistory.push({role:"assistant", content: offlineSageDeepReply(G, prompt)});
    renderSageHistory();
    setSageStatus("Deep counsel complete.", "good");
    setSageBusyState(false);
  }, 3600);
}

function offlineSageReply(g, text){
  const p = g.survivors[0];
  const q = text.toLowerCase();
  const urgent = detectHint(g);
  if (urgent && /what|next|help|stuck|do|advice|survive/.test(q)){
    return `The ash is speaking plainly: ${stripTags(urgent)} Do that first, then look farther down the road.`;
  }
  if (/water|thirst|drink/.test(q)){
    if (g.resources.water >= 1) return "Drink clean water now. A dry throat makes poor choices. After that, keep dirty water boiling while the fire still has wood.";
    if (g.resources.dirty_water >= 2 && g.resources.wood >= 1) return "You have what you need: boil the dirty water. Clean water beats courage every time.";
    return "Seek springs, wells, ponds, or streams on the map. Bring back dirty water if you must, but boil it before it becomes sickness.";
  }
  if (/food|hunger|starv|eat/.test(q)){
    if (g.resources.food >= 1) return "Eat before your hands shake. Then forage or cook meat and crops into proper food.";
    if (g.resources.meat >= 1 || g.resources.crops >= 2) return "There is a meal hiding in your stores. Cook it, then eat. Later, research Farming and put a worker in the soil.";
    return "Berries, mushrooms, roots, farms, and carcasses keep people alive. Search close to camp before pushing into teeth and ruins.";
  }
  if (/build|research|knowledge/.test(q)){
    const ready = KNOWLEDGE.filter(n => !g.knownNodes[n.id] && n.req.every(r=>g.knownNodes[r]) && g.knowledge >= n.cost);
    if (ready.length) return `Spend the knowledge while it is still warm. ${ready[0].name} is within reach and will open new tools for the settlement.`;
    return "Knowledge comes from days survived, books, schools, libraries, elders, and ruins. Gather it, then turn it into shelter, water, food, and walls.";
  }
  if (/job|worker|idle|assign/.test(q)){
    const idle = g.survivors.filter(s=>!s.isPlayer && !s.isChild && s.health>0 && (!g.jobs[s.id] || g.jobs[s.id]==="none"));
    if (idle.length) return `${idle.length} pair${idle.length>1?"s":""} of hands are idle. Assign woodcutters, gatherers, water carriers, or building workers. Idle hands do not fill bowls.`;
    return "Your workers are moving. Watch the stores: if food, water, or wood falls, change jobs before hunger teaches the lesson.";
  }
  if (/danger|raid|defen|wall|guard/.test(q)){
    const d = settlementDanger(g);
    if (d > 20) return `Danger is ${d}. Build walls, guard posts, and watchtowers. A proud town without teeth is just a feast with lanterns.`;
    return `Danger is ${d}. Keep it that way with walls, guards, and fewer foolish stockpiles than raiders can smell.`;
  }
  if (p.health < 35 || p.thirst < 30 || p.hunger < 30 || p.energy < 25) return stripTags(urgent || "Patch the body first: health, thirst, hunger, energy. Grand plans can wait one more breath.");
  return "Keep the fire fed, the water clean, the workers assigned, and the walls rising. When those are steady, scout ruins for books, tools, and people worth saving.";
}

function offlineSageDeepReply(g, prompt){
  const p = g.survivors[0];
  const delta = estimateDailyDelta(g);
  const ready = KNOWLEDGE.filter(n => !g.knownNodes[n.id] && n.req.every(r=>g.knownNodes[r]) && g.knowledge >= n.cost);
  const idle = g.survivors.filter(s=>!s.isPlayer && !s.isChild && s.health>0 && (!g.jobs[s.id] || g.jobs[s.id]==="none"));
  const housing = getHousing(g);
  const d = settlementDanger(g);
  const warnings = [];
  if (p.health < 40) warnings.push("your body is close to failing");
  if (p.thirst < 35 || (delta.water||0) < -0.5) warnings.push("water is the weak link");
  if (p.hunger < 35 || (delta.food||0) < -0.5) warnings.push("food will turn against you soon");
  if (p.warmth < 35) warnings.push("cold is slowing your steps");
  if (housing <= g.survivors.length) warnings.push("the camp has no spare beds");
  if (idle.length) warnings.push(`${idle.length} worker${idle.length>1?"s are":" is"} idle`);
  if (d > 20) warnings.push(`danger is high at ${d}`);
  const first = warnings.length ? `I looked deeper. The first truth: ${warnings.slice(0,3).join(", ")}.` : "I looked deeper. The camp is not safe, but it is steady enough to choose growth instead of panic.";

  const actions = [];
  if (p.thirst < 40 || (delta.water||0) < -0.5) actions.push("Secure water: find a spring or well, boil dirty water, or assign a water carrier / well worker.");
  if (p.hunger < 40 || (delta.food||0) < -0.5) actions.push("Stabilize food: forage now, cook meat or crops, then research Farming for gardens and fields.");
  if (p.warmth < 35) actions.push("Warm up before traveling. Low warmth now makes movement cost more energy and can start killing you before it reaches zero.");
  if (idle.length) actions.push("Assign every idle adult. Wood, water, and food jobs matter more than pride.");
  if (housing <= g.survivors.length) actions.push("Build housing next, or the people you save will have nowhere to become settlers.");
  if (ready.length) actions.push(`Spend knowledge on ${ready[0].name}; unused knowledge does not keep rain off your face.`);
  if (d > 20) actions.push("Raise defenses: guard posts, palisades, watchtowers, and weapons before the next raid tests you.");
  if (!actions.length) actions.push("Scout underground entrances and ruins for iron, parts, books, and medicine, but turn back before hunger, thirst, or cold slow your walk home.");

  const next = actions.slice(0,3).map((a,i)=>`${i+1}. ${a}`).join("\n");
  return `${first}\n\nDo this in order:\n${next}\n\nIf death takes you, only a living companion with skill or medicine may pull you back. Alone, the ash keeps what it is given.`;
}

function stripTags(s){ return String(s).replace(/<[^>]*>/g, ""); }
