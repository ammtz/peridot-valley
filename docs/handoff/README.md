# Handoff: The System — live agent world (demo)

## Overview
"The System" is a playful, whiteboard-style view of a personal AI orchestration setup. A prime supervisor (**PIP**) runs a flexible org of **managers** (ADA, OTTO, …) and **team floors** staffed by tiny square **agents**. Everything on the canvas can be dragged. Tapping anything opens a popup beside it showing what it's working on. Agents show **emotion** (flow, overwhelm, boredom, frustration, stalling) and **think out loud** in speech bubbles. Users can re-org the chart and drop **furniture** (MCP rack, database, bookshelf, strategy board) near teams to equip them.

**This is a demo.** Nothing connects to real services. All behavior is a client-side simulation and the state persists in `localStorage`. The goal is to show the interaction model convincingly.

## About the design files
The files in `reference/` are **design references built in HTML**: working prototypes that show the intended look and behavior. They are not production code to copy. Rebuild them as a clean React + TypeScript app (stack below). Match the reference's visuals and behavior closely. The reference's logic class is plain JS and is the best source of truth for the simulation rules and seed data. Port it, don't reinvent it.

To view the reference, open `reference/The System Live v4.dc.html` in a browser from the same folder. It loads `support.js` and `FurnitureIcon.dc.html` next to it.

## Fidelity
**High fidelity.** Final colors, type, spacing, animation feel and copy. Recreate it pixel-close.

---

## Recommended stack and hosting (budget under $10)
- **Vite + React 18 + TypeScript**, built as a static SPA. No server and no database.
- **State:** Zustand, or a single `useReducer` store with a mutable sim model and a render tick.
- **Rendering:** absolutely positioned DOM inside one transformed "world" div, driven by one `requestAnimationFrame` loop. Update positions through `transform: translate(...)` rather than left/top for performance. This is fine at around 30 agents. If it grows past about 150 agents, move the world layer to `<canvas>` (PixiJS) and keep popups, dock and feed as DOM.
- **Persistence:** `localStorage` key `the-system-live-v4` (JSON of the model). Include a RESET that clears it.
- **Font:** JetBrains Mono from Google Fonts (weights 400–800), or self-host it via `@fontsource/jetbrains-mono`.
- **Hosting:** Vercel **Hobby (free)**. Import the repo, framework preset "Vite", build `npm run build`, output `dist`. Add a `vercel.json` rewrite of everything to `/index.html` only if you add routes. Hobby is for non-commercial use, which fits a demo. A custom domain is about $10–15/year and is optional; the free `*.vercel.app` URL works.
- **No paid APIs.** All "agent" text comes from seed data plus the simulation.

Suggested structure:
```
src/
  main.tsx, App.tsx
  model/types.ts            // Manager, Team, Agent, Furniture, Need, FeedCard
  model/seed.ts             // port verbatim from reference (SUPS, TEAMS, NEEDS, furniture)
  model/constants.ts        // FT (furniture types), BLOCKERS, FEARS, MOOD, MGR_NAMES
  model/sim.ts              // tick(), complete(), inflow(), makeBlocked(), makeFear(), mood(), thought()
  model/org.ts              // reparent(), addManager(), addTeam(), deleteManager(), isUnder()
  store.ts                  // model + ui state (pan, zoom, sel, drag, hover…) + persistence
  world/World.tsx           // pan/zoom viewport + layers
  world/Links.tsx, Room.tsx, Agent.tsx, Manager.tsx, Furniture.tsx, Pulse.tsx
  ui/Popup.tsx (+ sections), Feed.tsx, Dock.tsx, ZoomControls.tsx, TitleBar.tsx
  lib/geometry.ts           // roomW/H, desks(), easing, toWorld()
```

---

