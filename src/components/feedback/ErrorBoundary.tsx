import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-surface rounded-card border border-border m-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-semantic-danger-tint text-semantic-danger flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-text">Something went wrong</h2>
          <p className="text-xs text-text-muted mt-1 mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred while rendering this module.'}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={this.handleReset}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
