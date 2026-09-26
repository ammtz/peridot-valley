import { useSim } from './store';
import { World } from './world/World';
import { FurnitureIcon } from './world/FurnitureIcon';
import { TitleBar, PhoneMoodSheet } from './ui/TitleBar';
import { ZoomControls } from './ui/ZoomControls';
import { Dock } from './ui/Dock';
import { Feed } from './ui/Feed';
import { Popup } from './ui/Popup';
import { Intro } from './ui/Intro';
import { Tour } from './ui/Tour';
import { NeedsPill } from './ui/NeedsPill';

export default function App() {
  const sim = useSim();
  const rv = sim.renderVals();

  // Chrome stays hidden through the opening and the questions; the tour brings
  // the feed in at its first stop and the dock + zoom controls at its third.
  const full = !sim.introOn && !sim.tourOn;
  const showFeed = full || (sim.tourOn && sim.tourStep >= 0);
  const showDock = full || (sim.tourOn && sim.tourStep >= 2);
  const showZoom = full;
  const showTitle = full || sim.tourOn;

  return (
    <>
      <World sim={sim} rv={rv} />
      {showTitle && <TitleBar agentCount={rv.agentCount} mgrCount={rv.mgrCount} rv={rv} />}
      <PhoneMoodSheet rv={rv} />
      {showZoom && <ZoomControls rv={rv} />}
      {showDock && <Dock rv={rv} />}
      {rv.hasGhost && (
        <div style={{ position: 'fixed', left: rv.ghost.x, top: rv.ghost.y, zIndex: 2000, pointerEvents: 'none', transform: `translate(-24px,-30px) scale(${rv.ghost.sc})`, fontFamily: "'JetBrains Mono',monospace" }}>
          <FurnitureIcon kind={rv.ghost.kind} t={rv.ghost.t} />
          <div style={{ marginTop: 4, whiteSpace: 'nowrap', fontSize: 10, fontWeight: 800, letterSpacing: '.06em', background: '#15140f', color: '#f4f3ee', padding: '3px 7px', borderRadius: 6 }}>{rv.ghost.label}</div>
        </div>
      )}
      {rv.hasReTag && (
        <div style={{ position: 'fixed', left: rv.reTag.x, top: rv.reTag.y, zIndex: 2000, pointerEvents: 'none', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', background: '#15140f', color: '#f4f3ee', padding: '5px 9px', borderRadius: 7, boxShadow: '0 6px 10px rgba(21,20,15,.2)' }}>
          {rv.reTag.text}
        </div>
      )}
      {showFeed && <Feed rv={rv} />}
      {full && <NeedsPill rv={rv} />}
      <Popup rv={rv} />
      <Intro sim={sim} />
      <Tour sim={sim} />
    </>
  );
}
