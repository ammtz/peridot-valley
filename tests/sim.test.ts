// Headless tests for the sim: the rules a PR can break without the UI looking any
// different. Ported from the mera_v01 sibling build's suite and adapted to
// Peridot's seed and API. Run with `npm test`.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../src/model/sim';
import { seed } from '../src/model/seed';
import { KEY, NOW } from '../src/model/constants';
import { decide } from '../src/model/decider';
import { PLANS, Q2_OPTIONS, pickPreset } from '../src/model/presets';

const data = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  },
});
beforeEach(() => data.clear());

/** A sim on the full seeded valley, past the opening. */
const make = () => {
  const s = new Sim();
  s.m = seed();
  s.m.onboarded = true;
  s.introOn = false;
  s.introPhase = null;
  return s;
};
// Pointer events carry only what the handlers read.
const ev = (x: number, y: number, pointerId = 1) =>
  ({ clientX: x, clientY: y, button: 0, pointerId, movementX: 0, stopPropagation() {} }) as never;

test('a first visit opens on VIC alone; a finished save skips the opening', () => {
  const fresh = new Sim();
  assert.equal(fresh.introOn, true);
  assert.deepEqual(Object.keys(fresh.m.sups), ['pip']);
  assert.equal(fresh.m.agents.length, 0);
  const s = make();
  s.save();
  const back = new Sim();
  assert.equal(back.introOn, false);
  assert.equal(back.m.agents.length, 12);
});

test('moods follow the priority order: stuck, waiting, swamped, bored, flow, working', () => {
  const s = make();
  const a = s.agent('job-scout')!;
  const t = NOW();
  assert.equal(s.mood(a, t), 'working');
  a.flowUntil = t + 10;
  assert.equal(s.mood(a, t), 'flow');
  a.doing = null;
  a.backlog = [];
  assert.equal(s.mood(a, t), 'bored');
  a.backlog = ['1', '2', '3', '4'];
  assert.equal(s.mood(a, t), 'overwhelmed');
  a.fear = 'paying';
  assert.equal(s.mood(a, t), 'stalled');
  a.blocked = { text: 'no login', fix: 'FIX' };
  assert.equal(s.mood(a, t), 'frustrated');
});

test('org edits keep descendants and refuse cycles and moving VIC', () => {
  const s = make();
  s.reparent('team', 'home', 'dash');
  s.reparent('sup', 'dash', 'otto');
  assert.equal(s.pathName('home'), 'OTTO › DASH › HOME');
  s.reparent('sup', 'otto', 'dash'); // would be a cycle
  s.reparent('sup', 'pip', 'dash'); // VIC never moves
  assert.equal(s.m.sups.otto.boss, 'pip');
  assert.equal(s.m.sups.pip.boss, null);
  s.deleteManager('dash');
  assert.equal(s.team('home')!.boss, 'otto');
  assert.equal(s.team('job')!.boss, 'otto');
  s.deleteManager('pip');
  assert.ok(s.m.sups.pip);
});

test('adding many managers and teams at once gives each a unique id', () => {
  const s = make();
  for (let i = 0; i < 12; i++) s.addManager('pip');
  assert.equal(Object.keys(s.m.sups).length, 15);
  const before = s.m.teams.length;
  for (let i = 0; i < 5; i++) s.addTeam('otto');
  assert.equal(new Set(s.m.teams.map((T) => T.id)).size, before + 5);
});

test('staffed teams cannot be deleted; empty ones can', () => {
  const s = make();
  s.addTeam('otto');
  const id = s.sel!.id;
  s.deleteTeam(id);
  assert.equal(s.team(id), undefined);
  s.deleteTeam('money');
  assert.ok(s.team('money'));
});

test('helpers join a team with a task, and a team caps its helpers', () => {
  const s = make();
  const seeded = new Set(s.members(s.team('job')!).map((a) => a.id));
  for (let i = 0; i < 20; i++) s.addHelper('job');
  const crew = s.members(s.team('job')!);
  assert.equal(crew.length, 6);
  assert.equal(new Set(crew.map((a) => a.id)).size, crew.length);
  assert.ok(crew.filter((a) => !seeded.has(a.id)).every((a) => a.doing));
});

