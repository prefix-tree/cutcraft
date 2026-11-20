// A file writes everything about an element as its props: a value that changes over time is a list of keys in place
// of the value, effects are a list, a speed ramp is keys on `speed`, holds are `freezes`. The resolver, the player and
// the export read those as items of their own (kinds `keyframe`, `effect`, `speedKey`, `freeze`) under the element.
// `expandKeys` makes those items from the props, after the patch log is overlaid and before the props are parsed, so
// an edit that writes a key list is read the same way as a file that does.

import { capabilitiesOf } from "@uberscene/kit/schema";

import type { CollectedNode, CollectedTree } from "./tree";

/** A list of keys: objects, each with `at` and `value`. Anything else (a number, a list of numbers) is a constant. */
export function isKeyList(value: unknown): value is readonly Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((k) => typeof k === "object" && k !== null && !Array.isArray(k) && "at" in k && "value" in k)
  );
}

/** Where a derived item's id says it came from: the element, and the path of the prop that wrote it. */
export function derivedOrigin(id: string): { readonly id: string; readonly path: string } | null {
  const dot = id.indexOf(".");
  return dot < 0 ? null : { id: id.slice(0, dot), path: id.slice(dot + 1) };
}

/** The transform fields keys may animate, each with the name of the property its keys animate. */
const TRANSFORM_FIELDS = ["rotation", "opacity", "borderRadius"] as const;
const CROP_FIELDS = ["x", "y", "width", "height"] as const;
/** A crop's fields when none is written: the whole picture. */
const CROP_WHOLE = { x: 0, y: 0, width: 1, height: 1 } as const;

const expanded = new WeakMap<CollectedNode, CollectedNode>();

/** The tree with each element's keys, effects, speed keys and holds as items under it. The same tree when none. */
export function expandKeys(tree: CollectedTree): CollectedTree {
  let changed = false;
  const byId = new Map(tree.byId);
  const visit = (node: CollectedNode): CollectedNode => {
    const cached = expanded.get(node);
    if (cached) {
      if (cached !== node) {
        changed = true;
        index(cached, byId);
      }
      return cached;
    }
    const kids = node.children.map(visit);
    const own = expandNode(node);
    const out =
      own === null && kids.every((k, i) => k === node.children[i])
        ? node
        : {
            ...node,
            props: own?.props ?? node.props,
            children: [...kids, ...(own?.derived ?? [])],
          };
    if (out !== node) {
      changed = true;
      byId.set(out.id, out);
      for (const d of own?.derived ?? []) index(d, byId);
    }
    expanded.set(node, out);
    return out;
  };
  const root = visit(tree.root);
  return changed ? { ...tree, root, byId } : tree;
}

function index(node: CollectedNode, byId: Map<string, CollectedNode>): void {
  byId.set(node.id, node);
  for (const c of node.children) index(c, byId);
}

interface Expansion {
  readonly props: Readonly<Record<string, unknown>>;
  readonly derived: readonly CollectedNode[];
}

