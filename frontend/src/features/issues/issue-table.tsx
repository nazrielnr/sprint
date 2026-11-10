import * as React from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Issue, Label } from "../../types";
import type { IssueFilters } from "../../services/endpoints";
import {
  errorMessage,
  useIssueActions,
  useIssues,
  useLabels,
  useProjects,
} from "../../hooks/queries";
import { useMedia } from "../../hooks/use-media";
import { TableSkeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { EmptyState, ErrorState } from "../../components/ui/states";
import { StaleBanner } from "../../components/ui/stale-banner";
import {
  IssueAssigneePicker,
  IssueDuePicker,
  IssuePriorityPicker,
  IssueStatusPicker,
} from "./pickers";
import { IssueMenu } from "./issue-menu";
import { BulkBar } from "./bulk-bar";
import { isTyping, overlayOpen } from "../../lib/keyboard";
import { cn } from "../../lib/utils";

export { ErrorState, EmptyState };

const PAGE_SIZE = 25;

type PickerKind = "status" | "priority" | "assignee" | "due";

export interface IssueTableProps {
  filters: IssueFilters;
  page: number;
  onPageChange: (page: number) => void;
  onOpen: (issue: Issue) => void;
  /** Link target for a title (real <a>, so open-in-new-tab / copy-link work). */
  issueHref?: (issue: Issue) => string;
  showProject?: boolean;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onCreate?: () => void;
}

export function IssueTable({
  filters,
  page,
  onPageChange,
  onOpen,
  issueHref,
  showProject = true,
  hasActiveFilters = false,
  onClearFilters,
  onCreate,
}: IssueTableProps) {
  const query = useIssues({ ...filters, page, limit: PAGE_SIZE });
  const { data: labels } = useLabels();
  const { data: projects } = useProjects();
  const { remove } = useIssueActions();
  const wide = useMedia("(min-width: 768px)");
  const xwide = useMedia("(min-width: 1024px)");

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [picker, setPicker] = React.useState<{ id: string; kind: PickerKind } | null>(null);

  // Selection only makes sense for rows that are still on screen.
  React.useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(items.map((i) => i.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
    if (focusId && !items.some((i) => i.id === focusId)) setFocusId(null);
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedIssues = items.filter((i) => selected.has(i.id));
  const projectById = React.useMemo(
    () => new Map((projects ?? []).map((p) => [p.id, p])),
    [projects],
  );

  // Keyboard: j/k move, Enter opens, x selects, s/p/a/d edit, ⌫ deletes, Esc clears.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || overlayOpen()) return;
      if (items.length === 0) return;
      const idx = items.findIndex((i) => i.id === focusId);
      const current = idx >= 0 ? items[idx] : undefined;
      const move = (to: number) => {
        e.preventDefault();
        setFocusId(items[Math.max(0, Math.min(items.length - 1, to))].id);
      };
      switch (e.key) {
        case "j":
        case "ArrowDown":
          return move(idx + 1);
        case "k":
        case "ArrowUp":
          return move(idx < 0 ? 0 : idx - 1);
        case "Enter":
        case "o":
          if (current) {
            e.preventDefault();
            onOpen(current);
          }
          return;
        case "x":
          if (current) {
            e.preventDefault();
            toggle(current.id);
          }
          return;
        case "s":
        case "p":
        case "a":
        case "d":
          if (current) {
            e.preventDefault();
            const kind = ({ s: "status", p: "priority", a: "assignee", d: "due" } as const)[e.key];
            setPicker({ id: current.id, kind });
          }
          return;
        case "Backspace":
        case "Delete":
        case "#": {
          const targets = selectedIssues.length ? selectedIssues : current ? [current] : [];
          if (targets.length) {
            e.preventDefault();
            void remove(targets);
            setSelected(new Set());
          }
          return;
        }
        case "Escape":
          if (selected.size) setSelected(new Set());
          else setFocusId(null);
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, focusId, selected, selectedIssues, onOpen, remove]);

  React.useEffect(() => {
    if (!focusId) return;
    document
      .querySelector<HTMLElement>(`[data-row-id="${focusId}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [focusId]);

  if (query.isPending) return <TableSkeleton rows={8} cols={5} />;
  if (query.isError && !query.data)
    return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />;
  if (items.length === 0 && !query.isPlaceholderData) {
    return (
      <EmptyState
        hasFilters={hasActiveFilters}
        createLabel="issue"
        onCreate={onCreate}
        onClear={onClearFilters}
      />
    );
  }

  const allSelected = items.length > 0 && selected.size === items.length;
  const pickerOpen = (issue: Issue, kind: PickerKind) => ({
    open: picker?.id === issue.id && picker.kind === kind,
    onOpenChange: (open: boolean) => setPicker(open ? { id: issue.id, kind } : null),
  });

  return (
    <div className="space-y-3">
      {query.isError && <StaleBanner onRetry={() => query.refetch()} retrying={query.isFetching} />}
      {!wide ? (
      <ul
        aria-label="Issues"
        className={cn("space-y-2 transition-opacity", query.isPlaceholderData && "opacity-60")}
      >
        {items.map((issue) => {
          const isSel = selected.has(issue.id);
          return (
            <li
              key={issue.id}
              data-row-id={issue.id}
              onClick={() => onOpen(issue)}
              className={cn(
                "rounded-card bg-surface p-3 shadow-card",
                isSel && "bg-accent-soft",
              )}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  aria-label={`Select ${issue.issue_key}`}
                  checked={isSel}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggle(issue.id)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-caption text-muted">{issue.issue_key}</p>
                  {issueHref ? (
                    <Link
                      to={issueHref(issue)}
                      onClick={(e) => e.stopPropagation()}
                      className="line-clamp-2 text-body font-medium text-text"
                    >
                      {issue.title}
                    </Link>
                  ) : (
                    <p className="line-clamp-2 text-body font-medium text-text">{issue.title}</p>
                  )}
                </div>
                <span onClick={(e) => e.stopPropagation()}>
                  <IssueMenu issue={issue} onOpen={onOpen} />
                </span>
              </div>
              <div className="-ml-1.5 mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 pl-8">
                <IssueStatusPicker issue={issue} />
                <IssuePriorityPicker issue={issue} iconOnly />
                <IssueAssigneePicker issue={issue} iconOnly />
                <IssueDuePicker issue={issue} />
              </div>
            </li>
          );
        })}
      </ul>
      ) : (
      <div
        className={cn(
          "overflow-x-auto rounded-card bg-surface shadow-card transition-opacity",
          query.isPlaceholderData && "opacity-60",
        )}
      >
        <table className="w-full text-body">
          <thead>
            <tr className="hairline-b border-b border-border text-left text-caption font-medium text-muted">
              <th className="w-10 py-2.5 pl-3">
                <input
                  type="checkbox"
                  aria-label="Select all issues on this page"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))}
                  className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
                />
              </th>
              {wide && <th className="px-2 py-2.5 font-medium">Key</th>}
              <th className="px-2 py-2.5 font-medium">Title</th>
              <th className="px-2 py-2.5 font-medium">Status</th>
              <th className="px-2 py-2.5 font-medium">Priority</th>
              {xwide && showProject && <th className="px-2 py-2.5 font-medium">Project</th>}
              {wide && <th className="px-2 py-2.5 font-medium">Assignee</th>}
              {xwide && <th className="px-2 py-2.5 font-medium">Due</th>}
              <th className="w-10 py-2.5 pr-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((issue) => {
              const isSel = selected.has(issue.id);
              const project = projectById.get(issue.project_id);
              return (
                <tr
                  key={issue.id}
                  data-row-id={issue.id}
                  aria-selected={isSel}
                  onClick={() => {
                    setFocusId(issue.id);
                    onOpen(issue);
                  }}
                  className={cn(
                    "group hairline-b cursor-pointer border-b border-border last:border-b-0 hover:bg-fill/60",
                    isSel && "bg-accent-soft hover:bg-accent-soft",
                    focusId === issue.id && "bg-fill/70 shadow-[inset_3px_0_0_var(--accent)]",
                  )}
                >
                  <td className="py-1.5 pl-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${issue.issue_key}`}
                      checked={isSel}
                      onChange={() => toggle(issue.id)}
                      className={cn(
                        "h-4 w-4 cursor-pointer accent-[var(--accent)] transition-opacity",
                        !isSel && selected.size === 0 && "md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
                      )}
                    />
                  </td>
                  {wide && (
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono text-caption text-muted">
                      {issue.issue_key}
                    </td>
                  )}
                  <td className="w-full max-w-0 px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      {issueHref ? (
                        <Link
                          to={issueHref(issue)}
                          onClick={(e) => e.stopPropagation()}
                          className="truncate font-medium text-text hover:underline"
                        >
                          {issue.title}
                        </Link>
                      ) : (
                        <span className="truncate font-medium text-text">{issue.title}</span>
                      )}
                      <LabelChips labelIds={issue.label_ids} labels={labels} />
                    </div>
                  </td>
                  <td className="px-1 py-1">
                    <IssueStatusPicker issue={issue} iconOnly={!wide} {...pickerOpen(issue, "status")} />
                  </td>
                  <td className="px-1 py-1">
                    <IssuePriorityPicker issue={issue} iconOnly={!wide} {...pickerOpen(issue, "priority")} />
                  </td>
                  {xwide && showProject && (
                    <td className="whitespace-nowrap px-2 py-1.5 text-callout text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: project?.color ?? "var(--blue)" }}
                        />
                        {project?.name ?? issue.issue_key.split("-")[0]}
                      </span>
                    </td>
                  )}
                  {wide && (
                    <td className="px-1 py-1">
                      <IssueAssigneePicker issue={issue} {...pickerOpen(issue, "assignee")} />
                    </td>
                  )}
                  {xwide && (
                    <td className="px-1 py-1">
                      <IssueDuePicker issue={issue} {...pickerOpen(issue, "due")} />
                    </td>
                  )}
                  <td className="py-1 pr-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <IssueMenu issue={issue} onOpen={onOpen} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      <div className="flex items-center justify-between px-1 text-callout text-muted">
        <span aria-live="polite">
          {total} {total === 1 ? "issue" : "issues"}
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="tabular-nums">
              {page} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next page"
              disabled={page >= pageCount}
              onClick={() => onPageChange(Math.min(pageCount, page + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <BulkBar selected={selectedIssues} onClear={() => setSelected(new Set())} />
    </div>
  );
}

function LabelChips({ labelIds, labels }: { labelIds: string[]; labels?: Label[] }) {
  const resolved = labelIds
    .map((id) => labels?.find((l) => l.id === id))
    .filter((l): l is Label => !!l);
  if (!resolved.length) return null;
  return (
    <span className="hidden shrink-0 items-center gap-1 sm:inline-flex">
      {resolved.slice(0, 2).map((label) => (
        <span
          key={label.id}
          className="inline-flex items-center gap-1 rounded-full bg-fill px-2 py-0.5 text-caption text-muted"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: label.color }} />
          {label.name}
        </span>
      ))}
      {resolved.length > 2 && <span className="text-caption text-muted">+{resolved.length - 2}</span>}
    </span>
  );
}
