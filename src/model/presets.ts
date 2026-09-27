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
  /** How the team is wired, shown on the hire card: a tested pattern, not a blank org chart. */
  plan: TeamPlan;
}

/** A prebuilt orchestration blueprint. Each stage runs after the one above it;
 *  helpers listed in the same stage work side by side. Sign-off is added last,
 *  and goes to you or to Vic depending on the first question. */
export interface TeamPlan {
  shape: string;
  stages: string[][];
  loop?: string;
  why: string;
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
export const PLANS: Record<string, TeamPlan> = {
  job: {
    shape: 'Chain with a learning loop',
    stages: [['SCOUT finds roles'], ['FIT ranks them'], ['PEN tailors the resume']],
    loop: 'Your yes or no teaches FIT what you like',
    why: 'Each step narrows the pile, so you only ever see the best few.',
  },
  inbox: {
    shape: 'Triage and route',
    stages: [['SORT reads everything'], ['REPLY drafts', 'CAL schedules']],
    why: 'One helper reads it all once; specialists take only their part.',
  },
  money: {
    shape: 'Daily watch loop',
    stages: [['WATCH scans charges'], ['SUBS flags repeats'], ['BILLS pays on time']],
    loop: 'Runs again every morning',
    why: 'Money trouble starts small. A daily check catches it the same day.',
  },
  home: {
    shape: 'Parallel crew',
    stages: [['KIN appointments', 'CART groceries', 'FIX repairs'], ['One roundup on Sunday']],
    why: "Errands don't depend on each other, so three helpers work side by side.",
  },
};

const PRESETS: Record<string, Preset> = {
  job: { key: 'job', managers: [{ id: 'dash', name: 'DASH', role: 'WORK', runs: 'JOB HUNT', teams: [fromSeed('job')], plan: PLANS.job }] },
  inbox: { key: 'inbox', managers: [{ id: 'dash', name: 'DASH', role: 'WORK', runs: 'INBOX', teams: [fromSeed('inbox')], plan: PLANS.inbox }] },
  money: { key: 'money', managers: [{ id: 'otto', name: 'OTTO', role: 'HOME & MONEY', runs: 'MONEY', teams: [fromSeed('money')], plan: PLANS.money }] },
  home: { key: 'home', managers: [{ id: 'otto', name: 'OTTO', role: 'HOME & MONEY', runs: 'HOME', teams: [fromSeed('home')], plan: PLANS.home }] },
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
