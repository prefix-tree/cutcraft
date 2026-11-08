import type { ReactElement, ReactNode } from "react";
import { Children, Fragment, isValidElement } from "react";

import { isVocabulary } from "../jsx/define";
import { engineOf } from "../jsx/elements";
import { isShaderRef, type ShaderDefinition } from "../jsx/shaders";
import { type DeclaredFont, fontFaces } from "../theme/fonts";
import type { ResolveError } from "./errors";
import type { CollectedNode, CollectedTree, Editable, LayerInterior } from "./tree";

export interface SourceIndexLike {
  readonly elements: ReadonlyMap<
    string,
    {
      readonly generated: boolean;
      readonly lockedProps?: readonly string[];
      readonly boundProps?: Readonly<Record<string, string>>;
    }
  >;
}

export interface CollectOptions {
  /** When supplied, elements absent from the index are marked generated and expression props locked. */
  readonly index?: SourceIndexLike;
  /**
   * Values the file offers besides its elements (its exports): the effects, transitions and fonts among them are the
   * tree's too, so the editor can offer one no element uses yet.
   */
  readonly declared?: readonly unknown[];
}

const NO_BINDINGS: Readonly<Record<string, string>> = Object.freeze({});

interface Walker {
  readonly byId: Map<string, CollectedNode>;
  readonly errors: ResolveError[];
  readonly index: SourceIndexLike | undefined;
  /** Helper name → number of times expanded; a helper used twice makes its output generated. */
  readonly helperUses: Map<string, number>;
  /** The effects and transitions met, by kind and name. */
  readonly shaders: Map<string, ShaderDefinition>;
  /** The font faces met, by family, weight and style. */
  readonly fonts: Map<string, DeclaredFont>;
}

const faceKey = (f: DeclaredFont) => `${f.family}|${f.weight}|${f.style}`;

/**
 * Records a declared value (an effect, a transition or a font) on the walker and gives what stands for it in props:
 * its name, or its family. Anything else comes back as it is. Two different definitions under one name are an error.
 */
function declaredValue(walker: Walker, value: unknown, at: string): unknown {
  if (isShaderRef(value)) {
    const key = `${value.definition.kind}:${value.name}`;
    const known = walker.shaders.get(key);
    if (known && known !== value.definition)
      walker.errors.push({
        code: "SCHEMA",
        id: at,
        message: `two different ${value.definition.kind}s are named "${value.name}"; give one another name`,
      });
    else walker.shaders.set(key, value.definition);
    return value.name;
  }
  const faces = fontFaces(value);
  if (faces) {
    for (const face of faces) {
      const known = walker.fonts.get(faceKey(face));
      if (known && JSON.stringify(known.source) !== JSON.stringify(face.source))
        walker.errors.push({
          code: "SCHEMA",
          id: at,
          message: `font "${face.family}" ${face.weight} ${face.style} is declared twice, from different files`,
        });
      else walker.fonts.set(faceKey(face), face);
    }
    return String(value);
  }
  return value;
}

const isPlain = (v: unknown): v is Record<string, unknown> => {
  if (typeof v !== "object" || v === null || "$$typeof" in v) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/** A prop value with each declared value in it (however deep in lists and plain objects) replaced by its name. */
function withNames(walker: Walker, value: unknown, at: string, depth = 0): unknown {
  const named = declaredValue(walker, value, at);
  if (named !== value || depth > 16) return named;
  if (Array.isArray(value)) {
    const out = value.map((v) => withNames(walker, v, at, depth + 1));
    return out.some((v, i) => v !== value[i]) ? out : value;
  }
  if (isPlain(value)) {
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = withNames(walker, v, at, depth + 1);
      if (out[k] !== v) changed = true;
    }
    return changed ? out : value;
  }
  return value;
}

/** Records the declared values in free code's JSX (a Layer's interior: a font in a style), without changing it. */
function scanDeclared(walker: Walker, node: unknown, at: string, depth = 0): void {
  if (depth > 32 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) scanDeclared(walker, n, at, depth + 1);
    return;
  }
  if (isValidElement(node)) {
    scanDeclared(walker, node.props, at, depth + 1);
    return;
  }
  if (declaredValue(walker, node, at) !== node) return;
  if (isPlain(node)) for (const v of Object.values(node)) scanDeclared(walker, v, at, depth + 1);
}

/**
 * Walk the element tree the file's default export returned and index every
 * vocabulary element by id. Pure helper components are expanded by calling
 * them; a `<Layer>` interior is not entered.
 */
