import type { Agent } from './types';
import { TEAMS } from './seed';

export interface PresetAgentSeed {
  n: string;
  role: string;
  doing: string | null;
  backlog: string[];
  done: string[];
  extra?: Partial<Agent>;
}

export interface PresetTeamSeed {
  id: string;
  name: string;
  pool: string[];
  agents: PresetAgentSeed[];
}

export interface PresetManagerSeed {
  id: string;
  name: string;
  role: string;
  /** short focus word shown on the hire card, e.g. "MONEY" */
  runs: string;
  teams: PresetTeamSeed[];
}

export interface Preset {
  key: string;
  managers: PresetManagerSeed[];
}

/** Pull a team + its agents verbatim out of the seed data, by seed team id. */
function fromSeed(id: string): PresetTeamSeed {
  const t = TEAMS.find((row) => row[0] === id);
  if (!t) throw new Error('unknown seed team ' + id);
  const [, name, , , , , pool, agentSeeds] = t;
  return {
    id,
    name,
    pool: pool.slice(),
    agents: agentSeeds.map(([n, role, doing, backlog, done, extra]) => ({ n, role, doing, backlog: backlog.slice(), done: done.slice(), extra })),
  };
}

// The four use cases. Each answer to "What should your helpers take off your
// plate first?" hires one manager running exactly one team of 3 helpers. The
// full valley (skip path) hires both managers with both of their teams.
const PRESETS: Record<string, Preset> = {
  job: { key: 'job', managers: [{ id: 'dash', name: 'DASH', role: 'WORK', runs: 'JOB HUNT', teams: [fromSeed('job')] }] },
  inbox: { key: 'inbox', managers: [{ id: 'dash', name: 'DASH', role: 'WORK', runs: 'INBOX', teams: [fromSeed('inbox')] }] },
  money: { key: 'money', managers: [{ id: 'otto', name: 'OTTO', role: 'HOME & MONEY', runs: 'MONEY', teams: [fromSeed('money')] }] },
  home: { key: 'home', managers: [{ id: 'otto', name: 'OTTO', role: 'HOME & MONEY', runs: 'HOME', teams: [fromSeed('home')] }] },
};

export const Q2_OPTIONS: [string, string][] = [
  ['job', 'Job hunt'],
  ['inbox', 'Inbox & calendar'],
  ['money', 'Money & bills'],
  ['home', 'Home & family'],
];

export function pickPreset(focusKey: string): Preset {
  return PRESETS[focusKey] || PRESETS.job;
}

export function helperCount(mgr: PresetManagerSeed): number {
  return mgr.teams.reduce((n, t) => n + t.agents.length, 0);
}

export function genericTeamPool() {
  return ['Review the queue', 'Check in with the lead', 'Tidy up shared notes'];
}
export function genericAgents(): PresetAgentSeed[] {
  return [
    { n: 'ONE', role: 'general', doing: 'Get the lay of the land', backlog: [], done: [] },
    { n: 'TWO', role: 'general', doing: null, backlog: ['Ask what needs doing first'], done: [] },
  ];
}
