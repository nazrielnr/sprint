import * as React from "react";
import { Link } from "react-router";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2, Kanban, ListTodo } from "lucide-react";
import { useProjects, useUpdateProject, useDeleteProject, errorMessage } from "../hooks/queries";
import type { Project } from "../types";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { PageHeader } from "../components/ui/page-header";
import { Card } from "../features/dashboard/card";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { ProjectFormDialog } from "../features/projects/project-dialogs";
import { ErrorState, EmptyState } from "../components/ui/states";

export function ProjectsList() {
  const query = useProjects();
  const update = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editProject, setEditProject] = React.useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Project | null>(null);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={`${query.data?.length ?? "…"} ${query.data?.length === 1 ? "project" : "projects"}`}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            New project
          </Button>
        }
      />
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      {query.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : query.data!.length === 0 ? (
        <EmptyState hasFilters={false} createLabel="project" onCreate={() => setCreateOpen(true)} />
      ) : (
        <Card className="overflow-hidden">
          {query.data!.map((project, i) => (
            <div
              key={project.id}
              className={`hairline-t flex items-center gap-4 px-4 py-3 transition-colors hover:bg-fill/60 ${
                i > 0 ? "border-t border-border" : ""
              } ${project.status === "archived" ? "opacity-60" : ""}`}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: project.color ?? "var(--blue)" }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/issues?project=${project.id}`}
                    className="truncate text-body font-semibold text-text hover:text-accent"
                  >
                    {project.name}
                  </Link>
                  <span className="font-mono text-caption text-muted">{project.identifier}</span>
                  {project.status === "archived" && (
                    <span className="rounded-full bg-fill px-2 py-0.5 text-caption text-muted">
                      Archived
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="mt-0.5 truncate text-callout text-muted">{project.description}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  to={`/board?project=${project.id}`}
                  aria-label="Board view"
                  title="Board view"
                  className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-fill hover:text-text"
                >
                  <Kanban className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to={`/issues?project=${project.id}`}
                  aria-label="Issues view"
                  className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-fill hover:text-text"
                  title="Issues view"
                >
                  <ListTodo className="h-3.5 w-3.5" />
                </Link>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label="Edit project"
                  title="Edit project"
                  onClick={() => setEditProject(project)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label={project.status === "active" ? "Archive project" : "Restore project"}
                  title={project.status === "active" ? "Archive project" : "Restore project"}
                  onClick={() =>
                    update.mutate({
                      id: project.id,
                      input: { status: project.status === "active" ? "archived" : "active" },
                    })
                  }
                >
                  {project.status === "active" ? (
                    <Archive className="h-3.5 w-3.5" />
                  ) : (
                    <ArchiveRestore className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label="Delete project"
                  title="Delete project"
                  className="text-muted hover:bg-sys-red/10 hover:text-red-text"
                  onClick={() => setDeleteTarget(project)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editProject && (
        <ProjectFormDialog
          open
          onOpenChange={(open) => !open && setEditProject(null)}
          project={editProject}
        />
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete ${deleteTarget?.name ?? ""}?`}
        description="The project, its issues, comments, and activity will be permanently removed."
        confirmLabel="Delete project"
        onConfirm={() => {
          if (deleteTarget) deleteProject.mutate(deleteTarget.id);
        }}
      />
      </div>
    </>
  );
}
