import { ChevronDown, Kanban, ListTodo } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useProjects } from "../../hooks/queries";
import { OptionPicker, type PickerOption } from "../../components/ui/option-picker";
import { Segmented } from "../../components/ui/segmented";
import { cn } from "../../lib/utils";

const ALL = "__all__";

/** Project scope chip. `value` comes from the URL (`?project=`), see use-issue-filters. */
export function ProjectPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
}) {
  const { data: projects } = useProjects();
  const active = (projects ?? []).filter((p) => p.status === "active");
  const current = active.find((p) => p.id === value);
  const options: PickerOption[] = [
    { value: ALL, label: "All projects" },
    ...active.map((p) => ({
      value: p.id,
      label: p.name,
      keywords: p.identifier,
      icon: (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: p.color ?? "var(--blue)" }}
        />
      ),
    })),
  ];
  return (
    <OptionPicker
      options={options}
      value={value ?? ALL}
      onChange={(v) => onChange(v === ALL ? undefined : v)}
      placeholder="Switch project…"
      align="end"
      trigger={
        <button
          type="button"
          aria-label="Project"
          className={cn(
            "press inline-flex h-8 items-center gap-2 rounded-control bg-fill px-3 text-body font-medium text-text hover:bg-fill/80 pointer-coarse:h-10",
          )}
        >
          {current && (
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: current.color ?? "var(--blue)" }} />
          )}
          <span className="max-w-[10rem] truncate">{current?.name ?? "All projects"}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      }
    />
  );
}

/** List | Board toggle that carries the current query string across views. */
export function ViewSwitch({ current }: { current: "list" | "board" }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const go = (view: "list" | "board") => {
    const next = new URLSearchParams(params);
    next.delete("issue");
    next.delete("page");
    if (view === "board") next.delete("sort"); // the board has no sort
    const qs = next.toString();
    navigate(`${view === "list" ? "/issues" : "/board"}${qs ? `?${qs}` : ""}`);
  };
  return (
    <Segmented
      label="View"
      value={current}
      onChange={go}
      options={[
        { value: "list", label: "List", icon: <ListTodo className="h-3.5 w-3.5" strokeWidth={1.75} /> },
        { value: "board", label: "Board", icon: <Kanban className="h-3.5 w-3.5" strokeWidth={1.75} /> },
      ]}
    />
  );
}
