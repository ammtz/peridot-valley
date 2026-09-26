import type { FurnKind, Mood } from './types';

export const KEY = 'the-system-live-v4';

export const cap = (x: string) => (x ? x[0].toUpperCase() + x.slice(1) : x);

export const BLOCKERS: Record<string, [string, string]> = {
  fin: ['the Amex login expired', 'RE-AUTH AMEX'],
  sched: ['two invites overlap at 3pm', 'PICK ONE'],
  mkt: ['the exchange API is rate-limiting me', 'RETRY'],
  fam: ["the school portal rejected the file", 'RETRY UPLOAD'],
  pets: ["the vet’s booking site is down", 'CALL INSTEAD'],
  ins: ['the insurer wants a policy number', 'SEND IT'],
  tax: ["last year’s W-2 is missing", 'UPLOAD W-2'],
  groc: ['your usual store is out of oat milk', 'PICK SUBSTITUTE'],
  leads: ['the CRM sync failed again', 'RETRY SYNC'],
  support: ["a ticket needs account access we don’t have", 'REQUEST ACCESS'],
  build: ['the staging deploy is failing', 'RETRY DEPLOY'],
  qa: ['the test environment is down', 'RESTART ENV'],
  inbox: ['the shared inbox lost its login', 'RE-AUTH INBOX'],
  books: ["last month’s invoice totals don’t match", 'RECONCILE'],
  hiring: ["a candidate’s references bounced", 'RE-SEND REQUEST'],
  _: ['a login expired', 'RE-AUTH'],
};

export const FEARS: Record<string, string> = {
  fin: 'moving $2,000 into savings',
  sched: "declining your boss’s invite",
  mkt: 'selling at a small loss',
  fam: 'sharing grades with the school',
  pets: 'switching to a cheaper vet',
  ins: 'sending your details to 3 insurers',
  tax: 'claiming the home office',
  groc: 'going $40 over budget',
  leads: 'sending a discount without asking',
  support: 'issuing a refund over $200',
  build: 'shipping straight to production',
  qa: 'signing off without a human pass',
  inbox: 'replying to an angry customer',
  books: 'paying an invoice that looks off',
  hiring: 'making an offer before you see it',
  _: 'doing this without asking',
};

export const MOOD: Record<Mood, { label: string; tag: string; c: string; icon: string }> = {
  working: { label: 'WORKING', tag: '', c: '#15140f', icon: '' },
  flow: { label: 'IN FLOW', tag: 'FLOW', c: '#3aa865', icon: '✦' },
  overwhelmed: { label: 'OVERWHELMED', tag: 'SWAMPED', c: '#ee7a2f', icon: '' },
  bored: { label: 'BORED', tag: 'BORED', c: '#a9b4c4', icon: 'z' },
  frustrated: { label: 'FRUSTRATED', tag: 'STUCK', c: '#d63c2f', icon: '!' },
  stalled: { label: 'STALLED', tag: 'UNSURE', c: '#e8b923', icon: '?' },
  pending: { label: 'WAITING', tag: '', c: 'rgba(21,20,15,.2)', icon: '' },
};

export const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const outBack = (p: number) => {
  const c1 = 1.70158,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
export const outCubic = (p: number) => 1 - Math.pow(1 - p, 3);
export const inOutSine = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;
export const inOutCubic = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const NOW = () => performance.now() / 1000;
export const FR = 190;
export const MGR_NAMES = ['IVY', 'REX', 'MOSS', 'LUNA', 'KIT', 'JUNO', 'FERN', 'BO', 'SAGE', 'NIX'];

export const FT: Record<FurnKind, { name: string; short: string; desc: string; optsLabel: string; opts: string[] }> = {
  mcp: {
    name: 'MCP RACK',
    short: 'MCP',
    desc: 'Plugs nearby agents into your tools so they can act, not just draft.',
    optsLabel: 'CONNECTORS',
    opts: ['Gmail', 'Drive', 'Calendar', 'Bank', 'Slack'],
  },
  db: {
    name: 'DATABASE',
    short: 'DB',
    desc: 'Shared memory. Nearby agents can query history before they decide.',
    optsLabel: 'TABLES',
    opts: ['Transactions', 'Receipts', 'Contacts', 'Health records'],
  },
  books: {
    name: 'BOOKSHELF',
    short: 'CONTEXT',
    desc: 'Context about how you like things done. Nearby agents read it first.',
    optsLabel: 'SHELVES',
    opts: ['Ask before acting', 'House rules', 'Preferences', 'Past decisions', 'Family info'],
  },
  rec: {
    name: 'RECORDER',
    short: 'REC',
    desc: 'Watches a team and sends you a recap on a schedule.',
    optsLabel: 'RECAP EVERY',
    opts: ['Every 10 min', 'Every hour', 'Daily digest', 'Only when someone’s stuck'],
  },
};
export const FT_KEYS: FurnKind[] = ['mcp', 'db', 'books', 'rec'];
/** Dock hover/hold tip copy — separate from the popup description, per the spec's exact wording. */
export const DOCK_TIP: Record<FurnKind, string> = {
  mcp: 'Plugs the team into your apps: Gmail, Calendar, Drive, your bank.',
  db: 'Something to look things up in: receipts, contacts, records.',
  books: 'Your rules and preferences, so they act the way you would.',
  rec: 'Watches a team and sends you a recap on a schedule.',
};
/** Demo time compression for the recorder: index-matched to FT.rec.opts. `null` = event-triggered, not periodic. */
export const REC_DEMO_SECS: (number | null)[] = [45, 90, 180, null];
export const REC_LABELS = ['last 10 min', 'last hour', 'today', 'since last check'];
