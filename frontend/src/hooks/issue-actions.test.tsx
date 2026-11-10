import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../components/ui/toast";
import type { BoardData, Issue, IssuePage } from "../types";

vi.mock("../services/endpoints", async (orig) => {
  const real = await orig<typeof import("../services/endpoints")>();
  return {
    ...real,
    issuesService: {
      ...real.issuesService,
      update: vi.fn(),
      remove: vi.fn(),
      move: vi.fn(),
      bulkUpdate: vi.fn(),
      bulkRemove: vi.fn(),
    },
  };
});

import { issuesService } from "../services/endpoints";
import { useIssueActions } from "./queries";

const mk = (id: string, status: Issue["status"], project = "p1"): Issue => ({
  id,
  issue_key: id.toUpperCase(),
  project_id: project,
  title: `Issue ${id}`,
  description: null,
  status,
  priority: "medium",
  assignee_id: null,
  due_date: null,
  label_ids: [],
  position: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

const a = mk("a", "todo");
const b = mk("b", "todo");
const c = mk("c", "done");

const LIST = ["issues", { project_id: "p1" }] as const;
const BOARD = ["issues", "board", { project_id: "p1" }] as const;

function seed(qc: QueryClient) {
  const page: IssuePage = { items: [a, b, c], total: 3, page: 1, limit: 50 };
  const empty = { items: [], total: 0 };
  const board: BoardData = {
    columns: {
      backlog: empty,
      todo: { items: [a, b], total: 2 },
      in_progress: empty,
      in_review: empty,
      done: { items: [c], total: 1 },
      canceled: empty,
    },
  };
  qc.setQueryData(LIST, page);
  qc.setQueryData(BOARD, board);
}

let qc: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>
    <ToastProvider>{children}</ToastProvider>
  </QueryClientProvider>
);

const listItem = (id: string) => qc.getQueryData<IssuePage>(LIST)!.items.find((i) => i.id === id);
const boardCol = (s: Issue["status"]) => qc.getQueryData<BoardData>(BOARD)!.columns[s];

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  seed(qc);
  vi.mocked(issuesService.update).mockReset();
  vi.mocked(issuesService.remove).mockReset();
  vi.mocked(issuesService.move).mockReset();
  vi.mocked(issuesService.bulkUpdate).mockReset();
});
afterEach(() => vi.useRealTimers());

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

describe("setField (optimistic edit)", () => {
  it("patches every cached list BEFORE the server answers", async () => {
    const d = deferred<Issue>();
    vi.mocked(issuesService.update).mockReturnValue(d.promise);
    const { result } = renderHook(() => useIssueActions(), { wrapper });

    let done!: Promise<boolean>;
    await act(async () => {
      done = result.current.setField(a, { status: "done" });
    });

    // Server has not responded yet, but both the list and the board already show it.
    expect(listItem("a")?.status).toBe("done");
    expect(boardCol("todo").items.map((i) => i.id)).toEqual(["b"]);
    expect(boardCol("todo").total).toBe(1);
    expect(boardCol("done").items.map((i) => i.id)).toContain("a");
    expect(boardCol("done").total).toBe(2);

    await act(async () => {
      d.resolve({ ...a, status: "done" });
      await done;
    });
    expect(issuesService.update).toHaveBeenCalledWith("a", { status: "done" });
  });

  it("rolls back and reports when the server rejects", async () => {
    vi.mocked(issuesService.update).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useIssueActions(), { wrapper });

    let ok = true;
    await act(async () => {
      ok = await result.current.setField(a, { status: "done" });
    });

    expect(ok).toBe(false);
    expect(listItem("a")?.status).toBe("todo");
    expect(boardCol("todo").items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(boardCol("done").total).toBe(1);
    expect(await screen.findByText("Could not update issue")).toBeInTheDocument();
  });

  it("offers Undo that restores the previous value", async () => {
    vi.mocked(issuesService.update).mockImplementation(async (id, input) => ({ ...a, id, ...input }) as Issue);
    const { result } = renderHook(() => useIssueActions(), { wrapper });

    await act(async () => {
      await result.current.setField(a, { priority: "urgent" }, { label: "Priority: Urgent" });
    });
    expect(listItem("a")?.priority).toBe("urgent");

    await userEvent.setup().click(await screen.findByRole("button", { name: "Undo" }));
    await waitFor(() => expect(listItem("a")?.priority).toBe("medium"));
    expect(issuesService.update).toHaveBeenLastCalledWith("a", { priority: "medium" });
  });
});

describe("remove (deferred delete)", () => {
  it("hides instantly, deletes only after the undo window", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(issuesService.remove).mockResolvedValue(undefined);
    const { result } = renderHook(() => useIssueActions(), { wrapper });

    await act(async () => {
      await result.current.remove([a]);
    });
    expect(listItem("a")).toBeUndefined();
    expect(qc.getQueryData<IssuePage>(LIST)!.total).toBe(2);
    expect(issuesService.remove).not.toHaveBeenCalled(); // still undoable

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(issuesService.remove).toHaveBeenCalledWith("a");
  });

  it("Undo cancels the delete and brings the issue back", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useIssueActions(), { wrapper });

    await act(async () => {
      await result.current.remove([a]);
    });
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(
      await screen.findByRole("button", { name: "Undo" }),
    );
    expect(listItem("a")?.status).toBe("todo");
    expect(boardCol("todo").items.map((i) => i.id)).toContain("a");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(issuesService.remove).not.toHaveBeenCalled();
  });
});

describe("move (board drag)", () => {
  it("reorders inside a column immediately and sends the index", async () => {
    const d = deferred<Issue>();
    vi.mocked(issuesService.move).mockReturnValue(d.promise);
    const { result } = renderHook(() => useIssueActions(), { wrapper });

    await act(async () => {
      void result.current.move(b, "todo", 0);
    });
    expect(boardCol("todo").items.map((i) => i.id)).toEqual(["b", "a"]);
    expect(issuesService.move).toHaveBeenCalledWith("b", "todo", 0);
    await act(async () => d.resolve(b));
  });

  it("counts only same-project cards when the column mixes projects", async () => {
    // todo: [x(p2), a(p1)] — dropping b(p1) at server index 0 means "before a", i.e. after x? No:
    // index 0 among p1 cards is before `a`, so it lands right before `a` (after x).
    const x = mk("x", "todo", "p2");
    qc.setQueryData<BoardData>(BOARD, (d) => ({
      columns: { ...d!.columns, todo: { items: [x, a], total: 2 }, in_progress: { items: [b], total: 1 } },
    }));
    vi.mocked(issuesService.move).mockResolvedValue(b);
    const { result } = renderHook(() => useIssueActions(), { wrapper });
    await act(async () => {
      void result.current.move(b, "todo", 0);
    });
    expect(boardCol("todo").items.map((i) => i.id)).toEqual(["x", "b", "a"]);
  });

  it("rolls back a failed move", async () => {
    vi.mocked(issuesService.move).mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useIssueActions(), { wrapper });
    await act(async () => {
      await result.current.move(a, "done", 0);
    });
    expect(boardCol("todo").items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(boardCol("done").items.map((i) => i.id)).toEqual(["c"]);
  });
});
