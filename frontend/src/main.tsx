import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Navigate, RouterProvider, useParams } from "react-router";
import { ToastProvider } from "./components/ui/toast";
import { ErrorBoundary, RouteError } from "./components/error-boundary";
import { AppLayout } from "./layouts/app-layout";
import { useUsers } from "./hooks/queries";
import "@fontsource-variable/inter/wght.css";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Old per-project URLs → workspace views scoped with ?project=. */
function LegacyProject({ to }: { to: "" | "issues" | "board" }) {
  const { projectId } = useParams<{ projectId: string }>();
  const path = to === "" ? "/" : `/${to}`;
  return <Navigate to={`${path}?project=${projectId}`} replace />;
}

/** "My issues" is now the Mine filter on Issues (no auth yet: first user stands in for me). */
function MyIssuesRedirect() {
  const { data: users, isPending } = useUsers();
  if (isPending) return null;
  return <Navigate to={users?.[0] ? `/issues?assignee=${users[0].id}` : "/issues"} replace />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      // Pages load on demand: the board (dnd-kit) and the rest stay out of the first paint.
      { index: true, lazy: async () => ({ Component: (await import("./pages/dashboard-overview")).DashboardOverview }) },
      { path: "issues", lazy: async () => ({ Component: (await import("./pages/issues-page")).IssuesPage }) },
      { path: "board", lazy: async () => ({ Component: (await import("./pages/board-page")).BoardPage }) },
      { path: "activity", lazy: async () => ({ Component: (await import("./pages/workspace-activity")).WorkspaceActivity }) },
      { path: "projects", lazy: async () => ({ Component: (await import("./pages/projects-list")).ProjectsList }) },
      { path: "settings/appearance", lazy: async () => ({ Component: (await import("./pages/settings-appearance")).SettingsAppearance }) },
      // Legacy URLs
      { path: "projects/:projectId", element: <LegacyProject to="" /> },
      { path: "projects/:projectId/issues", element: <LegacyProject to="issues" /> },
      { path: "projects/:projectId/board", element: <LegacyProject to="board" /> },
      { path: "my-issues", element: <MyIssuesRedirect /> },
      { path: "search", element: <Navigate to="/issues" replace /> },
      { path: "*", lazy: async () => ({ Component: (await import("./pages/not-found")).NotFound }) },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
