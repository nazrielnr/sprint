import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { activityService } from "../../services/endpoints";
import type { Activity } from "../../types";
import { relativeTime } from "../../lib/date";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { keys, errorMessage } from "../../hooks/queries";
import { cn } from "../../lib/utils";

export function ActivityList({
  projectId,
  issueId,
  limit,
}: {
  projectId?: string;
  issueId?: string;
  limit?: number;
}) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["activity", { projectId, limit, issueId }] as const,
    queryFn: () => activityService.list(projectId, limit, issueId),
    select: (data) => data.items,
  });

  React.useEffect(() => {
    // Keep the shared activity cache warm for other consumers.
    qc.prefetchQuery({
      queryKey: keys.dashboardActivity,
      queryFn: () => activityService.list(undefined, 20),
    });
  }, [qc]);

  if (query.isPending) {
    return (
      <div role="status" aria-label="Loading activity" className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 rounded-control bg-fill px-3 py-2.5">
        <p className="text-callout text-muted">Failed to load activity: {errorMessage(query.error)}</p>
        <Button variant="secondary" size="sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const items = query.data ?? [];

  if (items.length === 0) {
    return <p className="px-2 py-6 text-center text-callout text-muted">No activity yet</p>;
  }

  return (
    <ul>
      {items.map((activity: Activity) => {
        const body = (
          <>
            <ActivityGlyph action={activity.action} />
            <div className="min-w-0 flex-1">
              <p className="text-callout text-text">{activity.description}</p>
              <p className="text-caption text-muted">{relativeTime(activity.created_at)}</p>
            </div>
          </>
        );
        const cls = "flex items-start gap-3 rounded-control px-2 py-2";
        return (
          <li key={activity.id}>
            {activity.issue_id && !issueId ? (
              <Link to={`/issues?issue=${activity.issue_id}`} className={cn(cls, "hover:bg-fill")}>
                {body}
              </Link>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ActivityGlyph({ action }: { action: string }) {
  const tone = action.includes("delete")
    ? "bg-sys-red"
    : action.includes("status")
      ? "bg-sys-orange"
      : action.includes("comment")
        ? "bg-sys-green"
        : action.includes("assign")
          ? "bg-sys-purple"
          : "bg-sys-blue";
  return <span aria-hidden="true" className={cn("mt-[7px] h-2 w-2 shrink-0 rounded-full", tone)} />;
}

export function IssueActivitySection({ issueId }: { issueId: string }) {
  return <ActivityList issueId={issueId} limit={50} />;
}
