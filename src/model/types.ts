export type FurnKind = 'mcp' | 'db' | 'books' | 'rec';
export type TeamState = 'active' | 'pending' | 'hidden';
export type Mood = 'working' | 'flow' | 'overwhelmed' | 'bored' | 'frustrated' | 'stalled' | 'pending';
export type NodeKind = 'agent' | 'team' | 'sup' | 'furn';

export interface Manager {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  size: number;
  boss: string | null;
  born?: number | null;
  recv?: number | null;
}

export interface Team {
  id: string;
  name: string;
  boss: string;
  x: number;
  y: number;
  state: TeamState;
  pool: string[];
  pi: number;
  born?: number | null;
  fireAt?: number | null;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  team: string;
  doing: string | null;
  backlog: string[];
  done: string[];
  blocked: { text: string; fix: string } | null;
  fear: string | null;
  flowUntil?: number;
  recent?: number[];
  flowSeed?: boolean;
}

export interface Furniture {
  id: string;
  type: FurnKind;
  x: number;
  y: number;
  on: boolean[];
  born?: number | null;
  lastAnn?: string;
  lastRecapT?: number | null;
  lastRecapText?: string;
}

export interface Need {
  id: string;
  team: string;
  text: string;
  acts: [string, string][];
  ok?: string;
  agent?: string;
  kind?: 'blocked' | 'fear';
}

export type FeedKind = 'DONE' | 'MOVED' | 'ORG' | 'EQUIP' | 'LIVE' | 'YOU' | 'STUCK' | 'ASKS' | 'RECAP' | 'HANDLED';

export interface FeedCard {
  id: string;
  kind: FeedKind;
  path: string;
  who: string;
  text: string;
  ts: number;
}

export interface WorldModel {
  v: number;
  sups: Record<string, Manager>;
  teams: Team[];
  agents: Agent[];
  furn: Furniture[];
  needs: Need[];
  feed: FeedCard[];
  onboarded?: boolean;
  storyDone?: boolean;
}

export interface Sel {
  kind: NodeKind;
  id: string;
}

export interface Settings {
  simSpeed: 'slow' | 'normal' | 'fast';
  alwaysShowNames: boolean;
  thoughts: 'icons' | 'always' | 'off';
}
