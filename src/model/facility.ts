// Round 3: the isolation chamber and the meeting space. A PREVIEW. Nothing here touches hardware,
// and nothing sets state directly: green, phase, cleared and done are all folded from events.
// Today a scripted stream emits them (the drivers below). Later `mero serve` replaces the script and
// the fold, the UI and the tests stay as they are.
import type { AgendaItem, ChamberState, DriveInfo, MeetingState, Post, Wire } from './types';

export type Purpose = NonNullable<ChamberState['purpose']>;
/** Only typed messages cross a meeting door. The last three exist so the blind check has something to refuse. */
export type PostKind = 'task' | 'dependency' | 'artifact_ref' | 'status' | 'summary' | 'raw_file' | 'secret' | 'private';

export type FEventBody =
  | { kind: 'drive.seen'; chamber: string; drive: DriveInfo }
  | { kind: 'drive.gone'; driveId: string }
  | { kind: 'chamber.seal'; chamber: string; team: string; out?: boolean }
  /** `ok` undefined = the check started; true / false = its result. */
  | { kind: 'chamber.verify'; chamber: string; driveId: string; ok?: boolean; why?: string }
  | { kind: 'chamber.open'; chamber: string; purpose?: Purpose }
  | { kind: 'chamber.close'; chamber: string }
  | { kind: 'data.import' | 'data.export'; chamber: string; items: string[]; status: 'ask' | 'approved' | 'held' }
  | { kind: 'meeting.open'; meeting: string; teams?: string[]; run?: boolean }
  | { kind: 'meeting.post'; meeting: string; id: number; fromTeam: string; topic: string; step: number; ptype: PostKind }
  | { kind: 'meeting.dep'; meeting: string; step: number; team: string; what: string; needs?: number }
  | { kind: 'meeting.cleared'; meeting: string; id: number }
  | { kind: 'meeting.blocked'; meeting: string; id: number; why: string }
  | { kind: 'meeting.signoff'; meeting: string; step: number };
export type FEvent = FEventBody & { t: number };

/** An append-only event list plus a clock-driven script queue. `version` bumps on every emit so folds can be cached. */
export class EventStream {
  events: FEvent[] = [];
  version = 0;
  private due: { at: number; run: (t: number) => void }[] = [];
  emit(body: FEventBody, t: number) {
    this.events.push({ ...body, t } as FEvent);
    this.version++;
  }
  scheduleFn(at: number, run: (t: number) => void) {
    this.due.push({ at, run });
    this.due.sort((a, b) => a.at - b.at);
  }
  schedule(at: number, body: FEventBody) {
    this.scheduleFn(at, (t) => this.emit(body, t));
  }
  /** Release every scripted event that is due. */
  tick(now: number) {
    while (this.due.length && this.due[0].at <= now) this.due.shift()!.run(now);
  }
  get pending() {
    return this.due.length;
  }
}

// ---------------------------------------------------------------- chamber

export interface ChamberView extends ChamberState {
  /** Team id -> when it went in (stream clock), for the walk-in animation. */
  sealedAt: Record<string, number>;
  /** Last result of a check that failed, in words. */
  failed?: string;
  /** The lamp's story. */
  lamp: 'red' | 'amber' | 'green' | 'blink';
  /** The latest data request through the export gate. */
  gate?: { kind: 'import' | 'export'; items: string[]; status: 'ask' | 'approved' | 'held' };
  /** Times chamber.open arrived with no verify ok for the current drive. It was refused each time. */
  refused: number;
}

