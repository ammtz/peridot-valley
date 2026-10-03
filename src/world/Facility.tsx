// The chamber, the sample drive and the meeting space, drawn from the sim's per-frame view data (fu.fv).
// Everything shown here (lamp colour, ticks, crosses, who waits) was read from the event fold.
const INK = '#15140f';
const PAPER = '#fbfaf5';

/* eslint-disable @typescript-eslint/no-explicit-any */
const STRIPE_GREEN = 'repeating-linear-gradient(45deg,#3aa865 0 3px,#fbfaf5 3px 6px)';

function Chamber({ fu }: { fu: any }) {
  const v = fu.fv;
  const lamp = v ? v.lampColor : '#d63c2f';
  return (
    <>
      <div style={{ position: 'absolute', left: -46, top: -39, width: 92, height: 8, background: INK, borderRadius: 2, pointerEvents: 'none' }} />
      <div
        onPointerDown={fu.down}
        style={{
          position: 'absolute', left: -42, top: -32, width: 84, height: 64, boxSizing: 'border-box', border: `4px solid ${INK}`, borderRadius: 4, cursor: 'grab',
          background: 'repeating-linear-gradient(45deg,#d4d1c3 0 6px,#dedbce 6px 12px)',
          boxShadow: fu.bad ? '0 0 0 6px rgba(214,60,47,.7)' : fu.hot ? '0 0 0 6px rgba(232,185,35,.7)' : '0 5px 0 rgba(21,20,15,.18)',
        }}
      />
      <div
        style={{
          position: 'absolute', left: -8, top: -24, width: 16, height: 16, borderRadius: '50%', border: `2.5px solid ${INK}`, boxSizing: 'border-box', pointerEvents: 'none',
          background: v && v.striped ? STRIPE_GREEN : lamp, opacity: v ? v.lampOp : 1,
          boxShadow: v && v.lamp !== 'red' ? `0 0 8px ${lamp}` : 'none',
        }}
      />
      {v && v.cap && (
        <div style={{ position: 'absolute', left: -30, top: -7, width: 60, textAlign: 'center', fontSize: 7, fontWeight: 800, letterSpacing: '.04em', color: INK, pointerEvents: 'none' }}>{v.cap}</div>
      )}
      {/* the heavy door */}
      <div style={{ position: 'absolute', left: -12, top: 2, width: 24, height: 30, background: '#3a382f', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: -12, top: 2, width: v ? 24 * (1 - v.door * 0.82) : 24, height: 30, background: INK, border: `2px solid ${INK}`, boxSizing: 'border-box', pointerEvents: 'none' }}>
        <span style={{ position: 'absolute', left: 3, top: 4, width: 3, height: 3, borderRadius: '50%', background: '#8d8c85' }} />
        <span style={{ position: 'absolute', left: 3, top: 20, width: 3, height: 3, borderRadius: '50%', background: '#8d8c85' }} />
        <span style={{ position: 'absolute', right: 2, top: 12, width: 3, height: 7, background: '#e8b923' }} />
      </div>
      {/* the data port, on the right wall */}
      <div style={{ position: 'absolute', left: 40, top: 1, width: 11, height: 16, boxSizing: 'border-box', border: `2.5px solid ${INK}`, borderRadius: 3, background: fu.wiringThis ? '#e8b923' : PAPER, pointerEvents: 'none' }}>
        <span style={{ position: 'absolute', left: 2, top: 4, width: 4, height: 4, background: INK }} />
      </div>
      {v && v.teamsIn > 0 && <div style={{ position: 'absolute', left: -38, top: 18, fontSize: 8, fontWeight: 800, color: INK, pointerEvents: 'none' }}>{v.teamsIn} in</div>}
    </>
  );
}

function Drive({ fu }: { fu: any }) {
  return (
    <>
      <div style={{ position: 'absolute', left: -33, top: -4, width: 9, height: 8, background: INK, borderRadius: 1, pointerEvents: 'none' }} />
      <div
        onPointerDown={fu.down}
        style={{
          position: 'absolute', left: -26, top: -10, width: 52, height: 20, boxSizing: 'border-box', border: `2.5px solid ${INK}`, borderRadius: 4, cursor: fu.armedDrive ? 'pointer' : 'grab',
          background: 'repeating-linear-gradient(45deg,#e8b923 0 6px,#fbfaf5 6px 12px)',
          boxShadow: fu.armedDrive ? '0 0 0 6px rgba(232,185,35,.55)' : '0 3px 0 rgba(21,20,15,.15)',
        }}
      />
    </>
  );
}

