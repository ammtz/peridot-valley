// Round 3: the chamber and meeting folds, placement rules, and the no-guarantee-words rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EventStream, MeetingDriver, blindCheck, connectDrive, cycleMessage, detectSampleDrive, foldChamber, foldMeeting, pullDrive, visibleTo, wouldCycle, facilityWires, type FEventBody } from '../src/model/facility';
import { insideAny, legalSpot } from '../src/lib/place';
import { FACILITY_RULES } from '../src/model/constants';

const drive = (id = 'd1', present = true) => ({ id, label: 'SAMPLE DRIVE (simulated)', bus: 'usb' as const, fsUuid: 'SAMPLE-0000', present, simulated: true });
const feed = (...bs: FEventBody[]) => {
  const s = new EventStream();
  bs.forEach((b, i) => s.emit(b, i + 1));
  return s.events;
};

test('chamber is green only after a verify ok for the current drive and no drive.gone since', () => {
  const seen: FEventBody = { kind: 'drive.seen', chamber: 'c', drive: drive() };
  assert.equal(foldChamber(feed(seen), 'c').green, false);
  assert.equal(foldChamber(feed(seen, { kind: 'chamber.verify', chamber: 'c', driveId: 'd1' }), 'c').phase, 'verifying');
  assert.equal(foldChamber(feed(seen, { kind: 'chamber.verify', chamber: 'c', driveId: 'd1' }), 'c').lamp, 'amber');
  const ok = feed(seen, { kind: 'chamber.verify', chamber: 'c', driveId: 'd1', ok: true });
  assert.equal(foldChamber(ok, 'c').green, true);
  assert.equal(foldChamber(ok, 'c').lamp, 'green');
  // A verify for some other drive does not count.
  assert.equal(foldChamber(feed(seen, { kind: 'chamber.verify', chamber: 'c', driveId: 'other', ok: true }), 'c').green, false);
  // A different drive appearing later resets it.
  assert.equal(foldChamber([...ok, { kind: 'drive.seen', chamber: 'c', drive: drive('d2'), t: 9 }], 'c').green, false);
  // The wrong chamber never turns green.
  assert.equal(foldChamber(ok, 'elsewhere').green, false);
});

test('a removed drive makes a blinking red lamp and takes green away', () => {
  const evs = feed({ kind: 'drive.seen', chamber: 'c', drive: drive() }, { kind: 'chamber.verify', chamber: 'c', driveId: 'd1', ok: true }, { kind: 'drive.gone', driveId: 'd1' });
  const v = foldChamber(evs, 'c');
  assert.equal(v.green, false);
  assert.equal(v.lamp, 'blink');
  assert.equal(v.drive?.present, false);
  // A later verify cannot revive a drive that is gone.
  assert.equal(foldChamber([...evs, { kind: 'chamber.verify', chamber: 'c', driveId: 'd1', ok: true, t: 9 }], 'c').green, false);
});

test('open is refused without a verify, and allowed after one', () => {
  const seen: FEventBody = { kind: 'drive.seen', chamber: 'c', drive: drive() };
  const refused = foldChamber(feed(seen, { kind: 'chamber.open', chamber: 'c', purpose: 'import' }), 'c');
  assert.notEqual(refused.phase, 'open');
  assert.equal(refused.purpose, undefined);
  assert.equal(refused.refused, 1);
  const good = foldChamber(feed(seen, { kind: 'chamber.verify', chamber: 'c', driveId: 'd1', ok: true }, { kind: 'chamber.open', chamber: 'c', purpose: 'work' }), 'c');
  assert.equal(good.phase, 'open');
  assert.equal(good.purpose, 'work');
  const closed = foldChamber(feed(seen, { kind: 'chamber.verify', chamber: 'c', driveId: 'd1', ok: true }, { kind: 'chamber.open', chamber: 'c', purpose: 'work' }, { kind: 'chamber.close', chamber: 'c' }), 'c');
  assert.equal(closed.phase, 'closed');
  assert.equal(closed.green, false);
});