export function foldChamber(events: readonly FEvent[], id: string): ChamberView {
  const v: ChamberView = { id, teams: [], phase: 'empty', green: false, sealedAt: {}, lamp: 'red', refused: 0 };
  let verified: string | null = null,
    verifying = false,
    opened = false,
    closed = false;
  for (const e of events) {
    switch (e.kind) {
      case 'drive.seen':
        if (e.chamber !== id) break;
        v.drive = e.drive;
        verified = null;
        verifying = false;
        opened = false;
        closed = false;
        v.failed = undefined;
        v.purpose = undefined;
        break;
      case 'drive.gone':
        if (v.drive && v.drive.id === e.driveId) {
          v.drive = { ...v.drive, present: false };
          verified = null;
          verifying = false;
          opened = false;
          v.purpose = undefined;
        }
        break;
      case 'chamber.seal':
        if (e.chamber !== id) break;
        if (e.out) {
          v.teams = v.teams.filter((x) => x !== e.team);
          delete v.sealedAt[e.team];
        } else if (!v.teams.includes(e.team)) {
          v.teams = [...v.teams, e.team];
          v.sealedAt[e.team] = e.t;
        }
        break;
      case 'chamber.verify':
        if (e.chamber !== id || !v.drive || v.drive.id !== e.driveId || !v.drive.present) break;
        if (e.ok === undefined) {
          verifying = true;
          verified = null;
          v.failed = undefined;
        } else if (e.ok) {
          verifying = false;
          verified = v.drive.id;
        } else {
          verifying = false;
          verified = null;
          v.failed = e.why || 'The check failed.';
        }
        break;
      case 'chamber.open':
        if (e.chamber !== id) break;
        if (verified && v.drive && v.drive.present && verified === v.drive.id) {
          opened = true;
          closed = false;
          v.purpose = e.purpose;
        } else v.refused++;
        break;
      case 'chamber.close':
        if (e.chamber !== id) break;
        closed = true;
        opened = false;
        verified = null;
        v.purpose = undefined;
        break;
      case 'data.import':
      case 'data.export':
        if (e.chamber === id) v.gate = { kind: e.kind === 'data.import' ? 'import' : 'export', items: e.items, status: e.status };
        break;
      default:
        break;
    }
  }
  v.green = !!(verified && v.drive && v.drive.present && verified === v.drive.id);
  v.phase = opened ? 'open' : closed ? 'closed' : verifying ? 'verifying' : v.teams.length ? 'sealed' : v.drive ? 'drive_seen' : 'empty';
  v.lamp = v.drive && !v.drive.present ? 'blink' : verifying ? 'amber' : v.green ? 'green' : 'red';
  return v;
}

let driveN = 0;
/** The scripted drive watcher. In the preview there is only ever a sample, and nothing real is read. */
export function detectSampleDrive(s: EventStream, chamber: string, now: number): DriveInfo {
  const drive: DriveInfo = { id: 'drive-' + now.toFixed(3) + '-' + driveN++, label: 'SAMPLE DRIVE (simulated)', bus: 'usb', fsUuid: 'SAMPLE-0000', present: true, simulated: true };
  s.emit({ kind: 'drive.seen', chamber, drive }, now);
  return drive;
}
/** The scripted checker: starts a check, and a few seconds later reports. Only the sample passes. */
export function connectDrive(s: EventStream, chamber: string, drive: DriveInfo, now: number, checkSecs = 2.6) {
  s.emit({ kind: 'chamber.verify', chamber, driveId: drive.id }, now);
  s.scheduleFn(now + checkSecs, (t) => {
    const cur = foldChamber(s.events, chamber).drive;
    if (!cur || cur.id !== drive.id || !cur.present) return;
    if (drive.simulated) s.emit({ kind: 'chamber.verify', chamber, driveId: drive.id, ok: true }, t);
    else s.emit({ kind: 'chamber.verify', chamber, driveId: drive.id, ok: false, why: 'The six checks are not implemented yet.' }, t);
  });
}
export function pullDrive(s: EventStream, driveId: string, now: number) {
  s.emit({ kind: 'drive.gone', driveId }, now);
}

// ---------------------------------------------------------------- meeting

