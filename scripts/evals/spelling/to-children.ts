// The proposed spelling (keys and effects as props) rewritten into today's (`<Keyframe>` and `<Effect>` children), so
// a file in the proposed spelling can be checked by the real resolver and lint. Literal values only: a list built by
// code is left as it is, and then fails to resolve.
import { parse } from "../../../packages/sdk/node_modules/@babel/parser";
import type {
  ArrayExpression,
  Expression,
  JSXAttribute,
  JSXElement,
  Node,
  ObjectExpression,
  ObjectProperty,
} from "../../../packages/sdk/node_modules/@babel/types";

interface Key {
  readonly at: string;
  readonly value: string;
  readonly ease?: string;
}

const keyName = (p: ObjectProperty): string | null =>
  p.key.type === "Identifier" ? p.key.name : p.key.type === "StringLiteral" ? p.key.value : null;

/** The keys of `[{ at, value, ease? }, …]`, or null when the node is anything else. */
function keysOf(node: Node, text: (n: Node) => string): Key[] | null {
  if (node.type !== "ArrayExpression" || node.elements.length === 0) return null;
  const keys: Key[] = [];
  for (const el of (node as ArrayExpression).elements) {
    if (el?.type !== "ObjectExpression") return null;
    const fields = new Map<string, string>();
    for (const p of el.properties) {
      if (p.type !== "ObjectProperty") return null;
      const name = keyName(p);
      if (!name) return null;
      fields.set(name, text(p.value));
    }
    const at = fields.get("at");
    const value = fields.get("value");
    if (at === undefined || value === undefined) return null;
    const ease = fields.get("ease") ?? fields.get("easing");
    keys.push({ at, value, ...(ease ? { ease } : {}) });
  }
  return keys;
}

function walk(node: Node, visit: (n: Node) => void): void {
  visit(node);
  for (const value of Object.values(node as unknown as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const v of value) if (v && typeof v === "object" && "type" in v) walk(v as Node, visit);
    } else if (value && typeof value === "object" && "type" in value) walk(value as Node, visit);
  }
}

export function toChildren(source: string): string {
  const ast = parse(source, { sourceType: "module", plugins: ["jsx", "typescript"] });
  const text = (n: Node): string => source.slice(n.start as number, n.end as number);
  const edits: { start: number; end: number; with: string }[] = [];
  let used = { keyframe: false, effect: false };

  /** An object printed without its key lists; they are collected into `found` by their dotted path. */
  const strip = (obj: ObjectExpression, path: string, found: [string, Key[]][]): string | null => {
    const kept: string[] = [];
    for (const p of obj.properties) {
      if (p.type !== "ObjectProperty") {
        kept.push(text(p));
        continue;
      }
      const name = keyName(p);
      const keys = name ? keysOf(p.value, text) : null;
      if (name && keys) {
        found.push([`${path}.${name}`, keys]);
        continue;
      }
      if (name && p.value.type === "ObjectExpression") {
        const inner = strip(p.value, `${path}.${name}`, found);
        if (inner !== null) kept.push(`${text(p.key)}: ${inner}`);
        continue;
      }
      kept.push(text(p));
    }
    return kept.length > 0 ? `{ ${kept.join(", ")} }` : null;
  };

  const keyframe = (id: string, how: string, k: Key): string =>
    `<Keyframe id="${id}" ${how} at={${k.at}} value={${k.value}}${k.ease ? ` easing={${k.ease}}` : ""} />`;

  walk(ast.program, (node) => {
    if (node.type !== "JSXElement") return;
    const el = node as JSXElement;
    const open = el.openingElement;
    const attrs = open.attributes.filter((a): a is JSXAttribute => a.type === "JSXAttribute");
    const idAttr = attrs.find((a) => a.name.name === "id");
    const id = idAttr?.value?.type === "StringLiteral" ? idAttr.value.value : "el";
    const children: string[] = [];
    for (const attr of attrs) {
      const name = attr.name.name as string;
      const value = attr.value?.type === "JSXExpressionContainer" ? (attr.value.expression as Expression) : null;
      if (!value) continue;
      if ((name === "transform" || name === "box") && value.type === "ObjectExpression") {
        const found: [string, Key[]][] = [];
        const rest = strip(value, name, found);
        if (found.length === 0) continue;
        edits.push({ start: attr.start as number, end: attr.end as number, with: rest ? `${name}={${rest}}` : "" });
        for (const [path, keys] of found)
          keys.forEach((k, i) => {
            children.push(keyframe(`${id}-${path.replace(/\W/g, "-")}-${i}`, `property="${path}"`, k));
          });
      }
      if (name === "effects" && value.type === "ArrayExpression") {
        const effects: string[] = [];
        let literal = true;
        value.elements.forEach((e, n) => {
          if (e?.type !== "ObjectExpression") {
            literal = false;
            return;
          }
          const fxId = `${id}-fx${n}`;
          let type = "";
          const params: string[] = [];
          const keyed: string[] = [];
          for (const p of e.properties) {
            if (p.type !== "ObjectProperty") {
              literal = false;
              continue;
            }
            const pname = keyName(p);
            if (!pname) continue;
            if (pname === "type") {
              type = text(p.value);
              continue;
            }
            const keys = keysOf(p.value, text);
            if (keys)
              keys.forEach((k, i) => {
                keyed.push(keyframe(`${fxId}-${pname}-${i}`, `param="${pname}"`, k));
              });
            else params.push(`${text(p.key)}: ${text(p.value)}`);
          }
          const head = `<Effect id="${fxId}" type=${type.startsWith('"') ? type : `{${type}}`}${
            params.length ? ` params={{ ${params.join(", ")} }}` : ""
          }`;
          effects.push(keyed.length ? `${head}>${keyed.join("")}</Effect>` : `${head} />`);
        });
        if (!literal) continue;
        edits.push({ start: attr.start as number, end: attr.end as number, with: "" });
        children.push(...effects);
      }
    }
    if (children.length === 0) return;
    if (children.some((c) => c.includes("<Keyframe"))) used.keyframe = true;
    if (children.some((c) => c.startsWith("<Effect"))) used.effect = true;
    const tag = text(open.name);
    if (open.selfClosing) {
      // `/>` becomes `>children</Tag>`.
      const end = open.end as number;
      const slash = source.lastIndexOf("/>", end);
      edits.push({ start: slash, end, with: `>${children.join("")}</${tag}>` });
    } else edits.push({ start: open.end as number, end: open.end as number, with: children.join("") });
  });

  let out = source;
  for (const e of edits.sort((a, b) => b.start - a.start || b.end - a.end))
    out = out.slice(0, e.start) + e.with + out.slice(e.end);
  // The elements the children need, added to the kit import.
  out = out.replace(/import\s*\{([^}]*)\}\s*from\s*"@uberscene\/kit";/, (whole, names: string) => {
    const have = new Set(
      names
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    if (used.keyframe) have.add("Keyframe");
    if (used.effect) have.add("Effect");
    return have.size === names.split(",").filter((s) => s.trim()).length
      ? whole
      : `import { ${[...have].sort().join(", ")} } from "@uberscene/kit";`;
  });
  used = { keyframe: false, effect: false };
  return out;
}
