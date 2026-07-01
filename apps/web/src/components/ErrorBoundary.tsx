"use client";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="card border-no/30 p-6">
            <p className="text-sm font-semibold text-no-bright">Something broke.</p>
            <p className="mt-1 text-xs text-zinc-400">{this.state.message}</p>
            <button
              className="btn-ghost mt-4"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
