import type { ResolvedState } from "./resolve";

/**
 * Something whose place or length is given by another element: what an edit to that element has to carry along.
 *
 * - `anchor`: starts from it (`anchor="id"`, or its end with `anchor="id.end"`), at a word of its footage when `at`
 *   is set;
 * - `on`: a transition placed on one of its edges;
 * - `match` / `until`: lasts as long as it, or until it ends;
 * - `beside`: a transition between it and its neighbour on a sequence track.
 */
export type Dependent =
  | { readonly kind: "anchor"; readonly id: string; readonly edge?: "end"; readonly at?: string }
  | { readonly kind: "on"; readonly id: string; readonly edge: "in" | "out" }
  | { readonly kind: "match" | "until"; readonly id: string }
  | { readonly kind: "beside"; readonly id: string; readonly side: "before" | "after" };

/** The elements that depend on `id`, in timeline order of the file, each once per way it depends. */
export function dependentsOf(state: ResolvedState, id: string): Dependent[] {
  const out: Dependent[] = [];
  for (const node of state.tree.byId.values()) {
    if (node.id === id) continue;
    const props = node.props as Record<string, unknown>;
    if (props.anchor === id || props.anchor === `${id}.end`) {
      const edge = props.anchor === `${id}.end` ? ({ edge: "end" } as const) : {};
      out.push({ kind: "anchor", id: node.id, ...edge, ...(typeof props.at === "string" ? { at: props.at } : {}) });
    }
    if (node.kind === "transition" && props.on === id)
      out.push({ kind: "on", id: node.id, edge: props.edge === "in" ? "in" : "out" });
    const duration = props.duration;
    if (typeof duration === "object" && duration !== null) {
      const d = duration as { match?: unknown; until?: unknown };
      if (d.match === id) out.push({ kind: "match", id: node.id });
      if (d.until === id) out.push({ kind: "until", id: node.id });
    }
  }
  const track = state.tracks.find((t) => t.items.includes(id));
  if (track?.layout === "sequence") {
    const siblings = state.tree.byId.get(track.id)?.children ?? [];
    const at = siblings.findIndex((c) => c.id === id);
    const before = siblings[at - 1];
    const after = siblings[at + 1];
    if (before?.kind === "transition" && typeof before.props.on !== "string")
      out.push({ kind: "beside", id: before.id, side: "before" });
    if (after?.kind === "transition" && typeof after.props.on !== "string")
      out.push({ kind: "beside", id: after.id, side: "after" });
  }
  return out;
}
