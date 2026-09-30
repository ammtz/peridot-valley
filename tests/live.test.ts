// M8 slice: real events in the valley. Same harness as tests/sim.test.ts (PR #3):
// `tsx --test tests/*.test.ts`. Until that PR lands: npx tsx --test tests/live.test.ts
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { parseEvents, tally, tickerText, toAction, type MeroEvent } from '../src/live/events';
import { startLiveFeed, type EventSource } from '../src/live/feed';
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

const make = () => {
  const s = new Sim();
  s.m = seed();
  s.m.onboarded = true;
  s.introOn = false;
  s.introPhase = null;
  return s;
};

const TODAY = new Date('2026-09-30T12:00:00');
const ev = (job: string, event: string, extra: Record<string, unknown> = {}, at = '2026-09-30T07:13:02'): MeroEvent => ({ at, job, event, ...extra });
// Real lines from mero_v01/.automations/events.jsonl on 2026-09-30, trimmed.
const REAL = [
  '{"at": "2026-09-30T12:25:12-04:00", "job": "mirror-refresh", "event": "job.start", "cmd": "scripts/export-knowledge.py"}',
  '{"at": "2026-09-30T12:25:14-04:00", "job": "mirror-refresh", "event": "job.end", "exit": 0, "seconds": 2.8}',
  '{"at": "2026-09-30T12:25:17-04:00", "job": "notion-cleanup", "event": "notion.cleanup", "apply": true, "calls": 3, "applied": [], "findings": [{"kind": "overdue"}, {"kind": "stale-inbox"}]}',
  '{"at": "2026-09-30T12:25:17-04:00", "job": "notion-cleanup", "event": "job.end", "exit": 0, "seconds": 2.6}',
].join('\n');

test('parseEvents keeps real lines and skips a torn or foreign one', () => {
  const got = parseEvents(REAL + '\n{"at": "2026-09-30T12:3\n{"hello": 1}\n\n');
  assert.equal(got.length, 4);
  assert.deepEqual(got.map((e) => e.event), ['job.start', 'job.end', 'notion.cleanup', 'job.end']);
});

test('each event means one thing in the valley, and an unknown one is shown, not dropped', () => {
  assert.equal(toAction(ev('a', 'job.start')).kind, 'start');
  assert.deepEqual(toAction(ev('a', 'job.end', { exit: 0, seconds: 2.6 })), { kind: 'done', job: 'a', text: 'Finished a run in 2.6s' });
  assert.equal(toAction(ev('a', 'job.end', { exit: 1 })).kind, 'stuck');
  assert.match(toAction(ev('a', 'job.end', { exit: 124 })).text, /timed out/);
  assert.match(toAction(ev('a', 'job.end', {})).text, /exit \?/); // no exit code is a failure, never a pass
  assert.equal(toAction(ev('a', 'job.skipped', { reason: 'already running' })).text, 'Skipped: already running');
  assert.equal(toAction(ev('n', 'notion.cleanup', { findings: [1, 2], applied: [1] })).text, 'Notion check: 2 things to look at, 1 fixed');
  assert.deepEqual(toAction(ev('a', 'ledger.hop')), { kind: 'note', job: 'a', text: 'Said ledger.hop' });
});

test('the ticker counts today\'s runs and failures, and costs', () => {
  const t = tally([
    ev('a', 'job.end', { exit: 0 }),
    ev('b', 'job.end', { exit: 2 }),
    ev('a', 'job.end', { exit: 0 }, '2026-09-29T07:13:00'), // yesterday: not today's
    ev('m', 'hop', { cost_usd: 0.25 }),
  ], TODAY);
  assert.equal(t.runsToday, 2);
  assert.equal(t.failuresToday, 1);
  assert.deepEqual(t.jobs, ['a', 'b', 'm']);
  assert.equal(t.costUsd, 0.25);
  assert.equal(tickerText(t), 'laptop jobs: 2 runs today · 1 failed · last 07:13 ok · $0.25');
  assert.equal(tickerText(tally([], TODAY)), 'laptop jobs: connected, no runs yet');
});

