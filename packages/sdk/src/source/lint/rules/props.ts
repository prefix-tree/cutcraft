// Everything about an element is a prop (decision 0035). `<Keyframe>`, `<Effect>`, `<SpeedKey>` and `<Freeze>`
// children, and the `automation` prop, are the old spelling: this rule reports them and moves them into the element's
// props, copying every value as it is written. What cannot be moved for certain is reported without a fix: keys made
// in code (a `.map`, a helper), a spread, a transform that is not written out.
import * as t from "@babel/types";

import { RENAMED_EFFECT_PARAMS, RESPELLED_VALUES } from "@uberscene/kit/schema";

import type { SourceEdit } from "../../edits";
import { attributeOf, idOf, tagName } from "../fixes";
import type { Diagnostic } from "../index";
import type { Rule } from "./index";

const OLD = new Set(["Keyframe", "Effect", "SpeedKey", "Freeze"]);
const WIDTH = 120;

/** A value to print: source as written, a list, or an object (a `null` key is a spread). */
type P =
  | { readonly t: "raw"; readonly s: string }
  | { readonly t: "arr"; readonly items: readonly { readonly value: P; readonly comment?: string }[] }
  | { readonly t: "obj"; readonly fields: readonly { readonly key: string | null; readonly value: P }[] };

const raw = (s: string): P => ({ t: "raw", s });

function flat(p: P): string {
  if (p.t === "raw") return p.s;
  if (p.t === "arr")
    return `[${p.items.map((i) => `${i.comment ? `/* ${i.comment} */ ` : ""}${flat(i.value)}`).join(", ")}]`;
  if (p.fields.length === 0) return "{}";
  return `{ ${p.fields.map((f) => (f.key === null ? `...${flat(f.value)}` : `${f.key}: ${flat(f.value)}`)).join(", ")} }`;
}

/** Compact while it fits the line, else one entry per line, as the editor's printer writes values. */
function print(p: P, indent: string, column: number): string {
  const compact = flat(p);
  if (p.t === "raw" || column + compact.length <= WIDTH) return compact;
  const inner = `${indent}  `;
  if (p.t === "arr")
    return `[\n${p.items
      .map((i) => `${i.comment ? `${inner}// ${i.comment}\n` : ""}${inner}${print(i.value, inner, inner.length)},`)
      .join("\n")}\n${indent}]`;
  return `{\n${p.fields
    .map((f) =>
      f.key === null
        ? `${inner}...${print(f.value, inner, inner.length + 3)},`
        : `${inner}${f.key}: ${print(f.value, inner, inner.length + f.key.length + 2)},`,
    )
    .join("\n")}\n${indent}}`;
}

interface Key {
  readonly at: string;
  readonly value: string;
  readonly easing?: string;
  readonly comment?: string;
}

const keyList = (keys: readonly Key[]): P => ({
  t: "arr",
  items: keys.map((k) => ({
    value: {
      t: "obj",
      fields: [
        { key: "at", value: raw(k.at) },
        { key: "value", value: raw(k.value) },
        ...(k.easing !== undefined ? [{ key: "easing", value: raw(k.easing) }] : []),
      ],
    },
    ...(k.comment ? { comment: k.comment } : {}),
  })),
});

/** Why an element cannot be moved for certain: thrown inside, caught per element. */
class Unsure extends Error {}

const src = (text: string, node: t.Node): string => text.slice(node.start ?? 0, node.end ?? 0);

/** An attribute's value as source: a string literal as `"…"`, an expression as written, a bare attribute as `true`. */
function valueText(text: string, a: t.JSXAttribute | undefined): string | undefined {
  if (!a) return undefined;
  const v = a.value;
  if (v === null || v === undefined) return "true";
  if (t.isStringLiteral(v)) return JSON.stringify(v.value);
  if (t.isJSXExpressionContainer(v) && !t.isJSXEmptyExpression(v.expression)) return src(text, v.expression);
  throw new Unsure("a value it cannot read");
}

