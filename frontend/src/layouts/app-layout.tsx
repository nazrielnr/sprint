import * as React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  ListTodo,
  Kanban,
  Search,
  Settings,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Ellipsis,
  WifiOff,
  X,
  Zap,
  FolderKanban,
  type LucideIcon,
} from "lucide-react";
import { useProjects } from "../hooks/queries";
import { isTyping, overlayOpen } from "../lib/keyboard";
import { cn } from "../lib/utils";

// Opened on demand, so they stay out of the first load.
const CreateIssueDialog = React.lazy(() =>
  import("../features/issues/create-issue-dialog").then((m) => ({ default: m.CreateIssueDialog })),
);
const CommandPalette = React.lazy(() =>
  import("../features/command/command-palette").then((m) => ({ default: m.CommandPalette })),
);
const ShortcutsHelp = React.lazy(() =>
  import("../features/command/shortcuts-help").then((m) => ({ default: m.ShortcutsHelp })),
);
import { Skeleton } from "../components/ui/skeleton";
import { Kbd } from "../components/ui/kbd";
import { Tooltip, TooltipProvider } from "../components/ui/tooltip";
import { AppearanceButton } from "../features/settings/appearance-popover";

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/issues", label: "Issues", icon: ListTodo },
  { to: "/board", label: "Board", icon: Kanban },
];

