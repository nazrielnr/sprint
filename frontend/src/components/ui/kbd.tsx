import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex pointer-coarse:hidden h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-fill px-1 font-sans text-caption2 font-medium text-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