test('sealing and unsealing teams, and the scripted drive watcher', () => {
  const s = new EventStream();
  s.emit({ kind: 'chamber.seal', chamber: 'c', team: 'a' }, 1);
  assert.deepEqual(foldChamber(s.events, 'c').teams, ['a']);
  assert.equal(foldChamber(s.events, 'c').phase, 'sealed');
  const d = detectSampleDrive(s, 'c', 2);
  assert.equal(d.simulated, true);
  assert.match(d.label, /SAMPLE DRIVE \(simulated\)/);
  connectDrive(s, 'c', d, 3, 2);
  s.tick(4);
  assert.equal(foldChamber(s.events, 'c').lamp, 'amber');
  s.tick(5.1);
  assert.equal(foldChamber(s.events, 'c').green, true);
  pullDrive(s, d.id, 6);
  assert.equal(foldChamber(s.events, 'c').lamp, 'blink');
  s.emit({ kind: 'chamber.seal', chamber: 'c', team: 'a', out: true }, 7);
  assert.deepEqual(foldChamber(s.events, 'c').teams, []);
});

test('a drive pulled mid-check never turns green', () => {
  const s = new EventStream();
  const d = detectSampleDrive(s, 'c', 1);
  connectDrive(s, 'c', d, 2, 2);
  pullDrive(s, d.id, 3);
  s.tick(10);
  assert.equal(foldChamber(s.events, 'c').green, false);
});

const dep = (step: number, team: string, needs?: number): FEventBody => ({ kind: 'meeting.dep', meeting: 'm', step, team, what: 'w' + step, needs });

test('dependency order: step 2 cannot run before step 1 is done', () => {
  const base: FEventBody[] = [{ kind: 'meeting.open', meeting: 'm', teams: ['a', 'b'], run: true }, dep(1, 'a'), dep(2, 'b', 1)];
  const early = foldMeeting(feed(...base, { kind: 'meeting.post', meeting: 'm', id: 1, fromTeam: 'b', topic: 't', step: 2, ptype: 'status' }), 'm');
  assert.equal(early.posts.length, 0);
  assert.equal(early.agenda[1].status, 'waiting');
  const evs = feed(...base, { kind: 'meeting.post', meeting: 'm', id: 1, fromTeam: 'a', topic: 't', step: 1, ptype: 'summary' }, { kind: 'meeting.cleared', meeting: 'm', id: 1 }, { kind: 'meeting.signoff', meeting: 'm', step: 1 }, { kind: 'meeting.post', meeting: 'm', id: 2, fromTeam: 'b', topic: 't', step: 2, ptype: 'status' });
  const v = foldMeeting(evs, 'm');
  assert.equal(v.agenda[0].status, 'done');
  assert.equal(v.agenda[1].status, 'running');
  // Sign-off needs a cleared post first.
  assert.equal(foldMeeting(feed(...base, { kind: 'meeting.signoff', meeting: 'm', step: 1 }), 'm').agenda[0].status, 'waiting');
});

test('a cycle in the agenda is refused, in the helper and in the fold', () => {
  const agenda = new Map([
    [1, { team: 'a', what: '', needs: undefined as number | undefined }],
    [2, { team: 'b', what: '', needs: 1 }],
    [3, { team: 'a', what: '', needs: 2 }],
  ]);
  assert.equal(wouldCycle(agenda, 2, 3), true);
  assert.equal(wouldCycle(agenda, 1, 3), true);
  assert.equal(wouldCycle(agenda, 3, 1), false);
  assert.equal(wouldCycle(agenda, 2, 2), true);
  assert.equal(cycleMessage(2, 3), 'Step 2 can’t wait on step 3.');
  const v = foldMeeting(feed(dep(1, 'a'), dep(2, 'b', 1), dep(3, 'a', 2), dep(2, 'b', 3)), 'm');
  assert.equal(v.agenda.find((a) => a.step === 2)!.needs, 1);
});

test('the blind check passes typed messages and refuses raw files, secrets and private data', () => {
  for (const k of ['task', 'dependency', 'artifact_ref', 'status', 'summary'] as const) assert.equal(blindCheck(k).ok, true);
  for (const k of ['raw_file', 'secret', 'private'] as const) {
    const r = blindCheck(k);
    assert.equal(r.ok, false);
    assert.ok(r.why && r.why.length > 5);
  }
});

