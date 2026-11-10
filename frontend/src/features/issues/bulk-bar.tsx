import { Trash2, X } from "lucide-react";
import type { Issue, IssuePriority, IssueStatus } from "../../types";
import { PRIORITY_LABELS, STATUS_LABELS } from "../../types";
import { useIssueActions } from "../../hooks/queries";
import { OptionPicker } from "../../components/ui/option-picker";
import { Button } from "../../components/ui/button";
import { PRIORITY_OPTIONS, STATUS_OPTIONS, UNASSIGNED, useAssigneeOptions } from "./pickers";

/** Floating action bar shown while issues are selected. */
export function BulkBar({
  selected,
  onClear,
}: {
  selected: Issue[];
  onClear: () => void;
}) {
  const { bulkSet, remove } = useIssueActions();
  const assigneeOptions = useAssigneeOptions();
  if (selected.length === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label={`${selected.length} issues selected`}
      className="material fixed bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 z-30 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center gap-1 rounded-pop p-1.5 shadow-pop animate-[toast-in_250ms_var(--ease)] lg:bottom-6"
    >
      <span className="px-2.5 text-callout font-semibold tabular-nums text-text">
        {selected.length} selected
      </span>
      <OptionPicker
        options={STATUS_OPTIONS}
        onChange={(v) => {
          void bulkSet(selected, { status: v as IssueStatus }, `Status: ${STATUS_LABELS[v as IssueStatus]}`);
          onClear();
        }}
        placeholder="Set status…"
        side="top"
        trigger={<Button variant="ghost" size="sm">Status</Button>}
      />
      <OptionPicker
        options={PRIORITY_OPTIONS}
        onChange={(v) => {
          void bulkSet(selected, { priority: v as IssuePriority }, `Priority: ${PRIORITY_LABELS[v as IssuePriority]}`);
          onClear();
        }}
        placeholder="Set priority…"
        side="top"
        trigger={<Button variant="ghost" size="sm">Priority</Button>}
      />
      <OptionPicker
        options={assigneeOptions}
        onChange={(v) => {
          void bulkSet(
            selected,
            { assignee_id: v === UNASSIGNED ? null : v },
            v === UNASSIGNED ? "Unassigned" : "Assignee updated",
          );
          onClear();
        }}
        placeholder="Assign to…"
        side="top"
        trigger={<Button variant="ghost" size="sm">Assignee</Button>}
      />
      <Button
        variant="ghost"
        size="sm"
        className="text-red-text hover:text-red-text"
        onClick={() => {
          void remove(selected);
          onClear();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        Delete
      </Button>
      <Button variant="ghost" size="iconSm" aria-label="Clear selection" onClick={onClear}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
