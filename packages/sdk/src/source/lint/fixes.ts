// Edits a lint rule can offer as a fix, built from the parsed file: rename a prop, respell a value, move props into
// an object prop. Each returns the edits, or null when the source is written in a way that has no one right answer
// (the target is an expression, the new name is taken), and the rule then reports without a fix.
import * as t from "@babel/types";

import type { SourceEdit } from "../edits";
import type { SourceIndex } from "../index";
import type { Range } from "../parse";
import { isPlainAttribute } from "../print";

/** Every JSX opening tag in the file, in source order; with `name`, only the tags of that name. */
export function jsxTags(index: Pick<SourceIndex, "ast">, name?: string): t.JSXOpeningElement[] {
  const out: t.JSXOpeningElement[] = [];
  t.traverseFast(index.ast.program, (node) => {
    if (!t.isJSXOpeningElement(node)) return;
    if (name === undefined || (t.isJSXIdentifier(node.name) && node.name.name === name)) out.push(node);
  });
  return out;
}

/** The tag's name as written: `Title`, or `motion.div`. */
export function tagName(tag: t.JSXOpeningElement): string {
  const name = (n: t.JSXOpeningElement["name"] | t.JSXMemberExpression["object"]): string =>
    t.isJSXIdentifier(n)
      ? n.name
      : t.isJSXMemberExpression(n)
        ? `${name(n.object)}.${n.property.name}`
        : `${n.namespace.name}:${n.name.name}`;
  return name(tag.name);
}

/** The tag's attribute of that name. */
export function attributeOf(tag: t.JSXOpeningElement, name: string): t.JSXAttribute | undefined {
  return tag.attributes.find(
    (a): a is t.JSXAttribute => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name) && a.name.name === name,
  );
}

/** The tag's literal `id`, or an empty string: what its edits are filed under. */
export function idOf(tag: t.JSXOpeningElement): string {
  const value = attributeOf(tag, "id")?.value;
  if (t.isStringLiteral(value)) return value.value;
  if (t.isJSXExpressionContainer(value) && t.isStringLiteral(value.expression)) return value.expression.value;
  return "";
}

/** The node a dotted path names on a tag: the attribute, or a property inside its object literal. */
export type PropNode =
  | { readonly kind: "attribute"; readonly node: t.JSXAttribute }
  | { readonly kind: "property"; readonly node: t.ObjectProperty; readonly parent: t.ObjectExpression };

/** Follows `path` (`"animation.preset"`) from the tag's attribute into object literals; undefined when it is not written out. */
export function propAt(tag: t.JSXOpeningElement, path: string): PropNode | undefined {
  const [first, ...rest] = path.split(".") as [string, ...string[]];
  const attribute = attributeOf(tag, first);
  if (!attribute) return undefined;
  if (rest.length === 0) return { kind: "attribute", node: attribute };
  let value: t.Node | null | undefined = t.isJSXExpressionContainer(attribute.value)
    ? attribute.value.expression
    : undefined;
  let found: PropNode | undefined;
  for (const key of rest) {
    if (!t.isObjectExpression(value)) return undefined;
    const property = propertyOf(value, key);
    if (!property) return undefined;
    found = { kind: "property", node: property, parent: value };
    value = property.value;
  }
  return found;
}

/** Gives a prop a new name. A dotted path renames its last key. Null when the new name is already there. */
export function renameProp(tag: t.JSXOpeningElement, from: string, to: string): SourceEdit[] | null {
  const site = propAt(tag, from);
  if (!site) return null;
  const top = from.split(".")[0] as string;
  if (site.kind === "attribute") {
    if (attributeOf(tag, to)) return null;
    return [edit(tag, top, range(site.node.name), to)];
  }
  if (propertyOf(site.parent, to) || site.node.computed) return null;
  return [edit(tag, top, range(site.node.key), keyText(to))];
}

/** Respells a string value: `"word-by-word"` to `"wordByWord"`. Null when the prop does not hold exactly that string. */
export function renameValue(
  text: string,
  tag: t.JSXOpeningElement,
  path: string,
  from: string,
  to: string,
): SourceEdit[] | null {
  const value = stringAt(tag, path);
  if (!value || value.node.value !== from) return null;
  const top = path.split(".")[0] as string;
  const [start, end] = range(value.node);
  if (value.inJsx) {
    return [edit(tag, top, [start, end], isPlainAttribute(to) ? `"${to}"` : `{${JSON.stringify(to)}}`)];
  }
  const quote = text[start] === "'" ? "'" : '"';
  const body = JSON.stringify(to).slice(1, -1);
  return [
    edit(tag, top, [start, end], quote === "'" ? `'${body.replace(/\\"/g, '"').replace(/'/g, "\\'")}'` : `"${body}"`),
  ];
}

export interface MoveOptions {
  /** When the object prop holds a plain value already (`style="h1"`), the key that value takes in the new object. */
  readonly wrap?: string;
  /** Edits made in the same fix: one that lies inside a moved value is applied to the value as it moves. */
  readonly rewrite?: readonly SourceEdit[];
}

/**
 * Moves props into an object prop: `size={64} weight={700}` becomes `style={{ size: 64, weight: 700 }}`. The object
 * prop is made when the tag has none, extended when it is an object literal, and wrapped when it is a plain value and
 * `wrap` names a key for it. Null when it is any other expression, or already has one of the keys.
 */
