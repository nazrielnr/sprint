import * as React from "react";
import { useNavigate } from "react-router";
import {
  Search,
  CornerDownLeft,
  FolderKanban,
  Kanban,
  LayoutDashboard,
  ListTodo,
  Keyboard,
  Palette,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { Kbd } from "../../components/ui/kbd";
import { useDebounced, useIssues, useProjects } from "../../hooks/queries";
import { useAppearance, type ThemeMode } from "../../hooks/use-theme";
import { StatusIcon } from "../issues/status-priority";
import { cn } from "../../lib/utils";

interface Command {
  id: string;
  section: "Actions" | "Go to" | "Projects" | "Issues";
  label: string;
  hint?: string;
  icon: React.ReactNode;
  keywords?: string;
  run: () => void;
}

const icon = (Icon: LucideIcon) => <Icon className="h-4 w-4 text-muted" strokeWidth={1.75} />;
const NEXT_MODE: Record<ThemeMode, ThemeMode> = { auto: "light", light: "dark", dark: "auto" };

/** ⌘K — jump to anything, run any action, find any issue. */
export function CommandPalette({
  open,
  onOpenChange,
  onCreate,
  onHelp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: () => void;
  onHelp: () => void;
}) {
  const navigate = useNavigate();
  const { mode, setMode } = useAppearance();
  const { data: projects } = useProjects();
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const debounced = useDebounced(query.trim(), 200);
  const listRef = React.useRef<HTMLDivElement>(null);

  // With no query show what you touched last; otherwise search the server.
  const issues = useIssues({
    search: debounced || undefined,
    sort_by: debounced ? undefined : "updated_at",
    limit: debounced ? 8 : 5,
  });

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const close = () => onOpenChange(false);
  const go = (path: string) => () => {
    close();
    navigate(path);
  };

  const commands: Command[] = React.useMemo(() => {
    const base: Command[] = [
      { id: "new", section: "Actions", label: "New issue", hint: "C", icon: icon(Plus), keywords: "create add", run: () => (close(), onCreate()) },
      {
        id: "theme",
        section: "Actions",
        label: `Switch theme (now ${mode}) → ${NEXT_MODE[mode]}`,
        icon: icon(Palette),
        keywords: "appearance dark light auto",
        run: () => setMode(NEXT_MODE[mode]),
      },
      { id: "help", section: "Actions", label: "Keyboard shortcuts", hint: "?", icon: icon(Keyboard), run: () => (close(), onHelp()) },
      { id: "g-ov", section: "Go to", label: "Overview", hint: "G O", icon: icon(LayoutDashboard), run: go("/") },
      { id: "g-is", section: "Go to", label: "Issues", hint: "G I", icon: icon(ListTodo), run: go("/issues") },
      { id: "g-bo", section: "Go to", label: "Board", hint: "G B", icon: icon(Kanban), run: go("/board") },
      { id: "g-pr", section: "Go to", label: "Manage projects", icon: icon(FolderKanban), run: go("/projects") },
    ];
    for (const p of (projects ?? []).filter((x) => x.status === "active")) {
      base.push({
        id: `p-${p.id}`,
        section: "Projects",
        label: p.name,
        hint: p.identifier,
        keywords: p.identifier,
        icon: <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color ?? "var(--blue)" }} />,
        run: go(`/issues?project=${p.id}`),
      });
    }
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, mode, onCreate, onHelp]);

  const results: Command[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const local = q
      ? commands.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q))
      : commands.filter((c) => c.section !== "Projects");
    const found: Command[] = (issues.data?.items ?? []).map((i) => ({
      id: `i-${i.id}`,
      section: "Issues",
      label: i.title,
      hint: i.issue_key,
      icon: <StatusIcon status={i.status} />,
      run: go(`/issues?issue=${i.id}`),
    }));
    // Issues first when searching — that's usually what you came for.
    return q ? [...found, ...local] : [...local, ...found];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commands, query, issues.data]);

  React.useEffect(() => setActive(0), [query]);
  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (results.length ? (a + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (results.length ? (a - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[active]?.run();
    }
  };

  let lastSection = "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Command palette"
        description="Search issues, jump to a page, or run an action"
        hideTitle
        hideClose
        className="top-[18%] max-w-xl -translate-y-0 p-0"
        onKeyDown={onKeyDown}
      >
        <div className="hairline-b flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search issues, projects, or type a command…"
            aria-label="Search"
            className="h-12 w-full bg-transparent text-body text-text placeholder:text-subtle"
            style={{ boxShadow: "none" }}
          />
          <Kbd>esc</Kbd>
        </div>
        <div ref={listRef} role="listbox" aria-label="Results" className="max-h-[22rem] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-callout text-muted">
              {issues.isFetching ? "Searching…" : "No results"}
            </p>
          ) : (
            results.map((c, i) => {
              const header = c.section !== lastSection ? c.section : null;
              lastSection = c.section;
              return (
                <React.Fragment key={c.id}>
                  {header && (
                    <p className="px-2.5 pb-1 pt-2 text-caption2 font-semibold uppercase tracking-wider text-muted">
                      {header}
                    </p>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    data-index={i}
                    onMouseMove={() => setActive(i)}
                    onClick={c.run}
                    className={cn(
                      "flex h-9 w-full items-center gap-3 rounded-[6px] px-2.5 text-left text-body text-text pointer-coarse:h-11",
                      i === active && "bg-fill",
                    )}
                  >
                    <span className="flex w-4 shrink-0 justify-center">{c.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{c.label}</span>
                    {c.hint && <span className="font-mono text-caption text-muted">{c.hint}</span>}
                    {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-muted" />}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
