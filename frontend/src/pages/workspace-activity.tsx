import { PageHeader } from "../components/ui/page-header";
import { Card } from "../features/dashboard/card";
import { ActivityList } from "../features/issues/activity";

export function WorkspaceActivity() {
  return (
    <>
      <PageHeader title="Activity" subtitle="Everything happening across the workspace" />
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <Card className="p-2">
          <ActivityList limit={50} />
        </Card>
      </div>
    </>
  );
}
