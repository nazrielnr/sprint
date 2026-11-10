import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptionPicker, type PickerOption } from "./option-picker";

const OPTIONS: PickerOption[] = [
  { value: "backlog", label: "Backlog", hint: "1" },
  { value: "todo", label: "Todo", hint: "2" },
  { value: "done", label: "Done", hint: "3" },
];

function setup(props: Partial<React.ComponentProps<typeof OptionPicker>> = {}) {
  const onChange = vi.fn();
  render(
    <OptionPicker
      options={OPTIONS}
      value="todo"
      onChange={onChange}
      trigger={<button>Status</button>}
      {...props}
    />,
  );
  return { onChange, user: userEvent.setup() };
}

describe("OptionPicker", () => {
  it("opens from the trigger and lists every option", async () => {
    const { user } = setup();
    expect(screen.queryByRole("listbox")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Status" }));
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("option", { name: /Todo/ })).toHaveAttribute("aria-selected", "true");
  });

  it("selects on click and closes", async () => {
    const { user, onChange } = setup();
    await user.click(screen.getByRole("button", { name: "Status" }));
    await user.click(screen.getByRole("option", { name: /Done/ }));
    expect(onChange).toHaveBeenCalledWith("done");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("filters by typing and selects the match with Enter", async () => {
    const { user, onChange } = setup();
    await user.click(screen.getByRole("button", { name: "Status" }));
    await user.keyboard("bac");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("backlog");
  });

  it("moves with the arrow keys", async () => {
    const { user, onChange } = setup();
    await user.click(screen.getByRole("button", { name: "Status" }));
    await user.keyboard("{ArrowDown}{Enter}"); // starts on the current value (todo) → done
    expect(onChange).toHaveBeenCalledWith("done");
  });

  it("number hints are shortcuts while the search box is empty", async () => {
    const { user, onChange } = setup();
    await user.click(screen.getByRole("button", { name: "Status" }));
    await user.keyboard("3");
    expect(onChange).toHaveBeenCalledWith("done");
  });

  it("shows an empty state when nothing matches", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Status" }));
    await user.keyboard("zzz");
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("multi-select toggles without closing", async () => {
    const onChange = vi.fn();
    render(
      <OptionPicker
        options={OPTIONS}
        values={["todo"]}
        multiple
        onChange={onChange}
        trigger={<button>Labels</button>}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Labels" }));
    await user.click(screen.getByRole("option", { name: /Done/ }));
    expect(onChange).toHaveBeenCalledWith("done");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("does not leak clicks to a clickable parent row", async () => {
    const rowClick = vi.fn();
    render(
      <div onClick={rowClick}>
        <OptionPicker
          options={OPTIONS}
          value="todo"
          onChange={() => {}}
          trigger={<button onClick={(e) => e.stopPropagation()}>Status</button>}
        />
      </div>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Status" }));
    await user.click(screen.getByRole("option", { name: /Done/ }));
    expect(rowClick).not.toHaveBeenCalled();
  });
});
