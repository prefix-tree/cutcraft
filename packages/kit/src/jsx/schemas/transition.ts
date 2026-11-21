import { z } from "zod";

import { TRANSITION_PARAMS } from "../../effects/registry";
import { renamedParam } from "../effect-params";
import { RESPELLED_VALUES, TRANSITION_TYPES, type TransitionType, zTransitionType } from "../enums";
import { idSchema } from "./common";

/** Per-type parameter schemas, with defaults that validate: the registry's. */
export { TRANSITION_PARAMS };

export const transitionSchema = z
  .strictObject({
    /** The transition's name. */
    id: idSchema,
    /** A built-in transition, or one the file declares with `transition()`. */
    type: z.union([zTransitionType, z.string().min(1)]).default("crossfade"),
    /** Seconds it takes; it overlaps the two clips by this much. */
    duration: z.number().min(0.001).max(30).default(0.5),
    /** The type's own settings; each type's page lists them. */
    params: z.record(z.string(), z.unknown()).default({}),
    /** Edge form: a transition at one edge of a single clip. Omit for a transition between two siblings. */
    on: idSchema.optional(),
    /** With `on`: `in` at the clip's start, `out` at its end. */
    edge: z.enum(["in", "out"]).optional(),
  })
  .refine((v) => (v.on === undefined) === (v.edge === undefined), { message: "on and edge go together" })
  .superRefine((v, ctx) => {
    // A transition the file declares is checked against its own params schema when the file resolves.
    if (!isBuiltInTransition(v.type)) return;
    const result = TRANSITION_PARAMS[v.type].safeParse(v.params);
    if (!result.success) {
      const params = v.params as Record<string, unknown>;
      const renamed = result.error.issues.flatMap((issue) =>
        issue.code === "unrecognized_keys"
          ? issue.keys.flatMap((k) => {
              const now = renamedParam(v.type, k, "transition");
              return now === undefined ? [] : [`params.${k} is now params.${now}`];
            })
          : [],
      );
      const respelled = result.error.issues.flatMap((issue) => {
        const value = issue.path.length === 1 ? params[String(issue.path[0])] : undefined;
        const now =
          typeof value === "string" && Object.hasOwn(RESPELLED_VALUES, value) ? RESPELLED_VALUES[value] : undefined;
        return now === undefined ? [] : [`params.${String(issue.path[0])} "${value}" is now "${now}"`];
      });
      ctx.addIssue({
        code: "custom",
        path: ["params"],
        message:
          renamed.length + respelled.length > 0
            ? `${[...renamed, ...respelled].join(", ")}; uberscene lint --fix moves the file`
            : `invalid params for ${v.type}: ${result.error.message}`,
      });
    }
  });

export function isBuiltInTransition(type: string): type is TransitionType {
  return (TRANSITION_TYPES as readonly string[]).includes(type);
}

export function defaultTransitionParams(type: TransitionType): Record<string, unknown> {
  return TRANSITION_PARAMS[type].parse({}) as Record<string, unknown>;
}
