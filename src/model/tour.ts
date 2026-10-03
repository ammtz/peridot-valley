// The guided tour: one short, skippable step each. Add a step here to teach a new tool (the isolation
// chamber and meeting space hook in at the end of this list). `spot` says what the spotlight frames;
// the Tour component measures it live, so nothing here knows pixel positions.
export type TourSpot = 'org' | 'stuck' | 'feed' | 'toolbar' | 'team' | 'manager';

export interface TourStep {
  id: string;
  spot: TourSpot;
  /** The line Vic says. Short: one idea. */
  text: (phone: boolean) => string;
  /** The toolbar should be on screen while this step shows. */
  showDock?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'org',
    spot: 'org',
    text: () => 'Boxes are teams. Circles are supervisors, and each manages the teams and supervisors linked to it. The little squares inside a box are agents. Finished work travels these lines up to me.',
  },
  {
    id: 'fix',
    spot: 'stuck',
    text: () => 'Colour shows how each helper is doing, and red means stuck. One is stuck now; tap it to step in.',
  },
  {
    id: 'logs',
    spot: 'feed',
    text: (phone) => (phone ? 'The log is up here. Every finish, stuck agent and change lands in it, signed by the team that did it.' : 'The log is in the upper right. Every finish, stuck agent and change lands in it, signed by the team that did it.'),
  },
  {
    id: 'toolbar',
    spot: 'toolbar',
    showDock: true,
    text: () => 'The toolbar holds your tools: NOTES, DATA, TOOLS and a RECORDER. Builder mode (key B) must be on to place them. It is off while you just watch.',
  },
  {
    id: 'wire',
    spot: 'team',
    showDock: true,
    text: () => 'In Builder mode, drop a tool inside a team and it belongs to that team only. Outside, it is shared: press its + , then click a team’s plug (on the left or right of the box) to wire it. Agents with a path to a tool can use it.',
  },
  {
    id: 'manages',
    spot: 'manager',
    showDock: true,
    text: () => 'Tap a supervisor to see what it Manages: the teams and supervisors under it. One supervisor can manage up to 5. Renaming, hiring and moving things are Builder mode only.',
  },
  {
    id: 'meeting',
    spot: 'toolbar',
    showDock: true,
    text: () => 'MEETING (a preview): build one outside the teams, wire two teams to it with its +, and add a 2-step agenda. Every card between teams stops at a blind check at the door. A refused card goes back with a reason.',
  },
  {
    id: 'chamber',
    spot: 'toolbar',
    showDock: true,
    text: () => 'CHAMBER (a preview): build it, move a team in, press Detect drives for the sample drive, run its data cable from the port, and pick a purpose when the lamp turns green. That green is simulated: the real checks are not built yet.',
  },
];
