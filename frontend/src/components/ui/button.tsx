import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "press inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-control text-body font-medium disabled:pointer-events-none disabled:opacity-40 pointer-coarse:min-h-11",
  {
    variants: {
      variant: {
        default: "bg-accent-fill text-on-accent hover:brightness-95",
        secondary: "bg-fill text-text hover:bg-fill/80 hover:brightness-95",
        ghost: "text-muted hover:bg-fill hover:text-text",
        danger: "bg-sys-red/15 text-red-text hover:bg-sys-red/25",
        outline: "border border-border bg-transparent text-text hover:bg-fill",
      },
      size: {
        default: "h-8 px-3.5",
        sm: "h-7 px-2.5 text-callout",
        xs: "h-6 px-2 text-caption",
        icon: "h-8 w-8",
        iconSm: "h-7 w-7",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
