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

// ------------------------- CONTEXT MENU ------------------------------
// Reusable cursor-anchored right-click menu: information + actions.
// Module-level state only (never serialized into G).

let _ctxMenu = null;

function closeContextMenu(){
  if (!_ctxMenu) return;
  document.removeEventListener("pointerdown", _ctxMenu.onDown, true);
  document.removeEventListener("keydown", _ctxMenu.onKey, true);
  window.removeEventListener("scroll", _ctxMenu.onScroll, true);
  window.removeEventListener("resize", _ctxMenu.onScroll, true);
  _ctxMenu.el.remove();
  _ctxMenu = null;
}

// opts: {title, info (HTML string), actions:[{label, sub?, disabled?, title?, action}]}
function showContextMenu(ev, opts){
  closeContextMenu();
  if (!opts) return;
  const menu = el("div","ctx-menu");
  let html = "";
  if (opts.title) html += `<h4>${opts.title}</h4>`;
  if (opts.info) html += `<div class="ctx-info">${opts.info}</div>`;
  menu.innerHTML = html;
  const acts = (opts.actions || []).filter(Boolean);
  if (acts.length){
    const list = el("div","ctx-actions");
    for (const a of acts){
      const btn = el("button","", a.sub ? `${a.label}<span class="sub">${a.sub}</span>` : a.label);
      if (a.disabled) btn.disabled = true;
      if (a.title) btn.title = a.title;
      btn.onclick = ()=>{ closeContextMenu(); if (a.action) a.action(); };
      list.appendChild(btn);
    }
    menu.appendChild(list);
  }
  document.body.appendChild(menu);
  // position (fixed; clamp to viewport)
  const pad = 6, mw = menu.offsetWidth, mh = menu.offsetHeight;
  let x = ev.clientX, y = ev.clientY;
  if (x + mw + pad > window.innerWidth) x = window.innerWidth - mw - pad;
  if (y + mh + pad > window.innerHeight) y = window.innerHeight - mh - pad;
  menu.style.left = Math.max(pad, x) + "px";
  menu.style.top = Math.max(pad, y) + "px";
  // dismissal
  const onDown = e => { if (!menu.contains(e.target)) closeContextMenu(); };
  const onKey = e => { if (e.key === "Escape") closeContextMenu(); };
  const onScroll = () => closeContextMenu();
  _ctxMenu = { el: menu, onDown, onKey, onScroll };
  // defer so the opening right-click's own pointer event doesn't close it immediately
  setTimeout(()=>{ if (_ctxMenu) document.addEventListener("pointerdown", onDown, true); }, 0);
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onScroll, true);
}

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
    <div class="muted" style="font-size:11px;margin-top:4px">Danger Lv ${c.danger}. Your combat skill: ${p.skills.combat}. ${equippedItem(G,"weapon")?ITEMS[equippedItem(G,"weapon").type].name:"Unarmed"} · ${fmt(G.inventory.resources.ammo||0)} carried ammo</div>
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