test('a blocked post never reaches the other team, and is never silent', () => {
  const evs = feed({ kind: 'meeting.open', meeting: 'm', teams: ['a', 'b'], run: true }, dep(1, 'a'), { kind: 'meeting.post', meeting: 'm', id: 1, fromTeam: 'a', topic: 't', step: 1, ptype: 'raw_file' }, { kind: 'meeting.blocked', meeting: 'm', id: 1, why: 'Raw files can’t cross. Send a reference instead.' });
  const v = foldMeeting(evs, 'm');
  assert.equal(v.posts[0].status, 'blocked');
  assert.ok(v.posts[0].why);
  assert.equal(visibleTo(v, 'b').length, 0);
  assert.equal(visibleTo(v, 'a').length, 1);
  // A blocked post does not finish its step.
  assert.equal(v.agenda[0].status, 'running');
});

test('the scripted run: step 2 bounces once, then everything clears in order', () => {
  const s = new EventStream();
  const drv = new MeetingDriver(s);
  s.emit({ kind: 'meeting.open', meeting: 'm', teams: ['a', 'b', 'c'] }, 0);
  for (const b of [dep(1, 'a'), dep(2, 'b', 1), dep(3, 'c', 2)]) s.emit(b, 0);
  drv.start('m', 0);
  let sawBlocked = false;
  const order: number[] = [];
  for (let t = 0; t < 40; t += 0.1) {
    drv.tick(t);
    const v = foldMeeting(s.events, 'm');
    if (v.posts.some((p) => p.status === 'blocked')) sawBlocked = true;
    for (const st of v.done) if (!order.includes(st)) order.push(st);
  }
  assert.equal(sawBlocked, true);
  assert.deepEqual(order, [1, 2, 3]);
  assert.equal(drv.running('m'), false);
  const v = foldMeeting(s.events, 'm');
  assert.ok(v.agenda.every((a) => a.status === 'done'));
  assert.equal(v.posts.filter((p) => p.status === 'blocked').length, 1);
});

test('facility wires: meeting paths, data cables and team plugs', () => {
  const w = facilityWires([
    { id: 'm1', type: 'meeting', wires: ['a', 'b'] },
    { id: 'c1', type: 'chamber', link: 'd1' },
    { id: 'x', type: 'db', wires: ['a'] },
    { id: 'o', type: 'db', owner: 'a', wires: ['b'] },
  ]);
  assert.deepEqual(w.map((q) => q.kind), ['dep', 'dep', 'drive', 'data']);
});

const rects = [{ x0: 0, y0: 0, x1: 200, y1: 100 }];
test('placement: chambers and meeting spaces never sit inside team quarters', () => {
  assert.equal(FACILITY_RULES.chamber?.sharedOnly, true);
  assert.equal(FACILITY_RULES.meeting?.sharedOnly, true);
  assert.equal(FACILITY_RULES.chamber?.nudgeMsg, 'Chambers stand on their own.');
  assert.equal(FACILITY_RULES.meeting?.nudgeMsg, 'Meeting spaces go outside team quarters');
  assert.equal(insideAny(100, 50, rects), true);
  assert.equal(insideAny(400, 50, rects), false);
  const ok = legalSpot(400, 50, rects, 40);
  assert.deepEqual(ok, { x: 400, y: 50, moved: false });
  const n = legalSpot(190, 50, rects, 40);
  assert.equal(n.moved, true);
  assert.equal(insideAny(n.x, n.y, rects, 40), false);
  // Nearest legal spot: close to the right edge, so it goes right, not far away.
  assert.ok(n.x > 200 && n.x < 260);
  const two = [...rects, { x0: 300, y0: 0, x1: 500, y1: 100 }];
  const m = legalSpot(190, 50, two, 40);
  assert.equal(insideAny(m.x, m.y, two, 40), false);
});

test('the preview never says "secure" or "encrypted" in the UI', () => {
  const root = fileURLToPath(new URL('../src', import.meta.url));
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const p = dir + '/' + d.name;
      if (d.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(d.name) && (/[\\/](ui|world)[\\/]/.test(p) || /facility|tour|constants/.test(d.name))) {
        const text = readFileSync(p, 'utf8');
        if (/\bsecure(d|ly)?\b|encrypt/i.test(text)) hits.push(p);
      }
    }
  };
  walk(root);
  assert.deepEqual(hits, []);
});
