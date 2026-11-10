// Moments: the places on a timeline a person or an agent asks to look at, written the way the file is written (an
// element's id, a word, a shot, a marker) or as plain time (seconds, a frame, a range).
import { parseTimeRef } from "../manifest/timeref";
import { type AssetEntry, lookupAsset } from "../manifest/types";
import { type AssetPlay, onTimeline } from "../resolve/captions";
import type { ResolvedState } from "../resolve/resolve";
import { playOf, playsOf } from "./plays";

export type ParsedMoment =
  | { readonly kind: "time"; readonly text: string; readonly seconds?: number; readonly frame?: number }
  | {
      readonly kind: "range";
      readonly text: string;
      readonly from: ParsedMoment & { kind: "time" };
      readonly to: ParsedMoment & { kind: "time" };
      readonly step?: ParsedMoment & { kind: "time" };
    }
  | { readonly kind: "element"; readonly text: string; readonly id: string; readonly point?: "start" | "mid" | "end" }
  | { readonly kind: "ref"; readonly text: string; readonly ref: string; readonly clip?: string }
  | { readonly kind: "invalid"; readonly text: string };

/** One moment of the finished video. */
export interface Moment {
  /** The form it was asked by; a range's steps and a transition's two sides each get their own. */
  readonly label: string;
  /** Seconds of the finished video. */
  readonly time: number;
  readonly frame: number;
  /** What the moment is, in words: "start of hook", "word 14 in hook". */
  readonly about: string;
}

/** The forms a moment is written in, for an error or a usage text. */
export const MOMENT_FORMS =
  "4.5 (seconds), 90f (a frame), 2..6/0.5 (a range with a step), hook, hook.start, hook.mid, hook.end (an element), " +
  "x1 (a transition: both sides), word:14, hook@word:14, shot:1, silence:2 (with .end), marker:intro";

/** The most moments one range may ask for. */
export const MAX_RANGE_MOMENTS = 500;

const ID = "[A-Za-z_][A-Za-z0-9_-]*";
const NUMBER = /^\d+(?:\.\d+)?$/;
const FRAME = /^(\d+)f$/;
const ELEMENT = new RegExp(`^(${ID})(?:\\.(start|mid|end))?$`);
const REF = /^(?:word|shot|silence):\d+(?:\.end)?$|^marker:[A-Za-z_][A-Za-z0-9_-]*$/;
const CLIP_REF = new RegExp(`^(${ID})@((?:word|shot|silence):\\d+(?:\\.end)?)$`);

function parseTime(text: string): (ParsedMoment & { kind: "time" }) | null {
  if (NUMBER.test(text)) return { kind: "time", text, seconds: Number(text) };
  const frame = FRAME.exec(text);
  return frame ? { kind: "time", text, frame: Number(frame[1]) } : null;
}

/** Parses one moment. */
export function parseMoment(input: string): ParsedMoment {
  const text = input.trim();
  const time = parseTime(text);
  if (time) return time;
  if (text.includes("..")) {
    const [span, stepText, ...rest] = text.split("/");
    const [fromText, toText, ...more] = (span as string).split("..");
    const from = parseTime(fromText ?? ""),
      to = parseTime(toText ?? "");
    const step = stepText === undefined ? undefined : parseTime(stepText);
    if (!from || !to || more.length > 0 || rest.length > 0 || step === null) return { kind: "invalid", text };
    return { kind: "range", text, from, to, ...(step ? { step } : {}) };
  }
  if (REF.test(text)) return { kind: "ref", text, ref: text };
  const clipRef = CLIP_REF.exec(text);
  if (clipRef) return { kind: "ref", text, clip: clipRef[1] as string, ref: clipRef[2] as string };
  const element = ELEMENT.exec(text);
  if (element)
    return {
      kind: "element",
      text,
      id: element[1] as string,
      ...(element[2] ? { point: element[2] as "start" | "mid" | "end" } : {}),
    };
  return { kind: "invalid", text };
}

/** Parses a comma-separated list of moments. */
export function parseMoments(list: string): ParsedMoment[] {
  return list
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map(parseMoment);
}

/** The entry a word, shot or silence reference names on an asset, with the asset second it means. */
function entryOf(asset: AssetEntry, ref: string): { second: number; what: string } | null {
  const parsed = parseTimeRef(ref);
  if (parsed.kind !== "word" && parsed.kind !== "shot" && parsed.kind !== "silence") return null;
  const list = parsed.kind === "word" ? asset.transcript?.words : parsed.kind === "shot" ? asset.shots : asset.silences;
  const entry = list?.find((e) => e.i === parsed.index);
  if (!entry) return null;
  const text = parsed.kind === "word" ? ` "${(entry as unknown as { text: string }).text}"` : "";
  return {
    second: parsed.edge === "end" ? entry.end : entry.start,
    what: `${parsed.edge === "end" ? "end of " : ""}${parsed.kind} ${parsed.index}${text}`,
  };
}

/**
 * Turns parsed moments into times of the finished video, in the order asked. What cannot be found is an error that
 * says why; the moments that can are still returned.
 */