export function collect(element: ReactElement, options: CollectOptions = {}): CollectedTree {
  const walker: Walker = {
    byId: new Map(),
    errors: [],
    index: options.index,
    helperUses: new Map(),
    shaders: new Map(),
    fonts: new Map(),
  };
  for (const value of options.declared ?? []) declaredValue(walker, value, "composition");
  const roots = collectChildren(element, null, walker, null);
  const root = roots.find((n) => n.kind === "composition") ?? roots[0];
  if (!root) {
    const empty: CollectedNode = {
      id: "composition",
      kind: "composition",
      props: {},
      children: [],
      parent: null,
      editable: "literal",
      lockedProps: [],
      boundProps: {},
    };
    walker.errors.push({ code: "SCHEMA", id: "composition", message: "the file must render a <Composition>" });
    return { root: empty, byId: walker.byId, errors: walker.errors, ...declaredOf(walker) };
  }
  // A helper used more than once produces generated elements: the editor cannot address one copy without baking.
  const multi = new Set([...walker.helperUses].filter(([, n]) => n > 1).map(([name]) => name));
  if (multi.size > 0) {
    for (const node of walker.byId.values()) {
      if (node.origin && multi.has(node.origin.helper) && node.editable === "literal") {
        (node as { editable: Editable }).editable = "generated";
      }
    }
  }
  return { root, byId: walker.byId, errors: walker.errors, ...declaredOf(walker) };
}

const declaredOf = (walker: Walker) => ({ shaders: [...walker.shaders.values()], fonts: [...walker.fonts.values()] });

export interface VideoModule {
  // biome-ignore lint/suspicious/noExplicitAny: a cut file's component takes its own props type; `unknown` would reject every one.
  readonly default: (props: any) => ReactElement | null;
  readonly defaults?: Readonly<Record<string, unknown>> | undefined;
}

export function collectModule(
  mod: VideoModule,
  overrides: Readonly<Record<string, unknown>> = {},
  options: CollectOptions = {},
): CollectedTree {
  const element = mod.default({ ...((mod.defaults ?? {}) as Record<string, unknown>), ...overrides });
  return collect(element ?? (Fragment({ children: null }) as unknown as ReactElement), {
    ...options,
    declared: [...(options.declared ?? []), ...Object.values(mod)],
  });
}

function collectChildren(
  node: ReactNode,
  parent: string | null,
  walker: Walker,
  origin: CollectedNode["origin"] | null,
): CollectedNode[] {
  const out: CollectedNode[] = [];
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<Record<string, unknown>>;
    const type = element.type;
    if (type === Fragment) {
      out.push(...collectChildren(element.props.children as ReactNode, parent, walker, origin));
      return;
    }
    if (isVocabulary(type)) {
      if (type.kind === "layer") {
        const engine = engineOf(type);
        // An engine Layer's own props are its handles; its children are the engine's, not a component's.
        const node = makeNode(
          engine ? withEngine(element, engine) : element,
          type.kind,
          parent,
          walker,
          origin,
          [],
          true,
        );
        // <Effect> and <Keyframe> written inside a Layer are its children on the timeline; the rest is its free code.
        const all = Children.toArray(element.props.children as ReactNode);
        const own = all.filter(isLayerChild);
        const children = own.length > 0 ? collectChildren(own, node.id, walker, origin) : [];
        const free = all.filter((c) => !isLayerChild(c));
        scanDeclared(walker, free, node.id);
        const interior = engine ? null : interiorOf(free);
        const full: CollectedNode = { ...node, children, ...(interior ? { interior } : {}) };
        if (full !== node) walker.byId.set(node.id, full);
        out.push(full);
        return;
      }
      const placeholder = makeNode(element, type.kind, parent, walker, origin, [], false);
      const children = collectChildren(element.props.children as ReactNode, placeholder.id, walker, origin);
      const node: CollectedNode = { ...placeholder, children };
      walker.byId.set(node.id, node);
      out.push(node);
      return;
    }
    if (typeof type === "function") {
      const helper = type as (props: Record<string, unknown>) => ReactNode;
      const name = helper.name || "anonymous";
      const uses = (walker.helperUses.get(name) ?? 0) + 1;
      walker.helperUses.set(name, uses);
      let produced: ReactNode;
      try {
        produced = helper(element.props);
      } catch (error) {
        walker.errors.push({
          code: "SCHEMA",
          id: parent ?? "composition",
          message: `helper ${name} threw while expanding: ${String(error)}`,
        });
        return;
      }
      const childOrigin = origin ?? { helper: name, callerId: parent, callIndex: uses - 1 };
      out.push(...collectChildren(produced, parent, walker, childOrigin));
      return;
    }
    if (type === undefined || type === null) {
      // An import that is not there: a misspelt name, or an element the kit no longer has.
      const id = typeof element.props.id === "string" ? element.props.id : (parent ?? "composition");
      const grade = "temperature" in element.props || "tint" in element.props;
      // `<Graphic kind="…">` is the only element that took a `kind`.
      const graphic = typeof element.props.kind === "string";
      walker.errors.push({
        code: "SCHEMA",
        id,
        message: grade
          ? '<ColorGrade> is now a whiteBalance effect: <Effect type="whiteBalance" params={{ temperature, tint }} />'
          : graphic
            ? `<Graphic kind="${String(element.props.kind)}"> was removed: use LowerThird, Callout, Badge, Counter, ProgressBar, Arrow, Highlight or Background from @cutcraft/kit, or free code (<Layer>, <Motion>, <Svg>)`
            : "an element whose component is undefined: check its import from @cutcraft/kit",
      });
      return;
    }
    // Host elements (div, span…) outside a Layer are ignored by the resolver but their vocabulary descendants are not.
    out.push(...collectChildren(element.props.children as ReactNode, parent, walker, origin));
  });
  return out;
}

