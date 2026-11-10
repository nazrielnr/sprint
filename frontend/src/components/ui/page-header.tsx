import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

/** Sticky page header: large title on the left, contextual controls on the right. */
export function PageHeader({
  title,
  subtitle,
  leading,
  actions,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "material hairline-b sticky top-0 z-10 flex min-h-[60px] flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2.5 md:px-6",
        className,
      )}
    >
      {leading}
      <div className="min-w-0">
        <h1 className="truncate text-largetitle font-bold tracking-[-0.02em] text-text max-md:text-title">
          {title}
        </h1>
        {subtitle && <p className="text-callout text-muted">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 max-md:-mx-4 max-md:w-[calc(100%+2rem)] max-md:overflow-x-auto max-md:px-4 max-md:pb-0.5 md:ml-auto md:flex-wrap [&>*]:shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
