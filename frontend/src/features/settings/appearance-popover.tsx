import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { ACCENTS, useAppearance, type ThemeMode } from "../../hooks/use-theme";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Tooltip } from "../../components/ui/tooltip";
import { cn } from "../../lib/utils";

const MODES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "auto", label: "Auto", icon: Monitor },
];

/** Theme mode + accent picker. Used in the sidebar footer and in Settings. */
export function AppearancePanel() {
  const { mode, setMode, accent, setAccent } = useAppearance();
  return (
    <div className="space-y-4 p-2">
      <div>
        <p className="mb-2 text-caption font-medium text-muted">Appearance</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              onClick={() => setMode(id)}
              className={cn(
                "press flex flex-col items-center gap-1.5 rounded-control border p-2 text-caption font-medium",
                mode === id
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-transparent bg-fill text-muted hover:text-text",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-caption font-medium text-muted">Accent color</p>
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Accent color">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={accent === a.id}
              aria-label={a.label}
              title={a.label}
              onClick={() => setAccent(a.id)}
              className="press relative flex h-6 w-6 items-center justify-center rounded-full"
              style={{ backgroundColor: a.cssVar }}
            >
              {accent === a.id && (
                <Check className="h-3.5 w-3.5 text-white mix-blend-difference" strokeWidth={3} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppearanceButton({ collapsed }: { collapsed?: boolean }) {
  return (
    <Popover>
      <Tooltip label="Appearance" disabled={!collapsed}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "press flex h-8 items-center gap-2.5 rounded-control text-body text-muted hover:bg-fill hover:text-text pointer-coarse:h-11",
              collapsed ? "w-full justify-center" : "w-full px-2.5",
            )}
            aria-label="Appearance"
          >
            <Palette className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {!collapsed && "Appearance"}
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent side="top" align="start" className="w-64">
        <AppearancePanel />
      </PopoverContent>
    </Popover>
  );
}
