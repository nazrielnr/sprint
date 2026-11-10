import { PageHeader } from "../components/ui/page-header";
import { Card } from "../features/dashboard/card";
import { AppearancePanel } from "../features/settings/appearance-popover";

export function SettingsAppearance() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Appearance" />
      <div className="mx-auto max-w-xl space-y-6 p-4 md:p-6">
        <Card className="p-2">
          <AppearancePanel />
        </Card>
        <p className="text-callout text-muted">
          Auto follows your system. Your choice is saved to this browser.
        </p>
      </div>
    </>
  );
}
