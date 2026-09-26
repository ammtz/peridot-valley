import type { Agent, Furniture, Manager, Need, Team, WorldModel } from './types';

type SupSeed = [string, string, string, number, number, number, string | null];
type AgentSeed = [string, string, string | null, string[], string[], Partial<Agent>?];
type TeamSeed = [string, string, string, number, number, Team['state'], string[], AgentSeed[]];

export const SUPS: SupSeed[] = [
  ['pip', 'PIP', 'PRIME SUPERVISOR', 540, 115, 58, null],
  ['ada', 'ADA', 'CAPITAL', 290, 385, 42, 'pip'],
  ['otto', 'OTTO', 'HOME & LIFE', 790, 385, 42, 'pip'],
];

export const TEAMS: TeamSeed[] = [
  [
    'sched', 'SCHEDULE', 'pip', 130, 250, 'active',
    ['Tidy next week’s calendar', 'Confirm tomorrow’s appointments', 'Prep notes for the next call'],
    [
      ['CAL', 'calendar', 'Move Thursday’s dentist to 8:30am', ['Find a slot for the quarterly review', 'Block focus time next week'], ['Confirm the 4:00pm supplier meeting']],
      ['BRIEF', 'meeting prep', 'Pull 5 bullets for the supplier meeting', ['Draft the Monday standup agenda'], ['Summarize last week’s calls']],
    ],
  ],
  [
    'fin', 'FINANCE', 'ada', 120, 650, 'active',
    ['Reconcile this week’s transactions', 'Check for new recurring charges', 'Update the savings tracker'],
    [
      ['TALLY', 'bookkeeping', 'Categorize 38 September receipts', ['Reconcile the business card statement'], ['Upload monthly revenue files to Drive']],
      ['PENNY', 'budgets', 'Compare savings vs. last month', ['Flag subscriptions unused for 60 days'], ['Set the October grocery budget']],
      ['CHECK', 'audits', 'Scan the Amex bill for duplicate charges', ['Archive 2025 invoices'], ['Get a $42 double charge refunded'], { blocked: { text: 'the Amex login expired', fix: 'RE-AUTH AMEX' } }],
      ['NOVA', 'forecasts', 'Project Q4 cash flow', ['Model the new car payment', 'Forecast holiday spending', 'Stress-test a 3-month income dip', 'Compare mortgage refi offers', 'Plan the Q1 tax set-aside'], ['Refresh the runway sheet']],
    ],
  ],
  [
    'mkt', 'MARKETS', 'ada', 290, 790, 'active',
    ['Rebalance toward target weights', 'Scan today’s movers', 'Log yesterday’s trades'],
    [
      ['QUANT', 'trading', 'Watch BTC for the rebalance trigger', ['Backtest the weekly DCA plan'], ['Close the ETH position for +$150'], { flowSeed: true }],
      ['SCOUT', 'research', 'Read this week’s 3 earnings calls', ['Shortlist dividend ETFs'], ['Send the Friday market digest']],
      ['HEDGE', 'risk', 'Set stop-losses on new positions', ['Review the portfolio risk score'], ['Trim tech exposure to 30%']],
    ],
  ],
  [
    'fam', 'FAMILY', 'otto', 630, 650, 'active',
    ['Check the school newsletter', 'Sync the family calendar', 'Restock household basics'],
    [
      ['SCHOOL', 'school', 'Package test results for the school portal', ['Book a parent-teacher slot'], ['Pay the field trip fee']],
      ['NEST', 'home', 'Plan Saturday’s birthday party', ['Order a gift for grandma'], ['Book the bounce house']],
      ['CARE', 'health', 'Refill the allergy prescription', ['Schedule annual checkups'], ['Renew the library cards']],
    ],
  ],
  [
    'pets', 'PETS', 'otto', 795, 790, 'active',
    ['Log today’s walks', 'Check flea treatment timing', 'Reorder treats'],
    [
      ['VET', 'health', 'Confirm tomorrow’s 9:00am vet visit', ['Compare pet insurance plans'], ['Log the rabies vaccine date']],
      ['CHOW', 'food', null, [], ['Reorder dog food', 'Switch to grain-free kibble']],
    ],
  ],
  [
    'ins', 'INSURANCE', 'pip', 950, 250, 'active',
    ['Check for policy updates', 'Review open claim status', 'Compare renewal quotes'],
    [
      ['POLICY', 'coverage', 'Read the car policy renewal terms', ['Check home coverage limits'], ['File the windshield claim']],
      ['QUOTE', 'shopping', 'Collect 3 competing car quotes', ['Estimate a home + auto bundle'], ['Save renewal dates to the calendar'], { fear: 'sending your details to 3 insurers' }],
    ],
  ],
  [
    'tax', 'TAXES', 'ada', 455, 650, 'hidden',
    ['Log new deductible expenses', 'Check estimated payment status', 'Sort receipts by category'],
    [
      ['DEDUCT', 'deductions', 'Map last year’s tax spend', ['Scan 2025 receipts for deductions'], []],
      ['FILER', 'filing', 'Set quarterly estimate reminders', ['Collect 1099s as they arrive'], []],
      ['WRITE', 'write-offs', 'Review the home-office write-off', ['Check retirement contribution limits'], []],
    ],
  ],
  [
    'groc', 'GROCERY', 'otto', 960, 650, 'pending',
    ['Build next week’s list', 'Check pantry stock', 'Compare store prices'],
    [
      ['LIST', 'planning', 'Build the weekly list from past orders', ['Add Saturday party snacks'], []],
      ['CART', 'ordering', 'Fill the cart at your usual store', ['Pick a delivery window'], []],
      ['DEAL', 'savings', 'Clip this week’s coupons', ['Compare prices across 3 stores'], []],
    ],
  ],
];

