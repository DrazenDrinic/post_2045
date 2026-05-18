# Post 2045

A single-file, browser-based post-apocalyptic survival + town-builder + tile-map exploration game.

## Files

- `index.html` — the entire game (HTML + CSS + JS embedded in one file)
- `CLAUDE.md` / `AGENTS.md` — agent-facing project notes

There is no build step, no package manager, no server, no external assets, and no dependencies. Just open `index.html` in a modern browser.

## How to run

- Open `index.html` directly in Chrome / Firefox / Edge.
- The save lives in `localStorage` under the key `post_2045_save_v1`.
- The header has Save / Load / Reset / Help buttons. The game also autosaves after every action.

## How to syntax-check (no tests)

```
node -e "const fs=require('fs'); const m=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*)<\/script>/); fs.writeFileSync('_check.js', m[1]);"
node --check _check.js
rm _check.js
```

Manual playtest: open in a browser, walk the map with WASD / arrows, click tiles to auto-walk, click tabs.

## Script layout (single `<script>` block in `index.html`)

The script is organized top-to-bottom into the following sections — keep new code in the matching section:

1. **DATA tables** — pure config objects, easy to extend:
   - `RESOURCES`, `NEED_DEFS`
   - `LOCATIONS` (legacy "Quick Scout" tab), `ENEMIES`
   - `KNOWLEDGE` (research tree), `BUILDINGS`, `JOBS`, `TRAITS`
   - `BIOMES`, `MAP_FEATURES`, `MAP_ENTITIES` (world map)
   - `FIRST_NAMES`, `LAST_NAMES`
2. **Settings constants** — `TICKS_PER_DAY`, `PHASES`, `MAP_W`/`MAP_H`, `VIEW_W`/`VIEW_H`, `VISION_DAY`/`VISION_NIGHT`, `STEP_PER_PHASE`, `SAVE_KEY`.
3. **State** — `G` is the single game-state object. `newGame()` builds a fresh one. `makeSurvivor()` makes a survivor.
4. **Helpers** — `rng`, `pick`, `rint`, `chance`, `clamp`, `addResource`, `pushLog`, `costString`, `getHousing`, `settlementDanger`, `settlementSafety`, etc.
5. **Tick / day system** — `passPhase` → `advanceOnePhase` → `applyTick` → `onDayEnd`. `decaySurvivor`, `produceFromBuildings`, `autoConsume`, `rollThreats`, `raidEvent`.
6. **World map** — `generateMap`, `paintBlob`, `populateFeatures`, `populateEntities`, `computeVisible`, `tryMove`, `startAutoWalk` / `stepAutoWalk`, `encounterTile`, `handleFeature`, `triggerEvent`, `openFriendlyDialog`, `recruitFollowersAtVillage`, `refreshMapDaily`.
7. **Combat** — `startCombat`, `combatAttack`, `combatFlee`, `combatWin`, `combatLose`. Modal is rendered by `showCombatModal`. `startCombat` accepts `onWinAfter` and `onFleeAfter` callbacks (the map system uses these to remove defeated entities, etc.).
8. **Player actions** — `playerAction(actionKey)`, `build`, `research`, `assignJob`, `spawnStranger`, `traderArrives`, `tryRelationship`, `birthChild`.
9. **Render** — `render()` calls `renderHeader`, `renderLeft`, `renderRight`, `renderTabs`, `renderContent`. `renderContent` dispatches to one tab renderer (`renderMapTab`, `renderBuildTab`, `renderSurvivorsTab`, `renderJobsTab`, `renderKnowledgeTab`, `renderBuildingsTab`, `renderExploreTab`).
10. **Modal helpers** — `showModal({title, body, buttons})`, `closeModal()`.
11. **Save / load / init** — `save`, `load`, `reset`, `help`, `init` (wires up button clicks and the keyboard listener for map movement).

## `G` (game state) shape

```
{
  day, phase, log,
  knowledge, reputation, danger,
  resources: { wood, stone, ... },              // see RESOURCES keys
  buildings: { [id]: {count, dmg} },
  survivors: [ {id, name, isPlayer, isChild, age, health, hunger, thirst, energy,
                happiness, morale, warmth, safety, maxHealth, traits, skills,
                job, partnerId, parentIds, diseased, injured, ...} ],
  jobs: { [survivorId]: jobKey },
  workerAssign: { [buildingId]: [survivorId, ...] },
  knownNodes: { [knowledgeNodeId]: true },
  relationships: [ {a, b, type:'partner'|'parent'} ],
  // map
  map: 2D array [y][x] of { biome, feature: {type,charges}|null, entity: {type}|null },
  playerX, playerY, villageX, villageY,
  explored: { "x,y": true },
  followers: [survivor objects, not yet in survivors[]],
  stepAccum
}
```

