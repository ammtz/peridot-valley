// Characterization test for the starting valley. Pins what the code does now
// when entering via the intro questions or the bypass link.
import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../src/model/sim';

const data = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  },
});

// Mock window for headless tests
if (typeof window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: {
      innerWidth: 1024,
      innerHeight: 768,
      location: { search: '' },
      matchMedia: () => ({ matches: false, addEventListener: () => {} }),
    },
  });
}

beforeEach(() => data.clear());

test('intro path: answering both questions hires one manager and three helpers', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const sim = new Sim();
    assert.equal(sim.introOn, true, 'intro should be on for fresh sim');
    assert.equal(sim.introPhase, 'sleep', 'should start in sleep phase');
    assert.deepEqual(Object.keys(sim.m.sups), ['pip'], 'should start with just VIC');
    assert.equal(sim.m.agents.length, 0, 'should start with no agents');
    assert.equal(sim.m.teams.length, 0, 'should start with no teams');

    // Wake up
    sim.wake();
    assert.equal(sim.introPhase, 'greet', 'should move to greet after wake');

    // Advance to Q1
    sim.advanceGreet();
    assert.equal(sim.introPhase, 'q1', 'should move to q1');

    // Answer Q1: you decide on approvals
    sim.answerQ1(true);
    assert.equal(sim.thinking, true, 'should be thinking after answerQ1');
    mock.timers.tick(60_000);
    assert.equal(sim.thinking, false, 'should finish thinking after timeout');
    assert.equal(sim.introPhase, 'q2', 'should move to q2 after timeout');
    assert.deepEqual(sim.vicNotes, ['Approvals: you decide'], 'should record Q1 answer');

    // Answer Q2: job hunt
    sim.answerQ2('job');
    assert.equal(sim.thinking, true, 'should be thinking after answerQ2');
    mock.timers.tick(60_000);
    assert.equal(sim.thinking, false, 'should finish thinking after timeout');
    assert.equal(sim.introPhase, 'hiring', 'should move to hiring after timeout');
    assert.deepEqual(sim.vicNotes, ['Approvals: you decide', 'First job: job hunt'], 'should record Q2 answer');

    // Hire the first (single) manager
    assert.equal(sim.currentHire()?.name, 'DASH', 'should offer DASH for job hunt');
    sim.hireCurrent();

    // Check state after hiring
    assert.equal(sim.introOn, false, 'intro should be off after hiring');
    assert.equal(sim.introPhase, null, 'intro phase should be null after hiring');

    // Check managers
    const managerIds = Object.keys(sim.m.sups);
    assert.equal(managerIds.length, 2, 'should have VIC and one hired manager');
    assert.ok(managerIds.includes('pip'), 'should have VIC (pip)');
    assert.ok(managerIds.includes('dash'), 'should have DASH');
    assert.equal(sim.m.sups.dash.name, 'DASH', 'hired manager should be named DASH');
    assert.equal(sim.m.sups.dash.role, 'WORK', 'DASH should have role WORK');

    // Check team
    assert.equal(sim.m.teams.length, 1, 'should have one team after hiring');
    const team = sim.m.teams[0];
    assert.equal(team.id, 'job', 'team should be job team');
    assert.equal(team.name, 'JOB HUNT', 'team name should be JOB HUNT');
    assert.equal(team.boss, 'dash', 'team boss should be DASH');

    // Check agents in the team (should be 3 helpers)
    const jobAgents = sim.m.agents.filter((a) => a.team === 'job');
    assert.equal(jobAgents.length, 3, 'job team should have 3 helpers');
    const agentNames = jobAgents.map((a) => a.name).sort();
    assert.deepEqual(agentNames, ['FIT', 'PEN', 'SCOUT'], 'helpers should be SCOUT, FIT, PEN');

    // Check state (onboarded is false until save() is called)
    assert.equal(sim.m.onboarded, false, 'onboarded should be false until save() is called');
  } finally {
    mock.timers.reset();
  }
});

test('bypass path: the bypass link loads full seed with VIC, two managers and four teams', () => {
  const sim = new Sim();
  assert.equal(sim.introOn, true, 'intro should be on for fresh sim');

  // Skip the intro
  sim.skipIntro();

  assert.equal(sim.introOn, false, 'intro should be off after the bypass link');
  assert.equal(sim.introPhase, null, 'intro phase should be null after the bypass link');
  assert.equal(sim.m.onboarded, true, 'model should be marked onboarded');

  // Check managers (VIC, DASH, OTTO)
  const managerIds = Object.keys(sim.m.sups).sort();
  assert.equal(managerIds.length, 3, 'should have three managers');
  assert.deepEqual(managerIds, ['dash', 'otto', 'pip'], 'should have pip, dash, otto');
  assert.equal(sim.m.sups.pip.name, 'VIC', 'pip should be named VIC');
  assert.equal(sim.m.sups.dash.name, 'DASH', 'dash should be named DASH');
  assert.equal(sim.m.sups.otto.name, 'OTTO', 'otto should be named OTTO');

  // Check teams (JOB HUNT, INBOX, MONEY, HOME)
  assert.equal(sim.m.teams.length, 4, 'should have four teams');
  const teamNames = sim.m.teams.map((t) => t.name).sort();
  assert.deepEqual(teamNames, ['HOME', 'INBOX', 'JOB HUNT', 'MONEY'], 'should have the four seeded teams');

  // Check team assignments to managers
  assert.equal(sim.team('job')?.boss, 'dash', 'JOB HUNT should be under DASH');
  assert.equal(sim.team('inbox')?.boss, 'dash', 'INBOX should be under DASH');
  assert.equal(sim.team('money')?.boss, 'otto', 'MONEY should be under OTTO');
  assert.equal(sim.team('home')?.boss, 'otto', 'HOME should be under OTTO');

  // Check agent counts per team
  const jobAgents = sim.m.agents.filter((a) => a.team === 'job');
  const inboxAgents = sim.m.agents.filter((a) => a.team === 'inbox');
  const moneyAgents = sim.m.agents.filter((a) => a.team === 'money');
  const homeAgents = sim.m.agents.filter((a) => a.team === 'home');

  assert.equal(jobAgents.length, 3, 'job team should have 3 agents');
  assert.equal(inboxAgents.length, 3, 'inbox team should have 3 agents');
  assert.equal(moneyAgents.length, 3, 'money team should have 3 agents');
  assert.equal(homeAgents.length, 3, 'home team should have 3 agents');
  assert.equal(sim.m.agents.length, 12, 'should have 12 total agents');

  // Check furniture (dock tools)
  assert.equal(sim.m.furn.length, 2, 'should have 2 pieces of furniture');
  const furnTypes = sim.m.furn.map((f) => f.type).sort();
  assert.deepEqual(furnTypes, ['db', 'mcp'], 'should have db and mcp furniture');

  // Check which teams are wired to which furniture
  const dbFurn = sim.m.furn.find((f) => f.type === 'db');
  const mcpFurn = sim.m.furn.find((f) => f.type === 'mcp');
  assert.deepEqual(dbFurn?.wires, ['job', 'inbox'], 'db should wire job and inbox');
  assert.deepEqual(mcpFurn?.wires, ['money', 'home'], 'mcp should wire money and home');

  // Check feed and needs (should be populated)
  assert.ok(sim.m.feed.length > 0, 'should have feed cards');
  assert.ok(sim.m.needs.length > 0, 'should have needs');
});