function makeNode(
  element: ReactElement<Record<string, unknown>>,
  kind: string,
  parent: string | null,
  walker: Walker,
  origin: CollectedNode["origin"] | null,
  children: CollectedNode[],
  opaqueInterior: boolean,
): CollectedNode {
  const { children: rawChildren, ...given } = element.props;
  const at = typeof given.id === "string" ? given.id : (parent ?? "composition");
  // A declared value in a prop (`type={glitch}`, `font={brand}`) is recorded and stands as its name from here on.
  const props = withNames(walker, given, at) as Record<string, unknown>;
  const idValue = props.id ?? (kind === "composition" ? "composition" : undefined);
  const id = typeof idValue === "string" && idValue.length > 0 ? idValue : `${kind}-${walker.byId.size + 1}`;
  if (typeof idValue !== "string" || idValue.length === 0) {
    walker.errors.push({ code: "SCHEMA", id, prop: "id", message: `<${kind}> needs a literal id` });
  }
  if (walker.byId.has(id)) {
    walker.errors.push({ code: "DUPLICATE_ID", id, message: `id "${id}" is used more than once` });
  }
  const text = textOf(rawChildren as ReactNode);
  const indexed = walker.index?.elements.get(id);
  let editable: Editable = "literal";
  if (walker.index && (!indexed || indexed.generated)) editable = "generated";
  const lockedProps = indexed?.lockedProps ?? [];
  const boundProps = indexed?.boundProps ?? NO_BINDINGS;
  const node: CollectedNode = {
    id,
    kind,
    props,
    children,
    parent,
    editable,
    lockedProps,
    boundProps,
    ...(text !== undefined ? { text } : {}),
    ...(origin ? { origin } : {}),
  };
  if (opaqueInterior) {
    // A Layer's own props are editable; what is inside is not.
    const opaque: CollectedNode = { ...node, editable: editable === "generated" ? "generated" : "literal" };
    walker.byId.set(id, opaque);
    return opaque;
  }
  walker.byId.set(id, node);
  return node;
}

function textOf(children: ReactNode): string | undefined {
  const parts: string[] = [];
  let onlyText = true;
  Children.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") parts.push(String(child));
    // A timeline child (<Effect>, <Keyframe>, <Mask>) is collected on its own; it is not part of the text.
    else if (isValidElement(child) && isVocabulary(child.type)) return;
    else if (child !== null && child !== undefined && typeof child !== "boolean") onlyText = false;
  });
  if (!onlyText || parts.length === 0) return undefined;
  return parts.join("");
}

/** The element with its engine named in its props, where the resolver, the Player and the export read it. */
function withEngine(
  element: ReactElement<Record<string, unknown>>,
  engine: string,
): ReactElement<Record<string, unknown>> {
  return { ...element, props: { ...element.props, engine } };
}

/** The timeline children a Layer may hold in its JSX, beside its free code. */
const LAYER_CHILD_KINDS: ReadonlySet<string> = new Set(["effect", "keyframe"]);

function isLayerChild(child: ReactNode): boolean {
  return isValidElement(child) && isVocabulary(child.type) && LAYER_CHILD_KINDS.has(child.type.kind);
}

/** A Layer's handles: exactly one child element whose type is a function component (not a vocabulary element). */
function interiorOf(children: ReactNode): LayerInterior | null {
  const only = Children.toArray(children).filter(
    (c) => c !== null && c !== undefined && typeof c !== "boolean" && c !== "",
  );
  const child = only.length === 1 ? only[0] : null;
  if (!isValidElement(child) || typeof child.type !== "function" || isVocabulary(child.type)) return null;
  const { children: _children, ...props } = child.props as Record<string, unknown>;
  return { component: (child.type as { name?: string }).name || "anonymous", props };
}
