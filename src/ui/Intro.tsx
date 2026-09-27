import { useState } from 'react';
import type { Sim } from '../model/sim';
import { helperCount, type TeamPlan } from '../model/presets';

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
const answerBtn: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '0 14px',
  borderRadius: 10,
  border: '2px solid #15140f',
  background: 'transparent',
  color: '#15140f',
  fontWeight: 800,
  fontSize: 15,
  letterSpacing: '.04em',
  cursor: 'pointer',
  fontFamily: "'JetBrains Mono',monospace",
};
const smallBtn: React.CSSProperties = {
  minHeight: 44,
  padding: '0 14px',
  borderRadius: 9,
  border: '2px solid #15140f',
  background: 'transparent',
  color: '#15140f',
  fontWeight: 800,
  fontSize: 13,
  letterSpacing: '.05em',
  cursor: 'pointer',
  fontFamily: "'JetBrains Mono',monospace",
};
const primaryBtn: React.CSSProperties = { ...smallBtn, background: '#15140f', color: '#f4f3ee' };
const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: '9px 10px',
  border: '2px solid #15140f',
  borderRadius: 9,
  background: '#f4f3ee',
  color: '#15140f',
  fontWeight: 800,
  fontSize: 12,
  letterSpacing: '.06em',
  outline: 'none',
  fontFamily: "'JetBrains Mono',monospace",
};

function AnswerButtons({ options, onPick }: { options: [string, string][]; onPick: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={(e) => {
            e.stopPropagation();
            onPick(v);
          }}
          style={answerBtn}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** The team's wiring as a small top-to-bottom flow: stages, side-by-side helpers,
 *  an optional loop, and who signs off (set by the first question). */
function PlanFlow({ plan, askFirst }: { plan: TeamPlan; askFirst: boolean }) {
  const node: React.CSSProperties = { border: '1.5px solid #15140f', borderRadius: 7, padding: '3px 8px', background: '#fff', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' };
  const arrow = <div aria-hidden style={{ color: '#6b6a62', fontSize: 11, lineHeight: 1, padding: '2px 0 2px 10px' }}>↓</div>;
  const stages = [...plan.stages, [askFirst ? 'You approve' : 'Vic approves']];
  return (
    <div style={{ border: '1.5px dashed #b9b6ab', borderRadius: 10, padding: '10px 10px 9px', marginBottom: 12, background: '#f4f3ee' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 7 }}>Blueprint · {plan.shape}</div>
      {stages.map((st, i) => (
        <div key={i}>
          {i > 0 && arrow}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {st.map((n) => (
              <span key={n} style={i === stages.length - 1 ? { ...node, background: '#15140f', color: '#f4f3ee' } : node}>{n}</span>
            ))}
            {st.length > 1 && <span style={{ fontSize: 11, color: '#6b6a62' }}>side by side</span>}
          </div>
        </div>
      ))}
      {plan.loop && <div style={{ marginTop: 7, fontSize: 12, color: '#3a7a52', fontWeight: 700 }}>↺ {plan.loop}</div>}
      <div style={{ marginTop: 7, fontSize: 13, color: '#3d3c36' }}>{plan.why}</div>
    </div>
  );
}

function HiringCard({ sim }: { sim: Sim }) {
  const cur = sim.currentHire();
  if (!cur) return null;
  if (sim.renaming) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <div style={{ marginBottom: 10 }}>Rename {cur.name}:</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            autoFocus
            value={sim.renameValue}
            maxLength={14}
            onChange={(e) => {
              sim.renameValue = e.target.value.toUpperCase();
              sim.notify();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sim.hireCurrent(sim.renameValue);
            }}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={primaryBtn} onClick={() => sim.hireCurrent(sim.renameValue)}>HIRE</button>
          <button style={smallBtn} onClick={() => sim.cancelRename()}>CANCEL</button>
        </div>
      </div>
    );
  }
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div style={{ marginBottom: 10 }}>
        <b>{cur.name}</b> · would run <b>{cur.runs}</b> — {cur.teams.length} {cur.teams.length === 1 ? 'team' : 'teams'}, {helperCount(cur)} {helperCount(cur) === 1 ? 'helper' : 'helpers'}
      </div>
      <PlanFlow plan={cur.plan} askFirst={sim.askFirst} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={primaryBtn} onClick={() => sim.hireCurrent()}>HIRE</button>
        <button style={smallBtn} onClick={() => sim.startRename()}>RENAME</button>
        <button style={smallBtn} onClick={() => sim.skipCurrent()}>SKIP</button>
      </div>
    </div>
  );
}