export function movePropsInto(
  text: string,
  tag: t.JSXOpeningElement,
  moves: readonly { readonly prop: string; readonly key?: string }[],
  objectProp: string,
  options: MoveOptions = {},
): SourceEdit[] | null {
  const sources = moves.flatMap((move) => {
    const node = attributeOf(tag, move.prop);
    return node ? [{ prop: move.prop, key: move.key ?? move.prop, node }] : [];
  });
  if (sources.length === 0) return null;
  if (new Set(sources.map((s) => s.key)).size < sources.length) return null;
  const entries = sources.map((s) => `${keyText(s.key)}: ${valueText(text, s.node, options.rewrite ?? [])}`);
  const removals = sources.map((s) => edit(tag, s.prop, withLeadingSpace(text, range(s.node)), ""));
  const target = attributeOf(tag, objectProp);

  if (!target) {
    // The new prop takes the first moved prop's place; the others go.
    const first = sources[0] as (typeof sources)[number];
    const made = `${objectProp}={{ ${entries.join(", ")} }}`;
    return [edit(tag, objectProp, range(first.node), made), ...removals.slice(1)];
  }

  const held = t.isJSXExpressionContainer(target.value) ? target.value.expression : target.value;
  if (t.isObjectExpression(held)) {
    if (held.properties.some((p) => t.isSpreadElement(p))) return null;
    if (sources.some((s) => propertyOf(held, s.key))) return null;
    const last = held.properties.at(-1);
    if (!last) return [edit(tag, objectProp, range(held), `{ ${entries.join(", ")} }`), ...removals];
    const at = last.end as number;
    // An object written one key to a line keeps that shape.
    const before = text.slice(held.start as number, last.start as number);
    const lines = /\n([ \t]*)$/.exec(before);
    const joint = lines ? `,\n${lines[1]}` : ", ";
    return [edit(tag, objectProp, [at, at], entries.map((e) => `${joint}${e}`).join("")), ...removals];
  }

  const plain = t.isStringLiteral(held) || t.isNumericLiteral(held) || t.isBooleanLiteral(held);
  if (plain && target.value && options.wrap !== undefined) {
    const all = [`${keyText(options.wrap)}: ${valueText(text, target, options.rewrite ?? [])}`, ...entries];
    return [edit(tag, objectProp, range(target.value), `{{ ${all.join(", ")} }}`), ...removals];
  }
  return null;
}

/** Moves one prop into an object prop, under `key` (its own name when left out). */
export function movePropInto(
  text: string,
  tag: t.JSXOpeningElement,
  prop: string,
  objectProp: string,
  key: string = prop,
  options: MoveOptions = {},
): SourceEdit[] | null {
  return movePropsInto(text, tag, [{ prop, key }], objectProp, options);
}

/** The range of a moved or renamed attribute, for a rule that needs to know what a fix already covers. */
export function attributeRange(tag: t.JSXOpeningElement, name: string): Range | undefined {
  const node = attributeOf(tag, name);
  return node ? range(node) : undefined;
}

/** The string a path holds, and whether it is a JSX attribute string (`a="x"`) or a JavaScript one (`a={"x"}`, `{ a: "x" }`). */
function stringAt(tag: t.JSXOpeningElement, path: string): { node: t.StringLiteral; inJsx: boolean } | undefined {
  const site = propAt(tag, path);
  if (!site) return undefined;
  if (site.kind === "property")
    return t.isStringLiteral(site.node.value) ? { node: site.node.value, inJsx: false } : undefined;
  const value = site.node.value;
  if (t.isStringLiteral(value)) return { node: value, inJsx: true };
  if (t.isJSXExpressionContainer(value) && t.isStringLiteral(value.expression))
    return { node: value.expression, inJsx: false };
  return undefined;
}

function propertyOf(object: t.ObjectExpression, key: string): t.ObjectProperty | undefined {
  return object.properties.find(
    (p): p is t.ObjectProperty =>
      t.isObjectProperty(p) &&
      !p.computed &&
      ((t.isIdentifier(p.key) && p.key.name === key) || (t.isStringLiteral(p.key) && p.key.value === key)),
  );
}

/** The attribute's value as a JavaScript expression: `"x"` for `a="x"`, the inside of the braces, `true` for a bare one. */
function valueText(text: string, attribute: t.JSXAttribute, rewrite: readonly SourceEdit[]): string {
  const value = attribute.value;
  if (!value) return "true";
  if (t.isStringLiteral(value)) {
    const respelled = rewrite.find((e) => e.range[0] === value.start && e.range[1] === value.end);
    if (respelled) return respelled.text.startsWith("{") ? respelled.text.slice(1, -1) : respelled.text;
    return JSON.stringify(value.value);
  }
  const inner = t.isJSXExpressionContainer(value) ? value.expression : value;
  const [start, end] = range(inner);
  // Edits inside the value, last first, so earlier offsets stay true.
  const inside = rewrite
    .filter((e) => e.range[0] >= start && e.range[1] <= end)
    .sort((a, b) => b.range[0] - a.range[0]);
  let out = text.slice(start, end);
  for (const e of inside) out = out.slice(0, e.range[0] - start) + e.text + out.slice(e.range[1] - start);
  return out;
}

/** The attribute with the whitespace before it, so removing it leaves no gap and no empty line. */
function withLeadingSpace(text: string, [start, end]: Range): Range {
  let from = start;
  while (from > 0 && /\s/.test(text[from - 1] as string)) from--;
  return [from, end];
}

function keyText(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
}

function range(node: t.Node): Range {
  return [node.start as number, node.end as number];
}

function edit(tag: t.JSXOpeningElement, prop: string, at: Range, text: string): SourceEdit {
  return { kind: "prop", id: idOf(tag), prop, range: at, text };
}
