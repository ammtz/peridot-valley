const isPhone = () => typeof window !== 'undefined' && window.innerWidth <= 600;

// U11: every button is at least 44x44 — a shared base so a taller hit target
// doesn't mean re-deriving vertical centering at each call site.
const inlineIn: React.CSSProperties = { display: 'block', width: '100%', padding: '0 4px', margin: '0 0 0 -4px', background: 'transparent', border: 'none', borderBottom: '1.5px dashed rgba(21,20,15,.35)', outline: 'none', fontFamily: 'inherit', borderRadius: 0 };
const btnBase: React.CSSProperties = { minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };

import { FacilityPanel } from './FacilityPanel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Popup({ rv }: { rv: any }) {
  if (!rv.hasPop) return null;
  const pop = rv.pop;
  const phone = isPhone();
  const style: React.CSSProperties = phone
    ? {
        position: 'fixed', left: 0, right: 0, bottom: 0, top: 'auto', width: '100%', maxHeight: '60vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', zIndex: 1000, background: '#fbfaf5',
        border: '2.5px solid #15140f', borderBottom: 'none', borderRadius: '18px 18px 0 0', boxShadow: '0 -6px 0 rgba(21,20,15,.12)', opacity: pop.op,
        fontFamily: "'JetBrains Mono',monospace", color: '#15140f',
      }
    : {
        position: 'fixed', left: pop.l, top: pop.t, width: 330, maxHeight: pop.maxH, overflow: 'hidden', display: 'flex', flexDirection: 'column', zIndex: 1000, background: '#fbfaf5',
        border: '2.5px solid #15140f', borderRadius: 16, boxShadow: '0 8px 0 rgba(21,20,15,.12)', opacity: pop.op,
        transform: `translateY(${pop.ty}px) scale(${pop.sc})`, transformOrigin: pop.origin, fontFamily: "'JetBrains Mono',monospace", color: '#15140f',
      };
  return (
    <div data-bottom-sheet={phone ? 'true' : undefined} style={style}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px 12px 16px', background: '#fbfaf5', borderBottom: '2px solid #15140f' }}>
        <span style={{ width: 26, height: 26, background: '#15140f', borderRadius: 7, position: 'relative', flex: 'none' }}>
          <span style={{ position: 'absolute', left: 7, top: 9, width: 4, height: 6, background: '#f4f3ee', borderRadius: 1 }} />
          <span style={{ position: 'absolute', left: 15, top: 9, width: 4, height: 6, background: '#f4f3ee', borderRadius: 1 }} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Role sits above the name as a small subtitle line; in builder mode both edit in place. */}
          {pop.role !== undefined && pop.hasEdit && pop.hasRole ? (
            <input aria-label="Role" value={pop.roleVal} onChange={(e) => pop.onRole(e.target.value)} maxLength={18} style={{ ...inlineIn, fontWeight: 600, fontSize: 10.5, letterSpacing: '.08em', color: '#6b6a62', minHeight: 20 }} />
          ) : pop.role ? (
            <div style={{ fontWeight: 600, fontSize: 10.5, letterSpacing: '.08em', color: '#6b6a62' }}>{pop.role}</div>
          ) : null}
          {pop.hasEdit ? (
            <input aria-label="Name" value={pop.nameVal} onChange={(e) => pop.onName(e.target.value)} maxLength={pop.nameMax || 14} style={{ ...inlineIn, fontWeight: 800, fontSize: 14, letterSpacing: '.12em', color: '#15140f', minHeight: 26 }} />
          ) : (
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '.12em' }}>{pop.title}</div>
          )}
          <div style={{ fontWeight: 500, fontSize: 10.5, color: '#6b6a62', marginTop: 2 }}>{pop.sub}</div>
        </div>
        <button onClick={rv.closePop} aria-label="Close" style={{ width: 44, height: 44, border: '2px solid #15140f', borderRadius: 10, background: 'transparent', fontWeight: 800, fontSize: 17, color: '#15140f', cursor: 'pointer', flex: 'none' }}>×</button>
      </div>

      {pop.hasPin && (
        <div style={{ flex: 'none', display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 16px', background: '#fbfaf5', borderBottom: '1.5px solid #e6e4da' }}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {pop.pin.map((pa: any, i: number) => (
            <button key={i} onClick={pa.go} disabled={pa.off} style={{ ...btnBase, flex: i === 0 ? '1 1 auto' : 'none', padding: '0 14px', borderRadius: 8, border: `2px solid ${pa.bc}`, background: pa.bg, color: pa.fg, fontWeight: 800, fontSize: 13, letterSpacing: '.06em', opacity: pa.off ? 0.45 : 1, cursor: pa.off ? 'not-allowed' : 'pointer' }}>{pa.label}</button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: 6, display: 'flex', flexDirection: 'column' }}>
      {pop.hasMood && (
        <div style={{ margin: '12px 16px 2px', padding: '10px 12px', border: '2px solid #15140f', borderRadius: 12, background: '#f4f3ee', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', padding: '2px 7px', borderRadius: 5, border: '1.5px solid #15140f', background: pop.moodBg, color: pop.moodFg }}>{pop.moodLabel}</span>
            <span style={{ fontSize: 10, color: '#6b6a62' }}>{pop.moodWhy}</span>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.45, fontWeight: 600, fontStyle: 'italic' }}>“{pop.moodText}”</div>
          {pop.hasMoodActs && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {pop.moodActs.map((ma: any, i: number) => (
                <button key={i} onClick={ma.go} style={{ ...btnBase, padding: '0 14px', borderRadius: 8, border: `2px solid ${ma.bc}`, background: ma.bg, color: ma.fg, fontWeight: 800, fontSize: 13, letterSpacing: '.04em' }}>{ma.label}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {pop.fac && <FacilityPanel fac={pop.fac} />}

      {pop.hasDesc && <div style={{ padding: '12px 16px 2px', fontSize: 15, lineHeight: 1.5 }}>{pop.desc}</div>}

      {pop.hasBoss && (
        <div style={{ padding: '12px 16px 2px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', marginBottom: 7 }}>{pop.bossLabel || 'MANAGED BY'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {pop.bossChips.map((bc: any, i: number) => (
              <button key={i} onClick={bc.go} style={{ ...btnBase, padding: '0 12px', borderRadius: 8, border: '2px solid #15140f', background: bc.bg, color: bc.fg, fontWeight: 800, fontSize: 12, letterSpacing: '.06em' }}>{bc.label}</button>
            ))}
          </div>
        </div>
      )}

      {pop.hasNeeds && (
        <>
          <div style={{ padding: '12px 16px 4px', fontSize: 10, fontWeight: 800, letterSpacing: '.1em' }}>NEEDS YOU · {pop.needCount}</div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {pop.needs.map((nd: any, i: number) => (
            <div key={i} style={{ padding: '10px 16px 13px', borderBottom: '1px solid #e6e4da', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: '#6b6a62' }}>{nd.path}</div>
              <div style={{ fontSize: 15, lineHeight: 1.5, fontWeight: 500 }}>{nd.text}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {nd.acts.map((ac: any, j: number) => (
                  <button key={j} onClick={ac.go} style={{ ...btnBase, padding: '0 14px', borderRadius: 8, border: '2px solid #15140f', background: ac.bg, color: ac.fg, fontWeight: 700, fontSize: 13, letterSpacing: '.04em' }}>{ac.label}</button>
                ))}
              </div>
            </div>
          ))}
          {pop.noNeeds && <div style={{ padding: '6px 16px 14px', fontSize: 12, color: '#6b6a62', lineHeight: 1.5 }}>Nothing needs you right now. The teams have it.</div>}
        </>
      )}

      {pop.hasOpts && (
        <div style={{ padding: '12px 16px 2px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', marginBottom: 7 }}>{pop.optsLabel}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {pop.opts.map((op: any, i: number) => (
              <button key={i} onClick={op.go} disabled={!pop.builder} style={{ ...btnBase, padding: '0 12px', borderRadius: 8, border: op.border, background: op.bg, color: op.fg, fontWeight: 700, fontSize: 12, letterSpacing: '.03em', cursor: pop.builder ? 'pointer' : 'default' }}>{op.label}</button>
            ))}
          </div>
        </div>
      )}

      {pop.hasRecorder && (
        <div style={{ padding: '12px 16px 2px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em' }}>LAST RECAP</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.45, color: '#6b6a62' }}>{pop.lastRecap}</div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', marginTop: 4 }}>NEXT IN {pop.nextIn}</div>
        </div>
      )}

      {pop.hasRows && (
        <div style={{ order: pop.rowsFirst ? -1 : 0 }}>
          <div style={{ padding: '14px 16px 6px', fontSize: 10, fontWeight: 800, letterSpacing: '.1em' }}>{pop.rowsLabel} · {pop.rowCount}</div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {pop.rows.map((rw: any, i: number) => (
            <div key={i} onClick={rw.go} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 44, padding: '4px 16px', borderTop: '1px solid #e6e4da', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ flex: 'none', width: 10, height: 10, borderRadius: rw.dotR, border: '2px solid #15140f', background: rw.dotBg }} />
                <span style={{ fontWeight: 800, fontSize: 11.5, letterSpacing: '.08em', whiteSpace: 'nowrap' }}>{rw.name}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10.5, color: '#6b6a62', textAlign: 'right' }}>{rw.stat}</span>
                {rw.actLabel && (
                  <button onClick={(e) => { e.stopPropagation(); rw.act(); }} style={{ ...btnBase, padding: '0 10px', borderRadius: 7, border: '1.5px solid #9a3b2c', background: 'transparent', color: '#9a3b2c', fontWeight: 800, fontSize: 10.5, letterSpacing: '.06em' }}>{rw.actLabel}</button>
                )}
              </span>
            </div>
          ))}
          {pop.noRows && <div style={{ padding: '2px 16px 8px', fontSize: 11.5, color: '#6b6a62' }}>{pop.noRowsText}</div>}
        </div>
      )}

      {pop.isTeam && (
        <div style={{ padding: '12px 16px 2px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', marginBottom: 7 }}>AGENTS · {pop.memberCount}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {pop.members.map((mb: any, i: number) => (
              <button key={i} onClick={mb.go} style={{ ...btnBase, gap: 6, padding: '0 10px 0 6px', borderRadius: 8, border: '1.5px solid #15140f', background: 'transparent', fontWeight: 700, fontSize: 12, letterSpacing: '.06em', color: '#15140f' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3.5, background: '#15140f' }} />{mb.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {pop.hasEquip && (
        <div style={{ padding: '14px 16px 2px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', marginBottom: 6 }}>EQUIPPED WITH</div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {pop.equip.map((eq: any, i: number) => (
            <div key={i} onClick={eq.go} style={{ display: 'flex', gap: 9, alignItems: 'baseline', padding: '4px 0', cursor: 'pointer' }}>
              <span style={{ flex: 'none', fontSize: 9, fontWeight: 800, letterSpacing: '.06em', padding: '1px 5px', borderRadius: 4, background: '#15140f', color: '#f4f3ee' }}>{eq.short}</span>
              <span style={{ flex: 1, fontSize: 11.5, lineHeight: 1.45 }}>{eq.detail}</span>
            </div>
          ))}
        </div>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(pop.secs || []).map((sc: any, i: number) => (
        <div key={i} style={{ padding: '12px 16px 4px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', marginBottom: 6 }}>{sc.label} <span style={{ color: '#6b6a62', fontWeight: 600 }}>· {sc.n}</span></div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {sc.items.map((it: any, j: number) => (
            <div key={j} style={{ display: 'flex', gap: 9, alignItems: 'baseline', padding: '4px 0' }}>
              <span style={{ flex: 'none', width: 12, fontSize: 10, fontWeight: 800, opacity: it.mOp, color: it.color }}>{it.mark}</span>
              <span style={{ flex: 1, fontSize: 15, lineHeight: 1.45, color: it.color }}>{it.text}</span>
              {it.hasTag && <span style={{ flex: 'none', fontSize: 9, fontWeight: 700, letterSpacing: '.06em', color: '#6b6a62' }}>{it.tag}</span>}
            </div>
          ))}
          {sc.empty && <div style={{ fontSize: 11.5, color: '#6b6a62', padding: '2px 0 4px 21px' }}>—</div>}
        </div>
      ))}

      {pop.hasActs && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '14px 16px 4px' }}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {pop.acts.map((pa: any, i: number) => (
            <button key={i} onClick={pa.go} style={{ ...btnBase, padding: '0 14px', borderRadius: 8, border: `2px solid ${pa.bc}`, background: pa.bg, color: pa.fg, fontWeight: 800, fontSize: 13, letterSpacing: '.06em' }}>{pa.label}</button>
          ))}
        </div>
      )}

      {pop.hasHint && <div style={{ marginTop: 10, padding: '10px 16px 12px', borderTop: '1px dashed rgba(21,20,15,.2)', fontSize: 10.5, color: '#6b6a62', lineHeight: 1.45 }}>{pop.hint}</div>}
      </div>
    </div>
  );
}
