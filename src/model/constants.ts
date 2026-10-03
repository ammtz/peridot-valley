import type { FurnKind, Mood } from './types';

export const KEY = 'the-system-live-v4';
/** T5: bump whenever demo-v2 changes the saved shape, and add the fill-in to Sim.migrate(). */
export const CURRENT_V = 4;

/** A manager (other than VIC, the chief) can hold at most this many teams and sub-managers. */
export const MAX_TEAMS_PER_MANAGER = 5;

export const cap = (x: string) => (x ? x[0].toUpperCase() + x.slice(1) : x);
/** V5: "N word(s)" — pass the plural form only when it isn't just `word + 's'`. */
export const plural = (n: number, word: string, pluralWord = word + 's') => n + ' ' + (n === 1 ? word : pluralWord);

// U12: one vocabulary for moods — STUCK, UNSURE, SWAMPED, BORED, FLOW. `label` and
// `tag` used to say two different things for the same mood key; now they agree,
// and only WORKING/WAITING (not "moods" in that sense) sit outside the five.
export const MOOD: Record<Mood, { label: string; tag: string; c: string; icon: string }> = {
  working: { label: 'WORKING', tag: '', c: '#15140f', icon: '' },
  flow: { label: 'FLOW', tag: 'FLOW', c: '#3aa865', icon: '✦' },
  overwhelmed: { label: 'SWAMPED', tag: 'SWAMPED', c: '#ee7a2f', icon: '' },
  bored: { label: 'BORED', tag: 'BORED', c: '#a9b4c4', icon: 'z' },
  frustrated: { label: 'STUCK', tag: 'STUCK', c: '#d63c2f', icon: '!' },
  stalled: { label: 'UNSURE', tag: 'UNSURE', c: '#e8b923', icon: '?' },
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
let uidN = 0;
/** A fresh id. Date.now() alone repeats when two things are made in the same millisecond. */
export const uid = (prefix: string) => prefix + Date.now().toString(36) + (uidN++).toString(36);
export const FR = 190;
export const MGR_NAMES = ['IVY', 'REX', 'MOSS', 'LUNA', 'KIT', 'JUNO', 'FERN', 'BO', 'SAGE', 'NIX'];

export const FT: Record<FurnKind, { name: string; short: string; desc: string; optsLabel: string; opts: string[] }> = {
  mcp: {
    name: 'TOOLS',
    short: 'TOOLS',
    desc: 'Plugs nearby agents into your apps so they can act, not just draft.',
    optsLabel: 'CONNECTORS',
    opts: ['Gmail', 'Drive', 'Calendar', 'Bank', 'Slack'],
  },
  db: {
    name: 'DATA',
    short: 'DATA',
    desc: 'Shared memory. Nearby agents can query history before they decide.',
    optsLabel: 'TABLES',
    opts: ['Transactions', 'Receipts', 'Contacts', 'Health records'],
  },
  books: {
    name: 'NOTES',
    short: 'NOTES',
    desc: 'Notes on how you like things done. Nearby agents read them first.',
    optsLabel: 'SHELVES',
    opts: ['Ask before acting', 'House rules', 'Preferences', 'Past decisions', 'Family info'],
  },
  rec: {
    name: 'RECORDER',
    short: 'RECORDER',
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
