"use strict";

// ------------------------- HELP ------------------------------

function help(){
  showModal({
    title:"POST 2045 — How to Play",
    body:`
    <p><b>World Map</b>: use <b>WASD / arrow keys</b> or <b>click a tile</b> to walk. Walking costs energy; biomes have different terrain costs. Cold, hunger, thirst, injury, and disease slow you down by increasing movement cost. Vision shrinks at night. Use <b>Live</b> and the speed button to let time pass in real time.</p>
    <p><b>Interact by walking into things.</b> Step onto a feature to loot it, step into a hostile creature to fight, step into a friendly NPC to talk. Bring friendly survivors back next to your 🔥 campfire to recruit them — they show up in the "Following" strip while they're with you.</p>
    <p><b>Survive day by day.</b> Manage hunger, thirst, warmth, energy and health. Very low hunger, thirst, or warmth now damages health even before hitting zero. If you die alone it is game over; a living companion with medicine or medical skill may rescue you once that day.</p>
    <p><b>Town Command</b> — the Town tab is your strategy view. Choose <b>Place in Town</b> from the Build tab, then click an empty plot. Homes, farms, storage, workshops, defenses, and walls appear directly on the grid.</p>
    <p><b>Early game</b> — find a water source on the map, get food, place a tent/shelter, a storage shed, and a rain barrel. Then go hunting for survivors.</p>
    <p><b>Hostiles</b> on the map (raiders, bears, infected, mutants…) attack on contact — fight or flee. Weapons + ammo help, leather/tools mitigate damage. Some traps are hidden until you step on them.</p>
    <p><b>Hazards</b> — radioactive zones, swamps, acid pools, plague nests can damage or sicken you. Hot springs heal. Mines, caves, storm drains, and subway stairs can be entered for underground expeditions.</p>
    <p><b>Survivors</b> can be assigned jobs. Buildings with worker slots produce more goods per day. Research <b>knowledge</b> to unlock farming, medicine, walls, towers and more.</p>
    <p><b>Bigger town = bigger danger.</b> Walls, guard posts and watchtowers reduce raids.</p>
    <p><b>Family system</b>: adults may form bonds and have children if housing allows. Children grow and become workers; schools speed this up.</p>
    <p>The game autosaves after every action.</p>
    `,
    buttons:[{label:"Got it", primary:true, action:closeModal}]
  });
}
