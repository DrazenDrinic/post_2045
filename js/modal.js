"use strict";

// ------------------------- MODAL ------------------------------

function showModal({title, body, buttons}){
  const root = document.getElementById("modal-root");
  root.innerHTML = "";
  const bg = el("div","modal-bg");
  const m = el("div","modal");
  m.innerHTML = `<h2>${title}</h2><div class="body">${body}</div>`;
  const acts = el("div","actions");
  for (const b of buttons||[{label:"OK",action:closeModal}]){
    const btn = el("button", b.primary?"primary":"", b.label);
    if (b.disabled) btn.disabled = true;
    if (b.title) btn.title = b.title;
    btn.onclick = b.action;
    acts.appendChild(btn);
  }
  m.appendChild(acts);
  bg.appendChild(m);
  root.appendChild(bg);
}

function closeModal(){ document.getElementById("modal-root").innerHTML = ""; }

function showCombatModal(){
  const c = _combat; if (!c) return;
  const p = G.survivors[0];
  const root = document.getElementById("modal-root");
  root.innerHTML = "";
  const bg = el("div","modal-bg");
  const m = el("div","modal");
  m.innerHTML = `<h2>⚔ Combat: ${c.name}</h2>
    ${bar("Enemy HP", c.hp, c.maxHp, "var(--bad)")}
    ${bar("Your HP", p.health, p.maxHealth, "var(--hp)")}
    <div class="muted" style="font-size:11px;margin-top:4px">Danger Lv ${c.danger}. Your combat skill: ${p.skills.combat}. ${G.resources.weapons>=1?"⚔ Armed":"🚫 Unarmed"} ${G.resources.ammo>=1?"📦 Ammo":""}</div>
    <div class="log" style="max-height:140px;overflow:auto;margin-top:6px;background:#0c1115;border:1px solid var(--line);padding:4px;border-radius:3px">
      ${c.log.slice(-8).map(l=>'<div class="e">'+l+'</div>').join("")}
    </div>`;
  const acts = el("div","actions");
  const ba = el("button","primary","Attack");
  ba.onclick = combatAttack;
  const bf = el("button","","Flee");
  bf.onclick = combatFlee;
  acts.appendChild(ba); acts.appendChild(bf);
  m.appendChild(acts);
  bg.appendChild(m);
  root.appendChild(bg);
}