function AddTeamCard({ sim }: { sim: Sim }) {
  const [val, setVal] = useState('');
  return (
    <div onClick={(e) => e.stopPropagation()}>
      {sim.addTeamCount < 3 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input placeholder="name a team, e.g. TRAVEL" value={val} maxLength={14} onChange={(e) => setVal(e.target.value.toUpperCase())} style={inputStyle} />
          <button
            style={smallBtn}
            onClick={() => {
              sim.addCustomTeam(val);
              setVal('');
            }}
          >
            ADD
          </button>
        </div>
      )}
      <button style={primaryBtn} onClick={() => sim.finishHiring()}>I'm done</button>
    </div>
  );
}

export function Intro({ sim }: { sim: Sim }) {
  const phase = sim.introPhase;
  if (!phase) return null;
  const shown = sim.speechShown();
  const done = sim.speechDone();

  const tap = () => {
    if (!done) {
      sim.finishSpeech();
      sim.notify();
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 'max(28px,3vh)' }}
      onClick={phase === 'sleep' ? () => sim.wake() : tap}
    >
      {phase === 'sleep' && (
        <div className="wake-hint" style={{ pointerEvents: 'auto', position: 'absolute', left: '50%', top: '58%', transform: 'translate(-50%,0)', fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 800, color: '#15140f', letterSpacing: '.06em', border: '2px solid #15140f', borderRadius: 999, padding: '10px 18px', background: '#fbfaf5' }}>
          Tap to wake Vic
        </div>
      )}

      {phase !== 'sleep' && (
        <div data-intro-card="true" style={{ ...card, marginBottom: 100 }} onClick={tap}>
          {sim.vicNotes.length > 0 && (
            <div aria-label="Vic's notes" style={{ borderBottom: '1.5px dashed #c9c6bb', paddingBottom: 8, marginBottom: 10, fontSize: 11, color: '#6b6a62' }}>
              <div style={{ fontWeight: 800, letterSpacing: '.12em', marginBottom: 3 }}>VIC'S NOTES</div>
              {sim.vicNotes.map((n) => (
                <div key={n} className="vic-note">✓ {n}</div>
              ))}
            </div>
          )}
          <div style={{ whiteSpace: 'pre-line', fontSize: 15 }}>{shown}</div>
          {sim.thinking && done && (
            <div className="vic-thinking" aria-live="polite" style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#6b6a62' }}>
              ✎ writing that down<span>.</span><span>.</span><span>.</span>
            </div>
          )}
          {done && !sim.thinking && phase === 'greet' && <AnswerButtons options={[['go', "Let's go"]]} onPick={() => sim.advanceGreet()} />}
          {done && !sim.thinking && phase === 'q1' && <AnswerButtons options={[['yes', 'Consult me'], ['no', 'You handle them']]} onPick={(v) => sim.answerQ1(v === 'yes')} />}
          {done && !sim.thinking && phase === 'q2' && <AnswerButtons options={sim.q2Options()} onPick={(v) => sim.answerQ2(v)} />}
          {phase === 'hiring' && !sim.thinking && <div style={{ marginTop: 12 }}><HiringCard sim={sim} /></div>}
          {phase === 'addteam' && <div style={{ marginTop: 12 }}><AddTeamCard sim={sim} /></div>}
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          sim.skipIntro();
        }}
        style={{
          pointerEvents: 'auto', position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', background: 'transparent', border: 'none',
          minHeight: 44, minWidth: 44, padding: '12px 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600, color: '#6b6a62', letterSpacing: '.03em', cursor: 'pointer', textDecoration: 'underline',
        }}
      >
        skip — show me a full valley
      </button>
    </div>
  );
}
