import * as React from "react";
import { Check } from "lucide-react";
import { Drawer, DrawerContent } from "../../components/ui/drawer";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { useIssue, useIssueActions } from "../../hooks/queries";
import type { Issue } from "../../types";
import {
  IssueAssigneePicker,
  IssueDuePicker,
  IssueLabelsPicker,
  IssuePriorityPicker,
  IssueStatusPicker,
} from "./pickers";
import { IssueMenu } from "./issue-menu";
import { CommentsSection } from "../comments/comments-section";
import { IssueActivitySection } from "./activity";

export function IssueDrawer({
  issueId,
  onClose,
}: {
  issueId: string | null;
  onClose: () => void;
}) {
  const { data: issue, isPending, isError, error, refetch } = useIssue(issueId ?? undefined);
  // issueId is already null by the time focus is restored, so remember the last open one.
  const lastId = React.useRef<string | null>(null);
  if (issueId) lastId.current = issueId;

  return (
    <Drawer open={issueId !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent
        onCloseAutoFocus={(e) => {
          // Hand focus back to what opened the drawer (row link / card) — not to <body>.
          e.preventDefault();
          const id = lastId.current;
          const opener = id
            ? document.querySelector<HTMLElement>(
                `[data-row-id="${id}"] a, [data-card-id="${id}"]`,
              )
            : null;
          (opener ?? document.getElementById("main"))?.focus();
        }}
        title={issue ? <span className="font-mono text-callout text-muted">{issue.issue_key}</span> : "Issue"}
        description="Issue details"
        actions={issue ? <IssueMenu issue={issue} onDeleted={onClose} /> : undefined}
      >
        {issueId === null ? null : isPending ? (
          <DrawerSkeleton />
        ) : isError || !issue ? (
          <div role="alert" className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-headline font-semibold text-text">Could not load this issue</p>
            <p className="text-callout text-muted">{error ? error.message : "Unknown error"}</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <IssueDetails key={issue.id} issue={issue} />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function DrawerSkeleton() {
  return (
    <div role="status" aria-label="Loading issue" className="space-y-6 p-5">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

type SaveState = "idle" | "saving" | "saved";

/** Shows "Saving…" then a brief "Saved" so edits never feel like they vanished. */
function useSaveIndicator() {
  const [state, setState] = React.useState<SaveState>("idle");
  const timer = React.useRef<number | undefined>(undefined);
  const track = React.useCallback(async (work: Promise<boolean>) => {
    window.clearTimeout(timer.current);
    setState("saving");
    const ok = await work;
    if (!ok) {
      setState("idle");
      return;
    }
    setState("saved");
    timer.current = window.setTimeout(() => setState("idle"), 1600);
  }, []);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  return [state, track] as const;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-9 items-center gap-3">
      <span className="w-20 shrink-0 text-callout text-muted">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function IssueDetails({ issue }: { issue: Issue }) {
  const { setField } = useIssueActions();
  const [saveState, track] = useSaveIndicator();

  const [title, setTitle] = React.useState(issue.title);
  const [description, setDescription] = React.useState(issue.description ?? "");

  // Follow server changes, but never overwrite what the user is typing.
  const lastTitle = React.useRef(issue.title);
  React.useEffect(() => {
    setTitle((current) => (current === lastTitle.current ? issue.title : current));
    lastTitle.current = issue.title;
  }, [issue.title]);
  const lastDesc = React.useRef(issue.description ?? "");
  React.useEffect(() => {
    const incoming = issue.description ?? "";
    setDescription((current) => (current === lastDesc.current ? incoming : current));
    lastDesc.current = incoming;
  }, [issue.description]);

  const saveTitle = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(issue.title);
      return;
    }
    if (trimmed !== issue.title) void track(setField(issue, { title: trimmed }));
  };

  const saveDescription = () => {
    const next = description.trim() || null;
    if (next !== (issue.description ?? null)) void track(setField(issue, { description: next }));
  };

  return (
    <div className="space-y-6 p-5">
      <div>
        <textarea
          value={title}
          rows={1}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            } else if (e.key === "Escape") {
              e.stopPropagation();
              setTitle(issue.title);
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
          ref={(el) => {
            if (el) {
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }
          }}
          aria-label="Issue title"
          className="-mx-2 w-[calc(100%+1rem)] resize-none rounded-control bg-transparent px-2 py-1 text-title font-semibold tracking-tight text-text hover:bg-fill focus:bg-fill"
        />
      </div>

      <section aria-label="Properties" className="space-y-0.5">
        <Row label="Status">
          <IssueStatusPicker issue={issue} />
        </Row>
        <Row label="Priority">
          <IssuePriorityPicker issue={issue} />
        </Row>
        <Row label="Assignee">
          <IssueAssigneePicker issue={issue} />
        </Row>
        <Row label="Due date">
          <IssueDuePicker issue={issue} />
        </Row>
        <Row label="Labels">
          <IssueLabelsPicker issue={issue} />
        </Row>
      </section>

      <section aria-label="Description">
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="text-callout font-semibold text-text">Description</h3>
          <span aria-live="polite" className="inline-flex items-center gap-1 text-caption text-muted">
            {saveState === "saving" && "Saving…"}
            {saveState === "saved" && (
              <>
                <Check className="h-3 w-3 text-success" strokeWidth={2.5} /> Saved
              </>
            )}
          </span>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            } else if (e.key === "Escape") {
              e.stopPropagation();
              setDescription(issue.description ?? "");
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
          placeholder="Add a description…  (⌘↵ to save)"
          rows={5}
          aria-label="Description"
          className="w-full resize-y rounded-control bg-fill px-3 py-2.5 text-body text-text placeholder:text-subtle"
        />
      </section>

      <CommentsSection issueId={issue.id} />

      <section aria-label="Activity">
        <h3 className="mb-2 text-callout font-semibold text-text">Activity</h3>
        <IssueActivitySection issueId={issue.id} />
      </section>
    </div>
  );
}
