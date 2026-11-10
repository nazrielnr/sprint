import * as React from "react";

const MODE_KEY = "sprint-theme";
const ACCENT_KEY = "sprint-accent";

export type ThemeMode = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";
export type Accent =
  | "blue"
  | "purple"
  | "pink"
  | "red"
  | "orange"
  | "green"
  | "graphite";

export const ACCENTS: { id: Accent; label: string; cssVar: string }[] = [
  { id: "blue", label: "Blue", cssVar: "var(--blue)" },
  { id: "purple", label: "Purple", cssVar: "var(--purple)" },
  { id: "pink", label: "Pink", cssVar: "var(--pink)" },
  { id: "red", label: "Red", cssVar: "var(--red)" },
  { id: "orange", label: "Orange", cssVar: "var(--orange)" },
  { id: "green", label: "Green", cssVar: "var(--green)" },
  { id: "graphite", label: "Graphite", cssVar: "var(--graphite)" },
];

interface State {
  mode: ThemeMode;
  accent: Accent;
}

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = window.localStorage.getItem(key);
    if (v && (allowed as readonly string[]).includes(v)) return v as T;
  } catch {
    // storage unavailable (private mode)
  }
  return fallback;
}

const MODES: readonly ThemeMode[] = ["light", "dark", "auto"];
const ACCENT_IDS = ACCENTS.map((a) => a.id);

let state: State = {
  mode: typeof window === "undefined" ? "auto" : read(MODE_KEY, MODES, "auto"),
  accent: typeof window === "undefined" ? "blue" : read(ACCENT_KEY, ACCENT_IDS, "blue"),
};

const listeners = new Set<() => void>();

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === "auto") return systemPrefersDark() ? "dark" : "light";
  return mode;
}

function apply() {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolve(state.mode));
  root.setAttribute("data-accent", state.accent);
}

function emit() {
  apply();
  listeners.forEach((l) => l());
}

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  try {
    window.localStorage.setItem(MODE_KEY, state.mode);
    window.localStorage.setItem(ACCENT_KEY, state.accent);
  } catch {
    // session-only
  }
  emit();
}

if (typeof window !== "undefined") {
  apply();
  // Follow the OS when mode === "auto".
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (state.mode === "auto") emit();
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppearance() {
  const snapshot = React.useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
  const setMode = React.useCallback((mode: ThemeMode) => setState({ mode }), []);
  const setAccent = React.useCallback((accent: Accent) => setState({ accent }), []);
  return {
    mode: snapshot.mode,
    accent: snapshot.accent,
    resolved: resolve(snapshot.mode),
    setMode,
    setAccent,
  };
}
