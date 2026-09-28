// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function NeedsPill({ rv, inline }: { rv: any; inline?: boolean }) {
  const n: number = rv.needsCount;
  const has = n > 0;
  const label = has ? `${n} ${n === 1 ? 'thing needs' : 'things need'} you →` : 'All clear';
  return (
    <button
      onClick={has ? rv.openPipNeeds : undefined}
      disabled={!has}
      aria-label={label}
      style={{
        ...(inline ? { position: 'relative', pointerEvents: 'auto' } : { position: 'fixed', left: '50%', bottom: 16, transform: 'translateX(-50%)', zIndex: 520 }),
        minHeight: 48, padding: '0 22px', borderRadius: 24, border: has ? '2px solid #15140f' : '2px solid rgba(21,20,15,.3)',
        background: has ? '#15140f' : 'transparent', color: has ? '#f4f3ee' : '#6b6a62', fontWeight: 700, fontSize: 15,
        letterSpacing: '.01em', cursor: has ? 'pointer' : 'default', fontFamily: "'JetBrains Mono',monospace",
        boxShadow: has ? '0 6px 0 rgba(21,20,15,.18)' : 'none', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}
