// The agent's body: a pear (narrow head, round belly) on two feet. Drawn in a 17x17 box that
// matches the old square, so every position in sim.ts still lines up. Shapes come from the
// Peridot Valley design system (Agent component); feet hang 0.4px below the box on purpose.
const INK = '#15140f';

/** Front view: narrow head, belly flaring out toward the feet. */
const FRONT = 'M17.5 13H22.5Q26 13 26.6 16.5L28.4 23.6Q28.9 28.2 24 28.2H16Q11.1 28.2 11.6 23.6L13.4 16.5Q14 13 17.5 13Z';
/** Side view (facing right): the belly leads. */
const SIDE = 'M17.2 13H22C24.6 13 25.4 14.6 25.7 16.6C28.6 18 29.2 21.5 28.9 24C28.6 27 26.6 28.3 24.2 28.3H16C13 28.3 12.4 26.6 12.4 24.4C12.4 21.2 13 18.6 13.6 16.4C14.1 14.2 15 13 17.2 13Z';
const VIEWBOX = '11.5 13 17 17';

export function PearBody({ size = 17, fill = INK }: { size?: number; fill?: string }) {
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} aria-hidden="true">
      <rect x={15} y={27.6} width={3.4} height={2.8} rx={1.3} fill={fill} />
      <rect x={21.6} y={27.6} width={3.4} height={2.8} rx={1.3} fill={fill} />
      <path d={FRONT} fill={fill} />
    </svg>
  );
}

/**
 * Side view for walking: a fat-duck waddle. `sway` rocks the body foot to foot (deg), `lag`
 * swings the belly a beat late (skew, deg), `f1`/`f2` are the two feet's [dx, dy] steps.
 */
export function SideBody({ fill = INK, sway, lag, f1, f2, eyeH }: { fill?: string; sway: number; lag: number; f1: [number, number]; f2: [number, number]; eyeH: number }) {
  return (
    <svg viewBox={VIEWBOX} width={17} height={17} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} aria-hidden="true">
      <rect x={16} y={27.4} width={3.6} height={2.9} rx={1.3} fill={fill} transform={`translate(${f1[0]} ${f1[1]})`} />
      <rect x={21} y={27.4} width={3.6} height={2.9} rx={1.3} fill={fill} transform={`translate(${f2[0]} ${f2[1]})`} />
      <g transform={`rotate(${sway} 20 30)`}>
        <g transform={`translate(20 14) skewX(${lag}) translate(-20 -14)`}>
          <path d={SIDE} fill={fill} />
        </g>
        <rect x={22.4} y={17.4 + (4.2 - eyeH) / 2} width={3} height={eyeH} rx={1} fill="#f4f3ee" />
      </g>
    </svg>
  );
}
