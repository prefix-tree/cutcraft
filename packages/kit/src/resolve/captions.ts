import { assetIdOf, type AssetEntry, type TranscriptWord } from "../manifest/types";
import { freezeUnshift, rampInverse, type FreezeHold, type RampKey } from "./speed";
import type { CollectedNode } from "./tree";

/** Where an asset plays on the timeline: enough of a placement to map asset seconds to composition seconds. */
export interface AssetPlay {
  readonly id: string;
  readonly start: number;
  readonly in: number;
  /** Infinity while the placement's length is still open (`duration="fill"`). */
  readonly out: number;
  readonly speed: number;
  /** `<SpeedKey>` children, which replace `speed`. */
  readonly keys?: readonly RampKey[];
  /** `<Freeze>` children, inserted holds that push later words back. */
  readonly holds?: readonly FreezeHold[];
}

/** A transcript word at the composition time it plays. */
export interface TimelineWord {
  readonly i: number;
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly play: string;
  readonly speaker?: string;
}

export interface CueOptions {
  readonly maxChars: number;
  readonly maxDuration: number;
  readonly maxGap: number;
}

export interface Cue {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly words: readonly { readonly text: string; readonly start: number; readonly end: number }[];
}

export const DEFAULT_CUE_OPTIONS: CueOptions = { maxChars: 42, maxDuration: 5, maxGap: 0.8 };

const SENTENCE_END = /[.!?…]["')\]]?$/;

/** Composition time of an asset second, through the first play that covers it; null when it is not on the timeline. */
export function onTimeline(sec: number, plays: readonly AssetPlay[]): number | null {
  const EPS = 1e-6;
  for (const p of plays) {
    if (sec >= p.in - EPS && sec <= p.out + EPS) return ms(playTime(p, sec));
  }
  return null;
}

/** The asset's words at the times they play, in timeline order; words outside every play are left out. */
export function timelineWords(asset: AssetEntry, plays: readonly AssetPlay[]): TimelineWord[] {
  const words = asset.transcript?.words ?? [];
  const out: TimelineWord[] = [];
  const sorted = [...plays].sort((a, b) => a.start - b.start);
  for (const play of sorted) {
    for (const w of words) {
      if (w.start < play.in - 1e-6 || w.end > play.out + 1e-6) continue;
      out.push(wordOn(w, play));
    }
  }
  return out;
}

/** Group timeline words into cues: a new cue at a sentence end, a play boundary, a long pause, or when a limit would be exceeded. */
export function planCues(words: readonly TimelineWord[], options: CueOptions = DEFAULT_CUE_OPTIONS): Cue[] {
  const cues: Cue[] = [];
  let current: TimelineWord[] = [];
  const flush = () => {
    if (current.length === 0) return;
    const first = current[0] as TimelineWord, last = current[current.length - 1] as TimelineWord;
    cues.push({ start: first.start, end: last.end, text: current.map((w) => w.text).join(" "), words: current.map((w) => ({ text: w.text, start: w.start, end: w.end })) });
    current = [];
  };
  for (const w of words) {
    const prev = current[current.length - 1];
    if (prev) {
      const chars = current.reduce((n, x) => n + x.text.length, current.length - 1) + 1 + w.text.length;
      const breaks = prev.play !== w.play || SENTENCE_END.test(prev.text) || w.start - prev.end > options.maxGap
        || chars > options.maxChars || w.end - (current[0] as TimelineWord).start > options.maxDuration;
      if (breaks) flush();
    }
    current.push(w);
  }
  flush();
  return cues;
}

/** Generated `<Caption>` nodes for the cues, as children of the captions node. */
export function cueNodes(captions: CollectedNode, cues: readonly Cue[], taken: (id: string) => boolean): CollectedNode[] {
  const used = new Set<string>();
  return cues.map((cue, n) => {
    let id = `${captions.id}-${n + 1}`;
    for (let k = 2; taken(id) || used.has(id); k++) id = `${captions.id}-${n + 1}-${k}`;
    used.add(id);
    return {
      id, kind: "caption", parent: captions.id, children: [], editable: "generated", lockedProps: [], boundProps: {},
      props: { id, start: cue.start, end: cue.end, text: cue.text, words: cue.words },
      origin: { helper: "captions", callerId: captions.id, callIndex: 0 },
    };
  });
}

/** A stable key for the plays of one asset, so an unchanged timeline reuses the generated nodes. */
export function playsKey(plays: readonly AssetPlay[]): string {
  let key = "";
  for (const p of plays) key += `${p.id}:${p.start}:${p.in}:${p.out}:${p.speed}:${JSON.stringify(p.keys ?? [])}:${JSON.stringify(p.holds ?? [])};`;
  return key;
}

export function sameAsset(a: string, b: string): boolean {
  return assetIdOf(a) === assetIdOf(b);
}

/** Composition times are written into the file, so they are kept to the millisecond. */
function ms(x: number): number {
  return Math.round(x * 1000) / 1000 + 0;
}

function wordOn(w: TranscriptWord, play: AssetPlay): TimelineWord {
  const start = ms(playTime(play, w.start));
  const end = ms(playTime(play, w.end));
  return { i: w.i, text: w.text, start, end, play: play.id, ...(w.speaker !== undefined ? { speaker: w.speaker } : {}) };
}

/** Composition time at which asset second `sec` plays in `play`: through the speed ramp, then past the holds before it. */
function playTime(play: AssetPlay, sec: number): number {
  const advance = Math.max(0, sec - play.in);
  const rel = play.keys ? rampInverse(play.keys, advance) : advance / play.speed;
  return play.start + (play.holds ? freezeUnshift(play.holds, rel) : rel);
}
