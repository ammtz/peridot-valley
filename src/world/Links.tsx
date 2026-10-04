// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Links({ lines, ghosts, pulses, wires }: { lines: any[]; ghosts: any[]; pulses: any[]; wires?: any[] }) {
  return (
    <>
      {wires && wires.length > 0 && (
        <svg width="1" height="1" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
          {wires.map((w) => (
            <g key={w.id}>
              {w.cable ? (
                <>
                  {/* A data cable: thicker than a team wire, with a pale core so it reads as a different class. */}
                  <polyline points={w.pts} fill="none" stroke="#15140f" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
                  <polyline points={w.pts} fill="none" stroke="#fbfaf5" strokeWidth={3} strokeDasharray="1 7" strokeLinejoin="round" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <polyline points={w.pts} fill="none" stroke={w.cut ? '#9a998f' : w.color || '#15140f'} strokeOpacity={w.cut ? 0.9 : w.on ? 0.9 : 0.6} strokeWidth={w.on ? 2.6 : 2} strokeDasharray={w.cut ? '5 5' : undefined} strokeLinejoin="round" strokeLinecap="round" />
                  {w.dot && <circle cx={w.dot[0]} cy={w.dot[1]} r={3} fill={w.cut ? '#9a998f' : w.color || '#15140f'} />}
                </>
              )}
            </g>
          ))}
        </svg>
      )}
      {lines.map((ln, i) => (
        <div
          key={i}
          style={{ position: 'absolute', left: ln.x, top: ln.y, width: ln.w, height: 0, borderTop: `${ln.bw}px ${ln.ls} rgba(21,20,15,${ln.op})`, transform: `rotate(${ln.a}deg)`, transformOrigin: '0 0', pointerEvents: 'none' }}
        />
      ))}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {ghosts.map((g: any) => (
        <div
          key={g.id}
          onPointerDown={g.down}
          style={{ position: 'absolute', left: g.l, top: g.t, width: 130, height: 96, border: '2px dashed rgba(21,20,15,.18)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 300, color: 'rgba(21,20,15,.25)', cursor: 'pointer' }}
        >
          +
        </div>
      ))}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {pulses.map((p: any, i: number) => (
        <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: 10, height: 10, margin: '-5px 0 0 -5px', borderRadius: 5, background: '#15140f', boxShadow: '0 0 0 5px rgba(21,20,15,.1)', pointerEvents: 'none', zIndex: 50 }} />
      ))}
    </>
  );
}
