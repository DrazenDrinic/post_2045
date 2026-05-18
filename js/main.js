"use strict";

// ------------------------- WIRE UP ------------------------------

function init(){
  if (!load()){
    startNewRun();
  } else {
    // Ensure player id exists
    if (G.survivors[0].id===undefined) G.survivors[0].id = G.nextSurvId++;
  }
  document.getElementById("btn-rest").onclick = ()=> playerAction("sleep");
  document.getElementById("btn-rt").onclick = toggleRealtime;
  document.getElementById("btn-speed").onclick = cycleRealtimeSpeed;
  document.getElementById("btn-save").onclick = ()=> { save(); pushLog(G,"Game saved.","info"); render(); };
  document.getElementById("btn-load").onclick = ()=> { if (load()) { pushLog(G,"Game loaded.","info"); render(); } };
  document.getElementById("btn-reset").onclick = reset;
  document.getElementById("btn-help").onclick = help;

  // Keyboard movement
  window.addEventListener("keydown", e=>{
    const tag = (e.target.tagName||"").toLowerCase();
    if (tag==="input"||tag==="select"||tag==="textarea") return;
    if (document.getElementById("modal-root").firstChild) return; // modal open
    if (_activeTab !== "map") return;
    let dx=0, dy=0;
    switch (e.key){
      case "ArrowUp": case "w": case "W": dy=-1; break;
      case "ArrowDown": case "s": case "S": dy=1; break;
      case "ArrowLeft": case "a": case "A": dx=-1; break;
      case "ArrowRight": case "d": case "D": dx=1; break;
      case " ": cancelAutoWalk(); render(); return;
      default: return;
    }
    e.preventDefault();
    cancelAutoWalk();
    if (tryMove(G, dx, dy)){
      render(); save();
    } else {
      render();
    }
  });

  render();
}

window.addEventListener("load", init);