const COLLAPSE_KEY = "sprint-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const online = useOnline();
  const [collapsed, setCollapsed] = React.useState(readCollapsed);
  const navigate = useNavigate();
  const location = useLocation();
  // A project being viewed pre-fills "New issue".
  const currentProject = new URLSearchParams(location.search).get("project") ?? undefined;

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        // session-only
      }
      return !c;
    });
  }, []);

  // Close the mobile sheet on navigation.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  React.useEffect(() => {
    let chord = 0; // timestamp of the last "g" (for G+O / G+I / G+B)
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggleCollapsed();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || overlayOpen()) return;

      if (chord && Date.now() - chord < 900) {
        chord = 0;
        const dest = { o: "/", i: "/issues", b: "/board" }[e.key.toLowerCase()];
        if (dest) {
          e.preventDefault();
          navigate(dest);
          return;
        }
      }
      if (e.key === "g") {
        chord = Date.now();
      } else if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === "c") {
        e.preventDefault();
        setCreateOpen(true);
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, mobileOpen, toggleCollapsed]);

  return (
    <TooltipProvider>
      <div className="flex h-full bg-background">
        {/* Desktop sidebar */}
        <aside
          className="material hairline-r hidden shrink-0 flex-col border-r border-border transition-[width] duration-[350ms] ease-[var(--ease)] lg:flex"
          style={{ width: collapsed ? "var(--sidebar-w-rail)" : "var(--sidebar-w)" }}
        >
          <SidebarContent
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
            onCreate={() => setCreateOpen(true)}
            onSearch={() => setPaletteOpen(true)}
          />
        </aside>

        {/* Mobile "More" sheet */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-surface shadow-pop">
              <button
                aria-label="Close menu"
                className="press absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-fill"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent
                onCreate={() => {
                  setMobileOpen(false);
                  setCreateOpen(true);
                }}
                onSearch={() => {
                  setMobileOpen(false);
                  setPaletteOpen(true);
                }}
              />
            </aside>
          </div>
        )}

        <main id="main" tabIndex={-1} className="min-h-0 min-w-0 flex-1 overflow-y-auto outline-none pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0">
          <Outlet />
        </main>

        <MobileTabBar
          onMore={() => setMobileOpen(true)}
          onCreate={() => setCreateOpen(true)}
        />

        <React.Suspense fallback={null}>
          {createOpen && <CreateIssueDialog open onOpenChange={setCreateOpen} projectId={currentProject} />}
          {paletteOpen && (
            <CommandPalette
              open
              onOpenChange={setPaletteOpen}
              onCreate={() => setCreateOpen(true)}
              onHelp={() => setHelpOpen(true)}
            />
          )}
          {helpOpen && <ShortcutsHelp open onOpenChange={setHelpOpen} />}
        </React.Suspense>
        {!online && (
          <div
            role="status"
            className="material fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 bg-sys-orange/20 px-4 py-2 text-callout font-medium text-text"
          >
            <WifiOff className="h-4 w-4" /> You’re offline — changes can’t be saved until you reconnect.
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function useOnline(): boolean {
  const [online, setOnline] = React.useState(() => navigator.onLine);
  React.useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function SidebarContent({
  collapsed = false,
  onToggleCollapsed,
  onCreate,
  onSearch,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onCreate: () => void;
  onSearch: () => void;
}) {
  const { data: projects, isPending } = useProjects();
  const activeProjects = (projects ?? []).filter((p) => p.status === "active");
  const location = useLocation();
  const currentProject = new URLSearchParams(location.search).get("project");
  const onWorkspaceView =
    location.pathname === "/issues" || location.pathname === "/board";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div
        className={cn(
          "flex h-[52px] shrink-0 items-center gap-2.5",
          collapsed ? "justify-center" : "px-4",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-accent-fill text-on-accent">
          <Zap className="h-4 w-4" strokeWidth={2.25} />
        </span>
        {!collapsed && (
          <span className="text-headline font-semibold tracking-tight text-text">Sprint</span>
        )}
        {!collapsed && onToggleCollapsed && (
          <Tooltip label="Collapse sidebar" shortcut="⌘\" side="bottom">
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Collapse sidebar"
              className="press ml-auto flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-fill hover:text-text"
            >
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </Tooltip>
        )}
      </div>

      {/* Search */}
      <div className={cn("shrink-0 pb-2", collapsed ? "px-2" : "px-3")}>
        <SearchField collapsed={collapsed} onSearch={onSearch} />
      </div>

      {/* Primary nav */}
      <nav className={cn("shrink-0 space-y-0.5", collapsed ? "px-2" : "px-3")} aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <Tooltip key={to} label={label} disabled={!collapsed}>
            <NavLink
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  "press flex h-8 items-center rounded-control text-body transition-colors pointer-coarse:h-11",
                  collapsed ? "justify-center" : "gap-2.5 px-2.5",
                  isActive
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-text hover:bg-fill",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {!collapsed && label}
            </NavLink>
          </Tooltip>
        ))}
      </nav>

      {/* Projects */}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {!collapsed && (
          <div className="flex items-center justify-between px-5 pb-1">
            <p className="text-caption2 font-semibold uppercase tracking-wider text-muted">
              Projects
            </p>
            <NavLink
              to="/projects"
              aria-label="Manage projects"
              className="rounded-control p-1 text-muted hover:bg-fill hover:text-text"
            >
              <FolderKanban className="h-3.5 w-3.5" strokeWidth={1.75} />
            </NavLink>
          </div>
        )}
        <nav className={cn("space-y-0.5", collapsed ? "px-2" : "px-3")} aria-label="Projects">
          {isPending ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="mx-1 h-7 rounded-control" />
            ))
          ) : activeProjects.length === 0 ? (
            !collapsed && (
              <p className="px-2.5 py-2 text-callout text-muted">No active projects</p>
            )
          ) : (
            activeProjects.map((project) => {
              const active = onWorkspaceView && currentProject === project.id;
              const target = onWorkspaceView ? location.pathname : "/issues";
              return (
                <Tooltip key={project.id} label={project.name} disabled={!collapsed}>
                  <NavLink
                    to={`${target}?project=${project.id}`}
                    aria-label={project.name}
                    className={cn(
                      "press flex h-8 items-center rounded-control text-body transition-colors pointer-coarse:h-11",
                      collapsed ? "justify-center" : "gap-2.5 px-2.5",
                      active ? "bg-fill font-medium text-text" : "text-muted hover:bg-fill hover:text-text",
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color ?? "var(--blue)" }}
                    />
                    {!collapsed && (
                      <>
                        <span className="truncate">{project.name}</span>
                        <span className="ml-auto font-mono text-caption2 text-muted">
                          {project.identifier}
                        </span>
                      </>
                    )}
                  </NavLink>
                </Tooltip>
              );
            })
          )}
        </nav>
      </div>

      {/* Footer */}
      <div className={cn("shrink-0 space-y-0.5 pb-3 pt-2", collapsed ? "px-2" : "px-3")}>
        <Tooltip label="New issue" shortcut="C" disabled={!collapsed}>
          <button
            type="button"
            onClick={onCreate}
            className={cn(
              "press mb-1.5 flex h-9 w-full items-center rounded-control bg-accent-fill text-body font-medium text-on-accent hover:brightness-95 pointer-coarse:h-11",
              collapsed ? "justify-center" : "gap-2 px-3",
            )}
            aria-label="New issue"
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            {!collapsed && (
              <>
                New issue
                <Kbd className="ml-auto bg-black/15 text-on-accent">C</Kbd>
              </>
            )}
          </button>
        </Tooltip>
        <AppearanceButton collapsed={collapsed} />
        <Tooltip label="Settings" disabled={!collapsed}>
          <NavLink
            to="/settings/appearance"
            aria-label="Settings"
            className={({ isActive }) =>
              cn(
                "press flex h-8 items-center rounded-control text-body transition-colors pointer-coarse:h-11",
                collapsed ? "justify-center" : "gap-2.5 px-2.5",
                isActive ? "bg-fill text-text" : "text-muted hover:bg-fill hover:text-text",
              )
            }
          >
            <Settings className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {!collapsed && "Settings"}
          </NavLink>
        </Tooltip>
        {collapsed && onToggleCollapsed && (
          <Tooltip label="Expand sidebar" shortcut="⌘\">
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Expand sidebar"
              className="press flex h-8 w-full items-center justify-center rounded-control text-muted hover:bg-fill hover:text-text"
            >
              <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function SearchField({ collapsed, onSearch }: { collapsed: boolean; onSearch: () => void }) {
  return (
    <Tooltip label="Search" shortcut="⌘K" disabled={!collapsed}>
      <button
        type="button"
        onClick={onSearch}
        aria-label="Search"
        className={cn(
          "press flex h-8 w-full items-center rounded-control bg-fill text-body text-muted hover:text-text pointer-coarse:h-11",
          collapsed ? "justify-center" : "gap-2 px-2.5",
        )}
      >
        <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        {!collapsed && (
          <>
            Search
            <Kbd className="ml-auto">⌘K</Kbd>
          </>
        )}
      </button>
    </Tooltip>
  );
}

function MobileTabBar({ onMore, onCreate }: { onMore: () => void; onCreate: () => void }) {
  const tab =
    "press flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-caption2 font-medium";
  return (
    <>
      <nav
        aria-label="Main"
        className="material hairline-t fixed inset-x-0 bottom-0 z-30 flex border-t border-border pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(tab, "h-14", isActive ? "text-accent" : "text-muted")
            }
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
        <button type="button" onClick={onMore} className={cn(tab, "h-14 text-muted")}>
          <Ellipsis className="h-5 w-5" strokeWidth={1.75} />
          More
        </button>
      </nav>
      <button
        type="button"
        onClick={onCreate}
        aria-label="New issue"
        className="press fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-accent-fill text-on-accent shadow-pop lg:hidden"
      >
        <Plus className="h-6 w-6" strokeWidth={2.25} />
      </button>
    </>
  );
}
