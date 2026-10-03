// M8, second slice: the valley reads MERO v2's ledger through `mero serve`. Same harness
// as tests/sim.test.ts (PR #3): `tsx --test tests/*.test.ts`. Until that lands:
// npx tsx --test tests/mero.test.ts
//
// The fixture is real `mero serve` output (GET /events?after=0 and GET /views) from a
// scratch ledger: a run where VIC starts, L2 plans, JEV picks a tier, L0 fails a check,
// pays for two model calls, passes, and asks to merge; L1 asks too and you say no; the
// policy engine rules on a push; a laptop job runs; and the bus refuses a forged answer.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isEvent, type MeroEvent } from '../src/live/events';
import { addCost, creatureName, holderOf, meroAction, meroTickerText, moodsFrom, NO_COST, toMood } from '../src/live/mero';
import { devServerSource, meroServeSource, pickSource, startLiveFeed } from '../src/live/feed';
import { Sim } from '../src/model/sim';
import { seed } from '../src/model/seed';

const data = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  },
  configurable: true,
});
beforeEach(() => data.clear());

const FIX = JSON.parse(readFileSync(new URL('./fixtures/mero-serve.json', import.meta.url), 'utf8'));
const EVENTS: MeroEvent[] = FIX.events.events;
const MOODS = moodsFrom(FIX.views)!;
const bySeq = (n: number) => EVENTS.find((e) => e.seq === n)!;

const make = () => {
  const s = new Sim();
  s.m = seed();
  s.m.onboarded = true;
  s.introOn = false;
  s.introPhase = null;
  return s;
};
const ev = (actor: string, event: string, extra: Record<string, unknown> = {}, seq = 100): MeroEvent => ({
  ...extra,
  seq,
  at: '2026-10-03T03:20:00+00:00',
  job: actor.startsWith('job:') ? actor.slice(4) : actor,
  event,
  actor,
  run: 'r1',
  task: 't1',
});

test('every event mero serve sends is one the valley reads', () => {
  assert.equal(EVENTS.length, 17);
  assert.ok(EVENTS.every(isEvent));
});

test('each actor has a place: agents and jobs get creatures, you and sys do not', () => {
  assert.deepEqual(holderOf(bySeq(1)), { team: 'mero', key: 'vic' });
  assert.deepEqual(holderOf(bySeq(5)), { team: 'mero', key: 'l0:fix-tests' });
  assert.deepEqual(holderOf(bySeq(15)), { team: 'jobs', key: 'notion-cleanup' });
  assert.deepEqual(holderOf(bySeq(13)), { team: null, key: 'you' });
  assert.deepEqual(holderOf(bySeq(14)), { team: null, key: 'sys:policy' });
  // The dev server's laptop-jobs lines have no actor: they stay laptop jobs.
  assert.deepEqual(holderOf({ at: 'x', job: 'mirror-refresh', event: 'job.start' }), { team: 'jobs', key: 'mirror-refresh' });
  assert.equal(creatureName('l0:fix-tests'), 'L0 FIX-TESTS');
  assert.equal(creatureName('jev'), 'JEV');
});

test('each MERO event means one thing, and an unknown one is shown, not dropped', () => {
  const kinds = EVENTS.map((e) => [e.event, meroAction(e).kind]);
  assert.deepEqual(kinds, [
    ['run.start', 'doing'],
    ['task.new', 'note'],
    ['tier.pick', 'note'],
    ['task.assign', 'note'],
    ['step.start', 'doing'],
    ['model.call', 'cost'],
    ['verify', 'stuck'],
    ['model.call', 'cost'],
    ['verify', 'done'],
    ['approval.ask', 'ask'],
    ['approval.ask', 'ask'],
    ['note', 'note'],
    ['approval.give', 'answer'],
    ['policy', 'note'],
    ['job.start', 'start'], // a laptop job keeps its M8 meaning
    ['job.end', 'done'],
    ['refused', 'note'],
  ]);
  assert.deepEqual(meroAction(bySeq(10)), { kind: 'ask', job: 'l0:fix-tests', text: 'merge claude/fix-tests into main', seq: 10 });
  assert.deepEqual(meroAction(bySeq(13)), { kind: 'answer', job: 'you', text: 'Said no to ask 11: not now', ask: 11, yes: false });
  assert.equal(meroAction(bySeq(7)).text, 'Checks failed with exit 1 (npm test)');
  assert.equal(meroAction(bySeq(4)).text, 'Gave task t1 to L0 FIX-TESTS on t0');
  assert.deepEqual(meroAction(ev('l2', 'sprint.signoff')), { kind: 'note', job: 'l2', text: 'Said sprint.signoff' });
  assert.equal(meroAction(ev('l0:x', 'tool.result', { exit: 2 })).kind, 'stuck');
  assert.equal(meroAction(ev('l0:x', 'tool.result', {})).kind, 'stuck'); // no exit code is a failure, never a pass
  assert.equal(meroAction(ev('l0:x', 'tool.result', { exit: 0 })).kind, 'clear');
});

