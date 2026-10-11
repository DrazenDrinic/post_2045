"use strict";

// ------------------------- HELP ------------------------------

function help(){
  showModal({
    title:"POST 2045 — How to Play",
    body:`
    <p><b>World Map</b>: use <b>WASD / arrow keys</b> or <b>click a tile</b> to walk. Walking costs energy; biomes have different terrain costs. Cold, hunger, thirst, injury, and disease slow you down by increasing movement cost. Vision shrinks at night. Use <b>Live</b> and the speed button to let time pass in real time.</p>
    <p><b>Search nearby</b> or right-click a nearby feature to harvest it. Walk into enemies to fight and friendly survivors to talk. Bring followers back next to the campfire to recruit them.</p>
    <p><b>Pack &amp; Base</b>: all personal pickups enter your 🎒 <b>Pack</b> (30 load, or 45/65 with an equipped backpack). Return beside the home campfire or a storage building, then use the 🏕 <b>Base</b> tab to move items between pack and storage side by side. Base storage is 80 shared load; sheds add 100 and warehouses 400. Food cellars add 200 food-only load. Packing presets fill consumables; take tools and shelters separately.</p>
    <p><b>Finite supplies</b>: sources run low and become depleted. Inspect them for remaining stock and a recovery countdown. Water sources replenish 20 units on a 5-hour cycle after first collection; plants and wildlife take 24 hours, timber 48, minerals and salvage 72. Workers draw from the same local reserves. Full packs and empty sources block gathering without spending time or energy.</p>
    <p><b>Water containers</b>: your starting container holds 3 clean/dirty water combined. Each carried canteen adds 3 capacity; a bucket adds 5. Water also uses carrying weight. Unload water before storing its container.</p>
    <p><b>Crafting</b>: basic recipes work by hand. Build a Crafting Table for better equipment, and a Furnace for ore and glass. Tools improve gathering and wear down; use repair kits to maintain them.</p>
    <p><b>Outdoor sleep can kill.</b> Deploy your sleeping bag and portable tent, fuel a fire, and inspect the Sleep preview. Cold, rain, radiation and attacks can interrupt or end your night. One wood fuels a field fire for four hours; fuel expires even while you are elsewhere.</p>
    <p><b>Farming</b>: plant, water, fertilize and harvest. Farmers automate a plot each. <b>Jobs</b> includes production orders: maintain a supply target or craft a fixed number of batches. Claim mines/fishing sites and supply outposts while exploring to support workers.</p>
    <p><b>Survive day by day.</b> Manage hunger, thirst, warmth, energy and health. Very low hunger, thirst, or warmth now damages health even before hitting zero. If you die alone it is game over; a living companion with medicine or medical skill may rescue you once that day.</p>
    <p><b>Town Command</b> — the Town tab is your strategy view. Choose <b>Place in Town</b> from the Build tab, then click an empty plot. Homes, farms, storage, workshops, defenses, and walls appear directly on the grid.</p>
    <p><b>Early game</b> — find a water source on the map, get food, place a tent/shelter, a storage shed, and a rain barrel. Then go hunting for survivors.</p>
    <p><b>Hostiles</b> attack on contact: fight or flee. Equipped weapons, carried ammo and worn armor help. Materials stored at home do not protect you. Some traps are hidden until you step on them.</p>
    <p><b>Hazards</b> — radioactive zones, swamps, acid pools, plague nests can damage or sicken you. Hot springs heal. Mines, caves, storm drains, and subway stairs can be entered for underground expeditions.</p>
    <p><b>Survivors</b> can be assigned jobs. Buildings with worker slots produce more goods per day. Research <b>knowledge</b> to unlock farming, medicine, walls, towers and more.</p>
    <p><b>Bigger town = bigger danger.</b> Walls, guard posts and watchtowers reduce raids.</p>
    <p><b>Family system</b>: adults may form bonds and have children if housing allows. Children grow and become workers; schools speed this up.</p>
    <p>The game autosaves after every action.</p>
    `,
    buttons:[{label:"Got it", primary:true, action:closeModal}]
  });
}
