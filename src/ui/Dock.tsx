import { FurnitureIcon } from '../world/FurnitureIcon';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Dock({ rv }: { rv: any }) {
  return (
    <div
      style={{
        position: 'fixed', left: rv.dockX, bottom: 16, transform: `translateX(-50%) scale(${Math.min(1, (window.innerWidth - 24) / 390)})`, transformOrigin: 'bottom center', zIndex: 550, display: 'flex', alignItems: 'stretch', gap: 8,
        padding: 8, background: '#fbfaf5', border: '2.5px solid #15140f', borderRadius: 16, boxShadow: '0 6px 0 rgba(21,20,15,.12)',
        fontFamily: "'JetBrains Mono',monospace", color: '#15140f', userSelect: 'none', touchAction: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
        <button onClick={rv.addMgr} style={{ height: 28, padding: '0 10px', borderRadius: 8, border: '2px solid #15140f', background: '#15140f', color: '#f4f3ee', fontWeight: 800, fontSize: 10, letterSpacing: '.06em', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ MANAGER</button>
        <button onClick={rv.addTeam} style={{ height: 28, padding: '0 10px', borderRadius: 8, border: '2px solid #15140f', background: 'transparent', color: '#15140f', fontWeight: 800, fontSize: 10, letterSpacing: '.06em', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ TEAM</button>
        <div style={{ fontSize: 8.5, fontWeight: 600, color: '#6b6a62', textAlign: 'center', whiteSpace: 'nowrap' }}>under {rv.addTarget}</div>
      </div>
      <div style={{ width: 1.5, background: '#dedcd2', margin: '2px 2px' }} />
      <div style={{ display: 'flex', gap: 4 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {rv.dock.map((dk: any) => (
          <div key={dk.kind} onPointerDown={dk.down} style={{ width: 62, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '5px 2px 4px', borderRadius: 10, cursor: 'grab' }}>
            <FurnitureIcon kind={dk.kind} t={dk.t} />
            <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{dk.short}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
