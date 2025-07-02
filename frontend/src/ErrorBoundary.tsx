/** @jsxImportSource @emotion/react */
import React from "react";
import type { ReactNode, ErrorInfo } from "react";
import {
  errorStyle,
  errorContainerStyle,
  errorTitleStyle,
  errorMessageStyle,
  retryButtonStyle,
} from "./ErrorBoundaryStyles";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, errorInfo: null, hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error, hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Update state with error info
    this.setState({ errorInfo });

    // In a production app, you would send this to an error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({ error: null, errorInfo: null, hasError: false });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div css={errorContainerStyle}>
          <div css={errorStyle}>
            <h2 css={errorTitleStyle}>Something went wrong</h2>
            <div css={errorMessageStyle}>
              <p>
                An unexpected error occurred. Please try refreshing the page or
                contact support if the problem persists.
              </p>
              {import.meta.env.DEV && this.state.error && (
                <details>
                  <summary>Error Details (Development)</summary>
                  <pre>{this.state.error.toString()}</pre>
                  {this.state.errorInfo && (
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  )}
                </details>
              )}
            </div>
            <button
              css={retryButtonStyle}
              onClick={this.handleRetry}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
