/**
 * The built-in themes and motion styles a file can name. A theme is a palette,
 * fonts, a corner radius, a motion style and named presets per element kind;
 * presets refer to the palette and fonts through tokens, so one set of presets
 * serves every theme.
 */

export const THEME_NAMES = ["midnight", "paper", "neon", "pastel", "mono", "bold"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

export const MOTION_NAMES = ["none", "calm", "snappy", "bouncy", "editorial"] as const;
export type MotionName = (typeof MOTION_NAMES)[number];

/** The palette names every built-in theme fills. `onPrimary` is text drawn on a `primary` fill. */
export const PALETTE_KEYS = ["primary", "secondary", "accent", "background", "surface", "text", "muted", "onPrimary"] as const;
export const FONT_KEYS = ["heading", "body", "mono"] as const;

export interface MotionAnimation { readonly type: string; readonly duration: number; readonly easing: string }

/** What a motion style fills where an element says nothing: its entrance, its exit, and a transition's type and length. */
export interface MotionStyle {
  readonly enter?: MotionAnimation | undefined;
  readonly exit?: MotionAnimation | undefined;
  readonly transition?: { readonly type?: string | undefined; readonly duration?: number | undefined } | undefined;
}

export type Presets = Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, unknown>>>>>>;

export interface ThemeDefinition {
  readonly palette: Readonly<Record<(typeof PALETTE_KEYS)[number], string>>;
  readonly fonts: Readonly<Record<(typeof FONT_KEYS)[number], string>>;
  readonly radius: number;
  readonly motion: MotionName;
  readonly styles: Presets;
}

export const MOTIONS: Readonly<Record<MotionName, MotionStyle>> = {
  none: {},
  calm: {
    enter: { type: "fade", duration: 0.8, easing: "ease-in-out" },
    exit: { type: "fade", duration: 0.6, easing: "ease-in-out" },
    transition: { type: "crossfade", duration: 0.8 },
  },
  snappy: {
    enter: { type: "slide-up", duration: 0.35, easing: "easeOutCubic" },
    exit: { type: "fade", duration: 0.2, easing: "ease-in" },
    transition: { type: "crossfade", duration: 0.25 },
  },
  bouncy: {
    enter: { type: "pop", duration: 0.5, easing: "ease-out" },
    exit: { type: "scale", duration: 0.3, easing: "ease-in" },
    transition: { type: "crossfade", duration: 0.4 },
  },
  editorial: {
    enter: { type: "wipe-right", duration: 0.6, easing: "easeInOutCubic" },
    exit: { type: "wipe-right", duration: 0.4, easing: "easeInOutCubic" },
    transition: { type: "crossfade", duration: 0.5 },
  },
};

/** Presets shared by the built-in themes; every colour, font and radius is a token. */
const STYLES: Presets = {
  title: {
    default: { font: "$heading", color: "$text" },
    h1: { font: "$heading", size: 96, weight: 700, color: "$text", lineHeight: 1.05, letterSpacing: -1 },
    h2: { font: "$heading", size: 64, weight: 700, color: "$text", lineHeight: 1.1 },
    kicker: { font: "$body", size: 28, weight: 700, color: "$primary", letterSpacing: 3 },
    body: { font: "$body", size: 36, weight: 400, color: "$text", lineHeight: 1.4 },
    caption: { font: "$body", size: 24, weight: 400, color: "$muted" },
    quote: { font: "$heading", size: 56, weight: 400, italic: true, color: "$text", lineHeight: 1.2 },
    label: { font: "$body", size: 24, weight: 700, color: "$onPrimary", background: "$primary" },
    code: { font: "$mono", size: 28, weight: 400, color: "$text" },
    // A key point, deck-style: a card in the band under the face on 9:16 (y +230 of 1920), clear of the platform's
    // right-hand buttons; on screen from the word that names the point until the next one.
    note: {
      font: "$heading", size: 60, weight: 700, color: "$background", background: "$text", lineHeight: 1.1, width: 840, height: 160,
      transform: { position: { x: 0, y: 230 }, borderRadius: 28 }, animation: { preset: "scale", in: 0.2, out: 0.15 },
    },
  },
  shape: {
    default: { fill: "$primary" },
    card: { fill: "$surface", cornerRadius: "$radius", shadow: { color: "rgba(0,0,0,0.35)", blur: 30, y: 12 } },
    panel: { fill: "$surface", cornerRadius: "$radius" },
    pill: { fill: "$primary", cornerRadius: 999 },
    outline: { fill: { type: "none" }, stroke: { color: "$primary", width: 4 }, cornerRadius: "$radius" },
    accent: { fill: "$accent" },
    backdrop: { fill: "$background" },
  },
  captions: {
    default: { font: "$body", highlight: "$accent" },
    boxed: { font: "$body", color: "$text", background: "$surface", highlight: "$primary" },
    bold: { font: "$heading", size: 56, color: "$text", highlight: "$accent" },
  },
};

export const THEMES: Readonly<Record<ThemeName, ThemeDefinition>> = {
  midnight: {
    palette: { primary: "#6c8cff", secondary: "#22d3ee", accent: "#ffb020", background: "#0b1020", surface: "#161d33", text: "#f5f7ff", muted: "#9aa3c0", onPrimary: "#ffffff" },
    fonts: { heading: "Space Grotesk", body: "Inter", mono: "JetBrains Mono" },
    radius: 16, motion: "snappy", styles: STYLES,
  },
  paper: {
    palette: { primary: "#c2410c", secondary: "#1e3a8a", accent: "#0f766e", background: "#f6f1e7", surface: "#ffffff", text: "#1d1b17", muted: "#6f675a", onPrimary: "#ffffff" },
    fonts: { heading: "Playfair Display", body: "DM Sans", mono: "JetBrains Mono" },
    radius: 6, motion: "calm", styles: STYLES,
  },
  neon: {
    palette: { primary: "#ff2e88", secondary: "#00e5ff", accent: "#c6ff00", background: "#07060d", surface: "#15122a", text: "#f8f5ff", muted: "#8f86b5", onPrimary: "#07060d" },
    fonts: { heading: "Space Grotesk", body: "Inter", mono: "JetBrains Mono" },
    radius: 22, motion: "bouncy", styles: STYLES,
  },
  pastel: {
    palette: { primary: "#ff8fab", secondary: "#8ec5ff", accent: "#ffd166", background: "#fff7f0", surface: "#ffffff", text: "#2e2a3a", muted: "#8a8399", onPrimary: "#2e2a3a" },
    fonts: { heading: "DM Sans", body: "DM Sans", mono: "JetBrains Mono" },
    radius: 28, motion: "calm", styles: STYLES,
  },
  mono: {
    palette: { primary: "#fafafa", secondary: "#bdbdbd", accent: "#ff3b30", background: "#111111", surface: "#1c1c1c", text: "#fafafa", muted: "#8a8a8a", onPrimary: "#111111" },
    fonts: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
    radius: 0, motion: "editorial", styles: STYLES,
  },
  bold: {
    palette: { primary: "#ffd400", secondary: "#ff3d00", accent: "#2962ff", background: "#111111", surface: "#1f1f1f", text: "#ffffff", muted: "#a3a3a3", onPrimary: "#111111" },
    fonts: { heading: "Space Grotesk", body: "Inter", mono: "JetBrains Mono" },
    radius: 4, motion: "snappy", styles: STYLES,
  },
};

/** The theme tokens resolve against when a file declares none. Its motion and default presets apply only when declared. */
export const DEFAULT_THEME: ThemeName = "midnight";
