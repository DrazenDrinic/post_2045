# Agent guide — Ashes of Tomorrow

Project notes for AI coding agents (Claude Code, Codex, Cursor, Aider, etc.) working in this repository.

## What this project is

A single-file, browser-based post-apocalyptic survival + town-builder + tile-map exploration game.

- One file: `index.html` (HTML + CSS + JS embedded).
- No build, no package manager, no server, no dependencies, no external assets.
- Saves to `localStorage` under the key `ashes_of_tomorrow_save_v1`.
- Designed to be opened directly in a browser.

## Hard constraints — do not violate

1. **One file.** Everything lives in `index.html`. Do not introduce a build step, bundler, framework, or external script/CSS/image/font.
2. **No dependencies.** Vanilla HTML / CSS / JS only.
3. **No network calls** at runtime.
4. **Saves must keep loading.** `load()` backfills missing fields. If you change `G`'s shape in a way that can't be backfilled, bump `SAVE_KEY` instead of silently breaking existing saves.
5. **Don't add documentation, scripts, or config files** unless the user explicitly asks.

## How to verify a change

There are no automated tests. Before reporting work as done:

1. Syntax-check the embedded script:
   ```
   node -e "const fs=require('fs'); const m=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*)<\/script>/); fs.writeFileSync('_check.js', m[1]);"
   node --check _check.js
   rm _check.js
   ```
2. If your change is non-trivial, say in your summary that you have NOT manually playtested the change in a browser. Do not claim a feature works without trying it.

## Code map

Inside the single `<script>` block in `index.html`, in top-to-bottom order:

| Section            | What lives there                                                                 |
|--------------------|----------------------------------------------------------------------------------|
| DATA tables        | `RESOURCES`, `ENEMIES`, `KNOWLEDGE`, `BUILDINGS`, `JOBS`, `TRAITS`, `LOCATIONS`, `BIOMES`, `MAP_FEATURES`, `MAP_ENTITIES`, names |
| Constants          | `TICKS_PER_DAY`, `PHASES`, `MAP_W/H`, `VIEW_W/H`, `VISION_*`, `STEP_PER_PHASE`, `SAVE_KEY` |
| State              | `G` (single global state), `newGame()`, `makeSurvivor()`                          |
| Helpers            | `rng`, `pick`, `rint`, `chance`, `clamp`, `addResource`, `pushLog`, etc.          |
| Tick / day system  | `passPhase`, `advanceOnePhase`, `applyTick`, `onDayEnd`, `decaySurvivor`, `produceFromBuildings`, `autoConsume`, `rollThreats`, `raidEvent` |
| World map          | `generateMap`, `paintBlob`, `populateFeatures`, `populateEntities`, `computeVisible`, `tryMove`, `startAutoWalk` / `stepAutoWalk`, `encounterTile`, `handleFeature`, `triggerEvent`, `openFriendlyDialog`, `recruitFollowersAtVillage`, `refreshMapDaily` |
| Combat             | `startCombat(enemyKey, onWinAfter, onFleeAfter)`, `combatAttack`, `combatFlee`, `combatWin`, `combatLose`, `showCombatModal` |
| Player actions     | `playerAction`, `build`, `research`, `assignJob`, `spawnStranger`, `traderArrives`, `tryRelationship`, `birthChild` |
| Render             | `render` → `renderHeader` / `renderLeft` / `renderRight` / `renderTabs` / `renderContent` (dispatches to tab renderers) |
| Modal              | `showModal({title, body, buttons})`, `closeModal()`                              |
| Save / load / init | `save`, `load`, `reset`, `help`, `init` (button + keyboard listeners)             |

## `G` (game state) shape

