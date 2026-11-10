// API contract types — mirrors the backend /api/v1 contract.

export type IssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "canceled";

export type IssuePriority =
  | "urgent"
  | "high"
  | "medium"
  | "low"
  | "no_priority";

export type ProjectStatus = "active" | "archived";

export interface Issue {
  id: string;
  issue_key: string;
  project_id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  assignee_id: string | null;
  due_date: string | null; // YYYY-MM-DD
  label_ids: string[];
  position: number;
  created_at: string;
  updated_at: string;
}

export interface IssueCounts {
  total: number;
  by_status: Record<IssueStatus, number>;
}

export interface BoardColumn {
  items: Issue[];
  total: number;
}

export interface BoardData {
  columns: Record<IssueStatus, BoardColumn>;
}

export interface IssuePage {
  items: Issue[];
  total: number;
  page: number;
  limit: number;
}

export interface Project {
  id: string;
  name: string;
  identifier: string;
  description: string | null;
  color: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface DashboardProject extends Project {
  issue_count: number;
  done_count: number;
}

export interface DashboardStats {
  total_projects: number;
  total_issues: number;
  in_progress: number;
  completed: number;
  overdue: number;
  open: number;
}

export interface Activity {
  id: string;
  project_id: string | null;
  issue_id: string | null;
  action: string;
  description: string;
  created_at: string;
}

export interface Comment {
  id: string;
  issue_id: string;
  content: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface IssueInput {
  title: string;
  description?: string | null;
  status?: IssueStatus;
  priority?: IssuePriority;
  assignee_id?: string | null;
  due_date?: string | null;
  project_id?: string;
  label_ids?: string[];
}

export interface ProjectInput {
  name: string;
  identifier?: string;
  description?: string | null;
  color?: string | null;
  status?: ProjectStatus;
}

export const ISSUE_STATUSES: IssueStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
];

export const ISSUE_PRIORITIES: IssuePriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "no_priority",
];

export const STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  canceled: "Canceled",
};

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  no_priority: "No priority",
};
