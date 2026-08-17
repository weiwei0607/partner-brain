import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Unhandled error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '24px',
          textAlign: 'center', background: '#FDFCF7', color: '#1C1511',
        }}>
          <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>出了一點問題</p>
          <p style={{ fontSize: '13px', color: '#8a8078', marginBottom: '20px' }}>
            頁面發生非預期錯誤，重新整理通常就能解決。
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px', borderRadius: '12px', background: '#F43F5E',
              color: 'white', fontSize: '13px', fontWeight: 600, border: 'none',
            }}
          >
            重新整理
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
