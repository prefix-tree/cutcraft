import type { Json } from "../../patches/types";
import type { CollectedNode } from "../../resolve/tree";

export type ActionErrorCode =
  | "ELEMENT_NOT_FOUND"
  | "TRACK_LOCKED"
  | "LOCKED_PROP"
  | "OPAQUE_TARGET"
  | "INVALID_PARAMS"
  | "INVALID_TIME_RANGE"
  | "OUT_OF_BOUNDS"
  | "NOT_ADJACENT"
  | "INSUFFICIENT_HANDLES"
  | "CYCLE"
  | "DUPLICATE_ID"
  | "UNSUPPORTED_ON_LAYOUT"
  | "UNKNOWN_ACTION"
  | "NOT_IMPLEMENTED";

export interface ActionError {
  readonly code: ActionErrorCode;
  readonly message: string;
  readonly path?: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ActionError[];
}

export const ok: ValidationResult = { valid: true, errors: [] };

export function invalid(...errors: ActionError[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

/** Where a new element goes. Sequence tracks take `after`; free tracks take `start`; overlays may anchor. */
export type PlacementSpec =
  | { readonly after: string | null }
  | { readonly start: number }
  | { readonly anchor: string; readonly offset?: number };

/** A serialisable element to insert: raw JSX props, optional text, optional children. */
export interface NodeSpec {
  readonly id: string;
  readonly kind: string;
  readonly props: Readonly<Record<string, Json | undefined>>;
  readonly text?: string;
  readonly children?: readonly NodeSpec[];
}

export function nodeSpecOf(node: CollectedNode): NodeSpec {
  // Function-valued props (`of={Outro}`) survive as references; they print by name at fold time.
  const props: Record<string, Json | undefined> = {};
  for (const [k, v] of Object.entries(node.props)) {
    props[k] =
      typeof v === "function"
        ? (v as unknown as Json)
        : v === undefined
          ? undefined
          : (JSON.parse(JSON.stringify(v)) as Json);
  }
  return {
    id: node.id,
    kind: node.kind,
    props,
    ...(node.text !== undefined ? { text: node.text } : {}),
    children: node.children.map(nodeSpecOf),
  };
}

export function nodeOfSpec(spec: NodeSpec, parent: string | null): CollectedNode {
  return {
    id: spec.id,
    kind: spec.kind,
    props: { ...spec.props },
    boundProps: {},
    parent,
    editable: "literal",
    lockedProps: [],
    ...(spec.text !== undefined ? { text: spec.text } : {}),
    children: (spec.children ?? []).map((c) => nodeOfSpec(c, spec.id)),
  };
}