export const POST_OK: readonly PostKind[] = ['task', 'dependency', 'artifact_ref', 'status', 'summary'];
const POST_WHY: Partial<Record<PostKind, string>> = {
  raw_file: 'Raw files can’t cross. Send a reference instead.',
  secret: 'Secrets never cross.',
  private: 'Private data never crosses.',
};
/** The blind check: only typed messages pass. Judges the declared type, never the content. */
export function blindCheck(ptype: PostKind): { ok: boolean; why?: string } {
  if (POST_OK.includes(ptype)) return { ok: true };
  return { ok: false, why: POST_WHY[ptype] || 'That type of message can’t cross.' };
}

type Row = { team: string; what: string; needs?: number };
/** Would making `step` wait on `needs` close a loop? (Also true for a step waiting on itself.) */
export function wouldCycle(agenda: ReadonlyMap<number, Row> | Record<number, Row>, step: number, needs: number): boolean {
  const get = (k: number) => (agenda instanceof Map ? agenda.get(k) : (agenda as Record<number, Row>)[k]);
  let cur: number | undefined = needs;
  for (let i = 0; cur !== undefined && i < 100; i++) {
    if (cur === step) return true;
    cur = get(cur)?.needs;
  }
  return false;
}
export const cycleMessage = (step: number, needs: number) => 'Step ' + step + ' can’t wait on step ' + needs + '.';

export interface MeetingView extends MeetingState {
  /** True once a run has started (the table has been in use). */
  ran: boolean;
  /** Posts carry their step, type and times so the card animation can be drawn from them. */
  posts: (Post & { step: number; ptype: PostKind; at: number; verdictAt?: number })[];
  done: number[];
}

export function foldMeeting(events: readonly FEvent[], id: string): MeetingView {
  let teams: string[] = [];
  const agenda = new Map<number, Row>();
  let posts: MeetingView['posts'] = [];
  let done = new Set<number>();
  let ran = false;
  for (const e of events) {
    if (!('meeting' in e) || e.meeting !== id) continue;
    switch (e.kind) {
      case 'meeting.open':
        if (e.teams) teams = e.teams;
        if (e.run) {
          posts = [];
          done = new Set();
          ran = true;
        }
        break;
      case 'meeting.dep':
        if (e.needs !== undefined && (!agenda.has(e.needs) || wouldCycle(agenda, e.step, e.needs))) break;
        agenda.set(e.step, { team: e.team, what: e.what, needs: e.needs });
        break;
      case 'meeting.post': {
        const row = agenda.get(e.step);
        if (!row || done.has(e.step)) break;
        // Dependency order: a step can't run before the step it needs is done.
        if (row.needs !== undefined && !done.has(row.needs)) break;
        posts.push({ id: e.id, fromTeam: e.fromTeam, topic: e.topic, status: 'pending', step: e.step, ptype: e.ptype, at: e.t });
        break;
      }
      case 'meeting.cleared': {
        const p = posts.find((x) => x.id === e.id && x.status === 'pending');
        if (p) {
          p.status = 'cleared';
          p.verdictAt = e.t;
        }
        break;
      }
      case 'meeting.blocked': {
        const p = posts.find((x) => x.id === e.id && x.status === 'pending');
        if (p) {
          p.status = 'blocked';
          p.why = e.why;
          p.verdictAt = e.t;
        }
        break;
      }
      case 'meeting.signoff':
        if (posts.some((p) => p.step === e.step && p.status === 'cleared')) done.add(e.step);
        break;
      default:
        break;
    }
  }
  const items: AgendaItem[] = [...agenda.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([step, r]) => ({ step, team: r.team, what: r.what, needs: r.needs, status: done.has(step) ? 'done' : posts.some((p) => p.step === step) ? 'running' : 'waiting' }));
  return { id, teams, agenda: items, posts, ran, done: [...done] };
}

/** What a team can see of a meeting: cleared posts, plus its own (so it can read why one bounced). A blocked post never reaches anyone else. */
export function visibleTo(m: MeetingView, team: string): MeetingView['posts'] {
  return m.posts.filter((p) => p.status === 'cleared' || p.fromTeam === team);
}

