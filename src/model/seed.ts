import type { Agent, Furniture, Manager, Need, Team, WorldModel } from './types';
import { CURRENT_V } from './constants';
import { taskPoolFor } from './scenarios';

type SupSeed = [string, string, string, number, number, number, string | null];
type AgentSeed = [string, string, string | null, string[], string[], Partial<Agent>?];
type TeamSeed = [string, string, string, number, number, Team['state'], string[], AgentSeed[]];

export const SUPS: SupSeed[] = [
  ['pip', 'VIC', 'CHIEF OF STUFF', 540, 115, 58, null],
  ['dash', 'DASH', 'WORK', 300, 385, 42, 'pip'],
  ['otto', 'OTTO', 'HOME & MONEY', 780, 385, 42, 'pip'],
];

export const TEAMS: TeamSeed[] = [
  [
    'job', 'JOB HUNT', 'dash', 150, 650, 'active',
    taskPoolFor('job'),
    [
      ['SCOUT', 'search', 'Search 3 job boards for roles that fit you', [], ['Found 12 new postings overnight']],
      ['FIT', 'ranking', null, ['Rank the 12 against your must-haves'], ['Dropped 5 that need a security clearance']],
      ['PEN', 'applications', null, ['Tailor your resume for the top pick'], ['Drafted a cover letter for the design role']],
    ],
  ],
  [
    'inbox', 'INBOX', 'dash', 450, 790, 'active',
    taskPoolFor('inbox'),
    [
      ['SORT', 'triage', 'Clear this morning’s inbox', [], ['Filed 20 emails into folders']],
      ['REPLY', 'drafts', null, ['Draft replies to 5 open threads'], ['Answered the landlord’s question']],
      ['CAL', 'calendar', null, ['Find a slot for the dentist'], ['Moved Thursday’s call to 3pm']],
    ],
  ],
  [
    'money', 'MONEY', 'otto', 660, 650, 'active',
    taskPoolFor('money'),
    [
      ['BILLS', 'payments', 'Pay the electric bill before Friday', [], ['Paid the internet bill on time']],
      ['SUBS', 'subscriptions', null, ['Check for subscriptions you don’t use'], ['Found 2 unused subscriptions, $24 a month']],
      ['WATCH', 'charges', null, ['Scan this week’s card charges'], ['Caught a double charge at the gas station']],
    ],
  ],
  [
    'home', 'HOME', 'otto', 960, 790, 'active',
    taskPoolFor('home'),
    [
      ['KIN', 'appointments', 'Book the kids’ checkups', [], ['Renewed the car registration']],
      ['CART', 'groceries', null, ['Reorder the weekly groceries'], ['Swapped the milk for the brand you like']],
      ['FIX', 'repairs', null, ['Get 3 quotes for the leaky faucet'], ['Scheduled the AC tune-up']],
    ],
  ],
];

export const NEEDS: Need[] = [
  { id: 'n1', team: 'money', text: 'BILLS is ready to pay the electric bill before Friday. Go ahead?', acts: [['GO AHEAD', 'ack']], ok: 'Paid the electric bill.' },
  { id: 'n2', team: 'home', text: 'KIN found a checkup slot for the kids Tuesday at 4pm. Book it?', acts: [['BOOK IT', 'ack']], ok: 'Booked the checkup.' },
];

export function seed(): WorldModel {
  const sups: Record<string, Manager> = {};
  SUPS.forEach(([id, name, role, x, y, size, boss]) => {
    sups[id] = { id, name, role, x, y, size, boss };
  });
  const teams: Team[] = [];
  const agents: Agent[] = [];
  TEAMS.forEach(([id, name, boss, x, y, state, pool, ags]) => {
    teams.push({ id, name, boss, x, y, state, pool, pi: 3 });
    ags.forEach(([n, role, doing, backlog, done, extra]) => {
      agents.push({
        id: id + '-' + n.toLowerCase(),
        name: n,
        role,
        team: id,
        doing,
        backlog: backlog.slice(),
        done: done.slice(),
        blocked: null,
        fear: null,
        ...(extra || {}),
      });
    });
  });
  const d = Date.now();
  const feed: WorldModel['feed'] = [
    { id: 'f3', kind: 'DONE', path: 'OTTO › HOME', who: 'FIX', text: 'Scheduled the AC tune-up', ts: d - 60000 },
    { id: 'f2', kind: 'DONE', path: 'OTTO › MONEY', who: 'WATCH', text: 'Caught a double charge at the gas station', ts: d - 180000 },
    { id: 'f1', kind: 'DONE', path: 'DASH › JOB HUNT', who: 'SCOUT', text: 'Found 12 new postings overnight', ts: d - 300000 },
  ];
  const furn: Furniture[] = [
    { id: 'fx-db', type: 'db', x: 300, y: 730, on: [true, true, false, false] },
    { id: 'fx-mcp', type: 'mcp', x: 810, y: 720, on: [true, false, true, false, false] },
  ];
  return { v: CURRENT_V, sups, teams, agents, furn, needs: NEEDS.map((n) => ({ ...n })), feed };
}

/** The opening screen: PIP alone, nothing hired yet. */
export function blank(): WorldModel {
  return {
    v: CURRENT_V,
    sups: { pip: { id: 'pip', name: 'VIC', role: 'CHIEF OF STUFF', x: 540, y: 200, size: 58, boss: null } },
    teams: [],
    agents: [],
    furn: [],
    needs: [],
    feed: [],
    onboarded: false,
  };
}

export const roomW = (n: number) => Math.max(124, 100 + n * 20);
export const roomH = (n: number) => 84 + Math.min(Math.max(n, 1), 4) * 9;

export function desks(n: number, w: number, h: number): [number, number][] {
  const iw = w - 50,
    ih = h - 46;
  const cols = n <= 3 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / Math.max(cols, 1));
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols),
      c = i % cols;
    out.push([cols > 1 ? -iw / 2 + (c * iw) / (cols - 1) : 0, rows > 1 ? -ih / 2 + (r * ih) / (rows - 1) : -2]);
  }
  return out;
}
