import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import {
  ISSUE_STATUSES,
  STATUS_LABELS,
  type BoardColumn,
  type BoardData,
  type Issue,
  type IssueStatus,
} from "../../types";
import type { IssueFilters } from "../../services/endpoints";
import {
  errorMessage,
  useBoard,
  useCreateIssue,
  useIssueActions,
  useProjects,
} from "../../hooks/queries";
import { Skeleton } from "../../components/ui/skeleton";
import { ErrorState } from "../../components/ui/states";
import { StaleBanner } from "../../components/ui/stale-banner";
import { Button } from "../../components/ui/button";
import { StatusIcon, PriorityIcon } from "../issues/status-priority";
import { AssigneeDot } from "../issues/assignee";
import { DueDateChip } from "../issues/due-date-chip";
import { IssueMenu } from "../issues/issue-menu";
import { cn } from "../../lib/utils";

const PAGE = 50;

/**
 * Keyboard dragging. ↑/↓ reorder inside a column (dnd-kit's default);
 * ←/→ jump to the neighbouring column, landing next to the card at the same height.
 */
function makeBoardKeyboardCoordinates(
  getColumns: () => BoardData["columns"] | null,
): KeyboardCoordinateGetter {
  return (event, args) => {
    const columns = getColumns();
    if ((event.code !== "ArrowLeft" && event.code !== "ArrowRight") || !columns) {
      return sortableKeyboardCoordinates(event, args);
    }
    event.preventDefault();
    const { active, over, droppableRects, collisionRect } = args.context;
    if (!active || !collisionRect) return;

    const statusOf = (id: string): IssueStatus | undefined => {
      if (id.startsWith("col:")) return id.slice(4) as IssueStatus;
      return ISSUE_STATUSES.find((s) => columns[s].items.some((i) => i.id === id));
    };
    const current = statusOf(String(over?.id ?? active.id));
    if (!current) return;
    const target = ISSUE_STATUSES[ISSUE_STATUSES.indexOf(current) + (event.code === "ArrowRight" ? 1 : -1)];
    if (!target) return;

    let best: { top: number; left: number; dist: number } | undefined;
    for (const issue of columns[target].items) {
      const rect = droppableRects.get(issue.id);
      if (!rect) continue;
      const dist = Math.abs(rect.top - collisionRect.top);
      if (!best || dist < best.dist) best = { top: rect.top, left: rect.left, dist };
    }
    if (!best) {
      const rect = droppableRects.get(`col:${target}`);
      if (!rect) return;
      best = { top: rect.top, left: rect.left, dist: 0 };
    }
    return { x: best.left, y: best.top };
  };
}

