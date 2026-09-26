import type { Agent, FeedCard, Furniture, Manager, Mood, Need, NodeKind, Sel, Settings, Team, WorldModel } from './types';
import { BLOCKERS, DOCK_TIP, FEARS, FR, FT, KEY, MGR_NAMES, MOOD, NOW, REC_DEMO_SECS, REC_LABELS, cap, cl, inOutCubic, inOutSine, lerp, outBack, outCubic } from './constants';
import { blank, desks, roomH, roomW, seed } from './seed';
import { genericAgents, genericTeamPool, helperCount, pickPreset, Q3_PERSONAL, Q3_WORK, type PresetManagerSeed } from './presets';

type DragKind = 'pan' | 'team' | 'sup' | 'furn' | 'agent' | 'newfurn' | 'ghost';

interface DragState {
  kind: DragKind;
  id?: string;
  type?: Furniture['type'];
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  moved: boolean;
}

interface DragPos {
  x: number;
  y: number;
  vx?: number;
}

interface Pulse {
  team: string;
  at: number;
  dur: number;
  card: [FeedCard['kind'], string, string, string];
}

interface Disp {
  team: string;
  x: number;
  y: number;
  wx?: number;
  wy?: number;
}

// Loosely typed render-output shapes. These mirror the reference `renderVals()`
// / `buildPop()` output 1:1 so the UI layer can be a thin, mostly-declarative view.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RenderVals = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PopVals = any;

