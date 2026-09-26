import { Component, type ErrorInfo, type ReactNode } from 'react';
import { KEY } from '../model/constants';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/** Guards `renderVals()` and the rest of the render tree. A blank page is worse than a message. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught', error, info);
  }

  startOver = () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
          background: '#f4f3ee', color: '#15140f', fontFamily: "'JetBrains Mono',monospace",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '.06em' }}>Something broke.</div>
        <button
          onClick={this.startOver}
          style={{
            minHeight: 44, padding: '0 18px', borderRadius: 10, border: '2px solid #15140f', background: '#15140f', color: '#f4f3ee',
            fontWeight: 800, fontSize: 12.5, letterSpacing: '.06em', cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace",
          }}
        >
          Start over
        </button>
      </div>
    );
  }
}
