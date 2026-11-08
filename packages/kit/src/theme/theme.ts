import { DEFAULT_THEME, MOTIONS, type MotionStyle, type Presets, THEMES } from "./builtins";
import { type ThemeProps, TOKEN_PATTERN, themeSchema } from "./schema";

/** A file's theme with its base theme merged in: what tokens, presets and motion defaults resolve against. */
export interface ResolvedTheme {
  /** Whether the file declares a theme. Without one, tokens and named presets still resolve against the default theme; motion and `default` presets do not apply. */
  readonly declared: boolean;
  readonly base: string;
  readonly palette: Readonly<Record<string, string>>;
  readonly fonts: Readonly<Record<string, string>>;
  readonly radius: number;
  /** Null when the motion style fills nothing. */
  readonly motion: MotionStyle | null;
  readonly styles: Presets;
  /** Every token by name, without the `$`. */
  readonly tokens: Readonly<Record<string, string | number>>;
}

/** Where a themed prop's value came from: `$primary`, `style:h1`, `motion` or `theme`. */
export type ThemeOrigin = string;

export interface ThemeIssue {
  readonly code: "UNKNOWN_TOKEN" | "UNKNOWN_STYLE";
  readonly prop: string;
  readonly message: string;
}

export interface Themed {
  readonly props: Record<string, unknown>;
  /** Prop path (dot-separated) → where its value came from. Empty when nothing was themed. */
  readonly from: Readonly<Record<string, ThemeOrigin>>;
  readonly issues: readonly ThemeIssue[];
}

/** Kinds whose entrance and exit a motion style fills. */
const MOTION_KINDS = new Set(["title", "shape", "svg", "sticker"]);
/** Props whose strings are content, never tokens. */
const CONTENT_PROPS = new Set(["text", "content", "src", "label", "name", "category", "theme"]);

const byInput = new WeakMap<object, ResolvedTheme>();
let undeclared: ResolvedTheme | null = null;

/** The theme a composition's raw `theme` prop describes. Memoised per object; an invalid theme falls back to its base (the schema reports why). */
export function resolveTheme(raw: unknown): ResolvedTheme {
  if (raw === undefined || raw === null || typeof raw !== "object") return (undeclared ??= build(undefined, false));
  const hit = byInput.get(raw);
  if (hit) return hit;
  const parsed = themeSchema.safeParse(raw);
  const theme = build(parsed.success ? parsed.data : baseOnly(raw), true);
  byInput.set(raw, theme);
  return theme;
}

/** The value of `$name`, or undefined. */
export function themeToken(theme: ResolvedTheme, name: string): string | number | undefined {
  return Object.hasOwn(theme.tokens, name) ? theme.tokens[name] : undefined;
}

/**
 * An element's raw props with its theme applied, before the schema parses them:
 * the preset its `style` names (or the kind's `default` preset) fills the props
 * the element leaves out, the motion style fills `enter`/`exit` (a transition's
 * type and duration), and whole-string `$token` values become theme values. The
 * element's own props always win. Returns the input object when nothing was themed.
 */
export function applyTheme(kind: string, raw: Readonly<Record<string, unknown>>, theme: ResolvedTheme): Themed {
  const named = typeof raw.style === "string" ? raw.style : null;
  if (!theme.declared && named === null && !hasToken(raw))
    return { props: raw as Record<string, unknown>, from: EMPTY, issues: [] };
  const out: Record<string, unknown> = { ...raw };
  const from: Record<string, ThemeOrigin> = {};
  const issues: ThemeIssue[] = [];

  const presets = theme.styles[kind];
  const presetName = named ?? (theme.declared ? "default" : null);
  if (presetName !== null && kind !== "composition") {
    const preset = presets?.[presetName];
    if (preset) {
      if (kind === "captions") {
        // A captions preset is a caption style; `style` is the name or an object of overrides.
        const own = typeof raw.style === "object" && raw.style !== null ? (raw.style as Record<string, unknown>) : {};
        out.style = { ...preset, ...own };
        from.style = `style:${presetName}`;
      } else {
        for (const [key, value] of Object.entries(preset)) {
          if (raw[key] === undefined) {
            out[key] = value;
            from[key] = `style:${presetName}`;
          }
        }
      }
    } else if (named !== null) {
      const known = Object.keys(presets ?? {});
      issues.push({
        code: "UNKNOWN_STYLE",
        prop: "style",
        message: `no ${kind} style "${named}" in the theme${known.length ? ` (${known.join(", ")})` : ""}`,
      });
      if (kind === "captions") delete out.style;
    }
  }

  const motion = theme.declared ? theme.motion : null;
  if (motion && MOTION_KINDS.has(kind) && !(kind === "title" && out.animation !== undefined)) {
    if (out.enter === undefined && motion.enter) {
      out.enter = motion.enter;
      from.enter = "motion";
    }
    if (out.exit === undefined && motion.exit) {
      out.exit = motion.exit;
      from.exit = "motion";
    }
  }
  if (motion && kind === "transition" && motion.transition) {
    if (out.type === undefined && motion.transition.type) {
      out.type = motion.transition.type;
      from.type = "motion";
    }
    if (out.duration === undefined && motion.transition.duration !== undefined) {
      out.duration = motion.transition.duration;
      from.duration = "motion";
    }
  }
  if (kind === "composition" && theme.declared && out.background === undefined) {
    out.background = { mode: "color", color: theme.palette.background };
    from.background = "theme";
  }

  for (const key of Object.keys(out)) {
    if (CONTENT_PROPS.has(key)) continue;
    out[key] = substitute(out[key], key, theme, from, issues);
  }
  // Nothing themed: hand back the input, so a theme change leaves this element's parse (and placement) as it was.
  if (Object.keys(from).length === 0 && issues.length === 0)
    return { props: raw as Record<string, unknown>, from: EMPTY, issues };
  return { props: out, from: Object.keys(from).length ? from : EMPTY, issues };
}