function stringOf(a: t.JSXAttribute | undefined): string | undefined {
  const v = a?.value;
  if (t.isStringLiteral(v)) return v.value;
  if (t.isJSXExpressionContainer(v) && t.isStringLiteral(v.expression)) return v.expression.value;
  return undefined;
}

function need(text: string, tag: t.JSXOpeningElement, name: string): string {
  const v = valueText(text, attributeOf(tag, name));
  if (v === undefined) throw new Unsure(`a <${tagName(tag)}> without ${name}`);
  return v;
}

/** The property a keyframe's `property` names, as a prop path: `audio.volume` is `volume`. */
function pathOf(property: string): string {
  if (property === "audio.volume") return "volume";
  if (property === "audio.pan") return "pan";
  return property;
}

/** An object literal's fields as source, by key; a spread under `null` keys in order. */
function fieldsOf(text: string, node: t.Node | null | undefined): { key: string | null; value: P }[] {
  if (!t.isObjectExpression(node)) throw new Unsure("an object that is not written out");
  return node.properties.map((p) => {
    if (t.isSpreadElement(p)) return { key: null, value: raw(src(text, p.argument)) };
    if (!t.isObjectProperty(p) || p.computed) throw new Unsure("a computed key");
    const key = t.isIdentifier(p.key) ? p.key.name : t.isStringLiteral(p.key) ? JSON.stringify(p.key.value) : null;
    if (key === null) throw new Unsure("a key it cannot read");
    const value: P = t.isObjectExpression(p.value)
      ? { t: "obj", fields: fieldsOf(text, p.value) }
      : raw(src(text, p.value));
    return { key, value };
  });
}

/** Sets `path` (`scale.x`) inside a list of object fields, making the objects on the way. */
function setIn(fields: { key: string | null; value: P }[], path: readonly string[], value: P): void {
  const [first, ...rest] = path as [string, ...string[]];
  const at = fields.findIndex((f) => f.key === first);
  if (rest.length === 0) {
    if (at >= 0) fields[at] = { key: first, value };
    else fields.push({ key: first, value });
    return;
  }
  const existing = at >= 0 ? fields[at]?.value : undefined;
  const inner: { key: string | null; value: P }[] =
    existing?.t === "obj"
      ? [...existing.fields]
      : existing?.t === "raw"
        ? // A number written for both axes keeps it on the axis that is not keyed.
          [
            { key: "x", value: existing },
            { key: "y", value: existing },
          ]
        : [];
  setIn(inner, rest, value);
  const node: P = { t: "obj", fields: inner };
  if (at >= 0) fields[at] = { key: first, value: node };
  else fields.push({ key: first, value: node });
}

interface Moved {
  readonly attrs: Map<string, P>;
  readonly remove: string[];
  readonly children: t.Node[];
  readonly counts: Map<string, number>;
}

