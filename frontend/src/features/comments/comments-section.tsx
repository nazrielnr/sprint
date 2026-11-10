import * as React from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { useComments, useAddComment, useDeleteComment, useUsers } from "../../hooks/queries";
import { relativeTime } from "../../lib/date";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { useToast } from "../../components/ui/toast";
import { Avatar } from "../issues/assignee";

const UNDO_MS = 5000;

export function CommentsSection({ issueId }: { issueId: string }) {
  const query = useComments(issueId);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const { toast } = useToast();
  const { data: users } = useUsers();
  const [content, setContent] = React.useState("");

  // Deleting hides the comment right away; the real delete waits so Undo is genuine.
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const timers = React.useRef(new Map<string, number>());
  const flush = React.useRef<() => void>(() => {});
  flush.current = () => {
    for (const [commentId, t] of timers.current) {
      window.clearTimeout(t);
      deleteComment.mutate({ commentId, issueId });
    }
    timers.current.clear();
  };
  // Closing the drawer inside the window must still delete, not silently keep.
  React.useEffect(() => () => flush.current(), []);

  const remove = (commentId: string) => {
    setHidden((h) => new Set(h).add(commentId));
    const t = window.setTimeout(() => {
      timers.current.delete(commentId);
      deleteComment.mutate({ commentId, issueId }, { onSettled: () => unhide(commentId) });
    }, UNDO_MS + 400);
    timers.current.set(commentId, t);
    toast({
      kind: "success",
      title: "Comment deleted",
      duration: UNDO_MS,
      action: {
        label: "Undo",
        onClick: () => {
          const pending = timers.current.get(commentId);
          if (pending === undefined) return;
          window.clearTimeout(pending);
          timers.current.delete(commentId);
          unhide(commentId);
        },
      },
    });
  };
  const unhide = (commentId: string) =>
    setHidden((h) => {
      const next = new Set(h);
      next.delete(commentId);
      return next;
    });

  const submit = () => {
    const trimmed = content.trim();
    if (!trimmed || addComment.isPending) return;
    addComment.mutate({ issueId, content: trimmed }, { onSuccess: () => setContent("") });
  };

  const items = (query.data?.items ?? []).filter((c) => !hidden.has(c.id));

  return (
    <section className="space-y-3" aria-label="Comments">
      <h3 className="flex items-center gap-2 text-callout font-semibold text-text">
        <MessageSquare className="h-4 w-4 text-muted" strokeWidth={1.75} />
        Comments
      </h3>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-2"
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Write a comment…  (⌘↵ to post)"
          aria-label="Write a comment"
          rows={2}
          className="w-full resize-y rounded-control bg-fill px-3 py-2.5 text-body text-text placeholder:text-subtle"
        />
        {content.trim() && (
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={addComment.isPending}>
              {addComment.isPending ? "Posting…" : "Comment"}
            </Button>
          </div>
        )}
      </form>

      {query.isPending ? (
        <div role="status" aria-label="Loading comments" className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : query.isError ? (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-control bg-fill px-3 py-2.5">
          <p className="text-callout text-muted">Failed to load comments</p>
          <Button variant="secondary" size="sm" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="py-2 text-callout text-muted">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((comment) => {
            const author = users?.find((u) => u.id === comment.author_id);
            return (
              <li key={comment.id} className="group flex gap-3">
                <Avatar name={author?.name ?? "?"} />
                <div className="min-w-0 flex-1">
                  <p className="text-callout">
                    <span className="font-semibold text-text">{author?.name ?? "Someone"}</span>
                    <span className="ml-2 text-caption text-muted">{relativeTime(comment.created_at)}</span>
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-body text-text">
                    {comment.content}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label="Delete comment"
                  className="shrink-0 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-visible:opacity-100"
                  onClick={() => remove(comment.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
