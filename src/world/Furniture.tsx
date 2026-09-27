import { FurnitureIcon } from './FurnitureIcon';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Furniture({ fu }: { fu: any }) {
  return (
    <div style={{ position: 'absolute', left: fu.x, top: fu.y, width: 0, height: 0, zIndex: fu.z }}>
      {fu.showRange && (
        <div style={{ position: 'absolute', left: fu.rL, top: fu.rL, width: fu.rD, height: fu.rD, borderRadius: '50%', border: '2px dashed rgba(21,20,15,.22)', background: 'rgba(21,20,15,.03)', pointerEvents: 'none' }} />
      )}
      <div onPointerDown={fu.down} style={{ position: 'absolute', left: -24, top: -24, width: 48, height: 48, cursor: 'grab', transform: `scale(${fu.sc})` }}>
        <FurnitureIcon kind={fu.kind} t={fu.t} />
      </div>
      {/* V3/V6: a clear label band below the icon, with its own background so a line or
          sprite passing behind it never reads as clipping through the text. */}
      <div style={{ position: 'absolute', left: 0, top: 34, transform: `translateX(-50%) scale(${fu.ls || 1})`, transformOrigin: 'center top', whiteSpace: 'nowrap', textAlign: 'center', pointerEvents: 'none', background: '#f4f3ee', padding: '1px 6px', borderRadius: 4 }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.1em' }}>{fu.label}</div>
        <div style={{ fontSize: 8.5, fontWeight: 600, color: '#6b6a62', marginTop: 1 }}>{fu.sub}</div>
      </div>
    </div>
  );
}
