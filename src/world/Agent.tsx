import type React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Agent({ a }: { a: any }) {
  return (
    <div
      onPointerDown={a.down}
      onPointerEnter={a.enter}
      onPointerLeave={a.leave}
      style={{ position: 'absolute', left: a.l, top: a.t, width: 36, height: 36, margin: '-18px 0 0 -18px', cursor: 'grab', opacity: a.op, zIndex: a.z }}
    >
      {a.sel && (
        <div style={{ position: 'absolute', left: 4, top: a.ringT, width: 28, height: 28, borderRadius: 9, border: '2px solid rgba(21,20,15,.4)' }} />
      )}
      {a.working && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: a.dotT, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#15140f', opacity: a.d1 }} />
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#15140f', opacity: a.d2 }} />
        </div>
      )}
      {a.isFlow && (
        <>
          <span style={{ position: 'absolute', left: 2, top: a.sT1, fontSize: 7, lineHeight: 1, color: '#15140f', opacity: a.s1 }}>✦</span>
          <span style={{ position: 'absolute', left: 28, top: a.sT2, fontSize: 6, lineHeight: 1, color: '#15140f', opacity: a.s2 }}>✦</span>
          <span style={{ position: 'absolute', left: 29, top: a.sT3, fontSize: 5, lineHeight: 1, color: '#15140f', opacity: a.s3 }}>✦</span>
        </>
      )}
      {a.isFrus && (
        <span style={{ position: 'absolute', left: 14, top: a.puffT, width: 4, height: 4, borderRadius: '50%', border: '1px solid #15140f', opacity: a.puffO }} />
      )}
      {a.hasAura && (
        <div style={{ position: 'absolute', left: 3, top: 24, width: 30, height: 10, borderRadius: '50%', background: a.mc, opacity: a.auraOp, transform: `scale(${a.auraSc})`, pointerEvents: 'none' }} />
      )}
      <div style={{ position: 'absolute', left: a.bodyL, top: a.bodyT, width: 17, height: 17, borderRadius: 5, background: '#15140f', boxShadow: '0 2px 0 rgba(21,20,15,.16)', transform: `rotate(${a.rot}deg) scale(${a.bsc})` }}>
        <div style={{ position: 'absolute', left: a.e1L, top: a.eT, width: a.eW, height: a.eH, borderRadius: 1, background: '#f4f3ee' }} />
        <div style={{ position: 'absolute', left: a.e2L, top: a.eT, width: a.eW, height: a.eH, borderRadius: 1, background: '#f4f3ee' }} />
        {a.isFrus && (
          <>
            <div style={{ position: 'absolute', left: a.b1L, top: a.browT, width: 4, height: 1.3, background: '#f4f3ee', transform: 'rotate(24deg)' }} />
            <div style={{ position: 'absolute', left: a.b2L, top: a.browT, width: 4, height: 1.3, background: '#f4f3ee', transform: 'rotate(-24deg)' }} />
          </>
        )}
        {a.isOver && (
          <div style={{ position: 'absolute', left: 15, top: a.swT, width: 3.5, height: 3.5, borderRadius: '0 50% 50% 50%', background: '#fbfaf5', border: '1px solid #15140f', transform: 'rotate(45deg)', opacity: a.swO }} />
        )}
      </div>
      {a.showName && (
        <div style={{ position: 'absolute', left: '50%', top: a.nameT, transform: 'translateX(-50%)', fontSize: 7.5, fontWeight: 700, letterSpacing: '.08em', color: '#6b6a62', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {a.name}
        </div>
      )}
      {a.hasIcon && (
        <div style={{ position: 'absolute', left: 18, bottom: a.icB, transform: `translateX(-50%) scale(${a.icSc})`, transformOrigin: '50% 100%', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 17, height: 17, borderRadius: '50%', background: a.mc, border: '1.5px solid #15140f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 800, lineHeight: 1, color: '#15140f', boxShadow: '0 2px 0 rgba(21,20,15,.15)' }}>
            {a.icon}
          </div>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#15140f', marginTop: 1.5 }} />
        </div>
      )}
      {a.hasBubble && (
        <div style={{ position: 'absolute', left: 18, bottom: a.bubB, transform: 'translateX(-50%)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 'max-content', maxWidth: 132, padding: '3px 6px 4px', background: '#fbfaf5', border: '1.5px solid #15140f', borderRadius: 8, fontSize: 7.5, lineHeight: 1.35, fontWeight: 600, color: '#15140f', textAlign: 'center', boxShadow: '0 2px 0 rgba(21,20,15,.1)' }}>
            <span style={{ fontWeight: 800, letterSpacing: '.06em' }}>{a.moodTag}</span> {a.thought}
          </div>
          <span style={{ width: 4, height: 4, borderRadius: '50%', border: '1.2px solid #15140f', background: '#fbfaf5', marginTop: 2 }} />
          <span style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: '#15140f', marginTop: 1 }} />
        </div>
      )}
    </div>
  );
}

export type AgentDown = (e: React.PointerEvent) => void;