## Design tokens
**Colors** (ink on paper. Everything is monochrome except the mood colors below.)
- Paper (background): `#f4f3ee`
- Panel (cards, floors, popups): `#fbfaf5`
- Ink (primary, all strokes and fills): `#15140f`
- Soft (secondary text): `#6b6a62`
- Faint text: `#9a988f`
- Grid line and divider: `#dedcd2`, row divider `#e6e4da`, hover row `#f1efe7`
- Danger (retire/delete only): `#9a3b2c`
- **Mood colors** (the only accent hues; used for mood icons, auras, floor mood strip, legend, popup mood pill, STUCK/ASKS feed badges):
  - Flow `#3aa865` · Swamped/overwhelmed `#ee7a2f` · Unsure/stalled `#e8b923` · Stuck/frustrated `#d63c2f` · Bored `#a9b4c4` · Pending `rgba(21,20,15,.2)`
- Dot grid: `radial-gradient(rgba(21,20,15,.13) 1.4px, transparent 1.4px)`, 30px cell, scaled with zoom and offset with pan

**Typography:** JetBrains Mono throughout.
- Title "THE SYSTEM": 13px / 800 / letter-spacing .16em
- Node names (PIP 13px, managers 12px): 800, .14em. Roles 9.5px / 600 / .10em, color soft
- Floor label: 11px / 800 / .10em, on a paper chip (padding 1px 6px) 23px above the floor
- Popup title 13px / 800 / .12em. Section labels 10px / 800 / .10em. Body 12–12.5px / 500, line-height 1.45–1.5
- Chips and buttons: 10–10.5px / 700–800 / .04–.08em
- Thought bubble: 7.5px / 600 (world units, so it scales with zoom). Mood tag inside is 800 / .06em

**Radii:** floors 16 (inner inset line 11), popup 16, feed panel 24, cards 14, buttons 8–11, agent body 5 (17px square), manager body = size × 0.22.
**Borders:** 2–3px solid ink. Pending or proposed items use dashed `rgba(21,20,15,.18–.28)`.
**Shadows:** always hard, offset and unblurred: `0 4px 0 rgba(21,20,15,.10)` (floors), `0 5px 0 rgba(21,20,15,.16)` (managers), `0 8px 0 rgba(21,20,15,.12)` (popup), `0 12px 0 rgba(21,20,15,.10)` (feed). Selection ring: add `0 0 0 6px rgba(21,20,15,.10)`.

---

## Screen layout (one screen, full viewport)
- **World viewport** (fixed, inset 0, `touch-action:none`). It holds a world layer transformed by `translate(pan) scale(zoom)` with origin 0 0. Layer order: links → furniture → proposed-team ghosts → team floors (with agents) → managers → pulses → dragged agent.
- **Title** (top-left 22/20): square glyph + "THE SYSTEM" + "live · N agents · N managers". Hint line below it: "drag anything · drop a team or manager on a manager to re-org · tap to open".
- **Zoom controls** (bottom-left 18/18): − , %, + , FIT, RESET. When the width available to the world is under 700px they lift to bottom 128 so they clear the dock.
- **Dock** (bottom, centered in the space left of the feed, never left of x ≈ 490 on wide screens): + MANAGER (filled), + TEAM (outline), "under {TARGET}", a divider, then 4 furniture tiles (62px wide, 48px icon + short label).
- **Feed "PIP → YOU"** (right 16, top 16, bottom 16, width 340). Header shows the avatar, "N teams · N managers · N objects", a live dot and a close ×. Below is a scrolling list of cards. It collapses to a pill button top-right. It's closed by default under 820px width.
- **Popup** (fixed, width 330). It sits 18px to the right of the tapped node, flips to the left if it would hit the feed or the edge, and has top clamped between 64 and vh−360. It follows its node every frame, so it moves while panning.

---

## Entities and rendering

### Manager (PIP and every other manager)
- Ink rounded square (PIP 58px, seeded managers 42, new ones 40) with two "bunny ears" (w .13s, h .34s, top −.28s, rotated ±6°), two paper eyes, and a dashed halo ring (diameter 1.85s) that breathes (scale 1 ± .06).
- Bobs `sin(t*2+phase) * (PIP 4 : 3)` px. Blinks about every 5s. **PIP's eyes follow the cursor** (offset up to .07s × .06s).
- PIP shows a count badge (NEEDS YOU count) top-right, pulsing.
- When a report pulse arrives: pop scale 1 → 1.12 → 1 over .45s.
- **Drop target state** (while dragging a team or manager over it): halo turns solid at .7 opacity with a faint fill, scales to 1.25, body scales ×1.12, and a black tag "→ report to {NAME}" follows the cursor.