test('moods are MERO\'s six, translated; anything else is left out, never guessed', () => {
  assert.equal(toMood('stuck'), 'frustrated');
  assert.equal(toMood('unsure'), 'stalled');
  assert.equal(toMood('swamped'), 'overwhelmed');
  assert.equal(toMood('bored'), 'bored');
  assert.equal(toMood('flow'), 'flow');
  assert.equal(toMood('working'), 'working');
  assert.equal(toMood('ecstatic'), null);
  assert.equal(toMood('toString'), null);
  assert.equal(MOODS['l0:fix-tests'], 'stalled'); // its merge ask is open
  assert.deepEqual(moodsFrom({ mero: 1, moods: { vic: 'stuck', jev: 'sleepy' } }), { vic: 'frustrated' });
  assert.equal(moodsFrom({ moods: { vic: 'stuck' } }), null); // not mero's answer
});

test('the ticker sums the real model calls: cost and tokens', () => {
  const c = addCost(NO_COST, EVENTS);
  assert.equal(c.calls, 2);
  assert.equal(c.tokens, 1200 + 300 + 1500 + 400);
  assert.ok(Math.abs(c.usd - FIX.views.cost.usd) < 1e-9, 'the same total MERO folds in /views');
  assert.equal(meroTickerText({ agents: 5, cost: c, openAsks: 1, jobs: null }), 'mero: 5 agents · $0.0048 · 3.4k tokens in 2 calls · 1 ask open');
  assert.equal(meroTickerText({ agents: 1, cost: { usd: 12.5, tokens: 2_400_000, calls: 900 }, openAsks: 0 }), 'mero: 1 agent · $12.50 · 2.4M tokens in 900 calls');
});

// ---------------------------------------------------------------- the source

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('the default source stays the dev server, so the deployed site is unchanged', () => {
  assert.equal(pickSource(undefined), devServerSource);
  assert.equal(pickSource('  '), devServerSource);
  assert.notEqual(pickSource('http://127.0.0.1:8765'), devServerSource);
});

test('the MERO source reads /events from the cursor, drains every page, and brings /views moods', async () => {
  const asked: string[] = [];
  const page = (from: number, n: number) => Array.from({ length: n }, (_, i) => ev('l0:a', 'note', { text: 'hi' }, from + i + 1));
  const get = (async (url: string) => {
    asked.push(url);
    const u = new URL(url);
    if (u.pathname === '/views') return reply(FIX.views);
    const after = Number(u.searchParams.get('after'));
    const events = after === 0 ? page(0, 1000) : page(after, 3);
    return reply({ mero: 1, events, next: after + events.length });
  }) as typeof fetch;
  const got = await meroServeSource('http://127.0.0.1:8765/', get).poll(0);
  assert.equal(got!.events.length, 1003);
  assert.equal(got!.next, 1003);
  assert.equal(got!.moods!['l0:fix-tests'], 'stalled');
  assert.deepEqual(asked, ['http://127.0.0.1:8765/events?after=0', 'http://127.0.0.1:8765/events?after=1000', 'http://127.0.0.1:8765/views']);
});

test('the MERO source is off when serve is not there, and a failed /views leaves moods unknown', async () => {
  const down = (async () => {
    throw new TypeError('fetch failed');
  }) as typeof fetch;
  assert.equal(await meroServeSource('http://127.0.0.1:1', down).poll(0), null);
  const html = (async () => new Response('<!doctype html>', { status: 200 })) as typeof fetch;
  assert.equal(await meroServeSource('http://x', html).poll(0), null);
  const noViews = (async (url: string) => (url.includes('/views') ? reply({ error: 'x' }, 500) : reply({ mero: 1, events: EVENTS, next: 17 }))) as typeof fetch;
  const got = await meroServeSource('http://x', noViews).poll(0);
  assert.equal(got!.events.length, 17);
  assert.equal(got!.moods, undefined);
});

test('the feed hands moods to the valley with each batch', async () => {
  const src = { poll: async () => ({ events: [], next: 0, moods: { vic: 'flow' as const } }) };
  const seen: unknown[] = [];
  const stop = startLiveFeed(src, (_e, _i, moods) => seen.push(moods), 5);
  await new Promise((r) => setTimeout(r, 20));
  stop();
  assert.deepEqual(seen[0], { vic: 'flow' });
});

// ---------------------------------------------------------------- the valley