test('fixing, approving and holding clear the matching ask', () => {
  const s = make();
  const bills = s.agent('money-bills')!;
  s.makeBlocked(bills);
  assert.ok(s.m.needs.some((n) => n.agent === bills.id && n.kind === 'blocked'));
  s.unblock(bills);
  assert.equal(bills.blocked, null);
  assert.ok(!s.m.needs.some((n) => n.agent === bills.id));

  s.askFirst = true; // otherwise VIC may handle it without asking
  const kin = s.agent('home-kin')!;
  s.makeFear(kin);
  const parked = kin.doing;
  s.hold(kin);
  assert.equal(kin.fear, null);
  assert.equal(kin.backlog.at(-1), parked);
  assert.ok(!s.m.needs.some((n) => n.agent === kin.id));

  const scout = s.agent('job-scout')!;
  s.makeFear(scout);
  const task = scout.doing;
  s.approve(scout);
  assert.equal(scout.done[0], task);
  assert.ok(!s.m.needs.some((n) => n.agent === scout.id));
});

test('VIC shows at most 3 asks and never the same one twice', () => {
  const s = make();
  s.m.needs = [];
  const nd = (id: string, text: string) => ({ id, team: 'job', text, acts: [] as [string, string][] });
  s.pushNeed(nd('a', 'one'));
  s.pushNeed(nd('b', 'one'));
  s.pushNeed(nd('c', 'two'));
  s.pushNeed(nd('d', 'three'));
  s.pushNeed(nd('e', 'four'));
  assert.deepEqual(s.m.needs.map((n) => n.text).sort(), ['one', 'three', 'two']);
});

test('LATER snoozes an ask for a minute instead of dropping it', () => {
  const s = make();
  const n1 = s.m.needs.find((n) => n.id === 'n1')!;
  s.act(n1, 'skip');
  assert.ok(s.m.needs.some((n) => n.id === 'n1'));
  assert.ok(!s.visibleNeeds().some((n) => n.id === 'n1'));
  s.act(s.m.needs.find((n) => n.id === 'n2')!, 'ack');
  assert.ok(!s.m.needs.some((n) => n.id === 'n2'));
});

test('splitting a load conserves tasks; giving work fills an idle agent', () => {
  const s = make();
  const fit = s.agent('job-fit')!;
  fit.backlog = ['a', 'b', 'c', 'd', 'e', 'f'];
  const count = () => s.members(s.team('job')!).reduce((n, a) => n + a.backlog.length + Number(!!a.doing), 0);
  const before = count();
  s.splitLoad(fit);
  assert.equal(count(), before);
  assert.equal(fit.backlog.length, 3);
  const pen = s.agent('job-pen')!;
  pen.doing = null;
  pen.backlog = [];
  s.giveWork(pen);
  assert.ok(pen.doing);
  assert.equal(pen.backlog.length, 1);
});

test('a finished task lands in the feed only when its pulse arrives', () => {
  const s = make();
  const a = s.agent('job-scout')!;
  s.nextSim = Infinity;
  s.complete(a, NOW());
  assert.equal(s.pulses.length, 1);
  const top = s.m.feed[0].id;
  s.step();
  assert.equal(s.m.feed[0].id, top);
  s.pulses[0].at = NOW() - 10;
  s.step();
  assert.equal(s.pulses.length, 0);
  assert.equal(s.m.feed[0].kind, 'DONE');
});

test('step skips agents on inactive teams and the agent being dragged', () => {
  const s = make();
  s.m.agents.forEach((a) => {
    a.doing = null;
    a.backlog = ['queued'];
  });
  s.team('home')!.state = 'pending';
  s.drag = { kind: 'agent', id: 'job-scout', sx: 0, sy: 0, ox: 0, oy: 0, moved: true };
  s.nextSim = 0;
  s.step();
  assert.equal(s.agent('home-kin')!.doing, null);
  assert.equal(s.agent('job-scout')!.doing, null);
  const sort = s.agent('inbox-sort')!;
  assert.ok(sort.doing || sort.done.includes('queued'));
});

test('furniture serves teams in range and announces a change once', () => {
  const s = make();
  const db = s.furnById('fx-db')!;
  assert.deepEqual(s.inRange(db).map((T) => T.id), ['job', 'inbox']);
  s.announceFurn(db);
  const top = s.m.feed[0].id;
  s.announceFurn(db);
  assert.equal(s.m.feed[0].id, top);
  db.x = s.team('home')!.x + 400;
  db.y = s.team('home')!.y + 400;
  s.announceFurn(db); // nobody in range: no card
  assert.equal(s.m.feed[0].id, top);
  db.x = s.team('home')!.x;
  db.y = s.team('home')!.y;
  s.announceFurn(db);
  assert.equal(s.m.feed[0].text, 'Now serving HOME.');
});

