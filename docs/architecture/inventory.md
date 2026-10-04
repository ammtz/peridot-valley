# Current-code inventory

This file maps what today's code does to the layer it runs in now. It maps today only. It makes no target choices (those are P15 to P20).

Read from:

- peridot-valley `main` @ `76b0d7d` (the worktree, `src/`, `vite.config.ts`).
- MERO `main` @ `20b1ab3` (`mero/`, `blueprints/`, `models.toml`).

Layers are exactly: client, API, workers, database, storage, hosting. Brief areas are exactly: Truth, Model, Walls, Money, none.

Notes on reading it:

- "Not on GitHub" means the thing runs or lives on the PC only and no repo holds it.
- Peridot has no backend of its own. The only server code is one dev-only Vite route and, in MERO, `mero serve`.
- Paths in the Repo column are prefixed with the repo name.
- Peridot has no `vercel.json` at 76b0d7d. Vercel runs the Vite preset (README.md, "Deploy" line).
- Not found at either SHA: a spend watchdog, daily or weekly caps, OAuth or MFA, an AI gateway, an MCP server, a scrub or export step. No rows are given for them.
- `blueprints/*.toml`, `models.toml` and `mero/models.py` all exist at 20b1ab3.

| Function | Today's layer | Brief area | Repo and file(s) | Evidence |
|---|---|---|---|---|
| Boot the React app into the page | client | none | peridot-valley: `src/main.tsx`, `src/App.tsx` | 76b0d7d; mounts App inside the error boundary |
| Page styles for the whole app | client | none | peridot-valley: `src/index.css` | 76b0d7d |
| Singleton simulation store and live-feed start | client | Model | peridot-valley: `src/store.ts` | 76b0d7d; builds `Sim`, calls `startLiveFeed(pickSource(VITE_MERO_URL))` |
| Simulation engine: agents, moods, tasks, ticks | client | Model | peridot-valley: `src/model/sim.ts` | 76b0d7d; 3187 lines, simulated, no real model calls |
| Simulation types | client | none | peridot-valley: `src/model/types.ts` | 76b0d7d |
| Simulation constants, save key and save version | client | none | peridot-valley: `src/model/constants.ts` | 76b0d7d; `KEY`, `CURRENT_V` |
| Starting world: teams, desks, furniture, agents | client | none | peridot-valley: `src/model/seed.ts`, `src/model/presets.ts` | 76b0d7d |
| Scripted work and stuck cases per scenario | client | none | peridot-valley: `src/model/scenarios.ts` | 76b0d7d; plain data |
| Mood and next-step judgment seam (rules today, Jev later) | client | Model | peridot-valley: `src/model/decider.ts` | 76b0d7d; header names a future `/v1/evaluate` call, not built |
| Isolation chamber, drive and meeting space as event folds | client | Walls | peridot-valley: `src/model/facility.ts`, `src/model/facilityView.ts` | 76b0d7d; header says PREVIEW, scripted, touches no hardware |
| Guided tour steps | client | none | peridot-valley: `src/model/tour.ts` | 76b0d7d |
| Browser save of the valley (localStorage) | storage | Truth | peridot-valley: `src/model/sim.ts`, `src/model/constants.ts`, `src/ui/ErrorBoundary.tsx` | 76b0d7d; `localStorage` get/set/remove under key `the-system-live-v4`; error boundary clears it |
| Layout geometry helpers | client | none | peridot-valley: `src/lib/geometry.ts` | 76b0d7d; re-exports from model |
| Placement rules for facilities | client | none | peridot-valley: `src/lib/place.ts` | 76b0d7d |
| Wire routing between items and teams | client | none | peridot-valley: `src/lib/route.ts` | 76b0d7d |
| Turn real events into valley actions and moods | client | Truth | peridot-valley: `src/live/events.ts` | 76b0d7d; pure, no fetch |
| Pick a live source and poll it | client | Truth | peridot-valley: `src/live/feed.ts` | 76b0d7d; `pickSource`, `startLiveFeed`; off on the deployed site |
| Read MERO's ledger over `mero serve` | client | Truth | peridot-valley: `src/live/mero.ts` | 76b0d7d; used when `VITE_MERO_URL` is set |
| Town drawing: world, rooms, links | client | none | peridot-valley: `src/world/World.tsx`, `src/world/Room.tsx`, `src/world/Links.tsx` | 76b0d7d |
| Agent, manager and facility sprites | client | none | peridot-valley: `src/world/Agent.tsx`, `src/world/Manager.tsx`, `src/world/Facility.tsx` | 76b0d7d |
| Furniture and furniture icons | client | none | peridot-valley: `src/world/Furniture.tsx`, `src/world/FurnitureIcon.tsx` | 76b0d7d |
| Popups, needs pill, feed and dock | client | none | peridot-valley: `src/ui/Popup.tsx`, `src/ui/NeedsPill.tsx`, `src/ui/Feed.tsx`, `src/ui/Dock.tsx` | 76b0d7d |
| Title bar, control bar, zoom controls | client | none | peridot-valley: `src/ui/TitleBar.tsx`, `src/ui/ControlBar.tsx`, `src/ui/ZoomControls.tsx` | 76b0d7d |
| Intro screen and guided tour overlay | client | none | peridot-valley: `src/ui/Intro.tsx`, `src/ui/Tour.tsx` | 76b0d7d |
| Facility panels (chamber, drive, meeting) | client | Walls | peridot-valley: `src/ui/FacilityPanel.tsx` | 76b0d7d |
| Error boundary with reset of the saved valley | client | none | peridot-valley: `src/ui/ErrorBoundary.tsx` | 76b0d7d |
| Dev-only `/__mero/events` route | API | Truth | peridot-valley: `vite.config.ts` | 76b0d7d; Vite `configureServer` middleware, `?after=N`, reads the file on disk; absent from the built site |
| Laptop automations' event file `events.jsonl` | storage | Truth | not on GitHub (`mero_v01/.automations/events.jsonl`, path named in `vite.config.ts` and `mero/jobs.py`) | 76b0d7d, 20b1ab3; read only as far as those two files reference it |
| Laptop automation jobs that write that file | workers | none | not on GitHub (`mero_v01/automations`, named in `mero/jobs.py`) | 20b1ab3; not read |
| Vercel deploy: production plus branch previews | hosting | none | peridot-valley: no config file; Vite preset, `README.md` | 76b0d7d; README names peridot-valley.vercel.app and the Vite preset; no `vercel.json` |
| Vite dev server and build | hosting | none | peridot-valley: `vite.config.ts`, `package.json`, `index.html` | 76b0d7d |
| `mero serve` GET `/events?after=N` | API | Truth | MERO: `mero/serve.py` | 20b1ab3; read-only, 127.0.0.1:8765, flattens events to Peridot's shape |
| `mero serve` GET `/stream?after=N` (server-sent events) | API | Truth | MERO: `mero/serve.py` | 20b1ab3; polls the ledger, default 0.5 s |
| `mero serve` GET `/views` | API | Truth | MERO: `mero/serve.py`, `mero/views.py` | 20b1ab3; costs, tasks, runs, moods |
| Origin check on `mero serve` (only echo allowed origins) | API | Walls | MERO: `mero/serve.py` | 20b1ab3; `allowed_origin` |
| SQLite ledger: append-only events, one writer | database | Truth | MERO: `mero/ledger.py` | 20b1ab3; triggers block update and delete; OS lock on `<db>.writer.lock`; default `~/.mero/ledger.db` |
| Closed event vocabulary: refuse unknown kinds and fields | workers | Walls | MERO: `mero/vocab.py` | 20b1ab3; refusals are logged; seq and at are not the sender's |
| Event bus: workers propose, the bus alone writes | workers | Truth | MERO: `mero/bus.py` | 20b1ab3; `Bus`, `Proposer`, subscribers |
| Views folded from the ledger (tasks, runs, moods) | workers | Truth | MERO: `mero/views.py` | 20b1ab3; `Views.apply`, `Views.replay`, `snapshot` |
| Cost fold: usd, tokens, by model, tier and run | workers | Money | MERO: `mero/views.py` | 20b1ab3; `self.cost`, summed from `model.call` `cost_usd`; it only reports, no cap or throttle |
| Bring laptop job events into the ledger | workers | Truth | MERO: `mero/jobs.py` | 20b1ab3; `ingest`, idempotent by line hash |
| Policy engine: allow, ask or deny every action | workers | Walls | MERO: `mero/policy.py` | 20b1ab3; reads allow, writes ask with diff, network ask, destructive deny, unknown deny |
| VIC: goals, tasks, decisions folded from the log; keeper flags stale | workers | Truth | MERO: `mero/vic.py` | 20b1ab3; `fold`, `plan`, `stale`; frontier called in `sprint_start` and `sign_off` |
| Blueprint files (`blueprints/*.toml`) | storage | Model | MERO: `blueprints/fix-python-unittest.toml`, `blueprints/mero-cli-subcommand.toml` | 20b1ab3; in git |
| Blueprint loader, slot fill and seed as events | workers | Model | MERO: `mero/blueprints.py` | 20b1ab3; `load`, `slots`, `render`, `seed` |
| Model tier list (`models.toml`) | storage | Model | MERO: `models.toml` | 20b1ab3; tiers t0 (Ollama), t1 and t2 (Claude Code headless); override with `MERO_MODELS` |
| Models behind one interface, cost per reply | workers | Model | MERO: `mero/models.py` | 20b1ab3; `Ollama`, `ClaudeCli`, `Script`, `model_for`; `Reply` carries cost |
| JEV: pick a blueprint, then a tier, escalate | workers | Model | MERO: `mero/jev.py` | 20b1ab3; `route`, `pick_tier`, `next_tier`, `trigger` |
| Loop graph runner (TOML edges, step cap) | workers | Model | MERO: `mero/loop.py`, `mero/loops/coding.toml` | 20b1ab3; `Graph`, `run` |
| L0 worker: plan, edit, verify in its own worktree | workers | Model | MERO: `mero/worker.py` | 20b1ab3; SEARCH/REPLACE edits, every action through policy |
| L2 supervisor: several tasks, slots, sign-off, escalate | workers | Walls | MERO: `mero/supervisor.py` | 20b1ab3; merge goes to policy and waits on approval; `guard` |
| Run one task end to end | workers | Walls | MERO: `mero/run.py` | 20b1ab3; nothing merges without approval |
| Command line: init, note, tail, stats, replay, serve, task, approve | workers | none | MERO: `mero/cli.py`, `mero/__main__.py` | 20b1ab3; `cmd_*`, `main` |
| Package marker and version | workers | none | MERO: `mero/__init__.py` | 20b1ab3; `__version__ = "0.1.0"` |
| MERO runs on the PC only | hosting | none | not on GitHub (the owner's PC; `mero serve` binds 127.0.0.1) | 20b1ab3; `mero/serve.py` header |