### Team floor
- Width `max(124, 100 + n*20)`, height `84 + min(max(n,1),4)*9`. Panel fill, 2px ink border, radius 16, inner 1px line inset 6.
- Desks are 20×5 bars at 50% ink on a centered grid (`cols = n<=3 ? n : ceil(n/2)`, with 50×46 padding). See `desks()` in the reference.
- The label shows "NAME · n", plus a black mini tag listing equipped furniture (e.g. `MCP · DB`).
- States: **active**, **pending** (dashed border, agents at 40%, "· pending"), **hidden/proposed** (dashed 130×96 "+" ghost; tapping it opens PIP).
- Completion ripple: border ring scales 1 → 1.35 and fades over .7s, and the floor pops 1 → 1.045 over .5s.
- Empty floor shows "drag agents here".

### Agent (17px ink square, 2 paper eyes)
Agents **sit at their desks by default**. They move only when:
1. **Visiting furniture:** if the floor is equipped and the agent is working or in flow, it walks out on a 26s cycle (1.6s out, 3.4s using it, 1.6s back) to a point 32px below the furniture.
2. **Bored:** a slow wander around the desk (±16px x, ±4px y).
3. **Re-layout:** after a reassignment or a team size change, the agent eases to its new desk (exponential smoothing, k = 1−e^(−7·dt)), so it visibly walks.

While walking it does a quick hop bob and shows no bubble.

**Moods.** Evaluate them in this priority order (see `mood()`):

| Mood | Condition | Body | Eyes | Decoration | Thought bubble |
|---|---|---|---|---|---|
| FRUSTRATED (tag STUCK) | `agent.blocked` set | stomp-shake burst every 2.6s | narrowed (h 2) + angled paper brows ±24° | ink "X" anger mark pulsing top-right, puff circle rising | "Can't finish this. {Blocker}." |
| STALLED (tag UNSURE) | `agent.fear` set | leans −5°, shrinks to .93, faint tremble | glance side to side ±1.6px | wobbling "?" above | "Not sure about {fear}. Waiting on your OK." |
| OVERWHELMED (tag SWAMPED) | backlog ≥ 4 | fast jitter ±.7px | wide (3×4) | stack of 3 papers above the head + load count, sweat drop dripping | "{n} things on my plate. Where do I even start?" |
| BORED (tag BORED) | no current task and empty backlog | slow sway ±7°, slow bob | half-lidded (h 1.1, lowered) | two soft "z"s floating up | "Nothing in my queue. Got anything for me?" |
| FLOW (tag FLOW) | 2+ completions within 35s → `flowUntil = t+16` | happy hops (up to 3.2px) | squint arcs (h 1.3) | three twinkling ✦ sparkles | "On a roll. {n} done back to back." |
| WORKING | otherwise | gentle typing bob | normal + blink | two typing dots above the head | "{current task}…" (only when zoom ≥ 1.5) |
| WAITING | team pending | static, 40% | normal | none | "Ready to start once you sign." |

