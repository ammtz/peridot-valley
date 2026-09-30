// Where real events come from. One small interface, so MERO v2's ledger (M2) can
// replace the dev source without the valley changing.
//
// Today's source is the Vite dev server (see vite.config.ts), which reads the laptop
// automations' event log from disk. The deployed site has no such route, so the
// first poll comes back empty-handed, the feed switches itself off, and the live
// demo stays exactly as it was.

import { isEvent, type MeroEvent } from './events';

export interface EventSource {
  /** Events after line `after`, and the cursor for the next call. `null` means this source isn't available here. */
  poll(after: number): Promise<{ events: MeroEvent[]; next: number } | null>;
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

/**
 * Poll `src` until stopped. The first batch is the history so far (`initial = true`),
 * so the valley can catch up quietly instead of replaying a day of cards. Returns a
 * stop function. If the source is unavailable on the first poll, polling stops for good.
 */
export function startLiveFeed(
  src: EventSource,
  onEvents: (events: MeroEvent[], initial: boolean) => void,
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
      onEvents(got.events, first); // empty batches too: the valley may be ready for creatures now
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
