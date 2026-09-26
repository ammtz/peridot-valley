import { useSim } from './store';
import { World } from './world/World';
import { FurnitureIcon } from './world/FurnitureIcon';
import { TitleBar } from './ui/TitleBar';
import { ZoomControls } from './ui/ZoomControls';
import { Dock } from './ui/Dock';
import { Feed } from './ui/Feed';
import { Popup } from './ui/Popup';

export default function App() {
  const sim = useSim();
  const rv = sim.renderVals();

  return (
    <>
      <World sim={sim} rv={rv} />
      <TitleBar agentCount={rv.agentCount} mgrCount={rv.mgrCount} />
      <ZoomControls rv={rv} />
      <Dock rv={rv} />
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
      <Feed rv={rv} />
      <Popup rv={rv} />
    </>
  );
}
