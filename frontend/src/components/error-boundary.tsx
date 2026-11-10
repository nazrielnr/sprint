import * as React from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { Button } from "./ui/button";

function Fallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-title font-semibold text-text">Something broke</p>
      <p className="max-w-md text-callout text-muted">{message}</p>
      <div className="flex gap-2">
        <Button onClick={onRetry}>Try again</Button>
        <Button variant="secondary" onClick={() => window.location.assign("/")}>
          Go to Overview
        </Button>
      </div>
    </div>
  );
}

/** Catches render errors anywhere below it so one bad component can't blank the app. */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <Fallback
          message={this.state.error.message}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

/** Router-level errorElement (loader/render errors inside a route). */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unknown error";
  return <Fallback message={message} onRetry={() => window.location.reload()} />;
}
