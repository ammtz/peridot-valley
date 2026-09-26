// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ZoomControls({ rv }: { rv: any }) {
  const btn = { width: 34, height: 34, background: '#fbfaf5', border: '2px solid #15140f', borderRadius: 9, fontWeight: 800, fontSize: 15, color: '#15140f', cursor: 'pointer', boxShadow: '0 3px 0 rgba(21,20,15,.18)' } as const;
  // Phones: pinch zooms, so −/%/+ go away; RESET moves into the "?" sheet. Keep FIT, at a real hit size.
  if (window.innerWidth < 560) {
    return (
      <div style={{ position: 'fixed', left: 16, bottom: rv.ctrlBottom, zIndex: 500 }}>
        <button onClick={rv.fit} aria-label="Fit view" style={{ width: 44, height: 44, background: '#fbfaf5', border: '2px solid #15140f', borderRadius: 12, fontWeight: 800, fontSize: 10.5, letterSpacing: '.06em', color: '#15140f', cursor: 'pointer', boxShadow: '0 3px 0 rgba(21,20,15,.18)', fontFamily: "'JetBrains Mono',monospace" }}>
          FIT
        </button>
      </div>
    );
  }
  return (
    <div style={{ position: 'fixed', left: 18, bottom: rv.ctrlBottom, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono',monospace", zIndex: 500 }}>
      <button onClick={rv.zoomOut} style={btn}>−</button>
      <div style={{ minWidth: 46, textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#15140f' }}>{rv.zoomPct}%</div>
      <button onClick={rv.zoomIn} style={btn}>+</button>
      <button onClick={rv.fit} style={{ height: 34, padding: '0 12px', background: '#fbfaf5', border: '2px solid #15140f', borderRadius: 9, fontWeight: 800, fontSize: 11, letterSpacing: '.06em', color: '#15140f', cursor: 'pointer', boxShadow: '0 3px 0 rgba(21,20,15,.18)' }}>FIT</button>
      <button onClick={rv.resetAsk} style={{ height: 34, padding: '0 12px', background: 'transparent', border: '2px solid rgba(21,20,15,.25)', borderRadius: 9, fontWeight: 700, fontSize: 11, letterSpacing: '.06em', color: '#6b6a62', cursor: 'pointer' }}>RESET</button>
      {rv.resetConfirmOpen && (
        <div style={{ position: 'absolute', left: 0, bottom: 44, width: 220, padding: '12px 14px', background: '#fbfaf5', border: '2.5px solid #15140f', borderRadius: 12, boxShadow: '0 6px 0 rgba(21,20,15,.14)', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>Start over?</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={rv.resetYes} style={{ padding: '7px 10px', borderRadius: 8, border: '2px solid #9a3b2c', background: 'transparent', color: '#9a3b2c', fontWeight: 800, fontSize: 10, letterSpacing: '.05em', cursor: 'pointer' }}>YES, FROM SCRATCH</button>
            <button onClick={rv.resetNo} style={{ padding: '7px 10px', borderRadius: 8, border: '2px solid #15140f', background: 'transparent', color: '#15140f', fontWeight: 800, fontSize: 10, letterSpacing: '.05em', cursor: 'pointer' }}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
}
