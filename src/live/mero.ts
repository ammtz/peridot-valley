// M8, second slice: the valley reads MERO v2's ledger through `mero serve`.
//
// `mero serve` (ammtz/MERO, mero/serve.py) flattens each ledger event to the shape
// src/live/events.ts already reads (`at`, `job`, `event`, plus the body), and adds
// `seq`, `actor`, `run` and `task`. A laptop job's events come out exactly as the
// automations wrote them, so they keep their M8 meaning (toAction). Everything else
// is said by an agent (VIC, JEV, L2, or an L1/L0 worker), by you, or by the system,
// and this module says what each of those means in the valley.
//
// Pure, like events.ts: no DOM, no fetch, no Sim. Moods are never computed here:
// they come from MERO's /views (mood is derived there, from the ledger), and this
// module only translates the six names into the valley's.

import type { Mood } from '../model/types';
import { toAction, type LiveAction, type LiveTally, type MeroEvent } from './events';

/** MERO's roles (mero/vocab.py ROLES). An actor is `role` or `role:name`. */
export const AGENT_ROLES = ['vic', 'jev', 'l2', 'l1', 'l0'] as const;

export function roleOf(actor: string): string {
  return actor.split(':', 1)[0];
}

/** Who holds an event in the valley: a laptop job's creature, a MERO agent's creature, or nobody (you, sys). */
export type Holder = { team: 'jobs'; key: string } | { team: 'mero'; key: string } | { team: null; key: string };

export function holderOf(e: MeroEvent): Holder {
  const actor = typeof e.actor === 'string' ? e.actor : null;
  // The dev file source has no actor: every line there is a laptop job.
  if (actor === null || roleOf(actor) === 'job') return { team: 'jobs', key: e.job };
  if ((AGENT_ROLES as readonly string[]).includes(roleOf(actor))) return { team: 'mero', key: actor };
  return { team: null, key: actor };
}

/** The ledger actor a creature stands for, so /views moods can find it. */
export function actorOf(h: Holder): string | null {
  return h.team === 'jobs' ? 'job:' + h.key : h.team === 'mero' ? h.key : null;
}

/** `vic` → `VIC`, `l0:fix-tests` → `L0 FIX-TESTS`. */
export function creatureName(actor: string): string {
  const i = actor.indexOf(':');
  return i < 0 ? actor.toUpperCase() : `${actor.slice(0, i)} ${actor.slice(i + 1)}`.toUpperCase();
}

const ROLE_LABEL: Record<string, string> = {
  vic: 'chief of stuff (MERO)',
  jev: 'router (MERO)',
  l2: 'lead (MERO)',
  l1: 'worker (MERO)',
  l0: 'worker (MERO)',
};
export function creatureRole(actor: string): string {
  return ROLE_LABEL[roleOf(actor)] || roleOf(actor);
}

/** MERO's six moods (mero/views.py) in the valley's words. Anything else is not a mood: null, never a guess. */
const MOODS: Record<string, Mood> = {
  stuck: 'frustrated',
  unsure: 'stalled',
  swamped: 'overwhelmed',
  bored: 'bored',
  flow: 'flow',
  working: 'working',
};
export function toMood(m: unknown): Mood | null {
  return typeof m === 'string' && Object.hasOwn(MOODS, m) ? MOODS[m] : null;
}

/** The `moods` object of a /views answer, translated. Unknown names are left out. */
export function moodsFrom(views: unknown): Record<string, Mood> | null {
  const v = views as { mero?: unknown; moods?: unknown } | null;
  if (!v || v.mero !== 1 || !v.moods || typeof v.moods !== 'object') return null;
  const out: Record<string, Mood> = {};
  for (const [actor, m] of Object.entries(v.moods as Record<string, unknown>)) {
    const md = toMood(m);
    if (md) out[actor] = md;
  }
  return out;
}

export type MeroAction =
  | LiveAction
  /** Something the creature is busy with now. */
  | { kind: 'doing'; job: string; text: string }
  /** A good result that also clears a failed check, without a card of its own. */
  | { kind: 'clear'; job: string; text: string }
  /** An approval.ask: PIP asks you about it. */
  | { kind: 'ask'; job: string; text: string; seq: number | null }
  /** Your answer to an ask. */
  | { kind: 'answer'; job: string; text: string; ask: number | null; yes: boolean }
  /** A model call: no card, the ticker counts it. */
  | { kind: 'cost'; job: string; text: string };

