// Characterization test for browser save, RESET, and ?fresh functionality.
// Pins what the code does NOW: the valley written to storage is the valley read back,
// RESET empties it, and ?fresh replays the opening.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../src/model/sim';
import { seed } from '../src/model/seed';
import { KEY } from '../src/model/constants';

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

test('save and load: the valley written to storage is the valley read back', () => {
  // Create and modify a valley, then save it
  const sim1 = make();
  const initialTeamCount = sim1.m.teams.length;
  sim1.addTeam('pip');
  assert.equal(sim1.m.teams.length, initialTeamCount + 1);
  sim1.save();

  // Verify localStorage has the saved data
  assert.ok(data.has(KEY));

  // Create a new sim, which should load the saved state
  const sim2 = new Sim();
  assert.equal(sim2.introOn, false, 'loaded sim should not be in intro');
  assert.equal(sim2.m.teams.length, initialTeamCount + 1, 'loaded sim should have the added team');
  assert.equal(sim2.m.onboarded, true, 'loaded sim should be marked as onboarded');

  // Verify the important fields match
  assert.deepEqual(sim2.m.teams.map((t) => t.id), sim1.m.teams.map((t) => t.id));
  assert.deepEqual(sim2.m.agents.map((a) => a.id), sim1.m.agents.map((a) => a.id));
  assert.deepEqual(Object.keys(sim2.m.sups), Object.keys(sim1.m.sups));
});

test('RESET empties storage and shows the starting valley', () => {
  // Stub window for renderVals()
  const oldWindow = (globalThis as unknown as { window?: unknown }).window;
  try {
    (globalThis as unknown as { window: unknown }).window = {
      location: { search: '' },
      matchMedia: () => ({ matches: false, addEventListener() {} }),
    };

    // Create and save a valley
    const sim1 = make();
    sim1.save();

    // Verify localStorage has the save
    assert.ok(data.has(KEY));

    // Call the real resetYes() via renderVals()
    sim1.renderVals().resetYes();

    // Verify localStorage is empty
    assert(!data.has(KEY), 'localStorage should be empty after reset');

    // Verify the sim itself is in blank state
    assert.equal(sim1.introOn, true, 'after reset, introOn should be true');
    assert.equal(sim1.m.teams.length, 0, 'after reset, teams should be empty');
    assert.equal(sim1.m.agents.length, 0, 'after reset, agents should be empty');
    assert.equal(Object.keys(sim1.m.sups).length, 1, 'after reset, just VIC remains');
    assert.ok(sim1.m.sups.pip, 'VIC (pip) should exist after reset');

    // Create a new sim: it should load the blank starting valley
    const sim2 = new Sim();
    assert.equal(sim2.introOn, true, 'fresh sim should be in intro');
    assert.equal(sim2.m.teams.length, 0, 'fresh sim should have no teams');
    assert.equal(sim2.m.agents.length, 0, 'fresh sim should have no agents');
    assert.equal(Object.keys(sim2.m.sups).length, 1, 'fresh sim should have just VIC');
    assert.equal(sim2.m.onboarded, false, 'fresh sim should not be marked as onboarded');
  } finally {
    if (oldWindow === undefined) {
      delete (globalThis as unknown as { window?: unknown }).window;
    } else {
      (globalThis as unknown as { window: unknown }).window = oldWindow;
    }
  }
});

test('?fresh replays the opening even when a save exists', () => {
  // Create and save a valley
  const sim1 = make();
  sim1.save();

  // Verify localStorage has the save
  assert.ok(data.has(KEY));
  const savedData = data.get(KEY);
  assert.ok(savedData);

  // Stub window.location.search to simulate ?fresh URL
  const oldWindow = (globalThis as unknown as { window?: unknown }).window;
  try {
    (globalThis as unknown as { window: unknown }).window = {
      location: { search: '?fresh' },
      matchMedia: () => ({ matches: false, addEventListener() {} }),
    };

    // Create a new sim with ?fresh in the URL
    const sim2 = new Sim();

    // Verify localStorage still has the save
    assert.ok(data.has(KEY), 'localStorage should still have the save');
    assert.equal(data.get(KEY), savedData, 'localStorage should be unchanged');

    // Verify the sim did NOT load the saved state
    assert.equal(sim2.introOn, true, '?fresh should show intro');
    assert.equal(sim2.m.teams.length, 0, '?fresh should start with no teams');
    assert.equal(sim2.m.agents.length, 0, '?fresh should start with no agents');
    assert.equal(sim2.m.onboarded, false, '?fresh should not be marked as onboarded');
  } finally {
    if (oldWindow === undefined) {
      delete (globalThis as unknown as { window?: unknown }).window;
    } else {
      (globalThis as unknown as { window: unknown }).window = oldWindow;
    }
  }
});