/** One element's props without their keys, effects, speed keys and holds, and the items they make. Null when none. */
function expandNode(node: CollectedNode): Expansion | null {
  if (capabilitiesOf(node.kind).placementScope !== "track") return null;
  const props: Record<string, unknown> = { ...node.props };
  const derived: CollectedNode[] = [];
  const item = (path: string, kind: string, itemProps: Record<string, unknown>, children: CollectedNode[] = []) => {
    const id = `${node.id}.${path}`;
    const made: CollectedNode = {
      id,
      kind,
      props: itemProps,
      children: children.map((c) => ({ ...c, parent: id })),
      parent: node.id,
      editable: node.editable,
      lockedProps: [],
      boundProps: {},
    };
    return made;
  };
  const keyItems = (
    path: string,
    keys: readonly Record<string, unknown>[],
    how: { property?: string; param?: string },
  ) =>
    keys.map((k, i) =>
      item(`${path}.${i}`, "keyframe", {
        ...how,
        at: k.at,
        value: k.value,
        ...(k.easing !== undefined ? { easing: k.easing } : {}),
      }),
    );
  /** The keys at `value`, if it is a list; their first value stands in as the constant where one is required. */
  const take = (value: unknown, path: string, property: string): unknown => {
    if (!isKeyList(value)) return value;
    derived.push(...keyItems(path, value, { property }));
    return value[0]?.value;
  };

  const transform = props.transform;
  if (transform && typeof transform === "object" && !Array.isArray(transform)) {
    const t: Record<string, unknown> = { ...(transform as Record<string, unknown>) };
    let touched = false;
    for (const f of TRANSFORM_FIELDS) {
      if (isKeyList(t[f])) {
        take(t[f], `transform.${f}`, `transform.${f}`);
        delete t[f];
        touched = true;
      }
    }
    if (isKeyList(t.scale)) {
      derived.push(...keyItems("transform.scale.x", t.scale, { property: "transform.scale.x" }));
      derived.push(...keyItems("transform.scale.y", t.scale, { property: "transform.scale.y" }));
      delete t.scale;
      touched = true;
    }
    for (const pair of ["scale", "anchor"] as const) {
      const v = t[pair];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const xy = v as Record<string, unknown>;
        if (isKeyList(xy.x) || isKeyList(xy.y)) {
          const missing = pair === "scale" ? 1 : 0.5;
          t[pair] = {
            x: take(xy.x, `transform.${pair}.x`, `transform.${pair}.x`) ?? missing,
            y: take(xy.y, `transform.${pair}.y`, `transform.${pair}.y`) ?? missing,
          };
          touched = true;
        }
      }
    }
    const crop = t.crop;
    if (crop && typeof crop === "object" && !Array.isArray(crop)) {
      const c = crop as Record<string, unknown>;
      if (CROP_FIELDS.every((f) => c[f] === undefined || isKeyList(c[f]))) {
        // Keys alone: no crop is written, so one the clip's `frame` makes still applies to the axes not keyed.
        for (const f of CROP_FIELDS) take(c[f], `transform.crop.${f}`, `transform.crop.${f}`);
        delete t.crop;
        touched = true;
      } else if (CROP_FIELDS.some((f) => isKeyList(c[f]))) {
        t.crop = Object.fromEntries(
          CROP_FIELDS.map((f) => [f, take(c[f], `transform.crop.${f}`, `transform.crop.${f}`) ?? CROP_WHOLE[f]]),
        );
        touched = true;
      }
    }
    if (touched) {
      if (Object.keys(t).length > 0) props.transform = t;
      else delete props.transform;
    }
  }

  const box = props.box;
  if (box && typeof box === "object" && !Array.isArray(box)) {
    const b: Record<string, unknown> = { ...(box as Record<string, unknown>) };
    let touched = false;
    for (const axis of ["x", "y"] as const) {
      if (isKeyList(b[axis])) {
        take(b[axis], `box.${axis}`, `box.${axis}`);
        delete b[axis];
        touched = true;
      }
    }
    if (touched) {
      if (Object.keys(b).length > 0) props.box = b;
      else delete props.box;
    }
  }

  if (isKeyList(props.volume)) {
    take(props.volume, "volume", "audio.volume");
    delete props.volume;
  }
  if (props.pan !== undefined) {
    // A constant pan is one key: the mixer reads pan only from keys.
    const keys = isKeyList(props.pan) ? props.pan : [{ at: 0, value: props.pan }];
    derived.push(...keyItems("pan", keys, { property: "audio.pan" }));
    delete props.pan;
  }

  if (isKeyList(props.speed)) {
    props.speed.forEach((k, i) => {
      derived.push(
        item(`speed.${i}`, "speedKey", {
          at: k.at,
          speed: k.value,
          ...(k.easing !== undefined ? { easing: k.easing } : {}),
        }),
      );
    });
    delete props.speed;
  }

  if (Array.isArray(props.freezes)) {
    (props.freezes as unknown[]).forEach((f, i) => {
      const hold = (f ?? {}) as Record<string, unknown>;
      derived.push(item(`freezes.${i}`, "freeze", { at: hold.source, start: hold.at, duration: hold.duration }));
    });
    delete props.freezes;
  }

  if (Array.isArray(props.effects)) {
    (props.effects as unknown[]).forEach((e, i) => {
      const { type, enabled, ...rest } = (e ?? {}) as Record<string, unknown>;
      const params: Record<string, unknown> = {};
      const keyed: CollectedNode[] = [];
      for (const [name, value] of Object.entries(rest)) {
        if (isKeyList(value)) keyed.push(...keyItems(`effects.${i}.${name}`, value, { param: name }));
        else params[name] = value;
      }
      const fx = item(`effects.${i}`, "effect", { type, params, ...(enabled !== undefined ? { enabled } : {}) }, keyed);
      derived.push(fx);
    });
    delete props.effects;
  }

  return derived.length === 0 ? null : { props, derived };
}
