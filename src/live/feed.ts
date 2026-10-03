// Where real events come from. One small interface, so MERO v2's ledger (M2) can
// replace the dev source without the valley changing.
//
// Two sources: MERO v2's ledger through `mero serve` (when VITE_MERO_URL is set), and
// otherwise the Vite dev server (see vite.config.ts), which reads the laptop
// automations' event log from disk. The deployed site has no such route, so the
// first poll comes back empty-handed, the feed switches itself off, and the live
// demo stays exactly as it was.

import { isEvent, type MeroEvent } from './events';
import { moodsFrom } from './mero';
import type { Mood } from '../model/types';

export interface LiveBatch {
  events: MeroEvent[];
  next: number;
  /** Each ledger actor's mood, from MERO's /views. Only a source that knows moods sets it. */
  moods?: Record<string, Mood>;
}

export interface EventSource {
  /** Events after cursor `after`, and the cursor for the next call. `null` means this source isn't available here. */
  poll(after: number): Promise<LiveBatch | null>;
}

export const devServerSource: EventSource = {
  async poll(after) {
    try {
      const res = await fetch(`/__mero/events?after=${after}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const body = await res.json();
      // A static host answers unknown paths with index.html; the marker tells the two apart.
      if (!body || body.mero !== 1 || !Array.isArray(body.events)) return null;
      return { events: body.events.filter(isEvent), next: Number(body.next) || 0 };
    } catch {
      return null;
    }
  },
};

/** `mero serve` answers at most this many events per /events call (mero/serve.py). */
const MERO_PAGE = 1000;

/**
 * MERO v2's ledger, read through `mero serve` (GET /events?after=SEQ and GET /views).
 * The cursor is the ledger's seq. One poll drains every page, so a long history still
 * arrives as one batch (and lands quietly), and then asks /views for the moods. A
 * /views that fails leaves moods unknown for that poll; it never makes them up.
 */
export function meroServeSource(base: string, get: typeof fetch = (...a) => fetch(...a)): EventSource {
  const root = base.replace(/\/+$/, '');
  const json = async (path: string): Promise<unknown> => {
    const res = await get(root + path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  };
  return {
    async poll(after) {
      const events: MeroEvent[] = [];
      let next = after;
      try {
        for (let page = 0; page < 50; page++) {
          const body = (await json(`/events?after=${next}`)) as { mero?: unknown; events?: unknown; next?: unknown } | null;
          if (!body || body.mero !== 1 || !Array.isArray(body.events)) return null;
          events.push(...body.events.filter(isEvent));
          next = Number(body.next) || next;
          if (body.events.length < MERO_PAGE) break;
        }
      } catch {
        return null;
      }
      let moods: Record<string, Mood> | undefined;
      try {
        moods = moodsFrom(await json('/views')) ?? undefined;
      } catch {
        /* moods stay unknown this time */
      }
      return { events, next, moods };
    },
  };
}

/**
 * Which source this build reads. With VITE_MERO_URL set (e.g. http://127.0.0.1:8765 for
 * `python -m mero serve`), MERO's ledger; otherwise the dev server's laptop-jobs log, as
 * before. The deployed site sets neither, so it stays the simulated demo.
 */
export function pickSource(meroUrl: string | undefined, get?: typeof fetch): EventSource {
  return meroUrl && meroUrl.trim() ? meroServeSource(meroUrl.trim(), get) : devServerSource;
}

/**
 * Poll `src` until stopped. The first batch is the history so far (`initial = true`),
 * so the valley can catch up quietly instead of replaying a day of cards. Returns a
 * stop function. If the source is unavailable on the first poll, polling stops for good.
 */
export function startLiveFeed(
  src: EventSource,
  onEvents: (events: MeroEvent[], initial: boolean, moods?: Record<string, Mood>) => void,
  intervalMs = 4000,
): () => void {
  let cursor = 0;
  let first = true;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    if (stopped) return;
    const got = await src.poll(cursor);
    if (stopped) return;
    if (got === null) {
      if (first) return; // not here (the deployed site): stay off
    } else {
      cursor = got.next;
      onEvents(got.events, first, got.moods); // empty batches too: the valley may be ready for creatures now
      first = false;
    }
    timer = setTimeout(tick, intervalMs);
  };
  void tick();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