**Glanceable first, text second.** The user should read state without reading words:
- **Mood icon badge:** a 17px circle filled with the mood color, 1.5px ink border and a hard shadow. It sits 3px above the head with a 3px ink tail dot and pulses (scale 1 ± .08; faster for stuck and swamped). Glyphs: stuck `!`, unsure `?`, swamped = live task count (e.g. `5`), bored `z`, flow `✦`. It shows for every notable mood at any zoom and hides while walking.
- **Aura:** a 30×10 ellipse under the agent's feet in the mood color, opacity .55 ± .25, pulsing with the icon.
- **Floor mood strip:** centered 7px below the floor's bottom edge, one pill per agent (6px tall, 1.5px ink border). Working agents get a 6px panel-color pill. Any other mood gets a 12px pill in its mood color.
- **Legend:** in the title area, five 10px color dots labelled FLOW · SWAMPED · UNSURE · STUCK · BORED, at 9.5px / 700.
- Mood-specific body animation (the table above) stays. The text decorations (papers, z's, anger X, "?") are dropped in favor of the badge. The brows, sweat drop, puff and sparkles stay.

**Thought bubble (text, on demand only):** panel fill, 1.5px ink border, radius 8, max-width 132, centered 12px above the head, with a two-dot tail. **Visibility** (the `thoughts` setting): `icons` (default) shows the text bubble only on hover or selection. Otherwise the icon badge shows. `always` shows text for every agent. `off` hides both. Bubbles hide while walking. When a bubble shows, the name label and the icon are hidden.

### Furniture (48×48 icons, see `reference/FurnitureIcon.dc.html`)
- **MCP RACK** (short `MCP`): tall rack with 3 slots and blinking LEDs. Options: Gmail, Drive, Calendar, Bank, Slack.
- **DATABASE** (`DB`): cylinder with 2 rings and a blinking dot. Options: Transactions, Receipts, Contacts, Health records.
- **BOOKSHELF** (`CONTEXT`): 2 shelves of spines. Options: House rules, Preferences, Past decisions, Family info.
- **STRATEGY BOARD** (`GRAPH`): whiteboard on legs with a 3-node graph. Options: Plan → act → check, Graph of subtasks, Debate then decide, Ask before acting.

A label under each shows "NAME" and "{n} on · {k} teams". **Range is 190 world px** from the floor center, shown as a dashed ring while selected or dragged. Every floor in range is **equipped**: a dotted link is drawn, the floor label gets a tag, agents visit the furniture, the team's completion weight goes up by .9 per object, and feed cards append "(via DATABASE, …)". Dropping or moving furniture posts an EQUIP card, "Now serving A, B.", when the set of teams in range changes. New furniture pops in with outBack over .5s.

### Links and pulses
- Manager → boss: 2px solid ink at .26. Team → boss: 1.5px solid at .17 (dashed at .12 for pending or proposed). Furniture → equipped team: 1.5px dotted at .28.
- **Report pulse:** when an agent completes a task, a 10px ink dot with a 5px halo travels team → boss → … → PIP. Duration is path length / 420, clamped to .9–2.4s, with inOutCubic easing. On arrival PIP pops and a DONE card enters the feed.

---

## Interactions
**Pointer model** (pointer events, which covers mouse, pen and touch):
- Pointer down on a node: after a 4px move it becomes a drag. Released with no move, it's a tap that toggles that node's popup.
- Pointer down on empty canvas: pan. A tap on empty canvas closes the popup.
- Two pointers on the canvas: pinch zoom around the midpoint (zoom range .3–2.6).
- Wheel pans. Ctrl/⌘ + wheel zooms at the cursor (`exp(-deltaY*.01)`).
- Keys: Esc closes the popup (or blurs an input), F fits to view. Ignore shortcuts while typing in an input.
- FIT frames all nodes and furniture inside the area left of the feed, max zoom 1.3.

**Drags**
- **Agent:** lifted 24px ink square (rotation follows horizontal velocity, ±14°) with a black tag "NAME → TEAM" or "· drop on a floor". Active floors under it highlight (3px border, white fill). Dropping on another active floor reassigns the agent (MOVED card + ripple). Otherwise it walks back.
- **Team floor:** moves the floor and its agents. Dropping on a manager re-parents it: the floor returns to where the drag started, the link re-routes, and an ORG card posts. While hovering a manager the floor shows at 65% opacity and .9 scale.
- **Manager:** moves just that node (its links follow). Dropping it on another manager re-parents the whole branch. It can't be dropped onto itself or its own descendants (`isUnder`). PIP can't be re-parented.
- **Furniture:** moves it and recalculates range live.
- **Dock tile → canvas:** a ghost icon follows the cursor ("drag onto the floor", switching to "place {NAME}" and scaled to zoom over the canvas). Drop above the dock and left of the feed to place it. Tapping a tile places it near the view center. The new item is selected.

**Popups** (sections appear per entity, in this order):
1. Header: avatar square, TITLE, subtitle, × close. The header is sticky.
2. **Mood card** (agents): label pill + reason, the thought in italic quotes, and fix buttons:
   - FRUSTRATED → `{blocker fix}` (e.g. RE-AUTH AMEX) clears the blocker.
   - STALLED → GO AHEAD (completes the task now) or HOLD OFF (moves it to the end of the backlog).
   - OVERWHELMED → SPLIT LOAD hands half the backlog to the least-loaded teammates (hidden if the agent has no teammates).
   - BORED → GIVE WORK adds 2 pool tasks.
3. Description or mood summary (teams: "Mood: 1 frustrated · 2 working"; furniture: its description).
4. NAME / ROLE inputs (teams: name only; managers: both). Uppercase, max 14/18 characters, live-updating.
5. REPORTS TO: chips of every valid manager. The current one is filled. Tapping one re-parents.
6. NEEDS YOU (PIP only): cards with path, text and action buttons.
7. Options (furniture): toggle chips. On = filled with ✓, off = dashed with +.
8. Rows: DIRECT REPORTS (managers and PIP; round dot = manager, square = team, with a stat) or IN RANGE (furniture). Rows are tappable.
9. AGENTS chips (teams; mood tag appended, e.g. "CHECK · STUCK").
10. EQUIPPED WITH (teams and agents): furniture tag + enabled options. Tappable.
11. IN WORK / BACKLOG / DONE lists. Marks: ● pulsing for in work, ○ for backlog, ✓ in soft color for done. Team lists show the agent name on the right.
12. Action buttons. PIP: + MANAGER, + TEAM. Manager: + SUB-MANAGER, + TEAM, RETIRE (danger). Empty team: DELETE FLOOR. Furniture: REMOVE.
13. Dashed-top hint line.

Popup entry: opacity 0 → 1, scale .94 → 1 (outBack) and 8px rise over .28s.

**Org operations**
- `addManager(boss)`: next unused name from IVY, REX, MOSS, LUNA, KIT, JUNO, FERN, BO, SAGE, NIX. Role "NEW BRANCH". Placed at boss +(±140, 175). Pops in and gets selected.
- `addTeam(boss)`: "NEW TEAM", empty, placed at boss +(±140, 210), with a generic task pool.
- Dock add target = the selected manager, or the selected team's boss, otherwise PIP.
- `deleteManager`: its reports move to its boss. `deleteTeam`: only when empty.
- Breadcrumb paths leave out PIP, e.g. "OTTO › IVY › GROCERY".

**PIP's NEEDS YOU** (seeded, then grown by the sim)
- Supplier brief (OPEN BRIEF), school upload (UPLOAD), insurance rates (YES, DO IT → adds a task to QUOTE / NOT NOW), build Taxes team (BUILD TEAM → the proposed floor sprouts with outBack / LATER), sign Grocery (SIGN → the pending floor goes live / NOT YET).
- Every blocker or fear the sim creates also adds a need: "{AGENT} is stuck: …" [FIX, LATER] or "{AGENT} wants your OK before …" [GO AHEAD, HOLD OFF]. Fixing it from the agent popup removes the matching need.

---

## Simulation (port `step()` and helpers exactly)
It ticks every (2.4–4.8s) × speed factor (slow 1.8, normal 1, fast .45). Only agents on active floors that aren't being dragged take part.
1. Any agent with no current task pulls from its own backlog.
2. Roll `r`:
   - `< .09` and fewer than 2 blocked → a random free agent gets **blocked** (team-specific text from `BLOCKERS`, e.g. finance "the Amex login expired" / fix "RE-AUTH AMEX"). Posts a STUCK card and a need.
   - `< .16` and fewer than 2 afraid → **fear** (from `FEARS`, e.g. "moving $2,000 into savings"). Posts an ASKS card and a need.
   - `< .40` → **inflow**: the team pool's next task goes to a random agent (it becomes the current task if idle, otherwise it's appended to the backlog). This is what creates overwhelm and cures boredom.
   - otherwise → **complete**: a weighted pick among free agents (weight = 1 + .9 × furniture count + 1.5 if in flow). Current task → done (keep 8), pull next, record in `recent`, and set flow if 2+ completions within 35s. Then ripple, launch a pulse, and add a DONE card on arrival.
