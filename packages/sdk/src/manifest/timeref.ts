import type { ResolveError } from "../resolve/errors";
import type { AssetEntry } from "./types";

export type TimeRef =
  | number
  | `word:${number}`
  | `word:${number}.end`
  | `shot:${number}`
  | `shot:${number}.end`
  | `silence:${number}`
  | `silence:${number}.end`
  | `marker:${string}`;

export type ParsedTimeRef =
  | { readonly kind: "seconds"; readonly value: number }
  | { readonly kind: "word" | "shot" | "silence"; readonly index: number; readonly edge: "start" | "end" }
  | { readonly kind: "marker"; readonly id: string }
  | { readonly kind: "invalid"; readonly reason: string };

const REF = /^(word|shot|silence):(\d+)(\.end)?$/;
const MARKER = /^marker:([A-Za-z_][A-Za-z0-9_-]*)$/;

export function isTimeRefString(value: unknown): value is string {
  return typeof value === "string" && (REF.test(value) || MARKER.test(value));
}

export function parseTimeRef(ref: unknown): ParsedTimeRef {
  if (typeof ref === "number") {
    return Number.isFinite(ref) && ref >= 0
      ? { kind: "seconds", value: ref }
      : { kind: "invalid", reason: "seconds must be a finite non-negative number" };
  }
  if (typeof ref !== "string") return { kind: "invalid", reason: "a time is a number or a reference string" };
  const m = REF.exec(ref);
  if (m) {
    return { kind: m[1] as "word" | "shot" | "silence", index: Number(m[2]), edge: m[3] ? "end" : "start" };
  }
  const mk = MARKER.exec(ref);
  if (mk) return { kind: "marker", id: mk[1] as string };
  return { kind: "invalid", reason: `unrecognised time reference "${ref}"` };
}

/**
 * Turn a reference into seconds. Word, shot and silence references are source
 * times on the asset; marker references are composition times.
 */
export function resolveTimeRef(
  ref: unknown,
  asset: AssetEntry | null,
  markers: ReadonlyMap<string, number>,
  ctx: { readonly id: string; readonly prop: string },
): number | ResolveError {
  const parsed = parseTimeRef(ref);
  const fail = (message: string): ResolveError => ({ code: "UNKNOWN_REF", id: ctx.id, prop: ctx.prop, message });
  switch (parsed.kind) {
    case "seconds":
      return parsed.value;
    case "invalid":
      return fail(parsed.reason);
    case "marker": {
      const t = markers.get(parsed.id);
      return t === undefined ? fail(`marker "${parsed.id}" does not exist`) : t;
    }
    case "word":
    case "shot":
    case "silence": {
      if (!asset) return fail(`"${String(ref)}" needs an asset with a manifest`);
      const list =
        parsed.kind === "word" ? asset.transcript?.words : parsed.kind === "shot" ? asset.shots : asset.silences;
      const entry = list?.find((e) => e.i === parsed.index);
      if (!entry) return fail(`${parsed.kind} ${parsed.index} is not in the manifest of ${asset.id}`);
      return parsed.edge === "end" ? entry.end : entry.start;
    }
  }
}
