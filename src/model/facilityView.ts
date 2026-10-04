// Round 3: what the chamber, the drive and the meeting space look like this frame, and what their panels say.
// Every state shown here is read from the sim's event folds. Nothing in this file sets a state.
import type { Sim } from './sim';
import type { Furniture } from './types';
import { cl, inOutSine, lerp, plural } from './constants';
import type { Purpose } from './facility';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const TEAM_COLORS = ['#2f6fd6', '#d6572f', '#1f9d82', '#9a3fd0', '#b88a0c', '#d02f7a'];
export function teamColor(sim: Sim, id: string): string {
  const i = sim.m.teams.findIndex((T) => T.id === id);
  return TEAM_COLORS[(i < 0 ? 0 : i) % TEAM_COLORS.length];
}

/** The six checks green will require. Each is "not implemented" in the preview. */
export const CHAMBER_CHECKS = ['Network egress blocked', 'Local model only', 'Drive mounted read-only', 'Drive on the allow-list', 'Sandbox active', 'Session key loaded'];
export const PURPOSES: { key: Purpose; label: string; desc: string }[] = [
  { key: 'import', label: 'Import', desc: 'Read-only in' },
  { key: 'work', label: 'Work area', desc: 'Read and write; writes need approval' },
  { key: 'export', label: 'Export', desc: 'Out only, through one approved gate' },
  { key: 'archive', label: 'Archive', desc: 'Keep it, nothing moves' },
];

const WALK = 1.5;
const doorAnim = (age: number) => (age < 0 ? 0 : age < 0.4 ? age / 0.4 : age < 3 ? 1 : age < 3.5 ? 1 - (age - 3) / 0.5 : 0);

/** The data cable from a chamber's port to its drive, as an SVG points string. */
export function cablePts(C: Furniture, D: Furniture): string {
  const sx = C.x + 50,
    sy = C.y + 8,
    mx = C.x + 66,
    ex = D.x - 28;
  return [[sx, sy], [mx, sy], [mx, D.y], [ex, D.y]].map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
}

const NONE: any[] = [];
/** Agents walking into a chamber's door right after "Move in". Empty (and free) the rest of the time. */
export function walkersFor(sim: Sim, t: number): { x: number; y: number }[] {
  if (sim.reducedMotion) return NONE;
  let out: { x: number; y: number }[] | null = null;
  for (const F of sim.m.furn) {
    if (F.type !== 'chamber' || F.build) continue;
    const v = sim.chamberOf(F.id);
    for (const tid of v.teams) {
      const age = t - v.sealedAt[tid];
      if (age < 0 || age > WALK + 1.2) continue;
      const T = sim.team(tid);
      if (!T) continue;
      const n = sim.members(T).length;
      for (let i = 0; i < n; i++) {
        const p = cl((age - i * 0.18) / WALK, 0, 1);
        if (p >= 1) continue;
        (out = out || []).push({ x: lerp(T.x, F.x, inOutSine(p)), y: lerp(T.y, F.y + 16, inOutSine(p)) });
      }
    }
  }
  return out || NONE;
}

export function chamberRV(sim: Sim, F: Furniture, t: number): any {
  const v = sim.chamberOf(F.id);
  let door = 0,
    motion = false;
  for (const tid of v.teams) {
    const age = t - v.sealedAt[tid];
    door = Math.max(door, doorAnim(age));
    if (age < 3.6) motion = true;
  }
  if (sim.reducedMotion) door = 0;
  const pulse = sim.reducedMotion ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(t * 5));
  const blinkOn = sim.reducedMotion || (t * 3) % 1 < 0.55;
  const lampColor = v.lamp === 'amber' ? '#e8b923' : v.lamp === 'green' ? '#3aa865' : '#d63c2f';
  return {
    lamp: v.lamp,
    lampColor,
    lampOp: v.lamp === 'amber' ? pulse : v.lamp === 'blink' ? (blinkOn ? 1 : 0.12) : 1,
    striped: v.lamp === 'green',
    cap: v.lamp === 'green' ? 'simulated' : '',
    door,
    teamsIn: v.teams.length,
    hasDrive: !!(v.drive && v.drive.present),
    cabled: !!F.link,
    motion,
  };
}