3. Save to `localStorage` at most every 1.5s, never mid-drag. On load, reset transient fields (`born`, `fireAt`, `recv`, `flowUntil`, `recent`).

The seed data, including starting moods, is copied verbatim from the reference: CHECK is blocked, QUOTE is afraid, NOVA is overwhelmed (5 queued), CHOW is bored, and QUANT starts in flow. It also includes 2 furniture objects (a DB beside FINANCE, an MCP rack beside SCHEDULE), 3 feed cards and 7 needs.

## State shape
```ts
Manager  { id, name, role, x, y, size, boss: string|null, born?, recv? }
Team     { id, name, boss, x, y, state:'active'|'pending'|'hidden', pool:string[], pi:number, born?, fireAt? }
Agent    { id, name, role, team, doing:string|null, backlog:string[], done:string[],
           blocked:{text,fix}|null, fear:string|null, flowUntil?, recent?:number[] }
Furniture{ id, type:'mcp'|'db'|'books'|'board', x, y, on:boolean[], born?, lastAnn? }
Need     { id, team, text, acts:[label, action][], ok?, agent?, kind?:'blocked'|'fear' }
FeedCard { id, kind:'DONE'|'MOVED'|'ORG'|'EQUIP'|'LIVE'|'YOU'|'STUCK'|'ASKS', path, who, text, ts }
UI       { pan{x,y}, zoom, sel{kind:'agent'|'team'|'sup'|'furn', id}|null, popAt, drag, hover, hoverMgr,
           hoverAgent, dragPos, pulses[], disp{[agentId]:{team,x,y,wx,wy}}, showFeed }
Settings { simSpeed:'slow'|'normal'|'fast', alwaysShowNames:boolean, thoughts:'icons'|'always'|'off' }
```
Feed card badges: DONE and MOVED are outlined. All other kinds are filled ink. The card shows "ago" as now, Ns or Nm, and enters with opacity plus a 40px slide over .5s.

