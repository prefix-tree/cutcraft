// `transform.position`, the centre-relative x and y of components, and the captions' x, y, width and style.position
// became `box`, from the frame's top left. A file written for the old spelling is reported here, and moved for certain
// where the composition's size is written as numbers: the old offset from the centre becomes the same point from the
// top left, with `origin: "center"` so the element's centre stays where it was.
import * as t from "@babel/types";

import type { SourceEdit } from "../../edits";
import { attributeOf, idOf, jsxTags, tagName } from "../fixes";
import type { Diagnostic } from "../index";
import type { Rule } from "./index";

/** A component's old default centre, in pixels from the frame's centre. */
const COMPONENT_DEFAULTS: Readonly<Record<string, { readonly x: number; readonly y: number }>> = {
  Badge: { x: 0, y: 0 },
  Callout: { x: 320, y: -220 },
  Counter: { x: 0, y: 0 },
  LowerThird: { x: -560, y: 330 },
  TypeCard: { x: 0, y: 0 },
};
/** Points from the frame's centre that move with a component's old `x` and `y`. */
const POINT_PROPS: Readonly<Record<string, readonly string[]>> = { Callout: ["to"] };

export const boxPlacement: Rule = {
  name: "box-placement",
  check: (index) => {
    const frame = compositionSize(index.ast);
    const out: Diagnostic[] = [];
    const text = index.text;
    const report = (
      tag: t.JSXOpeningElement,
      message: string,
      fix: SourceEdit[] | null,
      severity: "error" | "warning" = "error",
    ): void => {
      out.push({
        rule: "box-placement",
        severity,
        message: `${message}${fix ? "" : frame ? "" : " (the composition's width and height are not numbers or constants, so it is not moved for you)"}`,
        range: [tag.start ?? 0, tag.end ?? 0],
        id: idOf(tag),
        ...(fix ? { fix } : {}),
      });
    };
    const elements = jsxElements(index.ast);
    const kit = kitNames(index.ast);
    for (const el of elements) {
      const tag = el.openingElement;
      const name = tagName(tag);
      const id = idOf(tag);
      // An element's transform.position.
      const transform = attributeOf(tag, "transform");
      const position = transform ? objectProperty(objectOf(transform), "position") : undefined;
      if (transform && position) {
        const fix = frame ? moveTransform(text, id, transform, position, frame, attributeOf(tag, "box")) : null;
        report(tag, `<${name}>: transform.position is now box, from the frame's top left`, fix);
      }
      // A keyframe of transform.position.
      if (name === "Keyframe") {
        const property = stringValue(attributeOf(tag, "property"));
        const axis = /^transform\.position\.([xy])$/.exec(property ?? "")?.[1] as "x" | "y" | undefined;
        if (axis) {
          const fix = frame ? moveKeyframe(text, id, tag, axis, frame, parentOf(elements, el)) : null;
          report(tag, `<Keyframe>: "transform.position.${axis}" is now "box.${axis}", from the frame's top left`, fix);
        }
      }
      // Captions' flat x, y and width, and their style.position.
      if (name === "Captions") {
        const style = attributeOf(tag, "style");
        const position = style ? objectProperty(objectOf(style), "position") : undefined;
        const flat = ["x", "y", "width"].filter((k) => attributeOf(tag, k));
        if (flat.length > 0 || position) {
          const fix = frame ? moveCaptions(text, id, tag, frame, style, position) : null;
          const was = [...flat, ...(position ? ["style.position"] : [])].join(", ");
          report(
            tag,
            `<Captions>: ${was} ${flat.length + (position ? 1 : 0) > 1 ? "are" : "is"} now box, from the frame's top left`,
            fix,
          );
        }
      }
      // Components: a flat x and y from the frame's centre, or the old default (the frame's centre and an offset) on a
      // frame its new default, measured on 1920 by 1080, does not fit.
      // Only the kit's components: a file may have a component of its own by the same name.
      const defaults = COMPONENT_DEFAULTS[kit.get(name) ?? ""];
      if (defaults && !attributeOf(tag, "box")) {
        const spread = tag.attributes.some((a) => t.isJSXSpreadAttribute(a));
        if (attributeOf(tag, "x") || attributeOf(tag, "y")) {
          const fix =
            frame && !spread
              ? moveComponent(text, id, tag, frame, defaults, POINT_PROPS[kit.get(name) ?? ""] ?? [])
              : null;
          report(tag, `<${name}>: x and y are now box, the component's centre from the frame's top left`, fix);
        } else if (frame && (frame.width !== 1920 || frame.height !== 1080) && (defaults.x !== 0 || defaults.y !== 0)) {
          // Only an axis whose default is off the centre: one left out is centred on any frame.
          const fix = spread
            ? null
            : moveComponent(text, id, tag, frame, defaults, POINT_PROPS[kit.get(name) ?? ""] ?? []);
          report(
            tag,
            `<${name}>: with no box it sits where its default puts it on a 1920 by 1080 frame, and this one is ${frame.width} by ${frame.height}; give it a box`,
            fix,
            "warning",
          );
        }
      }
    }
    return out;
  },
};

