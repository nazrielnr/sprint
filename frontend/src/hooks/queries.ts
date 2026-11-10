import * as React from "react";
import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  activityService,
  dashboardService,
  issuesService,
  labelsService,
  projectsService,
  usersService,
  type IssueFilters,
} from "../services/endpoints";
import {
  ISSUE_STATUSES,
  type BoardColumn,
  type BoardData,
  type Issue,
  type IssueCounts,
  type IssueInput,
  type IssuePage,
  type IssueStatus,
  type ProjectInput,
} from "../types";
import { ApiError, deleteOnUnload } from "../services/api";
import { useToast } from "../components/ui/toast";

/** Entity list keys */
export const keys = {
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,
  issues: (filters: IssueFilters) => ["issues", filters] as const,
  issue: (id: string) => ["issues", id] as const,
  board: (filters: IssueFilters) => ["issues", "board", filters] as const,
  counts: (filters: IssueFilters) => ["issues", "counts", filters] as const,
  comments: (issueId: string) => ["comments", issueId] as const,
  users: ["users"] as const,
  labels: ["labels"] as const,
  activity: (projectId?: string, limit?: number) =>
    ["activity", { projectId, limit }] as const,
  dashboardStats: ["dashboard", "stats"] as const,
  dashboardActivity: ["dashboard", "activity"] as const,
  dashboardProjects: ["dashboard", "projects"] as const,
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function useProjects() {
  return useQuery({
    queryKey: keys.projects,
    queryFn: () => projectsService.list(),
    select: (data) => data.items,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: keys.project(id ?? ""),
    queryFn: () => projectsService.get(id!),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (input: ProjectInput) => projectsService.create(input),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: keys.projects });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      toast({
        kind: "success",
        title: "Project created",
        description: `${project.name} is ready`,
      });
    },
    onError: (error) => {
      toast({ kind: "error", title: "Failed to create project", description: errorMessage(error) });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProjectInput> }) =>
      projectsService.update(id, input),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: keys.projects });
      qc.invalidateQueries({ queryKey: keys.project(project.id) });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ kind: "success", title: "Project updated" });
    },
    onError: (error) => {
      toast({ kind: "error", title: "Failed to update project", description: errorMessage(error) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => projectsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.projects });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.removeQueries({ predicate: (q) => q.queryKey[0] === "issues" });
      toast({ kind: "success", title: "Project deleted", description: "Issues were removed too" });
    },
    onError: (error) => {
      toast({ kind: "error", title: "Failed to delete project", description: errorMessage(error) });
    },
  });
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export function useIssues(filters: IssueFilters) {
  return useQuery({
    queryKey: keys.issues(filters),
    queryFn: () => issuesService.list(filters),
    placeholderData: keepPreviousData,
  });
}

export function useIssueCounts(filters: IssueFilters) {
  return useQuery({
    queryKey: keys.counts(filters),
    queryFn: () => issuesService.counts(filters),
    placeholderData: keepPreviousData,
  });
}

export function useBoard(filters: IssueFilters) {
  return useQuery({
    queryKey: keys.board(filters),
    queryFn: () => issuesService.board(filters),
    placeholderData: keepPreviousData,
  });
}

export function useIssue(id: string | undefined) {
  return useQuery({
    queryKey: keys.issue(id ?? ""),
    queryFn: () => issuesService.get(id!),
    enabled: !!id,
  });
}

export function useCreateIssue(options: { silent?: boolean } = {}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (input: IssueInput) => issuesService.create(input),
    onSuccess: (issue) => {
      invalidateAll(qc);
      if (!options.silent) {
        toast({ kind: "success", title: "Issue created", description: issue.issue_key });
      }
    },
    onError: (error) => {
      toast({ kind: "error", title: "Failed to create issue", description: errorMessage(error) });
    },
  });
}

// ----- optimistic cache plumbing -------------------------------------------

type IssueCacheData = IssuePage | Issue | BoardData | IssueCounts;
type Snapshots = [readonly unknown[], IssueCacheData | undefined][];