export class Sim {
  m: WorldModel = seed();
  // --- onboarding: opening, three questions, hiring, tour ---
  freshParam = false;
  introOn = false;
  introPhase: 'sleep' | 'greet' | 'q1' | 'q2' | 'q3' | 'hiring' | 'addteam' | null = null;
  pipAsleep = false;
  speechText = '';
  speechAt = 0;
  who: 'me' | 'work' | null = null;
  askFirst = false;
  fearMult = 1;
  hireQueue: PresetManagerSeed[] = [];
  hireIndex = 0;
  anyHired = false;
  pendingContext = false;
  renaming = false;
  renameValue = '';
  addTeamCount = 0;
  addTeamValue = '';
  tourOn = false;
  tourStep = 0;
  tourStepStart = 0;
  tourWaiting = false;
  tourBlockedAgentId: string | null = null;
  tourToolPlaced = false;
  tourRecPlaced = false;
  resetConfirm = false;
  evLog: { t: number; team: string; kind: 'done' | 'stuck' | 'fear'; who?: string; text?: string }[] = [];
  pan = { x: 0, y: 0 };
  zoom = 1;
  sel: Sel | null = null;
  popAt = 0;
  drag: DragState | null = null;
  hover: string | null = null;
  hoverMgr: string | null = null;
  dragPos: DragPos | null = null;
  pts = new Map<number, { x: number; y: number }>();
  pinch: { d0: number; mid: { x: number; y: number }; z0: number; p0: { x: number; y: number } } | null = null;
  mouse = { x: -999, y: -999 };
  pulses: Pulse[] = [];
  nextSim = NOW() + 2.5;
  apos: Record<string, { x: number; y: number }> = {};
  eqMap: Record<string, Furniture[]> = {};
  showFeed = typeof window !== 'undefined' ? window.innerWidth > 820 : true;
  dirty = false;
  lastSave = 0;
  disp: Record<string, Disp> = {};
  hoverAgent: string | null = null;
  lastT = 0;
  settings: Settings = { simSpeed: 'normal', alwaysShowNames: false, thoughts: 'icons' };
  notify: () => void = () => {};
  raf = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.freshParam = new URLSearchParams(window.location.search).has('fresh');
      } catch {
        /* ignore */
      }
    }
    const loaded = this.freshParam ? null : this.load();
    if (loaded && loaded.onboarded) {
      this.m = loaded;
    } else {
      this.m = blank();
      this.introOn = true;
      this.introPhase = 'sleep';
      this.pipAsleep = true;
    }
    this.m.agents.forEach((a) => {
      if (a.flowSeed) {
        a.flowUntil = NOW() + 30;
        a.recent = [NOW() - 8, NOW() - 3];
        a.flowSeed = false;
      }
    });
    // Exposed only so _qa/drive.mjs can drive the opening deterministically without
    // racing the typewriter or guessing pixel coordinates. Not used by the app itself.
    if (typeof window !== 'undefined') (window as unknown as { __sim: Sim }).__sim = this;
  }

  // --- speech card typewriter (shared by the intro and the tour) ---
  setSpeech(text: string) {
    this.speechText = text;
    this.speechAt = NOW();
  }
  speechShown(): string {
    const n = Math.floor((NOW() - this.speechAt) * 40);
    return this.speechText.slice(0, cl(n, 0, this.speechText.length));
  }
  speechDone(): boolean {
    return this.speechShown().length >= this.speechText.length;
  }
  finishSpeech() {
    this.speechAt = NOW() - this.speechText.length / 40 - 0.05;
  }

  // --- opening ---
  wake() {
    if (this.introPhase !== 'sleep') return;
    this.pipAsleep = false;
    this.introPhase = 'greet';
    this.setSpeech("Hi. I'm PIP. I run a team of helpers so you don't have to watch them. Three questions, and I'll hire your first team.");
    this.notify();
  }
  advanceGreet() {
    if (this.introPhase !== 'greet') return;
    this.introPhase = 'q1';
    this.setSpeech('Who is this for?');
    this.notify();
  }
  skipIntro() {
    this.m = seed();
    this.m.onboarded = true;
    this.introOn = false;
    this.introPhase = null;
    this.tourOn = false;
    this.pipAsleep = false;
    this.dirty = true;
    this.save();
    this.fitView();
    this.notify();
  }
  answerQ1(who: 'me' | 'work') {
    this.who = who;
    this.introPhase = 'q2';
    this.setSpeech('Should they check with you before anything important?');
    this.notify();
  }
  answerQ2(ask: boolean) {
    this.askFirst = ask;
    this.pendingContext = ask;
    this.fearMult = ask ? 2 : 0.5;
    this.introPhase = 'q3';
    this.setSpeech(this.who === 'me' ? "What's on your mind most?" : 'What eats your week?');
    this.notify();
  }
  q3Options(): [string, string][] {
    return this.who === 'work' ? Q3_WORK : Q3_PERSONAL;
  }
  answerQ3(focusKey: string) {
    const preset = pickPreset(this.who || 'me', focusKey);
    this.hireQueue = preset.managers;
    this.hireIndex = 0;
    this.anyHired = false;
    this.introPhase = 'hiring';
    this.setSpeech("Here's who I'd hire.");
    this.notify();
  }
  currentHire() {
    return this.hireQueue[this.hireIndex] || null;
  }
  private placeManagerAndTeams(mgr: PresetManagerSeed, name: string) {
    const m = this.m,
      pip = m.sups.pip,
      i = this.hireIndex,
      n = this.hireQueue.length,
      t = NOW();
    const mx = pip.x + (i - (n - 1) / 2) * 260,
      my = pip.y + 220;
    m.sups[mgr.id] = { id: mgr.id, name, role: mgr.role, x: mx, y: my, size: 42, boss: 'pip', born: t };
    const first = !this.anyHired;
    mgr.teams.forEach((ts, j) => {
      const tx = mx + (j - (mgr.teams.length - 1) / 2) * 180,
        ty = my + 230;
      m.teams.push({ id: ts.id, name: ts.name, boss: mgr.id, x: tx, y: ty, state: 'active', pool: ts.pool.slice(), pi: 0, born: t + j * 0.35 });
      ts.agents.forEach((a) => {
        m.agents.push({ id: ts.id + '-' + a.n.toLowerCase(), name: a.n, role: a.role, team: ts.id, doing: a.doing, backlog: a.backlog.slice(), done: a.done.slice(), blocked: null, fear: null, ...(a.extra || {}) });
      });
      if (first && j === 0 && this.pendingContext) {
        m.furn.push({ id: 'ctx' + Date.now().toString(36), type: 'books', x: tx + 90, y: ty + 30, on: [true, false, false, false, false], born: t + 0.4 });
        this.pendingContext = false;
      }
    });
    this.anyHired = true;
    this.card('ORG', name, '', name + ' joined as a manager. ' + mgr.teams.map((ts) => ts.name).join(', ') + ' are live.');
    this.dirty = true;
  }
  hireCurrent(customName?: string) {
    const cur = this.currentHire();
    if (!cur) return;
    this.placeManagerAndTeams(cur, (customName || cur.name).toUpperCase().slice(0, 14));
    this.renaming = false;
    this.hireIndex++;
    this.afterHireStep();
  }
  skipCurrent() {
    this.hireIndex++;
    this.renaming = false;
    if (this.hireIndex >= this.hireQueue.length && !this.anyHired) {
      this.setSpeech("Fine, I'll start small.");
      this.hireIndex = 0;
      this.placeManagerAndTeams(this.hireQueue[0], this.hireQueue[0].name);
      this.hireIndex = 1;
    }
    this.afterHireStep();
  }
  private afterHireStep() {
    if (this.hireIndex >= this.hireQueue.length) {
      this.introPhase = 'addteam';
      this.addTeamCount = 0;
      this.addTeamValue = '';
      this.setSpeech('Want to add your own?');
    } else {
      const nx = this.currentHire()!;
      this.setSpeech(nx.name + ' would run ' + nx.runs + ' — ' + nx.teams.length + ' teams, ' + helperCount(nx) + ' helpers');
    }
    this.dirty = true;
    this.notify();
  }
  startRename() {
    const cur = this.currentHire();
    if (!cur) return;
    this.renaming = true;
    this.renameValue = cur.name;
    this.notify();
  }
  cancelRename() {
    this.renaming = false;
    this.notify();
  }
  addCustomTeam(name: string) {
    if (!name.trim() || this.addTeamCount >= 3) return;
    const m = this.m,
      pip = m.sups.pip,
      id = 'ct' + Date.now().toString(36),
      t = NOW();
    const tx = pip.x + (Math.random() - 0.5) * 300,
      ty = pip.y + 320 + this.addTeamCount * 10;
    m.teams.push({ id, name: name.toUpperCase().slice(0, 14), boss: 'pip', x: tx, y: ty, state: 'active', pool: genericTeamPool(), pi: 0, born: t });
    genericAgents().forEach((a) => {
      m.agents.push({ id: id + '-' + a.n.toLowerCase(), name: a.n, role: a.role, team: id, doing: a.doing, backlog: a.backlog.slice(), done: a.done.slice(), blocked: null, fear: null });
    });
    this.card('ORG', name.toUpperCase(), '', 'New team under PIP. Drag agents in any time.');
    this.addTeamCount++;
    this.addTeamValue = '';
    this.dirty = true;
    this.notify();
  }
  finishHiring() {
    this.introPhase = null;
    this.introOn = false;
    this.tourStart();
  }

  // --- the four-stop tour ---
  tourStart() {
    this.tourOn = true;
    this.tourStep = 0;
    this.tourStepStart = NOW();
    this.tourWaiting = false;
    this.tourToolPlaced = false;
    this.tourRecPlaced = false;
    this.fitView(this.tourBottomInset(0), 1.15);
    this.setSpeech('Everyone reports up. When someone finishes a job, it travels the lines to me, and I tell you.');
    this.forceCompletionForTour();
    this.notify();
  }
  forceCompletionForTour() {
    const withWork = this.m.agents.find((a) => a.doing && this.team(a.team)?.state === 'active');
    if (withWork) this.complete(withWork, NOW());
  }
  forceBlockForTour() {
    const free = this.m.agents.find((a) => !a.blocked && !a.fear && this.team(a.team)?.state === 'active');
    if (free) {
      this.makeBlocked(free);
      this.tourBlockedAgentId = free.id;
      this.tourWaiting = true;
      this.centerOnTeam(free.team, this.tourBottomInset(1), 1.6);
    } else {
      this.tourWaiting = false;
    }
  }
  tourCanNext(): boolean {
    const elapsed = NOW() - this.tourStepStart;
    if (this.tourStep === 1) return !this.tourWaiting;
    if (this.tourStep === 2) return this.tourToolPlaced || elapsed >= 12;
    if (this.tourStep === 3) return this.tourRecPlaced || elapsed >= 12;
    return true;
  }
  tourNext() {
    if (!this.tourCanNext()) return;
    if (this.tourStep === 0) {
      this.tourStep = 1;
      this.tourStepStart = NOW();
      this.setSpeech('Colours are moods. Green is flow, orange is swamped, red means stuck. One of them is stuck right now. Tap them.');
      this.forceBlockForTour();
    } else if (this.tourStep === 1) {
      this.tourEnterTools();
    } else if (this.tourStep === 2) {
      this.tourStep = 3;
      this.tourStepStart = NOW();
      this.tourRecPlaced = false;
      this.sel = null;
      this.fitView(this.tourBottomInset(3), 1.15);
      this.setSpeech('The recorder watches a team for you and sends a recap on a schedule. Drop it near the team you care about.');
    } else if (this.tourStep === 3) {
      this.tourEnd();
      return;
    }
    this.notify();
  }
  tourAdvanceAfterFix() {
    this.setSpeech("That's the job. You only step in when it matters.");
  }
  tourEnterTools() {
    this.tourStep = 2;
    this.tourStepStart = NOW();
    this.tourToolPlaced = false;
    this.sel = null;
    this.fitView(this.tourBottomInset(2), 1.15);
    this.setSpeech("These are tools. Drag one next to a team and they'll use it. Hover or hold one to see what it does.");
    this.notify();
  }
  tourEnd() {
    this.tourOn = false;
    this.tourStep = 0;
    this.m.onboarded = true;
    this.setSpeech("It's yours now. Drag anything, rename anything, hire more from the dock. I'll be up here.");
    this.dirty = true;
    this.save();
    this.notify();
  }
  tourSkip() {
    this.tourEnd();
  }

  load(): WorldModel | null {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!s || (s.v !== 3 && s.v !== 4)) return null;
      s.teams.forEach((T: Team) => {
        T.born = null;
        T.fireAt = null;
      });
      Object.values(s.sups as Record<string, Manager>).forEach((S) => {
        S.born = null;
        S.recv = null;
      });
      s.furn = (s.furn || []).filter((f: Furniture) => (f.type as string) !== 'board');
      s.furn.forEach((f: Furniture) => {
        f.born = null;
        f.lastRecapT = null;
      });
      s.agents.forEach((a: Agent) => {
        a.flowUntil = 0;
        a.recent = [];
      });
      return s;
    } catch {
      return null;
    }
  }
  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.m));
    } catch {
      /* ignore quota / privacy errors */
    }
    this.dirty = false;
    this.lastSave = NOW();
  }

  start() {
    this.fitView();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.step();
      this.notify();
    };
    loop();
  }
  stop() {
    cancelAnimationFrame(this.raf);
  }

  team(id: string) {
    return this.m.teams.find((T) => T.id === id);
  }
  agent(id: string) {
    return this.m.agents.find((a) => a.id === id);
  }
  furnById(id: string) {
    return this.m.furn.find((F) => F.id === id);
  }
  members(T: Team, excl?: string) {
    return this.m.agents.filter((a) => a.team === T.id && a.id !== excl);
  }
  feedW() {
    return this.showFeed && window.innerWidth > 700 ? 372 : 0;
  }
  chain(bossId: string | null): string[] {
    const out: string[] = [];
    let k = bossId;
    while (k && k !== 'pip' && this.m.sups[k]) {
      out.unshift(this.m.sups[k].name);
      k = this.m.sups[k].boss;
    }
    return out;
  }
  pathName(teamId: string) {
    const T = this.team(teamId);
    if (!T) return '';
    return this.chain(T.boss).concat([T.name]).join(' › ');
  }
  isUnder(a: string, b: string) {
    let k: string | null = a;
    let guard = 0;
    while (k && guard++ < 50) {
      if (k === b) return true;
      k = this.m.sups[k] ? this.m.sups[k].boss : null;
    }
    return false;
  }
  toWorld(sx: number, sy: number) {
    return { x: (sx - this.pan.x) / this.zoom, y: (sy - this.pan.y) / this.zoom };
  }
  addTargetId() {
    const s = this.sel;
    if (s && s.kind === 'sup' && this.m.sups[s.id]) return s.id;
    if (s && s.kind === 'team') {
      const T = this.team(s.id);
      if (T) return T.boss;
    }
    return 'pip';
  }

  fitView(bottomInset = 146, maxZoom = 1.3) {
    const m = this.m;
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    const add = (a: number, b: number, c: number, d: number) => {
      x0 = Math.min(x0, a);
      y0 = Math.min(y0, b);
      x1 = Math.max(x1, c);
      y1 = Math.max(y1, d);
    };
    Object.values(m.sups).forEach((s) => add(s.x - 60, s.y - 60, s.x + 60, s.y + 70));
    m.teams.forEach((T) => {
      if (T.state === 'hidden') return;
      const n = this.members(T).length,
        w = roomW(n),
        h = roomH(n);
      add(T.x - w / 2, T.y - h / 2 - 30, T.x + w / 2, T.y + h / 2);
    });
    m.furn.forEach((F) => add(F.x - 40, F.y - 30, F.x + 40, F.y + 50));
    const vw = window.innerWidth,
      vh = window.innerHeight;
    const topInset = 74;
    const aw = Math.max(200, vw - this.feedW() - 60),
      ah = Math.max(200, vh - topInset - bottomInset);
    const bw = x1 - x0,
      bh = y1 - y0;
    const z = cl(Math.min(aw / bw, ah / bh), 0.3, maxZoom);
    this.zoom = z;
    this.pan = { x: 30 + (aw - bw * z) / 2 - x0 * z, y: topInset + (ah - bh * z) / 2 - y0 * z };
  }
  /** Center one team floor in the space above the speech card / dock, used by the tour. */
  centerOnTeam(teamId: string, bottomInset: number, maxZoom: number) {
    const T = this.team(teamId);
    if (!T) return;
    const n = this.members(T).length,
      w = roomW(n) + 90,
      h = roomH(n) + 90;
    const vw = window.innerWidth,
      vh = window.innerHeight;
    const topInset = 74;
    const aw = Math.max(200, vw - this.feedW() - 60),
      ah = Math.max(200, vh - topInset - bottomInset);
    const z = cl(Math.min(aw / w, ah / h), 0.3, maxZoom);
    this.zoom = z;
    this.pan = { x: 30 + (aw - w * z) / 2 - (T.x - w / 2) * z, y: topInset + (ah - h * z) / 2 - (T.y - h / 2) * z };
  }
  /** Bottom inset (px) to keep the world clear of the speech card, and the dock once it shows. */
  tourBottomInset(step: number) {
    return step >= 2 ? 320 : 210;
  }
  zoomAt(sx: number, sy: number, f: number) {
    const z = this.zoom,
      nz = cl(z * f, 0.3, 2.6);
    this.pan = { x: sx - (sx - this.pan.x) * (nz / z), y: sy - (sy - this.pan.y) * (nz / z) };
    this.zoom = nz;
  }
  onWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) this.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
    else this.pan = { x: this.pan.x - e.deltaX, y: this.pan.y - e.deltaY };
  }

  nodeDown(e: React.PointerEvent, kind: DragKind, id: string) {
    e.stopPropagation();
    if (e.button > 0) return;
    let ox = 0,
      oy = 0;
    if (kind === 'team') {
      const T = this.team(id)!;
      ox = T.x;
      oy = T.y;
    } else if (kind === 'sup') {
      const s = this.m.sups[id];
      ox = s.x;
      oy = s.y;
    } else if (kind === 'furn') {
      const F = this.furnById(id)!;
      ox = F.x;
      oy = F.y;
    } else if (kind === 'agent') {
      const p = this.apos[id] || { x: 0, y: 0 };
      ox = p.x;
      oy = p.y;
    }
    this.drag = { kind, id, sx: e.clientX, sy: e.clientY, ox, oy, moved: false };
  }
  dockDown(e: React.PointerEvent, type: Furniture['type']) {
    e.stopPropagation();
    if (e.button > 0) return;
    this.drag = { kind: 'newfurn', type, sx: e.clientX, sy: e.clientY, ox: 0, oy: 0, moved: false };
    this.mouse = { x: e.clientX, y: e.clientY };
  }
  bgDown(e: React.PointerEvent) {
    this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pts.size === 2) {
      const [a, b] = [...this.pts.values()];
      this.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, z0: this.zoom, p0: { ...this.pan } };
      this.drag = null;
    } else {
      this.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: this.pan.x, oy: this.pan.y, moved: false };
    }
  }
  mgrAt(wx: number, wy: number, D: DragState) {
    for (const s of Object.values(this.m.sups)) {
      if (D.kind === 'sup' && (s.id === D.id || this.isUnder(s.id, D.id!))) continue;
      if (Math.hypot(wx - s.x, wy - s.y) < s.size * 0.95 + 10) return s.id;
    }
    return null;
  }
  onMove(e: PointerEvent) {
    this.mouse = { x: e.clientX, y: e.clientY };
    if (this.pts.has(e.pointerId)) this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinch && this.pts.size >= 2) {
      const [a, b] = [...this.pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const P = this.pinch,
        nz = cl((P.z0 * d) / P.d0, 0.3, 2.6);
      const wx = (P.mid.x - P.p0.x) / P.z0,
        wy = (P.mid.y - P.p0.y) / P.z0;
      this.zoom = nz;
      this.pan = { x: mid.x - wx * nz, y: mid.y - wy * nz };
      return;
    }
    const D = this.drag;
    if (!D) return;
    const dx = e.clientX - D.sx,
      dy = e.clientY - D.sy;
    if (!D.moved && Math.hypot(dx, dy) > 4) D.moved = true;
    if (!D.moved) return;
    const z = this.zoom,
      w = this.toWorld(e.clientX, e.clientY);
    if (D.kind === 'pan') this.pan = { x: D.ox + dx, y: D.oy + dy };
    else if (D.kind === 'team') {
      const T = this.team(D.id!)!;
      T.x = D.ox + dx / z;
      T.y = D.oy + dy / z;
      this.hoverMgr = this.mgrAt(w.x, w.y, D);
    } else if (D.kind === 'sup') {
      const s = this.m.sups[D.id!];
      s.x = D.ox + dx / z;
      s.y = D.oy + dy / z;
      this.hoverMgr = D.id === 'pip' ? null : this.mgrAt(w.x, w.y, D);
    } else if (D.kind === 'furn') {
      const F = this.furnById(D.id!)!;
      F.x = D.ox + dx / z;
      F.y = D.oy + dy / z;
    } else if (D.kind === 'agent') {
      this.dragPos = { x: D.ox + dx / z, y: D.oy + dy / z, vx: e.movementX || 0 };
      this.hover = this.teamAt(this.dragPos.x, this.dragPos.y, D.id!);
    }
  }
  teamAt(x: number, y: number, excl?: string) {
    for (const T of this.m.teams) {
      if (T.state !== 'active') continue;
      const n = this.members(T, excl).length,
        w = roomW(n) + 20,
        h = roomH(n) + 30;
      if (Math.abs(x - T.x) < w / 2 && Math.abs(y - T.y) < h / 2) return T.id;
    }
    return null;
  }
  onUp(e: PointerEvent) {
    this.pts.delete(e.pointerId);
    if (this.pinch) {
      if (this.pts.size < 2) this.pinch = null;
      this.drag = null;
      this.notify();
      return;
    }
    const D = this.drag;
    this.drag = null;
    if (!D) return;
    if (D.kind === 'newfurn') {
      const vw = window.innerWidth,
        vh = window.innerHeight;
      let w: { x: number; y: number } | undefined;
      if (!D.moved) {
        w = this.toWorld((vw - this.feedW()) / 2 + (Math.random() - 0.5) * 80, vh / 2 + (Math.random() - 0.5) * 60);
      } else if (e.clientY < vh - 120 && e.clientX < vw - this.feedW()) {
        w = this.toWorld(e.clientX, e.clientY);
      }
      if (w) this.placeFurn(D.type!, w.x, w.y);
    } else if (!D.moved) {
      if (D.kind === 'pan') this.sel = null;
      else if (D.kind === 'ghost') this.select({ kind: 'sup', id: 'pip' });
      else this.select({ kind: D.kind as NodeKind, id: D.id! });
    } else {
      if (D.kind === 'agent') {
        const a = this.agent(D.id!)!;
        const to = this.hover;
        if (to && to !== a.team) {
          const from = this.team(a.team)!.name;
          a.team = to;
          const T = this.team(to)!;
          T.fireAt = NOW();
          this.card('MOVED', this.pathName(to), a.name, ' joined ' + T.name + ' from ' + from + '.');
        }
        if (this.dragPos) {
          const T2 = this.team(a.team)!;
          this.disp[a.id] = { team: T2.id, x: this.dragPos.x - T2.x, y: this.dragPos.y - T2.y };
        }
      } else if ((D.kind === 'team' || D.kind === 'sup') && this.hoverMgr) {
        const target = this.hoverMgr;
        if (D.kind === 'team') {
          const T = this.team(D.id!)!;
          T.x = D.ox;
          T.y = D.oy;
        } else {
          const s = this.m.sups[D.id!];
          s.x = D.ox;
          s.y = D.oy;
        }
        this.reparent(D.kind, D.id!, target);
      } else if (D.kind === 'furn') {
        this.announceFurn(this.furnById(D.id!));
      }
      this.dirty = true;
    }
    this.hover = null;
    this.hoverMgr = null;
    this.dragPos = null;
    this.notify();
  }
  select(s: Sel) {
    if (this.sel && this.sel.kind === s.kind && this.sel.id === s.id) {
      this.sel = null;
      this.notify();
      return;
    }
    this.sel = s;
    this.popAt = NOW();
    this.notify();
  }

  inRange(F: Furniture) {
    return this.m.teams.filter((T) => T.state !== 'hidden' && Math.hypot(F.x - T.x, F.y - T.y) < FR);
  }
  announceFurn(F?: Furniture) {
    if (!F) return;
    const ts = this.inRange(F).map((T) => T.name);
    const key = ts.join(',');
    if (key && key !== F.lastAnn) this.card('EQUIP', FT[F.type].name, '', 'Now serving ' + ts.join(', ') + '.');
    F.lastAnn = key;
  }
  placeFurn(type: Furniture['type'], x: number, y: number) {
    const F: Furniture = { id: 'fx' + Date.now().toString(36), type, x, y, on: FT[type].opts.map((_, i) => i === 0), born: NOW() };
    this.m.furn.push(F);
    this.announceFurn(F);
    this.sel = { kind: 'furn', id: F.id };
    this.popAt = NOW();
    this.dirty = true;
    if (this.tourOn && this.tourStep === 2) this.tourToolPlaced = true;
    if (this.tourOn && this.tourStep === 3 && type === 'rec') this.tourRecPlaced = true;
  }
  reparent(kind: 'team' | 'sup', id: string, bossId: string) {
    const m = this.m,
      B = m.sups[bossId];
    if (!B) return;
    if (kind === 'team') {
      const T = this.team(id);
      if (!T || T.boss === bossId) return;
      T.boss = bossId;
      T.fireAt = NOW();
      B.recv = NOW();
      this.card('ORG', this.pathName(T.id), '', T.name + ' now reports to ' + B.name + '.');
    } else {
      const s = m.sups[id];
      if (!s || id === 'pip' || s.boss === bossId || bossId === id || this.isUnder(bossId, id)) return;
      s.boss = bossId;
      s.recv = NOW();
      B.recv = NOW();
      this.card('ORG', this.chain(bossId).concat([s.name]).join(' › ') || s.name, '', s.name + ' now reports to ' + B.name + '.');
    }
    this.dirty = true;
    this.notify();
  }
  addManager(bossId: string) {
    const m = this.m,
      b = m.sups[bossId] || m.sups.pip;
    const used = new Set(Object.values(m.sups).map((s) => s.name));
    const name = MGR_NAMES.find((n) => !used.has(n)) || 'MGR' + Object.keys(m.sups).length;
    const id = 'm' + Date.now().toString(36);
    m.sups[id] = { id, name, role: 'NEW BRANCH', x: b.x + (Math.random() - 0.5) * 280, y: b.y + 175, size: 40, boss: b.id, born: NOW() };
    b.recv = NOW();
    this.card('ORG', name, '', name + ' joined as a manager under ' + b.name + '.');
    this.sel = { kind: 'sup', id };
    this.popAt = NOW();
    this.dirty = true;
    this.notify();
  }
  addTeam(bossId: string) {
    const m = this.m,
      b = m.sups[bossId] || m.sups.pip;
    const id = 't' + Date.now().toString(36);
    m.teams.push({ id, name: 'NEW TEAM', boss: b.id, x: b.x + (Math.random() - 0.5) * 280, y: b.y + 210, state: 'active', pool: ['Review the queue', 'Check in with the lead', 'Tidy up shared notes'], pi: 0, born: NOW() });
    this.card('ORG', this.pathName(id), '', 'New team floor under ' + b.name + '. Drag agents in to staff it.');
    this.sel = { kind: 'team', id };
    this.popAt = NOW();
    this.dirty = true;
    this.notify();
  }
  deleteManager(id: string) {
    const m = this.m,
      s = m.sups[id];
    if (!s || id === 'pip') return;
    m.teams.forEach((T) => {
      if (T.boss === id) T.boss = s.boss!;
    });
    Object.values(m.sups).forEach((o) => {
      if (o.boss === id) o.boss = s.boss;
    });
    delete m.sups[id];
    this.card('ORG', s.name, '', s.name + ' retired. Reports moved up to ' + m.sups[s.boss!].name + '.');
    this.sel = null;
    this.dirty = true;
    this.notify();
  }
  deleteTeam(id: string) {
    const T = this.team(id);
    if (!T || this.members(T).length) return;
    this.m.teams = this.m.teams.filter((x) => x.id !== id);
    this.card('ORG', T.name, '', T.name + ' floor removed.');
    this.sel = null;
    this.dirty = true;
    this.notify();
  }
  deleteFurn(id: string) {
    const F = this.furnById(id);
    if (!F) return;
    this.m.furn = this.m.furn.filter((x) => x.id !== id);
    this.card('EQUIP', FT[F.type].name, '', 'Removed from the floor.');
    this.sel = null;
    this.dirty = true;
    this.notify();
  }

  card(kind: FeedCard['kind'], path: string, who: string, text: string) {
    this.m.feed.unshift({ id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6), kind, path, who, text, ts: Date.now() });
    this.m.feed = this.m.feed.slice(0, 30);
    this.dirty = true;
    this.notify();
  }
  act(nd: Need, action: string) {
    const t = NOW();
    this.m.needs = this.m.needs.filter((x) => x.id !== nd.id);
    if (action === 'tax') {
      const T = this.team('tax');
      if (T) {
        T.state = 'active';
        T.born = t;
        T.fireAt = t + 0.2;
        this.card('LIVE', this.pathName('tax'), '', 'TAXES team is live with ' + this.members(T).length + ' agents.');
      }
    } else if (action === 'groc') {
      const T = this.team('groc');
      if (T) {
        T.state = 'active';
        T.fireAt = t;
        this.card('LIVE', this.pathName('groc'), '', 'Signed. GROCERY is running. I’ll check with you before checkout.');
      }
    } else if (action === 'ins') {
      const a = this.agent('ins-quote');
      if (a) a.backlog.unshift('Message your agent about renewal rates');
      this.card('YOU', this.pathName('ins'), 'QUOTE', ' is messaging your agent about rates.');
    } else if (nd.agent && (action === 'unblock' || action === 'approve' || action === 'hold')) {
      const a = this.agent(nd.agent);
      if (a) {
        if (action === 'unblock') this.unblock(a);
        else if (action === 'approve') this.approve(a);
        else this.hold(a);
      }
    } else if (action === 'ack') {
      this.card('YOU', this.pathName(nd.team), '', nd.ok || 'Marked handled.');
    }
    this.dirty = true;
    this.notify();
  }
  pathPts(teamId: string): [number, number][] {
    const T = this.team(teamId);
    if (!T) return [[0, 0]];
    const out: [number, number][] = [[T.x, T.y]];
    let k: string | null = T.boss,
      g = 0;
    while (k && this.m.sups[k] && g++ < 50) {
      const s: Manager = this.m.sups[k];
      out.push([s.x, s.y]);
      k = s.boss;
    }
    return out;
  }

  step() {
    const t = NOW();
    const speed = { slow: 1.8, normal: 1, fast: 0.45 }[this.settings.simSpeed] || 1;
    if (t > this.nextSim) {
      this.nextSim = t + (2.4 + Math.random() * 2.4) * speed;
      const dragA = this.drag && this.drag.kind === 'agent' ? this.drag.id : null;
      const live = this.m.agents.filter((a) => {
        const T = this.team(a.team);
        return T && T.state === 'active' && a.id !== dragA;
      });
      live.forEach((a) => {
        if (!a.doing && a.backlog.length) a.doing = a.backlog.shift()!;
      });
      const pick = <U,>(arr: U[]) => arr[Math.floor(Math.random() * arr.length)];
      const free = live.filter((a) => a.doing && !a.blocked && !a.fear);
      const nBlk = live.filter((a) => a.blocked).length,
        nFear = live.filter((a) => a.fear).length;
      const r = Math.random();
      const blockedP = 0.09,
        fearP = blockedP + 0.07 * this.fearMult,
        inflowP = fearP + 0.24;
      if (r < blockedP && nBlk < 2 && free.length) this.makeBlocked(pick(free));
      else if (r < fearP && nFear < 2 && free.length) this.makeFear(pick(free));
      else if (r < inflowP && live.length) this.inflow(pick(live));
      else if (free.length) {
        const flowBias = this.askFirst ? 0 : 0.5;
        const usable = (team: string) => (this.eqMap[team] || []).filter((F) => F.type !== 'rec');
        const wts = free.map((a) => 1 + usable(a.team).length * 0.9 + ((a.flowUntil || 0) > t ? 1.5 + flowBias : 0));
        let q = Math.random() * wts.reduce((x, y) => x + y, 0),
          i = 0;
        while (q > wts[i] && i < free.length - 1) {
          q -= wts[i];
          i++;
        }
        this.complete(free[i], t);
      }
    }
    this.pulses = this.pulses.filter((p) => {
      if (t - p.at < p.dur) return true;
      if (this.m.sups.pip) this.m.sups.pip.recv = t;
      const [k, path, who, text] = p.card;
      this.card(k, path, who, text);
      return false;
    });
    this.tickRecorders(t);
    if (this.evLog.length > 400) this.evLog = this.evLog.slice(-300);
    if (this.dirty && t - this.lastSave > 1.5 && !this.drag) this.save();
  }
  tickRecorders(t: number) {
    this.m.furn.forEach((F) => {
      if (F.type !== 'rec') return;
      const teams = this.inRange(F);
      if (!teams.length) return;
      const optIdx = F.on.findIndex(Boolean);
      const since = F.lastRecapT != null ? F.lastRecapT : F.born != null ? F.born : t;
      if (optIdx === 3) {
        const teamIds = new Set(teams.map((T) => T.id));
        const stuck = this.evLog.filter((e) => e.kind === 'stuck' && teamIds.has(e.team) && e.t > since);
        if (stuck.length) this.postRecap(F, since, t, teams, optIdx);
      } else {
        const period = REC_DEMO_SECS[optIdx] ?? 45;
        if (t - since >= period) this.postRecap(F, since, t, teams, optIdx);
      }
    });
  }
  postRecap(F: Furniture, since: number, now: number, teams: Team[], optIdx: number) {
    const teamIds = new Set(teams.map((T) => T.id));
    const inWindow = this.evLog.filter((e) => teamIds.has(e.team) && e.t > since && e.t <= now);
    const done = inWindow.filter((e) => e.kind === 'done').length;
    const stuck = inWindow.filter((e) => e.kind === 'stuck');
    const waiting = inWindow.filter((e) => e.kind === 'fear').length;
    const names = teams.map((T) => T.name).join(', ');
    let text = ' — ' + REC_LABELS[optIdx] + ': ' + done + ' done';
    if (stuck.length) text += ', ' + stuck.length + ' stuck (' + stuck[0].who + ': ' + stuck[0].text + ')';
    if (waiting) text += ', ' + waiting + ' waiting on you';
    text += '.';
    this.card('RECAP', names, '', text);
    F.lastRecapT = now;
    F.lastRecapText = text;
    this.dirty = true;
  }

  complete(a: Agent, t: number) {
    const T = this.team(a.team);
    if (!T || !a.doing) return;
    const doneText = a.doing;
    a.done.unshift(doneText);
    a.done = a.done.slice(0, 8);
    a.doing = a.backlog.shift() || null;
    a.recent = (a.recent || []).filter((x) => t - x < 35).concat([t]);
    if (a.recent.length >= 2) a.flowUntil = t + 16;
    T.fireAt = t;
    const eq = (this.eqMap[T.id] || []).filter((F) => F.type !== 'rec');
    const via = eq.length ? ' (via ' + eq.map((F) => FT[F.type].name).filter((v, j, arr) => arr.indexOf(v) === j).join(', ') + ')' : '';
    const P = this.pathPts(T.id);
    let len = 0;
    for (let j = 0; j < P.length - 1; j++) len += Math.hypot(P[j + 1][0] - P[j][0], P[j + 1][1] - P[j][1]);
    this.pulses.push({ team: T.id, at: t, dur: cl(len / 420, 0.9, 2.4), card: ['DONE', this.pathName(T.id), a.name, doneText + via] });
    this.evLog.push({ t, team: T.id, kind: 'done', who: a.name, text: doneText });
    this.dirty = true;
  }
  inflow(a: Agent) {
    const T = this.team(a.team);
    if (!T || !T.pool.length) return;
    const task = T.pool[T.pi % T.pool.length];
    T.pi++;
    if (!a.doing && !a.blocked && !a.fear) a.doing = task;
    else a.backlog.push(task);
    this.dirty = true;
  }
  removeNeeds(aid: string, kind: 'blocked' | 'fear') {
    this.m.needs = this.m.needs.filter((n) => !(n.agent === aid && n.kind === kind));
  }
  makeBlocked(a: Agent) {
    const [text, fix] = BLOCKERS[a.team] || BLOCKERS._;
    a.blocked = { text, fix };
    this.removeNeeds(a.id, 'blocked');
    this.m.needs.unshift({ id: 'nb' + Date.now().toString(36), agent: a.id, team: a.team, kind: 'blocked', text: a.name + ' is stuck: ' + text + '.', acts: [[fix, 'unblock'], ['LATER', 'skip']] });
    this.card('STUCK', this.pathName(a.team), a.name, ' is stuck: ' + text + '.');
    this.evLog.push({ t: NOW(), team: a.team, kind: 'stuck', who: a.name, text });
  }
  makeFear(a: Agent) {
    const f = FEARS[a.team] || FEARS._;
    a.fear = f;
    this.removeNeeds(a.id, 'fear');
    this.m.needs.unshift({ id: 'nf' + Date.now().toString(36), agent: a.id, team: a.team, kind: 'fear', text: a.name + ' wants your OK before ' + f + '.', acts: [['GO AHEAD', 'approve'], ['HOLD OFF', 'hold']] });
    this.card('ASKS', this.pathName(a.team), a.name, ' wants your OK before ' + f + '.');
    this.evLog.push({ t: NOW(), team: a.team, kind: 'fear', who: a.name, text: f });
  }
  unblock(a: Agent) {
    a.blocked = null;
    this.removeNeeds(a.id, 'blocked');
    this.card('YOU', this.pathName(a.team), a.name, ' is unblocked and back at it.');
    if (this.tourOn && this.tourStep === 1 && this.tourWaiting && a.id === this.tourBlockedAgentId) {
      this.tourWaiting = false;
      this.tourAdvanceAfterFix();
    }
  }
  approve(a: Agent) {
    a.fear = null;
    this.removeNeeds(a.id, 'fear');
    this.complete(a, NOW());
    this.card('YOU', this.pathName(a.team), a.name, ' got your OK and went ahead.');
  }
  hold(a: Agent) {
    a.fear = null;
    this.removeNeeds(a.id, 'fear');
    if (a.doing) {
      const parked = a.doing;
      a.doing = a.backlog.shift() || null;
      a.backlog.push(parked);
    }
    this.card('YOU', this.pathName(a.team), a.name, ' parked it for later.');
  }
  splitLoad(a: Agent) {
    const mates = this.members(this.team(a.team)!).filter((o) => o.id !== a.id);
    if (!mates.length || a.backlog.length < 2) return;
    const n = Math.floor(a.backlog.length / 2),
      moved = a.backlog.splice(a.backlog.length - n, n),
      got: Record<string, number> = {};
    moved.forEach((task) => {
      const m2 = mates.slice().sort((x, y) => x.backlog.length + (x.doing ? 1 : 0) - (y.backlog.length + (y.doing ? 1 : 0)))[0];
      if (!m2.doing && !m2.blocked && !m2.fear) m2.doing = task;
      else m2.backlog.push(task);
      got[m2.name] = 1;
    });
    this.card('YOU', this.pathName(a.team), a.name, ' handed ' + n + ' tasks to ' + Object.keys(got).join(', ') + '.');
  }
  giveWork(a: Agent) {
    this.inflow(a);
    this.inflow(a);
    this.card('YOU', this.pathName(a.team), a.name, ' picked up 2 new tasks.');
  }
  mood(a: Agent, t: number): Mood {
    if (a.blocked) return 'frustrated';
    if (a.fear) return 'stalled';
    if (a.backlog.length >= 4) return 'overwhelmed';
    if (!a.doing && !a.backlog.length) return 'bored';
    if ((a.flowUntil || 0) > t) return 'flow';
    return 'working';
  }
  thought(a: Agent, md: Mood) {
    switch (md) {
      case 'flow':
        return { text: 'On a roll. ' + (a.recent || []).length + ' done back to back.', why: 'finishing fast' };
      case 'overwhelmed':
        return { text: a.backlog.length + (a.doing ? 1 : 0) + ' things on my plate. Where do I even start?', why: a.backlog.length + ' queued' };
      case 'bored':
        return { text: 'Nothing in my queue. Got anything for me?', why: 'empty backlog' };
      case 'frustrated':
        return { text: 'Can’t finish this. ' + cap(a.blocked!.text) + '.', why: 'blocked' };
      case 'stalled':
        return { text: 'Not sure about ' + a.fear + '. Waiting on your OK.', why: 'afraid to proceed' };
      case 'pending':
        return { text: 'Ready to start once you sign.', why: 'team not live' };
      default:
        return { text: (a.doing || 'Tidying up') + '…', why: 'steady' };
    }
  }
  secs(t: number, doing: { text: string; tag?: string }[], backlog: { text: string; tag?: string }[], done: { text: string; tag?: string }[]) {
    const mk = (label: string, items: { text: string; tag?: string }[], st: 'doing' | 'backlog' | 'done') => ({
      label,
      n: items.length,
      empty: items.length === 0,
      items: items.map((x) => ({
        text: x.text,
        tag: x.tag || '',
        hasTag: !!x.tag,
        mark: st === 'doing' ? '●' : st === 'done' ? '✓' : '○',
        mOp: st === 'doing' ? 0.3 + 0.7 * Math.abs(Math.sin(t * 3)) : 1,
        color: st === 'done' ? '#6b6a62' : '#15140f',
      })),
    });
    return [mk('IN WORK', doing, 'doing'), mk('BACKLOG', backlog, 'backlog'), mk('DONE', done, 'done')];
  }

  buildPop(t: number, vw: number, vh: number): PopVals | null {
    const sel = this.sel!,
      m = this.m,
      z = this.zoom,
      P = this.pan;
    let wx = 0,
      wy = 0,
      r = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p: any = { needs: [], rows: [], members: [], secs: [], acts: [], bossChips: [], equip: [], opts: [] };
    const btn = (label: string, go: () => void, kind?: 'primary' | 'danger') => ({
      label,
      go,
      bg: kind === 'primary' ? '#15140f' : 'transparent',
      fg: kind === 'danger' ? '#9a3b2c' : kind === 'primary' ? '#f4f3ee' : '#15140f',
      bc: kind === 'danger' ? '#9a3b2c' : '#15140f',
    });
    const chips = (cur: string | null, list: Manager[], apply: (id: string) => void) =>
      list.map((s) => ({ label: s.name, bg: s.id === cur ? '#15140f' : 'transparent', fg: s.id === cur ? '#f4f3ee' : '#15140f', go: () => apply(s.id) }));
    const teamStat = (T: Team) => {
      if (T.state === 'hidden') return 'proposed';
      if (T.state === 'pending') return 'pending';
      const mem = this.members(T);
      return mem.length + ' agents · ' + mem.filter((a) => a.doing).length + ' in work';
    };
    const reportRows = (id: string) => {
      const rows: { name: string; stat: string; dotR: string; dotBg: string; go: () => void }[] = [];
      Object.values(m.sups)
        .filter((s) => s.boss === id)
        .forEach((s) =>
          rows.push({
            name: s.name,
            stat: 'manager · ' + (m.teams.filter((T) => T.boss === s.id).length + Object.values(m.sups).filter((o) => o.boss === s.id).length) + ' reports',
            dotR: '50%',
            dotBg: '#15140f',
            go: () => this.select({ kind: 'sup', id: s.id }),
          }),
        );
      m.teams
        .filter((T) => T.boss === id)
        .forEach((T) =>
          rows.push({
            name: T.name,
            stat: teamStat(T),
            dotR: '3px',
            dotBg: T.state === 'active' ? '#fbfaf5' : 'transparent',
            go: () => (T.state === 'hidden' ? this.select({ kind: 'sup', id: 'pip' }) : this.select({ kind: 'team', id: T.id })),
          }),
        );
      return rows;
    };
    const equipRows = (T: Team) =>
      (this.eqMap[T.id] || []).map((F) => ({
        short: FT[F.type].short,
        detail: FT[F.type].name + ': ' + (FT[F.type].opts.filter((_, i) => F.on[i]).join(', ') || 'nothing switched on'),
        go: () => this.select({ kind: 'furn', id: F.id }),
      }));

    if (sel.kind === 'agent') {
      const a = this.agent(sel.id);
      if (!a) return null;
      const pos = this.dragPos && this.drag && this.drag.id === a.id ? this.dragPos : this.apos[a.id];
      if (!pos) return null;
      wx = pos.x;
      wy = pos.y;
      r = 16;
      const T = this.team(a.team)!,
        pend = T.state === 'pending';
      p.title = a.name;
      p.sub = this.pathName(T.id) + ' · ' + a.role;
      p.equip = equipRows(T);
      const md = pend ? 'pending' : this.mood(a, t),
        th = this.thought(a, md);
      p.hasMood = true;
      p.moodLabel = MOOD[md].label;
      p.moodWhy = th.why;
      p.moodText = th.text;
      p.moodBg = md === 'working' ? '#15140f' : MOOD[md].c;
      p.moodFg = md === 'working' ? '#f4f3ee' : '#15140f';
      const mates = this.members(T).filter((o) => o.id !== a.id);
      const wrap = (fn: () => void) => () => {
        fn();
        this.notify();
      };
      p.moodActs =
        md === 'frustrated'
          ? [btn(a.blocked!.fix, wrap(() => this.unblock(a)), 'primary')]
          : md === 'stalled'
            ? [btn('GO AHEAD', wrap(() => this.approve(a)), 'primary'), btn('HOLD OFF', wrap(() => this.hold(a)))]
            : md === 'overwhelmed' && mates.length
              ? [btn('SPLIT LOAD', wrap(() => this.splitLoad(a)), 'primary')]
              : md === 'bored'
                ? [btn('GIVE WORK', wrap(() => this.giveWork(a)), 'primary')]
                : [];
      p.hasMoodActs = p.moodActs.length > 0;
      p.secs = this.secs(t, a.doing ? [{ text: a.doing }] : [], a.backlog.map((x) => ({ text: x })), a.done.slice(0, 4).map((x) => ({ text: x })));
      p.hint = pend ? 'Waiting on your signature. Open PIP to sign.' : 'Drag me onto another floor to reassign.';
    } else if (sel.kind === 'team') {
      const T = this.team(sel.id);
      if (!T) return null;
      const mem = this.members(T);
      wx = T.x;
      wy = T.y;
      r = roomW(mem.length) / 2;
      p.title = T.name;
      p.sub = (this.chain(T.boss).join(' › ') || 'PIP') + ' · ' + mem.length + ' agents';
      p.hasEdit = true;
      p.nameVal = T.name;
      p.onName = (v: string) => {
        T.name = (v || '').toUpperCase();
        this.dirty = true;
        this.notify();
      };
      p.hasBoss = true;
      p.bossChips = chips(T.boss, Object.values(m.sups), (id) => this.reparent('team', T.id, id));
      p.isTeam = mem.length > 0;
      p.memberCount = mem.length;
      const moods: Record<string, number> = {};
      p.members = mem.map((a) => {
        const md = T.state === 'pending' ? 'pending' : this.mood(a, t);
        moods[md] = (moods[md] || 0) + 1;
        return { name: a.name + (MOOD[md].tag ? ' · ' + MOOD[md].tag : ''), go: () => this.select({ kind: 'agent', id: a.id }) };
      });
      if (mem.length) {
        p.hasDesc = true;
        p.desc = 'Mood: ' + Object.keys(moods).map((k) => moods[k] + ' ' + MOOD[k as Mood].label.toLowerCase()).join(' · ');
      }
      p.equip = equipRows(T);
      const doing: { text: string; tag?: string }[] = [],
        backlog: { text: string; tag?: string }[] = [],
        done: { text: string; tag?: string }[] = [];
      mem.forEach((a) => {
        if (a.doing) doing.push({ text: a.doing, tag: a.name });
        a.backlog.forEach((x) => backlog.push({ text: x, tag: a.name }));
        a.done.slice(0, 2).forEach((x) => done.push({ text: x, tag: a.name }));
      });
      if (mem.length) p.secs = this.secs(t, doing, backlog, done.slice(0, 6));
      if (!mem.length) p.acts = [btn('DELETE FLOOR', () => this.deleteTeam(T.id), 'danger')];
      p.hint = T.state === 'pending' ? 'Pending your signature. Open PIP to sign.' : mem.length ? 'Drag the floor onto a manager to change who it reports to.' : 'Empty floor. Drag agents in from other teams to staff it.';
    } else if (sel.kind === 'furn') {
      const F = this.furnById(sel.id);
      if (!F) return null;
      const D = FT[F.type];
      wx = F.x;
      wy = F.y;
      r = 26;
      const ts = this.inRange(F);
      p.title = D.name;
      p.sub = ts.length ? 'serving ' + ts.length + (ts.length === 1 ? ' team' : ' teams') : 'not near any team';
      p.hasDesc = true;
      p.desc = D.desc;
      p.hasOpts = true;
      p.optsLabel = D.optsLabel;
      const radio = F.type === 'rec';
      p.opts = D.opts.map((o, i) => ({
        label: (F.on[i] ? '✓ ' : '+ ') + o,
        bg: F.on[i] ? '#15140f' : 'transparent',
        fg: F.on[i] ? '#f4f3ee' : '#15140f',
        border: F.on[i] ? '2px solid #15140f' : '2px dashed rgba(21,20,15,.4)',
        go: () => {
          if (radio) F.on = D.opts.map((_, k) => k === i);
          else F.on[i] = !F.on[i];
          this.dirty = true;
          this.notify();
        },
      }));
      if (F.type === 'rec') {
        p.desc = D.desc + ' Demo clock — 10 min passes in 45 s.';
        p.hasRecorder = true;
        p.lastRecap = F.lastRecapText || 'Nothing yet.';
        const optIdx = F.on.findIndex(Boolean);
        const period = REC_DEMO_SECS[optIdx];
        if (period != null) {
          const since = F.lastRecapT != null ? F.lastRecapT : F.born != null ? F.born : t;
          const left = Math.max(0, since + period - t);
          const mm = Math.floor(left / 60),
            ss = Math.floor(left % 60);
          p.nextIn = mm + ':' + String(ss).padStart(2, '0');
        } else {
          p.nextIn = 'watching for a stuck agent';
        }
      }
      p.hasRows = true;
      p.rowsLabel = 'IN RANGE';
      p.rowCount = ts.length;
      p.noRows = !ts.length;
      p.noRowsText = 'Drag it close to a team floor.';
      p.rows = ts.map((T) => ({ name: T.name, stat: teamStat(T), dotR: '3px', dotBg: '#fbfaf5', go: () => this.select({ kind: 'team', id: T.id }) }));
      p.acts = [btn('REMOVE', () => this.deleteFurn(F.id), 'danger')];
      p.hint = F.type === 'rec' ? 'It watches; agents don’t walk to it.' : 'Agents on floors inside the dashed ring walk over to use it and finish work faster.';
    } else {
      const s = m.sups[sel.id];
      if (!s) return null;
      wx = s.x;
      wy = s.y;
      r = s.size * 0.9;
      p.title = s.name;
      const rows = reportRows(s.id);
      p.hasRows = true;
      p.rowsLabel = 'DIRECT REPORTS';
      p.rows = rows;
      p.rowCount = rows.length;
      p.noRows = !rows.length;
      p.noRowsText = 'No reports yet. Drop a team or manager on ' + s.name + '.';
      if (s.id === 'pip') {
        p.sub = 'PRIME SUPERVISOR · ' + m.teams.filter((T) => T.state === 'active').length + ' teams running';
        p.hasNeeds = true;
        p.needCount = m.needs.length;
        p.noNeeds = m.needs.length === 0;
        p.needs = m.needs.map((nd) => ({
          path: this.pathName(nd.team),
          text: nd.text,
          acts: nd.acts.map(([label, action], i) => ({ label, bg: i === 0 ? '#15140f' : 'transparent', fg: i === 0 ? '#f4f3ee' : '#15140f', go: () => this.act(nd, action) })),
        }));
        p.acts = [btn('+ MANAGER', () => this.addManager('pip'), 'primary'), btn('+ TEAM', () => this.addTeam('pip'))];
        p.hint = 'Everything your teams can’t decide alone lands here.';
      } else {
        p.sub = s.role + ' · manager';
        p.hasEdit = true;
        p.hasRole = true;
        p.nameVal = s.name;
        p.roleVal = s.role;
        p.onName = (v: string) => {
          s.name = (v || '').toUpperCase();
          this.dirty = true;
          this.notify();
        };
        p.onRole = (v: string) => {
          s.role = (v || '').toUpperCase();
          this.dirty = true;
          this.notify();
        };
        p.hasBoss = true;
        p.bossChips = chips(
          s.boss,
          Object.values(m.sups).filter((o) => o.id !== s.id && !this.isUnder(o.id, s.id)),
          (id) => this.reparent('sup', s.id, id),
        );
        p.acts = [btn('+ SUB-MANAGER', () => this.addManager(s.id), 'primary'), btn('+ TEAM', () => this.addTeam(s.id)), btn('RETIRE', () => this.deleteManager(s.id), 'danger')];
        p.hint = 'Drag onto another manager to move this whole branch.';
      }
    }
    p.moodActs = p.moodActs || [];
    p.hasEquip = p.equip.length > 0;
    p.hasActs = p.acts.length > 0;
    p.hasHint = !!p.hint;
    const sx = P.x + wx * z,
      sy = P.y + wy * z,
      rr = r * z,
      W = 330,
      fw = this.feedW();
    let left = sx + rr + 18,
      origin = 'left top';
    if (left + W > vw - fw - 12) {
      left = sx - rr - 18 - W;
      origin = 'right top';
    }
    left = cl(left, 12, Math.max(12, vw - W - 12));
    const top = cl(sy - 70, 64, Math.max(64, vh - 360));
    const pa = cl((t - this.popAt) / 0.28, 0, 1);
    return Object.assign(p, { l: left, t: top, maxH: vh - top - 16, op: pa, sc: 0.94 + 0.06 * outBack(pa), ty: (1 - outCubic(pa)) * 8, origin });
  }

  renderVals(): RenderVals {
    const m = this.m,
      t = NOW(),
      z = this.zoom,
      P = this.pan,
      S = m.sups;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1400,
      vh = typeof window !== 'undefined' ? window.innerHeight : 900;
    const dr = this.drag,
      dragA = dr && dr.kind === 'agent' && dr.moved ? dr.id! : null;
    const sel = this.sel,
      always = !!this.settings.alwaysShowNames;
    const dt = cl(t - (this.lastT || t), 0, 0.1);
    this.lastT = t;
    const tmode = this.settings.thoughts || 'icons';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lines: any[] = [],
      rooms: any[] = [],
      ghosts: any[] = [],
      sups: any[] = [],
      pulses: any[] = [],
      furn: any[] = [];
    const line = (a: [number, number], b: [number, number], op: number, bw: number, ls: string) => {
      const dx = b[0] - a[0],
        dy = b[1] - a[1];
      lines.push({ x: a[0], y: a[1] - bw / 2, w: Math.hypot(dx, dy), a: (Math.atan2(dy, dx) * 180) / Math.PI, op, bw, ls });
    };
    Object.values(S).forEach((s) => {
      if (s.boss && S[s.boss]) line([S[s.boss].x, S[s.boss].y], [s.x, s.y], 0.26, 2, 'solid');
    });
    this.apos = {};
    const eqMap: Record<string, Furniture[]> = {};
    m.furn.forEach((F) =>
      this.inRange(F).forEach((T) => {
        (eqMap[T.id] = eqMap[T.id] || []).push(F);
        line([F.x, F.y], [T.x, T.y], 0.28, 1.5, 'dotted');
      }),
    );
    this.eqMap = eqMap;

    m.furn.forEach((F) => {
      const D = FT[F.type],
        isSel = !!(sel && sel.kind === 'furn' && sel.id === F.id);
      const dragging = !!(dr && dr.kind === 'furn' && dr.id === F.id && dr.moved);
      const born = F.born != null ? cl((t - F.born) / 0.5, 0, 1) : 1;
      const nOn = F.on.filter(Boolean).length;
      furn.push({
        id: F.id,
        x: F.x,
        y: F.y,
        kind: F.type,
        t,
        label: D.name,
        sub: nOn + ' on · ' + this.inRange(F).length + ' teams',
        showRange: isSel || dragging,
        rL: -FR,
        rD: FR * 2,
        z: isSel || dragging ? 8 : 0,
        sc: (born < 1 ? outBack(born) : 1) * (dragging ? 1.1 : 1),
        down: (e: React.PointerEvent) => this.nodeDown(e, 'furn', F.id),
      });
    });

    m.teams.forEach((T, ti) => {
      const B = S[T.boss] || S.pip;
      if (T.state === 'hidden') {
        line([B.x, B.y], [T.x, T.y], 0.12, 1.5, 'dashed');
        ghosts.push({ id: T.id, l: T.x - 65, t: T.y - 48, down: (e: React.PointerEvent) => this.nodeDown(e, 'ghost', T.id) });
        return;
      }
      const pend = T.state === 'pending';
      line([B.x, B.y], [T.x, T.y], pend ? 0.12 : 0.17, 1.5, pend ? 'dashed' : 'solid');
      const mem = this.members(T, dragA || undefined),
        n = mem.length,
        w = roomW(n),
        h = roomH(n),
        dk = desks(n, w, h);
      const born = T.born != null ? cl((t - T.born) / 0.6, 0, 1) : 1;
      const bsc = T.born != null && born < 1 ? outBack(born) : 1;
      const fe = t - (T.fireAt != null ? T.fireAt : -99);
      const emph = fe >= 0 && fe < 0.5 ? 1 + 0.045 * Math.sin((fe / 0.5) * Math.PI) : 1;
      const isSel = !!(sel && sel.kind === 'team' && sel.id === T.id);
      const hot = !!dragA && this.hover === T.id;
      const beingDragged = !!(dr && dr.kind === 'team' && dr.id === T.id && dr.moved);
      const eq = eqMap[T.id] || [];
      const eqWalk = eq.filter((F) => F.type !== 'rec');
      const agents = mem.map((a, i) => {
        const ph = i * 0.8 + ti * 1.7;
        const md = pend ? 'pending' : this.mood(a, t);
        const desk = dk[i];
        let tx = desk[0],
          ty = desk[1],
          atF = false,
          trip = false;
        if ((md === 'working' || md === 'flow') && eqWalk.length) {
          const F = eqWalk[i % eqWalk.length],
            per = 26,
            tt = (((t + ph * 3.1) % per) + per) % per,
            go = 1.6,
            stay = 3.4;
          const fx = F.x - T.x,
            fy = F.y - T.y + 32;
          if (tt < go) {
            const q = inOutSine(tt / go);
            tx = lerp(desk[0], fx, q);
            ty = lerp(desk[1], fy, q);
            trip = true;
          } else if (tt < go + stay) {
            tx = fx;
            ty = fy;
            atF = true;
          } else if (tt < go * 2 + stay) {
            const q = inOutSine((tt - go - stay) / go);
            tx = lerp(fx, desk[0], q);
            ty = lerp(fy, desk[1], q);
            trip = true;
          }
        } else if (md === 'bored') {
          tx = desk[0] + Math.sin(t * 0.35 + ph) * 16;
          ty = desk[1] + Math.sin(t * 0.23 + ph) * 4;
        }
        let d = this.disp[a.id];
        if (!d) d = this.disp[a.id] = { team: T.id, x: tx, y: ty };
        if (d.team !== T.id) {
          d.x = (d.wx != null ? d.wx : T.x) - T.x;
          d.y = (d.wy != null ? d.wy : T.y) - T.y;
          d.team = T.id;
        }
        const gap = Math.hypot(tx - d.x, ty - d.y),
          k = 1 - Math.exp(-dt * 7);
        d.x += (tx - d.x) * k;
        d.y += (ty - d.y) * k;
        d.wx = T.x + d.x;
        d.wy = T.y + d.y;
        this.apos[a.id] = { x: d.wx, y: d.wy };
        const walking = trip || (gap > 2 && md !== 'bored');
        let bob = 0,
          jx = 0,
          rot = 0,
          bsc2 = 1,
          eW = 2.4,
          eH = 3.2,
          eT = 5.6,
          e1 = 4.2,
          e2 = 10.4;
        if (walking) bob = -Math.abs(Math.sin(t * 12 + ph)) * 1.8;
        else if (md === 'working') bob = Math.sin(t * 7 + ph) * 1.1;
        else if (md === 'flow') {
          bob = -Math.max(0, Math.sin(t * 5 + ph)) * 3.2;
          eH = 1.3;
          eT = 6.6;
        } else if (md === 'overwhelmed') {
          jx = Math.sin(t * 38 + ph) * 0.7;
          eW = 3;
          eH = 4;
          eT = 4.6;
          e1 = 3.4;
          e2 = 10.2;
        } else if (md === 'bored') {
          bob = Math.sin(t * 1.1 + ph) * 1.2;
          rot = Math.sin(t * 0.9 + ph) * 7;
          eH = 1.1;
          eT = 8.2;
        } else if (md === 'frustrated') {
          const c = (((t + ph) % 2.6) + 2.6) % 2.6;
          if (c < 0.35) {
            jx = Math.sin(c * 60) * 1.4;
            bob = -1.5;
          }
          eH = 2;
          eT = 7;
        } else if (md === 'stalled') {
          jx = Math.sin(t * 22 + ph) * 0.35;
          rot = -5;
          bsc2 = 0.93;
          const look = Math.sin(t * 2.4 + ph) * 1.6;
          e1 += look;
          e2 += look;
          eH = 3;
        }
        const blink = ((t * 0.9 + ph * 1.37) % 4.3) < 0.13;
        if (blink && md !== 'bored' && md !== 'flow') {
          eT += (eH - 0.8) / 2;
          eH = 0.8;
        }
        const aSel = !!(sel && sel.kind === 'agent' && sel.id === a.id),
          hov = this.hoverAgent === a.id;
        const notable = md !== 'working' && md !== 'pending';
        const th = this.thought(a, md);
        const hasBubble = tmode !== 'off' && !walking && (aSel || hov || tmode === 'always');
        const hasIcon = notable && !hasBubble && !walking && tmode !== 'off';
        const pulse = 1 + 0.08 * Math.sin(t * (md === 'frustrated' ? 9 : md === 'overwhelmed' ? 7 : 3) + ph);
        const decoT = 9.5 + bob;
        const cyc = (sp: number, ph2: number) => ((((t * sp + ph2) % 1) + 1) % 1);
        return {
          id: a.id,
          l: w / 2 + d.x,
          t: h / 2 + d.y,
          z: hasBubble || aSel ? 3 : 1,
          bodyT: decoT,
          bodyL: 9.5 + jx,
          rot,
          bsc: bsc2,
          ringT: 4 + bob,
          dotT: 1 + bob,
          nameT: 30 + bob,
          working: (md === 'working' || atF) && !walking && !pend,
          d1: 0.4 + 0.6 * Math.abs(Math.sin(t * 6 + ph)),
          d2: 0.4 + 0.6 * Math.abs(Math.sin(t * 6 + ph + 1)),
          e1L: e1,
          e2L: e2,
          eT,
          eW,
          eH,
          b1L: e1 - 0.8,
          b2L: e2 - 0.8,
          browT: eT - 2.2,
          isFlow: md === 'flow' && !walking,
          isOver: md === 'overwhelmed',
          isBored: md === 'bored',
          isFrus: md === 'frustrated',
          isStall: md === 'stalled',
          s1: 0.2 + 0.8 * Math.abs(Math.sin(t * 4 + ph)),
          s2: 0.2 + 0.8 * Math.abs(Math.sin(t * 4 + ph + 1.3)),
          s3: 0.2 + 0.8 * Math.abs(Math.sin(t * 4 + ph + 2.6)),
          sT1: decoT - 4,
          sT2: decoT - 6,
          sT3: decoT + 9,
          swT: 1 + cyc(0.6, ph) * 4,
          swO: 1 - cyc(0.6, ph),
          puffT: decoT - 6 - cyc(0.7, ph) * 7,
          puffO: 1 - cyc(0.7, ph),
          hasBubble,
          bubB: 36 - decoT + 12,
          moodTag: MOOD[md].tag,
          thought: th.text,
          hasIcon,
          icB: 36 - decoT + 3,
          icSc: pulse,
          icon: md === 'overwhelmed' ? String(a.backlog.length + (a.doing ? 1 : 0)) : MOOD[md].icon,
          mc: MOOD[md].c,
          hasAura: notable,
          auraOp: 0.55 + 0.25 * Math.sin(t * 3 + ph),
          auraSc: pulse,
          op: pend ? 0.4 : 1,
          sel: aSel,
          showName: (aSel || always || z >= 1.25) && !hasBubble,
          name: a.name,
          down: (e: React.PointerEvent) => this.nodeDown(e, 'agent', a.id),
          enter: () => {
            this.hoverAgent = a.id;
          },
          leave: () => {
            if (this.hoverAgent === a.id) this.hoverAgent = null;
          },
        };
      });
      const eqShort = eq
        .map((F) => FT[F.type].short)
        .filter((v, j, arr) => arr.indexOf(v) === j)
        .join(' · ');
      rooms.push({
        id: T.id,
        l: T.x - w / 2,
        t: T.y - h / 2,
        w,
        h,
        sc: bsc * emph * (beingDragged && this.hoverMgr ? 0.9 : 1),
        op: born * (beingDragged && this.hoverMgr ? 0.65 : 1),
        z: isSel || hot ? 5 : beingDragged ? 6 : 1,
        ripple: fe >= 0 && fe < 0.7,
        ro: 0.5 * (1 - cl(fe / 0.7, 0, 1)),
        rs: 1 + cl(fe / 0.7, 0, 1) * 0.35,
        bg: pend ? 'rgba(251,250,245,.55)' : hot ? '#ffffff' : '#fbfaf5',
        border: pend ? '2px dashed rgba(21,20,15,.28)' : hot ? '3px solid #15140f' : '2px solid #15140f',
        shadow: pend ? 'none' : isSel || hot ? '0 4px 0 rgba(21,20,15,.1), 0 0 0 6px rgba(21,20,15,.1)' : '0 4px 0 rgba(21,20,15,.1)',
        labelColor: pend ? '#6b6a62' : '#15140f',
        name: T.name,
        meta: pend ? ' · pending' : ' · ' + n,
        hasEq: !!eqShort && !pend,
        eqTag: eqShort,
        empty: n === 0 && !pend,
        moodDots: mem.map((a) => {
          const md = pend ? 'pending' : this.mood(a, t);
          return { c: md === 'working' ? '#fbfaf5' : MOOD[md].c, w: md === 'working' ? 6 : 12 };
        }),
        desks: dk.map((d) => ({ l: w / 2 + d[0] - 10, t: h / 2 + d[1] + 8, c: pend ? 'rgba(21,20,15,.2)' : 'rgba(21,20,15,.5)' })),
        agents,
        down: (e: React.PointerEvent) => this.nodeDown(e, 'team', T.id),
      });
    });

    Object.values(S).forEach((s, si) => {
      const prime = s.id === 'pip',
        sz = s.size,
        ph = prime ? 0 : si * 1.3;
      const bob = Math.sin(t * 2 + ph) * (prime ? 4 : 3);
      const rv = t - (s.recv || -99),
        rsc = rv >= 0 && rv < 0.45 ? 1 + 0.12 * Math.sin((rv / 0.45) * Math.PI) : 1;
      const born = s.born != null ? cl((t - s.born) / 0.6, 0, 1) : 1;
      const bsc = s.born != null && born < 1 ? outBack(born) : 1;
      const isSel = !!(sel && sel.kind === 'sup' && sel.id === s.id);
      const hot = this.hoverMgr === s.id;
      let lx = 0,
        ly = 0;
      if (prime && this.mouse.x > -900) {
        const sx = P.x + s.x * z,
          sy = P.y + s.y * z,
          dx = this.mouse.x - sx,
          dy = this.mouse.y - sy,
          d = Math.hypot(dx, dy) || 1,
          k = Math.min(1, d / 200);
        lx = (dx / d) * sz * 0.07 * k;
        ly = (dy / d) * sz * 0.06 * k;
      }
      const blink = ((t * 0.8 + ph * 2.1) % 5.1) < 0.14;
      const eW = sz * 0.13,
        eHf = sz * 0.17,
        g = sz * 0.16;
      const dragging = !!(dr && dr.kind === 'sup' && dr.id === s.id && dr.moved);
      sups.push({
        id: s.id,
        x: s.x,
        y: s.y,
        z: hot ? 40 : isSel || dragging ? 30 : 20,
        op: born * (dragging && this.hoverMgr ? 0.65 : 1),
        size: sz,
        bl: -sz / 2,
        bt: -sz / 2 + bob,
        sc: bsc * rsc * (dragging ? 1.08 : 1) * (hot ? 1.12 : 1),
        halo: sz * 1.85,
        haloL: -sz * 0.925,
        haloT: -sz * 0.925 + bob,
        hs: hot ? 1.25 : 1 + Math.sin(t * 1.6 + ph) * 0.06,
        haloOp: hot ? 0.7 : isSel ? 0.45 : prime ? 0.18 : 0.13,
        haloStyle: hot ? 'solid' : 'dashed',
        haloBg: hot ? 'rgba(21,20,15,.06)' : 'transparent',
        rad: sz * 0.22,
        earW: sz * 0.13,
        earH: sz * 0.34,
        earT: -sz * 0.28,
        ear1L: sz * 0.28 - sz * 0.065,
        ear2L: sz * 0.72 - sz * 0.065,
        e1L: sz / 2 - g / 2 - eW + lx,
        e2L: sz / 2 + g / 2 + lx,
        eT: prime && this.pipAsleep ? sz * 0.36 + eHf * 0.4 : sz * 0.36 + ly + (blink ? eHf * 0.4 : 0),
        eW,
        eH: prime && this.pipAsleep ? eHf * 0.2 : blink ? eHf * 0.2 : eHf,
        labT: sz * 0.62 + bob + 6,
        name: s.name,
        role: s.role,
        nameSize: prime ? 13 : 12,
        hasBadge: prime && m.needs.length > 0,
        badge: m.needs.length,
        badgeSc: 1 + 0.06 * Math.sin(t * 4),
        down: (e: React.PointerEvent) => this.nodeDown(e, 'sup', s.id),
      });
    });

    this.pulses.forEach((p) => {
      const path = this.pathPts(p.team);
      const segs: number[] = [];
      let total = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const d = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
        segs.push(d);
        total += d;
      }
      const target = inOutCubic(cl((t - p.at) / p.dur, 0, 1)) * total;
      let acc = 0,
        x = path[0][0],
        y = path[0][1];
      for (let i = 0; i < segs.length; i++) {
        if (target <= acc + segs[i]) {
          const q = segs[i] ? (target - acc) / segs[i] : 0;
          x = lerp(path[i][0], path[i + 1][0], q);
          y = lerp(path[i][1], path[i + 1][1], q);
          break;
        }
        acc += segs[i];
        x = path[i + 1][0];
        y = path[i + 1][1];
      }
      pulses.push({ x, y });
    });

    let dragAg = { x: 0, y: 0, name: '', target: '', rot: 0 };
    if (dragA && this.dragPos) {
      const a = this.agent(dragA)!;
      dragAg = { x: this.dragPos.x, y: this.dragPos.y, name: a.name, target: this.hover ? '→ ' + this.team(this.hover)!.name : '· drop on a floor', rot: cl((this.dragPos.vx || 0) * 1.5, -14, 14) };
    }
    const newF = !!(dr && dr.kind === 'newfurn' && dr.moved);
    const overWorld = newF && this.mouse.y < vh - 120 && this.mouse.x < vw - this.feedW();
    const ghost = newF ? { x: this.mouse.x, y: this.mouse.y, kind: dr!.type, t, sc: overWorld ? z : 0.9, label: overWorld ? 'place ' + FT[dr!.type!].name : 'drag onto the floor' } : { x: 0, y: 0, kind: 'mcp' as const, t, sc: 1, label: '' };
    const reTag = this.hoverMgr && S[this.hoverMgr] ? { x: this.mouse.x + 16, y: this.mouse.y + 18, text: '→ report to ' + S[this.hoverMgr].name } : { x: 0, y: 0, text: '' };

    const nowMs = Date.now();
    const ago = (ms: number) => (ms < 10000 ? 'now' : ms < 60000 ? Math.floor(ms / 1000) + 's' : Math.floor(ms / 60000) + 'm');
    const cards = m.feed.map((c) => {
      const pr = cl((nowMs - c.ts) / 500, 0, 1);
      const filled = c.kind !== 'DONE' && c.kind !== 'MOVED';
      const kc = c.kind === 'STUCK' ? '#d63c2f' : c.kind === 'ASKS' ? '#e8b923' : null;
      return {
        id: c.id,
        kind: c.kind,
        path: c.path || '',
        who: c.who ? c.who + (c.kind === 'DONE' ? ' ✓ ' : '') : '',
        text: c.text,
        ago: ago(nowMs - c.ts),
        op: outCubic(pr),
        tx: (1 - outCubic(pr)) * 40,
        kbg: kc || (filled ? '#15140f' : 'transparent'),
        kfg: kc ? '#15140f' : filled ? '#f4f3ee' : '#15140f',
      };
    });

    const pop = sel ? this.buildPop(t, vw, vh) : null;
    const tgt = S[this.addTargetId()] || S.pip;

    return {
      panX: P.x,
      panY: P.y,
      zoom: z,
      gridSize: 30 * z,
      bgCursor: dr && dr.moved ? 'grabbing' : 'default',
      lines,
      rooms,
      ghosts,
      sups,
      pulses,
      furn,
      hasDragAg: !!(dragA && this.dragPos),
      dragAg,
      hasGhost: newF,
      ghost,
      hasReTag: !!this.hoverMgr,
      reTag,
      dock: FT.mcp
        ? (['mcp', 'db', 'books', 'rec'] as const).map((k) => ({ kind: k, t, short: FT[k].short, tip: DOCK_TIP[k], down: (e: React.PointerEvent) => this.dockDown(e, k) }))
        : [],
      dockX: vw - this.feedW() < 700 ? (vw - this.feedW()) / 2 : Math.max(290 + 200, (vw - this.feedW()) / 2 + 40),
      ctrlBottom: vw - this.feedW() < 700 ? 128 : 18,
      addTarget: tgt.name,
      addMgr: () => this.addManager(tgt.id),
      addTeam: () => this.addTeam(tgt.id),
      agentCount: m.agents.filter((a) => {
        const T = this.team(a.team);
        return T && T.state === 'active';
      }).length,
      teamCount: m.teams.filter((T) => T.state === 'active').length,
      mgrCount: Object.keys(S).length,
      furnCount: m.furn.length,
      zoomPct: Math.round(z * 100),
      zoomIn: () => {
        this.zoomAt((vw - this.feedW()) / 2, vh / 2, 1.2);
        this.notify();
      },
      zoomOut: () => {
        this.zoomAt((vw - this.feedW()) / 2, vh / 2, 1 / 1.2);
        this.notify();
      },
      fit: () => {
        this.fitView();
        this.notify();
      },
      resetConfirmOpen: this.resetConfirm,
      resetAsk: () => {
        this.resetConfirm = true;
        this.notify();
      },
      resetNo: () => {
        this.resetConfirm = false;
        this.notify();
      },
      resetYes: () => {
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
        this.m = blank();
        this.sel = null;
        this.pulses = [];
        this.disp = {};
        this.evLog = [];
        this.resetConfirm = false;
        this.introOn = true;
        this.introPhase = 'sleep';
        this.pipAsleep = true;
        this.tourOn = false;
        this.fitView();
        this.notify();
      },
      feedOpen: this.showFeed,
      feedClosed: !this.showFeed,
      toggleFeed: () => {
        this.showFeed = !this.showFeed;
        this.notify();
      },
      liveOp: 0.5 + 0.5 * Math.abs(Math.sin(t * 2)),
      cards,
      hasPop: !!pop,
      pop: pop || {},
      closePop: () => {
        this.sel = null;
        this.notify();
      },
    };
  }
}
