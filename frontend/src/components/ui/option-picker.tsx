import * as React from "react";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "../../lib/utils";

export interface PickerOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  /** Extra text matched by the search box. */
  keywords?: string;
  /** Small trailing text (e.g. a key). */
  hint?: string;
}

interface Props<T extends string> {
  options: PickerOption<T>[];
  /** Single-select value. */
  value?: T | null;
  /** Multi-select values (keeps the popover open). */
  values?: T[];
  multiple?: boolean;
  onChange: (value: T) => void;
  placeholder?: string;
  trigger: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  /** Rendered under the list (e.g. "Clear"). */
  footer?: React.ReactNode;
}

/**
 * A popover list with a search box and full keyboard support
 * (type to filter, ↑/↓, Enter, Esc). Replaces native <select>.
 */
export function OptionPicker<T extends string>({
  options,
  value,
  values,
  multiple,
  onChange,
  placeholder = "Search…",
  trigger,
  open: openProp,
  onOpenChange,
  align = "start",
  side = "bottom",
  className,
  footer,
}: Props<T>) {
  const [openState, setOpenState] = React.useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };

  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.keywords ?? ""}`.toLowerCase().includes(q));
  }, [options, query]);

  // Reset on open; start on the current selection.
  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    const idx = options.findIndex((o) => (multiple ? false : o.value === value));
    setActive(Math.max(0, idx));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const select = (opt: PickerOption<T>) => {
    onChange(opt.value);
    if (!multiple) setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // don't trigger row / page shortcuts while the picker is open
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (filtered.length ? (a + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (filtered.length ? (a - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) select(opt);
    } else if (!query && !e.metaKey && !e.ctrlKey && /^[0-9]$/.test(e.key)) {
      // Number hints are shortcuts while the search box is empty.
      const opt = options.find((o) => o.hint === e.key);
      if (opt) {
        e.preventDefault();
        select(opt);
      }
    }
  };

  const isSelected = (v: T) => (multiple ? !!values?.includes(v) : v === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className={cn("w-60 p-0", className)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).querySelector<HTMLInputElement>("input")?.focus();
        }}
      >
        <div className="hairline-b border-b border-border px-3 py-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full bg-transparent text-body text-text outline-none placeholder:text-subtle"
            style={{ boxShadow: "none" }}
          />
        </div>
        <div ref={listRef} role="listbox" aria-multiselectable={multiple} className="max-h-64 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-2.5 py-3 text-center text-callout text-muted">No results</p>
          ) : (
            filtered.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected(opt.value)}
                data-index={i}
                onMouseMove={() => setActive(i)}
                onClick={() => select(opt)}
                className={cn(
                  "flex h-8 w-full items-center gap-2.5 rounded-[6px] px-2.5 text-left text-body text-text pointer-coarse:h-11",
                  i === active && "bg-fill",
                )}
              >
                {opt.icon}
                <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                {opt.hint && <span className="font-mono text-caption2 text-muted">{opt.hint}</span>}
                {isSelected(opt.value) && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.25} />}
              </button>
            ))
          )}
        </div>
        {footer && <div className="hairline-t border-t border-border p-1.5">{footer}</div>}
      </PopoverContent>
    </Popover>
  );
}

/** Shared look for a picker trigger: reads like text, reveals a fill on hover. */
export const pickerTriggerClass =
  "press inline-flex h-7 max-w-full items-center gap-1.5 rounded-control px-1.5 text-callout text-text hover:bg-fill data-[state=open]:bg-fill pointer-coarse:h-10";