const isPage = (d: IssueCacheData): d is IssuePage => "items" in d;
const isBoard = (d: IssueCacheData): d is BoardData => "columns" in d;
const isCounts = (d: IssueCacheData): d is IssueCounts => "by_status" in d;

function invalidateAll(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["issues"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["activity"] });
}

function mapColumns(
  data: BoardData,
  fn: (status: IssueStatus, col: BoardColumn) => BoardColumn,
): BoardData {
  const columns = { ...data.columns };
  for (const status of ISSUE_STATUSES) columns[status] = fn(status, data.columns[status]);
  return { columns };
}

/** Merge `patch` into an issue wherever it is cached. A status change moves it between board columns. */
function patchCache(data: IssueCacheData, id: string, patch: Partial<Issue>): IssueCacheData {
  if (isCounts(data)) return data; // refetched on settle
  if (isBoard(data)) {
    let found: Issue | undefined;
    let from: IssueStatus | undefined;
    for (const status of ISSUE_STATUSES) {
      const hit = data.columns[status].items.find((i) => i.id === id);
      if (hit) {
        found = hit;
        from = status;
      }
    }
    if (!found || !from) return data;
    const next = { ...found, ...patch };
    const to = next.status;
    if (to === from) {
      return mapColumns(data, (status, col) =>
        status === from ? { ...col, items: col.items.map((i) => (i.id === id ? next : i)) } : col,
      );
    }
    return mapColumns(data, (status, col) => {
      if (status === from) return { items: col.items.filter((i) => i.id !== id), total: col.total - 1 };
      if (status === to) return { items: [next, ...col.items], total: col.total + 1 };
      return col;
    });
  }
  if (isPage(data)) {
    const idx = data.items.findIndex((item) => item.id === id);
    if (idx < 0) return data;
    const items = data.items.slice();
    items[idx] = { ...items[idx], ...patch };
    return { ...data, items };
  }
  return data.id === id ? { ...data, ...patch } : data;
}

function removeFromCache(data: IssueCacheData, ids: Set<string>): IssueCacheData {
  if (isCounts(data)) return data;
  if (isBoard(data)) {
    return mapColumns(data, (_s, col) => {
      const items = col.items.filter((i) => !ids.has(i.id));
      return { items, total: col.total - (col.items.length - items.length) };
    });
  }
  if (isPage(data)) {
    const items = data.items.filter((i) => !ids.has(i.id));
    return { ...data, items, total: data.total - (data.items.length - items.length) };
  }
  return data;
}

/** Place an issue at `index` of a board column (index counts same-project cards, like the server). */
function moveInCache(data: IssueCacheData, id: string, status: IssueStatus, index: number): IssueCacheData {
  if (!isBoard(data)) return patchCache(data, id, { status });
  let found: Issue | undefined;
  let from: IssueStatus | undefined;
  for (const s of ISSUE_STATUSES) {
    const hit = data.columns[s].items.find((i) => i.id === id);
    if (hit) {
      found = hit;
      from = s;
    }
  }
  if (!found || !from) return data;
  const moved = { ...found, status };
  return mapColumns(data, (s, col) => {
    let items = col.items;
    let total = col.total;
    if (s === from) {
      items = items.filter((i) => i.id !== id);
      total -= 1;
    }
    if (s === status) {
      // Translate the project-relative index into a position in this (possibly mixed) list.
      const rest = items.filter((i) => i.id !== id);
      let seen = 0;
      let at = rest.length;
      for (let n = 0; n < rest.length; n++) {
        if (rest[n].project_id !== moved.project_id) continue;
        if (seen === index) {
          at = n;
          break;
        }
        seen++;
      }
      items = [...rest.slice(0, at), moved, ...rest.slice(at)];
      total += 1;
    }
    return { items, total };
  });
}

async function optimistic(
  qc: QueryClient,
  apply: (data: IssueCacheData) => IssueCacheData,
): Promise<Snapshots> {
  await qc.cancelQueries({ queryKey: ["issues"] });
  const snaps = qc.getQueriesData<IssueCacheData>({ queryKey: ["issues"] });
  qc.setQueriesData<IssueCacheData>({ queryKey: ["issues"] }, (d) => (d ? apply(d) : d));
  return snaps;
}

