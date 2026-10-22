import { define, isError, placeNode, placementOf, rawNode, rawProp, requireElement, requireUnlocked, setProps, siblingAfter, stub, validateTarget } from "../handler-kit";
import { invalid, nodeSpecOf, ok, type ActionInput, type ActionType, type PlacementSpec } from "../types";
import type { Json } from "../../patches/types";

const KIND_OF_NS: Record<string, string> = { text: "title", shape: "shape", svg: "svg", sticker: "sticker", adjustment: "adjustment", nested: "nested" };

function overlayHandlers(ns: keyof typeof KIND_OF_NS) {
  const kind = KIND_OF_NS[ns] as string;
  const t = (n: string) => `${ns}/${n}` as ActionType;
  define({
    type: t("create") as "text/create",
    validate: (a, state) => {
      if (state.tree.byId.has(a.params.id)) return invalid({ code: "DUPLICATE_ID", message: `"${a.params.id}" exists` });
      const track = state.tracks.find((tr) => tr.id === a.params.trackId);
      if (!track) return invalid({ code: "ELEMENT_NOT_FOUND", message: `track "${a.params.trackId}" does not exist`, path: "trackId" });
      if (track.locked) return invalid({ code: "TRACK_LOCKED", message: "track is locked" });
      const place: PlacementSpec = a.params.place;
      if ("start" in place && track.layout !== "free") return invalid({ code: "UNSUPPORTED_ON_LAYOUT", message: "start needs a free track" });
      if ("after" in place && track.layout !== "sequence") return invalid({ code: "UNSUPPORTED_ON_LAYOUT", message: "after needs a sequence track" });
      if ("anchor" in place && place.anchor !== "start" && !state.items.has(place.anchor)) return invalid({ code: "ELEMENT_NOT_FOUND", message: `anchor "${place.anchor}" does not exist` });
      return ok;
    },
    apply: (a, log, ctx) => placeNode(log, ctx.before, a.params.trackId, a.params.place, {
      id: a.params.id, kind, props: { ...a.params.props, id: a.params.id },
      ...(a.params.text !== undefined ? { text: a.params.text } : {}),
      children: a.params.children ?? [],
    }, a.params.after),
    invert: (a) => ({ type: t("remove") as "text/remove", params: { id: a.params.id } }),
    fold: () => [],
  });
  define({
    type: t("update") as "text/update",
    validate: (a, state) => {
      const base = validateTarget(state, a.params.id, Object.keys(a.params.props));
      if (!base.valid) return base;
      return state.items.get(a.params.id)!.kind === kind ? ok : invalid({ code: "INVALID_PARAMS", message: `"${a.params.id}" is not a <${kind}>` });
    },
    apply: (a, log) => setProps(log, a.params.id, a.params.props),
    invert: (a, before) => {
      const prior: Record<string, Json | undefined> = {};
      for (const prop of Object.keys(a.params.props)) prior[prop] = rawProp(before, a.params.id, prop);
      return { type: "source/setProps", params: { id: a.params.id, props: prior } };
    },
    fold: () => [],
  });
  define({
    type: t("remove") as "text/remove",
    validate: (a, state) => {
      const item = requireElement(state, a.params.id);
      if (isError(item)) return invalid(item);
      const locked = requireUnlocked(state, item);
      if (locked) return invalid(locked);
      return item.kind === kind ? ok : invalid({ code: "INVALID_PARAMS", message: `"${a.params.id}" is not a <${kind}>` });
    },
    apply: (a, log) => log.append({ op: "remove", id: a.params.id }),
    invert: (a, before) => {
      const node = rawNode(before, a.params.id)!;
      const spec = nodeSpecOf(node);
      const { id: _id, start: _s, anchor: _an, offset: _o, ...rest } = spec.props;
      return { type: t("create") as "text/create", params: { id: a.params.id, kind, trackId: node.parent as string, place: placementOf(before, a.params.id), props: rest, ...(spec.text !== undefined ? { text: spec.text } : {}), children: spec.children ?? [], after: siblingAfter(before, a.params.id) } };
    },
    fold: () => [],
  });
}

for (const ns of Object.keys(KIND_OF_NS)) overlayHandlers(ns as keyof typeof KIND_OF_NS);

define({
  type: "text/setContent",
  validate: (a, state) => {
    const base = validateTarget(state, a.params.id, []);
    if (!base.valid) return base;
    return state.items.get(a.params.id)!.kind === "title" ? ok : invalid({ code: "INVALID_PARAMS", message: "only titles have text content" });
  },
  apply: (a, log) => log.append({ op: "text", id: a.params.id, text: a.params.text }),
  invert: (a, before) => ({ type: "text/setContent", params: { id: a.params.id, text: rawNode(before, a.params.id)?.text ?? "" } }),
  fold: () => [],
});

/** Inline a nested scene's tracks as literal elements. Needs the source tools; stubbed in the skeleton. */
stub("nested/extract",
  (a, state) => validateTarget(state, a.params.id, []),
  (a): ActionInput => ({ type: "source/setProps", params: { id: a.params.id, props: {} } }),
);
