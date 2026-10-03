const DOTS: [string, string][] = [
  ['#3aa865', 'FLOW'],
  ['#ee7a2f', 'SWAMPED'],
  ['#e8b923', 'UNSURE'],
  ['#d63c2f', 'STUCK'],
  ['#a9b4c4', 'BORED'],
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TitleBar({ agentCount, mgrCount, rv }: { agentCount: number; mgrCount: number; rv: any }) {
  // Phones: the chrome recedes (U2) — no stat line, the legend collapses into a "?" chip.
  const narrow = window.innerWidth < 560;
  if (narrow) {
    return (
      <div style={{ position: 'fixed', left: 16, top: 16, display: 'flex', alignItems: 'center', gap: 9, fontFamily: "'JetBrains Mono',monospace", zIndex: 500 }}>
        <span style={{ width: 11, height: 11, background: '#15140f', borderRadius: 3, pointerEvents: 'none' }} />
        <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: window.innerWidth < 400 ? '.08em' : '.16em', color: '#15140f', pointerEvents: 'none' }}>PERIDOT VALLEY</span>
        <button
          onClick={rv.openPhoneMood}
          aria-label="Legend and reset"
          style={{
            width: 44, height: 44, marginLeft: 2, borderRadius: 12, border: '2px solid #15140f', background: '#fbfaf5', color: '#15140f',
            fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 3px 0 rgba(21,20,15,.15)', flex: 'none',
          }}
        >
          ?
        </button>
      </div>
    );
  }
  return (
    <div style={{ position: 'fixed', left: 22, top: 20, display: 'flex', flexDirection: 'column', gap: 6, fontFamily: "'JetBrains Mono',monospace", pointerEvents: 'none', zIndex: 500 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <span style={{ width: 11, height: 11, background: '#15140f', borderRadius: 3 }} />
        <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: '.16em', color: '#15140f' }}>PERIDOT VALLEY</span>
        <span style={{ fontWeight: 500, fontSize: 11, letterSpacing: '.04em', color: '#6b6a62', borderLeft: '1px solid #dedcd2', paddingLeft: 9 }}>
          live · {agentCount} {agentCount === 1 ? 'agent' : 'agents'} · {mgrCount} {mgrCount === 1 ? 'manager' : 'managers'}
        </span>
        {rv.liveTicker && (
          <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '.04em', color: '#2f7d4f', borderLeft: '1px solid #dedcd2', paddingLeft: 9 }}>
            {rv.liveTicker}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', maxWidth: 'calc(100vw - 44px)', fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', color: '#6b6a62' }}>
        {DOTS.map(([c, label]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #15140f', background: c }} />
            {label}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: '.02em', color: '#6b6a62' }}>
        {rv.builder ? 'builder mode · drag to re-org, drop tools in, press + to wire · B to leave' : 'tap anything to open · press B for builder mode'}
      </div>
    </div>
  );
}

export function PhoneMoodSheet({ rv }: { rv: any }) {
  if (!rv.phoneMoodOpen) return null;
  return (
    <div
      data-bottom-sheet="true"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, width: '100%', zIndex: 1000, background: '#fbfaf5', border: '2.5px solid #15140f', borderBottom: 'none',
        borderRadius: '18px 18px 0 0', boxShadow: '0 -6px 0 rgba(21,20,15,.12)', fontFamily: "'JetBrains Mono',monospace", color: '#15140f',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: '2px solid #15140f' }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '.1em' }}>MOODS</div>
        <button onClick={rv.closePhoneMood} aria-label="Close" style={{ width: 44, height: 44, border: '2px solid #15140f', borderRadius: 10, background: 'transparent', fontWeight: 800, fontSize: 15, color: '#15140f', cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px' }}>
        {DOTS.map(([c, label]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, letterSpacing: '.06em' }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #15140f', background: c }} />
            {label}
          </span>
        ))}
      </div>
      <div style={{ padding: '4px 16px 20px' }}>
        <button
          onClick={rv.resetAsk}
          style={{ width: '100%', minHeight: 44, padding: '0 14px', border: '2px solid rgba(21,20,15,.35)', borderRadius: 10, background: 'transparent', color: '#6b6a62', fontWeight: 800, fontSize: 12.5, letterSpacing: '.06em', cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace" }}
        >
          START OVER
        </button>
        {rv.resetConfirmOpen && (
          <div style={{ marginTop: 12, padding: '12px 14px', border: '2.5px solid #15140f', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>Start over?</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={rv.resetYes} style={{ minHeight: 44, padding: '0 12px', borderRadius: 8, border: '2px solid #9a3b2c', background: 'transparent', color: '#9a3b2c', fontWeight: 800, fontSize: 11, letterSpacing: '.05em', cursor: 'pointer' }}>YES, FROM SCRATCH</button>
              <button onClick={rv.resetNo} style={{ minHeight: 44, padding: '0 12px', borderRadius: 8, border: '2px solid #15140f', background: 'transparent', color: '#15140f', fontWeight: 800, fontSize: 11, letterSpacing: '.05em', cursor: 'pointer' }}>CANCEL</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
