import { Agent } from './Agent';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Room({ r }: { r: any }) {
  return (
    <div data-room={r.name || r.id} style={{ position: 'absolute', left: r.l, top: r.t, width: r.w, height: r.h, transform: `scale(${r.sc})`, opacity: r.op, zIndex: r.z }}>
      {r.ripple && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: 18, border: `2px solid rgba(21,20,15,${r.ro})`, transform: `scale(${r.rs})`, pointerEvents: 'none' }} />
      )}
      <div
        onPointerDown={r.down}
        role="button"
        tabIndex={0}
        aria-label={r.ariaLabel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            r.activate();
          }
        }}
        style={{ position: 'absolute', inset: 0, borderRadius: 16, background: r.bg, border: r.border, boxShadow: r.shadow, cursor: 'grab' }}
      />
      <div style={{ position: 'absolute', inset: 6, borderRadius: 11, border: '1px solid rgba(21,20,15,.08)', pointerEvents: 'none' }} />
      <div onPointerDown={r.down} style={{ position: 'absolute', left: '50%', top: -23, transform: `translateX(-50%) scale(${r.ls || 1})`, transformOrigin: 'center bottom', whiteSpace: 'nowrap', fontWeight: 800, fontSize: 11, letterSpacing: '.1em', background: '#f4f3ee', padding: '1px 6px', cursor: 'grab', color: r.labelColor }}>
        {r.name}
        <span style={{ color: '#6b6a62', fontWeight: 600 }}>{r.meta}</span>
        {r.hasEq && (
          <span style={{ marginLeft: 6, fontSize: 8.5, fontWeight: 800, letterSpacing: '.06em', padding: '1px 4px', borderRadius: 4, background: '#15140f', color: '#f4f3ee' }}>{r.eqTag}</span>
        )}
      </div>
      {r.locked && (
        <div style={{ position: 'absolute', right: -6, top: -13, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px 2px 5px', borderRadius: 6, border: '2px solid #15140f', background: r.paused ? '#e8b923' : '#15140f', color: r.paused ? '#15140f' : '#f4f3ee', fontSize: 7.5, fontWeight: 800, letterSpacing: '.06em', pointerEvents: 'none', zIndex: 5 }}>
          <span style={{ position: 'relative', width: 9, height: 11, display: 'inline-block' }}>
            <span style={{ position: 'absolute', left: 1.5, top: 0, width: 6, height: 6, boxSizing: 'border-box', border: '1.5px solid currentColor', borderBottom: 'none', borderRadius: '3px 3px 0 0' }} />
            <span style={{ position: 'absolute', left: 0, top: 5, width: 9, height: 6, borderRadius: 1.5, background: 'currentColor' }} />
          </span>
          {r.lockText}
        </div>
      )}
      {r.empty && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 600, color: '#6b6a62', letterSpacing: '.04em', pointerEvents: 'none', textAlign: 'center', padding: '0 12px' }}>
          drag agents here
        </div>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: -7, display: 'flex', justifyContent: 'center', gap: 3, pointerEvents: 'none' }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {r.moodDots.map((md: any, i: number) => (
          <span key={i} style={{ width: md.w, height: 6, borderRadius: 3, background: md.c, border: '1.5px solid #15140f' }} />
        ))}
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {r.desks.map((d: any, i: number) => (
        <div key={i} style={{ position: 'absolute', left: d.l, top: d.t, width: 20, height: 5, borderRadius: 2, background: d.c, pointerEvents: 'none' }} />
      ))}
      {/* Wall plugs: one on each side. Subtle at rest; lit and clickable while an item is being wired. */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(r.plugs || []).map((pl: any) => {
        const face = (
          <span style={{ position: 'absolute', left: 13, top: 9, width: 18, height: 26, borderRadius: 6, border: '2px solid #15140f', background: pl.wired ? '#e8b923' : pl.armed ? '#fbfaf5' : pl.used ? '#15140f' : 'rgba(251,250,245,.9)', boxShadow: pl.armed ? '0 0 0 5px rgba(232,185,35,.45)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 2.5, borderRadius: 1, background: pl.used && !pl.wired && !pl.armed ? '#f4f3ee' : '#15140f' }} />
            <span style={{ width: 8, height: 2.5, borderRadius: 1, background: pl.used && !pl.wired && !pl.armed ? '#f4f3ee' : '#15140f' }} />
          </span>
        );
        const box: React.CSSProperties = { position: 'absolute', left: pl.left - 13, top: pl.top - 9, width: 44, height: 44, zIndex: 4 };
        return pl.armed ? (
          <button key={pl.side} aria-label={(pl.wired ? 'Unplug from ' : 'Plug into ') + r.name + (pl.side < 0 ? ' left side' : ' right side')} onPointerDown={(e) => e.stopPropagation()} onClick={pl.go} style={{ ...box, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}>
            {face}
          </button>
        ) : (
          <span key={pl.side} aria-hidden="true" style={{ ...box, pointerEvents: 'none' }}>
            {face}
          </span>
        );
      })}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {r.agents.map((a: any) => (
        <Agent key={a.id} a={a} />
      ))}
    </div>
  );
}
