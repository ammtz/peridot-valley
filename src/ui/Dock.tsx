import { useRef, useState } from 'react';
import { FurnitureIcon } from '../world/FurnitureIcon';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DockTile({ dk }: { dk: any }) {
  const [tip, setTip] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  return (
    <div
      onPointerDown={(e) => {
        dk.down(e);
        if (e.pointerType !== 'mouse') timer.current = setTimeout(() => setTip(true), 400);
      }}
      onPointerUp={() => {
        clearTimer();
        setTip(false);
      }}
      onPointerLeave={() => {
        clearTimer();
        setTip(false);
      }}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
      data-dock-kind={dk.kind}
      role="button"
      tabIndex={0}
      aria-label={dk.ariaLabel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dk.activate();
        }
      }}
      style={{ position: 'relative', width: 62, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '5px 2px 4px', borderRadius: 10, cursor: 'grab' }}
    >
      {tip && (
        <div
          style={{
            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8, width: 168, maxWidth: 200, padding: '9px 11px', background: '#fbfaf5',
            border: '2px solid #15140f', borderRadius: 10, boxShadow: '0 4px 0 rgba(21,20,15,.14)', fontSize: 10.5, fontWeight: 600, lineHeight: 1.4, color: '#15140f', zIndex: 700, pointerEvents: 'none',
          }}
        >
          {dk.tip}
        </div>
      )}
      <FurnitureIcon kind={dk.kind} t={dk.t} />
      <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{dk.short}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PhoneAddSheet({ rv }: { rv: any }) {
  if (!rv.phoneAddOpen) return null;
  const tileBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 10, border: '2px solid #15140f',
    background: 'transparent', color: '#15140f', fontWeight: 800, fontSize: 13, letterSpacing: '.06em', cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace",
  };
  return (
    <div
      data-bottom-sheet="true"
      data-phone-add-sheet="true"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, width: '100%', zIndex: 1000, background: '#fbfaf5', border: '2.5px solid #15140f', borderBottom: 'none',
        borderRadius: '18px 18px 0 0', boxShadow: '0 -6px 0 rgba(21,20,15,.12)', fontFamily: "'JetBrains Mono',monospace", color: '#15140f',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: '2px solid #15140f' }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '.1em' }}>ADD · under {rv.addTarget}</div>
        <button onClick={rv.closePhoneAdd} aria-label="Close" style={{ width: 44, height: 44, border: '2px solid #15140f', borderRadius: 10, background: 'transparent', fontWeight: 800, fontSize: 15, color: '#15140f', cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
        <button style={{ ...tileBtn, background: '#15140f', color: '#f4f3ee' }} onClick={() => { rv.addMgr(); rv.closePhoneAdd(); }}>+ MANAGER</button>
        <button style={tileBtn} onClick={() => { rv.addTeam(); rv.closePhoneAdd(); }}>+ TEAM</button>
        <div style={{ height: 1.5, background: '#dedcd2', margin: '6px 0' }} />
        {/* U14: the tour no longer teaches tools, so the first sheet-open explains them here. */}
        {rv.showAddSheetToolsTip && (
          <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.4, color: '#6b6a62', padding: '0 2px 4px' }}>
            Tap a tool to drop it near the team it should help.
          </div>
        )}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {rv.dock.map((dk: any) => (
          <div key={dk.kind}>
            <button style={tileBtn} onClick={() => rv.placeFromSheet(dk.kind)}>
              <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '.06em' }}>{dk.short}</span>
            </button>
            {dk.kind === 'rec' && rv.showAddSheetRecorderTip && (
              <div style={{ fontSize: 10.5, fontWeight: 600, lineHeight: 1.4, color: '#6b6a62', padding: '5px 2px 0' }}>{dk.tip}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Dock({ rv }: { rv: any }) {
  if (window.innerWidth < 560) {
    return (
      <>
        <button
          id="phone-add-btn"
          onClick={rv.openPhoneAdd}
          aria-label="Add manager, team, or tool"
          style={{
            position: 'fixed', right: 16, bottom: rv.ctrlBottom, width: 56, height: 56, borderRadius: 18, background: '#15140f', color: '#f4f3ee',
            border: '2.5px solid #15140f', fontWeight: 800, fontSize: 26, lineHeight: 1, cursor: 'pointer', boxShadow: '0 6px 0 rgba(21,20,15,.18)', zIndex: 550,
          }}
        >
          +
        </button>
        <PhoneAddSheet rv={rv} />
      </>
    );
  }
  return (
    <div
      id="dock-panel"
      style={{
        position: 'fixed', left: rv.dockX, bottom: 16, transform: `translateX(-50%) scale(${Math.min(1, (window.innerWidth - 24) / 390)})`, transformOrigin: 'bottom center', zIndex: 550, display: 'flex', alignItems: 'stretch', gap: 8,
        padding: 8, background: '#fbfaf5', border: '2.5px solid #15140f', borderRadius: 16, boxShadow: '0 6px 0 rgba(21,20,15,.12)',
        fontFamily: "'JetBrains Mono',monospace", color: '#15140f', userSelect: 'none', touchAction: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
        <button onClick={rv.addMgr} style={{ minHeight: 44, padding: '0 12px', borderRadius: 8, border: '2px solid #15140f', background: '#15140f', color: '#f4f3ee', fontWeight: 800, fontSize: 13, letterSpacing: '.06em', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ MANAGER</button>
        <button onClick={rv.addTeam} style={{ minHeight: 44, padding: '0 12px', borderRadius: 8, border: '2px solid #15140f', background: 'transparent', color: '#15140f', fontWeight: 800, fontSize: 13, letterSpacing: '.06em', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ TEAM</button>
        <div style={{ fontSize: 8.5, fontWeight: 600, color: '#6b6a62', textAlign: 'center', whiteSpace: 'nowrap' }}>under {rv.addTarget}</div>
      </div>
      <div style={{ width: 1.5, background: '#dedcd2', margin: '2px 2px' }} />
      <div style={{ display: 'flex', gap: 4 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {rv.dock.map((dk: any) => (
          <DockTile key={dk.kind} dk={dk} />
        ))}
      </div>
    </div>
  );
}
