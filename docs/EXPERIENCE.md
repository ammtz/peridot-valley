# The first five minutes — spec

Andres, 2026-09-25: "I don't want to share this and have them see everything at
once. I want them to have the experience of building one for themselves, so
they ask themselves the questions and build the system they need." This file is
the contract for that. Keep it simple: no new libraries, no new screens beyond
what is named here, same look (ink on paper, JetBrains Mono, hard shadows).

## 1. The opening

A first-time visitor lands on an **empty dotted canvas with PIP alone** in the
middle, eyes closed, and one line under it: `tap to wake`. Nothing else: no
dock, no feed, no zoom controls.

Tap → PIP opens its eyes, bobs, and speaks in a speech card under it, typed out
at about 40 characters a second (tap to finish the line instantly):

> Hi. I'm PIP. I run a team of helpers so you don't have to watch them.
> Two questions, and I'll hire your first team.

**Revised 2026-09-26, Andres: "less is more."** Down from three questions and
eight presets to two questions and four use cases — see the note at the end of
this section.

A small text link bottom-center the whole time: `skip — show me a full valley`,
which loads the existing seed world exactly as it is today and ends the intro.

## 2. Two questions (the decision tree)

Asked one at a time in the speech card, with big answer buttons under it
(full-width on a phone, thumb-sized).

1. **Should they check with you before anything important?** →
   `Yes, ask me first` · `No, just handle it`
2. **What should your helpers take off your plate first?** → `Job hunt` ·
   `Inbox & calendar` · `Money & bills` · `Home & family`

Q2 picks the preset (4 presets, in `src/model/presets.ts`, plain data). Q1 is a
modifier:

- `Yes, ask me first` → the fear roll is doubled (more UNSURE agents asking for
  your OK) and a NOTES shelf with **Ask before acting** switched on is placed
  beside the first team. Asks are never auto-resolved.
- `No, just handle it` → the fear roll is halved, agents reach flow a little
  more often, and PIP resolves most asks itself — a HANDLED feed card instead
  of an interruption.

Each of the 4 answers hires **one manager running one team of 3 helpers** —
JOB HUNT (SCOUT, FIT, PEN), INBOX (SORT, REPLY, CAL), MONEY (BILLS, SUBS,
WATCH), or HOME (KIN, CART, FIX). The full valley (the skip link, or a
returning visitor with no saved state) hires all four at once, as PIP plus
DASH (WORK: JOB HUNT, INBOX) and OTTO (HOME & MONEY: MONEY, HOME) — 2
managers, 4 teams, 12 helpers.

## 3. The hiring

PIP: `Here's who I'd hire.` Then one **hire card** at a time in the speech card:

> **ADA** · would run **MONEY** — 2 teams, 6 helpers
> `HIRE` · `RENAME` · `SKIP`

- `HIRE` → the manager pops in (outBack) under PIP, then its team floors sprout
  one by one and the agents hop in to their desks. Pan and zoom gently follow so
  the new thing is in view.
- `RENAME` → an inline input (uppercase, 14 characters max); Enter hires under
  the new name.
- `SKIP` → next card.

After the last card: `Want to add your own?` with an input
`name a team, e.g. TRAVEL` and `ADD` / `I'm done`. ADD creates a team under PIP
with that name, 2 agents and the generic task pool. Up to 3 times.

If everything was skipped, PIP says `Fine, I'll start small.` and hires the
first card anyway.

## 4. The tour (four stops, then it's theirs)

Each stop is the speech card plus a **spotlight**: the rest of the screen dims
to about 35% and a rounded cut-out frames the thing being talked about. The
dock, feed and zoom controls fade in at the stop that needs them. Every stop has
`NEXT` and a small `skip tour`.

1. **Reporting.** `Everyone reports up. When someone finishes a job, it travels
   the lines to me, and I tell you.` Force a completion so a pulse travels while
   this is on screen. The feed slides in.
2. **Moods.** `Colours are moods. Green is flow, orange is swamped, red means
   stuck. One of them is stuck right now. Tap them.` Force one agent blocked.
   The stop waits (NEXT hidden) until the user opens that agent and presses its
   fix button, then: `That's the job. You only step in when it matters.`