/** What an element's old children and `automation` become as its props. Throws `Unsure` when that is not certain. */
function move(text: string, el: t.JSXElement): Moved | null {
  const tag = el.openingElement;
  const attrs = new Map<string, P>();
  const remove: string[] = [];
  const counts = new Map<string, number>();
  const children: t.Node[] = [];
  const keys = new Map<string, Key[]>();
  const speed: Key[] = [];
  const freezes: P[] = [];
  const effects: { value: P; comment?: string }[] = [];
  let comment: string | undefined;
  let pendingComment: t.Node | undefined;
  for (const child of el.children) {
    if (t.isJSXExpressionContainer(child) && t.isJSXEmptyExpression(child.expression)) {
      const c = child.expression.innerComments?.map((x) => x.value.trim()).join(" ");
      comment = c || undefined;
      pendingComment = child;
      continue;
    }
    if (!t.isJSXElement(child)) {
      if (!t.isJSXText(child) || child.value.trim() !== "") comment = undefined;
      continue;
    }
    const ctag = child.openingElement;
    const name = tagName(ctag);
    if (!OLD.has(name)) {
      comment = undefined;
      continue;
    }
    if (ctag.attributes.some((a) => t.isJSXSpreadAttribute(a))) throw new Unsure(`a <${name}> with a spread`);
    counts.set(name, (counts.get(name) ?? 0) + 1);
    if (pendingComment && comment !== undefined) children.push(pendingComment);
    children.push(child);
    const note = comment;
    comment = undefined;
    pendingComment = undefined;
    if (name === "Keyframe") {
      const property = stringOf(attributeOf(ctag, "property"));
      if (property === undefined) throw new Unsure("a <Keyframe> whose property is not a string");
      if (property.startsWith("transform.position"))
        throw new Unsure("a transform.position key (the box fix moves it first)");
      const path = pathOf(property);
      const list = keys.get(path) ?? [];
      keys.set(path, list);
      list.push(keyOf(text, ctag, "value", note));
    } else if (name === "SpeedKey") speed.push(keyOf(text, ctag, "speed", note));
    else if (name === "Freeze")
      freezes.push({
        t: "obj",
        fields: [
          { key: "start", value: raw(need(text, ctag, "start")) },
          { key: "duration", value: raw(need(text, ctag, "duration")) },
          { key: "source", value: raw(need(text, ctag, "at")) },
        ],
      });
    else effects.push({ value: effectOf(text, child), ...(note ? { comment: note } : {}) });
  }

  const automation = attributeOf(tag, "automation");
  if (counts.size === 0 && !automation) return null;

  // transform and box: the keyed fields set into the object as written.
  for (const top of ["transform", "box"] as const) {
    const mine = [...keys].filter(([p]) => p.startsWith(`${top}.`));
    if (mine.length === 0) continue;
    const existing = attributeOf(tag, top);
    const fields = existing ? fieldsOf(text, expressionOf(existing)) : [];
    const sx = keys.get("transform.scale.x");
    const sy = keys.get("transform.scale.y");
    for (const [path, list] of mine) {
      const rest = path.split(".").slice(1);
      // The same keys on both axes of scale are one list.
      if (top === "transform" && rest[0] === "scale" && sx && sy && sameKeys(sx, sy)) {
        setIn(fields, ["scale"], keyList(sx));
        continue;
      }
      setIn(fields, rest, keyList(list));
    }
    if (top === "transform") {
      // An axis of scale or anchor keyed alone: the other keeps its value, or its default.
      for (const [pair, missing] of [
        ["scale", "1"],
        ["anchor", "0.5"],
      ] as const) {
        const f = fields.find((x) => x.key === pair);
        if (f?.value.t !== "obj") continue;
        for (const axis of ["x", "y"])
          if (!f.value.fields.some((x) => x.key === axis))
            (f.value.fields as { key: string | null; value: P }[]).push({ key: axis, value: raw(missing) });
      }
    }
    attrs.set(top, { t: "obj", fields });
  }

  // Sound: keys on volume and pan replace them; automation's points were multiplied into the volume.
  const lanes = automation ? lanesOf(text, automation) : {};
  if (keys.has("volume") && lanes.volume) throw new Unsure("a sound with both volume keys and automation");
  if (keys.has("pan") && lanes.pan) throw new Unsure("a sound with both pan keys and automation");
  if (keys.has("volume")) attrs.set("volume", keyList(keys.get("volume") as Key[]));
  else if (lanes.volume) {
    const volume = attributeOf(tag, "volume");
    const v = volume ? valueText(text, volume) : "1";
    const scale = Number(v);
    if (!Number.isFinite(scale)) throw new Unsure("automation on a volume that is not a number");
    attrs.set(
      "volume",
      keyList(
        lanes.volume.map(([at, value]) => {
          const n = Number(value);
          return {
            at,
            value: Number.isFinite(n)
              ? String(Math.round(n * scale * 1e6) / 1e6)
              : scale === 1
                ? value
                : `${scale} * (${value})`,
          };
        }),
      ),
    );
  }
  if (keys.has("pan")) attrs.set("pan", keyList(keys.get("pan") as Key[]));
  else if (lanes.pan) attrs.set("pan", keyList(lanes.pan.map(([at, value]) => ({ at, value }))));
  if (automation) remove.push("automation");

  if (speed.length > 0) attrs.set("speed", keyList(speed));
  if (freezes.length > 0) attrs.set("freezes", { t: "arr", items: freezes.map((value) => ({ value })) });
  if (effects.length > 0) {
    if (attributeOf(tag, "effects")) throw new Unsure("effects written both ways");
    attrs.set("effects", { t: "arr", items: effects });
  }
  for (const k of keys.keys())
    if (!k.startsWith("transform.") && !k.startsWith("box.") && k !== "volume" && k !== "pan")
      throw new Unsure(`a key on "${k}"`);
  return { attrs, remove, children, counts };
}

