const DOTS: [string, string][] = [
  ['#3aa865', 'FLOW'],
  ['#ee7a2f', 'SWAMPED'],
  ['#e8b923', 'UNSURE'],
  ['#d63c2f', 'STUCK'],
  ['#a9b4c4', 'BORED'],
];

export function TitleBar({ agentCount, mgrCount }: { agentCount: number; mgrCount: number }) {
  // Phones: let the stats wrap under the title, keep clear of the feed pill, drop the hint.
  const narrow = window.innerWidth < 560;
  return (
    <div style={{ position: 'fixed', left: 22, top: 20, display: 'flex', flexDirection: 'column', gap: 6, fontFamily: "'JetBrains Mono',monospace", pointerEvents: 'none', zIndex: 500 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', maxWidth: narrow ? 'calc(100vw - 100px)' : undefined }}>
        <span style={{ width: 11, height: 11, background: '#15140f', borderRadius: 3 }} />
        <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: '.16em', color: '#15140f' }}>PERIDOT VALLEY</span>
        <span style={{ fontWeight: 500, fontSize: 11, letterSpacing: '.04em', color: '#6b6a62', borderLeft: '1px solid #dedcd2', paddingLeft: 9 }}>
          live · {agentCount} agents · {mgrCount} managers
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', maxWidth: 'calc(100vw - 44px)', fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', color: '#6b6a62' }}>
        {DOTS.map(([c, label]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #15140f', background: c }} />
            {label}
          </span>
        ))}
      </div>
      {!narrow && <div style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: '.02em', color: '#9a988f' }}>
        drag anything · drop a team or manager on a manager to re-org · tap to open
      </div>}
    </div>
  );
}
