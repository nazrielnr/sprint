import * as React from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, Plus } from "lucide-react";
import {
  ISSUE_STATUSES,
  STATUS_LABELS,
  type DashboardProject,
  type Issue,
} from "../types";
import {
  errorMessage,
  useDashboardProjects,
  useIssueCounts,
  useIssues,
  useUsers,
} from "../hooks/queries";
import { PageHeader } from "../components/ui/page-header";
import { Button } from "../components/ui/button";
import { Skeleton, CardsSkeleton } from "../components/ui/skeleton";
import { ErrorState } from "../components/ui/states";
import { Card, CardHeader, CardTitle } from "../features/dashboard/card";
import { StatCard } from "../features/dashboard/stat-card";
import { ProgressRing } from "../features/dashboard/progress-ring";
import { ActivityList } from "../features/issues/activity";
import { CreateIssueDialog } from "../features/issues/create-issue-dialog";
import { DueDateChip } from "../features/issues/due-date-chip";
import { IssuePriorityPicker, IssueStatusPicker } from "../features/issues/pickers";
import { STATUS_FILL, StatusIcon } from "../features/issues/status-priority";
import { ProjectPicker } from "../features/issues/view-controls";

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function DashboardOverview() {
  const [params, setParams] = useSearchParams();
  const project = params.get("project") ?? undefined;
  const [createOpen, setCreateOpen] = React.useState(false);
  const { data: users } = useUsers();

  const setProject = (id: string | undefined) => {
    const next = new URLSearchParams(params);
    if (id) next.set("project", id);
    else next.delete("project");
    setParams(next, { replace: true });
  };

  // Links into Issues keep the project scope.
  const to = (extra: string) => {
    const q = new URLSearchParams(extra);
    if (project) q.set("project", project);
    const s = q.toString();
    return `/issues${s ? `?${s}` : ""}`;
  };

  const first = users?.[0]?.name.split(" ")[0];
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <PageHeader
        title={first ? `${greeting()}, ${first}` : greeting()}
        subtitle={date}
        actions={
          <>
            <ProjectPicker value={project} onChange={setProject} />
            <Button className="max-lg:hidden" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              New issue
            </Button>
          </>
        }
      />
      <div className="mx-auto max-w-[1200px] space-y-6 p-4 md:p-6">
        <Stats project={project} to={to} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <NeedsAttention project={project} to={to} />
          </div>
          <StatusBreakdown project={project} to={to} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProjectsGrid />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <Link to="/activity" className="text-callout font-medium text-accent hover:underline">
                See all
              </Link>
            </CardHeader>
            <div className="max-h-[22rem] overflow-y-auto p-2">
              <RecentActivity project={project} />
            </div>
          </Card>
        </div>
      </div>
      {createOpen && <CreateIssueDialog open onOpenChange={setCreateOpen} projectId={project} />}
    </>
  );
}

function Stats({ project, to }: { project?: string; to: (q: string) => string }) {
  const counts = useIssueCounts({ project_id: project });
  const overdue = useIssues({ project_id: project, overdue: true, limit: 1 });

  if (counts.isPending) return <CardsSkeleton count={4} />;
  if (!counts.data) {
    return <ErrorState message={errorMessage(counts.error)} onRetry={() => counts.refetch()} />;
  }
  const by = counts.data.by_status;
  const open = counts.data.total - by.done - by.canceled;
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      <StatCard label="Open" value={open} tone="accent" to={to("")} />
      <StatCard label="In progress" value={by.in_progress} tone="warning" to={to("status=in_progress")} />
      <StatCard
        label="Overdue"
        value={overdue.data?.total ?? 0}
        tone={(overdue.data?.total ?? 0) > 0 ? "danger" : "default"}
        to={to("overdue=1")}
      />
      <StatCard label="Done" value={by.done} tone="success" to={to("status=done")} />
    </div>
  );
}