export function Board({
  filters,
  onOpen,
  onCreateIn,
}: {
  filters: IssueFilters;
  onOpen: (issue: Issue) => void;
  onCreateIn?: (status: IssueStatus) => void;
}) {
  const [limit, setLimit] = React.useState(PAGE);
  const query = useBoard({ ...filters, limit });
  const { move } = useIssueActions();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const columnsRef = React.useRef<BoardData["columns"] | null>(null);
  columnsRef.current = query.data?.columns ?? null;
  const keyboardCoordinates = React.useMemo(
    () => makeBoardKeyboardCoordinates(() => columnsRef.current),
    [],
  );

  const sensors = useSensors(
    // Mouse and touch get separate sensors: PointerSensor also fires for touch and the browser then
    // steals the gesture for scrolling, which cancels the drag.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press to drag on touch so horizontal scrolling still works.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
      // Enter is reserved for "open"; Space picks up / drops.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  if (query.isPending) {
    return (
      <div role="status" aria-label="Loading board" className="flex h-full gap-3 overflow-hidden">
        {ISSUE_STATUSES.slice(0, 4).map((s) => (
          <Skeleton key={s} className="h-64 w-72 shrink-0 rounded-card" />
        ))}
      </div>
    );
  }
  if (query.isError && !query.data) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />;
  }

  const columns = query.data.columns;
  const find = (id: string): { issue: Issue; status: IssueStatus } | undefined => {
    for (const status of ISSUE_STATUSES) {
      const issue = columns[status].items.find((i) => i.id === id);
      if (issue) return { issue, status };
    }
  };
  const activeIssue = activeId ? find(activeId)?.issue : undefined;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const from = find(String(active.id));
    if (!from) return;

    let toStatus: IssueStatus;
    let insertAt: number; // index in the target column (display order), active excluded
    const overId = String(over.id);
    if (overId.startsWith("col:")) {
      toStatus = overId.slice(4) as IssueStatus;
      insertAt = columns[toStatus].items.filter((i) => i.id !== from.issue.id).length;
    } else {
      const target = find(overId);
      if (!target) return;
      toStatus = target.status;
      insertAt = columns[toStatus].items.findIndex((i) => i.id === overId);
    }

    const rest = columns[toStatus].items.filter((i) => i.id !== from.issue.id);
    const currentIndex = columns[from.status].items.findIndex((i) => i.id === from.issue.id);
    if (toStatus === from.status && insertAt === currentIndex) return; // dropped where it was

    // The server orders each (project, status) column; count only same-project cards before the slot.
    const serverIndex = rest
      .slice(0, insertAt)
      .filter((i) => i.project_id === from.issue.project_id).length;
    void move(from.issue, toStatus, serverIndex);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full flex-col gap-2">
      {query.isError && <StaleBanner onRetry={() => query.refetch()} retrying={query.isFetching} />}
      <div
        className={cn(
          "flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:snap-none",
          query.isPlaceholderData && "opacity-70 transition-opacity",
        )}
      >
        {ISSUE_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            column={columns[status]}
            filters={filters}
            onOpen={onOpen}
            onCreateIn={onCreateIn}
            onLoadMore={() => setLimit((l) => l + PAGE)}
          />
        ))}
      </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.32, 0.72, 0, 1)" }}>
        {activeIssue ? <CardBody issue={activeIssue} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  column,
  filters,
  onOpen,
  onCreateIn,
  onLoadMore,
}: {
  status: IssueStatus;
  column: BoardColumn;
  filters: IssueFilters;
  onOpen: (issue: Issue) => void;
  onCreateIn?: (status: IssueStatus) => void;
  onLoadMore: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const [adding, setAdding] = React.useState(false);
  const remaining = column.total - column.items.length;

  return (
    <section
      aria-label={`${STATUS_LABELS[status]}, ${column.total} issues`}
      className="flex h-full w-[82vw] shrink-0 snap-center flex-col rounded-card bg-fill/60 sm:w-72 md:snap-align-none"
    >
      <header className="flex items-center gap-2 px-3 py-2.5">
        <StatusIcon status={status} />
        <h2 className="text-callout font-semibold text-text">{STATUS_LABELS[status]}</h2>
        <span className="text-callout tabular-nums text-muted">{column.total}</span>
        <Button
          variant="ghost"
          size="iconSm"
          className="ml-auto"
          aria-label={`Add issue to ${STATUS_LABELS[status]}`}
          onClick={() => setAdding(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "mx-1.5 mb-1.5 flex min-h-[3rem] flex-1 flex-col gap-2 overflow-y-auto rounded-control p-1 transition-colors",
          isOver && "bg-accent-soft",
        )}
      >
        <SortableContext items={column.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {column.items.map((issue) => (
            <SortableCard key={issue.id} issue={issue} onOpen={onOpen} />
          ))}
        </SortableContext>

        {column.items.length === 0 && !adding && (
          <p className="px-2 py-4 text-center text-callout text-muted">No issues</p>
        )}

        {remaining > 0 && (
          <Button variant="ghost" size="sm" onClick={onLoadMore}>
            Show {Math.min(remaining, PAGE)} more · {remaining} left
          </Button>
        )}

        {adding && (
          <QuickAdd
            status={status}
            projectId={filters.project_id}
            onClose={() => setAdding(false)}
            onMore={onCreateIn ? () => onCreateIn(status) : undefined}
          />
        )}
      </div>

      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="press mx-1.5 mb-1.5 flex h-8 items-center gap-1.5 rounded-control px-2.5 text-callout text-muted hover:bg-fill hover:text-text pointer-coarse:h-11"
        >
          <Plus className="h-4 w-4" />
          Add issue
        </button>
      )}
    </section>
  );
}

