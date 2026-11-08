import traverseModule from "@babel/traverse";
import * as t from "@babel/types";

import { COMPONENT_NAMES } from "../components/index";
import { ELEMENTS, ENGINE_LAYERS } from "../jsx/elements";
import type { Json } from "../patches/types";
import { INTERIOR_PREFIX } from "../resolve/tree";
import { parseSource, type Range, rangeOf } from "./parse";

// @babel/traverse ships a CommonJS default that bundlers surface differently.
const traverse = ((traverseModule as unknown as { default?: typeof traverseModule }).default ??
  traverseModule) as typeof traverseModule;

const KIND_BY_NAME: ReadonlyMap<string, string> = new Map(
  [...Object.entries(ELEMENTS), ...Object.entries(ENGINE_LAYERS)].map(([name, c]) => [name, c.kind]),
);

export interface PropSite {
  readonly name: string;
  /** The whole attribute, including the name. */
  readonly range: Range;
  /** The value token: the string literal, or the expression inside `{}`. Null for a bare attribute. */
  readonly valueRange: Range | null;
  /** The value when it is a literal (or a bare attribute, which is `true`). */
  readonly literal: Json | undefined;
  readonly isExpression: boolean;
  /** The `schema` key this prop reads, when the expression is a plain reference to one of the file's props. */
  readonly binding?: string;
}

/** The one component inside a Layer: its props are the Layer's handles, its body is opaque. */
export interface InteriorSite {
  readonly component: string;
  readonly range: Range;
  readonly openingTag: Range;
  readonly props: ReadonlyMap<string, PropSite>;
  readonly lockedProps: readonly string[];
  readonly boundProps: Readonly<Record<string, string>>;
}

export interface ElementSite {
  readonly generated: false;
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly range: Range;
  readonly openingTag: Range;
  readonly closingTag: Range | null;
  /** Between the opening and closing tags; null when self-closing. */
  readonly childrenRange: Range | null;
  readonly props: ReadonlyMap<string, PropSite>;
  readonly parent: string | null;
  readonly siblingIndex: number;
  /** Expression props with no binding: the editor cannot write them without baking. */
  readonly lockedProps: readonly string[];
  /** Prop → schema key for props that reference the file's props; edits to them rewrite `defaults`. */
  readonly boundProps: Readonly<Record<string, string>>;
  readonly indent: string;
  /** Set on a Layer whose interior is exactly one component element; its props also appear on the Layer as `interior.<name>`. */
  readonly interior?: InteriorSite;
}

export interface HelperCallSite {
  readonly helper: string;
  /** The helper's nth use in the file, in source order; matches `CollectedNode.origin.callIndex`. */
  readonly callIndex: number;
  readonly range: Range;
  readonly parent: string | null;
  readonly siblingIndex: number;
  readonly indent: string;
}

export interface HelperSite {
  readonly name: string;
  readonly range: Range;
  readonly pure: boolean;
  readonly hooks: readonly string[];
  /** Whether its JSX names vocabulary elements: such a helper is expanded by the resolver, not mounted by React. */
  readonly producesElements: boolean;
}

export interface SourceIndex {
  readonly text: string;
  readonly ast: t.File;
  readonly elements: ReadonlyMap<string, ElementSite>;
  readonly calls: readonly HelperCallSite[];
  readonly helpers: ReadonlyMap<string, HelperSite>;
  /** The `export const defaults = {...}` object literal. */
  readonly defaults: { readonly range: Range; readonly props: ReadonlyMap<string, PropSite> } | null;
  readonly hasSchema: boolean;
  readonly hasDefaultExport: boolean;
  readonly compositionId: string | null;
  /** Vocabulary elements without a literal id, for the lint. */
  readonly anonymous: readonly { readonly kind: string; readonly range: Range; readonly reason: string }[];
  /** Every vocabulary element's literal `id` attribute, in source order, duplicates included. */
  readonly idSites: readonly { readonly id: string; readonly range: Range }[];
  /** HTML (`<div>`, `<span>`…) placed straight in a `<Track>` or `<Composition>`, where nothing draws it. */
  readonly strays: readonly { readonly name: string; readonly range: Range; readonly parent: string }[];
  /** Vocabulary elements whose id is an expression (`id={id}` in a helper, `` id={`dot-${i}`} `` in a loop): the JSX that makes them, with the id's source text. */
  readonly dynamic: readonly { readonly kind: string; readonly range: Range; readonly idText: string }[];
}

