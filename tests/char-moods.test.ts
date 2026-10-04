// Characterization tests for the five agent moods. Each test pins what the code does
// now to the sim state that produces it. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../src/model/sim';
import { seed } from '../src/model/seed';
import { NOW } from '../src/model/constants';

const data = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  },
});

/** A sim on the full seeded valley, past the opening. */
const make = () => {
  data.clear();
  const s = new Sim();
  s.m = seed();
  s.m.onboarded = true;
  s.introOn = false;
  s.introPhase = null;
  s.builder = true;
  return s;
};

test('Flowing', () => {
  const s = make();
  const a = s.agent('job-scout')!;
  const t = NOW();
  // An agent is flowing when they are finishing tasks back to back.
  // Set flowUntil to a future time to put them in flow.
  a.flowUntil = t + 10;
  a.doing = 'task-1';
  a.backlog = [];
  assert.equal(s.mood(a, t), 'flow');
});

test('Swamped', () => {
  const s = make();
  const a = s.agent('job-scout')!;
  const t = NOW();
  // An agent is swamped when they have too much on their plate.
  // This happens when backlog has 4 or more items.
  a.backlog = ['1', '2', '3', '4'];
  a.doing = 'current-task';
  a.flowUntil = 0;
  a.fear = null;
  a.blocked = null;
  assert.equal(s.mood(a, t), 'overwhelmed');
});

test('Unsure', () => {
  const s = make();
  const a = s.agent('job-scout')!;
  const t = NOW();
  // An agent is unsure when waiting for approval (fear is set).
  a.fear = 'paying';
  a.doing = 'current-task';
  a.backlog = [];
  a.flowUntil = 0;
  a.blocked = null;
  assert.equal(s.mood(a, t), 'stalled');
});

test('Stuck', () => {
  const s = make();
  const a = s.agent('job-scout')!;
  const t = NOW();
  // An agent is stuck when blocked until someone steps in.
  a.blocked = { text: 'no login', fix: 'FIX' };
  a.doing = 'current-task';
  a.backlog = [];
  a.flowUntil = 0;
  a.fear = null;
  assert.equal(s.mood(a, t), 'frustrated');
});

test('Bored', () => {
  const s = make();
  const a = s.agent('job-scout')!;
  const t = NOW();
  // An agent is bored when idle with nothing in the queue.
  a.doing = null;
  a.backlog = [];
  a.flowUntil = 0;
  a.fear = null;
  a.blocked = null;
  assert.equal(s.mood(a, t), 'bored');
});
