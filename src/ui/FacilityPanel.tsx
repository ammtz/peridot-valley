// The panel for the isolation chamber and the meeting space. A PREVIEW: the pill says so at the top, always.
// It draws what the sim's event folds say. No button here sets a state; each asks the sim, which emits an event.
/* eslint-disable @typescript-eslint/no-explicit-any */
const INK = '#15140f';
const btn: React.CSSProperties = { minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', borderRadius: 8, border: `2px solid ${INK}`, background: 'transparent', color: INK, fontWeight: 800, fontSize: 12, letterSpacing: '.05em', cursor: 'pointer', fontFamily: 'inherit' };
const dark: React.CSSProperties = { ...btn, background: INK, color: '#f4f3ee' };
const off: React.CSSProperties = { opacity: 0.4, cursor: 'not-allowed' };
const sec: React.CSSProperties = { padding: '12px 16px 4px' };
const h: React.CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: '.1em', marginBottom: 7 };
const small: React.CSSProperties = { fontSize: 11, lineHeight: 1.45, color: '#6b6a62' };
const pill: React.CSSProperties = { display: 'inline-block', fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', padding: '3px 8px', borderRadius: 6, background: '#e8b923', border: `1.5px solid ${INK}`, color: INK };
const card: React.CSSProperties = { border: `2px solid ${INK}`, borderRadius: 12, background: '#f4f3ee', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 };
const select: React.CSSProperties = { minHeight: 44, borderRadius: 8, border: `2px solid ${INK}`, background: '#fbfaf5', color: INK, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, padding: '0 8px' };

function Lamp({ lamp, size = 18 }: { lamp: string; size?: number }) {
  const color = lamp === 'amber' ? '#e8b923' : lamp === 'green' ? '#3aa865' : '#d63c2f';
  return (
    <span aria-hidden="true" style={{ flex: 'none', width: size, height: size, borderRadius: '50%', border: `2.5px solid ${INK}`, boxSizing: 'border-box', background: lamp === 'green' ? 'repeating-linear-gradient(45deg,#3aa865 0 3px,#fbfaf5 3px 6px)' : color }} />
  );
}

function Chamber({ f }: { f: any }) {
  if (!f.built) return <div style={sec}><span style={pill}>PREVIEW · simulated</span><div style={{ ...small, marginTop: 8 }}>A builder is putting this up. It works when the bar fills.</div></div>;
  return (
    <>
      <div style={sec}>
        <span style={pill}>PREVIEW · simulated</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <Lamp lamp={f.lamp} />
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>
            {f.lampText}
            {f.lamp === 'green' && <div style={{ fontSize: 10.5, fontWeight: 600, color: '#6b6a62' }}>simulated: the six checks below are not built yet, so this green is a demo.</div>}
          </div>
        </div>
        {f.note && <div style={{ ...small, marginTop: 8, color: INK, fontWeight: 600 }}>{f.note}</div>}
      </div>

      <div style={sec}>
        <div style={h}>TEAMS INSIDE · {f.sealedCount}</div>
        {f.teams.length === 0 && <div style={small}>No active teams.</div>}
        {f.teams.map((t: any) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 44, borderTop: '1px solid #e6e4da' }}>
            <span style={{ fontWeight: 800, fontSize: 11.5, letterSpacing: '.08em' }}>{t.name}</span>
            {f.builder ? (
              <button onClick={t.go} disabled={t.other} style={{ ...btn, ...(t.other ? off : {}) }}>{t.here ? 'MOVE OUT' : t.other ? 'IN ANOTHER' : 'MOVE IN'}</button>
            ) : (
              <span style={{ fontSize: 10.5, color: '#6b6a62' }}>{t.here ? 'inside' : t.other ? 'in another chamber' : 'outside'}</span>
            )}
          </div>
        ))}
        {!f.builder && <div style={{ ...small, marginTop: 4 }}>Moving teams in and out is Builder mode only.</div>}
        {f.builder && <div style={{ ...small, marginTop: 4 }}>You can also drag a team banner onto the chamber.</div>}
      </div>

      <div style={sec}>
        <div style={h}>DRIVE</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button onClick={f.detect} style={dark}>DETECT DRIVES</button>
          {f.pull && <button onClick={f.pull} style={btn}>PULL THE DRIVE (simulated)</button>}
        </div>
        {f.drive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{ width: 34, height: 14, border: `2px solid ${INK}`, borderRadius: 3, background: 'repeating-linear-gradient(45deg,#e8b923 0 5px,#fbfaf5 5px 10px)' }} />
            <span style={{ fontSize: 11.5, fontWeight: 800 }}>{f.drive.label}{!f.drive.present ? ' · removed' : f.drive.cabled ? ' · cabled' : ''}</span>
          </div>
        )}
        {f.drive && f.drive.present && !f.drive.cabled && <div style={{ ...small, marginTop: 6 }}>{f.builder ? 'Press + on the chamber’s port, then click the drive.' : 'Wiring the cable is Builder mode only.'}</div>}
      </div>

      <div style={sec}>
        <div style={h}>THE SIX CHECKS GREEN WILL REQUIRE</div>
        {f.checks.map((c: any) => (
          <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', minHeight: 28, borderTop: '1px solid #e6e4da', fontSize: 11.5 }}>
            <span>{c.label}</span>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.05em', padding: '1px 6px', borderRadius: 4, border: '1.5px dashed rgba(21,20,15,.45)', color: '#6b6a62', whiteSpace: 'nowrap' }}>not implemented</span>
          </div>
        ))}
      </div>

      {f.purposes.length > 0 && (
        <div style={sec}>
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em' }}>What is this drive for?</div>
            {f.purposes.map((p: any) => (
              <button key={p.key} onClick={p.go} style={{ ...btn, justifyContent: 'space-between', gap: 8, background: p.active ? INK : 'transparent', color: p.active ? '#f4f3ee' : INK, textAlign: 'left' }}>
                <span>{p.label}</span>
                <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>{p.desc}</span>
              </button>
            ))}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {f.planned.map((x: string) => (
                <span key={x} style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6, border: '1.5px dashed rgba(21,20,15,.4)', color: '#6b6a62' }}>{x} · planned</span>
              ))}
            </div>
            {f.close && <button onClick={f.close} style={btn}>CLOSE THE CHAMBER</button>}
          </div>
        </div>
      )}

      {f.canGate && (
        <div style={sec}>
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em' }}>Export gate</div>
            <div style={small}>Data crosses only here, only after you approve. Nothing else leaves.</div>
            {!f.gate || f.gate.status !== 'ask' ? (
              <>
                {f.gate && <div style={{ fontSize: 11.5, fontWeight: 700 }}>Last request: {f.gate.status === 'approved' ? 'approved (sample only, nothing moved)' : 'held'}.</div>}
                <button onClick={f.gateAsk} style={dark}>{f.gateLabel}</button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 11.5, fontWeight: 700 }}>{f.gate.kind === 'import' ? 'These would come in:' : 'These would leave:'}</div>
                {f.gate.items.map((x: string) => (
                  <div key={x} style={{ fontSize: 11.5 }}>· {x}</div>
                ))}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={f.gate.yes} style={dark}>APPROVE</button>
                  <button onClick={f.gate.no} style={btn}>HOLD</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const STATUS: Record<string, string> = { waiting: 'WAITING', running: 'RUNNING', done: 'DONE' };

function Meeting({ f }: { f: any }) {
  if (!f.built) return <div style={sec}><span style={pill}>PREVIEW · simulated</span><div style={{ ...small, marginTop: 8 }}>A builder is putting this up. It works when the bar fills.</div></div>;
  return (
    <>
      <div style={sec}>
        <span style={pill}>PREVIEW · simulated</span>
        <div style={{ ...small, marginTop: 8 }}>{f.summary}. {f.builder ? 'Press + on the roof, then click a team’s plug to seat it.' : 'Wiring teams in is Builder mode only.'}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {f.teams.map((t: any) => (
            <span key={t.id} style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6, border: `2px solid ${t.color}`, color: INK }}>{t.name}</span>
          ))}
        </div>
      </div>

      <div style={sec}>
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em' }}>Blind check (simulated)</div>
          <div style={small}>A faceless figure at the door checks every card. Only typed messages cross: task, dependency, artifact reference, status, a short summary. Raw files, secrets and private data never cross. A refused card goes back to its sender with a reason.</div>
        </div>
      </div>

      <div style={sec}>
        <div style={h}>AGENDA · {f.rows.length}</div>
        {f.rows.length === 0 && <div style={small}>No steps yet. Wire a team to the table.</div>}
        {f.rows.map((r: any) => (
          <div key={r.step} style={{ borderTop: '1px solid #e6e4da', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 12, lineHeight: 1.4 }}>
                <b>Step {r.step}</b> · <span style={{ fontWeight: 800, color: r.color }}>{r.teamName}</span> · {r.what} · needs: {r.needs === undefined ? 'none' : 'step ' + r.needs}
              </span>
              <span style={{ flex: 'none', fontSize: 9, fontWeight: 800, letterSpacing: '.05em', padding: '2px 6px', borderRadius: 4, background: r.status === 'done' ? '#3aa865' : r.status === 'running' ? '#e8b923' : 'transparent', border: `1.5px solid ${INK}` }}>{STATUS[r.status]}</span>
            </div>
            {r.wait !== r.status && r.status === 'waiting' && <div style={{ fontSize: 10.5, color: '#6b6a62', fontWeight: 700 }}>{r.wait}</div>}
            {f.builder && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <select aria-label={'Team for step ' + r.step} value={r.team} onChange={(e) => r.setTeam(e.target.value)} style={select}>
                  {r.teamOptions.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <select aria-label={'Step ' + r.step + ' needs'} value={r.needs === undefined ? '' : String(r.needs)} onChange={(e) => r.setNeeds(e.target.value === '' ? undefined : Number(e.target.value))} style={select}>
                  <option value="">needs: none</option>
                  {r.needsOptions.map((n: number) => (
                    <option key={n} value={String(n)}>needs: step {n}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
        {f.note && <div role="alert" style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: '#d63c2f' }}>{f.note}</div>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          <button onClick={f.run} disabled={f.running} style={{ ...dark, ...(f.running ? off : {}) }}>{f.running ? 'RUNNING…' : 'RUN'}</button>
          <button onClick={f.add} disabled={!f.builder} title={f.builder ? undefined : 'Turn on Builder mode'} style={{ ...btn, ...(f.builder ? {} : off) }}>+ ADD STEP</button>
        </div>
      </div>

      <div style={sec}>
        <div style={h}>VERDICTS</div>
        {f.posts.length === 0 && <div style={small}>Nothing has reached the door yet. Press RUN.</div>}
        {f.posts.map((p: any) => (
          <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', borderTop: '1px solid #e6e4da', padding: '5px 0', fontSize: 11.5, lineHeight: 1.4 }}>
            <span style={{ flex: 'none', width: 14, fontWeight: 800, color: p.status === 'cleared' ? '#3aa865' : p.status === 'blocked' ? '#d63c2f' : '#6b6a62' }}>{p.status === 'cleared' ? '✓' : p.status === 'blocked' ? '✗' : '…'}</span>
            <span style={{ flex: 1 }}>
              {p.team}: {p.topic}
              {p.why && <span style={{ display: 'block', color: '#d63c2f', fontWeight: 700 }}>{p.why}</span>}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export function FacilityPanel({ fac }: { fac: any }) {
  if (fac.kind === 'chamber') return <Chamber f={fac} />;
  if (fac.kind === 'meeting') return <Meeting f={fac} />;
  return (
    <div style={sec}>
      <span style={pill}>simulated</span>
      <div style={{ ...small, marginTop: 8 }}>A sample drive. It stands in for hardware, and nothing real is read. Press + on a chamber’s port, then click this drive.</div>
    </div>
  );
}