const str = (v: unknown, or = ''): string => (typeof v === 'string' && v ? v : or);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** What one event from `mero serve` means in the valley. Unknown kinds become a note: shown, not dropped. */
export function meroAction(e: MeroEvent): MeroAction {
  const h = holderOf(e);
  if (h.team === 'jobs') return toAction(e);
  const job = h.key;
  switch (e.event) {
    case 'run.start':
      return { kind: 'doing', job, text: `Started a run: ${str(e.goal, 'no goal given')}` };
    case 'run.end':
      return { kind: 'note', job, text: `Run ${str(e.status, 'ended')}${e.summary ? ': ' + str(e.summary) : ''}` };
    case 'task.new':
      return { kind: 'note', job, text: `New task ${str(e.task, '?')}: ${str(e.title)}` };
    case 'task.assign':
      return { kind: 'note', job, text: `Gave task ${str(e.task, '?')} to ${creatureName(str(e.to, '?'))}${e.tier ? ` on ${str(e.tier)}` : ''}` };
    case 'task.state':
      return { kind: 'note', job, text: `Task ${str(e.task, '?')} is ${str(e.state, '?')}${e.reason ? ': ' + str(e.reason) : ''}` };
    case 'step.start':
      return { kind: 'doing', job, text: str(e.what, 'A step') };
    case 'step.end':
      return e.ok === true
        ? { kind: 'done', job, text: 'Finished a step' }
        : { kind: 'note', job, text: `A step did not work${e.why ? ': ' + str(e.why) : ''}` };
    case 'tool.call':
      return { kind: 'doing', job, text: `Using ${str(e.tool, 'a tool')}` };
    case 'tool.result': {
      const exit = num(e.exit);
      if (exit === 0) return { kind: 'clear', job, text: 'Tool finished' };
      return { kind: 'stuck', job, text: `A tool failed with exit ${exit ?? '?'}` };
    }
    case 'verify': {
      if (e.ok === true) return { kind: 'done', job, text: 'Checks passed' };
      const cmd = e.cmd ? ` (${str(e.cmd)})` : '';
      return { kind: 'stuck', job, text: `Checks failed with exit ${num(e.exit) ?? '?'}${cmd}` };
    }
    case 'model.call': {
      const tokens = (num(e.tokens_in) ?? 0) + (num(e.tokens_out) ?? 0);
      return { kind: 'cost', job, text: `Asked ${str(e.model, 'a model')} (${tokens} tokens, $${(num(e.cost_usd) ?? 0).toFixed(4)})` };
    }
    case 'escalate':
      return { kind: 'note', job, text: `Moved task ${str(e.task, '?')} up from ${str(e.from_tier)} to ${str(e.to_tier)}: ${str(e.signal)}` };
    case 'hop':
      return { kind: 'note', job, text: `Handed off to ${creatureName(str(e.to, '?'))}${e.why ? ': ' + str(e.why) : ''}` };
    case 'approval.ask':
      return { kind: 'ask', job, text: str(e.what, 'something'), seq: num(e.seq) };
    case 'approval.give': {
      const yes = e.decision === 'yes';
      return { kind: 'answer', job, text: `Said ${yes ? 'yes' : 'no'} to ask ${num(e.ask) ?? '?'}${e.why ? ': ' + str(e.why) : ''}`, ask: num(e.ask), yes };
    }
    case 'note':
      return { kind: 'note', job, text: str(e.text) };
    case 'policy':
      // mero serve's envelope `actor` (sys:policy) overwrites the body's `actor` (who wanted it), so it isn't named here.
      return { kind: 'note', job, text: `Policy: ${str(e.verdict, '?')} for ${str(e.class, '?')} action ${str(e.action, '?')}` };
    case 'tier.pick':
      return { kind: 'note', job, text: `Picked ${str(e.tier, '?')} for task ${str(e.task, '?')}${e.blueprint ? ` with blueprint ${str(e.blueprint)}` : ''}` };
    case 'route.miss':
      return { kind: 'note', job, text: `No blueprint fits task ${str(e.task, '?')}: ${str(e.reason)}` };
    case 'blueprint.use':
      return { kind: 'note', job, text: `Using blueprint ${str(e.name, '?')} for task ${str(e.task, '?')}` };
    case 'blueprint.write':
      return { kind: 'note', job, text: `Wrote blueprint ${str(e.name, '?')}` };
    case 'blueprint.retire':
      return { kind: 'note', job, text: `Retired blueprint ${str(e.name, '?')}: ${str(e.why)}` };
    case 'refused':
      return { kind: 'note', job, text: `Refused a ${str(e.kind, '?')}: ${str(e.why)}` };
    default:
      return { kind: 'note', job, text: `Said ${e.event}` };
  }
}

export interface MeroCost {
  usd: number;
  tokens: number;
  calls: number;
}
export const NO_COST: MeroCost = { usd: 0, tokens: 0, calls: 0 };

/** Add the model.call events in `events` to a running total. Only real model.call fields count. */
export function addCost(c: MeroCost, events: MeroEvent[]): MeroCost {
  let { usd, tokens, calls } = c;
  for (const e of events) {
    if (e.event !== 'model.call' || holderOf(e).team === 'jobs') continue;
    usd += num(e.cost_usd) ?? 0;
    tokens += (num(e.tokens_in) ?? 0) + (num(e.tokens_out) ?? 0);
    calls++;
  }
  return { usd, tokens, calls };
}

const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n));
const money = (usd: number) => '$' + (usd > 0 && usd < 1 ? usd.toFixed(4) : usd.toFixed(2));

/** The title-bar line while `mero serve` is connected. `jobs` is the laptop-jobs part, if any ran. */
export function meroTickerText(o: { agents: number; cost: MeroCost; openAsks: number; jobs?: string | null }): string {
  const parts = [`mero: ${o.agents} ${o.agents === 1 ? 'agent' : 'agents'}`];
  parts.push(`${money(o.cost.usd)} · ${compact(o.cost.tokens)} tokens in ${o.cost.calls} ${o.cost.calls === 1 ? 'call' : 'calls'}`);
  if (o.openAsks) parts.push(`${o.openAsks} ${o.openAsks === 1 ? 'ask' : 'asks'} open`);
  if (o.jobs) parts.push(o.jobs);
  return parts.join(' · ');
}

/** The laptop-jobs part of the MERO ticker. Its cost is MERO's model.call total, so none here. */
export function jobsPart(t: LiveTally): string | null {
  if (!t.runsToday && !t.failuresToday) return null;
  return `laptop jobs ${t.runsToday} ${t.runsToday === 1 ? 'run' : 'runs'} today${t.failuresToday ? `, ${t.failuresToday} failed` : ''}`;
}

/** The text of PIP's ask for an approval.ask. Answering happens in MERO; the valley only reads. */
export function askText(name: string, what: string, seq: number | null): string {
  return `${name} asks: ${what}. Answer in MERO: mero approve ${seq ?? '?'}`;
}
