import * as React from "react";
import { Plus } from "lucide-react";
import type { IssueStatus } from "../types";
import { PageHeader } from "../components/ui/page-header";
import { Button } from "../components/ui/button";
import { Board } from "../features/board/board";
import { FilterBar } from "../features/issues/filter-bar";
import { IssueDrawer } from "../features/issues/issue-drawer";
import { CreateIssueDialog } from "../features/issues/create-issue-dialog";
import { useIssueFilters, useOpenIssue } from "../features/issues/use-issue-filters";
import { ProjectPicker, ViewSwitch } from "../features/issues/view-controls";

export function BoardPage() {
  const url = useIssueFilters();
  const [issueId, openIssue] = useOpenIssue();
  const [create, setCreate] = React.useState<{ status?: IssueStatus } | null>(null);
  const { filters, set } = url;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Board"
        actions={
          <>
            <ProjectPicker value={filters.project_id} onChange={(id) => set({ project_id: id })} />
            <ViewSwitch current="board" />
            <Button className="max-lg:hidden" onClick={() => setCreate({})}>
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              New issue
            </Button>
          </>
        }
      />
      <div className="px-4 pt-4 md:px-6">
        <FilterBar url={url} showSort={false} />
      </div>
      <div className="min-h-0 flex-1 p-4 md:px-6">
        <Board
          filters={filters}
          onOpen={(issue) => openIssue(issue.id)}
          onCreateIn={(status) => setCreate({ status })}
        />
      </div>
      {create && (
        <CreateIssueDialog
          open
          onOpenChange={(o) => !o && setCreate(null)}
          projectId={filters.project_id}
          defaultStatus={create.status}
        />
      )}
      <IssueDrawer issueId={issueId} onClose={() => openIssue(null)} />
    </div>
  );
}