function rollback(qc: QueryClient, snaps: Snapshots) {
  for (const [key, data] of snaps) qc.setQueryData(key, data);
}

// ----- deletions are deferred so "Undo" is a real undo ----------------------

const UNDO_WINDOW_MS = 5000;
const pendingDeletes = new Map<string, number>(); // issue id -> timer

if (typeof window !== "undefined") {
  // Closing the tab inside the undo window must not silently keep the issue.
  window.addEventListener("pagehide", () => {
    for (const [id, timer] of pendingDeletes) {
      window.clearTimeout(timer);
      deleteOnUnload(`/issues/${id}`);
    }
    pendingDeletes.clear();
  });
}

const PATCH_KEYS = ["status", "priority", "assignee_id", "due_date", "title", "description", "label_ids"] as const;

function previousValues(issue: Issue, patch: Partial<IssueInput>): Partial<IssueInput> {
  const prev: Record<string, unknown> = {};
  for (const key of PATCH_KEYS) {
    if (key in patch) prev[key] = issue[key];
  }
  return prev as Partial<IssueInput>;
}

export interface FieldOptions {
  /** Toast title. Omit for silent saves (title/description typing). Setting it also adds Undo. */
  label?: string;
}

/**
 * Everything that changes issues, with instant (optimistic) UI:
 * edits roll back on failure, edits and deletes are undoable.
 */
