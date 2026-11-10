import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/** iOS-style segmented control. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex rounded-control bg-fill p-0.5", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-[6px] px-3 text-callout font-medium transition-[background-color,box-shadow,color] duration-150 pointer-coarse:h-9",
              active
                ? "bg-surface text-text shadow-card"
                : "text-muted hover:text-text",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
