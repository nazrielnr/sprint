import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

export type DrawerContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
  "title"
> & {
  title: React.ReactNode;
  description?: string;
  /** Buttons shown in the header, before Close. */
  actions?: React.ReactNode;
};

/** Right-hand panel on desktop, bottom sheet on phones. */
export function DrawerContent({
  className,
  children,
  title,
  description,
  actions,
  ...props
}: DrawerContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/30 data-[state=open]:animate-[fade-in_250ms_var(--ease)] data-[state=closed]:animate-[fade-out_200ms_var(--ease)]" />
      <DialogPrimitive.Content
        aria-describedby={description ? undefined : undefined}
        className={cn(
          "fixed z-50 flex flex-col bg-surface text-text shadow-pop outline-none",
          // phone: sheet
          "inset-x-0 bottom-0 top-10 rounded-t-[14px] data-[state=open]:animate-[sheet-in_350ms_var(--ease)] data-[state=closed]:animate-[sheet-out_250ms_var(--ease)]",
          // desktop: side panel
          "md:inset-y-0 md:left-auto md:right-0 md:top-0 md:w-[min(34rem,100vw)] md:rounded-none md:border-l md:border-border md:data-[state=open]:animate-[drawer-in_350ms_var(--ease)] md:data-[state=closed]:animate-[drawer-out_250ms_var(--ease)]",
          className,
        )}
        {...props}
      >
        <div className="hairline-b flex min-h-[52px] items-center gap-2 border-b border-border px-4">
          <div className="min-w-0 flex-1">
            <DialogPrimitive.Title className="truncate text-headline font-semibold text-text">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {description ?? "Details panel"}
            </DialogPrimitive.Description>
          </div>
          {actions}
          <DialogPrimitive.Close
            aria-label="Close"
            className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-fill hover:text-text pointer-coarse:h-11 pointer-coarse:w-11"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
