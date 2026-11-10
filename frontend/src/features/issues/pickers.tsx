import * as React from "react";
import { CalendarDays, Tag } from "lucide-react";
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Issue,
  type IssuePriority,
  type IssueStatus,
} from "../../types";
import { useIssueActions, useLabels, useUsers } from "../../hooks/queries";
import { OptionPicker, pickerTriggerClass, type PickerOption } from "../../components/ui/option-picker";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Button } from "../../components/ui/button";
import { Avatar } from "./assignee";
import { PriorityIcon, StatusIcon } from "./status-priority";
import { addDays, friendlyDate, isOverdue } from "../../lib/date";
import { cn } from "../../lib/utils";

interface Controlled {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Show only the icon (dense rows, board cards). */
  iconOnly?: boolean;
  className?: string;
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export const STATUS_OPTIONS: PickerOption<IssueStatus>[] = ISSUE_STATUSES.map((s, i) => ({
  value: s,
  label: STATUS_LABELS[s],
  icon: <StatusIcon status={s} />,
  hint: String(i + 1),
}));

export function StatusSelect({
  value,
  onChange,
  iconOnly,
  className,
  ...rest
}: Controlled & { value: IssueStatus; onChange: (v: IssueStatus) => void }) {
  return (
    <OptionPicker
      options={STATUS_OPTIONS}
      value={value}
      onChange={onChange}
      placeholder="Set status…"
      {...rest}
      trigger={
        <button
          type="button"
          onClick={stop}
          aria-label={`Status: ${STATUS_LABELS[value]}`}
          className={cn(pickerTriggerClass, className)}
        >
          <StatusIcon status={value} />
          {!iconOnly && <span className="truncate">{STATUS_LABELS[value]}</span>}
        </button>
      }
    />
  );
}

export function IssueStatusPicker({ issue, ...rest }: Controlled & { issue: Issue }) {
  const { setField } = useIssueActions();
  return (
    <StatusSelect
      {...rest}
      value={issue.status}
      onChange={(status) => {
        if (status !== issue.status) void setField(issue, { status }, { label: `Status: ${STATUS_LABELS[status]}` });
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------

export const PRIORITY_OPTIONS: PickerOption<IssuePriority>[] = ISSUE_PRIORITIES.map((p, i) => ({
  value: p,
  label: PRIORITY_LABELS[p],
  icon: <PriorityIcon priority={p} />,
  hint: String(i + 1),
}));

export function PrioritySelect({
  value,
  onChange,
  iconOnly,
  className,
  ...rest
}: Controlled & { value: IssuePriority; onChange: (v: IssuePriority) => void }) {
  return (
    <OptionPicker
      options={PRIORITY_OPTIONS}
      value={value}
      onChange={onChange}
      placeholder="Set priority…"
      {...rest}
      trigger={
        <button
          type="button"
          onClick={stop}
          aria-label={`Priority: ${PRIORITY_LABELS[value]}`}
          className={cn(pickerTriggerClass, className)}
        >
          <PriorityIcon priority={value} />
          {!iconOnly && (
            <span className={cn("truncate", value === "no_priority" && "text-muted")}>
              {PRIORITY_LABELS[value]}
            </span>
          )}
        </button>
      }
    />
  );
}

export function IssuePriorityPicker({ issue, ...rest }: Controlled & { issue: Issue }) {
  const { setField } = useIssueActions();
  return (
    <PrioritySelect
      {...rest}
      value={issue.priority}
      onChange={(priority) => {
        if (priority !== issue.priority)
          void setField(issue, { priority }, { label: `Priority: ${PRIORITY_LABELS[priority]}` });
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Assignee
// ---------------------------------------------------------------------------

export const UNASSIGNED = "__none__";

/** "Unassigned" + every user, as picker options. */
export function useAssigneeOptions(): PickerOption[] {
  const { data: users } = useUsers();
  return React.useMemo(
    () => [
      { value: UNASSIGNED, label: "Unassigned", icon: <Avatar name={null} size="sm" /> },
      ...(users ?? []).map((u) => ({
        value: u.id,
        label: u.name,
        keywords: u.email,
        icon: <Avatar name={u.name} size="sm" />,
      })),
    ],
    [users],
  );
}

export function AssigneeSelect({
  value,
  onChange,
  iconOnly,
  className,
  ...rest
}: Controlled & { value: string | null; onChange: (v: string | null) => void }) {
  const { data: users } = useUsers();
  const options = useAssigneeOptions();
  const user = users?.find((u) => u.id === value);
  return (
    <OptionPicker
      options={options}
      value={value ?? UNASSIGNED}
      onChange={(v) => onChange(v === UNASSIGNED ? null : v)}
      placeholder="Assign to…"
      {...rest}
      trigger={
        <button
          type="button"
          onClick={stop}
          aria-label={`Assignee: ${user?.name ?? "Unassigned"}`}
          className={cn(pickerTriggerClass, className)}
        >
          <Avatar name={user?.name ?? null} size="sm" />
          {!iconOnly && (
            <span className={cn("truncate", !user && "text-muted")}>{user?.name ?? "Unassigned"}</span>
          )}
        </button>
      }
    />
  );
}

export function IssueAssigneePicker({ issue, ...rest }: Controlled & { issue: Issue }) {
  const { setField } = useIssueActions();
  const { data: users } = useUsers();
  return (
    <AssigneeSelect
      {...rest}
      value={issue.assignee_id}
      onChange={(assignee_id) => {
        if (assignee_id === issue.assignee_id) return;
        const name = users?.find((u) => u.id === assignee_id)?.name;
        void setField(issue, { assignee_id }, { label: name ? `Assigned to ${name}` : "Unassigned" });
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Labels (multi)
// ---------------------------------------------------------------------------

export function LabelsSelect({
  value,
  onChange,
  iconOnly,
  className,
  ...rest
}: Controlled & { value: string[]; onChange: (v: string[]) => void }) {
  const { data: labels } = useLabels();
  const options: PickerOption[] = React.useMemo(
    () =>
      (labels ?? []).map((l) => ({
        value: l.id,
        label: l.name,
        icon: <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />,
      })),
    [labels],
  );
  const selected = (labels ?? []).filter((l) => value.includes(l.id));
  return (
    <OptionPicker
      options={options}
      values={value}
      multiple
      onChange={(id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])}
      placeholder="Toggle labels…"
      {...rest}
      trigger={
        <button
          type="button"
          onClick={stop}
          aria-label="Labels"
          className={cn(pickerTriggerClass, className)}
        >
          {selected.length === 0 ? (
            <>
              <Tag className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
              {!iconOnly && <span className="text-muted">Add label</span>}
            </>
          ) : (
            <span className="flex items-center gap-1.5">
              {selected.slice(0, 3).map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                  {!iconOnly && selected.length <= 2 && <span>{l.name}</span>}
                </span>
              ))}
              {!iconOnly && selected.length > 2 && <span>{selected.length} labels</span>}
            </span>
          )}
        </button>
      }
    />
  );
}

export function IssueLabelsPicker({ issue, ...rest }: Controlled & { issue: Issue }) {
  const { setField } = useIssueActions();
  return (
    <LabelsSelect
      {...rest}
      value={issue.label_ids}
      onChange={(label_ids) => void setField(issue, { label_ids }, { label: "Labels updated" })}
    />
  );
}

// ---------------------------------------------------------------------------
// Due date
// ---------------------------------------------------------------------------

export function DueDateSelect({
  value,
  onChange,
  status,
  iconOnly,
  className,
  open,
  onOpenChange,
}: Controlled & {
  value: string | null;
  onChange: (v: string | null) => void;
  /** Used to decide whether "overdue" styling applies. */
  status?: IssueStatus;
}) {
  const [openState, setOpenState] = React.useState(false);
  const isOpen = open ?? openState;
  const setOpen = (next: boolean) => {
    if (open === undefined) setOpenState(next);
    onOpenChange?.(next);
  };
  const overdue = isOverdue(value, status ?? "todo");
  const pick = (v: string | null) => {
    onChange(v);
    setOpen(false);
  };
  const presets: { label: string; value: string }[] = [
    { label: "Today", value: addDays(0) },
    { label: "Tomorrow", value: addDays(1) },
    { label: "In a week", value: addDays(7) },
    { label: "In two weeks", value: addDays(14) },
  ];
  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={stop}
          aria-label={value ? `Due ${friendlyDate(value)}` : "Set due date"}
          className={cn(pickerTriggerClass, overdue && "text-red-text", className)}
        >
          <CalendarDays className={cn("h-3.5 w-3.5", !value && "text-muted")} strokeWidth={1.75} />
          {!iconOnly && (
            <span className={cn("truncate", !value && "text-muted")}>
              {value ? friendlyDate(value) : "No date"}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56"
        onClick={stop}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="space-y-0.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => pick(p.value)}
              className="flex h-8 w-full items-center justify-between rounded-[6px] px-2.5 text-body hover:bg-fill pointer-coarse:h-11"
            >
              {p.label}
              <span className="text-caption text-muted">{friendlyDate(p.value)}</span>
            </button>
          ))}
        </div>
        <div className="hairline-t mt-1.5 border-t border-border px-1 pt-2">
          <label className="mb-1 block text-caption font-medium text-muted" htmlFor="due-input">
            Pick a date
          </label>
          <input
            id="due-input"
            type="date"
            value={value ?? ""}
            onChange={(e) => pick(e.target.value || null)}
            className="h-8 w-full rounded-control bg-fill px-2 text-body text-text"
          />
        </div>
        {value && (
          <div className="mt-1.5 px-1 pb-1">
            <Button variant="ghost" size="sm" className="w-full text-red-text" onClick={() => pick(null)}>
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function IssueDuePicker({ issue, ...rest }: Controlled & { issue: Issue }) {
  const { setField } = useIssueActions();
  return (
    <DueDateSelect
      {...rest}
      value={issue.due_date}
      status={issue.status}
      onChange={(due_date) =>
        void setField(issue, { due_date }, { label: due_date ? `Due ${friendlyDate(due_date)}` : "Due date cleared" })
      }
    />
  );
}
