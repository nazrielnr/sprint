import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <TooltipPrimitive.Provider delayDuration={400} skipDelayDuration={150}>
    {children}
  </TooltipPrimitive.Provider>
);

/** Small label tooltip, optionally with a keyboard hint. */
export function Tooltip({
  label,
  shortcut,
  side = "right",
  disabled,
  children,
}: {
  label: string;
  shortcut?: string;
  side?: "top" | "right" | "bottom" | "left";
  disabled?: boolean;
  children: React.ReactElement;
}) {
  if (disabled) return children;
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          className="z-50 flex items-center gap-2 rounded-control bg-[var(--label)] px-2 py-1 text-caption font-medium text-[var(--bg)] shadow-pop"
        >
          {label}
          {shortcut && (
            <span className="rounded bg-white/20 px-1 font-mono text-caption2 opacity-80">
              {shortcut}
            </span>
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
