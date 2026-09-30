import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CrimeMind ErrorBoundary] Uncaught exception:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#07080B',
            color: '#F0F2F8',
            fontFamily: "'Inter', sans-serif",
            padding: '2rem',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              background: 'rgba(16, 20, 30, 0.85)',
              border: '1px solid rgba(255, 42, 66, 0.45)',
              borderRadius: '12px',
              padding: '2.5rem',
              boxShadow: '0 0 30px rgba(255, 42, 66, 0.25)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 42, 66, 0.12)',
                border: '1px solid rgba(255, 42, 66, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                color: '#FF2A42',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#FFF' }}>
              CRIMEMIND DIAGNOSTIC RECOVERY
            </h2>
            <p style={{ color: '#9DA3B4', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              An interface subsystem encountered an unexpected state. Telemetry has logged the event.
            </p>

            {this.state.error && (
              <pre
                style={{
                  background: 'rgba(5, 7, 10, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '1rem',
                  fontSize: '0.8rem',
                  color: '#FF667A',
                  textAlign: 'left',
                  overflowX: 'auto',
                  marginBottom: '1.5rem',
                  fontFamily: 'monospace',
                }}
              >
                {this.state.error.toString()}
              </pre>
            )}

            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.href = '/';
              }}
              style={{
                background: 'linear-gradient(135deg, #FF2A42 0%, #D40816 100%)',
                color: '#FFF',
                border: 'none',
                padding: '0.65rem 1.5rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(255, 42, 66, 0.4)',
              }}
            >
              Reset to Command Center
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
