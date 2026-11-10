import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

// Chips: system color at ~14% over the surface, full-strength text-safe color.
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-medium",
  {
    variants: {
      variant: {
        default: "bg-fill text-muted",
        accent: "bg-accent-soft text-accent",
        success: "bg-sys-green/15 text-green-text",
        warning: "bg-sys-orange/15 text-orange-text",
        danger: "bg-sys-red/15 text-red-text",
        outline: "border border-border bg-transparent text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
