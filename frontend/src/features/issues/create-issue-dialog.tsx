import * as React from "react";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { OptionPicker, pickerTriggerClass, type PickerOption } from "../../components/ui/option-picker";
import { useCreateIssue, useProjects } from "../../hooks/queries";
import type { IssuePriority, IssueStatus } from "../../types";
import {
  AssigneeSelect,
  DueDateSelect,
  LabelsSelect,
  PrioritySelect,
  StatusSelect,
} from "./pickers";
import { Kbd } from "../../components/ui/kbd";
import { cn } from "../../lib/utils";

const LAST_PROJECT_KEY = "sprint-last-project";

function readLastProject(): string {
  try {
    return window.localStorage.getItem(LAST_PROJECT_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Title first; everything else is an optional chip. ⌘↵ creates, and
 * "Create more" keeps the dialog (and your chip choices) for the next one.
 */
export function CreateIssueDialog({
  open,
  onOpenChange,
  projectId,
  defaultStatus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselected project (e.g. the one being filtered). */
  projectId?: string;
  defaultStatus?: IssueStatus;
}) {
  const create = useCreateIssue();
  const { data: projects } = useProjects();
  const active = (projects ?? []).filter((p) => p.status === "active");

  const [picked, setPicked] = React.useState("");
  const project =
    active.find((p) => p.id === picked) ??
    active.find((p) => p.id === projectId) ??
    active.find((p) => p.id === readLastProject()) ??
    active[0];

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [showDesc, setShowDesc] = React.useState(false);
  const [status, setStatus] = React.useState<IssueStatus>(defaultStatus ?? "todo");
  const [priority, setPriority] = React.useState<IssuePriority>("medium");
  const [assigneeId, setAssigneeId] = React.useState<string | null>(null);
  const [dueDate, setDueDate] = React.useState<string | null>(null);
  const [labelIds, setLabelIds] = React.useState<string[]>([]);
  const [more, setMore] = React.useState(false);
  const titleRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setPicked("");
      setTitle("");
      setDescription("");
      setShowDesc(false);
      setStatus(defaultStatus ?? "todo");
      setPriority("medium");
      setAssigneeId(null);
      setDueDate(null);
      setLabelIds([]);
    }
  }, [open, defaultStatus]);

  const submit = () => {
    if (!title.trim() || !project || create.isPending) return;
    create.mutate(
      {
        project_id: project.id,
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assignee_id: assigneeId,
        due_date: dueDate,
        label_ids: labelIds,
      },
      {
        onSuccess: () => {
          try {
            window.localStorage.setItem(LAST_PROJECT_KEY, project.id);
          } catch {
            // remembering the project is a nicety
          }
          if (more) {
            setTitle("");
            setDescription("");
            titleRef.current?.focus();
          } else {
            onOpenChange(false);
          }
        },
      },
    );
  };

  const projectOptions: PickerOption[] = active.map((p) => ({
    value: p.id,
    label: p.name,
    keywords: p.identifier,
    icon: <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color ?? "var(--blue)" }} />,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New issue" hideTitle hideClose className="max-w-xl p-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        >
          <div className="space-y-2 px-5 pb-3 pt-5">
            <div className="flex items-center gap-2 text-callout text-muted">
              <OptionPicker
                options={projectOptions}
                value={project?.id}
                onChange={setPicked}
                placeholder="Switch project…"
                trigger={
                  <button type="button" className={cn(pickerTriggerClass, "-ml-1.5 font-medium")}>
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: project?.color ?? "var(--blue)" }}
                    />
                    {project?.name ?? "No project"}
                  </button>
                }
              />
              <span aria-hidden="true">›</span>
              <span>New issue</span>
            </div>
            <input
              ref={titleRef}
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              aria-label="Issue title"
              className="w-full bg-transparent text-title font-semibold tracking-tight text-text placeholder:text-subtle"
              style={{ boxShadow: "none" }}
            />
            {showDesc ? (
              <textarea
                autoFocus
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description…"
                aria-label="Description"
                rows={4}
                className="w-full resize-none rounded-control bg-fill px-3 py-2 text-body text-text placeholder:text-subtle"
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowDesc(true)}
                className="text-callout text-muted hover:text-text"
              >
                + Add description
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1 px-4 pb-3">
            <StatusSelect value={status} onChange={setStatus} className="bg-fill" />
            <PrioritySelect value={priority} onChange={setPriority} className="bg-fill" />
            <AssigneeSelect value={assigneeId} onChange={setAssigneeId} className="bg-fill" />
            <DueDateSelect value={dueDate} onChange={setDueDate} className="bg-fill" />
            <LabelsSelect value={labelIds} onChange={setLabelIds} className="bg-fill" />
          </div>

          <div className="hairline-t flex items-center justify-between gap-3 border-t border-border px-5 py-3">
            <label className="flex cursor-pointer items-center gap-2 text-callout text-muted">
              <input
                type="checkbox"
                checked={more}
                onChange={(e) => setMore(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Create more
            </label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || !project || create.isPending}>
                {create.isPending ? "Creating…" : "Create issue"}
                <Kbd className="bg-black/15 text-on-accent">⌘↵</Kbd>
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
