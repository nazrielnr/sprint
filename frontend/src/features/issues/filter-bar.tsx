import * as React from "react";
import { ArrowUpDown, ChevronDown, ListFilter, Search, X } from "lucide-react";
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../../types";
import { useDebounced, useUsers } from "../../hooks/queries";
import { OptionPicker, type PickerOption } from "../../components/ui/option-picker";
import { Segmented } from "../../components/ui/segmented";
import { Button } from "../../components/ui/button";
import { PriorityIcon, StatusIcon } from "./status-priority";
import { UNASSIGNED, useAssigneeOptions } from "./pickers";
import type { UrlFilters } from "./use-issue-filters";
import { cn } from "../../lib/utils";

const ALL = "all";

const SORTS: PickerOption[] = [
  { value: "created_at", label: "Newest" },
  { value: "updated_at", label: "Recently updated" },
  { value: "due_date", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
];

/** Filter chip: neutral when unset, accent when active. */
function Chip({
  active,
  icon,
  label,
  ...props
}: { active: boolean; icon?: React.ReactNode; label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "press inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-callout font-medium pointer-coarse:h-10",
        active ? "bg-accent-soft text-accent" : "bg-fill text-text hover:bg-fill/80",
      )}
    >
      {icon}
      <span className="max-w-[9rem] truncate">{label}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
    </button>
  );
}

/** Search + quick segments + filter chips. State is the URL (see use-issue-filters). */
export function FilterBar({
  url,
  showSort = true,
  trailing,
}: {
  url: UrlFilters;
  showSort?: boolean;
  trailing?: React.ReactNode;
}) {
  const { filters, set, clear, hasActive } = url;
  const { data: users } = useUsers();
  const assigneeOptions = useAssigneeOptions();
  const me = users?.[0]; // no auth yet: the first user stands in for "me"

  // Search box is local so typing is instant; the URL follows after a pause.
  const [text, setText] = React.useState(filters.search ?? "");
  const debounced = useDebounced(text, 250);
  React.useEffect(() => {
    if ((filters.search ?? "") !== debounced) set({ search: debounced || undefined });
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    // URL changed from outside (Clear, back button).
    setText(filters.search ?? "");
  }, [filters.search]);

  const segment =
    !filters.assignee_id ? "all" : filters.assignee_id === "unassigned" ? "unassigned" : filters.assignee_id === me?.id ? "mine" : "custom";

  const statusOptions: PickerOption[] = [
    { value: ALL, label: "Any status" },
    ...ISSUE_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], icon: <StatusIcon status={s} /> })),
  ];
  const priorityOptions: PickerOption[] = [
    { value: ALL, label: "Any priority" },
    ...ISSUE_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p], icon: <PriorityIcon priority={p} /> })),
  ];
  const assigneeFilterOptions: PickerOption[] = [
    { value: ALL, label: "Anyone" },
    ...assigneeOptions,
  ];

  const assigneeLabel =
    segment === "custom" ? (users?.find((u) => u.id === filters.assignee_id)?.name ?? "Assignee") : "Assignee";

  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
      <div className="relative w-full md:min-w-[12rem] md:max-w-xs md:flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search issues"
          aria-label="Search issues"
          className="h-8 w-full rounded-control bg-fill pl-8 pr-8 text-body text-text placeholder:text-subtle pointer-coarse:h-10"
        />
        {text && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setText("")}
            className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-fill hover:text-text"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 md:contents [&>*]:shrink-0">
      <Segmented
        label="Assignee"
        value={segment as "all" | "mine" | "unassigned"}
        onChange={(v) =>
          set({ assignee_id: v === "all" ? undefined : v === "unassigned" ? "unassigned" : me?.id })
        }
        options={[
          { value: "all", label: "All" },
          { value: "mine", label: "Mine" },
          { value: "unassigned", label: "Unassigned" },
        ]}
      />

      <OptionPicker
        options={statusOptions}
        value={filters.status ?? ALL}
        onChange={(v) => set({ status: v === ALL ? undefined : (v as typeof filters.status) })}
        placeholder="Filter status…"
        trigger={
          <Chip
            active={!!filters.status}
            icon={filters.status ? <StatusIcon status={filters.status as never} /> : <ListFilter className="h-3.5 w-3.5" />}
            label={filters.status ? STATUS_LABELS[filters.status as keyof typeof STATUS_LABELS] : "Status"}
          />
        }
      />
      <OptionPicker
        options={priorityOptions}
        value={filters.priority ?? ALL}
        onChange={(v) => set({ priority: v === ALL ? undefined : (v as typeof filters.priority) })}
        placeholder="Filter priority…"
        trigger={
          <Chip
            active={!!filters.priority}
            icon={filters.priority ? <PriorityIcon priority={filters.priority as never} /> : undefined}
            label={filters.priority ? PRIORITY_LABELS[filters.priority as keyof typeof PRIORITY_LABELS] : "Priority"}
          />
        }
      />
      <OptionPicker
        options={assigneeFilterOptions}
        value={filters.assignee_id === "unassigned" ? UNASSIGNED : (filters.assignee_id ?? ALL)}
        onChange={(v) =>
          set({ assignee_id: v === ALL ? undefined : v === UNASSIGNED ? "unassigned" : v })
        }
        placeholder="Filter assignee…"
        trigger={<Chip active={segment === "custom"} label={assigneeLabel} />}
      />
      <button
        type="button"
        aria-pressed={!!filters.overdue}
        onClick={() => set({ overdue: !filters.overdue })}
        className={cn(
          "press inline-flex h-8 items-center rounded-full px-3 text-callout font-medium pointer-coarse:h-10",
          filters.overdue ? "bg-sys-red/15 text-red-text" : "bg-fill text-text hover:bg-fill/80",
        )}
      >
        Overdue
      </button>

      {showSort && (
        <OptionPicker
          options={SORTS}
          value={filters.sort_by ?? "created_at"}
          onChange={(v) => set({ sort_by: v === "created_at" ? undefined : v })}
          placeholder="Sort by…"
          align="end"
          trigger={
            <Chip
              active={false}
              icon={<ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.75} />}
              label={SORTS.find((s) => s.value === (filters.sort_by ?? "created_at"))?.label ?? "Sort"}
            />
          }
        />
      )}

      {hasActive && (
        <Button variant="ghost" size="sm" onClick={clear}>
          Clear
        </Button>
      )}
      </div>
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  );
}
