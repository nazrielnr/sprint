import type { ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "./button";

/** One error / empty pattern for the whole app. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-card bg-surface px-6 py-12 text-center shadow-card">
      <AlertCircle className="h-8 w-8 text-sys-red" strokeWidth={1.5} />
      <div>
        <p className="text-headline font-semibold text-text">Something went wrong</p>
        <p className="mt-1 max-w-md text-callout text-muted">{message}</p>
      </div>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function EmptyState({
  hasFilters,
  createLabel,
  onCreate,
  onClear,
  createIcon,
  title,
  description,
}: {
  hasFilters: boolean;
  createLabel: string;
  onCreate?: () => void;
  onClear?: () => void;
  createIcon?: ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-surface px-6 py-14 text-center shadow-card">
      <Inbox className="h-8 w-8 text-muted" strokeWidth={1.5} />
      <div>
        <p className="text-headline font-semibold text-text">
          {title ?? (hasFilters ? `No matching ${createLabel}s` : `No ${createLabel}s yet`)}
        </p>
        <p className="mt-1 text-callout text-muted">
          {description ??
            (hasFilters
              ? "Try a different search or clear the filters."
              : `Create the first ${createLabel} to get started.`)}
        </p>
      </div>
      {hasFilters && onClear && (
        <Button variant="secondary" onClick={onClear}>
          Clear filters
        </Button>
      )}
      {!hasFilters && onCreate && (
        <Button onClick={onCreate}>
          {createIcon}
          New {createLabel}
        </Button>
      )}
    </div>
  );
}
