// Characterization test for drag effects: what the model does when teams move to new
// managers and tools (furniture) are wired to or unplugged from teams.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../src/model/sim';
import { seed } from '../src/model/seed';
import { MAX_TEAMS_PER_MANAGER } from '../src/model/constants';

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

test('drag: team moved to another manager has that manager as its parent', () => {
  const s = make();
  const T = s.team('job')!;
  const oldBoss = T.boss;
  assert.equal(oldBoss, 'dash');
  s.reparent('team', T.id, 'otto');
  assert.equal(T.boss, 'otto');
});

test('drag: tool brought to a team is granted (wired)', () => {
  const s = make();
  const T = s.team('job')!;
  const F = s.m.furn.find((f) => f.type === 'db')!;
  // Ensure the tool is not already wired to this team
  F.wires = (F.wires || []).filter((id) => id !== T.id);
  assert.ok(!(F.wires || []).includes(T.id), 'tool must not be pre-wired');
  // Simulate the drag: set wiring mode and click the team
  s.wiring = F.id;
  s.plugClick(T.id);
  assert.ok((F.wires || []).includes(T.id), 'tool must be wired after drag');
});

test('drag: tool taken away is revoked (unplugged)', () => {
  const s = make();
  const T = s.team('job')!;
  const F = s.m.furn.find((f) => f.type === 'db')!;
  // First wire it
  F.wires = (F.wires || []).filter((id) => id !== T.id);
  s.wiring = F.id;
  s.plugClick(T.id);
  assert.ok((F.wires || []).includes(T.id), 'tool must be wired first');
  // Then unplug it
  s.unplug(F.id, T.id);
  assert.ok(!(F.wires || []).includes(T.id), 'tool must be unwired after unplug');
});

test('drag: sixth team moved to a manager at cap is refused', () => {
  const s = make();
  // Add teams to otto until it has MAX_TEAMS_PER_MANAGER teams
  for (let i = 0; i < MAX_TEAMS_PER_MANAGER && s.managerLoad('otto') < MAX_TEAMS_PER_MANAGER; i++) s.addTeam('otto');
  assert.equal(s.managerLoad('otto'), 5);
  // Try to move a team from dash to otto (which is full)
  const jobTeam = s.team('job')!;
  const origBoss = jobTeam.boss;
  assert.equal(origBoss, 'dash');
  s.reparent('team', jobTeam.id, 'otto');
  // The team should NOT have moved because otto is full
  assert.equal(jobTeam.boss, origBoss);
});