export function driveRV(sim: Sim, F: Furniture, _t: number): any {
  const ch = F.chamber ? sim.chamberOf(F.chamber) : null;
  return { linked: !!ch && !!sim.furnById(F.chamber || '')?.link, motion: false };
}

const R_ROOF = 66,
  R_SEAT = 47;
export function meetingRV(sim: Sim, F: Furniture, t: number): any {
  const st = sim.meetingOf(F.id);
  const teams = st.teams.filter((id) => sim.team(id));
  const ang = (id: string) => {
    const T = sim.team(id)!;
    return Math.atan2(T.y - F.y, T.x - F.x);
  };
  const order = [...teams].sort((a, b) => ang(a) - ang(b));
  const n = order.length;
  const doors: Record<string, { x: number; y: number; a: number }> = {};
  const seats: any[] = [];
  const seatOf: Record<string, { x: number; y: number }> = {};
  order.forEach((id, k) => {
    // Evenly spaced around the roof, in the order the teams sit around the table, starting from the first one's side.
    const a = (n === 1 ? ang(id) : ang(order[0]) + (k * Math.PI * 2) / n);
    const dx = Math.cos(a),
      dy = Math.sin(a);
    doors[id] = { x: F.x + dx * R_ROOF, y: F.y + dy * R_ROOF, a };
    const s = { x: dx * R_SEAT, y: dy * R_SEAT };
    seatOf[id] = s;
    const mine = st.agenda.filter((r) => r.team === id);
    const running = mine.some((r) => r.status === 'running');
    const blocker = mine.find((r) => r.status === 'waiting' && r.needs !== undefined && !st.done.includes(r.needs));
    const T = sim.team(id)!;
    seats.push({ id, x: s.x, y: s.y, dx: dx * R_ROOF, dy: dy * R_ROOF, color: teamColor(sim, id), name: T.name, running, bubble: st.ran && !running && blocker ? 'waiting for step ' + blocker.needs : '', bob: running && !sim.reducedMotion ? Math.sin(t * 9 + k) * 2 : 0 });
  });
  const cards: any[] = [];
  let motion = false,
    reason: { text: string; op: number } | null = null,
    mark: { ok: boolean; op: number } | null = null;
  for (const p of st.posts) {
    const from = seatOf[p.fromTeam];
    if (!from) continue;
    const age = t - p.at;
    const color = teamColor(sim, p.fromTeam);
    if (p.verdictAt === undefined) {
      const q = inOutSine(cl(age / 0.8, 0, 1));
      cards.push({ id: p.id, x: lerp(from.x, 0, q), y: lerp(from.y, 0, q), op: 1, color, flash: false });
      motion = true;
      continue;
    }
    const av = t - p.verdictAt;
    if (p.status === 'cleared') {
      if (av > 1.4) continue;
      const nextItem = st.agenda.find((a) => a.needs === p.step);
      const dest = nextItem ? seatOf[nextItem.team] : null;
      const q = inOutSine(cl((av - 0.45) / 0.9, 0, 1));
      cards.push({ id: p.id, x: dest ? lerp(0, dest.x, q) : 0, y: dest ? lerp(0, dest.y, q) : 0, op: dest ? 1 : 1 - cl((av - 0.6) / 0.8, 0, 1), color, flash: false });
      if (av < 0.9) mark = { ok: true, op: 1 - cl(av / 0.9, 0, 1) };
      motion = true;
    } else {
      if (av > 4.5) continue;
      const q = inOutSine(cl((av - 0.4) / 0.9, 0, 1));
      cards.push({ id: p.id, x: lerp(0, from.x, q), y: lerp(0, from.y, q), op: 1 - cl((av - 2.4) / 1.2, 0, 1), color, flash: av < 0.4 ? Math.abs(Math.sin(av * 22)) > 0.35 : av < 1.3 });
      if (av < 1.2) mark = { ok: false, op: 1 - cl(av / 1.2, 0, 1) };
      reason = { text: p.why || 'Refused.', op: 1 - cl((av - 3.2) / 1.3, 0, 1) };
      motion = true;
    }
  }
  if (st.ran && teams.length) motion = true;
  return { seats, doors, cards, reason, mark, hasTeams: n > 0, motion, rRoof: R_ROOF, running: sim.meetingDriver.running(F.id) };
}

