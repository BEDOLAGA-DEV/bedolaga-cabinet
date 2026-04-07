import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  level?: 'app' | 'page' | 'widget';
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error): boolean {
  const msg = error.message || '';
  return (
    msg.includes('dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError') ||
    error.name === 'ChunkLoadError'
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);

    // Auto-reload on chunk load failures (stale deploy)
    if (isChunkLoadError(error)) {
      const reloadKey = 'chunk_reload_ts';
      const lastReload = Number(sessionStorage.getItem(reloadKey) || '0');
      const now = Date.now();
      // Prevent reload loop — only auto-reload once per 30 seconds
      if (now - lastReload > 30_000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
        return;
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { level = 'page' } = this.props;
    const isChunk = this.state.error ? isChunkLoadError(this.state.error) : false;

    if (level === 'app') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-dark-900 p-4">
          <div className="max-w-md text-center">
            <div className="mb-4 text-4xl">⚠️</div>
            <h1 className="mb-2 text-xl font-bold text-dark-50">Something went wrong</h1>
            <p className="mb-6 text-dark-400">
              An unexpected error occurred. Please try reloading the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-accent-500 px-6 py-3 font-medium text-white transition-colors hover:bg-accent-600"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    if (level === 'widget') {
      return (
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-4 text-center">
          <p className="text-sm text-error-400">Failed to load this section</p>
          <button
            onClick={this.handleReset}
            className="mt-2 text-sm text-accent-400 hover:text-accent-300"
          >
            Try again
          </button>
        </div>
      );
    }

    // level === 'page' (default)
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <h1 className="mb-2 text-xl font-bold text-dark-50">Something went wrong</h1>
          <p className="mb-6 text-sm text-dark-400">
            {isChunk
              ? 'App was updated. Reloading...'
              : this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-accent-500 px-6 py-3 font-medium text-white transition-colors hover:bg-accent-600"
          >
            {isChunk ? 'Reload' : 'Try again'}
          </button>
        </div>
      </div>
    );
  }
}
