import { CalendarDays } from "lucide-react";
import type { Issue } from "../../types";
import { friendlyDate, isOverdue } from "../../lib/date";
import { cn } from "../../lib/utils";

/** Read-only due date: "Tomorrow", "Nov 12"; red when overdue. */
export function DueDateChip({ issue }: { issue: Pick<Issue, "due_date" | "status"> }) {
  if (!issue.due_date) return null;
  const overdue = isOverdue(issue.due_date, issue.status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-caption",
        overdue ? "font-medium text-red-text" : "text-muted",
      )}
      title={overdue ? `Overdue · ${issue.due_date}` : `Due ${issue.due_date}`}
    >
      <CalendarDays className="h-3 w-3" strokeWidth={1.75} />
      {friendlyDate(issue.due_date)}
    </span>
  );
}
