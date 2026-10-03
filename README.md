# 🏞️ Peridot Valley

**Build and manage your agentic system, visually.**

**Live demo: [peridot-valley.vercel.app](https://peridot-valley.vercel.app)** · no sign-up · works on phones

---

You have an idea. You hand it to your AI agents, and they take it into the dark.

Four hours and 50,000 tokens later, they bring back something you don't recognize. You never saw where it went wrong.

Now turn the lights on.

There's a valley. Every agent has a home. Every team has a street. The one who's stuck is waving at you.

And you're not just watching. Reach in. Move a team. Hand someone a tool.

Welcome to Peridot Valley.

---

## Why a valley?

**Your whole agentic system on one screen. No dashboard.**

No tabs, no settings panels, no buttons three menus deep.
Everything you do, you do in the valley itself.

- **See your system.** Every team, manager and agent, laid out.
- **Spot who's stuck.** One glance, no logs.
- **Place context.** Drop DATA or NOTES beside a team.
- **Record anywhere.** Put a RECORDER where you want recaps.
- **Drag tools.** In to grant, out to revoke.

## Try it: the 60-second tour

> Interface preview. All agent work is simulated.

1. **Open the demo.** VIC, the supervisor, asks two questions.
2. **Answer them.** How often to check in, what to offload first.
3. **Meet your team.** One manager, three helpers, hired for you.
4. **Find a red !** Tap it. That agent is stuck.
5. **Drag a team** onto another manager. The org chart follows.
6. **Drop a RECORDER** near a team. A recap posts every 45 seconds.

Want the full valley? Use the skip link on the opening screen.
It hires two managers and plays a scripted morning.

Sending it to someone? Add `?fresh` to replay the opening.

**Controls:** tap to inspect · drag to reorganize · hold a dock tool to preview · pinch or Ctrl+scroll to zoom · **F** fits all.

Your valley saves in your browser. **RESET** starts over.

## Reading the valley

| Color | Mood | Meaning |
|---|---|---|
| Green ✦ | Flowing | Finishing tasks back to back |
| Orange | Swamped | Too much on their plate |
| Yellow ? | Unsure | Waiting for your OK |
| Red ! | Stuck | Blocked until you step in |
| Grey z | Bored | Idle, give them work |

## Coming next

We built the look first on purpose.
If watching agents isn't clear, real work won't fix it.

- **Real agents, real jobs,** behind every creature.
- **Plain-word permission requests.** They ask, then wait.
- **A valley that learns you.** Every decision you make is kept.

Expect big changes between visits.

## Run it locally

```bash
npm install
npm run dev       # open the printed link
npm run build     # type-check and build to dist/
npm run preview   # serve the build locally
```

Deploy: import to Vercel, pick the **Vite** preset, deploy.

## Architecture

Vite, React and TypeScript. No UI framework, no backend.
One animation loop runs the whole world.

| Path | Holds |
|---|---|
| `src/model/` | Simulation, starting world, org rules |
| `src/live/` | Real events: the laptop jobs' log in dev, or MERO's ledger with `VITE_MERO_URL`. The deployed site sets neither and stays simulated |
| `src/world/` | Town rendering |
| `src/ui/` | Popups, feed, dock |
| `docs/handoff/` | Original design spec and prototype |
| `_qa/drive.mjs` | Headless smoke test (Edge, Windows paths for now) |
