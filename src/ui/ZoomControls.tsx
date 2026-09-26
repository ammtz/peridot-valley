// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ZoomControls({ rv }: { rv: any }) {
  const btn = { width: 34, height: 34, background: '#fbfaf5', border: '2px solid #15140f', borderRadius: 9, fontWeight: 800, fontSize: 15, color: '#15140f', cursor: 'pointer', boxShadow: '0 3px 0 rgba(21,20,15,.18)' } as const;
  return (
    <div style={{ position: 'fixed', left: 18, bottom: rv.ctrlBottom, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono',monospace", zIndex: 500 }}>
      <button onClick={rv.zoomOut} style={btn}>−</button>
      <div style={{ minWidth: 46, textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#15140f' }}>{rv.zoomPct}%</div>
      <button onClick={rv.zoomIn} style={btn}>+</button>
      <button onClick={rv.fit} style={{ height: 34, padding: '0 12px', background: '#fbfaf5', border: '2px solid #15140f', borderRadius: 9, fontWeight: 800, fontSize: 11, letterSpacing: '.06em', color: '#15140f', cursor: 'pointer', boxShadow: '0 3px 0 rgba(21,20,15,.18)' }}>FIT</button>
      <button onClick={rv.reset} style={{ height: 34, padding: '0 12px', background: 'transparent', border: '2px solid rgba(21,20,15,.25)', borderRadius: 9, fontWeight: 700, fontSize: 11, letterSpacing: '.06em', color: '#6b6a62', cursor: 'pointer' }}>RESET</button>
    </div>
  );
}
