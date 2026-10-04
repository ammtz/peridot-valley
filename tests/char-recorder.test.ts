// Characterization test: the RECORDER posts recaps at the correct intervals.
// The baseline behavior (main @ 76b0d7d) has the recorder post one recap every 45 seconds
// when wired to a team, and no recaps when wired to no team.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../src/model/sim';
import { seed } from '../src/model/seed';
import { KEY, NOW } from '../src/model/constants';

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
  s.builder = true;
  return s;
};

/** Mock performance.now() to return a controllable clock (in seconds). */
const withMockedClock = (fn: (setClock: (t: number) => void) => void) => {
  let clock = 1000;
  const realNow = performance.now.bind(performance);
  performance.now = () => clock * 1000;
  try {
    fn((t: number) => {
      clock = t;
    });
  } finally {
    performance.now = realNow;
  }
};

test('recorder posts one recap every 45 simulated seconds when wired to a team', () => {
  withMockedClock((setClock) => {
    const s = make();
    const T = s.team('job')!;

    // Place a recorder and wire it to the job team
    const t0 = 1000;
    setClock(t0);
    s.placeFurn('rec', T.x + 100, T.y + 100);
    const rec = s.m.furn[s.m.furn.length - 1];
    rec.build = null; // Finish building immediately
    rec.on = [true, false, false, false]; // Option 0: 45-second recap interval
    rec.born = NOW();

    // Wire it to the team
    rec.wires = ['job'];

    // Verify the recorder is in range
    assert.deepEqual(s.inRange(rec).map((t) => t.id), ['job']);

    // Count RECAP cards in the feed
    const countRecaps = () => s.m.feed.filter((c) => c.kind === 'RECAP').length;

    // At 44 seconds: should have 0 recaps
    setClock(t0 + 44);
    s.step();
    assert.equal(countRecaps(), 0, 'at 44s: no recap yet');

    // At 45 seconds: should have 1 recap
    setClock(t0 + 45);
    s.step();
    assert.equal(countRecaps(), 1, 'at 45s: first recap posted');

    // At 90 seconds: should have 2 recaps
    setClock(t0 + 90);
    s.step();
    assert.equal(countRecaps(), 2, 'at 90s: second recap posted');
  });
});

test('recorder posts no recaps when wired to no team', () => {
  withMockedClock((setClock) => {
    const s = make();

    // Place a recorder but do not wire it
    const t0 = 1000;
    setClock(t0);
    s.placeFurn('rec', 500, 500);
    const rec = s.m.furn[s.m.furn.length - 1];
    rec.build = null; // Finish building immediately
    rec.on = [true, false, false, false]; // Option 0: 45-second recap interval
    rec.born = NOW();

    // Verify the recorder is NOT in range of any team
    assert.deepEqual(s.inRange(rec), []);

    // Count RECAP cards in the feed
    const countRecaps = () => s.m.feed.filter((c) => c.kind === 'RECAP').length;

    // At 90 seconds: should have 0 recaps
    setClock(t0 + 90);
    s.step();
    assert.equal(countRecaps(), 0, 'no recap without wires');
  });
});