test('VIC, JEV, L2 and each worker become creatures on a MERO team; you and sys do not', () => {
  const s = make();
  s.applyLive(EVENTS, true, MOODS);
  const T = s.team('live-mero')!;
  assert.ok(T && T.live, 'a MERO team exists, driven by events');
  assert.deepEqual(s.members(T).map((a) => a.name).sort(), ['JEV', 'L0 FIX-TESTS', 'L1 DOCS', 'L2', 'VIC']);
  assert.ok(s.agent('live-notion-cleanup'), 'the laptop job is on LAPTOP JOBS');
  assert.equal(s.agent('live-notion-cleanup')!.team, 'live-jobs');
  assert.ok(!s.m.agents.some((a) => /^mero-(you|sys)/.test(a.id)));
  // History lands quietly: the passing check put L0's step in its done list, nothing is stuck.
  const l0 = s.agent('mero-l0:fix-tests')!;
  assert.equal(l0.blocked, null);
  assert.equal(l0.done[0], 'Checks passed');
});

test('a creature\'s mood is the one /views gives, never the simulation\'s', () => {
  const s = make();
  s.applyLive(EVENTS, true, MOODS);
  const l0 = s.agent('mero-l0:fix-tests')!;
  const vic = s.agent('mero-vic')!;
  assert.equal(s.mood(l0, 0), 'stalled');
  assert.equal(s.mood(vic, 0), 'working');
  // Piling work on VIC changes nothing: only MERO says how it's doing.
  vic.backlog = ['a', 'b', 'c', 'd', 'e', 'f'];
  assert.equal(s.mood(vic, 0), 'working');
  s.applyLive([], false, { ...MOODS, vic: 'overwhelmed' });
  assert.equal(s.mood(vic, 0), 'overwhelmed');
  // The laptop job takes /views' mood too.
  s.applyLive([], false, { ...MOODS, 'job:notion-cleanup': 'frustrated' });
  assert.equal(s.mood(s.agent('live-notion-cleanup')!, 0), 'frustrated');
  // A MERO agent is read-only here (its popup offers no simulated fixes); a laptop job is not.
  assert.equal(s.isMeroCreature(l0), true);
  assert.equal(s.isMeroCreature(s.agent('live-notion-cleanup')!), false);
});

test('an open approval.ask is something PIP asks about; your answer in MERO clears it', () => {
  const s = make();
  s.applyLive(EVENTS, true, MOODS);
  const l0 = s.agent('mero-l0:fix-tests')!;
  const ask = s.m.needs.find((n) => n.id === 'ma10');
  assert.ok(ask, 'PIP asks about L0\'s open merge');
  assert.equal(ask!.agent, l0.id);
  assert.match(ask!.text, /L0 FIX-TESTS asks: merge claude\/fix-tests into main\. Answer in MERO: mero approve 10/);
  assert.ok(!s.m.needs.some((n) => n.id === 'ma11'), 'L1\'s ask was already answered no');
  assert.equal(s.agent('mero-l1:docs')!.fear, null);
  assert.match(s.liveTicker!, /1 ask open/);
  s.applyLive([ev('you', 'approval.give', { ask: 10, decision: 'yes' }, 18)], false);
  assert.ok(!s.m.needs.some((n) => n.id === 'ma10'));
  assert.equal(l0.fear, null);
  assert.equal(s.m.feed[0].kind, 'YOU');
  assert.doesNotMatch(s.liveTicker!, /ask open/);
});

test('new events move creatures and post cards; model calls only move the ticker', () => {
  const s = make();
  s.applyLive(EVENTS, true, MOODS);
  const cards = s.m.feed.length;
  s.applyLive([ev('jev', 'step.start', { what: 'route task t2' }, 18)], false);
  assert.equal(s.agent('mero-jev')!.doing, 'route task t2');
  assert.equal(s.m.feed[0].kind, 'LIVE');
  s.applyLive([ev('l0:fix-tests', 'verify', { ok: false, exit: 2, cmd: 'npm test' }, 19)], false);
  assert.ok(s.agent('mero-l0:fix-tests')!.blocked);
  assert.equal(s.m.feed[0].kind, 'STUCK');
  const n = s.m.feed.length;
  s.applyLive([ev('l0:fix-tests', 'model.call', { model: 'haiku', tier: 't0', tokens_in: 600, tokens_out: 0, cost_usd: 0.001, ms: 5, reason: 'x' }, 20)], false);
  assert.equal(s.m.feed.length, n);
  assert.match(s.liveTicker!, /^mero: 5 agents · \$0\.0058 · 4\.0k tokens in 3 calls/);
  // A new worker appears on its first event; an unknown kind is shown.
  s.applyLive([ev('l1:review', 'sprint.signoff', {}, 21)], false);
  assert.equal(s.agent('mero-l1:review')!.name, 'L1 REVIEW');
  assert.match(s.m.feed[0].text, /Said sprint\.signoff/);
  assert.ok(s.m.feed.length > cards);
});

test('the simulation never moves a MERO creature', () => {
  const s = make();
  s.applyLive(EVENTS, true, MOODS);
  const mine = () => JSON.stringify(s.m.agents.filter((a) => a.id.startsWith('mero-')));
  const before = mine();
  for (let i = 0; i < 300; i++) {
    s.nextSim = 0;
    s.step();
  }
  assert.equal(mine(), before);
});