/**
 * Index every vocabulary JSX element with a literal id so patches can be
 * written back as text edits. Elements inside helper functions are indexed
 * too; whether they are literal or generated at runtime is decided by
 * `collect`, which sees how often the helper is used.
 */
export function buildSourceIndex(text: string): SourceIndex {
  const { ast } = parseSource(text);
  const elements = new Map<string, ElementSite>();
  const calls: HelperCallSite[] = [];
  const helpers = new Map<string, HelperSite>();
  const anonymous: { kind: string; range: Range; reason: string }[] = [];
  const dynamic: { kind: string; range: Range; idText: string }[] = [];
  const idSites: { id: string; range: Range }[] = [];
  const strays: { name: string; range: Range; parent: string }[] = [];
  let defaults: SourceIndex["defaults"] = null;
  let hasSchema = false;
  let hasDefaultExport = false;
  let compositionId: string | null = null;

  // How the default export names the file's props: `({ a, b: local })` or `(props)` with `props.a`.
  let schemaFn: t.Node | null = null;
  const paramKeys = new Map<string, string>();
  let propsName: string | null = null;
  for (const node of ast.program.body) {
    if (!t.isExportDefaultDeclaration(node)) continue;
    const decl = node.declaration;
    const fn =
      t.isFunctionDeclaration(decl) || t.isArrowFunctionExpression(decl) || t.isFunctionExpression(decl) ? decl : null;
    if (!fn) continue;
    schemaFn = fn;
    const param = fn.params[0];
    if (t.isIdentifier(param)) propsName = param.name;
    else if (t.isObjectPattern(param)) {
      for (const p of param.properties) {
        if (!t.isObjectProperty(p) || !t.isIdentifier(p.key)) continue;
        const local = t.isIdentifier(p.value)
          ? p.value
          : t.isAssignmentPattern(p.value) && t.isIdentifier(p.value.left)
            ? p.value.left
            : null;
        if (local) paramKeys.set(local.name, p.key.name);
      }
    }
  }
  const bindingOf = (expr: t.Node | null | undefined): string | null => {
    if (t.isIdentifier(expr)) return paramKeys.get(expr.name) ?? null;
    if (
      t.isMemberExpression(expr) &&
      !expr.computed &&
      t.isIdentifier(expr.object) &&
      expr.object.name === propsName &&
      t.isIdentifier(expr.property)
    )
      return expr.property.name;
    return null;
  };

  const helperNames = new Set<string>();
  for (const node of ast.program.body) {
    if (t.isFunctionDeclaration(node) && node.id) helperNames.add(node.id.name);
    if (t.isVariableDeclaration(node)) {
      for (const d of node.declarations) {
        if (t.isIdentifier(d.id) && (t.isArrowFunctionExpression(d.init) || t.isFunctionExpression(d.init)))
          helperNames.add(d.id.name);
      }
    }
  }

  traverse(ast, {
    ExportNamedDeclaration(path) {
      const decl = path.node.declaration;
      if (!t.isVariableDeclaration(decl)) return;
      for (const d of decl.declarations) {
        if (!t.isIdentifier(d.id)) continue;
        if (d.id.name === "schema") hasSchema = true;
        if (d.id.name === "defaults" && t.isObjectExpression(d.init)) {
          const props = new Map<string, PropSite>();
          for (const p of d.init.properties) {
            if (!t.isObjectProperty(p)) continue;
            const key = t.isIdentifier(p.key) ? p.key.name : t.isStringLiteral(p.key) ? p.key.value : null;
            if (key === null) continue;
            const lit = literalOf(p.value);
            props.set(key, {
              name: key,
              range: rangeOf(p),
              valueRange: rangeOf(p.value),
              literal: lit.value,
              isExpression: !lit.ok,
            });
          }
          defaults = { range: rangeOf(d.init), props };
        }
      }
    },
    ExportDefaultDeclaration() {
      hasDefaultExport = true;
    },
    FunctionDeclaration(path) {
      if (!path.node.id || path.parentPath.isExportDefaultDeclaration()) return;
      const hooks = hookCalls(path.node);
      helpers.set(path.node.id.name, {
        name: path.node.id.name,
        range: rangeOf(path.node),
        pure: hooks.length === 0,
        hooks,
        producesElements: namesElements(path.node),
      });
    },
    VariableDeclarator(path) {
      const init = path.node.init;
      if (!t.isIdentifier(path.node.id) || !(t.isArrowFunctionExpression(init) || t.isFunctionExpression(init))) return;
      if (!helperNames.has(path.node.id.name)) return;
      const hooks = hookCalls(init);
      helpers.set(path.node.id.name, {
        name: path.node.id.name,
        range: rangeOf(path.node),
        pure: hooks.length === 0,
        hooks,
        producesElements: namesElements(init),
      });
    },
    JSXElement(path) {
      const opening = path.node.openingElement;
      const name = jsxName(opening.name);
      if (name === null) return;
      if (/^[a-z]/.test(name)) {
        const host = nearestElement(path);
        if (host === "Track" || host === "Composition") strays.push({ name, range: rangeOf(path.node), parent: host });
        return;
      }
      const parent = enclosingElementId(path);
      const siblingIndex = siblingIndexOf(path);
      const indent = indentOf(text, path.node.start ?? 0);
      // A helper of the file's own, or one of the kit's ready-made components (a helper the file imports).
      if ((helperNames.has(name) || COMPONENT_NAMES.has(name)) && !KIND_BY_NAME.has(name)) {
        const callIndex = calls.filter((c) => c.helper === name).length;
        calls.push({ helper: name, callIndex, range: rangeOf(path.node), parent, siblingIndex, indent });
        return;
      }
      const kind = KIND_BY_NAME.get(name);
      if (!kind) return;
      const inSchemaFn = schemaFn !== null && path.getFunctionParent()?.node === schemaFn;
      const { props, locked, bound } = attributesOf(opening, inSchemaFn);
      const idSite = props.get("id");
      let id = typeof idSite?.literal === "string" ? idSite.literal : null;
      if (id === null && kind === "composition" && !idSite) id = "composition";
      if (id === null) {
        if (idSite?.isExpression && idSite.valueRange)
          dynamic.push({
            kind,
            range: rangeOf(path.node),
            idText: text.slice(idSite.valueRange[0], idSite.valueRange[1]),
          });
        // Inside a helper, `id={id}` is the generated-element pattern: ids come from the call site.
        const fn = path.getFunctionParent();
        const inHelper = Boolean(
          fn && !fn.isExportDefaultDeclaration() && !fn.parentPath?.isExportDefaultDeclaration(),
        );
        if (!(inHelper && idSite?.isExpression)) {
          anonymous.push({
            kind,
            range: rangeOf(path.node),
            reason: idSite ? "id must be a string literal" : "missing id",
          });
        }
        return;
      }
      if (kind === "composition") compositionId = id;
      if (idSite) idSites.push({ id, range: idSite.range });
      const closing = path.node.closingElement;
      const childrenRange: Range | null = closing ? [opening.end ?? 0, closing.start ?? 0] : null;
      const interior = name === "Layer" ? interiorOf(path.node, inSchemaFn) : null;
      if (interior) {
        for (const prop of interior.lockedProps) locked.push(`${INTERIOR_PREFIX}${prop}`);
        for (const [prop, key] of Object.entries(interior.boundProps)) bound[`${INTERIOR_PREFIX}${prop}`] = key;
      }
      elements.set(id, {
        generated: false,
        id,
        kind,
        name,
        range: rangeOf(path.node),
        openingTag: rangeOf(opening),
        closingTag: closing ? rangeOf(closing) : null,
        childrenRange,
        props,
        parent,
        siblingIndex,
        lockedProps: locked,
        boundProps: bound,
        indent,
        ...(interior ? { interior } : {}),
      });
    },
  });

  /** A tag's attributes as prop sites, with schema bindings resolved when the tag sits in the default export. */
  function attributesOf(
    opening: t.JSXOpeningElement,
    inSchemaFn: boolean,
  ): { props: Map<string, PropSite>; locked: string[]; bound: Record<string, string> } {
    const props = new Map<string, PropSite>();
    const locked: string[] = [];
    const bound: Record<string, string> = {};
    for (const attr of opening.attributes) {
      if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) continue;
      let site = propSite(attr);
      const binding =
        inSchemaFn && site.isExpression && t.isJSXExpressionContainer(attr.value)
          ? bindingOf(attr.value.expression)
          : null;
      if (binding !== null) {
        site = { ...site, binding };
        bound[site.name] = binding;
      }
      props.set(site.name, site);
      if (site.isExpression && binding === null) locked.push(site.name);
    }
    return { props, locked, bound };
  }

  /** The Layer's handles: exactly one element child whose tag names a file-level function. */
  function interiorOf(layer: t.JSXElement, inSchemaFn: boolean): InteriorSite | null {
    const elements = layer.children.filter((c) => !(t.isJSXText(c) && c.value.trim() === ""));
    const only = elements.length === 1 ? elements[0] : null;
    if (!only || !t.isJSXElement(only)) return null;
    const name = jsxName(only.openingElement.name);
    if (name === null || !helperNames.has(name) || KIND_BY_NAME.has(name)) return null;
    const { props, locked, bound } = attributesOf(only.openingElement, inSchemaFn);
    return {
      component: name,
      range: rangeOf(only),
      openingTag: rangeOf(only.openingElement),
      props,
      lockedProps: locked,
      boundProps: bound,
    };
  }

  return {
    text,
    ast,
    elements,
    calls,
    helpers,
    defaults,
    hasSchema,
    hasDefaultExport,
    compositionId,
    anonymous,
    dynamic,
    idSites,
    strays,
  };
}

