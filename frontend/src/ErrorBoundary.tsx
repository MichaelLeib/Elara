import React from "react";
import type { ReactNode, ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // You can also log error info here
    console.error("ErrorBoundary caught an error:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ color: "red" }}>
          ErrorBoundary: {String(this.state.error)}
        </pre>
      );
    }
    return this.props.children;
  }
}
