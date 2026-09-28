// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Manager({ s }: { s: any }) {
  return (
    <div style={{ position: 'absolute', left: s.x, top: s.y, width: 0, height: 0, zIndex: s.z, opacity: s.op }}>
      <div
        data-mgr={s.name || s.id}
        style={{
          position: 'absolute', left: s.haloL, top: s.haloT, width: s.halo, height: s.halo, borderRadius: '50%',
          border: `2px ${s.haloStyle} rgba(21,20,15,${s.haloOp})`, background: s.haloBg, transform: `scale(${s.hs})`, pointerEvents: 'none',
        }}
      />
      <div
        onPointerDown={s.down}
        role="button"
        tabIndex={0}
        aria-label={s.ariaLabel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            s.activate();
          }
        }}
        style={{ position: 'absolute', left: s.bl, top: s.bt, width: s.size, height: s.size, cursor: 'grab', transform: `scale(${s.sc})` }}
      >
        <div style={{ position: 'absolute', left: s.ear1L, top: s.earT, width: s.earW, height: s.earH, background: '#15140f', borderRadius: '5px 5px 0 0', transform: 'rotate(-6deg)' }} />
        <div style={{ position: 'absolute', left: s.ear2L, top: s.earT, width: s.earW, height: s.earH, background: '#15140f', borderRadius: '5px 5px 0 0', transform: 'rotate(6deg)' }} />
        <div style={{ position: 'absolute', inset: 0, background: '#15140f', borderRadius: s.rad, boxShadow: '0 5px 0 rgba(21,20,15,.16)' }} />
        <div style={{ position: 'absolute', left: s.e1L, top: s.eT, width: s.eW, height: s.eH, borderRadius: 2, background: '#f4f3ee' }} />
        <div style={{ position: 'absolute', left: s.e2L, top: s.eT, width: s.eW, height: s.eH, borderRadius: 2, background: '#f4f3ee' }} />
        {s.hasBadge && (
          <div style={{ position: 'absolute', right: -13, top: -11, minWidth: 22, height: 22, padding: '0 5px', borderRadius: 11, background: '#15140f', border: '2.5px solid #f4f3ee', color: '#f4f3ee', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${s.badgeSc})` }}>
            {s.badge}
          </div>
        )}
      </div>
      {/* V3/V6: a background behind the name/role so the reporting line (and anything
          else) never reads as cutting through the text. */}
      <div style={{ position: 'absolute', left: 0, top: s.labT, transform: `translateX(-50%) scale(${s.ls || 1})`, transformOrigin: 'center top', textAlign: 'center', whiteSpace: 'nowrap', pointerEvents: 'none', background: '#f4f3ee', padding: '1px 7px', borderRadius: 5 }}>
        <div style={{ fontWeight: 800, fontSize: s.nameSize, letterSpacing: '.14em' }}>{s.name}</div>
        <div style={{ fontWeight: 600, fontSize: 9.5, letterSpacing: '.1em', color: '#6b6a62', marginTop: 2 }}>{s.role}</div>
      </div>
    </div>
  );
}
