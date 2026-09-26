# Peridot Valley

**Your AI helpers, as a little town you can actually see.**

Most AI setups are a wall of logs. You find out an agent was stuck three hours
after it got stuck. Peridot Valley is a bet that a team of agents should look
more like a team: small square creatures at desks, reporting up to managers,
reporting up to you.

At a glance you can tell who is in flow, who is swamped, who is waiting on your
OK and who is bored out of their mind. Drag a team under a different manager
and the org chart changes. Drop a database next to a team and they start using
it. Tap anyone to see what they're doing.

## What this is, honestly

**An early demo. Everything you see is simulated.**

No agent here does real work yet. There is no server, no API key and no
account. The creatures run on a small simulation in your browser, and your
changes are saved in your browser's local storage. Close the tab, come back,
and your valley is where you left it. Press **RESET** to start over.

We built the look and the feel first on purpose. If watching your agents isn't
clear and a little delightful, wiring them to real work won't fix that.

## Where it's going

The real valley: the same town, with agents doing real jobs behind each
creature. When one gets stuck, you'll see it the moment it happens, not in a
log file. When one needs your permission, it asks in plain words and waits.
Every decision you make is kept, so the system learns how you like things done.

It's early, and it's moving fast. Expect things to change, sometimes a lot,
between visits.

## Try it

A live demo is on the way. To run it yourself:

```bash
npm install
npm run dev
```

Then open the link it prints. Works with a mouse or a phone.

**Things to try**

- Tap **PIP**, the big one at the top. That's your supervisor, and it has
  things waiting on you.
- Find the creature with the red **!**. It's stuck. Tap it and fix it.
- Drag a team floor onto a different manager to re-organise.
- Drag a **DB** or **MCP** rack out of the bottom dock and drop it near a team.
- Pinch or Ctrl+scroll to zoom. Press **F** to fit everything on screen.

## The moods

| Colour | Mood | What it means |
|---|---|---|
| Green ✦ | Flow | Finishing things back to back |
| Orange | Swamped | Too much on their plate |
| Yellow ? | Unsure | Waiting for your OK before doing something |
| Red ! | Stuck | Blocked, and needs you to unblock it |
| Grey z | Bored | Nothing to do. Give them something |

## Under the hood

A static site, and deliberately small: Vite, React and TypeScript, with no UI
framework and no backend. The whole world runs on one animation loop.

- `src/model/` has the simulation, the starting world and the org rules.
- `src/world/` draws the town. `src/ui/` holds the popups, the feed and the dock.
- `docs/handoff/` has the original design spec and the prototype it was built
  from.
- `_qa/drive.mjs` is a headless smoke test. It taps, drags, reloads and checks
  for errors in headless Edge (Windows paths for now).

```bash
npm run build     # type-check and build into dist/
npm run preview   # serve the built site locally
```

Deploys as a plain static site. On Vercel, import the repo, pick the **Vite**
preset and click Deploy. No settings needed.

## Feedback

This is the part where you tell us what's confusing. Open an issue. We read
them.