type Frame = { readonly width: number; readonly height: number };

/** The size of the file's `<Composition>`: numbers, or names the file's top level binds to numbers (`const W = 1280`). */
function compositionSize(ast: t.File): Frame | undefined {
  const tag = jsxTags({ ast }, "Composition")[0];
  if (!tag) return undefined;
  const constants = new Map<string, number>();
  for (const node of ast.program.body) {
    const declaration = t.isExportNamedDeclaration(node) ? node.declaration : node;
    if (!t.isVariableDeclaration(declaration) || declaration.kind !== "const") continue;
    for (const d of declaration.declarations) {
      const n = d.init ? numberOf(d.init) : undefined;
      if (t.isIdentifier(d.id) && n !== undefined) constants.set(d.id.name, n);
    }
  }
  const size = (attribute: t.JSXAttribute | undefined): number | undefined => {
    const v = attribute?.value;
    const e = t.isJSXExpressionContainer(v) ? v.expression : undefined;
    return e && t.isIdentifier(e) ? constants.get(e.name) : numberValue(attribute);
  };
  const width = size(attributeOf(tag, "width"));
  const height = size(attributeOf(tag, "height"));
  return width !== undefined && height !== undefined ? { width, height } : undefined;
}

/** The names the file imports from the kit, each to the name the kit exports it as. */
function kitNames(ast: t.File): Map<string, string> {
  const out = new Map<string, string>();
  for (const node of ast.program.body) {
    if (!t.isImportDeclaration(node) || node.source.value !== "@uberscene/kit") continue;
    for (const spec of node.specifiers)
      if (t.isImportSpecifier(spec))
        out.set(spec.local.name, t.isIdentifier(spec.imported) ? spec.imported.name : spec.imported.value);
  }
  return out;
}

function jsxElements(ast: t.File): t.JSXElement[] {
  const out: t.JSXElement[] = [];
  t.traverseFast(ast.program, (node) => {
    if (t.isJSXElement(node)) out.push(node);
  });
  return out;
}

function parentOf(all: readonly t.JSXElement[], child: t.JSXElement): t.JSXElement | undefined {
  return all.find((el) => el.children.includes(child));
}

function objectOf(attribute: t.JSXAttribute): t.ObjectExpression | undefined {
  const v = attribute.value;
  return t.isJSXExpressionContainer(v) && t.isObjectExpression(v.expression) ? v.expression : undefined;
}

function objectProperty(object: t.ObjectExpression | undefined, key: string): t.ObjectProperty | undefined {
  return object?.properties.find(
    (p): p is t.ObjectProperty =>
      t.isObjectProperty(p) && !p.computed && t.isIdentifier(p.key) && (p.key as t.Identifier).name === key,
  );
}

function numberValue(attribute: t.JSXAttribute | undefined): number | undefined {
  const v = attribute?.value;
  const e = t.isJSXExpressionContainer(v) ? v.expression : undefined;
  return e ? numberOf(e) : undefined;
}

function numberOf(node: t.Node): number | undefined {
  if (t.isNumericLiteral(node)) return node.value;
  if (t.isUnaryExpression(node) && node.operator === "-" && t.isNumericLiteral(node.argument))
    return -node.argument.value;
  return undefined;
}

function stringValue(attribute: t.JSXAttribute | undefined): string | undefined {
  const v = attribute?.value;
  if (t.isStringLiteral(v)) return v.value;
  if (t.isJSXExpressionContainer(v) && t.isStringLiteral(v.expression)) return v.expression.value;
  return undefined;
}

const src = (text: string, node: t.Node): string => text.slice(node.start ?? 0, node.end ?? 0);

/** A property kept from an object literal, with the comments written above it. */
function kept(text: string, node: t.Node): string {
  const first = node.leadingComments?.[0];
  return text.slice(first?.start ?? node.start ?? 0, node.end ?? 0);
}

/** `half + value` as source: a number when the value is one, else the expression with the half added. */
function shifted(text: string, node: t.Node, half: number): string {
  const n = numberOf(node);
  if (n !== undefined) return String(round(half + n));
  const s = src(text, node);
  const simple = t.isIdentifier(node) || t.isMemberExpression(node) || t.isCallExpression(node);
  return `${half} + ${simple ? s : `(${s})`}`;
}

