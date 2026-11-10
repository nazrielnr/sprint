import { Dialog, DialogContent } from "../../components/ui/dialog";
import { Kbd } from "../../components/ui/kbd";

const GROUPS: { title: string; items: [string[], string][] }[] = [
  {
    title: "Global",
    items: [
      [["⌘", "K"], "Command palette"],
      [["/"], "Search"],
      [["C"], "New issue"],
      [["G", "O"], "Go to Overview"],
      [["G", "I"], "Go to Issues"],
      [["G", "B"], "Go to Board"],
      [["⌘", "\\"], "Collapse sidebar"],
      [["?"], "This help"],
    ],
  },
  {
    title: "Issue list",
    items: [
      [["J", "K"], "Move down / up"],
      [["↵"], "Open issue"],
      [["X"], "Select"],
      [["S"], "Set status"],
      [["P"], "Set priority"],
      [["A"], "Assign"],
      [["D"], "Set due date"],
      [["⌫"], "Delete (undo for 5 s)"],
      [["Esc"], "Clear selection"],
    ],
  },
  {
    title: "Board",
    items: [
      [["Tab"], "Focus a card"],
      [["Space"], "Pick up / drop a card"],
      [["↑", "↓", "←", "→"], "Move while holding"],
      [["↵"], "Open card"],
      [["Esc"], "Cancel move"],
    ],
  },
  {
    title: "In a menu",
    items: [
      [["↑", "↓"], "Move"],
      [["↵"], "Choose"],
      [["1", "–", "6"], "Choose by number"],
      [["Esc"], "Close"],
    ],
  },
];

export function ShortcutsHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Keyboard shortcuts" className="max-w-2xl">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="mb-1.5 text-caption font-semibold uppercase tracking-wider text-muted">
                {g.title}
              </h3>
              <ul>
                {g.items.map(([keys, label]) => (
                  <li key={label} className="flex items-center justify-between gap-3 py-1 text-body">
                    <span className="text-text">{label}</span>
                    <span className="flex shrink-0 gap-1">
                      {keys.map((k, i) => (
                        <Kbd key={`${k}-${i}`}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
