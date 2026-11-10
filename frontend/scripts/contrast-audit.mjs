#!/usr/bin/env node
/**
 * WCAG contrast audit for the design tokens in src/index.css.
 *
 *   node scripts/contrast-audit.mjs          # print a pass/fail table (exit 1 on failure)
 *   node scripts/contrast-audit.mjs --css    # print the accent CSS block to paste into index.css
 *
 * Accents need TWO colors per theme: one for text/dots/rings on the page
 * (--accent) and one for solid fills carrying a label (--accent-fill + --on-accent).
 * Apple's raw colors (e.g. #007AFF) are too light for white text, so the fill
 * variant is nudged until it reaches 4.5:1.
 */

const THEMES = {
  light: {
    surfaces: { card: "#ffffff", grouped: "#f2f2f7", raised: "#f2f2f7", sidebar: "#f5f5f8" },
    fill: { rgb: [120, 120, 128], a: 0.12 },
    label: "#000000",
    // translucent labels are pre-composited over white / grouped bg below
    tertiaryA: 0.61,
    labelSecondary: { rgb: [60, 60, 67], a: 0.79 }, // Apple ships 0.60 (3.3:1) — raised to pass AA on every real background
    accents: {
      blue: "#007aff",
      purple: "#af52de",
      pink: "#ff2d55",
      red: "#ff3b30",
      orange: "#ff9500",
      green: "#34c759",
      graphite: "#636366",
    },
    status: { green: "#34c759", orange: "#ff9500", red: "#ff3b30", purple: "#af52de", yellow: "#ffcc00", blue: "#007aff", gray: "#8e8e93" },
    textVariants: { "green-text": "#1f7a3a", "orange-text": "#a35a00", "red-text": "#d70015", "blue-text": "#0062cc", "purple-text": "#8944ab", "yellow-text": "#8a6d00" },
  },
  dark: {
    surfaces: { card: "#1c1c1e", grouped: "#000000", raised: "#2c2c2e", sidebar: "#161618" },
    fill: { rgb: [120, 120, 128], a: 0.24 },
    label: "#ffffff",
    tertiaryA: 0.49,
    labelSecondary: { rgb: [235, 235, 245], a: 0.71 },
    accents: {
      blue: "#0a84ff",
      purple: "#bf5af2",
      pink: "#ff375f",
      red: "#ff453a",
      orange: "#ff9f0a",
      green: "#30d158",
      graphite: "#98989d",
    },
    status: { green: "#30d158", orange: "#ff9f0a", red: "#ff453a", purple: "#bf5af2", yellow: "#ffd60a", blue: "#0a84ff", gray: "#8e8e93" },
    textVariants: { "green-text": "#30d158", "orange-text": "#ff9f0a", "red-text": "#ff6961", "blue-text": "#64a8ff", "purple-text": "#d98bff", "yellow-text": "#ffd60a" },
  },
};

// ---- color math -----------------------------------------------------------
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb) => "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t); // t=0 → a, t=1 → b
const over = (fg, a, bg) => mix(bg, fg, a); // alpha composite

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

/** Every background text can really land on: surfaces, a fill control on them, and fill-on-fill. */
function textBackgrounds(theme, stacked = true, skip = []) {
  const t = THEMES[theme];
  const out = [];
  for (const [sname, sbg] of Object.entries(t.surfaces)) {
    if (skip.includes(sname)) continue;
    const base = hex(sbg);
    const f1 = over(t.fill.rgb, t.fill.a, base);
    out.push(base, f1);
    if (stacked) out.push(over(t.fill.rgb, t.fill.a, f1));
  }
  return out;
}

/** Move `rgb` toward `toward` until it reaches `min` against every background. */
function nudge(rgb, backgrounds, min, toward, tint = 0) {
  for (let t = 0; t <= 1.0001; t += 0.01) {
    const c = mix(rgb, toward, t);
    // `tint`: the color is also drawn over a translucent wash of itself (accent-soft chips / selected rows)
    const bgs = tint ? [...backgrounds, ...backgrounds.map((bg) => over(c, tint, bg))] : backgrounds;
    if (bgs.every((bg) => ratio(c, bg) >= min)) return c;
  }
  return toward;
}

// ---- derive accent variants ----------------------------------------------
function deriveAccents(theme) {
  const t = THEMES[theme];
  const bgs = textBackgrounds(theme, false, ["raised"]); // accent text never sits on a fill-in-a-fill or on raised
  const out = {};
  for (const [name, raw] of Object.entries(t.accents)) {
    const base = hex(raw);
    // text on the page: darken in light theme, lighten in dark theme
    const text = nudge(base, bgs, 4.55, theme === "light" ? BLACK : WHITE, 0.14);
    // Solid fill carrying a label. Prefer white (Apple's look) if a small darkening reaches 4.5:1;
    // bright colors (orange, green) would turn muddy, so they get black labels instead.
    const darker = nudge(base, [WHITE], 4.5, BLACK);
    const shift = ratio(base, darker) > 0 ? 1 - lum(darker) / Math.max(lum(base), 1e-6) : 0;
    const useWhite = shift <= 0.45;
    const fill = useWhite ? darker : nudge(base, [BLACK], 4.5, WHITE);
    out[name] = { text: toHex(text), fill: toHex(fill), on: useWhite ? "#ffffff" : "#000000" };
  }
  return out;
}

