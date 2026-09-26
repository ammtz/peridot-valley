import { useState } from 'react';
import type { Sim } from '../model/sim';
import { helperCount } from '../model/presets';

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
      <div style={{ marginBottom: 12 }}>
        <b>{cur.name}</b> · would run <b>{cur.runs}</b> — {cur.teams.length} {cur.teams.length === 1 ? 'team' : 'teams'}, {helperCount(cur)} {helperCount(cur) === 1 ? 'helper' : 'helpers'}
      </div>
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
      onClick={phase === 'sleep' ? () => sim.wake() : undefined}
    >
      {phase === 'sleep' && (
        <div style={{ pointerEvents: 'auto', position: 'absolute', left: '50%', top: '58%', transform: 'translate(-50%,0)', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: '#6b6a62', letterSpacing: '.05em' }}>
          tap to wake
        </div>
      )}

      {phase !== 'sleep' && (
        <div data-intro-card="true" style={{ ...card, marginBottom: 100 }} onClick={tap}>
          <div style={{ whiteSpace: 'pre-line' }}>{shown}</div>
          {done && phase === 'greet' && <AnswerButtons options={[['go', "Let's go"]]} onPick={() => sim.advanceGreet()} />}
          {done && phase === 'q1' && <AnswerButtons options={[['yes', 'Yes, ask me first'], ['no', 'No, just handle it']]} onPick={(v) => sim.answerQ1(v === 'yes')} />}
          {done && phase === 'q2' && <AnswerButtons options={sim.q2Options()} onPick={(v) => sim.answerQ2(v)} />}
          {phase === 'hiring' && <div style={{ marginTop: 12 }}><HiringCard sim={sim} /></div>}
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
