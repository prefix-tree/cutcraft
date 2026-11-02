import { isVocabulary } from "@cutcraft/kit";
import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";

/**
 * Walk the file's element tree the way the kit's `collect` does (fragments,
 * vocabulary elements, pure helpers expanded by calling them) and record the
 * children of every `<Layer id>`: the resolver drops them, the Player renders them.
 */
export function indexLayerInteriors(element: ReactNode): Map<string, ReactNode> {
  const out = new Map<string, ReactNode>();
  walk(element, out);
  return out;
}

function walk(node: ReactNode, out: Map<string, ReactNode>): void {
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<Record<string, unknown>>;
    const type = element.type;
    if (type === Fragment) { walk(element.props.children as ReactNode, out); return; }
    if (isVocabulary(type)) {
      if (type.kind === "layer") {
        if (typeof element.props.id === "string") out.set(element.props.id, element.props.children as ReactNode);
        return;
      }
      walk(element.props.children as ReactNode, out);
      return;
    }
    if (typeof type === "function") {
      try {
        walk((type as (props: Record<string, unknown>) => ReactNode)(element.props), out);
      } catch {
        // A helper that throws was already reported by collect().
      }
      return;
    }
    walk(element.props.children as ReactNode, out);
  });
}
