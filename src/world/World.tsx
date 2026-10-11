import { useEffect, useRef } from 'react';
import type { Sim } from '../model/sim';
import { Links } from './Links';
import { Furniture } from './Furniture';
import { Room } from './Room';
import { Manager } from './Manager';
import { PearBody } from './AgentBody';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function World({ sim, rv }: { sim: Sim; rv: any }) {
  const vpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => sim.onMove(e);
    const up = (e: PointerEvent) => sim.onUp(e);
    const key = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === 'Escape') {
        sim.sel = null;
        sim.wiring = null;
      }
      if ((e.key === 'b' || e.key === 'B') && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement)) sim.toggleBuilder();
      if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey) sim.fitView();
      sim.notify();
    };
    const wheel = (e: WheelEvent) => sim.onWheel(e);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', key);
    const el = vpRef.current;
    el?.addEventListener('wheel', wheel, { passive: false });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', key);
      el?.removeEventListener('wheel', wheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={vpRef}
      onPointerDown={(e) => sim.bgDown(e)}
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden', touchAction: 'none', userSelect: 'none',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: '#15140f', background: rv.builder ? '#f6f1e2' : '#f4f3ee',
        backgroundImage: rv.builder ? 'radial-gradient(rgba(21,20,15,.28) 1.6px, transparent 1.6px)' : 'radial-gradient(rgba(21,20,15,.13) 1.4px, transparent 1.4px)', boxShadow: rv.builder ? 'inset 0 0 0 4px rgba(232,185,35,.7)' : 'none',
        backgroundSize: `${rv.gridSize}px ${rv.gridSize}px`, backgroundPosition: `${rv.panX}px ${rv.panY}px`, cursor: rv.bgCursor,
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: `translate(${rv.panX}px,${rv.panY}px) scale(${rv.zoom})`, transformOrigin: '0 0', willChange: 'transform' }}>
        <Links lines={rv.lines} ghosts={rv.ghosts} pulses={rv.pulses} wires={rv.wires} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {rv.furn.filter((fu: any) => !fu.owned).map((fu: any) => (
          <Furniture key={fu.id} fu={fu} />
        ))}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {rv.rooms.map((r: any) => (
          <Room key={r.id} r={r} />
        ))}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {rv.furn.filter((fu: any) => fu.owned).map((fu: any) => (
          <Furniture key={fu.id} fu={fu} />
        ))}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {rv.sups.map((s: any) => (
          <Manager key={s.id} s={s} />
        ))}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {rv.walkers.map((w: any, i: number) => (
          <div key={i} style={{ position: 'absolute', left: w.x - 6, top: w.y - 6, width: 12, height: 12, zIndex: 60, pointerEvents: 'none' }}>
            <PearBody size={12} />
          </div>
        ))}
        {rv.hasDragAg && (
          <div style={{ position: 'absolute', left: rv.dragAg.x, top: rv.dragAg.y, width: 0, height: 0, zIndex: 100, pointerEvents: 'none' }}>
            {/* Picked up: dangles from above, eyes wide. */}
            <div style={{ position: 'absolute', left: -12, top: -12, width: 24, height: 24, filter: 'drop-shadow(0 10px 7px rgba(21,20,15,.22))', transformOrigin: '50% -20%', transform: `rotate(${rv.dragAg.rot}deg)` }}>
              <PearBody size={24} />
              <div style={{ position: 'absolute', left: 6.2, top: 5.6, width: 4, height: 5.4, borderRadius: 1.2, background: '#f4f3ee' }} />
              <div style={{ position: 'absolute', left: 13.8, top: 5.6, width: 4, height: 5.4, borderRadius: 1.2, background: '#f4f3ee' }} />
            </div>
            <div style={{ position: 'absolute', left: 18, top: 14, whiteSpace: 'nowrap', fontSize: 10, fontWeight: 800, letterSpacing: '.08em', background: '#15140f', color: '#f4f3ee', padding: '3px 7px', borderRadius: 6 }}>
              {rv.dragAg.name} <span style={{ fontWeight: 500, opacity: 0.75 }}>{rv.dragAg.target}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
