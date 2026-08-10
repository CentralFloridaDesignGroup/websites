import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorLandingPage } from "./ErrorLandingPage";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  error: unknown;
};

/** Catches render-time failures and gives the user a recoverable Northstar page. */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Northstar application error", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorLandingPage variant="application-error" error={this.state.error} />;
    }

    return this.props.children;
  }
}