```
{
  day, phase, log,
  knowledge, reputation, danger,
  resources: { wood, stone, food, water, ... },    // keys: see RESOURCES
  buildings: { [id]: {count, dmg} },
  survivors: [ {id, name, isPlayer, isChild, age, health, hunger, thirst, energy,
                happiness, morale, warmth, safety, maxHealth, traits, skills,
                job, partnerId, parentIds, diseased, injured, ...} ],
  jobs:         { [survivorId]: jobKey },
  workerAssign: { [buildingId]: [survivorId, ...] },
  knownNodes:   { [knowledgeNodeId]: true },
  relationships:[ {a, b, type:'partner'|'parent'} ],
  // world map
  map:        2D array [y][x] of { biome, feature: {type,charges}|null, entity: {type}|null },
  playerX, playerY,
  villageX, villageY,
  explored:   { "x,y": true },
  followers:  [survivor objects in transit, not yet in survivors[]],
  stepAccum
}
```

Module-level non-serialized state: `_combat`, `_autoWalk`, `_activeTab`. Don't put these in `G`.

## Conventions

- Vanilla JS, ES2017+ is fine. No classes required.
- DOM is rebuilt each `render()`. Tab renderers receive a root and append cards. There's no diffing — re-render whole panels.
- After mutating `G` from user input, call `render(); save();`.
- Logging: `pushLog(g, message, type)` where `type ∈ {good, bad, warn, info}`.
- Colors: use the CSS variables in `:root` (`--bg`, `--accent`, `--good`, `--bad`, `--warn`, `--info`, etc.).
- New content should fit the existing data schemas so it doesn't need render changes.

## Adding content — quick recipes

- **Resource**: add to `RESOURCES` as `{name, icon}`. Automatically tracked, capped, displayed.
- **Building**: add to `BUILDINGS` as `{name, icon, cat, desc, cost, workers, max, effects}`. To gate behind research, add the building id to a `KNOWLEDGE` node's `unlock.buildings`. Supported effect keys: `housing`, `storage`, `food_storage`, `warmth`, `produce`, `produce_per_worker`, `consume`, `convert:{from,to,perWorker}`, `knowledge`, `knowledge_per_worker`, `heal_per_worker`, `happiness_all`, `morale_all`, `reputation`, `attract_chance`, `trade_chance`, `warning`, `cook`, `safety_per_worker`, `wall`, `danger_reduce`.
- **Job**: add to `JOBS` as `{name, building, output, desc}`. If `building` is set, slots = `BUILDINGS[building].workers * count`.
- **Map feature**: add to `MAP_FEATURES` as `{icon, name, desc, biomes:[...], charges, loot?, damage?, energyLoss?, curse?, heal?, warmth?, event?, hidden?, rare?, enemyChance?, sting?, chargeRisk?, knowledge?}`. `event` routes to `triggerEvent` — add a case there for new event types.
- **Map entity (hostile)**: `{icon, name, hostile:true, enemy:<ENEMIES key>, biomes:[...], nightOnly?}`.
- **Map entity (friendly)**: `{icon, name, friendly:"<type>", biomes:[...]}` — and add a matching `case "<type>":` in `openFriendlyDialog`.
- **Biome**: add to `BIOMES`, and add a blob entry to the `blobs` array inside `generateMap` to make it spawn.
- **Knowledge node**: append to `KNOWLEDGE` as `{id, name, cat, cost, req:[ids], desc, unlock:{buildings?:[], jobs?:[]}}`.
- **Enemy stats**: `ENEMIES` defines the underlying combat stats; `MAP_ENTITIES.<hostile>.enemy` references it.

## Things to avoid

- Don't introduce frameworks, build tooling, package managers, or external assets — the design constraint is one self-contained HTML file.
- Don't rename existing ids in DATA tables without migrating saves; appending is safe, renaming is not.
- Don't perform expensive work per-tile inside `applyTick` — that runs every phase per survivor and per building.
- Don't store ephemeral UI state (modal contents, autoWalk timers, active tab) inside `G` — keep them in module-level variables.
- Don't add emojis to source files unless the user asks. The game UI already uses them deliberately as icons; that is content, not commentary.
- Don't claim a feature works in the browser without playtesting it; if you can't playtest, say so.

## See also

`CLAUDE.md` in this directory contains the same information with slightly more narrative framing.
