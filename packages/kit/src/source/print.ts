import type { NodeSpec } from "../actions/types";
import { ELEMENTS } from "../jsx/elements";
import type { Json } from "../patches/types";

const NAME_BY_KIND: ReadonlyMap<string, string> = new Map(Object.entries(ELEMENTS).map(([name, c]) => [c.kind, name]));

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** JavaScript source for a JSON value, compact, double-quoted. */
export function printLiteral(value: Json | undefined): string {
  if (value === undefined) return "undefined";
  if (typeof value === "function") return (value as { name?: string }).name || "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(printLiteral).join(", ")}]`;
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "{}";
  return `{ ${entries.map(([k, v]) => `${IDENT.test(k) ? k : JSON.stringify(k)}: ${printLiteral(v)}`).join(", ")} }`;
}

/** One JSX attribute. Strings as `name="…"`, everything else as `name={…}`, `true` as a bare attribute. */
export function printProp(name: string, value: Json | undefined): string {
  if (value === undefined) return "";
  if (value === true) return name;
  if (typeof value === "function") return `${name}={${printLiteral(value)}}`;
  if (typeof value === "string" && !value.includes('"') && !value.includes("\n")) return `${name}="${value}"`;
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

function escapeText(text: string): string {
  return /[{}<>]/.test(text) ? `{${JSON.stringify(text)}}` : text;
}