export const NEEDS: Need[] = [
  { id: 'n1', team: 'sched', text: 'Supplier meeting at 4:00pm. I pulled 5 bullets to skim first.', acts: [['OPEN BRIEF', 'ack']], ok: 'Brief opened. Good luck at 4:00.' },
  { id: 'n6', agent: 'fin-check', team: 'fin', kind: 'blocked', text: 'CHECK is stuck: the Amex login expired.', acts: [['RE-AUTH AMEX', 'unblock'], ['LATER', 'skip']] },
  { id: 'n7', agent: 'ins-quote', team: 'ins', kind: 'fear', text: 'QUOTE wants your OK before sending your details to 3 insurers.', acts: [['GO AHEAD', 'approve'], ['HOLD OFF', 'hold']] },
  { id: 'n2', team: 'fam', text: 'Your kid’s test results are packaged for the school portal.', acts: [['UPLOAD', 'ack']], ok: 'Uploaded to the school portal.' },
  { id: 'n3', team: 'ins', text: 'Car insurance renews soon. Should I message your agent to check rates?', acts: [['YES, DO IT', 'ins'], ['NOT NOW', 'skip']] },
  { id: 'n4', team: 'tax', text: 'Your tax spend last year was steep. Build a team to monitor it and find optimizations?', acts: [['BUILD TEAM', 'tax'], ['LATER', 'skip']] },
  { id: 'n5', team: 'groc', text: 'Weekly groceries are one step from automated. I’ll always check with you before checkout.', acts: [['SIGN', 'groc'], ['NOT YET', 'skip']] },
];

export function seed(): WorldModel {
  const sups: Record<string, Manager> = {};
  SUPS.forEach(([id, name, role, x, y, size, boss]) => {
    sups[id] = { id, name, role, x, y, size, boss };
  });
  const teams: Team[] = [];
  const agents: Agent[] = [];
  TEAMS.forEach(([id, name, boss, x, y, state, pool, ags]) => {
    teams.push({ id, name, boss, x, y, state, pool, pi: 0 });
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
    { id: 'f3', kind: 'DONE', path: 'OTTO › PETS', who: 'VET', text: 'Log the rabies vaccine date', ts: d - 60000 },
    { id: 'f2', kind: 'DONE', path: 'ADA › MARKETS', who: 'QUANT', text: 'Close the ETH position for +$150', ts: d - 180000 },
    { id: 'f1', kind: 'DONE', path: 'ADA › FINANCE', who: 'TALLY', text: 'Upload monthly revenue files to Drive (via DATABASE)', ts: d - 300000 },
  ];
  const furn: Furniture[] = [
    { id: 'fx-db', type: 'db', x: -60, y: 650, on: [true, true, false, false] },
    { id: 'fx-mcp', type: 'mcp', x: 10, y: 130, on: [true, false, true, false, false] },
  ];
  return { v: 3, sups, teams, agents, furn, needs: NEEDS.map((n) => ({ ...n })), feed };
}

/** The opening screen: PIP alone, nothing hired yet. */
export function blank(): WorldModel {
  return {
    v: 3,
    sups: { pip: { id: 'pip', name: 'PIP', role: 'PRIME SUPERVISOR', x: 540, y: 200, size: 58, boss: null } },
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
