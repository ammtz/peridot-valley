// Wire routing: orthogonal paths from a placed item to a team's wall plug, kept out of other teams' boxes.
export type Pt = [number, number];
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Does the axis-aligned segment a-b pass through the box? */
export function segHits(a: Pt, b: Pt, r: Box): boolean {
  const x0 = Math.min(a[0], b[0]),
    x1 = Math.max(a[0], b[0]),
    y0 = Math.min(a[1], b[1]),
    y1 = Math.max(a[1], b[1]);
  return x1 > r.x0 && x0 < r.x1 && y1 > r.y0 && y0 < r.y1;
}

const clear = (pts: Pt[], boxes: Box[]) => {
  for (let i = 0; i < pts.length - 1; i++) for (const r of boxes) if (segHits(pts[i], pts[i + 1], r)) return false;
  return true;
};
const len = (pts: Pt[]) => pts.reduce((s, p, i) => (i ? s + Math.abs(p[0] - pts[i - 1][0]) + Math.abs(p[1] - pts[i - 1][1]) : 0), 0);

/**
 * From item `from` to plug `plug` on the left (side -1) or right (+1) of a team box. The wire always
 * leaves the plug horizontally outward, then takes the shortest right-angled path that crosses no box.
 * `boxes` should already include the padding to keep wires off the walls.
 */
export function routeWire(from: Pt, plug: Pt, side: -1 | 1, boxes: Box[]): Pt[] {
  const A: Pt = [plug[0] + side * 22, plug[1]];
  const cands: Pt[][] = [
    [from, [A[0], from[1]], A, plug],
    [from, [from[0], A[1]], A, plug],
  ];
  for (let k = 1; k <= 8; k++)
    for (const sgn of [-1, 1]) {
      const yl = from[1] + sgn * k * 36,
        ya = A[1] + sgn * k * 36,
        xl = from[0] + sgn * k * 36;
      cands.push([from, [from[0], yl], [A[0], yl], A, plug]);
      cands.push([from, [from[0], ya], [A[0], ya], A, plug]);
      cands.push([from, [xl, from[1]], [xl, A[1]], A, plug]);
    }
  const ok = cands.filter((c) => clear(c.slice(0, -1), boxes));
  if (!ok.length) return cands[0];
  return ok.reduce((best, c) => (len(c) < len(best) ? c : best));
}
