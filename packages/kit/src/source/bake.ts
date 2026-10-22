import { nodeSpecOf } from "../actions/types";
import type { ResolvedState } from "../resolve/resolve";
import type { CollectedNode } from "../resolve/tree";
import { lineRange, type SourceEdit } from "./edits";
import { buildSourceIndex, type SourceIndex } from "./index";
import { printElement } from "./print";

/**
 * Replace the helper call that produced a generated element with the literal
 * elements that call produced, so the editor can address them. Multicam cuts
 * are baked by appending their generated clips after the generator.
 */
export function bake(text: string, id: string, state: ResolvedState, index: SourceIndex = buildSourceIndex(text)): SourceEdit[] {
  const node = state.tree.byId.get(id);
  if (!node) {
    const generated = state.items.get(id);
    return generated?.editable === "generated" && generated.parent ? bakeGeneratedChildren(text, generated.parent, state, index) : [];
  }
  if (node.editable !== "generated") {
    const generated = node.children.filter((c) => c.editable === "generated");
    return generated.flatMap((c) => bake(text, c.id, state, index));
  }
  const origin = node.origin;
  if (!origin) return [];
  const call = index.calls.find((c) => c.helper === origin.helper && c.callIndex === origin.callIndex);
  if (!call) return [];
  const produced = topLevelFromCall(state, origin.helper, origin.callIndex);
  const printed = produced.map((n) => printElement(nodeSpecOf(n), call.indent)).join("\n");
  return [{ kind: "bake", id, range: lineRange(text, call.range), text: `${printed}\n` }];
}

/** The outermost nodes a helper call produced: those whose parent is not itself from the same call. */
function topLevelFromCall(state: ResolvedState, helper: string, callIndex: number): CollectedNode[] {
  const fromCall = (n: CollectedNode | undefined) => Boolean(n?.origin && n.origin.helper === helper && n.origin.callIndex === callIndex);
  return [...state.tree.byId.values()].filter((n) => fromCall(n) && !fromCall(n.parent ? state.tree.byId.get(n.parent) : undefined));
}

function bakeGeneratedChildren(text: string, parentId: string, state: ResolvedState, index: SourceIndex): SourceEdit[] {
  const site = index.elements.get(parentId);
  if (!site) return [];
  const generated = [...state.items.values()].filter((p) => p.editable === "generated" && p.parent === parentId && !state.tree.byId.has(p.id));
  const printed = generated
    .map((p) => printElement({ id: p.id, kind: p.kind, props: JSON.parse(JSON.stringify(p.props)) as Record<string, never> }, site.indent))
    .join("\n");
  const end = lineRange(text, site.range)[1];
  return [{ kind: "bake", id: parentId, range: [end, end], text: `${printed}\n` }];
}
