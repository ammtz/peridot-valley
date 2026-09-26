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

// --- New teams for the four work presets. Same voice as the seed: short, concrete, a little human. ---

const LEADS: PresetTeamSeed = {
  id: 'leads',
  name: 'LEADS',
  pool: ['Log yesterday’s calls', 'Update the pipeline stages', 'Send a check-in email'],
  agents: [
    { n: 'PING', role: 'outreach', doing: 'Follow up with 12 warm leads', backlog: ['Draft the Q4 outreach sequence'], done: ['Booked 3 demo calls'] },
    { n: 'CLOSE', role: 'deals', doing: null, backlog: ['Chase the stalled Acme contract', 'Send the updated pricing sheet'], done: ['Closed the Miller renewal'] },
  ],
};
const SUPPORT: PresetTeamSeed = {
  id: 'support',
  name: 'SUPPORT',
  pool: ['Tag today’s tickets by topic', 'Reply to the easy ones first', 'Flag repeat complaints'],
  agents: [
    { n: 'DESK', role: 'tickets', doing: 'Clear the overnight ticket queue', backlog: ['Write a canned reply for refund requests'], done: ['Resolved 14 tickets today'] },
    { n: 'CALM', role: 'escalations', doing: null, backlog: [], done: ['Talked down an angry churn threat'] },
  ],
};
const BUILD: PresetTeamSeed = {
  id: 'build',
  name: 'BUILD',
  pool: ['Review open pull requests', 'Update the sprint board', 'Clear the build queue'],
  agents: [
    { n: 'SHIP', role: 'release', doing: 'Cut the Thursday release branch', backlog: ['Write the changelog'], done: ['Deployed the search fix'] },
    { n: 'FIXIT', role: 'bugs', doing: null, backlog: ['Triage the crash reports', 'Reproduce the login bug'], done: ['Closed 6 bugs this week'] },
  ],
};
const QA: PresetTeamSeed = {
  id: 'qa',
  name: 'QA',
  pool: ['Retest yesterday’s fixes', 'File a bug report', 'Update the test plan'],
  agents: [
    { n: 'CHECKER', role: 'testing', doing: 'Run the regression suite', backlog: ['Write tests for the new endpoint'], done: ['Caught the checkout bug before ship'] },
    { n: 'LOOP', role: 'automation', doing: null, backlog: [], done: ['Automated the login smoke test'] },
  ],
};
const INBOX: PresetTeamSeed = {
  id: 'inbox',
  name: 'INBOX',
  pool: ['Sort new mail by urgency', 'Snooze the low-priority stuff', 'Flag anything needing a signature'],
  agents: [
    { n: 'SORT', role: 'triage', doing: 'Clear this morning’s inbox', backlog: ['Unsubscribe from 10 lists'], done: ['Filed 20 emails into folders'] },
    { n: 'REPLY', role: 'drafts', doing: null, backlog: ['Draft replies to 5 open threads'], done: ['Answered the vendor’s question'] },
  ],
};
const BOOKS_TEAM: PresetTeamSeed = {
  id: 'books',
  name: 'BOOKS',
  pool: ['Log new expenses', 'Match receipts to statements', 'Update the budget sheet'],
  agents: [
    { n: 'LEDGER', role: 'bookkeeping', doing: 'Reconcile this month’s invoices', backlog: ['Chase 3 overdue payments'], done: ['Closed out September books'] },
    { n: 'RECEIPT', role: 'expenses', doing: null, backlog: ['Sort receipts by category'], done: ['Filed the travel expense report'] },
    { n: 'AUDIT', role: 'checks', doing: null, backlog: [], done: ['Caught a duplicate charge'] },
  ],
};
const HIRING: PresetTeamSeed = {
  id: 'hiring',
  name: 'HIRING',
  pool: ['Post the open role', 'Review incoming resumes', 'Send interview follow-ups'],
  agents: [
    { n: 'SCREEN', role: 'candidates', doing: 'Screen this week’s applicants', backlog: ['Schedule 3 first-round calls'], done: ['Sent 2 offer letters'] },
    { n: 'REF', role: 'references', doing: null, backlog: ['Check references for the finalist'], done: ['Confirmed start date with new hire'] },
  ],
};

const PERSONAL: Record<string, Preset> = {
  money: { key: 'money', managers: [{ id: 'ada', name: 'ADA', role: 'CAPITAL', runs: 'MONEY', teams: [fromSeed('fin'), fromSeed('mkt')] }] },
  home: { key: 'home', managers: [{ id: 'otto', name: 'OTTO', role: 'HOME & LIFE', runs: 'HOME', teams: [fromSeed('fam'), fromSeed('pets')] }] },
  health: { key: 'health', managers: [{ id: 'vesta', name: 'VESTA', role: 'HEALTH & HABITS', runs: 'HEALTH', teams: [fromSeed('sched'), fromSeed('ins')] }] },
  everything: {
    key: 'everything',
    managers: [
      { id: 'ada', name: 'ADA', role: 'CAPITAL', runs: 'MONEY', teams: [fromSeed('fin'), fromSeed('mkt')] },
      { id: 'otto', name: 'OTTO', role: 'HOME & LIFE', runs: 'HOME', teams: [fromSeed('fam'), fromSeed('groc')] },
    ],
  },
};

const WORK: Record<string, Preset> = {
  customers: { key: 'customers', managers: [{ id: 'rey', name: 'REY', role: 'GROWTH', runs: 'SALES', teams: [LEADS, SUPPORT] }] },
  build: { key: 'build', managers: [{ id: 'forge', name: 'FORGE', role: 'PRODUCT', runs: 'PRODUCT', teams: [BUILD, QA] }] },
  admin: { key: 'admin', managers: [{ id: 'dash', name: 'DASH', role: 'OPERATIONS', runs: 'OPS', teams: [INBOX, BOOKS_TEAM, HIRING] }] },
  everything: {
    key: 'everything',
    managers: [
      { id: 'rey', name: 'REY', role: 'GROWTH', runs: 'SALES', teams: [LEADS, SUPPORT] },
      { id: 'forge', name: 'FORGE', role: 'PRODUCT', runs: 'PRODUCT', teams: [BUILD, QA] },
    ],
  },
};

export const Q3_PERSONAL: [string, string][] = [
  ['money', 'Money'],
  ['home', 'Home & family'],
  ['health', 'Health & habits'],
  ['everything', 'A bit of everything'],
];
export const Q3_WORK: [string, string][] = [
  ['customers', 'Customers & sales'],
  ['build', 'Building the product'],
  ['admin', 'Admin & operations'],
  ['everything', 'A bit of everything'],
];

export function pickPreset(who: 'me' | 'work', focusKey: string): Preset {
  const table = who === 'me' ? PERSONAL : WORK;
  return table[focusKey] || table.everything;
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
