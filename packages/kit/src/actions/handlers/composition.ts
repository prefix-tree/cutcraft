import { getHandler, inverseOf } from "../registry";
import { define, isError, makePropHandler, rawNode, rawProp, requireElement, setProps, validateTarget } from "../handler-kit";
import { invalid, ok, type Action, type ActionInput } from "../types";
import type { Json } from "../../patches/types";
import { FONT_KEYS } from "../../theme/builtins";
import { themeSchema } from "../../theme/schema";

define(makePropHandler({
  type: "composition/updateSettings",
  target: (_p) => "composition",
  write: (p) => ({ ...(p.fps !== undefined ? { fps: p.fps } : {}), ...(p.width !== undefined ? { width: p.width } : {}),
    ...(p.height !== undefined ? { height: p.height } : {}), ...(p.sampleRate !== undefined ? { sampleRate: p.sampleRate } : {}),
    ...(p.channels !== undefined ? { channels: p.channels } : {}) }),
  validate: (a) => {
    const p = a.params;
    const bad = [p.fps, p.width, p.height, p.sampleRate, p.channels].some((v) => v !== undefined && !(Number.isFinite(v) && (v as number) > 0));
    return bad ? invalid({ code: "INVALID_PARAMS", message: "settings must be positive numbers" }) : ok;
  },
}));

define(makePropHandler({
  type: "composition/setBackground",
  target: () => "composition",
  write: (p, state) => {
    const prior = (rawProp(state, "composition", "background") ?? {}) as Record<string, unknown>;
    const next = { ...prior, ...(p.mode !== undefined ? { mode: p.mode } : {}), ...(p.color !== undefined ? { color: p.color } : {}) };
    return { background: Object.keys(next).length ? (next as never) : undefined };
  },
}));

define(makePropHandler({
  type: "composition/setTheme",
  target: () => "composition",
  write: (p, state) => ({ theme: p.theme === null ? undefined : p.merge ? mergeTheme(currentTheme(state), p.theme) : p.theme as Json }),
  validate: (a, state) => {
    if (a.params.theme === null) return ok;
    const next = a.params.merge ? mergeTheme(currentTheme(state), a.params.theme) : a.params.theme;
    const result = themeSchema.safeParse(next);
    return result.success ? ok : invalid({ code: "INVALID_PARAMS", path: "theme", message: result.error.issues.map((i) => `${i.path.join(".") || "theme"}: ${i.message}`).join("; ") });
  },
}));

define(makePropHandler({
  type: "theme/setToken",
  target: () => "composition",
  write: (p, state) => {
    const theme = currentTheme(state);
    const name = p.token.replace(/^\$/, "");
    if (name === "radius") return { theme: { ...theme, radius: p.value } };
    const group = (FONT_KEYS as readonly string[]).includes(name) || Object.hasOwn(state.theme.fonts, name) ? "fonts" : "palette";
    const prior = (theme[group] ?? {}) as Record<string, Json>;
    return { theme: { ...theme, [group]: { ...prior, [name]: p.value } } };
  },
  validate: (a) => {
    const name = a.params.token.replace(/^\$/, "");
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) return invalid({ code: "INVALID_PARAMS", path: "token", message: `"${a.params.token}" is not a token name` });
    if (name === "radius" ? typeof a.params.value !== "number" : typeof a.params.value !== "string") {
      return invalid({ code: "INVALID_PARAMS", path: "value", message: name === "radius" ? "radius takes a number" : `${name} takes a string` });
    }
    return ok;
  },
}));

/** The file's own theme literal, after patches; empty when it has none. */
function currentTheme(state: Parameters<typeof rawProp>[0]): Record<string, Json> {
  const raw = rawProp(state, "composition", "theme");
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, Json> : {};
}

/** `over` laid on `base`: palette, fonts and styles merge one level down, the rest replaces. */
function mergeTheme(base: Record<string, Json>, over: Readonly<Record<string, Json>>): Record<string, Json> {
  const out: Record<string, Json> = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const prior = base[key];
    const nested = (key === "palette" || key === "fonts" || key === "styles") && isObject(prior) && isObject(value);
    out[key] = nested ? { ...prior, ...value } : value;
  }
  return out;
}

