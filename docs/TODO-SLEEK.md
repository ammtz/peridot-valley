# TODO-SLEEK — work order for Claude Code

Written 2026-09-26. It folds three reviews into one ordered list: the code review
of `main` @ 25c4c4f, the UX review with the Apple HIG lens (also run on `main`), and a
look at `demo-v2` screenshots. The owner's goal is **sleek**. The town leads, the
controls recede, and each screen has one clear action. On a phone, the demo should
show its value inside a minute.

## Rules

- Work on branch `demo-v2`. Never push to `main`; the live site deploys from it.
- Node: `export PATH=/c/dev/node24:$PATH` (Git Bash).
- Line numbers in the T and U tasks point at `main` @ 25c4c4f. `demo-v2` changed the
  presets (four teams: JOB HUNT, INBOX, MONEY, HOME), the ask cap, the scripted first
  minute and the phone bottom sheets. Find each spot with `graft grep "<symbol>"`
  before editing, and treat the old names (AMEX, HEDGE, CHECK, ADA) as
  "the equivalent in demo-v2".
- Make one commit per task, and put the task id in the message, e.g. `U1: open the phone valley at readable zoom`.
- After each phase: `npm run build && npm run lint`, then
  `npx vite preview --port 4180 --strictPort` (in the background),
  `node _qa/drive.mjs http://localhost:4180/` and
  `node _qa/drive.mjs http://localhost:4180/ phone`. Every check must be true, with
  `errors: none`. Look at the phone screenshots yourself. Add a drive.mjs assertion
  for each task's **Verify** where it can be scripted.
- If a task conflicts with something `demo-v2` already did, keep the `demo-v2`
  behavior and note it in the commit message.

## Phase 1 — Bugs that break things (do first)

**T1 · Cap agent backlog.** `sim.ts` `inflow()` pushes into `a.backlog` with no cap
(main l.977). Add `if (a.backlog.length >= 12) return;` before the push.
Verify: a blocked agent's `backlog.length` stops growing (`window.__sim`).

**T2 · Resume panning after a pinch.** `sim.ts` `onUp()` sets `drag=null` when a pinch
ends with one finger still down. If `this.pts.size===1` after the pinch, re-arm the
pan: `const [rem]=[...this.pts.entries()]; this.drag={kind:'pan',sx:rem[1].x,sy:rem[1].y,ox:this.pan.x,oy:this.pan.y,moved:true};`
Verify: pinch, lift one finger, drag, and the view pans.

**T3 · Error boundary.** No error boundary exists, and `renderVals()` in `App.tsx`
runs unguarded. Add `src/ui/ErrorBoundary.tsx` as a class using
`getDerivedStateFromError`. It shows "Something broke." and a `Start over` button that
runs the same storage clear as `resetYes`. Wrap `<App/>` in `main.tsx`.
Verify: add a temporary throw in `renderVals`, see the boundary instead of a blank page, then revert.

**U6 · LATER must snooze.** `act()` has no `'skip'` branch. The ask vanishes but the
agent stays stuck forever, and orphans block new events through `nBlk<2`. For
`'skip'`, re-queue the need after 60 s (use `snoozeUntil` and filter it out of PIP's
list), then post `card('YOU', path, a.name, " can wait. I'll bring it back in a minute.")`.
Verify: tap LATER, wait 61 s, and the ask is back.

**U4 · No orphan stuck agent.** Presets copy `extra.blocked` from seed without a
matching need, so an agent is red with nothing to fix. In `placeManagerAndTeams()`,
strip `blocked` from `a.extra`. The tour stop 1 check accepts `unblock` of any agent.
Verify: 0 blocked agents before tour stop 1, and exactly 1 during it.

## Phase 2 — Sleek phone (the one change that sells it)

**U1 · Open the phone valley readable.** When `innerWidth<560`, clamp the `fitView()`
zoom to at least 0.7. After a skip, center on PIP plus the first manager's floors
(`centerOnTeam`, maxZoom 1).
Verify: at 390×844 after `__sim.skipIntro()`, `__sim.zoom>=0.7`.

**V4 · Nothing cut off after hiring.** On a phone, after the intro and after closing the
sheet, fit the view so no team box is clipped at the screen edge. demo-v2 shows "B HUNT"
cut off on the left.

**U2 · Chrome recedes (phone, width ≤ 560).** Change only the narrow layout:
- Drop the "live · N agents" line.
- Collapse the mood legend into a 44×44 `?` chip that opens a sheet with the 5 moods and `Start over` (RESET moves here).
- Hide `−`, `%` and `+`, because pinch works. Keep FIT as a 44 px icon.
- Replace the dock with one 56 px `+` button at the bottom right. It opens a sheet with `+ Manager`, `+ Team`, then the tools (Tools, Data, Notes, Recorder).
- Use 16 px side gutters.
Verify: the world takes at least 75% of the height, and only `?`, FIT, `+` and the feed pill are visible.
HIG: designing-for-ios, layout (progressive disclosure; controls apart from content).