function Meeting({ fu }: { fu: any }) {
  const v = fu.fv;
  return (
    <>
      {/* the roof */}
      <div
        style={{
          position: 'absolute', left: -66, top: -66, width: 132, height: 132, borderRadius: '50%', boxSizing: 'border-box', border: `3px solid ${INK}`, pointerEvents: 'none',
          background: 'repeating-conic-gradient(rgba(176,146,98,.34) 0deg 15deg, rgba(228,210,178,.3) 15deg 30deg)',
          boxShadow: fu.bad ? '0 0 0 6px rgba(214,60,47,.7)' : 'none',
        }}
      />
      {v && v.seats.map((s: any) => (
        <div key={'d' + s.id} style={{ position: 'absolute', left: s.dx - 8, top: s.dy - 4, width: 16, height: 8, background: s.color, border: `2px solid ${INK}`, boxSizing: 'border-box', borderRadius: 2, transform: `rotate(${Math.atan2(s.dy, s.dx) * 57.3 + 90}deg)`, pointerEvents: 'none' }} />
      ))}
      {/* the round table */}
      <div onPointerDown={fu.down} style={{ position: 'absolute', left: -31, top: -31, width: 62, height: 62, borderRadius: '50%', boxSizing: 'border-box', border: `3px solid ${INK}`, background: PAPER, cursor: 'grab', boxShadow: '0 4px 0 rgba(21,20,15,.15)' }} />
      <div style={{ position: 'absolute', left: -24, top: -24, width: 48, height: 48, borderRadius: '50%', boxSizing: 'border-box', border: '1.5px solid rgba(21,20,15,.2)', pointerEvents: 'none' }} />
      {/* the blind verifier: faceless, blindfolded, with a clipboard */}
      <div style={{ position: 'absolute', left: -7, top: -15, width: 14, height: 20, borderRadius: 6, background: '#8d8c85', border: `2px solid ${INK}`, boxSizing: 'border-box', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: -5, top: -23, width: 10, height: 10, borderRadius: '50%', background: '#b4b3aa', border: `2px solid ${INK}`, boxSizing: 'border-box', pointerEvents: 'none' }}>
        <span style={{ position: 'absolute', left: -2, top: 2, width: 10, height: 3, background: INK }} />
      </div>
      <div style={{ position: 'absolute', left: 7, top: -9, width: 7, height: 10, background: '#d7b97a', border: `1.5px solid ${INK}`, boxSizing: 'border-box', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: -28, top: 7, width: 56, textAlign: 'center', fontSize: 6.5, fontWeight: 800, lineHeight: 1.15, color: INK, pointerEvents: 'none' }}>Blind check<br />(simulated)</div>
      {v && v.mark && (
        <div style={{ position: 'absolute', left: 8, top: -30, fontSize: 15, fontWeight: 800, color: v.mark.ok ? '#3aa865' : '#d63c2f', opacity: v.mark.op, pointerEvents: 'none', zIndex: 4 }}>{v.mark.ok ? '✓' : '✗'}</div>
      )}
      {v && v.seats.map((s: any) => (
        <div key={'s' + s.id} style={{ position: 'absolute', left: s.x, top: s.y, width: 0, height: 0, pointerEvents: 'none', zIndex: 3 }}>
          <div style={{ position: 'absolute', left: -7, top: -7 + s.bob, width: 14, height: 14, borderRadius: 4, background: INK, boxShadow: `0 0 0 2.5px ${s.color}` }}>
            <span style={{ position: 'absolute', left: 3, top: 5, width: 2.5, height: 3.5, background: '#f4f3ee', borderRadius: 1 }} />
            <span style={{ position: 'absolute', left: 8.5, top: 5, width: 2.5, height: 3.5, background: '#f4f3ee', borderRadius: 1 }} />
          </div>
          {s.bubble && (
            <div style={{ position: 'absolute', left: 0, top: -26, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: 7.5, fontWeight: 800, background: INK, color: '#f4f3ee', padding: '2px 5px', borderRadius: 5 }}>{s.bubble}</div>
          )}
        </div>
      ))}
      {v && v.cards.map((c: any) => (
        <div key={'c' + c.id} style={{ position: 'absolute', left: c.x - 7, top: c.y - 5, width: 14, height: 10, borderRadius: 2, boxSizing: 'border-box', border: `2px solid ${c.flash ? '#d63c2f' : c.color}`, background: c.flash ? '#d63c2f' : PAPER, opacity: c.op, pointerEvents: 'none', zIndex: 5 }} />
      ))}
      {v && v.reason && (
        <div style={{ position: 'absolute', left: 0, top: 106, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: 8.5, fontWeight: 800, background: '#d63c2f', color: '#fff', padding: '3px 7px', borderRadius: 6, opacity: v.reason.op, pointerEvents: 'none', zIndex: 6 }}>✗ {v.reason.text}</div>
      )}
    </>
  );
}

export function Facility({ fu }: { fu: any }) {
  return (
    <div style={{ opacity: fu.building ? 0.35 + 0.4 * fu.prog : 1 }}>
      {fu.kind === 'chamber' && <Chamber fu={fu} />}
      {fu.kind === 'drive' && <Drive fu={fu} />}
      {fu.kind === 'meeting' && <Meeting fu={fu} />}
    </div>
  );
}