test('dragging moves an agent between teams and a team under a new manager', () => {
  const s = make();
  const a = s.agent('home-fix')!;
  s.apos[a.id] = { x: 0, y: 0 };
  const to = s.team('money')!;
  s.nodeDown(ev(0, 0), 'agent', a.id);
  s.onMove(ev(to.x, to.y));
  s.onUp(ev(to.x, to.y));
  assert.equal(a.team, 'money');

  const T = s.team('home')!,
    was = { x: T.x, y: T.y },
    dash = s.m.sups.dash;
  s.nodeDown(ev(T.x, T.y), 'team', T.id);
  s.onMove(ev(dash.x, dash.y));
  s.onUp(ev(dash.x, dash.y));
  assert.equal(T.boss, 'dash');
  assert.deepEqual({ x: T.x, y: T.y }, was);
});

test('a two-finger pinch keeps the midpoint fixed and clamps zoom', () => {
  const s = make();
  s.bgDown(ev(100, 100, 1));
  s.bgDown(ev(200, 100, 2));
  s.onMove(ev(300, 100, 2));
  assert.equal(s.zoom, 2);
  assert.deepEqual(s.toWorld(200, 100), { x: 150, y: 100 });
  s.onMove(ev(2000, 100, 2));
  assert.equal(s.zoom, 2.6);
});

test('a save keeps edits but clears animation clocks', () => {
  const s = make();
  s.m.sups.dash.name = 'ALPHA';
  s.m.sups.dash.born = 10;
  s.team('job')!.fireAt = 10;
  s.agent('job-scout')!.flowUntil = NOW() + 100;
  s.save();
  const back = new Sim();
  assert.equal(back.m.sups.dash.name, 'ALPHA');
  assert.equal(back.m.sups.dash.born, null);
  assert.equal(back.team('job')!.fireAt, null);
  assert.equal(back.agent('job-scout')!.flowUntil, 0);
});

test('an old save migrates: v3 loads, PIP becomes VIC, retired furniture is dropped', () => {
  const old = seed() as ReturnType<typeof seed> & { v: number };
  old.v = 3;
  old.onboarded = true;
  old.sups.pip.name = 'PIP';
  old.furn.push({ id: 'b1', type: 'board' as never, x: 0, y: 0, on: [] });
  data.set(KEY, JSON.stringify(old));
  const s = new Sim();
  assert.equal(s.m.v, 4);
  assert.equal(s.m.sups.pip.name, 'VIC');
  assert.ok(!s.m.furn.some((f) => f.id === 'b1'));
  assert.ok(s.m.needs.every((n) => 'snoozeUntil' in n));
});

test('a broken save falls back to the opening instead of crashing', () => {
  for (const bad of ['not json', JSON.stringify({ v: 4 }), JSON.stringify({ v: 99, onboarded: true })]) {
    data.set(KEY, bad);
    const s = new Sim();
    assert.equal(s.introOn, true, bad);
  }
});

test('a save with a manager cycle is rejected, so naming a team cannot hang', () => {
  const bad = seed();
  bad.onboarded = true;
  bad.sups.dash.boss = 'otto';
  bad.sups.otto.boss = 'dash';
  data.set(KEY, JSON.stringify(bad));
  const s = new Sim();
  assert.equal(s.introOn, true);
  s.m = bad;
  assert.ok(s.pathName('job').length > 0); // returns rather than looping forever
});

test('decide() always returns one of the options it was given', () => {
  // The seam Jev will replace: whatever decides, the answer must be a listed option.
  const cases: [Parameters<typeof decide>[0], string[]][] = [
    ['mood', ['frustrated', 'stalled', 'overwhelmed', 'bored', 'flow', 'working']],
    ['handleOrAsk', ['handled', 'ask']],
    ['idlePickup', ['pickup', 'wait']],
  ];
  for (const [kind, options] of cases)
    for (let i = 0; i < 50; i++) assert.ok(options.includes(decide(kind, { askFirst: i % 2 === 0, poolHasWork: true }, options)));
  assert.equal(decide('handleOrAsk', { askFirst: true }, ['handled', 'ask']), 'ask');
  assert.equal(decide('idlePickup', { poolHasWork: false }, ['pickup', 'wait']), 'wait');
});

test('every onboarding answer hires a manager whose teams have unique ids', () => {
  assert.ok(Q2_OPTIONS.length > 0);
  for (const [key] of Q2_OPTIONS) {
    const p = pickPreset(key);
    assert.ok(p.managers.length > 0, key);
    const ids = p.managers.flatMap((m) => m.teams.map((T) => T.id));
    assert.equal(new Set(ids).size, ids.length, key);
    for (const m of p.managers) assert.ok(PLANS[m.id] || m.plan, key);
  }
});