/** The panel data for a chamber, meeting or drive. The panel (src/ui/FacilityPanel.tsx) only draws it. */
export function facilityPanel(sim: Sim, F: Furniture): any {
  const B = sim.builder;
  if (F.type === 'chamber') {
    const v = sim.chamberOf(F.id);
    const sealed = sim.sealedMap();
    const lampText =
      v.lamp === 'blink' ? 'Drive removed or failed. The team is paused.' : v.lamp === 'amber' ? 'Checking drive…' : v.lamp === 'green' ? 'Ready (simulated)' : v.failed ? v.failed : v.drive ? 'Drive found. Run the data cable from the port to it.' : 'No drive.';
    const gate = v.phase === 'open' && (v.purpose === 'import' || v.purpose === 'work' || v.purpose === 'export') ? v.gate : undefined;
    return {
      kind: 'chamber',
      built: !F.build,
      builder: B,
      lamp: v.lamp,
      lampText,
      phase: v.phase,
      note: sim.notes[F.id] || '',
      teams: sim.m.teams
        .filter((T) => T.state === 'active')
        .map((T) => {
          const here = v.teams.includes(T.id);
          const other = !here && sealed.has(T.id);
          return { id: T.id, name: T.name, here, other, go: () => (here ? sim.moveOut(T.id) : sim.moveIn(T.id, F.id)) };
        }),
      detect: () => sim.detectDrives(F.id),
      drive: v.drive ? { label: v.drive.label, present: v.drive.present, cabled: !!F.link } : null,
      pull: v.drive && v.drive.present ? () => sim.pullDriveNow(F.id) : null,
      checks: CHAMBER_CHECKS.map((label) => ({ label, status: 'not implemented' })),
      green: v.green,
      purposes: v.green || v.phase === 'open' ? PURPOSES.map((p) => ({ ...p, active: v.purpose === p.key, go: () => sim.choosePurpose(F.id, p.key) })) : [],
      planned: ['Custom rules', 'Key reset'],
      canGate: v.phase === 'open' && (v.purpose === 'import' || v.purpose === 'work' || v.purpose === 'export'),
      gateLabel: v.purpose === 'import' ? 'Ask to bring files in' : 'Ask to send files out',
      gate: gate ? { ...gate, ask: () => sim.gateAsk(F.id), yes: () => sim.gateAnswer(F.id, true), no: () => sim.gateAnswer(F.id, false) } : null,
      gateAsk: () => sim.gateAsk(F.id),
      close: v.phase === 'open' ? () => sim.closeChamber(F.id) : null,
      sealedCount: v.teams.length,
    };
  }
  if (F.type === 'meeting') {
    const st = sim.meetingOf(F.id);
    const name = (id: string) => sim.team(id)?.name || id;
    const steps = st.agenda.map((a) => a.step);
    const running = sim.meetingDriver.running(F.id);
    return {
      kind: 'meeting',
      built: !F.build,
      builder: B,
      note: sim.notes[F.id] || '',
      teams: st.teams.map((id) => ({ id, name: name(id), color: teamColor(sim, id) })),
      rows: st.agenda.map((a) => ({
        step: a.step,
        team: a.team,
        teamName: name(a.team),
        color: teamColor(sim, a.team),
        what: a.what,
        needs: a.needs,
        status: a.status,
        wait: a.status === 'waiting' && a.needs !== undefined && !st.done.includes(a.needs) ? 'waiting for step ' + a.needs : a.status === 'waiting' ? 'ready' : a.status,
        teamOptions: st.teams.map((id) => ({ id, name: name(id) })),
        needsOptions: steps.filter((s) => s !== a.step),
        setTeam: (id: string) => sim.meetingSetTeam(F.id, a.step, id),
        setNeeds: (n: number | undefined) => sim.meetingSetNeeds(F.id, a.step, n),
      })),
      add: () => sim.meetingAddStep(F.id),
      run: () => sim.meetingRun(F.id),
      running,
      posts: [...st.posts].reverse().slice(0, 6).map((p) => ({ id: p.id, topic: p.topic, team: name(p.fromTeam), status: p.status, why: p.why })),
      summary: plural(st.teams.length, 'team') + ' at the table',
    };
  }
  return { kind: 'drive', label: 'SAMPLE DRIVE (simulated)' };
}