/** Smallest alpha (2% steps) at which a translucent label reaches `min` on all surfaces. */
function labelAlpha(theme, min) {
  const t = THEMES[theme];
  const bgs = textBackgrounds(theme);
  for (let a = 0.3; a <= 1.0001; a += 0.01) {
    if (bgs.every((bg) => ratio(over(t.labelSecondary.rgb, a, bg), bg) >= min)) return Math.round(a * 100) / 100;
  }
  return 1;
}

if (process.argv.includes("--css-blocks")) {
  // The accent section of src/index.css, generated so CSS and audit can never disagree.
  const decl = (v) => `  --accent: ${v.text};\n  --accent-fill: ${v.fill};\n  --on-accent: ${v.on};`;
  const light = deriveAccents("light");
  const dark = deriveAccents("dark");
  const out = [`:root {\n${decl(light.blue)}\n}`, `[data-theme="dark"] {\n${decl(dark.blue)}\n}`];
  for (const name of Object.keys(light)) if (name !== "blue") out.push(`[data-accent="${name}"] {\n${decl(light[name])}\n}`);
  for (const name of Object.keys(dark)) if (name !== "blue") out.push(`[data-theme="dark"][data-accent="${name}"] {\n${decl(dark[name])}\n}`);
  console.log(out.join("\n"));
  process.exit(0);
}

if (process.argv.includes("--css")) {
  for (const theme of ["light", "dark"]) {
    console.log(`${theme}: --label-secondary alpha >= ${labelAlpha(theme, 4.5)} (4.5:1) | --label-tertiary alpha >= ${labelAlpha(theme, 3)} (3:1)`);
  }
  for (const theme of ["light", "dark"]) {
    console.log(`/* ${theme} */`);
    for (const [name, v] of Object.entries(deriveAccents(theme))) {
      console.log(`${theme}/${name}: --accent: ${v.text}; --accent-fill: ${v.fill}; --on-accent: ${v.on};`);
    }
  }
  process.exit(0);
}

// ---- audit ------------------------------------------------------------------
let failures = 0;
const row = (theme, label, fg, bg, min) => {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${theme.padEnd(5)} ${label.padEnd(44)} ${r.toFixed(2).padStart(5)} (need ${min})`);
};

for (const theme of ["light", "dark"]) {
  const t = THEMES[theme];
  for (const [sname, sbg] of Object.entries(t.surfaces)) {
    const bg = hex(sbg);
    row(theme, `label on ${sname}`, hex(t.label), bg, 7);
    row(theme, `secondary label on ${sname}`, over(t.labelSecondary.rgb, t.labelSecondary.a, bg), bg, 4.5);
    row(theme, `tertiary label (placeholder) on ${sname}`, over(t.labelSecondary.rgb, t.tertiaryA, bg), bg, 3);
  }
  const worst = (fg) => Math.min(...textBackgrounds(theme).map((bg) => ratio(fg(bg), bg)));
  const rw = (label, r, min) => {
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${theme.padEnd(5)} ${label.padEnd(44)} ${r.toFixed(2).padStart(5)} (need ${min})`);
  };
  rw("secondary label, worst real background", worst((bg) => over(t.labelSecondary.rgb, t.labelSecondary.a, bg)), 4.5);
  rw("tertiary label, worst real background", worst((bg) => over(t.labelSecondary.rgb, t.tertiaryA, bg)), 3);
  for (const [name, v] of Object.entries(deriveAccents(theme))) {
    const c = hex(v.text);
    rw(`accent text "${name}", worst bg (+14% tint)`, Math.min(...textBackgrounds(theme, false, ["raised"]).map((bg) => ratio(c, bg)), ...textBackgrounds(theme, false, ["raised"]).map((bg) => ratio(c, over(c, 0.14, bg)))), 4.5);
  }
  for (const [name, v] of Object.entries(t.textVariants)) {
    row(theme, `${name} on card`, hex(v), hex(t.surfaces.card), 4.5);
  }
  // Status/priority icons always sit next to a text label and differ in SHAPE, so color is never the
  // only signal (WCAG 1.4.1). They are held to a lower bar than text.
  for (const [name, v] of Object.entries(t.status)) {
    row(theme, `icon ${name} on card (has text label)`, hex(v), hex(t.surfaces.card), 1.5);
  }
  for (const [name, v] of Object.entries(deriveAccents(theme))) {
    row(theme, `accent text "${name}" on card`, hex(v.text), hex(t.surfaces.card), 4.5);
    row(theme, `accent text "${name}" on grouped`, hex(v.text), hex(t.surfaces.grouped), 4.5);
    row(theme, `label on accent fill "${name}"`, hex(v.on), hex(v.fill), 4.5);
  }
}
console.log(failures ? `\n${failures} failing pair(s)` : "\nAll pairs pass");
process.exit(failures ? 1 : 0);