test('a source that is not there switches the feed off after one try', async () => {
  let calls = 0;
  const gone: EventSource = { poll: async () => (calls++, null) };
  const got: unknown[] = [];
  const stop = startLiveFeed(gone, (e) => got.push(e), 5);
  await new Promise((r) => setTimeout(r, 40));
  stop();
  assert.equal(calls, 1);
  assert.equal(got.length, 0);
});

test('the feed hands over history first, then only what is new', async () => {
  const log = parseEvents(REAL);
  let n = 2;
  const src: EventSource = { poll: async (after) => ({ events: log.slice(after, n), next: n }) };
  const batches: [number, boolean][] = [];
  const stop = startLiveFeed(src, (e, initial) => batches.push([e.length, initial]), 5);
  await new Promise((r) => setTimeout(r, 20));
  n = 4;
  await new Promise((r) => setTimeout(r, 30));
  stop();
  assert.deepEqual(batches[0], [2, true]);
  assert.ok(batches.some(([len, initial]) => len === 2 && !initial));
  assert.equal(batches.reduce((s, [len]) => s + len, 0), 4); // nothing twice
});

test('real jobs become creatures on their own team, and history lands quietly', () => {
  const s = make();
  const cards = s.m.feed.length;
  s.applyLive(parseEvents(REAL), true);
  const T = s.m.teams.find((x) => x.live)!;
  assert.ok(T, 'a LAPTOP JOBS team exists');
  const live = s.m.agents.filter((a) => a.team === T.id).map((a) => a.name).sort();
  assert.deepEqual(live, ['MIRROR-REFRESH', 'NOTION-CLEANUP']);
  assert.equal(s.agent('live-notion-cleanup')!.done[0], 'Finished a run in 2.6s');
  assert.equal(s.agent('live-notion-cleanup')!.doing, null);
  // History posts two cards (the team joining, and "connected"), not one per past event.
  assert.equal(s.m.feed.length - cards, 2);
  assert.match(s.liveTicker!, /^laptop jobs: /);
});

test('a new run moves its creature, and a failure asks for you', () => {
  const s = make();
  s.applyLive(parseEvents(REAL), true);
  s.applyLive([ev('notion-cleanup', 'job.start', {}, '2026-09-30T13:00:00')], false);
  const a = s.agent('live-notion-cleanup')!;
  assert.equal(a.doing, 'Running now');
  assert.equal(s.m.feed[0].kind, 'LIVE');
  s.applyLive([ev('notion-cleanup', 'job.end', { exit: 1 }, '2026-09-30T13:00:05')], false);
  assert.ok(a.blocked, 'a failed run shows as stuck');
  assert.equal(s.m.feed[0].kind, 'STUCK');
  assert.ok(s.m.needs.some((n) => n.agent === a.id), 'and PIP asks about it');
  s.applyLive([ev('notion-cleanup', 'job.start', {}, '2026-09-30T13:10:00')], false);
  assert.equal(a.blocked, null, 'the next run clears it');
  assert.ok(!s.m.needs.some((n) => n.agent === a.id));
});

test('the simulation never moves a real job', () => {
  const s = make();
  s.applyLive(parseEvents(REAL), true);
  const before = JSON.stringify(s.m.agents.filter((a) => a.id.startsWith('live-')));
  for (let i = 0; i < 300; i++) {
    s.nextSim = 0;
    s.step();
  }
  assert.equal(JSON.stringify(s.m.agents.filter((a) => a.id.startsWith('live-'))), before);
});

test('before onboarding only the ticker moves; creatures come once the valley is ready', () => {
  const s = new Sim(); // fresh: the opening is on
  s.applyLive(parseEvents(REAL), true);
  assert.equal(s.m.teams.some((x) => x.live), false);
  assert.ok(s.liveTicker);
  s.m = seed();
  s.m.onboarded = true;
  s.introOn = false;
  s.applyLive([], false); // an empty poll after onboarding
  assert.equal(s.m.agents.filter((a) => a.id.startsWith('live-')).length, 2);
});
