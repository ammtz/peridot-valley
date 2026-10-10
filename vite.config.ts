import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

// M8 slice: serve the laptop automations' event log to the valley, in dev only.
// `configureServer` exists only in `vite dev`, so the built site on Vercel has no
// such route and src/live/feed.ts switches itself off there.
//
// The log defaults to the MERO vault next to this repo (C:/MER/mero_v01). Point
// MERO_EVENTS elsewhere to use another file. GET /__mero/events?after=N answers
// with the events on lines after N, and the cursor for the next call.
function meroEvents(): Plugin {
  const here = dirname(fileURLToPath(import.meta.url))
  const file = process.env.MERO_EVENTS || resolve(here, '../mero_v01/.automations/events.jsonl')
  return {
    name: 'mero-events',
    configureServer(server) {
      server.middlewares.use('/__mero/events', (req, res) => {
        const after = Math.max(0, Number(new URL(req.url || '', 'http://x').searchParams.get('after')) || 0)
        let lines: string[] = []
        try {
          lines = readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim())
        } catch {
          /* no log yet: connected, nothing to show */
        }
        // A log shorter than the cursor was rotated or cleared: start over from its top.
        const from = lines.length < after ? 0 : after
        const events = lines.slice(from).flatMap((l) => {
          try {
            return [JSON.parse(l)]
          } catch {
            return []
          }
        })
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify({ mero: 1, source: file, events, next: lines.length }))
      })
    },
  }
}

// P11: every build writes dist/version.json naming the commit it was built from,
// so the live site says what it serves. Vercel and GitHub Actions hand us the SHA;
// a local build asks git. No SHA at all fails the build rather than lying.
function versionJson(): Plugin {
  return {
    name: 'version-json',
    apply: 'build',
    generateBundle() {
      const commit =
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.GITHUB_SHA ||
        execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
      if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`version.json: not a full commit SHA: ${commit}`)
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ commit, built: new Date().toISOString() }) + '\n',
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), meroEvents(), versionJson()],
})
