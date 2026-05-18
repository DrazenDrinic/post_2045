# Agent guide — Post 2045

Project notes for AI coding agents (Claude Code, Codex, Cursor, Aider, etc.) working in this repository.

## What this project is

A browser-based post-apocalyptic survival + town-builder + tile-map exploration game.

- Entry point: `index.html`.
- Styling lives in `css/styles.css`.
- Game code lives in `js/*.js`, loaded directly by script tags.
- No build, no package manager, no server, no dependencies, no external assets.
- Saves to `localStorage` under the key `post_2045_save_v1`.
- Designed to be opened directly in a browser.

## Hard constraints — do not violate

1. Keep the current static-file architecture. Do not introduce a build step, bundler, framework, or external script/CSS/image/font.
2. **No dependencies.** Vanilla HTML / CSS / JS only.
3. **No network calls** at runtime.
4. **Saves must keep loading.** `load()` backfills missing fields. If you change `G`'s shape in a way that can't be backfilled, bump `SAVE_KEY` instead of silently breaking existing saves.
5. **Don't add documentation, scripts, or config files** unless the user explicitly asks.

## How to verify a change

There are no automated tests. Before reporting work as done:

1. Syntax-check the JavaScript files:
   ```
   node --check js/data.js
   node --check js/state.js
   node --check js/helpers.js
   node --check js/actions.js
   node --check js/world-map.js
   node --check js/render.js
   node --check js/advisor.js
   node --check js/modal.js
   node --check js/persistence.js
   node --check js/help.js
   node --check js/main.js
   ```
2. If your change is non-trivial, say in your summary that you have NOT manually playtested the change in a browser. Do not claim a feature works without trying it.

## Code map

Script load order in `index.html`:

| File | What lives there |
|------|------------------|
| `js/data.js` | `RESOURCES`, `ENEMIES`, `KNOWLEDGE`, `BUILDINGS`, `JOBS`, `TRAITS`, `LOCATIONS`, `BIOMES`, `MAP_FEATURES`, `MAP_ENTITIES`, names, constants |
| `js/state.js` | `G`, `newGame()`, `makeSurvivor()`, starting resources |
| `js/helpers.js` | `rng`, `pick`, `rint`, `chance`, `clamp`, `addResource`, `pushLog`, tick/day systems, town helpers |
| `js/actions.js` | Quick actions, contextual action requirements, building, research, jobs, relationships, scouting |
| `js/world-map.js` | Map generation, visibility, movement, encounters, combat, friendly dialogs, hunting animal movement, daily map refresh |
| `js/render.js` | DOM renderers, tabs, guide, hint detection, real-time controls |
| `js/advisor.js` | Advisor/hint helper logic |
| `js/modal.js` | `showModal({title, body, buttons})`, `closeModal()` |
| `js/persistence.js` | `save`, `load`, `reset`, save backfills |
| `js/help.js` | Help modal |
| `js/main.js` | Button and keyboard listeners, init |

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
  courtship:    { [survivorId]: progress0to100 },
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
- Quick action buttons are gated by `quickActionBlocker(g, actionKey)` in `js/actions.js`; keep UI disabled states and handler validation in sync by adding new rules there.
- Survivors have `sex: 'M'|'F'`. Player marriage/courtship is handled in the Survivors tab; natural children require opposite-sex partners. If the player dies, `continueAsHeir()` can transfer play to a living child.

## Adding content — quick recipes

- **Resource**: add to `RESOURCES` as `{name, icon}`. Automatically tracked, capped, displayed.
- **Building**: add to `BUILDINGS` as `{name, icon, cat, desc, cost, workers, max, effects}`. To gate behind research, add the building id to a `KNOWLEDGE` node's `unlock.buildings`. Supported effect keys: `housing`, `storage`, `food_storage`, `warmth`, `produce`, `produce_per_worker`, `consume`, `convert:{from,to,perWorker}`, `knowledge`, `knowledge_per_worker`, `heal_per_worker`, `happiness_all`, `morale_all`, `reputation`, `attract_chance`, `trade_chance`, `warning`, `cook`, `safety_per_worker`, `wall`, `danger_reduce`.
- **Job**: add to `JOBS` as `{name, building, output, desc}`. If `building` is set, slots = `BUILDINGS[building].workers * count`.
- **Map feature**: add to `MAP_FEATURES` as `{icon, name, desc, biomes:[...], charges, loot?, damage?, energyLoss?, curse?, heal?, warmth?, event?, hidden?, rare?, enemyChance?, sting?, chargeRisk?, knowledge?}`. `event` routes to `triggerEvent` — add a case there for new event types.
- **Map entity (hostile)**: `{icon, name, hostile:true, enemy:<ENEMIES key>, biomes:[...], nightOnly?}`.
- **Map entity (huntable animal)**: `{icon, name, huntable:true, biomes:[...], loot:{...}, fleeChance?, danger?}`. Huntable animals flee on contact; ranged hunting is handled by the `hunt` quick action.
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
