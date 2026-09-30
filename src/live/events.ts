// M8 slice (2026-09-30): the valley's first real input.
//
// Everything else in Peridot is simulated. This module turns *real* events — today
// the laptop automations' log (mero_v01/.automations/events.jsonl), later MERO v2's
// ledger (M2) — into things the valley can show. It is pure: no DOM, no fetch, no
// Sim, so it can be tested on its own and the source can change without touching it.
//
// One event per line, always with `at`, `job` and `event`; the rest depends on the
// event (see mero_v01/automations/events.py). Unknown events are shown, not dropped:
// a real system doing something the valley doesn't understand yet is exactly what
// you want to see.

export interface MeroEvent {
  at: string;
  job: string;
  event: string;
  [field: string]: unknown;
}

export type LiveAction =
  | { kind: 'start'; job: string; text: string }
  | { kind: 'done'; job: string; text: string }
  | { kind: 'stuck'; job: string; text: string }
  | { kind: 'report'; job: string; text: string }
  | { kind: 'note'; job: string; text: string };

/** Parse JSON lines, keeping only well-formed events. A torn last line is skipped, not fatal. */
export function parseEvents(text: string): MeroEvent[] {
  const out: MeroEvent[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (isEvent(e)) out.push(e);
    } catch {
      /* a line still being written */
    }
  }
  return out;
}

export function isEvent(e: unknown): e is MeroEvent {
  const o = e as Record<string, unknown> | null;
  return !!o && typeof o.at === 'string' && typeof o.job === 'string' && typeof o.event === 'string';
}

/** The creature's name for a job: `notion-cleanup` → `NOTION-CLEANUP`. */
export function jobName(job: string): string {
  return job.toUpperCase();
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** What one real event means in the valley. */
export function toAction(e: MeroEvent): LiveAction {
  const job = e.job;
  switch (e.event) {
    case 'job.start':
      return { kind: 'start', job, text: 'Running now' };
    case 'job.end': {
      const exit = num(e.exit);
      const secs = num(e.seconds);
      const took = secs === null ? '' : ` in ${secs}s`;
      if (exit === 0) return { kind: 'done', job, text: `Finished a run${took}` };
      const why = exit === 124 ? 'timed out' : `failed with exit ${exit ?? '?'}`;
      return { kind: 'stuck', job, text: `Run ${why}. The log is in .automations/logs/${job}/` };
    }
    case 'job.skipped':
      return { kind: 'note', job, text: `Skipped: ${String(e.reason ?? 'no reason given')}` };
    case 'notion.cleanup': {
      const found = Array.isArray(e.findings) ? e.findings.length : 0;
      const fixed = Array.isArray(e.applied) ? e.applied.length : 0;
      return { kind: 'report', job, text: `Notion check: ${plural(found, 'thing')} to look at, ${fixed} fixed` };
    }
    default:
      return { kind: 'note', job, text: `Said ${e.event}` };
  }
}

export interface LiveTally {
  /** Finished runs (job.end) on the local calendar day of `today`. */
  runsToday: number;
  failuresToday: number;
  jobs: string[];
  last: { job: string; at: string; ok: boolean } | null;
  /** Sum of any `cost_usd` fields. The laptop jobs spend no tokens, so today this is 0; M2's events will carry cost. */
  costUsd: number;
}

export function tally(events: MeroEvent[], today: Date = new Date()): LiveTally {
  const day = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const t: LiveTally = { runsToday: 0, failuresToday: 0, jobs: [], last: null, costUsd: 0 };
  for (const e of events) {
    if (!t.jobs.includes(e.job)) t.jobs.push(e.job);
    const cost = num(e.cost_usd);
    if (cost !== null) t.costUsd += cost;
    if (e.event !== 'job.end') continue;
    const ok = num(e.exit) === 0;
    t.last = { job: e.job, at: e.at, ok };
    const when = new Date(e.at);
    if (!Number.isNaN(when.getTime()) && day(when) === day(today)) {
      t.runsToday++;
      if (!ok) t.failuresToday++;
    }
  }
  return t;
}

/** The one-line ticker for the title bar. */
export function tickerText(t: LiveTally): string {
  if (!t.jobs.length) return 'laptop jobs: connected, no runs yet';
  const parts = [`laptop jobs: ${plural(t.runsToday, 'run')} today`];
  if (t.failuresToday) parts.push(`${t.failuresToday} failed`);
  if (t.last) {
    const d = new Date(t.last.at);
    const hhmm = Number.isNaN(d.getTime()) ? '' : ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    parts.push(`last${hhmm} ${t.last.ok ? 'ok' : 'FAILED'}`);
  }
  parts.push(`$${t.costUsd.toFixed(2)}`);
  return parts.join(' · ');
}
