import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogContent({
  className,
  children,
  title,
  description,
  hideTitle,
  hideClose,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /** Always provide a title (screen readers need one); use hideTitle to hide it visually. */
  title: React.ReactNode;
  description?: React.ReactNode;
  hideTitle?: boolean;
  hideClose?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_200ms_var(--ease)] data-[state=closed]:animate-[fade-out_150ms_var(--ease)]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-pop bg-surface p-5 text-text shadow-pop outline-none",
          "data-[state=open]:animate-[dialog-in_250ms_var(--ease)] data-[state=closed]:animate-[dialog-out_150ms_var(--ease)]",
          className,
        )}
        {...props}
      >
        <div className={cn(!hideTitle && "mb-4")}>
          <DialogPrimitive.Title
            className={cn(hideTitle ? "sr-only" : "text-title font-semibold tracking-tight text-text")}
          >
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            className={cn(description && !hideTitle ? "mt-1 text-callout text-muted" : "sr-only")}
          >
            {description ?? (typeof title === "string" ? title : "Dialog")}
          </DialogPrimitive.Description>
        </div>
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            aria-label="Close"
            className="press absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-fill hover:text-text pointer-coarse:h-10 pointer-coarse:w-10"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