function jsxName(name: t.JSXOpeningElement["name"]): string | null {
  if (t.isJSXIdentifier(name)) return name.name;
  if (t.isJSXMemberExpression(name) && t.isJSXIdentifier(name.property)) return name.property.name;
  return null;
}

function propSite(attr: t.JSXAttribute): PropSite {
  const name = (attr.name as t.JSXIdentifier).name;
  const value = attr.value;
  if (!value) return { name, range: rangeOf(attr), valueRange: null, literal: true, isExpression: false };
  if (t.isStringLiteral(value))
    return { name, range: rangeOf(attr), valueRange: rangeOf(value), literal: value.value, isExpression: false };
  if (t.isJSXExpressionContainer(value)) {
    const expr = value.expression;
    const lit = literalOf(expr);
    return { name, range: rangeOf(attr), valueRange: rangeOf(expr), literal: lit.value, isExpression: !lit.ok };
  }
  return { name, range: rangeOf(attr), valueRange: rangeOf(value), literal: undefined, isExpression: true };
}

/** Evaluate a literal expression (numbers, strings, booleans, null, arrays and objects of literals, template strings without holes). */
export function literalOf(node: t.Node | null | undefined): { ok: boolean; value: Json | undefined } {
  if (!node) return { ok: false, value: undefined };
  if (t.isStringLiteral(node)) return { ok: true, value: node.value };
  if (t.isNumericLiteral(node)) return { ok: true, value: node.value };
  if (t.isBooleanLiteral(node)) return { ok: true, value: node.value };
  if (t.isNullLiteral(node)) return { ok: true, value: null };
  if (t.isTemplateLiteral(node) && node.expressions.length === 0)
    return { ok: true, value: node.quasis.map((q) => q.value.cooked ?? "").join("") };
  if (t.isUnaryExpression(node) && node.operator === "-" && t.isNumericLiteral(node.argument))
    return { ok: true, value: -node.argument.value };
  if (t.isTSAsExpression(node) || t.isTSSatisfiesExpression(node) || t.isParenthesizedExpression(node))
    return literalOf(node.expression);
  if (t.isArrayExpression(node)) {
    const out: Json[] = [];
    for (const el of node.elements) {
      const r = literalOf(el as t.Node | null);
      if (!r.ok) return { ok: false, value: undefined };
      out.push(r.value as Json);
    }
    return { ok: true, value: out };
  }
  if (t.isObjectExpression(node)) {
    const out: Record<string, Json> = {};
    for (const p of node.properties) {
      if (!t.isObjectProperty(p) || p.computed) return { ok: false, value: undefined };
      const key = t.isIdentifier(p.key) ? p.key.name : t.isStringLiteral(p.key) ? p.key.value : null;
      if (key === null) return { ok: false, value: undefined };
      const r = literalOf(p.value);
      if (!r.ok) return { ok: false, value: undefined };
      out[key] = r.value as Json;
    }
    return { ok: true, value: out };
  }
  return { ok: false, value: undefined };
}