const round = (v: number): number => Math.round(v * 1000) / 1000;

/** The `{ x, y }` object of a point or a position, as its two value nodes. */
function xy(node: t.Node | null | undefined): { x?: t.Node; y?: t.Node } | undefined {
  if (!t.isObjectExpression(node)) return undefined;
  const x = objectProperty(node, "x")?.value;
  const y = objectProperty(node, "y")?.value;
  return { ...(x ? { x } : {}), ...(y ? { y } : {}) };
}

function boxText(x: string | undefined, y: string | undefined): string {
  const parts = [x !== undefined ? `x: ${x}` : "", y !== undefined ? `y: ${y}` : "", 'origin: "center"'].filter(
    Boolean,
  );
  return `box={{ ${parts.join(", ")} }}`;
}

function edit(id: string, range: readonly [number, number], text: string): SourceEdit {
  return { kind: "text", id, range: [range[0], range[1]], text };
}

/** `transform={{ position: { x, y }, …rest }}` → `box={{ x: W/2 + x, y: H/2 + y, origin: "center" }} transform={{ …rest }}`. */
function moveTransform(
  text: string,
  id: string,
  transform: t.JSXAttribute,
  position: t.ObjectProperty,
  frame: Frame,
  existingBox: t.JSXAttribute | undefined,
): SourceEdit[] | null {
  if (existingBox) return null;
  const point = xy(position.value);
  if (!point) return null;
  const object = objectOf(transform) as t.ObjectExpression;
  const rest = object.properties.filter((p) => p !== position).map((p) => kept(text, p));
  const box = boxText(
    point.x ? shifted(text, point.x, frame.width / 2) : undefined,
    point.y ? shifted(text, point.y, frame.height / 2) : undefined,
  );
  const replacement = rest.length > 0 ? `${box} transform={{ ${rest.join(", ")} }}` : box;
  return [edit(id, [transform.start ?? 0, transform.end ?? 0], replacement)];
}

/** A keyframe of `transform.position.x` → `box.x`, its value moved by half the frame; its parent keeps its centre. */
function moveKeyframe(
  text: string,
  id: string,
  tag: t.JSXOpeningElement,
  axis: "x" | "y",
  frame: Frame,
  parent: t.JSXElement | undefined,
): SourceEdit[] | null {
  const property = attributeOf(tag, "property");
  const value = attributeOf(tag, "value");
  const v = value?.value;
  const node = t.isJSXExpressionContainer(v) ? v.expression : undefined;
  if (!property || !node || t.isJSXEmptyExpression(node)) return null;
  const half = axis === "x" ? frame.width / 2 : frame.height / 2;
  const edits: SourceEdit[] = [
    edit(id, [property.start ?? 0, property.end ?? 0], `property="box.${axis}"`),
    edit(id, [node.start ?? 0, node.end ?? 0], shifted(text, node, half)),
  ];
  // The keyed axis is now measured to the parent's origin: its centre, as before, unless its transform is moved too.
  const parentTag = parent?.openingElement;
  if (parentTag) {
    const moved =
      attributeOf(parentTag, "transform") &&
      objectProperty(objectOf(attributeOf(parentTag, "transform") as t.JSXAttribute), "position");
    if (!moved && !attributeOf(parentTag, "box")) {
      const at = parentTag.name.end ?? 0;
      edits.push({ kind: "insert", id: idOf(parentTag), range: [at, at], text: ' box={{ origin: "center" }}' });
    }
  }
  return edits;
}

/**
 * Captions' placement → `box`, the fields of their default box (the lower safe area, `origin: "bottom"`) that it
 * changes: `style.position` "top" was 8% of the height down to the block's top, "center" or a fraction the height of
 * its middle; a flat `y` from the centre took the place of the position; a flat `x` moved the block from the centre;
 * `width` is the box's width.
 */