3. **Tools.** Dock fades in. `These are tools. Drag one next to a team and
   they'll use it. Hover or hold one to see what it does.` NEXT appears after
   one tool is placed, or after 12 seconds.
4. **The recorder.** Spotlight the RECORDER tile. `The recorder watches a team
   for you and sends a recap on a schedule. Drop it near the team you care
   about.` NEXT after it is placed or 12 seconds.

End: `It's yours now. Drag anything, rename anything, hire more from the dock.
I'll be up here.` The spotlight lifts and the normal app runs.

## 5. Tool tips on the dock

Hover (desktop) or press-and-hold 400 ms (touch) on a dock tile shows a small
card above it (panel fill, 2px ink border, hard shadow, max 200px):

- **TOOLS** — Plugs the team into your apps: Gmail, Calendar, Drive, your bank.
- **DATA** — Something to look things up in: receipts, contacts, records.
- **NOTES** — Your rules and preferences, so they act the way you would.
- **RECORDER** — Watches a team and sends you a recap on a schedule.

Plain words for normal people, added 2026-09-26: the dock used to read MCP, DB,
CONTEXT, REC. The internal type keys (`mcp`, `db`, `books`, `rec`) didn't move.

A quick tap still places the tool as today; the tip must not block that.

## 6. The recorder (replaces GRAPH)

Remove the STRATEGY BOARD from the dock. Add furniture type `rec`:

- **Icon** (48×48, div shapes like the others): a camcorder body, a lens circle,
  a small viewfinder on top, and a red dot that blinks while it is recording.
  The red `#d63c2f` dot is the only colour on it.
- Label `RECORDER` / short `REC`. Range ring and dotted links as other furniture,
  but **agents do not walk to it** (it watches; nothing to use).
- Options (one on at a time, radio style): `Every 10 min` (default) ·
  `Every hour` · `Daily digest` · `Only when someone's stuck`.
- **Demo time:** 10 minutes = 45 real seconds, hour = 90 s, daily = 180 s. The
  popup says so in its hint line: `demo clock — 10 min passes in 45 s`.
- Each period, for the teams in range, post a **RECAP** feed card (filled ink
  badge, like STUCK): `RECAP · FINANCE, MARKETS — last 10 min: 5 done, 1 stuck
  (CHECK: Amex login expired), 1 waiting on you.` Count from what actually
  happened in that window; keep a small per-team log of completions, blocks and
  fears since the last recap. `Only when someone's stuck` posts only when a
  team in range has a blocked agent, at most once per block.
- The recorder's popup shows `LAST RECAP` (the text) and `NEXT IN 0:32`.
- Any old saved state containing `board` furniture: drop those items on load.

## 7. Persistence and replay

- `onboarded: true` is saved with the model once the tour ends or is skipped.
  A returning visitor goes straight to their valley.
- **RESET** now asks `Start over?` with `YES, FROM SCRATCH` (clears storage and
  replays the opening) and `CANCEL`.
- Share-friendly: `?fresh` in the URL forces the opening even if storage exists,
  without deleting it until they finish.

## 8. Done means

- A stranger on a phone can go from `tap to wake` to their own valley, hire,
  rename, add a team, finish the tour, and never need instructions.
- All four presets load without errors, and each has a stuck-able agent for
  tour stop 2.
- The recorder posts real recaps from real sim events.
- `npm run build` is green; `_qa/drive.mjs` is updated to walk the opening
  (wake → two answers → hire → tour with the fix → end) and to check zero
  console errors, desktop and phone.

**Added 2026-09-26** (Andres's "less is more" pass): PIP shows at most 3 open
asks, never two with the same text. The full valley plays a once-per-save
45–60s scripted morning (SCOUT finds postings, BILLS gets stuck on a bank
login, PIP flags it in 2 seconds, a recap follows the fix) before settling
into the calmer normal sim. Popups and the feed open as a phone bottom sheet
(≤55% of the viewport) so the town stays visible above.