/** An easing as written, respelled in camelCase when it is a literal in the old spelling (`"ease-in-out"`). */
function easingOf(text: string, tag: t.JSXOpeningElement): string | undefined {
  const literal = stringOf(attributeOf(tag, "easing"));
  const now = literal !== undefined && Object.hasOwn(RESPELLED_VALUES, literal) ? RESPELLED_VALUES[literal] : undefined;
  return now !== undefined ? JSON.stringify(now) : valueText(text, attributeOf(tag, "easing"));
}

/** A built-in effect's param under its name since 0.6 (the shadow's `radius` is `blur`). */
function paramName(type: string | undefined, param: string): string {
  const moved =
    type !== undefined && Object.hasOwn(RENAMED_EFFECT_PARAMS, type) ? RENAMED_EFFECT_PARAMS[type] : undefined;
  return moved && Object.hasOwn(moved, param) ? (moved[param] as string) : param;
}

function keyOf(text: string, tag: t.JSXOpeningElement, valueName: string, comment: string | undefined): Key {
  const easing = easingOf(text, tag);
  return {
    at: need(text, tag, "at"),
    value: need(text, tag, valueName),
    ...(easing !== undefined ? { easing } : {}),
    ...(comment ? { comment } : {}),
  };
}

const sameKeys = (a: readonly Key[], b: readonly Key[]): boolean =>
  a.length === b.length && a.every((k, i) => k.at === b[i]?.at && k.value === b[i]?.value && k.easing === b[i]?.easing);

/** One `<Effect>` as an entry of `effects`: its type, its params (spread when not written out), its keyed params. */
function effectOf(text: string, el: t.JSXElement): P {
  const tag = el.openingElement;
  const fields: { key: string | null; value: P }[] = [{ key: "type", value: raw(need(text, tag, "type")) }];
  const params = attributeOf(tag, "params");
  const type = stringOf(attributeOf(tag, "type"));
  const keyed = new Map<string, Key[]>();
  for (const child of el.children) {
    if (t.isJSXText(child) && child.value.trim() === "") continue;
    if (t.isJSXExpressionContainer(child) && t.isJSXEmptyExpression(child.expression)) continue;
    if (!t.isJSXElement(child) || tagName(child.openingElement) !== "Keyframe")
      throw new Unsure("an <Effect> holding something other than keys");
    const written = stringOf(attributeOf(child.openingElement, "param"));
    if (written === undefined) throw new Unsure("an effect key whose param is not a string");
    const param = paramName(type, written);
    const list = keyed.get(param) ?? [];
    keyed.set(param, list);
    list.push(keyOf(text, child.openingElement, "value", undefined));
  }
  if (params) {
    const node = expressionOf(params);
    if (t.isObjectExpression(node)) {
      // A param that is keyed is its keys: the constant written beside them was never seen.
      for (const f of fieldsOf(text, node)) {
        const key = f.key === null ? null : paramName(type, f.key);
        if (key === null || !keyed.has(key)) fields.push({ ...f, key });
      }
    } else if (node) fields.push({ key: null, value: raw(src(text, node)) });
  }
  for (const [param, list] of keyed) fields.push({ key: param, value: keyList(list) });
  const enabled = attributeOf(tag, "enabled");
  if (enabled) {
    const v = valueText(text, enabled);
    if (v !== "true") fields.push({ key: "enabled", value: raw(v as string) });
  }
  return { t: "obj", fields };
}

