import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let displayMessage = error?.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(displayMessage) as {
        error?: string;
        operationType?: string;
        path?: string;
      };
      if (parsed && typeof parsed === 'object' && parsed.error) {
        displayMessage = parsed.error.includes('Missing or insufficient permissions')
          ? `Access denied (${parsed.operationType ?? 'read'} on ${parsed.path ?? 'database'}). Please sign in with a verified account or check permissions.`
          : parsed.error;
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, message: displayMessage };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F5F5] p-6 text-[#111817] dark:bg-[#0B1010] dark:text-[#EAF0EF]">
        <div className="w-full max-w-md rounded-2xl border border-[#DCE2E1] bg-white p-6 text-center shadow-xl dark:border-[#263130] dark:bg-[#131A1A]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-[#0E1715] dark:text-white">
            Something went wrong
          </h1>
          <p className="mt-2 break-words text-sm text-[#5C6665] dark:text-[#98A4A2]">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, message: '' });
              window.location.reload();
            }}
            className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#7FE85B] px-5 py-2.5 text-sm font-semibold text-[#082213] hover:bg-[#6AD845]"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reload OOSAB</span>
          </button>
        </div>
      </div>
    );
  }
}
