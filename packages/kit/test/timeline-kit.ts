// Shared by the timeline edge-case suites: a file's tracks as a string in, the resolved timeline as short text out,
// and the properties every resolved timeline has, whatever was written.
import { expect } from "vitest";

import { type AssetManifest, collectModule, type Placement, type ResolvedState, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

const words = Array.from({ length: 40 }, (_, i) => ({ i, text: `w${i}`, start: i * 0.5, end: i * 0.5 + 0.4 }));

/** talk: 20 s of speech, a word every half second. broll: 12 s with two shots. music: 60 s. logo: a still. */
export const manifest = {
  assets: {
    talk: { id: "talk", kind: "video", duration: 20, fps: 30, width: 1920, height: 1080, transcript: { words } },
    broll: {
      id: "broll",
      kind: "video",
      duration: 12,
      fps: 30,
      width: 1920,
      height: 1080,
      shots: [
        { i: 0, start: 0, end: 4 },
        { i: 1, start: 4, end: 9 },
      ],
    },
    music: { id: "music", kind: "audio", duration: 60, audio: { sampleRate: 48000, channels: 2, streams: 1 } },
    logo: { id: "logo", kind: "image", duration: 0, width: 128, height: 128 },
  },
} as unknown as AssetManifest;

const IMPORTS =
  "Audio, Captions, Caption, Clip, Composition, Freeze, Gap, Marker, Shape, SpeedKey, Title, Track, Transition";

/** Resolves a composition whose children are `tracks`, written as in a file. */
export function resolved(tracks: string): ResolvedState {
  return resolve(
    collectModule(
      loadModule(`import { ${IMPORTS} } from "@cutcraft/kit";
export default function V() { return <Composition fps={30} width={1920} height={1080}>${tracks}</Composition>; }`) as never,
    ),
    manifest,
  );
}

const n = (x: number): string => String(Math.round(x * 1000) / 1000 + 0);

/**
 * The timeline as text, one line a thing: `id kind start..end`, then the source range and speed it plays, then the
 * clips a transition joins; after them one line an error. Structure (the composition, tracks, effects) is left out.
 */
export function timeline(state: ResolvedState): string {
  const lines = [`duration ${n(state.composition.duration)}`];
  for (const p of state.items.values()) {
    if (p.kind === "composition" || p.kind === "track") continue;
    lines.push(
      `${p.id} ${p.kind} ${n(p.start)}..${n(p.end)}` +
        (p.source ? ` plays ${p.source.asset} ${n(p.source.in)}..${n(p.source.out)} x${p.source.speed}` : "") +
        (p.between ? ` joins ${p.between.join(">")}` : ""),
    );
  }
  for (const e of state.errors) lines.push(`! ${e.code} ${e.id}${e.prop ? `.${e.prop}` : ""}`);
  return `\n${lines.join("\n")}\n`;
}

/** Resolves `tracks`, checks the properties every timeline has, and returns it as text. */
export function cut(tracks: string): string {
  const state = resolved(tracks);
  expectSane(state);
  return timeline(state);
}

const EPS = 1e-6;
const NOT_CONTENT = new Set(["composition", "track", "transition", "marker", "freeze", "speedKey", "keyframe"]);

/**
 * What holds for every resolved timeline, valid or not. A mistake in the file is reported in `errors`; it never puts
 * something at a time that is not a number, before zero, backwards, or for ever, because the player and the export
 * take these numbers as they are.
 */
export function expectSane(state: ResolvedState): void {
  const { duration } = state.composition;
  const bad: string[] = [];
  const check = (ok: boolean, what: string): void => {
    if (!ok) bad.push(what);
  };
  check(Number.isFinite(duration) && duration >= 0, `the video's length is ${duration}`);
  let last = 0;
  for (const p of state.items.values()) {
    const where = `${p.kind} ${p.id} ${p.start}..${p.end}`;
    check(Number.isFinite(p.start) && Number.isFinite(p.end), `${where}: not a time`);
    check(p.start >= 0, `${where}: starts before zero`);
    check(p.end >= p.start - EPS, `${where}: ends before it starts`);
    // Content is what has a length and is seen or heard. A marker is a note at a time, a transition that joins
    // nothing is left where the cut was, and an element with no length is nothing: none of them makes the video longer.
    // A key or a hold is a note inside its clip, at the time it was written for, reached or not.
    const content = p.end > p.start && !NOT_CONTENT.has(p.kind);
    check(p.end <= duration + EPS || !content, `${where}: ends after the video (${duration})`);
    if (content) last = Math.max(last, p.end);
    if (p.source) {
      const s = p.source;
      check(Number.isFinite(s.in) && Number.isFinite(s.out) && s.in >= 0, `${where}: plays ${s.in}..${s.out}`);
      check(s.out >= s.in - EPS, `${where}: plays its source backwards (${s.in}..${s.out})`);
      check(Number.isFinite(s.speed) && s.speed > 0, `${where}: speed ${s.speed}`);
    }
    if (p.between) {
      const [from, to] = p.between.map((id) => state.items.get(id)) as [Placement | undefined, Placement | undefined];
      check(from !== undefined && to !== undefined, `${where}: joins a clip that is not there`);
      // A transition lasts from where the incoming clip starts to where the outgoing one ends.
      if (from && to) check(Math.abs(p.start - to.start) < EPS, `${where}: does not start with ${to.id}`);
    }
  }
  // Something has to be on screen or heard at the video's last moment, unless nothing is in it at all.
  check(Math.abs(last - duration) < EPS, `the video is ${duration} long but its last element ends at ${last}`);
  for (const track of state.tracks) {
    if (track.layout !== "sequence") continue;
    // On a sequence track, what is not anchored plays in the order written and never overlaps but in a transition.
    const timed = [...new Set(track.items)]
      .map((id) => state.items.get(id))
      .filter(
        (p): p is Placement =>
          p !== undefined &&
          (p.kind === "clip" || p.kind === "gap" || p.kind === "audio") &&
          p.props.anchor === undefined,
      );
    for (let i = 0; i + 1 < timed.length; i++) {
      const a = timed[i] as Placement,
        b = timed[i + 1] as Placement;
      const joined = [...state.items.values()].find(
        (t) => t.kind === "transition" && t.between?.[0] === a.id && t.between[1] === b.id,
      );
      const overlap = joined ? Math.min(joined.end - joined.start, a.end) : 0;
      check(b.start >= a.start - EPS, `track ${track.id}: ${b.id} starts before ${a.id}`);
      check(
        Math.abs(b.start - Math.max(0, a.end - overlap)) < EPS,
        `track ${track.id}: ${b.id} starts at ${b.start}, not where ${a.id} ends (${a.end}) less ${overlap}`,
      );
    }
  }
  expect(bad.join("\n")).toBe("");
}

// Short ways to write the elements the cases repeat.
/** A clip of the b-roll from `a` to `b` seconds. */
export const C = (id: string, a: number, b: number, more = ""): string =>
  `<Clip id="${id}" src="asset:broll" in={${a}} out={${b}} ${more}/>`;
/** A clip of the talk between two references, such as `word:4` and `word:9.end`. */
export const W = (id: string, a: string, b: string, more = ""): string =>
  `<Clip id="${id}" src="asset:talk" in="${a}" out="${b}" ${more}/>`;
export const X = (id: string, d: number, more = ""): string =>
  `<Transition id="${id}" type="crossfade" duration={${d}} ${more}/>`;
export const G = (id: string, d: number): string => `<Gap id="${id}" duration={${d}} />`;
/** The main track. */
export const T = (inner: string, more = ""): string => `<Track id="main" ${more}>${inner}</Track>`;
/** A track of overlays above it. */
export const O = (inner: string, more = ""): string => `<Track id="text" ${more}>${inner}</Track>`;
/** A free track for music. */
export const M = (inner: string): string => `<Track id="music" layout="free">${inner}</Track>`;
export const Ti = (id: string, more: string): string => `<Title id="${id}" ${more}>Hi</Title>`;
export const A = (id: string, more: string): string => `<Audio id="${id}" src="asset:music" ${more}/>`;