/** A step may start once the step it needs is done. */
export const stepReady = (m: MeetingView, step: number) => {
  const it = m.agenda.find((a) => a.step === step);
  if (!it || it.status === 'done') return false;
  return it.needs === undefined || m.done.includes(it.needs);
};

const WHAT = ['gather the inputs', 'draft the summary', 'review the draft', 'file the result', 'check the numbers', 'hand over'];
export const whatFor = (step: number) => WHAT[(step - 1) % WHAT.length];

/** The scripted table: starts a run, posts each ready step, lets the blind check judge it, and signs off the cleared ones. */
export class MeetingDriver {
  private active = new Set<string>();
  private inflight = new Map<string, Set<number>>();
  private attempts = new Map<string, number>();
  private nextPost = 1;
  private s: EventStream;
  constructor(s: EventStream) {
    this.s = s;
  }
  start(meeting: string, now: number) {
    this.s.emit({ kind: 'meeting.open', meeting, run: true }, now);
    this.active.add(meeting);
    this.inflight.set(meeting, new Set());
    for (const k of [...this.attempts.keys()]) if (k.startsWith(meeting + ':')) this.attempts.delete(k);
  }
  running(meeting: string) {
    return this.active.has(meeting);
  }
  tick(now: number) {
    this.s.tick(now);
    for (const meeting of this.active) {
      const st = foldMeeting(this.s.events, meeting);
      if (st.agenda.length && st.agenda.every((a) => a.status === 'done')) {
        this.active.delete(meeting);
        continue;
      }
      const fl = this.inflight.get(meeting)!;
      for (const it of st.agenda) {
        if (it.status === 'done' || fl.has(it.step) || !stepReady(st, it.step)) continue;
        fl.add(it.step);
        this.post(meeting, it, now, fl);
      }
    }
  }
  private post(meeting: string, it: AgendaItem, now: number, fl: Set<number>) {
    const key = meeting + ':' + it.step;
    const n = this.attempts.get(key) || 0;
    this.attempts.set(key, n + 1);
    // Step 2's first card tries to carry a raw file, so the preview shows a rejection. Its retry is a reference.
    const ptype: PostKind = it.step === 2 && n === 0 ? 'raw_file' : it.step === 1 ? 'summary' : it.needs !== undefined ? 'artifact_ref' : 'status';
    const id = this.nextPost++;
    const topic = 'Step ' + it.step + ': ' + it.what;
    this.s.emit({ kind: 'meeting.post', meeting, id, fromTeam: it.team, topic, step: it.step, ptype }, now);
    const r = blindCheck(ptype);
    const verdictAt = now + 1.5;
    if (r.ok) {
      this.s.schedule(verdictAt, { kind: 'meeting.cleared', meeting, id });
      this.s.schedule(verdictAt + 1.1, { kind: 'meeting.signoff', meeting, step: it.step });
    } else {
      this.s.schedule(verdictAt, { kind: 'meeting.blocked', meeting, id, why: r.why || 'Refused.' });
      // The sender takes the card back, fixes it and tries again.
      this.s.scheduleFn(verdictAt + 1.6, () => fl.delete(it.step));
    }
  }
}

// ---------------------------------------------------------------- wires

/** Every wire in the valley, as the spec's Wire type. Team-plug wires from shared items, meeting paths, and chamber data cables. */
export function facilityWires(furn: { id: string; type: string; owner?: string | null; wires?: string[]; link?: string | null }[]): Wire[] {
  const out: Wire[] = [];
  for (const F of furn) {
    if (F.type === 'chamber') {
      if (F.link) out.push({ id: F.id + '>' + F.link, from: F.id, to: F.link, kind: 'drive' });
      continue;
    }
    if (F.owner || F.type === 'drive') continue;
    for (const t of F.wires || []) out.push({ id: F.id + '>' + t, from: F.id, to: t, kind: F.type === 'meeting' ? 'dep' : 'data' });
  }
  return out;
}