export function resolveMoments(
  state: ResolvedState,
  parsed: readonly ParsedMoment[],
): { readonly moments: Moment[]; readonly errors: string[] } {
  const { fps, duration } = state.composition;
  const frames = Math.max(1, Math.round(duration * fps));
  const moments: Moment[] = [];
  const errors: string[] = [];
  const seconds = (t: ParsedMoment & { kind: "time" }): number => t.seconds ?? (t.frame as number) / fps;
  const add = (label: string, time: number, about: string): void => {
    if (time < -1e-9 || time > duration + 1e-9) {
      errors.push(`${label}: ${round(time)} s is outside the video, which is ${round(duration)} s long`);
      return;
    }
    const frame = Math.min(frames - 1, Math.max(0, Math.round(time * fps + 1e-6)));
    moments.push({ label, time: round(Math.min(Math.max(0, time), duration)), frame, about });
  };

  for (const m of parsed) {
    if (m.kind === "invalid") {
      errors.push(`"${m.text}" is not a moment; a moment is one of: ${MOMENT_FORMS}`);
    } else if (m.kind === "time") {
      add(m.text, seconds(m), m.frame === undefined ? `${m.text} s` : `frame ${m.frame}`);
    } else if (m.kind === "range") {
      const from = seconds(m.from),
        to = seconds(m.to);
      if (to < from) {
        errors.push(`${m.text}: a range runs forward, and ${m.to.text} is before ${m.from.text}`);
      } else if (!m.step) {
        add(m.from.text, from, `start of ${m.text}`);
        add(m.to.text, to, `end of ${m.text}`);
      } else {
        const step = seconds(m.step);
        const count = step > 0 ? Math.floor((to - from) / step + 1e-9) + 1 : 0;
        if (step <= 0) errors.push(`${m.text}: the step must be more than 0`);
        else if (count > MAX_RANGE_MOMENTS)
          errors.push(`${m.text}: that is ${count} moments; a range gives at most ${MAX_RANGE_MOMENTS}`);
        else for (let i = 0; i < count; i++) add(String(round(from + i * step)), from + i * step, `in ${m.text}`);
      }
    } else if (m.kind === "element") {
      const p = state.items.get(m.id);
      if (!p) {
        errors.push(`${m.text}: the file has no element with the id "${m.id}"`);
      } else if (!(p.end > p.start)) {
        errors.push(`${m.text}: ${p.kind} "${m.id}" has no time of its own on the timeline`);
      } else if (p.kind === "transition" && !m.point) {
        const [a, b] = p.between ?? ["the clip before", "the clip after"];
        add(`${m.id}.before`, Math.max(0, p.start - 1 / fps), `last frame of ${a} before ${m.id}`);
        add(`${m.id}.after`, Math.min(p.end, duration), `first frame of ${b} after ${m.id}`);
      } else {
        const point = m.point ?? "mid";
        // The end is the last frame the element is on, not the first frame after it.
        const time =
          point === "start" ? p.start : point === "end" ? Math.max(p.start, p.end - 1 / fps) : (p.start + p.end) / 2;
        const name = point === "mid" ? "middle" : point;
        add(m.text, time, `${name} of ${p.kind} ${m.id}`);
      }
    } else {
      resolveRef(state, m, add, errors);
    }
  }
  return { moments, errors };
}

function resolveRef(
  state: ResolvedState,
  m: ParsedMoment & { kind: "ref" },
  add: (label: string, time: number, about: string) => void,
  errors: string[],
): void {
  const parsed = parseTimeRef(m.ref);
  if (parsed.kind === "marker") {
    const marker = state.items.get(parsed.id);
    const at = marker?.kind === "marker" ? Number(marker.props.at ?? marker.start) : Number.NaN;
    if (Number.isFinite(at)) add(m.text, at, `marker ${parsed.id}`);
    else errors.push(`${m.text}: the file has no marker "${parsed.id}"`);
    return;
  }
  // The clips that could mean it: the named one, or every clip whose asset has that word, shot or silence.
  const candidates: { play: AssetPlay; asset: AssetEntry }[] = [];
  if (m.clip) {
    const play = playOf(state, m.clip);
    const source = state.items.get(m.clip)?.source;
    const asset = source ? lookupAsset(state.manifest, source.asset) : null;
    if (!play || !asset) {
      errors.push(`${m.text}: "${m.clip}" is not a clip or audio that plays an asset`);
      return;
    }
    candidates.push({ play, asset });
  } else {
    const seen = new Set<string>();
    for (const p of state.items.values()) {
      if (!p.source || (p.kind !== "clip" && p.kind !== "audio") || seen.has(p.source.asset)) continue;
      seen.add(p.source.asset);
      const asset = lookupAsset(state.manifest, p.source.asset);
      if (asset) for (const play of playsOf(state, p.source.asset)) candidates.push({ play, asset });
    }
  }
  const hits: { clip: string; time: number; what: string }[] = [];
  let known = false;
  for (const { play, asset } of candidates) {
    const entry = entryOf(asset, m.ref);
    if (!entry) continue;
    known = true;
    const time = onTimeline(entry.second, [play]);
    if (time !== null) hits.push({ clip: play.id, time, what: entry.what });
  }
  const [hit] = hits;
  if (hit && hits.length === 1) add(m.text, hit.time, `${hit.what} in ${hit.clip}`);
  else if (hits.length > 1)
    errors.push(
      `${m.text}: ${hits.length} clips play it; name one: ${hits.map((h) => `${h.clip}@${m.ref}`).join(", ")}`,
    );
  else if (known) errors.push(`${m.text}: no clip on the timeline plays it${m.clip ? ` in ${m.clip}` : ""}`);
  else errors.push(`${m.text}: no asset the timeline plays has it in the manifest`);
}

/** Times are reported to the millisecond. */
function round(x: number): number {
  return Math.round(x * 1000) / 1000 + 0;
}
