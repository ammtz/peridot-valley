// Everything a scenario says: the work each team picks up, the ways an agent gets stuck, and the
// button the human presses to fix it. One file, plain data, so it is easy to edit.
//
// A stuck case is a tuple [what went wrong, the action button]. The sentence reads as
// "<AGENT> is stuck: <what went wrong>." and the button is something a real person would
// actually have to do (sign in, approve a code, pick between two options), never "FIX".

export type StuckCase = [stuck: string, cta: string];

/** Stuck cases by agent name, 3 or more each. The first match wins: agent name, then team, then generic. */
export const STUCK_BY_AGENT: Record<string, StuckCase[]> = {
  // JOB HUNT
  SCOUT: [
    ['the job board is asking for a CAPTCHA', 'SOLVE CAPTCHA'],
    ['the board logged me out of your account', 'LOG BACK IN'],
    ['two postings look like the same role at different pay', 'PICK ONE'],
    ['a search needs the 6-digit code texted to your phone', 'ENTER CODE'],
  ],
  FIT: [
    ['I can’t tell whether remote-only is a hard rule for you', 'SET THE RULE'],
    ['a posting wants a security clearance you may hold', 'CONFIRM CLEARANCE'],
    ['the salary range is missing on 4 of the 12', 'SET A MINIMUM'],
    ['your must-have list contradicts itself on commute', 'CLEAR IT UP'],
  ],
  PEN: [
    ['the resume file is out of date, last job is missing', 'UPLOAD RESUME'],
    ['the cover letter needs a real story only you know', 'ADD A STORY'],
    ['the application asks for a reference I don’t have', 'ADD A REFERENCE'],
    ['the portfolio link on the form returns an error', 'UPDATE THE LINK'],
  ],
  // INBOX
  SORT: [
    ['your mail provider wants me to sign in again', 'RECONNECT MAIL'],
    ['a thread from a stranger looks like phishing', 'REVIEW THREAD'],
    ['the "Receipts" folder is full and mail is bouncing', 'CLEAR SPACE'],
    ['I can’t decide if the recruiter emails are spam or gold', 'MARK ONE'],
  ],
  REPLY: [
    ['the landlord asked something only you can answer', 'WRITE THE ANSWER'],
    ['my draft to your boss sounds too blunt', 'APPROVE TONE'],
    ['a reply would commit you to a $500 favor', 'DECIDE YES OR NO'],
    ['the thread has 3 people and I don’t know who to cc', 'CHOOSE RECIPIENTS'],
  ],
  CAL: [
    ['calendar access expired', 'RECONNECT CALENDAR'],
    ['the dentist has no slot that avoids your Thursday meeting', 'PICK A DAY'],
    ['two invites overlap and both say "must attend"', 'PICK WHICH'],
    ['the video link for tomorrow’s call is dead', 'SEND NEW LINK'],
  ],
  // MONEY
  BILLS: [
    ['the bank login expired', 'RE-AUTH BANK'],
    ['the electric bill is $40 higher than usual', 'OK THE AMOUNT'],
    ['the payment needs a code your bank just texted', 'ENTER CODE'],
    ['your checking balance would dip under $200 if I pay', 'MOVE FUNDS'],
  ],
  SUBS: [
    ['I can’t cancel the gym online, they want a phone call', 'MAKE THE CALL'],
    ['two streaming plans look the same, one is a family plan', 'KEEP WHICH'],
    ['the cancel page needs you to log in with your own password', 'LOG IN'],
    ['a subscription renewed yesterday, refund needs your OK', 'REQUEST REFUND'],
  ],
  WATCH: [
    ['a $212 charge from a merchant I don’t recognize', 'IS THIS YOURS?'],
    ['the card was declined, the bank flagged it as fraud', 'CONFIRM IT’S YOU'],
    ['two charges for the same gas station, minutes apart', 'DISPUTE IT'],
    ['the card statement won’t download without a security question', 'ANSWER QUESTION'],
  ],
  // HOME
  KIN: [
    ['the pediatrician only has Tuesday at 4pm, you have a call', 'CONFIRM TUESDAY'],
    ['the clinic wants insurance details I don’t have', 'ADD INSURANCE'],
    ['the school form needs a parent’s signature', 'SIGN THE FORM'],
    ['the car registration renewal needs a proof of insurance upload', 'UPLOAD PROOF'],
  ],
  CART: [
    ['the grocery site is down', 'TRY AGAIN'],
    ['your usual oat milk is out of stock', 'PICK A SWAP'],
    ['the delivery window you like is full', 'CHOOSE A TIME'],
    ['the cart total is $60 over your weekly budget', 'APPROVE OVERAGE'],
  ],
  FIX: [
    ['the plumber wants $180 just to come look', 'APPROVE VISIT'],
    ['three quotes came back and one is half the price', 'CHOOSE A QUOTE'],
    ['the AC tune-up needs someone home on Wednesday', 'CONFIRM WHO’S HOME'],
    ['the landlord has to approve a repair over $100', 'ASK LANDLORD'],
  ],
};

