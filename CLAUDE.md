# Post 2045

A single-file, browser-based post-apocalyptic survival + town-builder + tile-map exploration game.

## Files

- `index.html` — the entire game (HTML + CSS + JS embedded in one file)
- `CLAUDE.md` / `AGENTS.md` — agent-facing project notes

There is no build step, no package manager, no server, no external assets, and no dependencies. Just open `index.html` in a modern browser.

## How to run

- Open `index.html` directly in Chrome / Firefox / Edge.
- The save lives in `localStorage` under `post_2045_save_v2`; old `v1` maps migrate in place.
- The header has Save / Load / Reset / Help buttons. The game also autosaves after every action.

## How to syntax-check (no tests)

The game is split across `js/*.js` (loaded in order by `index.html`). Check each file:

```
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
```

Manual playtest: open `index.html` in a browser, walk the map with WASD / arrows, click tiles to auto-walk, click tabs.

## Regenerating PRICING.md

`PRICING.md` is **generated, not hand-written** — it is built from the data tables so it cannot drift from the game. After changing any costs, buildings, recipes, jobs, research, items, enemies, crops, etc., regenerate it:

```
node tools/gen-pricing.js
```

The script reads `js/data.js` (plus a clearly-labelled MIRRORED-FROM-CODE block for values that live in the action code) and **fails loudly** if the game adds content it does not know how to render — e.g. a new building-effect key, an unknown resource, or any entity missing from the output. Do **not** edit `PRICING.md` by hand; edit `tools/gen-pricing.js` instead. The in-game **📖 Guide → Prices & Costs** tab (and its 🔎 search) read the same tables live, so they stay in sync automatically.

## Updating GameActionsPrice.md (required)

`GameActionsPrice.md` is the **hand-written, human-readable** companion to `PRICING.md`: it explains every action's cost in ⏳ time, ⚡ energy, 📦 resources and 🧠 knowledge (walking, crafting, building, farming, scouting, combat, jobs, research, etc.).

**If you change any game data, cost, action, item, enemy, building, job, recipe or mechanic, you must update `GameActionsPrice.md` too** — it is not generated, so nothing else keeps it honest. Steps:

1. Change the data/code.
2. Update the matching section in `GameActionsPrice.md` (its header has a "Where to look when updating" table mapping each section to its source of truth).
3. Bump the **Last updated** date at the top of `GameActionsPrice.md`.
4. Regenerate `PRICING.md` with `node tools/gen-pricing.js`.
5. Syntax-check touched JS and, ideally, playtest in the browser.

## Script layout (single `<script>` block in `index.html`)

The script is organized top-to-bottom into the following sections — keep new code in the matching section:

1. **DATA tables** — pure config objects, easy to extend:
   - `RESOURCES`, `NEED_DEFS`
   - `LOCATIONS` (legacy "Quick Scout" tab), `ENEMIES`
   - `KNOWLEDGE` (research tree), `BUILDINGS`, `JOBS`, `TRAITS`
   - `BIOMES`, `MAP_FEATURES`, `MAP_ENTITIES` (world map)
   - `FIRST_NAMES`, `LAST_NAMES`
2. **Settings constants** — `TICKS_PER_DAY`, `PHASES`, `CHUNK`, `VIEW_W`/`VIEW_H`, `VISION_DAY`/`VISION_NIGHT`, `STEP_PER_PHASE`, `SAVE_KEY`.
3. **State** — `G` is the single game-state object. `newGame()` builds a fresh one. `makeSurvivor()` makes a survivor.
4. **Helpers** — `rng`, `pick`, `rint`, `chance`, `clamp`, `addResource`, `pushLog`, `costString`, `getHousing`, `settlementDanger`, `settlementSafety`, etc.
5. **Tick / day system** — `passPhase` → `advanceOnePhase` → `applyTick` → `onDayEnd`. `decaySurvivor`, `produceFromBuildings`, `autoConsume`, `rollThreats`, `raidEvent`.
6. **World map** — `biomeAt`/`fbm` (noise terrain), `generateChunk`/`tileAt` (lazy 20×20 chunks), `generateMap`, `computeVisible`, `tryMove`, `startAutoWalk` / `stepAutoWalk`, `encounterTile`, `handleFeature`, `triggerEvent`, `openFriendlyDialog`, `recruitFollowersAtVillage`, `refreshMapDaily`.
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
  // world map (procedural, infinite; cached per 20x20 chunk)
  chunks: { "cx,cy": 2D array [ly][lx] of { biome, feature, entity, settlementBuilding } },
  chunkChanges: { "cx,cy": { [localTileIndex]: tileState } },
  worldVersion, chunkSize,
  playerX, playerY, villageX, villageY,   // village is always (0,0) on a fresh world
  seed,                                    // integer; deterministic terrain for this run
  explored: { "x,y": true },
  followers: [survivor objects, not yet in survivors[]],
  stepAccum
}
```

`g.chunks` is a bounded runtime cache — read tiles through `tileAt(g, x, y)` in `js/world-map.js`,
which generates a chunk, applies saved tile deltas and returns the live tile object. Baselines
are cached outside `G`; `captureChunkChanges` saves complete changed tiles before eviction.
`pruneChunks` flushes changes and evicts chunks outside the player/settlement neighbourhoods.
Only explored ground within `ACTIVE_MAP_RADIUS` of either location is simulated. Drawing
unseen fog must not generate terrain. Changing `CHUNK` or generation rules requires an
explicit world-version migration.

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

**Add a biome** — add to `BIOMES`: `{name, icon, bg, fg, cost, blocks?, hazard?, radiation?, cold?, dark?, dry?, water?, safe?}`. Then reference the new biome id in any feature/entity's `biomes` list, and return it from `biomeAt(g, x, y)` in `js/world-map.js` (thresholds on the elevation/moisture/temperature noise fields) so it spawns naturally. There is no fixed map array or `blobs` list.

**Add a knowledge node** — append to `KNOWLEDGE`: `{id, name, cat, cost, req:[ids], desc, unlock:{buildings?:[], jobs?:[]}}`. The tree renderer groups by `cat`; pick from existing categories or introduce a new one.

## Save format / compatibility

- Saves serialize a snapshot under `SAVE_KEY`, excluding the live `chunks` cache and replacing `explored` with compact hexadecimal `exploredChunks` masks. Terrain changes live in `chunkChanges`, with repeated tile states deduplicated into per-chunk palettes on disk and expanded when loading.
- `load()` restores exploration and backfills older saves. Fixed-map saves preserve every old tile and coordinate; earlier full-chunk saves become tile deltas. Missing cached chunks are normal and must not reset the world. Unsupported generator versions/chunk sizes fail loading without replacing the stored save.

## UI notes

- Three-column layout: left (character + quick actions + settlement summary), center (tabs), right (resources + event log). Collapses on narrow screens.
- Map viewport is `VIEW_W x VIEW_H` tiles centered on the player; tiles outside the viewport aren't rendered. Vision radius shrinks at night.
- Auto-walk halts on damage taken or low energy (so players don't die mid-walk). Combat modals always stop auto-walk.

## Things to avoid

- Don't introduce build steps, package managers, or external assets — the design constraint is one self-contained HTML file.
- Don't add per-survivor or per-tile rendering inside hot tick paths; the per-tick code runs many times.
- Don't store ephemeral UI state (modal contents, autoWalk timers) inside `G` — keep them in module-level variables that aren't serialized.
- Don't sneakily change the meaning of an existing resource / building / job id without migrating saves; appending new ones is safe, renaming is not.