/** What to do next: overdue first, then urgent issues that aren't finished. */
function NeedsAttention({ project, to }: { project?: string; to: (q: string) => string }) {
  const overdue = useIssues({ project_id: project, overdue: true, sort_by: "due_date", limit: 6 });
  const urgent = useIssues({ project_id: project, priority: "urgent", limit: 20 });

  const items = React.useMemo(() => {
    const seen = new Set<string>();
    const out: Issue[] = [];
    for (const i of [
      ...(overdue.data?.items ?? []),
      ...(urgent.data?.items ?? []).filter((i) => i.status !== "done" && i.status !== "canceled"),
    ]) {
      if (!seen.has(i.id)) {
        seen.add(i.id);
        out.push(i);
      }
    }
    return out.slice(0, 6);
  }, [overdue.data, urgent.data]);

  const pending = overdue.isPending || urgent.isPending;
  const error = overdue.error ?? urgent.error;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
        <Link to={to("overdue=1")} className="text-callout font-medium text-accent hover:underline">
          Overdue
        </Link>
      </CardHeader>
      {pending ? (
        <div role="status" aria-label="Loading" className="space-y-2 p-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4">
          <ErrorState message={errorMessage(error)} onRetry={() => (overdue.refetch(), urgent.refetch())} />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <CheckCircle2 className="h-8 w-8 text-sys-green" strokeWidth={1.5} />
          <p className="text-headline font-semibold text-text">You’re all caught up</p>
          <p className="text-callout text-muted">Nothing is overdue or urgent.</p>
        </div>
      ) : (
        <ul className="p-1.5">
          {items.map((issue) => (
            <li key={issue.id} className="flex items-center gap-1 rounded-control px-1 hover:bg-fill/60">
              <IssueStatusPicker issue={issue} iconOnly />
              <Link
                to={`/issues?issue=${issue.id}`}
                className="flex min-w-0 flex-1 items-center gap-2 py-2"
              >
                <span className="hidden font-mono text-caption text-muted sm:inline">{issue.issue_key}</span>
                <span className="truncate text-body font-medium text-text">{issue.title}</span>
              </Link>
              <DueDateChip issue={issue} />
              <IssuePriorityPicker issue={issue} iconOnly />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StatusBreakdown({ project, to }: { project?: string; to: (q: string) => string }) {
  const counts = useIssueCounts({ project_id: project });
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <div className="space-y-4 p-4">
        {counts.isPending ? (
          <Skeleton className="h-40" />
        ) : counts.isError || !counts.data ? (
          <ErrorState message={errorMessage(counts.error)} onRetry={() => counts.refetch()} />
        ) : (
          <>
            <div
              role="img"
              aria-label="Issues by status"
              className="flex h-2.5 overflow-hidden rounded-full bg-fill"
            >
              {ISSUE_STATUSES.map((s) => {
                const n = counts.data.by_status[s];
                return n > 0 ? (
                  <span
                    key={s}
                    className={STATUS_FILL[s]}
                    style={{ width: `${(n / counts.data.total) * 100}%` }}
                  />
                ) : null;
              })}
            </div>
            <ul>
              {ISSUE_STATUSES.map((s) => (
                <li key={s}>
                  <Link
                    to={to(`status=${s}`)}
                    className="flex h-9 items-center gap-2.5 rounded-control px-2 text-body hover:bg-fill"
                  >
                    <StatusIcon status={s} />
                    <span className="flex-1 text-text">{STATUS_LABELS[s]}</span>
                    <span className="tabular-nums text-muted">{counts.data.by_status[s]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}

function ProjectsGrid() {
  const query = useDashboardProjects();
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        <Link to="/projects" className="text-callout font-medium text-accent hover:underline">
          Manage
        </Link>
      </CardHeader>
      <div className="p-3">
        {query.isPending ? (
          <div role="status" aria-label="Loading projects" className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <p className="text-headline font-semibold text-text">No projects yet</p>
            <p className="text-callout text-muted">Create the first project to get started.</p>
            <Link to="/projects">
              <Button>Go to projects</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {query.data.items.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function ProjectCard({ project }: { project: DashboardProject }) {
  const pct = project.issue_count ? Math.round((project.done_count / project.issue_count) * 100) : 0;
  const open = project.issue_count - project.done_count;
  return (
    <Link
      to={`/issues?project=${project.id}`}
      className="press flex items-center gap-3 rounded-card bg-fill/60 p-3 hover:bg-fill"
    >
      <ProgressRing value={pct} color={project.color ?? "var(--blue)"} />
      <div className="min-w-0">
        <p className="truncate text-body font-semibold text-text">
          {project.name}
          {project.status === "archived" && <span className="ml-1.5 text-caption text-muted">Archived</span>}
        </p>
        <p className="text-callout text-muted">
          <span className="tabular-nums">{open}</span> open ·{" "}
          <span className="tabular-nums">{project.done_count}</span> done
        </p>
      </div>
    </Link>
  );
}

function RecentActivity({ project }: { project?: string }) {
  return <ActivityList projectId={project} limit={12} />;
}
