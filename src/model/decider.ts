// One seam for every judgment call the sim makes about mood or what to do
// next. Today each `decide*` function below runs the existing rule/random
// logic inline. Later, Jev — a typed-judgment model reached through the
// Vercel AI Gateway's /v1/evaluate endpoint — can replace a function's body
// without touching any call site: it is handed the same labeled `state` and
// `options`, and returns one of `options` with a confidence.
//
// No network calls here, no new dependencies. State keys are readable words
// (`backlogCount`, `blocked`, `minutesStuck`), never shorthand — a past
// integration with Jev failed because it was handed cryptic keys like
// `r`, `p`, `lam`.

/** The kinds of judgment calls routed through `decide()`. */
export type DecideKind = 'mood' | 'handleOrAsk' | 'idlePickup';

/** A labeled snapshot of whatever the judgment call needs to look at. Readable words only. */
export type DecideState = Record<string, string | number | boolean | null | undefined>;

/**
 * Picks one of `options` for the given judgment `kind`, given a labeled `state`.
 * This is the only place that logic should live — a call site builds a
 * readable state and a candidate list, and never reimplements the rule itself.
 */
export function decide<T>(kind: DecideKind, state: DecideState, options: T[]): T {
  switch (kind) {
    case 'mood':
      return decideMood(state, options);
    case 'handleOrAsk':
      return decideHandleOrAsk(state, options);
    case 'idlePickup':
      return decideIdlePickup(state, options);
    default:
      return options[0];
  }
}

function pickOrFirst<T>(pick: string, options: T[]): T {
  const i = options.findIndex((o) => o === pick);
  return i >= 0 ? options[i] : options[0];
}

/**
 * Which mood an agent is in, in priority order: stuck beats waiting-on-you,
 * beats swamped, beats bored, beats in-flow, and "working" is the default.
 * Mirrors `Sim.mood()`'s old if-chain exactly, just with named state.
 */
function decideMood<T>(state: DecideState, options: T[]): T {
  const blocked = !!state.blocked;
  const waitingOnApproval = !!state.waitingOnApproval;
  const backlogCount = Number(state.backlogCount) || 0;
  const hasCurrentTask = !!state.hasCurrentTask;
  const inFlow = !!state.inFlow;
  let pick: string;
  if (blocked) pick = 'frustrated';
  else if (waitingOnApproval) pick = 'stalled';
  else if (backlogCount >= 4) pick = 'overwhelmed';
  else if (!hasCurrentTask && backlogCount === 0) pick = 'bored';
  else if (inFlow) pick = 'flow';
  else pick = 'working';
  return pickOrFirst(pick, options);
}

/**
 * When an agent is about to ask for your OK, PIP resolves most of them itself
 * instead of interrupting you — unless you said you want to be asked first.
 * Mirrors `Sim.makeFear()`'s old inline check.
 */
function decideHandleOrAsk<T>(state: DecideState, options: T[]): T {
  const askFirst = !!state.askFirst;
  const pick = !askFirst && Math.random() < 0.7 ? 'handled' : 'ask';
  return pickOrFirst(pick, options);
}

/**
 * Whether a bored agent, with nothing in its queue, picks up a task from its
 * team's pool this tick. Used by the idle-valley-stays-healthy behavior (U7).
 */
function decideIdlePickup<T>(state: DecideState, options: T[]): T {
  const poolHasWork = !!state.poolHasWork;
  const pick = poolHasWork && Math.random() < 0.5 ? 'pickup' : 'wait';
  return pickOrFirst(pick, options);
}
