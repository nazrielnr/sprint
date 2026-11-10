import type {
  Activity,
  BoardData,
  IssueCounts,
  Comment,
  DashboardProject,
  DashboardStats,
  Issue,
  IssueInput,
  IssuePage,
  IssuePriority,
  IssueStatus,
  Label,
  Project,
  ProjectInput,
  User,
} from "../types";
import { api, type QueryParams } from "./api";

export interface IssueFilters {
  project_id?: string;
  status?: IssueStatus | "all";
  priority?: IssuePriority | "all";
  assignee_id?: string | "all" | "unassigned";
  search?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
}

function issueQuery(filters: IssueFilters): QueryParams {
  const q: QueryParams = {
    project_id: filters.project_id,
    status: filters.status && filters.status !== "all" ? filters.status : undefined,
    priority:
      filters.priority && filters.priority !== "all" ? filters.priority : undefined,
    assignee_id:
      filters.assignee_id && filters.assignee_id !== "all"
        ? filters.assignee_id === "unassigned"
          ? "unassigned"
          : filters.assignee_id
        : undefined,
    search: filters.search,
    overdue: filters.overdue ? "true" : undefined,
    page: filters.page,
    limit: filters.limit,
    sort_by: filters.sort_by,
  };
  return q;
}

export const issuesService = {
  list(filters: IssueFilters) {
    return api.get<IssuePage>("/issues", issueQuery(filters));
  },
  counts(filters: IssueFilters) {
    // Counts are per status, so the status/paging/sort params don't apply.
    const q = issueQuery(filters);
    return api.get<IssueCounts>("/issues/counts", {
      ...q,
      status: undefined,
      page: undefined,
      limit: undefined,
      sort_by: undefined,
    });
  },
  board(filters: IssueFilters) {
    const q = issueQuery(filters);
    return api.get<BoardData>("/issues/board", {
      ...q,
      status: undefined,
      page: undefined,
      sort_by: undefined,
    });
  },
  move(id: string, status: IssueStatus, index: number) {
    return api.post<Issue>(`/issues/${id}/move`, { status, index });
  },
  bulkUpdate(ids: string[], patch: Partial<IssueInput>) {
    return api.patch<{ items: Issue[] }>("/issues/bulk", { ids, ...patch });
  },
  bulkRemove(ids: string[]) {
    return api.post<{ deleted: number }>("/issues/bulk/delete", { ids });
  },
  get(id: string) {
    return api.get<Issue>(`/issues/${id}`);
  },
  create(input: IssueInput) {
    return api.post<Issue>("/issues", input);
  },
  update(id: string, input: Partial<IssueInput>) {
    return api.patch<Issue>(`/issues/${id}`, input);
  },
  remove(id: string) {
    return api.del(`/issues/${id}`);
  },
  comments(issueId: string) {
    return api.get<{ items: Comment[] }>(`/issues/${issueId}/comments`);
  },
  addComment(issueId: string, content: string) {
    return api.post<Comment>(`/issues/${issueId}/comments`, { content });
  },
  updateComment(commentId: string, content: string) {
    return api.patch<Comment>(`/comments/${commentId}`, { content });
  },
  removeComment(commentId: string) {
    return api.del(`/comments/${commentId}`);
  },
};

export const projectsService = {
  list() {
    return api.get<{ items: Project[] }>("/projects");
  },
  get(id: string) {
    return api.get<Project>(`/projects/${id}`);
  },
  create(input: ProjectInput) {
    return api.post<Project>("/projects", input);
  },
  update(id: string, input: Partial<ProjectInput>) {
    return api.patch<Project>(`/projects/${id}`, input);
  },
  remove(id: string) {
    return api.del(`/projects/${id}`);
  },
};

export const dashboardService = {
  stats() {
    return api.get<DashboardStats>("/dashboard/stats");
  },
  projects() {
    return api.get<{ items: DashboardProject[] }>("/dashboard/projects");
  },
  activity() {
    return api.get<{ items: Activity[] }>("/dashboard/activity");
  },
};

export const activityService = {
  list(projectId?: string, limit?: number, issueId?: string) {
    return api.get<{ items: Activity[] }>("/activity", {
      project_id: projectId,
      issue_id: issueId,
      limit,
    });
  },
};

export const usersService = {
  list() {
    return api.get<{ items: User[] }>("/users");
  },
};

export const labelsService = {
  list() {
    return api.get<{ items: Label[] }>("/labels");
  },
};