/** Stuck cases for a whole team, used when an agent has none of its own (helpers you add, custom teams). */
export const STUCK_BY_TEAM: Record<string, StuckCase[]> = {
  job: [
    ['a company site wants an account created', 'CREATE ACCOUNT'],
    ['the interview invite needs a yes or no today', 'REPLY TO INVITE'],
    ['LinkedIn wants to verify it’s really you', 'VERIFY IT’S YOU'],
  ],
  inbox: [
    ['a newsletter needs unsubscribing and I need your OK', 'UNSUBSCRIBE'],
    ['an email attachment is a contract I can’t open', 'OPEN ATTACHMENT'],
    ['the mailbox is 98% full', 'FREE UP SPACE'],
  ],
  money: [
    ['a bill came in without a due date', 'ADD DUE DATE'],
    ['the tax form needs a number only on paper', 'TYPE THE NUMBER'],
    ['the budget sheet has two accounts with the same name', 'RENAME ONE'],
  ],
  home: [
    ['the repair shop wants a deposit', 'PAY DEPOSIT'],
    ['the delivery needs someone to sign for it', 'PICK A DAY'],
    ['the family calendar has a double-booked weekend', 'RESOLVE CLASH'],
  ],
};

/** Last resort: any agent, any team, including teams the user named themselves. */
export const STUCK_GENERIC: StuckCase[] = [
  ['a login expired', 'RE-AUTH'],
  ['the site wants a code sent to your phone', 'ENTER CODE'],
  ['I found two options and can’t pick for you', 'CHOOSE ONE'],
  ['the file I need is private and I can’t open it', 'SHARE ACCESS'],
  ['a payment page needs your card, not mine', 'ADD PAYMENT'],
  ['the task needs a decision only you can make', 'DECIDE'],
];

/** Things an agent wants your OK for, per team. The button on these is always GO AHEAD or HOLD OFF. */
export const FEARS_BY_TEAM: Record<string, string[]> = {
  job: ['sending an application in your name', 'telling a recruiter your salary range', 'accepting a screening call for Thursday'],
  inbox: ['declining a meeting for you', 'replying "yes" to the landlord', 'unsubscribing you from 14 lists'],
  money: ['cancelling a subscription', 'paying a $240 bill early', 'disputing a charge with your bank'],
  home: ['booking the plumber for Tuesday', 'ordering the pricier groceries', 'rescheduling the kids’ checkups'],
};
export const FEARS_GENERIC = ['doing this without asking', 'sharing a file outside the team', 'spending money for you'];

