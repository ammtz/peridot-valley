import { Agent } from './Agent';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Room({ r }: { r: any }) {
  return (
    <div style={{ position: 'absolute', left: r.l, top: r.t, width: r.w, height: r.h, transform: `scale(${r.sc})`, opacity: r.op, zIndex: r.z }}>
      {r.ripple && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: 18, border: `2px solid rgba(21,20,15,${r.ro})`, transform: `scale(${r.rs})`, pointerEvents: 'none' }} />
      )}
      <div onPointerDown={r.down} style={{ position: 'absolute', inset: 0, borderRadius: 16, background: r.bg, border: r.border, boxShadow: r.shadow, cursor: 'grab' }} />
      <div style={{ position: 'absolute', inset: 6, borderRadius: 11, border: '1px solid rgba(21,20,15,.08)', pointerEvents: 'none' }} />
      <div onPointerDown={r.down} style={{ position: 'absolute', left: '50%', top: -23, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontWeight: 800, fontSize: 11, letterSpacing: '.1em', background: '#f4f3ee', padding: '1px 6px', cursor: 'grab', color: r.labelColor }}>
        {r.name}
        <span style={{ color: '#6b6a62', fontWeight: 600 }}>{r.meta}</span>
        {r.hasEq && (
          <span style={{ marginLeft: 6, fontSize: 8.5, fontWeight: 800, letterSpacing: '.06em', padding: '1px 4px', borderRadius: 4, background: '#15140f', color: '#f4f3ee' }}>{r.eqTag}</span>
        )}
      </div>
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
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {r.agents.map((a: any) => (
        <Agent key={a.id} a={a} />
      ))}
    </div>
  );
}
