import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-apple-bg dark:bg-apple-darkBg text-gray-900 dark:text-gray-100">
          <div className="max-w-md w-full p-8 rounded-3xl glass-panel shadow-apple-lg text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-apple-danger/10 text-apple-danger flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              An unexpected display error occurred. Please refresh the page to restore your session.
            </p>
            {this.state.error?.message && (
              <div className="w-full text-left p-3 mb-6 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-mono text-gray-600 dark:text-gray-300 overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <Button
              onClick={this.handleReload}
              icon={<RefreshCw className="w-4 h-4" />}
              className="w-full"
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

