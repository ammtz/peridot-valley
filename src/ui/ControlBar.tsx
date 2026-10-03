import { ZoomControls } from './ZoomControls';
import { NeedsPill } from './NeedsPill';
import { Dock } from './Dock';

// Desktop and tablet (>= 560 px). One bar along the bottom of the world area, left of the
// feed: zoom on the left, the "needs you" pill in the true centre, the dock on the right.
// They are grid siblings, so they can never overlap each other; each side sheds buttons
// before it would crowd the pill (2026-09-27, after the dock covered the pill and zoom).
// Measured widths (px) at 1440x900, plus a little slack.
const PILL = 240;
const DOCK_FULL = 600;
const ZOOM_FULL = 305;
const ZOOM_FITRESET = 175;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ControlBar({ rv, showDock, showZoom, showPill }: { rv: any; showDock: boolean; showZoom: boolean; showPill: boolean }) {
  const right = rv.feedW ? rv.feedW + 16 : 16;
  const bar = window.innerWidth - 16 - right;
  const side = (bar - PILL) / 2 - 12;
  const dockCompact = side < DOCK_FULL;
  const zoomMode = side >= ZOOM_FULL ? 'full' : side >= ZOOM_FITRESET ? 'fitreset' : 'fit';
  return (
    <div
      data-control-bar="true"
      style={{
        position: 'fixed', left: 16, right, bottom: 16, zIndex: 550, pointerEvents: 'none',
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'end', gap: 12,
      }}
    >
      <div style={{ justifySelf: 'start' }}>{showZoom && <ZoomControls rv={rv} mode={zoomMode} />}</div>
      <div style={{ justifySelf: 'center' }}>{showPill && <NeedsPill rv={rv} inline />}</div>
      <div style={{ justifySelf: 'end' }}>{showDock && <Dock rv={rv} compact={dockCompact} />}</div>
    </div>
  );
}