function isVocabularyTag(node: t.JSXElement): boolean {
  const name = jsxName(node.openingElement.name);
  return name !== null && KIND_BY_NAME.has(name);
}

/** Whether a function's JSX names any vocabulary element. */
function namesElements(fn: t.Function): boolean {
  let found = false;
  t.traverseFast(fn.body, (node) => {
    if (!found && t.isJSXElement(node) && isVocabularyTag(node)) found = true;
  });
  return found;
}

/** The tag name of the JSX element this one sits in, within the same function; null at the function's edge. */
function nearestElement(path: { parentPath: unknown }): string | null {
  let p = (path as { parentPath: { node: t.Node; parentPath: unknown } | null }).parentPath;
  while (p && !t.isFunction(p.node)) {
    if (t.isJSXElement(p.node)) return jsxName(p.node.openingElement.name);
    p = p.parentPath as typeof p;
  }
  return null;
}

function hookCalls(fn: t.Function): string[] {
  const hooks: string[] = [];
  t.traverseFast(fn.body, (node) => {
    if (t.isCallExpression(node) && t.isIdentifier(node.callee) && /^use[A-Z]/.test(node.callee.name))
      hooks.push(node.callee.name);
  });
  return hooks;
}

/** The id of the vocabulary element this JSX sits in, looking through HTML and other components as `collect` does. */
function enclosingElementId(path: { parentPath: unknown }): string | null {
  let p = (path as { parentPath: { node: t.Node; parentPath: unknown } | null }).parentPath;
  while (p) {
    if (t.isJSXElement(p.node) && !isVocabularyTag(p.node)) {
      p = p.parentPath as typeof p;
      continue;
    }
    if (t.isJSXElement(p.node)) {
      const attrs = p.node.openingElement.attributes;
      for (const attr of attrs) {
        if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === "id") {
          if (t.isStringLiteral(attr.value)) return attr.value.value;
          if (t.isJSXExpressionContainer(attr.value) && t.isStringLiteral(attr.value.expression))
            return attr.value.expression.value;
        }
      }
      const name = jsxName(p.node.openingElement.name);
      if (name === "Composition") return "composition";
      return null;
    }
    p = p.parentPath as typeof p;
  }
  return null;
}

function siblingIndexOf(path: { node: t.Node; parentPath: { node: t.Node } | null }): number {
  const parent = path.parentPath?.node;
  if (!parent || !(t.isJSXElement(parent) || t.isJSXFragment(parent))) return 0;
  let i = 0;
  for (const child of parent.children) {
    if (child === path.node) return i;
    if (t.isJSXElement(child)) i += 1;
  }
  return i;
}

export function indentOf(text: string, pos: number): string {
  const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
  const prefix = text.slice(lineStart, pos);
  return /^\s*$/.test(prefix) ? prefix : "";
}
