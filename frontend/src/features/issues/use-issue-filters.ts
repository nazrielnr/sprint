import * as React from "react";
import { useSearchParams } from "react-router";
import type { IssuePriority, IssueStatus } from "../../types";
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "../../types";
import type { IssueFilters } from "../../services/endpoints";

/** URL param names. One vocabulary shared by Overview links, Issues, Board and the sidebar. */
const PARAM = {
  project: "project",
  status: "status",
  priority: "priority",
  assignee: "assignee",
  search: "q",
  overdue: "overdue",
  sort: "sort",
  page: "page",
} as const;

export interface UrlFilters {
  filters: IssueFilters;
  page: number;
  /** Merge a patch into the URL. `undefined` removes the param. Resets paging. */
  set: (patch: Partial<Omit<IssueFilters, "page" | "limit">>) => void;
  setPage: (page: number) => void;
  /** Clears everything except project and sort. */
  clear: () => void;
  hasActive: boolean;
}

/** Filters live in the URL so reload, back/forward and shared links keep the view. */
export function useIssueFilters(): UrlFilters {
  const [params, setParams] = useSearchParams();

  const status = params.get(PARAM.status);
  const priority = params.get(PARAM.priority);
  const filters: IssueFilters = React.useMemo(
    () => ({
      project_id: params.get(PARAM.project) ?? undefined,
      status: ISSUE_STATUSES.includes(status as IssueStatus) ? (status as IssueStatus) : undefined,
      priority: ISSUE_PRIORITIES.includes(priority as IssuePriority)
        ? (priority as IssuePriority)
        : undefined,
      assignee_id: params.get(PARAM.assignee) ?? undefined,
      search: params.get(PARAM.search) ?? undefined,
      overdue: params.get(PARAM.overdue) === "1" ? true : undefined,
      sort_by: params.get(PARAM.sort) ?? undefined,
    }),
    [params, status, priority],
  );
  const page = Math.max(1, Number(params.get(PARAM.page)) || 1);

  const set = React.useCallback<UrlFilters["set"]>(
    (patch) => {
      const next = new URLSearchParams(params);
      const write = (key: string, value: string | undefined) => {
        if (value) next.set(key, value);
        else next.delete(key);
      };
      if ("project_id" in patch) write(PARAM.project, patch.project_id);
      if ("status" in patch) write(PARAM.status, patch.status === "all" ? undefined : patch.status);
      if ("priority" in patch) write(PARAM.priority, patch.priority === "all" ? undefined : patch.priority);
      if ("assignee_id" in patch)
        write(PARAM.assignee, patch.assignee_id === "all" ? undefined : patch.assignee_id);
      if ("search" in patch) write(PARAM.search, patch.search?.trim() || undefined);
      if ("overdue" in patch) write(PARAM.overdue, patch.overdue ? "1" : undefined);
      if ("sort_by" in patch) write(PARAM.sort, patch.sort_by);
      next.delete(PARAM.page);
      next.delete("issue");
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const setPage = React.useCallback(
    (p: number) => {
      const next = new URLSearchParams(params);
      if (p > 1) next.set(PARAM.page, String(p));
      else next.delete(PARAM.page);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const clear = React.useCallback(() => {
    const next = new URLSearchParams(params);
    for (const key of [PARAM.status, PARAM.priority, PARAM.assignee, PARAM.search, PARAM.overdue, PARAM.page]) {
      next.delete(key);
    }
    setParams(next, { replace: true });
  }, [params, setParams]);

  const hasActive =
    !!filters.status ||
    !!filters.priority ||
    !!filters.assignee_id ||
    !!filters.search ||
    !!filters.overdue;

  return { filters, page, set, setPage, clear, hasActive };
}

/** `?issue=` — which issue's drawer is open. Opening pushes history so Back closes it. */
export function useOpenIssue(): [string | null, (id: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const id = params.get("issue");
  const open = React.useCallback(
    (next: string | null) => {
      const p = new URLSearchParams(params);
      if (next) p.set("issue", next);
      else p.delete("issue");
      setParams(p, { replace: next === null });
    },
    [params, setParams],
  );
  return [id, open];
}
