import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "../../lib/utils";

type ToastKind = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  kind: ToastKind;
  /** e.g. { label: "Undo", onClick } — keeps the toast up a little longer. */
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((item: Omit<ToastItem, "id">) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev.slice(-3), { ...item, id }]);
  }, []);

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" label="Notifications">
        {children}
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            open
            onOpenChange={(open) => {
              if (!open) dismiss(t.id);
            }}
            duration={t.duration ?? (t.action ? 6000 : t.kind === "error" ? 6000 : 3500)}
            className={cn(
              "pointer-events-auto flex w-[min(24rem,calc(100vw-2rem))] bg-surface items-center gap-3 rounded-pop py-2.5 pl-3.5 pr-2.5 shadow-pop",
              "data-[state=open]:animate-[toast-in_300ms_var(--ease)] data-[state=closed]:animate-[toast-out_200ms_var(--ease)]",
            )}
          >
            <span className="shrink-0">
              {t.kind === "success" && <CheckCircle2 className="h-[18px] w-[18px] text-success" />}
              {t.kind === "error" && <AlertCircle className="h-[18px] w-[18px] text-danger" />}
              {t.kind === "info" && <Info className="h-[18px] w-[18px] text-accent" />}
            </span>
            <div className="min-w-0 flex-1">
              <ToastPrimitive.Title className="text-body font-medium text-text">
                {t.title}
              </ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="text-callout text-muted">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            {t.action && (
              <ToastPrimitive.Action
                altText={t.action.label}
                onClick={t.action.onClick}
                className="press h-7 shrink-0 rounded-control px-2.5 text-callout font-semibold text-accent hover:bg-accent-soft pointer-coarse:h-10"
              >
                {t.action.label}
              </ToastPrimitive.Action>
            )}
            <ToastPrimitive.Close
              aria-label="Dismiss"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-fill hover:text-text pointer-coarse:h-9 pointer-coarse:w-9"
            >
              <X className="h-3.5 w-3.5" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        {/* Phones: above the tab bar, FAB and bulk bar (never over a sheet header). Desktop: bottom-right, clear of the centered bulk bar. */}
        <ToastPrimitive.Viewport className="fixed bottom-[calc(148px+env(safe-area-inset-bottom))] left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2 outline-none lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0 lg:items-end" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