function isObject(v: Json | undefined): v is Record<string, Json> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** The tweaks panel. Stored as a prop patch on the composition; fold rewrites the `defaults` literal. */
define({
  type: "composition/setProps",
  validate: (a) => (a.params.defaults && typeof a.params.defaults === "object" ? ok : invalid({ code: "INVALID_PARAMS", message: "defaults must be an object" })),
  apply: (a, log) => log.append({ op: "set", id: "composition", prop: "$defaults", value: a.params.defaults }),
  invert: (_a, before) => {
    const prior = rawProp(before, "composition", "$defaults");
    return prior === undefined
      ? { type: "source/setProps", params: { id: "composition", props: { $defaults: undefined } } }
      : { type: "composition/setProps", params: { defaults: prior as Record<string, never> } };
  },
  fold: () => [],
});

define({
  type: "source/setProps",
  validate: (a, state) => validateTarget(state, a.params.id, Object.keys(a.params.props)),
  apply: (a, log) => setProps(log, a.params.id, a.params.props),
  invert: (a, before) => {
    const prior: Record<string, never> = {};
    for (const prop of Object.keys(a.params.props)) (prior as Record<string, unknown>)[prop] = rawProp(before, a.params.id, prop);
    return { type: "source/setProps", params: { id: a.params.id, props: prior } };
  },
  fold: () => [],
});

define({
  type: "source/setProp",
  validate: (a, state) => validateTarget(state, a.params.id, [a.params.prop]),
  apply: (a, log) => log.append({ op: "set", id: a.params.id, prop: a.params.prop, value: a.params.value }),
  invert: (a, before) => ({ type: "source/setProp", params: { id: a.params.id, prop: a.params.prop, value: rawProp(before, a.params.id, a.params.prop) } }),
  fold: () => [],
});

/** Marks a generated subtree for baking into literals at the next fold. */
define({
  type: "source/bake",
  validate: (a, state) => {
    const item = requireElement(state, a.params.id);
    if (isError(item)) return invalid(item);
    return item.editable === "generated" ? ok : invalid({ code: "INVALID_PARAMS", message: `"${a.params.id}" is already literal` });
  },
  apply: (a, log) => log.append({ op: "bake", id: a.params.id }),
  // Baking changes the source, not the timeline; its undo is a file-version revert, so the inverse is a no-op write.
  invert: (a) => ({ type: "source/setProps", params: { id: a.params.id, props: {} } }),
  fold: () => [],
});

/** Meta action: several actions as one history entry. Inverse is the reversed inverses. */
define({
  type: "batch/apply",
  validate: (a, state) => replay(a.params.actions, state).error ?? ok,
  apply: (a, log, ctx) => {
    a.params.actions.forEach((sub, i) => {
      const handler = getHandler(sub.type);
      if (!handler) throw new Error(`no handler for ${sub.type}`);
      const state = ctx.current();
      const action = { ...sub, actionId: `batch-${i}`, ts: 0 } as Action;
      const result = handler.validate(action, state);
      if (!result.valid) throw new Error(`${sub.type}: ${result.errors.map((e) => e.message).join("; ")}`);
      handler.apply(action, log, { ...ctx, before: state });
    });
  },
  invert: (a, before) => replay(a.params.actions, before).inverses.reverse(),
  fold: () => [],
});

import { createPatchLog } from "../../patches/log";
import { resolve, type ResolvedState } from "../../resolve/resolve";
import type { ValidationResult } from "../types";

/**
 * Run the actions on a scratch log over the resolved tree, validating each
 * against the state the previous one produced, and collect their inverses.
 * The resolved tree already carries the real log's net effect, so the scratch
 * log starts empty on top of it.
 */
function replay(actions: readonly ActionInput[], before: ResolvedState): { inverses: ActionInput[]; error?: ValidationResult } {
  const inverses: ActionInput[] = [];
  const log = createPatchLog({ isSource: (id) => before.tree.byId.has(id) });
  const tree = before.tree;
  const current = () => resolve(tree, before.manifest, log);
  let state = before;
  for (const [i, sub] of actions.entries()) {
    const handler = getHandler(sub.type);
    if (!handler) return { inverses, error: invalid({ code: "UNKNOWN_ACTION", message: `no handler for ${sub.type}` }) };
    const action = { ...sub, actionId: `batch-${i}`, ts: 0 } as Action;
    const result = handler.validate(action, state);
    if (!result.valid) return { inverses, error: { valid: false, errors: result.errors.map((e) => ({ ...e, path: `actions[${i}]${e.path ? "." + e.path : ""}` })) } };
    inverses.push(inverseOf(action, state));
    handler.apply(action, log, { before: state, manifest: before.manifest, current });
    state = current();
  }
  return { inverses };
}

export { rawNode };