/** Type a title, Enter, and the field is ready for the next one. */
function QuickAdd({
  status,
  projectId,
  onClose,
  onMore,
}: {
  status: IssueStatus;
  projectId?: string;
  onClose: () => void;
  onMore?: () => void;
}) {
  const { data: projects } = useProjects();
  const target = (projects ?? []).filter((p) => p.status === "active");
  const project = target.find((p) => p.id === projectId) ?? target[0];
  const create = useCreateIssue({ silent: true });
  const [title, setTitle] = React.useState("");

  const submit = () => {
    const t = title.trim();
    if (!t || !project) return;
    create.mutate({ project_id: project.id, title: t, status });
    setTitle("");
  };

  return (
    <div className="rounded-control bg-surface p-2 shadow-card">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
        onBlur={() => {
          if (!title.trim()) onClose();
        }}
        placeholder="Issue title"
        aria-label={`New ${STATUS_LABELS[status]} issue title`}
        className="w-full bg-transparent text-body text-text placeholder:text-subtle"
        style={{ boxShadow: "none" }}
      />
      <div className="mt-1.5 flex items-center justify-between text-caption text-muted">
        <span className="truncate">{project ? `in ${project.name}` : "No project"}</span>
        <span className="flex shrink-0 items-center gap-2">
          {onMore && (
            <button type="button" className="hover:text-text" onMouseDown={(e) => e.preventDefault()} onClick={onMore}>
              More options
            </button>
          )}
          <span>↵ add · esc close</span>
        </span>
      </div>
    </div>
  );
}

function SortableCard({ issue, onOpen }: { issue: Issue; onOpen: (issue: Issue) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-card-id={issue.id}
      className={cn(isDragging && "opacity-40")}
      {...attributes}
      // dnd-kit sets role="button", but a card contains its own buttons (menu); "group" avoids nested-interactive.
      role="group"
      {...listeners}
      onClick={() => onOpen(issue)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter") {
          e.preventDefault();
          onOpen(issue);
        }
      }}
      aria-label={`${issue.issue_key} ${issue.title}. Press space to pick up, Enter to open.`}
    >
      <CardBody issue={issue} onOpen={onOpen} />
    </div>
  );
}

function CardBody({
  issue,
  overlay,
  onOpen,
}: {
  issue: Issue;
  overlay?: boolean;
  onOpen?: (issue: Issue) => void;
}) {
  return (
    <article
      className={cn(
        "group relative cursor-grab rounded-control bg-surface p-3 shadow-card active:cursor-grabbing",
        overlay ? "shadow-pop ring-1 ring-accent/40" : "hover:bg-elevated",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-caption text-muted">{issue.issue_key}</span>
        {!overlay && (
          <span onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <IssueMenu
              issue={issue}
              onOpen={onOpen}
              className="-mr-1.5 -mt-1.5 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:data-[state=open]:opacity-100"
            />
          </span>
        )}
      </div>
      <p className="mt-0.5 line-clamp-3 text-body font-medium text-text">{issue.title}</p>
      <div className="mt-2.5 flex items-center gap-2.5">
        <PriorityIcon priority={issue.priority} />
        {issue.due_date && <DueDateChip issue={issue} />}
        <span className="ml-auto">
          <AssigneeDot userId={issue.assignee_id} size="sm" />
        </span>
      </div>
    </article>
  );
}
