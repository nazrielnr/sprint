import * as React from "react";
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router";
import { PageHeader } from "../components/ui/page-header";
import { Button } from "../components/ui/button";
import { IssueTable } from "../features/issues/issue-table";
import { IssueDrawer } from "../features/issues/issue-drawer";
import { CreateIssueDialog } from "../features/issues/create-issue-dialog";
import { FilterBar } from "../features/issues/filter-bar";
import { useIssueFilters, useOpenIssue } from "../features/issues/use-issue-filters";
import { ProjectPicker, ViewSwitch } from "../features/issues/view-controls";

export function IssuesPage() {
  const url = useIssueFilters();
  const [issueId, openIssue] = useOpenIssue();
  const [createOpen, setCreateOpen] = React.useState(false);
  const { filters, page, set, setPage, clear, hasActive } = url;
  const [params] = useSearchParams();
  // Real links (open in new tab, copy address) that keep the current filters.
  const issueHref = (issue: { id: string }) => {
    const next = new URLSearchParams(params);
    next.set("issue", issue.id);
    return `/issues?${next.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Issues"
        actions={
          <>
            <ProjectPicker value={filters.project_id} onChange={(id) => set({ project_id: id })} />
            <ViewSwitch current="list" />
            <Button className="max-lg:hidden" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              New issue
            </Button>
          </>
        }
      />
      <div className="space-y-4 p-4 md:p-6">
        <FilterBar url={url} />
        <IssueTable
          filters={filters}
          page={page}
          onPageChange={setPage}
          onOpen={(issue) => openIssue(issue.id)}
          issueHref={issueHref}
          showProject={!filters.project_id}
          hasActiveFilters={hasActive}
          onClearFilters={clear}
          onCreate={() => setCreateOpen(true)}
        />
      </div>
      {createOpen && (
        <CreateIssueDialog open onOpenChange={setCreateOpen} projectId={filters.project_id} />
      )}
      <IssueDrawer issueId={issueId} onClose={() => openIssue(null)} />
    </>
  );
}
