// Placement rules for facilities that must stand outside team quarters.
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Is the point within `pad` of any rectangle? */
export function insideAny(x: number, y: number, rects: Rect[], pad = 0): boolean {
  for (const r of rects) if (x > r.x0 - pad && x < r.x1 + pad && y > r.y0 - pad && y < r.y1 + pad) return true;
  return false;
}

/**
 * The nearest spot at least `pad` clear of every rectangle. A point that is already legal comes back
 * unchanged. Otherwise it is pushed out through the closest edge, repeating if that lands in a neighbour.
 */
export function legalSpot(x: number, y: number, rects: Rect[], pad = 0): { x: number; y: number; moved: boolean } {
  let px = x,
    py = y,
    moved = false;
  for (let pass = 0; pass < 12; pass++) {
    const r = rects.find((q) => px > q.x0 - pad && px < q.x1 + pad && py > q.y0 - pad && py < q.y1 + pad);
    if (!r) break;
    moved = true;
    const dl = px - (r.x0 - pad),
      dr = r.x1 + pad - px,
      dt = py - (r.y0 - pad),
      db = r.y1 + pad - py;
    const m = Math.min(dl, dr, dt, db);
    if (m === dl) px = r.x0 - pad - 1;
    else if (m === dr) px = r.x1 + pad + 1;
    else if (m === dt) py = r.y0 - pad - 1;
    else py = r.y1 + pad + 1;
  }
  return { x: px, y: py, moved };
}