## Animation reference
Easing: `outBack` (c1 1.70158), `outCubic`, `inOutSine`, `inOutCubic`. Every animation is driven from one clock (`performance.now()/1000`) inside the rAF loop. Avoid CSS keyframes for anything stateful. Blink ≈ .13s every 4.3s (agents) or 5.1s (managers), phase-offset per entity.

## Acceptance checklist
- [ ] Drag works for agents, floors, managers and furniture with mouse and touch. Pinch and wheel zoom work.
- [ ] Re-parenting works by drop and by REPORTS TO chip, with cycles prevented. You can move Grocery under ADA, and ADA under OTTO.
- [ ] Add, rename and retire managers. Add, rename and delete teams.
- [ ] Furniture places from the dock, the range ring shows, equipped teams get links, tags and visits, and options toggle.
- [ ] All 5 moods can be read at a glance (icon, aura, floor strip) with no text visible. Text shows on hover or tap. Fix buttons resolve moods and their needs.
- [ ] Pulses travel the live hierarchy, and the feed and PIP badge update.
- [ ] State survives a reload, and RESET restores the seed.
- [ ] Stays at 60fps with the seed world on a mid-range laptop and phone.
- [ ] Deploys on Vercel Hobby as a static build.

## Files
- `reference/The System Live v4.dc.html`: the full prototype (template + logic class with seed data and sim). **This is the source of truth.**
- `reference/FurnitureIcon.dc.html`: the 4 furniture icon drawings (pure div shapes, exact coordinates).
- `reference/support.js`: runtime needed only to open the reference files in a browser. Don't port it.
