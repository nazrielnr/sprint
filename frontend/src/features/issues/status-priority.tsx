import type { IssuePriority, IssueStatus } from "../../types";
import { STATUS_LABELS, PRIORITY_LABELS } from "../../types";
import { cn } from "../../lib/utils";

/**
 * Status & priority are shown as a colored icon + plain label (never a big
 * colored block). Every state has a different SHAPE, so color is never the
 * only signal.
 */

export const STATUS_COLOR: Record<IssueStatus, string> = {
  backlog: "text-sys-gray",
  todo: "text-sys-gray",
  in_progress: "text-sys-orange",
  in_review: "text-sys-purple",
  done: "text-sys-green",
  canceled: "text-sys-gray",
};

/** Solid fills for charts (breakdown bar). */
export const STATUS_FILL: Record<IssueStatus, string> = {
  backlog: "bg-sys-gray/40",
  todo: "bg-sys-gray/70",
  in_progress: "bg-sys-orange",
  in_review: "bg-sys-purple",
  done: "bg-sys-green",
  canceled: "bg-sys-gray/25",
};

export function StatusIcon({
  status,
  className,
}: {
  status: IssueStatus;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 16 16",
    fill: "none",
    "aria-hidden": true,
    className: cn("h-4 w-4 shrink-0", STATUS_COLOR[status], className),
  } as const;
  switch (status) {
    case "backlog":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 2.2" />
        </svg>
      );
    case "todo":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "in_progress":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 4a4 4 0 0 1 0 8z" fill="currentColor" />
        </svg>
      );
    case "in_review":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 4a4 4 0 1 1-4 4h4z" fill="currentColor" />
        </svg>
      );
    case "done":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M5 8.2l2 2L11 6" stroke="var(--bg-card)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "canceled":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
}

export function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-callout text-text">
      <StatusIcon status={status} />
      <span className={cn(status === "canceled" && "text-muted line-through")}>
        {STATUS_LABELS[status]}
      </span>
    </span>
  );
}

export const PRIORITY_COLOR: Record<IssuePriority, string> = {
  urgent: "text-sys-red",
  high: "text-sys-orange",
  medium: "text-sys-yellow",
  low: "text-sys-blue",
  no_priority: "text-sys-gray",
};

/** Signal-style bars; urgent is a filled alert square. */
export function PriorityIcon({
  priority,
  className,
}: {
  priority: IssuePriority;
  className?: string;
}) {
  const cls = cn("h-4 w-4 shrink-0", PRIORITY_COLOR[priority], className);
  if (priority === "urgent") {
    return (
      <svg viewBox="0 0 16 16" className={cls} aria-hidden="true">
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="currentColor" />
        <path d="M8 4.5v4.2" stroke="var(--bg-card)" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="8" cy="11.2" r="1" fill="var(--bg-card)" />
      </svg>
    );
  }
  if (priority === "no_priority") {
    return (
      <svg viewBox="0 0 16 16" className={cls} aria-hidden="true">
        <path d="M3 8h2.5M6.75 8h2.5M10.5 8H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  const level = { high: 3, medium: 2, low: 1 }[priority];
  return (
    <svg viewBox="0 0 16 16" className={cls} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2 + i * 4.5}
          y={10 - i * 3.5}
          width="3"
          height={4 + i * 3.5}
          rx="1"
          fill="currentColor"
          opacity={i < level ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-callout text-text">
      <PriorityIcon priority={priority} />
      <span className={cn(priority === "no_priority" && "text-muted")}>
        {PRIORITY_LABELS[priority]}
      </span>
    </span>
  );
}

/** Colored left bar used on board cards. */
export function PriorityBar({ priority }: { priority: IssuePriority }) {
  if (priority === "no_priority" || priority === "low") return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-current",
        PRIORITY_COLOR[priority],
      )}
    />
  );
}