/** What each team picks up, in the order it arrives. Roughly a dozen each so the feed keeps looking alive. */
export const TASK_POOLS: Record<string, string[]> = {
  job: [
    'Search 3 job boards for roles that fit you',
    'Rank the 12 against your must-haves',
    'Tailor your resume for the top pick',
    'Draft a cover letter for the design lead role',
    'Check which companies on your list are hiring this week',
    'Find who you know at the top three companies',
    'Pull salary ranges for the five best matches',
    'Prep three talking points for Thursday’s screen',
    'Flag postings that expired since yesterday',
    'Write a short follow-up note to last week’s recruiter',
    'Compare remote policies across your shortlist',
    'Update your portfolio page with the newest project',
  ],
  inbox: [
    'Clear this morning’s inbox',
    'Draft replies to 5 open threads',
    'Find a slot for the dentist',
    'Unsubscribe from newsletters you never open',
    'Summarize the 30-message thread about the offsite',
    'Move Friday’s 1:1 out of lunch time',
    'Pull every attachment from last month’s invoices',
    'Set up an out-of-office for the long weekend',
    'Flag emails that have waited 3 days for your answer',
    'Block two focus hours tomorrow morning',
    'Draft a polite no to the vendor demo',
    'Turn the action items from Monday’s meeting into reminders',
  ],
  money: [
    'Pay the electric bill before Friday',
    'Check for subscriptions you don’t use',
    'Scan this week’s card charges',
    'Match last month’s receipts to the card statement',
    'Move $200 to savings before payday',
    'Compare two quotes for car insurance',
    'Find the tax form your employer posted',
    'Check whether the phone plan got a price hike',
    'Round up this month’s dining spend',
    'Set a reminder for the rent transfer',
    'Look for a cheaper home internet plan',
    'Total this year’s charitable donations for taxes',
  ],
  home: [
    'Book the kids’ checkups',
    'Reorder the weekly groceries',
    'Get 3 quotes for the leaky faucet',
    'Renew the library books due Saturday',
    'Compare dates for the AC tune-up',
    'Plan dinners for Monday through Thursday',
    'Order a new filter for the furnace',
    'Find a babysitter for the 14th',
    'Schedule the oil change near work',
    'Check what’s expiring in the pantry',
    'Pick a gift for the school birthday party',
    'Confirm the plumber arrives between 9 and 11',
  ],
};

/** For teams the user names themselves (TRAVEL, GARDEN, ...) and for NEW TEAM floors. */
export const TASK_POOL_GENERIC = [
  'Review the queue',
  'Check in with the lead',
  'Tidy up shared notes',
  'List what’s blocked and what’s waiting',
  'Summarize yesterday in three lines',
  'Find the three most overdue items',
  'Draft this week’s plan',
  'Collect links the team keeps asking for',
  'Archive finished work',
  'Ask what needs doing first',
];

/** Pick one at random; with `avoid`, try not to repeat the previous pick. */
export function pickRandom<T>(arr: T[], avoid?: T): T {
  if (arr.length > 1 && avoid !== undefined) {
    const rest = arr.filter((x) => x !== avoid);
    return rest[Math.floor(Math.random() * rest.length)];
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

export function stuckCaseFor(agentName: string, teamId: string, avoid?: string): StuckCase {
  const list = STUCK_BY_AGENT[agentName] || STUCK_BY_TEAM[teamId] || STUCK_GENERIC;
  const next = pickRandom(avoid ? list.filter((c) => c[0] !== avoid) : list);
  return next || list[0];
}

export function fearFor(teamId: string): string {
  return pickRandom(FEARS_BY_TEAM[teamId] || FEARS_GENERIC);
}

export function taskPoolFor(teamId: string): string[] {
  return (TASK_POOLS[teamId] || TASK_POOL_GENERIC).slice();
}

const GREEK = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'EPSILON', 'ZETA', 'ETA', 'THETA', 'IOTA', 'KAPPA', 'LAMBDA', 'MU', 'NU', 'XI', 'OMICRON', 'PI', 'RHO', 'SIGMA', 'TAU', 'UPSILON', 'PHI', 'CHI', 'PSI', 'OMEGA'];
const ROMAN = ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** "TEAM ALPHA", "TEAM BETA", ... skipping names already in use; after OMEGA, "TEAM ALPHA II" and so on. */
export function nextTeamName(used: Iterable<string>): string {
  const taken = new Set([...used].map((n) => n.toUpperCase()));
  for (let round = 0; round < ROMAN.length; round++)
    for (const g of GREEK) {
      const name = 'TEAM ' + g + (ROMAN[round] ? ' ' + ROMAN[round] : '');
      if (!taken.has(name)) return name;
    }
  return 'TEAM ' + (taken.size + 1);
}