## Conventions

- Vanilla JS, no transpiling, no framework. ES2017+ is fine.
- DOM is rebuilt each `render()` with the `el(tag, cls, html)` helper plus `innerHTML`. There is no diffing; just re-render the whole panel.
- After mutating `G` in response to user input, call `render(); save();` (the existing actions already do this).
- Use `pushLog(g, message, type)` where `type` is `good` | `bad` | `warn` | `info`. The right-panel event log color-codes by type.
- CSS variables live in `:root` (`--bg`, `--accent`, `--good`, `--bad`, `--warn`, etc.) — prefer them over hard-coded colors.
- Keep DATA tables flat and declarative. New buildings / jobs / features / entities should not require touching the render code if they fit the existing schema.

## Common change recipes

**Add a resource** — add a key to `RESOURCES` with `{name, icon}`. It is automatically counted, capped by storage, and shown in the right-panel resource list.

**Add a building** — add to `BUILDINGS`: `{name, icon, cat, desc, cost, workers, max, effects}`. Supported `effects`: `housing`, `storage`, `food_storage`, `warmth`, `produce`, `produce_per_worker`, `consume`, `convert:{from,to,perWorker}`, `knowledge`, `knowledge_per_worker`, `heal_per_worker`, `happiness_all`, `morale_all`, `reputation`, `attract_chance`, `trade_chance`, `warning`, `cook`, `safety_per_worker`, `wall`, `danger_reduce`. To gate behind research, add the building id to a `KNOWLEDGE` node's `unlock.buildings` array.

**Add a job** — add to `JOBS`: `{name, building, output, desc}`. If `building` is set, workers occupy slots in that building (slots = `BUILDINGS[building].workers * count`).

**Add a map feature** — add to `MAP_FEATURES`: `{icon, name, desc, biomes:[...], charges, loot?, damage?, energyLoss?, curse?, heal?, warmth?, event?, hidden?, rare?, enemyChance?, sting?, chargeRisk?, knowledge?}`. The `event` field, if present, routes to a case in `triggerEvent` — add a new case if you invent a new event type.

**Add a map entity** — add to `MAP_ENTITIES`:
- Hostile: `{icon, name, hostile:true, enemy:<ENEMIES key>, biomes:[...], nightOnly?}`.
- Friendly: `{icon, name, friendly:"<type>", biomes:[...]}` — also add a matching `case "<type>":` in `openFriendlyDialog`.

**Add a biome** — add to `BIOMES`: `{name, icon, bg, fg, cost, blocks?, hazard?, radiation?, cold?, dark?, dry?, water?, safe?}`. Then reference the new biome id in any feature/entity's `biomes` list. Also add a blob entry to the `blobs` array in `generateMap` if you want it to spawn naturally.

**Add a knowledge node** — append to `KNOWLEDGE`: `{id, name, cat, cost, req:[ids], desc, unlock:{buildings?:[], jobs?:[]}}`. The tree renderer groups by `cat`; pick from existing categories or introduce a new one.

## Save format / compatibility

- The save is `JSON.stringify(G)` under `SAVE_KEY`.
- `load()` backfills missing fields so older saves still load (it regenerates the map if missing, etc.). If you change `G`'s shape in a non-backfillable way, bump `SAVE_KEY` (currently `post_2045_save_v1`) so old saves are ignored instead of crashing.

## UI notes

- Three-column layout: left (character + quick actions + settlement summary), center (tabs), right (resources + event log). Collapses on narrow screens.
- Map viewport is `VIEW_W x VIEW_H` tiles centered on the player; tiles outside the viewport aren't rendered. Vision radius shrinks at night.
- Auto-walk halts on damage taken or low energy (so players don't die mid-walk). Combat modals always stop auto-walk.

## Things to avoid

- Don't introduce build steps, package managers, or external assets — the design constraint is one self-contained HTML file.
- Don't add per-survivor or per-tile rendering inside hot tick paths; the per-tick code runs many times.
- Don't store ephemeral UI state (modal contents, autoWalk timers) inside `G` — keep them in module-level variables that aren't serialized.
- Don't sneakily change the meaning of an existing resource / building / job id without migrating saves; appending new ones is safe, renaming is not.