export function useIssueActions() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const setField = React.useCallback(
    async (issue: Issue, patch: Partial<IssueInput>, options: FieldOptions = {}): Promise<boolean> => {
      const prev = previousValues(issue, patch);
      const snaps = await optimistic(qc, (d) => patchCache(d, issue.id, patch as Partial<Issue>));
      try {
        const saved = await issuesService.update(issue.id, patch);
        qc.setQueryData(keys.issue(issue.id), saved);
        if (options.label) {
          toast({
            kind: "success",
            title: options.label,
            description: issue.issue_key,
            action: {
              label: "Undo",
              onClick: () => {
                void setField({ ...issue, ...(patch as Partial<Issue>) }, prev);
              },
            },
          });
        }
        return true;
      } catch (error) {
        rollback(qc, snaps);
        toast({ kind: "error", title: "Could not update issue", description: errorMessage(error) });
        return false;
      } finally {
        invalidateAll(qc);
      }
    },
    [qc, toast],
  );

  const remove = React.useCallback(
    async (issues: Issue[]): Promise<void> => {
      if (issues.length === 0) return;
      const ids = new Set(issues.map((i) => i.id));
      const snaps = await optimistic(qc, (d) => removeFromCache(d, ids));
      const timer = window.setTimeout(async () => {
        for (const id of ids) pendingDeletes.delete(id);
        try {
          if (issues.length === 1) await issuesService.remove(issues[0].id);
          else await issuesService.bulkRemove([...ids]);
        } catch (error) {
          rollback(qc, snaps);
          toast({ kind: "error", title: "Could not delete", description: errorMessage(error) });
        } finally {
          invalidateAll(qc);
        }
      }, UNDO_WINDOW_MS + 600);
      for (const id of ids) pendingDeletes.set(id, timer);
      toast({
        kind: "success",
        title: issues.length === 1 ? `${issues[0].issue_key} deleted` : `${issues.length} issues deleted`,
        duration: UNDO_WINDOW_MS,
        action: {
          label: "Undo",
          onClick: () => {
            if (!pendingDeletes.has([...ids][0])) return; // already gone
            window.clearTimeout(timer);
            for (const id of ids) pendingDeletes.delete(id);
            rollback(qc, snaps);
            invalidateAll(qc);
          },
        },
      });
    },
    [qc, toast],
  );

  const bulkSet = React.useCallback(
    async (issues: Issue[], patch: Partial<IssueInput>, label: string): Promise<boolean> => {
      if (issues.length === 0) return true;
      const ids = issues.map((i) => i.id);
      const snaps = await optimistic(qc, (d) => {
        let next = d;
        for (const id of ids) next = patchCache(next, id, patch as Partial<Issue>);
        return next;
      });
      try {
        await issuesService.bulkUpdate(ids, patch);
        toast({
          kind: "success",
          title: label,
          description: `${issues.length} ${issues.length === 1 ? "issue" : "issues"}`,
          action: {
            label: "Undo",
            onClick: () => {
              void (async () => {
                const undoSnaps = await optimistic(qc, (d) => {
                  let next = d;
                  for (const i of issues) next = patchCache(next, i.id, previousValues(i, patch) as Partial<Issue>);
                  return next;
                });
                try {
                  await Promise.all(issues.map((i) => issuesService.update(i.id, previousValues(i, patch))));
                } catch (error) {
                  rollback(qc, undoSnaps);
                  toast({ kind: "error", title: "Could not undo", description: errorMessage(error) });
                } finally {
                  invalidateAll(qc);
                }
              })();
            },
          },
        });
        return true;
      } catch (error) {
        rollback(qc, snaps);
        toast({ kind: "error", title: "Could not update issues", description: errorMessage(error) });
        return false;
      } finally {
        invalidateAll(qc);
      }
    },
    [qc, toast],
  );

  /** Board drag & drop / "Move to…". `index` counts cards of the same project in the target column. */
  const move = React.useCallback(
    async (issue: Issue, status: IssueStatus, index: number): Promise<void> => {
      const snaps = await optimistic(qc, (d) => moveInCache(d, issue.id, status, index));
      try {
        await issuesService.move(issue.id, status, index);
      } catch (error) {
        rollback(qc, snaps);
        toast({ kind: "error", title: "Could not move issue", description: errorMessage(error) });
      } finally {
        invalidateAll(qc);
      }
    },
    [qc, toast],
  );

  return { setField, remove, bulkSet, move };
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export function useComments(issueId: string | undefined) {
  return useQuery({
    queryKey: keys.comments(issueId ?? ""),
    queryFn: () => issuesService.comments(issueId!),
    enabled: !!issueId,
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ issueId, content }: { issueId: string; content: string }) =>
      issuesService.addComment(issueId, content),
    onSuccess: (_comment, vars) => {
      qc.invalidateQueries({ queryKey: keys.comments(vars.issueId) });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: (error) => {
      toast({ kind: "error", title: "Failed to add comment", description: errorMessage(error) });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ commentId, issueId }: { commentId: string; issueId: string }) =>
      issuesService.removeComment(commentId).then(() => issueId),
    onSettled: (_data, _error, vars) => {
      qc.invalidateQueries({ queryKey: keys.comments(vars.issueId) });
    },
    onError: (error) => {
      toast({ kind: "error", title: "Failed to delete comment", description: errorMessage(error) });
    },
  });
}

// ---------------------------------------------------------------------------
// Users / labels / activity / dashboard
// ---------------------------------------------------------------------------

export function useUsers() {
  return useQuery({
    queryKey: keys.users,
    queryFn: () => usersService.list(),
    select: (data) => data.items,
  });
}

export function useLabels() {
  return useQuery({
    queryKey: keys.labels,
    queryFn: () => labelsService.list(),
    select: (data) => data.items,
  });
}

export function useActivity(projectId?: string, limit?: number) {
  return useQuery({
    queryKey: keys.activity(projectId, limit),
    queryFn: () => activityService.list(projectId, limit),
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: keys.dashboardStats,
    queryFn: () => dashboardService.stats(),
  });
}

export function useDashboardProjects() {
  return useQuery({
    queryKey: keys.dashboardProjects,
    queryFn: () => dashboardService.projects(),
  });
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: keys.dashboardActivity,
    queryFn: () => dashboardService.activity(),
  });
}

// ---------------------------------------------------------------------------
// Utils shared by features
// ---------------------------------------------------------------------------

export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
