import { FurnitureIcon } from './FurnitureIcon';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Furniture({ fu }: { fu: any }) {
  return (
    <div style={{ position: 'absolute', left: fu.x, top: fu.y, width: 0, height: 0, zIndex: fu.z }}>
      {fu.showRange && (
        <div style={{ position: 'absolute', left: fu.rL, top: fu.rL, width: fu.rD, height: fu.rD, borderRadius: '50%', border: '2px dashed rgba(21,20,15,.22)', background: 'rgba(21,20,15,.03)', pointerEvents: 'none' }} />
      )}
      <div onPointerDown={fu.down} style={{ position: 'absolute', left: -24, top: -24, width: 48, height: 48, cursor: 'grab', transform: `scale(${fu.sc})`, opacity: fu.building ? 0.35 + 0.4 * fu.prog : 1 }}>
        <FurnitureIcon kind={fu.kind} t={fu.t} />
      </div>
      {fu.building && (
        <>
          <div style={{ position: 'absolute', left: -20, top: fu.owned ? 12 : 28, width: 40, height: 5, borderRadius: 3, border: '1.5px solid #15140f', background: '#fbfaf5', overflow: 'hidden', pointerEvents: 'none' }}>
            <div style={{ width: `${fu.prog * 100}%`, height: '100%', background: '#e8b923' }} />
          </div>
          <div style={{ position: 'absolute', left: fu.wx - 7, top: fu.wy - 7, width: 14, height: 14, borderRadius: 4, background: '#e8b923', border: '1.5px solid #15140f', transform: `rotate(${fu.wr}deg)`, pointerEvents: 'none', zIndex: 5 }}>
            <div style={{ position: 'absolute', left: 2, top: 4, width: 2, height: 3, background: '#15140f' }} />
            <div style={{ position: 'absolute', left: 8, top: 4, width: 2, height: 3, background: '#15140f' }} />
          </div>
        </>
      )}
      {/* V3/V6: a clear label band below the icon, with its own background so a line or
          sprite passing behind it never reads as clipping through the text. */}
      {!fu.owned && <div style={{ position: 'absolute', left: 0, top: 34, transform: `translateX(-50%) scale(${fu.ls || 1})`, transformOrigin: 'center top', whiteSpace: 'nowrap', textAlign: 'center', pointerEvents: 'none', background: '#f4f3ee', padding: '1px 6px', borderRadius: 4 }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.1em' }}>{fu.label}</div>
        <div style={{ fontSize: 8.5, fontWeight: 600, color: '#6b6a62', marginTop: 1 }}>{fu.sub}</div>
      </div>}
    </div>
  );
}