function moveCaptions(
  text: string,
  id: string,
  tag: t.JSXOpeningElement,
  frame: Frame,
  style: t.JSXAttribute | undefined,
  position: t.ObjectProperty | undefined,
): SourceEdit[] | null {
  if (attributeOf(tag, "box")) return null;
  const node = (a: t.JSXAttribute | undefined): t.Node | null | undefined => {
    if (!a) return undefined;
    const v = a.value;
    return t.isJSXExpressionContainer(v) && !t.isJSXEmptyExpression(v.expression) ? v.expression : null;
  };
  const xa = attributeOf(tag, "x"),
    ya = attributeOf(tag, "y"),
    wa = attributeOf(tag, "width");
  const xn = node(xa),
    yn = node(ya),
    wn = node(wa);
  if (xn === null || yn === null || wn === null) return null;
  const fields: string[] = [];
  let origin: string | undefined;
  if (xn) fields.push(`x: ${shifted(text, xn, frame.width / 2)}`);
  if (yn) {
    fields.push(`y: ${shifted(text, yn, frame.height / 2)}`);
    origin = "center";
  } else if (position) {
    const v = position.value;
    const n = numberOf(v);
    if (n !== undefined) {
      fields.push(`y: ${round(n * frame.height)}`);
      origin = "center";
    } else if (t.isStringLiteral(v) && v.value === "top") {
      fields.push(`y: ${round(frame.height * 0.08)}`);
      origin = "top";
    } else if (t.isStringLiteral(v) && v.value === "center") {
      fields.push(`y: ${round(frame.height / 2)}`);
      origin = "center";
    } else if (!(t.isStringLiteral(v) && v.value === "bottom")) return null;
  }
  if (wn) fields.push(`width: ${src(text, wn)}`);
  if (origin) fields.push(`origin: "${origin}"`);
  const edits: SourceEdit[] = [];
  const box = fields.length > 0 ? `box={{ ${fields.join(", ")} }}` : "";
  const flat = [xa, ya, wa]
    .filter((a): a is t.JSXAttribute => a !== undefined)
    .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  if (flat[0] && box) {
    edits.push(edit(id, [flat[0].start ?? 0, flat[0].end ?? 0], box));
    for (const a of flat.slice(1)) edits.push(removeAttribute(text, id, a));
  } else {
    for (const a of flat) edits.push(removeAttribute(text, id, a));
    if (box) {
      const at = tag.name.end ?? 0;
      edits.push({ kind: "insert", id, range: [at, at], text: ` ${box}` });
    }
  }
  if (style && position) {
    const rest = (objectOf(style) as t.ObjectExpression).properties
      .filter((p) => p !== position)
      .map((p) => kept(text, p));
    edits.push(
      rest.length > 0
        ? edit(id, [style.start ?? 0, style.end ?? 0], `style={{ ${rest.join(", ")} }}`)
        : removeAttribute(text, id, style),
    );
  }
  return edits;
}

/** A component's `x` and `y` from the frame's centre → `box`, the same centre from the top left; points move with them. */
function moveComponent(
  text: string,
  id: string,
  tag: t.JSXOpeningElement,
  frame: Frame,
  defaults: { readonly x: number; readonly y: number },
  points: readonly string[],
): SourceEdit[] | null {
  const value = (a: t.JSXAttribute | undefined): t.Node | null | undefined => {
    if (!a) return undefined;
    const v = a.value;
    return t.isJSXExpressionContainer(v) && !t.isJSXEmptyExpression(v.expression) ? v.expression : null;
  };
  const xa = attributeOf(tag, "x");
  const ya = attributeOf(tag, "y");
  const xn = value(xa);
  const yn = value(ya);
  if (xn === null || yn === null) return null;
  // An axis left out keeps its old place: centred stays left out, an offset from the centre becomes its number.
  const sx = xn ? shifted(text, xn, frame.width / 2) : defaults.x ? String(round(frame.width / 2 + defaults.x)) : null;
  const sy = yn
    ? shifted(text, yn, frame.height / 2)
    : defaults.y
      ? String(round(frame.height / 2 + defaults.y))
      : null;
  const box = `box={{ ${[sx !== null ? `x: ${sx}` : "", sy !== null ? `y: ${sy}` : ""].filter(Boolean).join(", ")} }}`;
  const flat = [xa, ya]
    .filter((a): a is t.JSXAttribute => a !== undefined)
    .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  const edits: SourceEdit[] = [];
  if (flat[0]) {
    edits.push(edit(id, [flat[0].start ?? 0, flat[0].end ?? 0], box));
    for (const a of flat.slice(1)) edits.push(removeAttribute(text, id, a));
  } else {
    const at = tag.name.end ?? 0;
    edits.push({ kind: "insert", id, range: [at, at], text: ` ${box}` });
  }
  for (const name of points) {
    const a = attributeOf(tag, name);
    if (!a) continue;
    const point = xy(objectOf(a));
    if (!point?.x || !point.y) return null;
    edits.push(edit(id, [point.x.start ?? 0, point.x.end ?? 0], shifted(text, point.x, frame.width / 2)));
    edits.push(edit(id, [point.y.start ?? 0, point.y.end ?? 0], shifted(text, point.y, frame.height / 2)));
  }
  return edits;
}

function removeAttribute(text: string, id: string, a: t.JSXAttribute): SourceEdit {
  let start = a.start ?? 0;
  while (start > 0 && /\s/.test(text[start - 1] ?? "")) start--;
  return { kind: "remove", id, range: [start, a.end ?? 0], text: "" };
}
