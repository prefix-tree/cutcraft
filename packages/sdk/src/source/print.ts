import { ELEMENTS } from "@uberscene/kit/schema";

import type { NodeSpec } from "../actions/types";
import type { Json } from "../patches/types";

const NAME_BY_KIND: ReadonlyMap<string, string> = new Map(Object.entries(ELEMENTS).map(([name, c]) => [c.kind, name]));

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** A value printed as an identifier the file declares (`type={glitch}`), not as a literal. */
export class Identifier {
  constructor(readonly name: string) {}
}

/** JavaScript source for a JSON value, compact, double-quoted. */
export function printLiteral(value: Json | undefined): string {
  if (value === undefined) return "undefined";
  if ((value as unknown) instanceof Identifier) return (value as unknown as Identifier).name;
  if (typeof value === "function") return (value as { name?: string }).name || "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(printLiteral).join(", ")}]`;
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "{}";
  return `{ ${entries.map(([k, v]) => `${IDENT.test(k) ? k : JSON.stringify(k)}: ${printLiteral(v)}`).join(", ")} }`;
}

/** The widest line the printers write, as the formatter keeps the files. */
export const LINE_WIDTH = 120;

/**
 * A JSON value as source that starts `column` characters into a line indented by `indent`: compact while it fits
 * the line, else one entry of each list or object per line, each indented one step more. The editor and the lint fixes
 * print through it, so the same value is always written the same way.
 */
export function printValue(value: Json | undefined, indent = "", column = indent.length, step = "  "): string {
  const compact = printLiteral(value);
  if (column + compact.length <= LINE_WIDTH || value === null || typeof value !== "object") return compact;
  if ((value as unknown) instanceof Identifier) return compact;
  const inner = indent + step;
  if (Array.isArray(value)) {
    if (value.length === 0) return compact;
    return `[\n${value.map((v) => `${inner}${printValue(v, inner)},`).join("\n")}\n${indent}]`;
  }
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return compact;
  return `{\n${entries
    .map(([k, v]) => {
      const key = `${IDENT.test(k) ? k : JSON.stringify(k)}: `;
      return `${inner}${key}${printValue(v, inner, inner.length + key.length)},`;
    })
    .join("\n")}\n${indent}}`;
}

/**
 * Whether a string can be written as a JSX attribute string (`name="…"`) and read back the same. Such a string takes
 * no escapes and JSX decodes HTML entities in it (`&amp;` reads as `&`), so anything it cannot hold goes in braces.
 */
export function isPlainAttribute(value: string): boolean {
  return /^[^"\\\n&{}<>]*$/.test(value);
}

/** One JSX attribute. Strings as `name="…"`, everything else as `name={…}`, `true` as a bare attribute. */
export function printProp(name: string, value: Json | undefined): string {
  if (value === undefined) return "";
  if (value === true) return name;
  if (typeof value === "function" || (value as unknown) instanceof Identifier)
    return `${name}={${printLiteral(value)}}`;
  if (typeof value === "string" && isPlainAttribute(value)) return `${name}="${value}"`;
  return `${name}={${printLiteral(value)}}`;
}

export function elementName(kind: string): string {
  return NAME_BY_KIND.get(kind) ?? kind;
}

/** A whole element as JSX text, indented with `indent`, children on their own lines. */
export function printElement(spec: NodeSpec, indent = "", step = "  "): string {
  const name = elementName(spec.kind);
  const attrs = Object.entries(spec.props)
    .filter(([k, v]) => v !== undefined && !(k === "id" && false))
    .map(([k, v]) => printProp(k, v))
    .filter(Boolean);
  const open = `${indent}<${name}${attrs.length ? ` ${attrs.join(" ")}` : ""}`;
  const children = spec.children ?? [];
  if (children.length === 0 && spec.text === undefined) return `${open} />`;
  if (children.length === 0) return `${open}>${escapeText(spec.text ?? "")}</${name}>`;
  const inner = children.map((c) => printElement(c, indent + step, step)).join("\n");
  const text = spec.text !== undefined ? `\n${indent + step}${escapeText(spec.text)}` : "";
  return `${open}>${text}\n${inner}\n${indent}</${name}>`;
}

/** Text as JSX children: as it is, or as a string expression (`{"50%}"}`) when it holds a brace or an angle bracket. */
export function escapeText(text: string): string {
  return /[{}<>]/.test(text) ? `{${JSON.stringify(text)}}` : text;
}
