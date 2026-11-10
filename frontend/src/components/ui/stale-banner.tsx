import { RefreshCw } from "lucide-react";
import { Button } from "./button";

/** Shown when a refresh failed but we still have data to show: never blank the screen over a hiccup. */
export function StaleBanner({ onRetry, retrying }: { onRetry: () => void; retrying?: boolean }) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-control bg-sys-orange/15 px-3 py-2 text-callout text-text"
    >
      <span>Couldn’t refresh — showing the last loaded data.</span>
      <Button variant="ghost" size="sm" onClick={onRetry} disabled={retrying}>
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}
