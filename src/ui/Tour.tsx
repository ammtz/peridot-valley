import { useEffect, useRef, useState } from 'react';
import type { Sim } from '../model/sim';
import { roomH, roomW } from '../model/seed';

const card: React.CSSProperties = {
  pointerEvents: 'auto',
  width: 'min(420px, calc(100vw - 32px))',
  padding: '16px 18px 18px',
  background: '#fbfaf5',
  border: '2.5px solid #15140f',
  borderRadius: 16,
  boxShadow: '0 8px 0 rgba(21,20,15,.12)',
  fontFamily: "'JetBrains Mono',monospace",
  color: '#15140f',
  fontSize: 13,
  lineHeight: 1.5,
};
const nextBtn: React.CSSProperties = {
  marginTop: 14,
  padding: '10px 16px',
  borderRadius: 9,
  border: '2px solid #15140f',
  background: '#15140f',
  color: '#f4f3ee',
  fontWeight: 800,
  fontSize: 11.5,
  letterSpacing: '.06em',
  cursor: 'pointer',
  fontFamily: "'JetBrains Mono',monospace",
};

const PAD = 12;

function fromWorldBox(sim: Sim, x0: number, y0: number, x1: number, y1: number) {
  const a = { x: sim.pan.x + x0 * sim.zoom, y: sim.pan.y + y0 * sim.zoom };
  const b = { x: sim.pan.x + x1 * sim.zoom, y: sim.pan.y + y1 * sim.zoom };
  return { l: a.x - PAD, t: a.y - PAD, w: b.x - a.x + PAD * 2, h: b.y - a.y + PAD * 2 };
}

/** Measured every frame from real positions — never guessed pixel geometry. */
function spotRect(sim: Sim): { l: number; t: number; w: number; h: number } {
  const vw = window.innerWidth,
    vh = window.innerHeight;
  const fallback = { l: vw / 2 - 60, t: vh / 2 - 60, w: 120, h: 120 };

  if (sim.tourStep === 0) {
    // The whole org: PIP plus every active/pending floor, so the pulse's path is visible.
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const pip = sim.m.sups.pip;
    x0 = Math.min(x0, pip.x - 60); y0 = Math.min(y0, pip.y - 60); x1 = Math.max(x1, pip.x + 60); y1 = Math.max(y1, pip.y + 70);
    sim.m.teams.forEach((T) => {
      if (T.state === 'hidden') return;
      const n = sim.members(T).length,
        w = roomW(n),
        h = roomH(n);
      x0 = Math.min(x0, T.x - w / 2); y0 = Math.min(y0, T.y - h / 2 - 30);
      x1 = Math.max(x1, T.x + w / 2); y1 = Math.max(y1, T.y + h / 2);
    });
    return fromWorldBox(sim, x0, y0, x1, y1);
  }

  // stop 1: the stuck agent's floor — the sim already re-centered the camera on it.
  // U14: this is the tour's last stop; tools and the recorder are taught by the
  // phone "+" sheet's one-time tips instead of a third and fourth stop here.
  const id = sim.tourBlockedAgentId;
  const a = id ? sim.agent(id) : null;
  const T = a ? sim.team(a.team) : null;
  if (!T) return fallback;
  const n = sim.members(T).length,
    w = roomW(n),
    h = roomH(n);
  return fromWorldBox(sim, T.x - w / 2, T.y - h / 2 - 30, T.x + w / 2, T.y + h / 2);
}

export function Tour({ sim }: { sim: Sim }) {
  // U8: tourEnd() sets the closing line right as tourOn goes false, so without this
  // it never gets a render to show in. Keep it up for 5s, or until tapped.
  const [showOutro, setShowOutro] = useState(false);
  const wasOn = useRef(sim.tourOn);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (wasOn.current && !sim.tourOn) {
      setShowOutro(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShowOutro(false), 5000);
    }
    wasOn.current = sim.tourOn;
  }, [sim.tourOn]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!sim.tourOn && !showOutro) return null;

  if (!sim.tourOn) {
    // Outro only: no spotlight, no NEXT/skip — just PIP's line, dismissible by a tap.
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 'max(28px,3vh)', pointerEvents: 'none' }}>
        <div style={{ ...card, marginBottom: 30 }} onClick={() => setShowOutro(false)}>
          <div style={{ whiteSpace: 'pre-line' }}>{sim.speechText}</div>
        </div>
      </div>
    );
  }

  const shown = sim.speechShown();
  const done = sim.speechDone();
  const rect = spotRect(sim);
  const canNext = sim.tourCanNext();
  const tap = () => {
    if (!done) {
      sim.finishSpeech();
      sim.notify();
    }
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute', left: rect.l, top: rect.t, width: rect.w, height: rect.h, borderRadius: 20,
          boxShadow: '0 0 0 9999px rgba(21,20,15,.65)', transition: 'left .3s, top .3s, width .3s, height .3s', pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 'max(28px,3vh)', pointerEvents: 'none' }}>
        <div style={{ ...card, marginBottom: 30 }} onClick={tap}>
          <div style={{ whiteSpace: 'pre-line' }}>{shown}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
            {canNext && (
              <button style={nextBtn} onClick={() => sim.tourNext()}>
                NEXT
              </button>
            )}
            <button
              onClick={() => sim.tourSkip()}
              style={{ pointerEvents: 'auto', background: 'transparent', border: 'none', fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600, color: '#9a988f', letterSpacing: '.03em', cursor: 'pointer', textDecoration: 'underline' }}
            >
              skip tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
