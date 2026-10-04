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
import { ControlBar } from './ui/ControlBar';
import { TOUR_STEPS } from './model/tour';

export default function App() {
  const sim = useSim();
  const rv = sim.renderVals();

  // Chrome stays hidden through the opening and the questions; the tour brings
  // the feed in at its first stop. U14: the tour is two stops now (org overview,
  // then the fix) and ends right after, so the dock only ever shows once the
  // tour is over -- tools and the recorder are taught by the "+" sheet's one-time
  // tips instead of a third and fourth tour stop.
  const full = !sim.introOn && !sim.tourOn;
  const showFeed = full || sim.tourOn;
  const showDock = full || (sim.tourOn && !!TOUR_STEPS[sim.tourStep]?.showDock);
  const showZoom = full;
  const showTitle = full || sim.tourOn;
  const phone = window.innerWidth < 560;

  return (
    <>
      <World sim={sim} rv={rv} />
      {showTitle && <TitleBar agentCount={rv.agentCount} mgrCount={rv.mgrCount} rv={rv} />}
      <PhoneMoodSheet rv={rv} />
      {phone && showZoom && <ZoomControls rv={rv} />}
      {phone && showDock && <Dock rv={rv} />}
      {!phone && (showZoom || showDock || full) && <ControlBar rv={rv} showZoom={showZoom} showDock={showDock} showPill={full} />}
      {rv.hasGhost && (
        <div style={{ position: 'fixed', left: rv.ghost.x, top: rv.ghost.y, zIndex: 2000, pointerEvents: 'none', transform: `translate(-24px,-30px) scale(${rv.ghost.sc})`, fontFamily: "'JetBrains Mono',monospace" }}>
          <div style={{ borderRadius: 10, boxShadow: rv.ghost.bad ? '0 0 0 5px rgba(214,60,47,.75)' : rv.ghost.ok ? '0 0 0 5px rgba(58,168,101,.65)' : 'none', background: rv.ghost.bad ? 'rgba(214,60,47,.18)' : rv.ghost.ok ? 'rgba(58,168,101,.14)' : 'transparent' }}>
            <FurnitureIcon kind={rv.ghost.kind} t={rv.ghost.t} />
          </div>
          <div style={{ marginTop: 4, whiteSpace: 'nowrap', fontSize: 10, fontWeight: 800, letterSpacing: '.06em', background: '#15140f', color: '#f4f3ee', padding: '3px 7px', borderRadius: 6 }}>{rv.ghost.label}</div>
        </div>
      )}
      {rv.hasReTag && (
        <div style={{ position: 'fixed', left: rv.reTag.x, top: rv.reTag.y, zIndex: 2000, pointerEvents: 'none', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', background: '#15140f', color: '#f4f3ee', padding: '5px 9px', borderRadius: 7, boxShadow: '0 6px 10px rgba(21,20,15,.2)' }}>
          {rv.reTag.text}
        </div>
      )}
      {rv.wiringName && (
        <div role="status" style={{ position: 'fixed', left: '50%', top: 16, transform: 'translateX(-50%)', zIndex: 700, display: 'flex', alignItems: 'center', gap: 10, background: '#15140f', color: '#f4f3ee', padding: '6px 8px 6px 14px', borderRadius: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, maxWidth: 'calc(100vw - 32px)' }}>
          <span>Click a team's plug to wire {rv.wiringName}. Click a lit one again to unplug.</span>
          <button onClick={rv.cancelWiring} style={{ minHeight: 44, minWidth: 64, borderRadius: 8, border: '2px solid #f4f3ee', background: 'transparent', color: '#f4f3ee', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace" }}>DONE</button>
        </div>
      )}
      {rv.toast && (
        <div role="status" style={{ position: 'fixed', left: '50%', top: 64, transform: 'translateX(-50%)', zIndex: 800, background: '#15140f', color: '#f4f3ee', padding: '9px 16px', borderRadius: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, maxWidth: 'calc(100vw - 32px)', boxShadow: '0 6px 10px rgba(21,20,15,.2)', pointerEvents: 'none' }}>
          {rv.toast}
        </div>
      )}
      {showFeed && <Feed rv={rv} />}
      {phone && full && <NeedsPill rv={rv} />}
      <Popup rv={rv} />
      <Intro sim={sim} />
      <Tour sim={sim} />
    </>
  );
}
