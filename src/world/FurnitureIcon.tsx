import type { FurnKind } from '../model/types';

/** Pixel-for-pixel port of reference/FurnitureIcon.dc.html. */
export function FurnitureIcon({ kind, t }: { kind: FurnKind; t: number }) {
  const l1 = 0.25 + 0.75 * Math.abs(Math.sin(t * 3.1));
  const l2 = 0.25 + 0.75 * Math.abs(Math.sin(t * 2.3 + 1));
  const l3 = 0.25 + 0.75 * Math.abs(Math.sin(t * 4.2 + 2));

  return (
    <div style={{ position: 'relative', width: 48, height: 48, pointerEvents: 'none' }}>
      {kind === 'mcp' && (
        <div
          style={{
            position: 'absolute', left: 8, top: 1, width: 32, height: 46, border: '2px solid #15140f', borderRadius: 5,
            background: '#fbfaf5', boxShadow: '0 3px 0 rgba(21,20,15,.12)', display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 3px',
          }}
        >
          {[l1, l2, l3].map((op, i) => (
            <div key={i} style={{ flex: 1, border: '1.5px solid #15140f', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 2 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#15140f', opacity: op }} />
            </div>
          ))}
        </div>
      )}
      {kind === 'db' && (
        <>
          <div style={{ position: 'absolute', left: 6, top: 9, width: 36, height: 35, border: '2px solid #15140f', borderTop: 'none', borderRadius: '0 0 18px 18px / 0 0 7px 7px', background: '#fbfaf5', boxShadow: '0 3px 0 rgba(21,20,15,.12)' }} />
          <div style={{ position: 'absolute', left: 6, top: 15, width: 36, height: 14, border: '2px solid transparent', borderBottomColor: '#15140f', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', left: 6, top: 24, width: 36, height: 14, border: '2px solid transparent', borderBottomColor: '#15140f', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', left: 6, top: 2, width: 36, height: 14, border: '2px solid #15140f', borderRadius: '50%', background: '#fbfaf5' }} />
          <div style={{ position: 'absolute', left: 32, top: 31, width: 4, height: 4, borderRadius: '50%', background: '#15140f', opacity: l1 }} />
        </>
      )}
      {kind === 'books' && (
        <>
          <div style={{ position: 'absolute', left: 3, top: 4, width: 42, height: 41, border: '2px solid #15140f', borderRadius: 4, background: '#fbfaf5', boxShadow: '0 3px 0 rgba(21,20,15,.12)' }} />
          <div style={{ position: 'absolute', left: 3, top: 23, width: 42, height: 2, background: '#15140f' }} />
          <div style={{ position: 'absolute', left: 8, top: 8, width: 32, height: 15, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            <span style={{ width: 4, height: 13, background: '#15140f' }} />
            <span style={{ width: 4, height: 10, background: '#6b6a62' }} />
            <span style={{ width: 5, height: 14, background: '#15140f' }} />
            <span style={{ width: 3, height: 8, background: '#6b6a62' }} />
            <span style={{ width: 4, height: 12, background: '#15140f', transform: 'rotate(12deg)', transformOrigin: 'bottom left' }} />
          </div>
          <div style={{ position: 'absolute', left: 8, top: 27, width: 32, height: 15, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            <span style={{ width: 5, height: 12, background: '#6b6a62' }} />
            <span style={{ width: 4, height: 14, background: '#15140f' }} />
            <span style={{ width: 4, height: 9, background: '#15140f' }} />
            <span style={{ width: 4, height: 13, background: '#6b6a62' }} />
            <span style={{ width: 4, height: 11, background: '#15140f' }} />
          </div>
        </>
      )}
      {kind === 'rec' && (
        <>
          {/* body */}
          <div style={{ position: 'absolute', left: 5, top: 15, width: 27, height: 20, border: '2px solid #15140f', borderRadius: 5, background: '#fbfaf5', boxShadow: '0 3px 0 rgba(21,20,15,.12)' }} />
          {/* viewfinder */}
          <div style={{ position: 'absolute', left: 12, top: 6, width: 11, height: 10, border: '2px solid #15140f', borderRadius: 3, background: '#fbfaf5' }} />
          {/* lens */}
          <div style={{ position: 'absolute', left: 27, top: 17, width: 17, height: 17, borderRadius: '50%', border: '2px solid #15140f', background: '#fbfaf5' }} />
          <div style={{ position: 'absolute', left: 31, top: 21, width: 9, height: 9, borderRadius: '50%', background: '#15140f' }} />
          {/* blinking record dot */}
          <div style={{ position: 'absolute', left: 8, top: 19, width: 6, height: 6, borderRadius: '50%', background: '#d63c2f', opacity: 0.4 + 0.6 * Math.abs(Math.sin(t * 5)) }} />
        </>
      )}
    </div>
  );
}