const EMPTY: Readonly<Record<string, ThemeOrigin>> = Object.freeze({});

function substitute(
  value: unknown,
  path: string,
  theme: ResolvedTheme,
  from: Record<string, ThemeOrigin>,
  issues: ThemeIssue[],
): unknown {
  if (typeof value === "string") {
    const m = TOKEN_PATTERN.exec(value);
    if (!m) return value;
    const name = m[1] as string;
    const resolved = themeToken(theme, name);
    if (resolved === undefined) {
      issues.push({ code: "UNKNOWN_TOKEN", prop: path, message: `unknown theme token ${value}` });
      return value;
    }
    from[path] = value;
    return resolved;
  }
  if (Array.isArray(value)) {
    let changed: unknown[] | null = null;
    value.forEach((v, i) => {
      const s = substitute(v, `${path}.${i}`, theme, from, issues);
      if (s !== v) (changed ??= [...value])[i] = s;
    });
    return changed ?? value;
  }
  if (typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
    let changed: Record<string, unknown> | null = null;
    for (const [k, v] of Object.entries(value)) {
      const s = substitute(v, `${path}.${k}`, theme, from, issues);
      if (s !== v) (changed ??= { ...value })[k] = s;
    }
    return changed ?? value;
  }
  return value;
}

function hasToken(value: unknown): boolean {
  if (typeof value === "string") return value.startsWith("$");
  if (Array.isArray(value)) return value.some(hasToken);
  if (typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [k, v] of Object.entries(value)) if (!CONTENT_PROPS.has(k) && hasToken(v)) return true;
  }
  return false;
}

/** For an invalid theme: keep its `extends` when that alone is valid, so the rest of the file still themes sensibly. */
function baseOnly(raw: object): ThemeProps | undefined {
  const ext = (raw as { extends?: unknown }).extends;
  const parsed = themeSchema.safeParse(typeof ext === "string" ? { extends: ext } : {});
  return parsed.success ? parsed.data : undefined;
}

function build(input: ThemeProps | undefined, declared: boolean): ResolvedTheme {
  const base = input?.extends ?? DEFAULT_THEME;
  const def = THEMES[base];
  const palette = { ...def.palette, ...input?.palette };
  const fonts = { ...def.fonts, ...input?.fonts };
  const radius = input?.radius ?? def.radius;
  const m = input?.motion ?? def.motion;
  const style: MotionStyle = typeof m === "string" ? MOTIONS[m] : m;
  const motion = style.enter || style.exit || style.transition ? style : null;
  const styles: Record<string, Record<string, Readonly<Record<string, unknown>>>> = {};
  for (const [kind, presets] of Object.entries(def.styles)) styles[kind] = { ...presets };
  for (const [kind, presets] of Object.entries(input?.styles ?? {})) {
    const merged = (styles[kind] ??= {});
    for (const [name, preset] of Object.entries(presets ?? {})) merged[name] = { ...merged[name], ...preset };
  }
  return { declared, base, palette, fonts, radius, motion, styles, tokens: { ...palette, ...fonts, radius } };
}