**U5 · One primary action.** Add a bottom-center pill, 48 px tall, filled ink, 15 px
bold: `3 things need you →`, using the live count from `m.needs`. It opens PIP's sheet.
With nothing open it reads `All clear`, outlined and inert. Use it on desktop too, where it replaces the 9 px badge on PIP as the main cue.
Verify: the pill text matches the needs count, and a tap opens the PIP sheet.

## Phase 3 — First visit flows without dead ends

**U10 · Greeting button.** When the greeting finishes typing, show a full-width `Let's go`, which moves on to the first question.

**U9 · Camera follows each hire.** After each HIRE, `fitView(cardHeight+40, 1.1)` so the new floors sit above the card. In `AddTeamCard`, delete the duplicate "Want to add your own?" heading.

**U3 · Popups never cover the tour.** In `unblock()`, when `tourOn` is true, set
`this.sel=null` after `tourAdvanceAfterFix()`. In `placeFurn()`, don't auto-select
while `tourOn` is true. This applies to the bottom sheets too.
Verify: after the fix in stop 1, `__sim.sel===null` and NEXT is the element at its center.

**U14 · Two-stop tour.** End the tour after the fix. Show the tools tip and the recorder tip the first time the `+` sheet opens (from U2), once each.
Goal: from wake to your own valley in 60 s or less. After U2.

**U8 · Show PIP's closing line.** `tourEnd()` sets the speech after `tourOn=false`, so it never renders. Show "It's yours now…" for 5 s, or until tapped, through an `outroUntil` flag in `Tour.tsx`.

**U7 · An idle valley stays healthy.** In `step()`, a bored agent picks up a task from
`T.pool` with probability 0.5 per tick. Keep demo-v2's halved stuck and ask rates.
Verify: after 90 s idle, at least 60% of agents are working or in flow.

## Phase 4 — Polish and consistency

**V1 · Manager count.** The title bar and feed header say "3 managers" with only DASH and OTTO on screen. Don't count PIP.
**V2 · Feed tag.** The "PIP noticed within 2 seconds" card is tagged YOU. Tag it PIP.
**V5 · Plurals.** "1 teams running" should read "1 team running". Check every `N x` string.

**U12 · One vocabulary for moods.** Use only STUCK, UNSURE, SWAMPED, BORED and FLOW (`constants.ts` MOOD, `thought()`). The why texts become `needs you`, `waiting for your OK` and `too much queued`.
Verify: grep finds no FRUSTRATED, STALLED or OVERWHELMED in the UI.

**U13 · Quieter feed.** Pin open asks at the top, with their action buttons (reuse `act`). Fold DONE cards into one row: `12 things done in the last few minutes ▸`, which expands. Drop "(via …)". The recap starts with `Last 10 min: `.
Verify: the phone feed shows asks first, with at most 1 DONE row.

**U11 · Type, hit size, contrast (Apple HIG).**
- UI type scale 11/13/15/17. Card body is 15. Buttons are 15 bold with `min-height:44px`.
- Every button and link is at least 44×44.
- World labels use `font-size: max(7.5px, 11px/zoom)`.
- Replace text color `#9a988f` with `#6b6a62`.
Verify: a drive.mjs check finds no `button` or `a` rect under 44 px.

**V3 / V6 · Label overlaps.** Object labels are covered by helper sprites (DATA on desktop, tour stops on phone), and manager role text is clipped. Offset object labels below their icon and keep sprites out of that band.

## Phase 5 — Health for release

**T4 · Stop the 60 Hz full re-render.** `start()` calls `notify()` every frame, which runs `setTick` across the whole tree. Notify only when state is dirty, a drag is in progress, pulses are active, or on a low-rate heartbeat.
Verify: in the React Profiler, well under 300 top-level renders in an idle 5 s.

**T5 · A real save migration.** `load()` accepts `v` 3 or 4, but nothing writes 4. Add `migrate(s)`, which fills defaults for every field added since v3. Bump the saved `v` whenever demo-v2 changed the shape. An old save from the live site must load without throwing.

**U15 + T6 · Accessibility.**
- Close buttons get `aria-label="Close"`.
- Agents, floors, managers and dock/`+` items get `role="button" tabIndex={0}`, an `aria-label` like `${name}, ${mood}`, and Enter or Space activates them.
- The feed gets `aria-live="polite"`.
- Under `prefers-reduced-motion: reduce`, speech shows instantly and bob, pulse and aura stop.

## Later — not part of this work order

**Seam for real agents.** Split `Sim.step()` into a pure `applyEvent(m, event)` reducer
with a typed event union, plus a producer: random now, and a live agent stream later.
Do this after the demo is signed off, on its own branch.

## When done

Push `demo-v2`, report the Vercel preview URL, and list each task id as done, skipped
(with the reason) or changed. Do not open a PR to `main` until the owner approves the preview.
