# Peridot Valley — The System (live agent-world demo)

A spin-off of Meridian Valley. Static Vite + React demo; no server, no APIs.

A playful, whiteboard-style demo of a personal AI orchestration setup: a prime
supervisor (PIP) running managers and team floors staffed by tiny agents.
Everything is draggable, tappable, and simulated client-side. Nothing connects
to a real backend — state lives in `localStorage`.

This is a Vite + React 18 + TypeScript static SPA, ported from the HTML/CSS
design reference and simulation logic in `docs/handoff/`.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build   # tsc -b && vite build, output in dist/
npm run preview # serve the production build locally
```

## Deploy (Vercel Hobby, free)

1. Push this repo to GitHub (or import directly from a local folder with the
   Vercel CLI).
2. In Vercel, "Add New Project" → import the repo.
3. Framework preset: **Vite**. Build command `npm run build`, output
   directory `dist` (Vercel usually detects this automatically).
4. Deploy. No environment variables, no server, no database — it's a static
   build. A custom domain is optional; the free `*.vercel.app` URL works.

## Reference

`docs/handoff/README.md` is the full spec (design tokens, layout, entities,
simulation rules, acceptance checklist). `docs/handoff/reference/` holds the
original HTML prototypes the seed data and sim logic were ported from.
