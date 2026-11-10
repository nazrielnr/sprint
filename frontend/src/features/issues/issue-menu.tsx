import { Ellipsis, ExternalLink, Link2, Trash2 } from "lucide-react";
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Issue,
} from "../../types";
import { useIssueActions, useUsers } from "../../hooks/queries";
import { useToast } from "../../components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Avatar } from "./assignee";
import { PriorityIcon, StatusIcon } from "./status-priority";
import { cn } from "../../lib/utils";

export function issueUrl(issue: Pick<Issue, "id">): string {
  return `${window.location.origin}/issues?issue=${issue.id}`;
}

/** ⋯ menu: every action available on an issue, reachable without opening it. */
export function IssueMenu({
  issue,
  onOpen,
  onDeleted,
  className,
}: {
  issue: Issue;
  onOpen?: (issue: Issue) => void;
  /** Called right after the issue is deleted (it can still be restored with Undo). */
  onDeleted?: () => void;
  className?: string;
}) {
  const { setField, remove } = useIssueActions();
  const { data: users } = useUsers();
  const { toast } = useToast();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(issueUrl(issue));
      toast({ kind: "success", title: "Link copied", description: issue.issue_key });
    } catch {
      toast({ kind: "error", title: "Could not copy link" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${issue.issue_key}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "press flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-fill hover:text-text data-[state=open]:bg-fill pointer-coarse:h-10 pointer-coarse:w-10",
            className,
          )}
        >
          <Ellipsis className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {onOpen && (
          <DropdownMenuItem onSelect={() => onOpen(issue)}>
            <ExternalLink className="h-4 w-4 text-muted" strokeWidth={1.75} />
            Open
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void copyLink()}>
          <Link2 className="h-4 w-4 text-muted" strokeWidth={1.75} />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <StatusIcon status={issue.status} />
            Move to
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={issue.status}
              onValueChange={(v) => {
                const status = v as Issue["status"];
                if (status !== issue.status)
                  void setField(issue, { status }, { label: `Status: ${STATUS_LABELS[status]}` });
              }}
            >
              {ISSUE_STATUSES.map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>
                  <StatusIcon status={s} />
                  {STATUS_LABELS[s]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <PriorityIcon priority={issue.priority} />
            Priority
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={issue.priority}
              onValueChange={(v) => {
                const priority = v as Issue["priority"];
                if (priority !== issue.priority)
                  void setField(issue, { priority }, { label: `Priority: ${PRIORITY_LABELS[priority]}` });
              }}
            >
              {ISSUE_PRIORITIES.map((p) => (
                <DropdownMenuRadioItem key={p} value={p}>
                  <PriorityIcon priority={p} />
                  {PRIORITY_LABELS[p]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Avatar
              name={users?.find((u) => u.id === issue.assignee_id)?.name ?? null}
              size="sm"
            />
            Assign to
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={issue.assignee_id ?? "__none__"}
              onValueChange={(v) => {
                const assignee_id = v === "__none__" ? null : v;
                if (assignee_id === issue.assignee_id) return;
                const name = users?.find((u) => u.id === assignee_id)?.name;
                void setField(issue, { assignee_id }, { label: name ? `Assigned to ${name}` : "Unassigned" });
              }}
            >
              <DropdownMenuRadioItem value="__none__">
                <Avatar name={null} size="sm" />
                Unassigned
              </DropdownMenuRadioItem>
              {(users ?? []).map((u) => (
                <DropdownMenuRadioItem key={u.id} value={u.id}>
                  <Avatar name={u.name} size="sm" />
                  {u.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={() => {
            void remove([issue]);
            onDeleted?.();
          }}
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
