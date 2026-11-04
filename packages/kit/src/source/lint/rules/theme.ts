import type { Json } from "../../../patches/types";
import { isBundledFont } from "../../../theme/fonts";
import { STYLED_KINDS, TOKEN_PATTERN } from "../../../theme/schema";
import { type ResolvedTheme, resolveTheme, themeToken } from "../../../theme/theme";
import type { SourceIndex } from "../../index";
import type { Diagnostic } from "../index";
import type { Rule } from "./index";

/** Keys whose string values are colours. */
const COLOR_KEYS: ReadonlySet<string> = new Set([
  "color",
  "fill",
  "background",
  "tint",
  "highlight",
  "upcoming",
  "frontColor",
  "sideColor",
]);
/** Subtrees where a literal colour is expected even with a theme: shadows are usually black, whatever the palette. */
const SKIP_KEYS: ReadonlySet<string> = new Set(["shadow", "shadows", "theme", "text", "content", "src"]);
const THEMED_KINDS: ReadonlySet<string> = new Set([...STYLED_KINDS, "composition", "marker"]);
const NOT_COLORS: ReadonlySet<string> = new Set(["none", "transparent", "currentColor"]);

/** `$tokens` the theme does not define, and `style` names it has no preset for. */
export const themeRefs: Rule = {
  name: "theme-refs",
  check: (index) => {
    const theme = fileTheme(index);
    if (!theme) return [];
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      for (const [name, prop] of site.props) {
        if (SKIP_KEYS.has(name) || prop.literal === undefined) continue;
        walk(prop.literal, name, (value, path) => {
          const m = typeof value === "string" ? TOKEN_PATTERN.exec(value) : null;
          if (m && themeToken(theme, m[1] as string) === undefined) {
            out.push({
              rule: "theme-refs",
              severity: "error",
              message: `"${site.id}.${path}": ${value} is not a theme token (${Object.keys(theme.tokens)
                .map((k) => `$${k}`)
                .join(", ")})`,
              range: prop.range,
              id: site.id,
              prop: name,
            });
          }
        });
      }
      const style = site.props.get("style");
      if (
        (STYLED_KINDS as readonly string[]).includes(site.kind) &&
        typeof style?.literal === "string" &&
        !theme.styles[site.kind]?.[style.literal]
      ) {
        const known = Object.keys(theme.styles[site.kind] ?? {});
        out.push({
          rule: "theme-refs",
          severity: "error",
          message: `"${site.id}": no ${site.kind} style "${style.literal}" in the theme${known.length ? ` (${known.join(", ")})` : ""}`,
          range: style.range,
          id: site.id,
          prop: "style",
        });
      }
    }
    return out;
  },
};

/** With a theme declared, literal colours and fonts on graphics drift from it; name a token instead. */
export const themeLiterals: Rule = {
  name: "theme-literals",
  check: (index) => {
    const theme = fileTheme(index);
    if (!theme?.declared) return [];
    const out: Diagnostic[] = [];
    const byValue = new Map<string, string>();
    for (const [k, v] of Object.entries(theme.palette))
      if (!byValue.has(v.toLowerCase())) byValue.set(v.toLowerCase(), k);
    for (const site of index.elements.values()) {
      if (!THEMED_KINDS.has(site.kind)) continue;
      for (const [name, prop] of site.props) {
        if (SKIP_KEYS.has(name) || prop.literal === undefined) continue;
        walk(prop.literal, name, (value, path, key) => {
          if (typeof value !== "string" || value.startsWith("$")) return;
          if (key === "font") {
            out.push({
              rule: "theme-literals",
              severity: "warning",
              message: `"${site.id}.${path}" names font "${value}"; use $heading, $body or $mono so the theme sets it`,
              range: prop.range,
              id: site.id,
              prop: name,
            });
          } else if (COLOR_KEYS.has(key) && !NOT_COLORS.has(value)) {
            const token = byValue.get(value.toLowerCase());
            out.push({
              rule: "theme-literals",
              severity: "warning",
              message: `"${site.id}.${path}" is the literal colour ${value}; use ${token ? `$${token}` : "a palette token"} so a theme change reaches it`,
              range: prop.range,
              id: site.id,
              prop: name,
            });
          }
        });
      }
    }
    return out;
  },
};

/** Fonts no renderer ships and the manifest does not list: the export sets them in Inter. */
export const fontAvailable: Rule = {
  name: "font-available",
  check: (index, options) => {
    const theme = fileTheme(index) ?? resolveTheme(undefined);
    const listed = new Set(Object.values(options.manifest?.fonts ?? {}).map((f) => f.family));
    const out: Diagnostic[] = [];
    const seen = new Set<string>();
    const check = (
      family: string,
      site: { id: string },
      prop: { range: readonly [number, number] },
      name: string,
      path: string,
    ): void => {
      if (isBundledFont(family) || listed.has(family) || seen.has(`${site.id}.${path}`)) return;
      seen.add(`${site.id}.${path}`);
      out.push({
        rule: "font-available",
        severity: "warning",
        message: `"${site.id}.${path}" uses font "${family}", which is neither bundled nor in the manifest's fonts; the export sets it in Inter`,
        range: [prop.range[0], prop.range[1]],
        id: site.id,
        prop: name,
      });
    };
    for (const site of index.elements.values()) {
      for (const [name, prop] of site.props) {
        if (SKIP_KEYS.has(name) || prop.literal === undefined) continue;
        walk(prop.literal, name, (value, path, key) => {
          if (key !== "font" || typeof value !== "string") return;
          const m = TOKEN_PATTERN.exec(value);
          const family = m ? themeToken(theme, m[1] as string) : value;
          if (typeof family === "string") check(family, site, prop, name, path);
        });
      }
    }
    const comp = index.compositionId ? index.elements.get(index.compositionId) : undefined;
    const themeProp = comp?.props.get("theme");
    if (comp && themeProp && theme.declared) {
      for (const [role, family] of Object.entries(theme.fonts))
        check(family, comp, themeProp, "theme", `theme.fonts.${role}`);
    }
    return out;
  },
};

/** The file's theme when the composition's `theme` is a literal (or absent); null when it is an expression. */
function fileTheme(index: SourceIndex): ResolvedTheme | null {
  const comp = index.compositionId ? index.elements.get(index.compositionId) : undefined;
  const prop = comp?.props.get("theme");
  if (!prop) return resolveTheme(undefined);
  if (prop.literal === undefined || typeof prop.literal !== "object" || prop.literal === null) return null;
  return resolveTheme(prop.literal);
}

function walk(value: Json, path: string, visit: (value: Json, path: string, key: string) => void, key = path): void {
  if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}.${i}`, visit, key));
  else if (typeof value === "object" && value !== null) {
    for (const [k, v] of Object.entries(value)) if (!SKIP_KEYS.has(k)) walk(v, `${path}.${k}`, visit, k);
  } else visit(value, path, key);
}
