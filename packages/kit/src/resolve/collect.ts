import type { ReactElement, ReactNode } from "react";
import { Children, Fragment, isValidElement } from "react";
import { isVocabulary } from "../jsx/define";
import type { ResolveError } from "./errors";
import type { CollectedNode, CollectedTree, Editable } from "./tree";

export interface SourceIndexLike {
  readonly elements: ReadonlyMap<string, { readonly generated: boolean; readonly lockedProps?: readonly string[]; readonly boundProps?: Readonly<Record<string, string>> }>;
}

export interface CollectOptions {
  /** When supplied, elements absent from the index are marked generated and expression props locked. */
  readonly index?: SourceIndexLike;
}

const NO_BINDINGS: Readonly<Record<string, string>> = Object.freeze({});

interface Walker {
  readonly byId: Map<string, CollectedNode>;
  readonly errors: ResolveError[];
  readonly index: SourceIndexLike | undefined;
  /** Helper name → number of times expanded; a helper used twice makes its output generated. */
  readonly helperUses: Map<string, number>;
}

/**
 * Walk the element tree the file's default export returned and index every
 * vocabulary element by id. Pure helper components are expanded by calling
 * them; a `<Layer>` interior is not entered.
 */
export function collect(element: ReactElement, options: CollectOptions = {}): CollectedTree {
  const walker: Walker = { byId: new Map(), errors: [], index: options.index, helperUses: new Map() };
  const roots = collectChildren(element, null, walker, null);
  const root = roots.find((n) => n.kind === "composition") ?? roots[0];
  if (!root) {
    const empty: CollectedNode = { id: "composition", kind: "composition", props: {}, children: [], parent: null, editable: "literal", lockedProps: [], boundProps: {} };
    walker.errors.push({ code: "SCHEMA", id: "composition", message: "the file must render a <Composition>" });
    return { root: empty, byId: walker.byId, errors: walker.errors };
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
  return { root, byId: walker.byId, errors: walker.errors };
}

export interface VideoModule {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly default: (props: any) => ReactElement | null;
  readonly defaults?: Readonly<Record<string, unknown>> | undefined;
}

export function collectModule(mod: VideoModule, overrides: Readonly<Record<string, unknown>> = {}, options: CollectOptions = {}): CollectedTree {
  const element = mod.default({ ...((mod.defaults ?? {}) as Record<string, unknown>), ...overrides });
  if (!element) {
    return collect(Fragment({ children: null }) as unknown as ReactElement, options);
  }
  return collect(element, options);
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
        out.push(makeNode(element, type.kind, parent, walker, origin, [], true));
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
        walker.errors.push({ code: "SCHEMA", id: parent ?? "composition", message: `helper ${name} threw while expanding: ${String(error)}` });
        return;
      }
      const childOrigin = origin ?? { helper: name, callerId: parent, callIndex: uses - 1 };
      out.push(...collectChildren(produced, parent, walker, childOrigin));
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
  const { children: rawChildren, ...props } = element.props;
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
    id, kind, props, children, parent, editable, lockedProps, boundProps,
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
    else if (child !== null && child !== undefined && typeof child !== "boolean") onlyText = false;
  });
  if (!onlyText || parts.length === 0) return undefined;
  return parts.join("");
}
