import { useState } from 'react';
import { plural } from '../model/constants';

const isPhone = () => typeof window !== 'undefined' && window.innerWidth <= 600;

const cardStyle: React.CSSProperties = { flex: 'none', background: '#fbfaf5', border: '2.5px solid #15140f', borderRadius: 14, padding: '12px 14px 13px', boxShadow: '0 4px 0 rgba(21,20,15,.12)' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FeedCard({ c }: { c: any }) {
  return (
    <div data-feed-card={c.kind} style={{ ...cardStyle, opacity: c.op, transform: `translateX(${c.tx}px)` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{ flex: 'none', fontSize: 9, fontWeight: 800, letterSpacing: '.08em', padding: '2px 6px', borderRadius: 5, border: '1.5px solid #15140f', background: c.kbg, color: c.kfg }}>{c.kind}</span>
          <span style={{ fontWeight: 800, fontSize: 10.5, letterSpacing: '.08em', whiteSpace: 'nowrap', flex: 'none' }}>{c.path}</span>
        </span>
        <span style={{ fontWeight: 600, fontSize: 10, color: '#6b6a62', flex: 'none' }}>{c.ago}</span>
      </div>
      <div style={{ fontWeight: 500, fontSize: 15, lineHeight: 1.5 }}>
        <span style={{ fontWeight: 800 }}>{c.who}</span>{c.text}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Feed({ rv }: { rv: any }) {
  const [doneOpen, setDoneOpen] = useState(false);
  if (rv.feedClosed) {
    return (
      <button
        onClick={rv.toggleFeed}
        style={{ position: 'fixed', right: 18, top: 16, zIndex: 600, display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 14px', background: '#fbfaf5', border: '2.5px solid #15140f', borderRadius: 12, fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 13, letterSpacing: '.1em', color: '#15140f', cursor: 'pointer', boxShadow: '0 4px 0 rgba(21,20,15,.15)' }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#15140f', opacity: rv.liveOp }} />
        VIC → YOU
      </button>
    );
  }
  const phone = isPhone();
  const panelStyle: React.CSSProperties = phone
    ? { position: 'fixed', left: 0, right: 0, bottom: 0, top: 'auto', width: '100%', maxHeight: '55vh', zIndex: 600, display: 'flex', flexDirection: 'column', background: '#f4f3ee', border: '3px solid #15140f', borderBottom: 'none', borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 0 rgba(21,20,15,.1)', overflow: 'hidden', fontFamily: "'JetBrains Mono',monospace", color: '#15140f' }
    : { position: 'fixed', right: 16, top: 16, bottom: 16, width: 340, maxWidth: 'calc(100vw - 32px)', zIndex: 600, display: 'flex', flexDirection: 'column', background: '#f4f3ee', border: '3px solid #15140f', borderRadius: 24, boxShadow: '0 12px 0 rgba(21,20,15,.1)', overflow: 'hidden', fontFamily: "'JetBrains Mono',monospace", color: '#15140f' };
  return (
    <div data-bottom-sheet={phone ? 'true' : undefined} style={panelStyle}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px 13px', background: '#fbfaf5', borderBottom: '2.5px solid #15140f' }}>
        <span style={{ width: 30, height: 30, background: '#15140f', borderRadius: 8, position: 'relative', flex: 'none' }}>
          <span style={{ position: 'absolute', left: 8, top: 11, width: 5, height: 6, background: '#f4f3ee', borderRadius: 1.5 }} />
          <span style={{ position: 'absolute', left: 17, top: 11, width: 5, height: 6, background: '#f4f3ee', borderRadius: 1.5 }} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '.1em' }}>VIC → YOU</div>
          <div style={{ fontWeight: 500, fontSize: 10.5, color: '#6b6a62', marginTop: 2 }}>
            {rv.teamCount} {rv.teamCount === 1 ? 'team' : 'teams'} · {rv.mgrCount} {rv.mgrCount === 1 ? 'manager' : 'managers'} · {rv.furnCount} {rv.furnCount === 1 ? 'object' : 'objects'}
          </div>
        </div>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#15140f', opacity: rv.liveOp }} />
        <button onClick={rv.toggleFeed} aria-label="Close" style={{ width: 44, height: 44, border: '2px solid #15140f', borderRadius: 10, background: 'transparent', fontWeight: 800, fontSize: 17, color: '#15140f', cursor: 'pointer' }}>×</button>
      </div>
      <div aria-live="polite" style={{ flex: 1, overflow: 'auto', padding: '14px 14px 30px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* U13: open asks are pinned at the top, with their own action buttons. */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {rv.pinnedAsks.map((nd: any, i: number) => (
          <div key={'ask' + i} data-pinned-ask="true" style={{ ...cardStyle, border: '2.5px solid #15140f', background: '#fff8e6' }}>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: '.08em', color: '#6b6a62', marginBottom: 6 }}>{nd.path}</div>
            <div style={{ fontWeight: 500, fontSize: 15, lineHeight: 1.5, marginBottom: 9 }}>{nd.text}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {nd.acts.map((ac: any, j: number) => (
                <button key={j} onClick={ac.go} style={{ minHeight: 44, padding: '0 14px', borderRadius: 8, border: '2px solid #15140f', background: ac.bg, color: ac.fg, fontWeight: 800, fontSize: 13, letterSpacing: '.04em', cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace" }}>{ac.label}</button>
              ))}
            </div>
          </div>
        ))}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {rv.cards.map((c: any) => <FeedCard key={c.id} c={c} />)}
        {/* U13: DONE cards fold into one row instead of crowding the feed. */}
        {rv.doneCount > 0 && (
          <button
            onClick={() => setDoneOpen((v) => !v)}
            data-done-fold="true"
            style={{ ...cardStyle, minHeight: 44, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: "'JetBrains Mono',monospace", color: '#15140f' }}
          >
            <span style={{ fontWeight: 500, fontSize: 12.5 }}>{plural(rv.doneCount, 'thing')} done in the last few minutes</span>
            <span style={{ fontWeight: 800 }}>{doneOpen ? '▾' : '▸'}</span>
          </button>
        )}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {doneOpen && rv.doneCards.map((c: any) => <FeedCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}