function expressionOf(a: t.JSXAttribute): t.Expression | undefined {
  const v = a.value;
  return t.isJSXExpressionContainer(v) && !t.isJSXEmptyExpression(v.expression) ? v.expression : undefined;
}

/** `automation={{ volume: [[t, v], …], pan: […] }}` as source pairs. */
function lanesOf(text: string, a: t.JSXAttribute): { volume?: [string, string][]; pan?: [string, string][] } {
  const node = expressionOf(a);
  if (!t.isObjectExpression(node)) throw new Unsure("automation that is not written out");
  const out: { volume?: [string, string][]; pan?: [string, string][] } = {};
  for (const p of node.properties) {
    if (!t.isObjectProperty(p) || !t.isIdentifier(p.key) || !t.isArrayExpression(p.value))
      throw new Unsure("automation that is not written out");
    const lane = p.key.name;
    if (lane !== "volume" && lane !== "pan") throw new Unsure(`an automation lane "${lane}"`);
    out[lane] = p.value.elements.map((e) => {
      if (!t.isArrayExpression(e) || e.elements.length !== 2 || !e.elements[0] || !e.elements[1])
        throw new Unsure("an automation point that is not [seconds, value]");
      return [src(text, e.elements[0]), src(text, e.elements[1])];
    });
  }
  return out;
}

/** The edits that write `moved` into the element: its props set, its old children removed, an emptied tag closed. */
function edits(text: string, el: t.JSXElement, moved: Moved): SourceEdit[] {
  const tag = el.openingElement;
  const id = idOf(tag);
  const out: SourceEdit[] = [];
  const lineStart = (pos: number): number => text.lastIndexOf("\n", pos - 1) + 1;
  const tagIndent = /^[ \t]*/.exec(text.slice(lineStart(tag.start ?? 0)))?.[0] ?? "";
  const attributes = tag.attributes.filter((a): a is t.JSXAttribute => t.isJSXAttribute(a));
  const multiline = attributes.some((a) => text.slice(tag.start ?? 0, a.start ?? 0).includes("\n"));
  const attrIndent = multiline
    ? (/^[ \t]*/.exec(
        text.slice(
          lineStart(attributes.find((a) => text.slice(tag.start ?? 0, a.start ?? 0).includes("\n"))?.start ?? 0),
        ),
      )?.[0] ?? `${tagIndent}  `)
    : tagIndent;
  const inserts: string[] = [];
  for (const [name, value] of moved.attrs) {
    const existing = attributeOf(tag, name);
    if (existing) {
      const column = (existing.start ?? 0) - lineStart(existing.start ?? 0) + name.length + 2;
      out.push({
        kind: "text",
        id,
        range: [existing.start ?? 0, existing.end ?? 0],
        text: `${name}={${print(value, attrIndent, column)}}`,
      });
    } else inserts.push(`${name}={${print(value, attrIndent, attrIndent.length + name.length + 2)}}`);
  }
  for (const name of moved.remove) {
    const a = attributeOf(tag, name);
    if (!a || moved.attrs.has(name)) continue;
    let start = a.start ?? 0;
    while (start > 0 && /\s/.test(text[start - 1] ?? "")) start--;
    out.push({ kind: "remove", id, range: [start, a.end ?? 0], text: "" });
  }
  const last = attributes[attributes.length - 1];
  const at = last ? (last.end ?? 0) : (tag.name.end ?? 0);
  if (inserts.length > 0)
    out.push({
      kind: "insert",
      id,
      range: [at, at],
      text: inserts.map((s) => (multiline ? `\n${attrIndent}${s}` : ` ${s}`)).join(""),
    });
  // The children it held: gone. When nothing else is left inside, the element closes itself.
  const left = el.children.filter((c) => !moved.children.includes(c) && !(t.isJSXText(c) && c.value.trim() === ""));
  if (moved.children.length > 0 && left.length === 0 && el.closingElement) {
    const close = tag.end ?? 0;
    out.push({ kind: "text", id, range: [close - 1, el.end ?? 0], text: multiline ? `\n${tagIndent}/>` : " />" });
  } else
    for (const child of moved.children) {
      let start = child.start ?? 0;
      let end = child.end ?? 0;
      const ls = lineStart(start);
      const le = text.indexOf("\n", end);
      if (text.slice(ls, start).trim() === "" && text.slice(end, le < 0 ? text.length : le).trim() === "") {
        start = ls;
        end = le < 0 ? text.length : le + 1;
      }
      out.push({ kind: "remove", id, range: [start, end], text: "" });
    }
  return out;
}

