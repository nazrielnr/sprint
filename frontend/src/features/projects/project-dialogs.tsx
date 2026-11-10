import * as React from "react";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input, Textarea } from "../../components/ui/input";
import { useCreateProject, useUpdateProject } from "../../hooks/queries";
import type { Project } from "../../types";

// Apple system colors (light-mode values); every theme reads them fine.
const COLORS = ["#007AFF", "#34C759", "#FF9500", "#FF3B30", "#5AC8FA", "#FF2D55", "#AF52DE", "#5856D6"];

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}) {
  const create = useCreateProject();
  const update = useUpdateProject();

  const [name, setName] = React.useState("");
  const [identifier, setIdentifier] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState(COLORS[0]);

  React.useEffect(() => {
    if (open) {
      setName(project?.name ?? "");
      setIdentifier(project?.identifier ?? "");
      setDescription(project?.description ?? "");
      setColor(project?.color ?? COLORS[0]);
    }
  }, [open, project]);

  const isEdit = !!project;
  const mutation = isEdit ? update : create;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const input = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      ...(isEdit ? {} : { identifier: identifier.trim().toUpperCase() || undefined }),
    };
    if (isEdit) {
      update.mutate(
        { id: project.id, input },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(input, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={isEdit ? `Edit ${project!.name}` : "New project"}
        description={
          isEdit
            ? "Update the project details"
            : "Identifier prefixes issue keys, e.g. WEB → WEB-001"
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-callout font-medium text-muted">Name</span>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Website Redesign"
              required
            />
          </label>
          {!isEdit && (
            <label className="block space-y-1.5">
              <span className="text-callout font-medium text-muted">Identifier</span>
              <Input
                value={identifier}
                onChange={(e) =>
                  setIdentifier(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
                placeholder="WEB"
                maxLength={5}
              />
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-callout font-medium text-muted">Description</span>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={2}
            />
          </label>
          <div className="space-y-1.5">
            <span className="text-callout font-medium text-muted">Color</span>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "var(--color-text)" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ArchiveToggle({
  project,
  onToggle,
}: {
  project: Project;
  onToggle: () => void;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onToggle} title="Archive or restore project">
      {project.status === "active" ? "Archive" : "Restore"}
    </Button>
  );
}

export { COLORS };