export const everythingIsAProp: Rule = {
  name: "everything-is-a-prop",
  check: (index) => {
    const out: Diagnostic[] = [];
    const text = index.text;
    const handled = new Set<t.Node>();
    t.traverseFast(index.ast.program, (node) => {
      if (!t.isJSXElement(node)) return;
      const tag = node.openingElement;
      const name = tagName(tag);
      if (OLD.has(name)) return;
      const range: [number, number] = [tag.start ?? 0, tag.end ?? 0];
      try {
        const moved = move(text, node);
        if (!moved) return;
        for (const c of moved.children)
          t.traverseFast(c, (n) => {
            handled.add(n);
          });
        const was = [...moved.counts].map(([n, c]) => `${c} <${n}>`);
        if (attributeOf(tag, "automation")) was.push("automation");
        out.push({
          rule: "everything-is-a-prop",
          severity: "error",
          message: `<${name}>: ${was.join(", ")} → props of the element (effects, keys in place of values, speed, freezes, volume, pan)`,
          range,
          id: idOf(tag),
          fix: edits(text, node, moved),
        });
      } catch (error) {
        if (!(error instanceof Unsure)) throw error;
        for (const c of node.children)
          if (t.isJSXElement(c) && OLD.has(tagName(c.openingElement)))
            t.traverseFast(c, (n) => {
              handled.add(n);
            });
        out.push({
          rule: "everything-is-a-prop",
          severity: "error",
          message: `<${name}>: its <Keyframe>, <Effect>, <SpeedKey> and <Freeze> children are now props of the element; not moved for you, as it has ${error.message}`,
          range,
          id: idOf(tag),
        });
      }
    });
    // Their names in the kit's import, once no tag of the name is left: the kit no longer has them.
    const used = new Set<string>();
    t.traverseFast(index.ast.program, (node) => {
      if (t.isJSXOpeningElement(node)) used.add(tagName(node));
    });
    for (const node of index.ast.program.body) {
      if (!t.isImportDeclaration(node) || node.source.value !== "@uberscene/kit") continue;
      const gone = node.specifiers.filter(
        (s) =>
          t.isImportSpecifier(s) && t.isIdentifier(s.imported) && OLD.has(s.imported.name) && !used.has(s.local.name),
      );
      if (gone.length === 0) continue;
      const kept = node.specifiers.filter((s) => !gone.includes(s)).map((s) => src(text, s));
      const range: [number, number] = [node.start ?? 0, node.end ?? 0];
      out.push({
        rule: "everything-is-a-prop",
        severity: "error",
        message: `@uberscene/kit no longer has ${gone.map((s) => s.local.name).join(", ")}: they are props of the elements now`,
        range,
        fix: [
          {
            kind: "text",
            id: "",
            range,
            text: kept.length > 0 ? `import { ${kept.join(", ")} } from "@uberscene/kit";` : "",
          },
        ],
      });
    }
    // Old elements anywhere else: made in code, or returned by a helper.
    t.traverseFast(index.ast.program, (node) => {
      if (!t.isJSXElement(node) || handled.has(node)) return;
      const name = tagName(node.openingElement);
      if (!OLD.has(name)) return;
      out.push({
        rule: "everything-is-a-prop",
        severity: "error",
        message: `<${name}> made in code is now a prop of the element it belongs to (effects, keys in place of values, speed, freezes); move it by hand`,
        range: [node.openingElement.start ?? 0, node.openingElement.end ?? 0],
        id: idOf(node.openingElement),
      });
    });
    return out;
  },
};
