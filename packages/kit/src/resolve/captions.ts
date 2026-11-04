import { type AssetEntry, assetIdOf, type TranscriptWord } from "../manifest/types";
import { type FreezeHold, freezeUnshift, type RampKey, rampInverse } from "./speed";
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
  /** Transcript word indices (`i`) a cue always ends after, from the captions' `breakAfter`. */
  readonly breakAfter?: ReadonlySet<number>;
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
      if (!audible(w, play)) continue;
      out.push(wordOn(w, play));
    }
  }
  return out;
}

/**
 * Group timeline words into cues: a new cue at a sentence end, a play boundary, a long pause or the duration limit.
 * A cue that would pass `maxChars` breaks at its best point: after punctuation, never after a word that leads into
 * the next ("of", "a", "to"), else as full as it fits. A cue too short to read joins the one before it in the same
 * sentence (on one line, else re-split into two lines that each stay up longer, else as one two-line cue), or the
 * next one when it opens the sentence, or stays up into the pause after it; a cue that starts a sentence starts
 * with a capital.
 */
export function planCues(words: readonly TimelineWord[], options: CueOptions = DEFAULT_CUE_OPTIONS): Cue[] {
  /** A cue ends after this word, whatever the limits and the merging below would do. */
  const forced = (w: TimelineWord | undefined): boolean => w !== undefined && options.breakAfter?.has(w.i) === true;
  const lines: TimelineWord[][] = [];
  let current: TimelineWord[] = [];
  for (const w of words) {
    const prev = current[current.length - 1];
    if (prev) {
      if (
        prev.play !== w.play ||
        SENTENCE_END.test(prev.text) ||
        w.start - prev.end > options.maxGap ||
        w.end - (current[0] as TimelineWord).start > options.maxDuration
      ) {
        lines.push(current);
        current = [];
      } else if (chars(current) + 1 + w.text.length > options.maxChars) {
        const k = breakAt(current, options.maxChars);
        lines.push(current.slice(0, k));
        current = current.slice(k);
      }
    }
    current.push(w);
    if (forced(w)) {
      lines.push(current);
      current = [];
    }
  }
  if (current.length > 0) lines.push(current);

  const merged: TimelineWord[][] = [];
  for (const line of lines) {
    const prev = merged[merged.length - 1],
      last = prev?.[prev.length - 1],
      first = line[0] as TimelineWord;
    const joins =
      prev &&
      last &&
      !forced(last) &&
      span(line) < MIN_CUE &&
      last.play === first.play &&
      !SENTENCE_END.test(last.text) &&
      first.start - last.end <= options.maxGap;
    if (!joins) {
      merged.push([...line]);
      continue;
    }
    // A short cue joins the one before it when that stays near the limit, else the two share their words anew.
    if (chars(prev) + 1 + chars(line) <= options.maxChars + Math.max(4, Math.round(options.maxChars / 4))) {
      prev.push(...line);
      continue;
    }
    const split = rebalance([...prev, ...line], options.maxChars, span(line));
    if (split) merged.splice(merged.length - 1, 1, ...split);
    // Speech too fast for one-line cues: the two make one cue on two lines.
    else if (chars(prev) + 1 + chars(line) <= 2 * options.maxChars) prev.push(...line);
    else merged.push([...line]);
  }
  // A short cue that opens its sentence joins the next cue of that sentence instead.
  for (let n = merged.length - 2; n >= 0; n--) {
    const line = merged[n] as TimelineWord[],
      next = merged[n + 1] as TimelineWord[];
    const last = line[line.length - 1] as TimelineWord,
      first = next[0] as TimelineWord;
    if (
      span(line) >= MIN_CUE ||
      forced(last) ||
      SENTENCE_END.test(last.text) ||
      last.play !== first.play ||
      first.start - last.end > options.maxGap
    )
      continue;
    if (chars(line) + 1 + chars(next) <= 2 * options.maxChars) merged.splice(n, 2, [...line, ...next]);
  }

  return merged.map((line, n) => {
    const first = line[0] as TimelineWord,
      last = line[line.length - 1] as TimelineWord;
    const next = merged[n + 1]?.[0];
    // Held into the pause after it, never over the next cue; the last cue keeps its words' end.
    const end = last.end - first.start < MIN_CUE && next ? Math.min(first.start + MIN_CUE, next.start) : last.end;
    const opens = n === 0 || SENTENCE_END.test((merged[n - 1]!.at(-1) as TimelineWord).text);
    const cueWords = line.map((w, i) => ({
      text: i === 0 && opens ? capitalise(w.text) : w.text,
      start: w.start,
      end: w.end,
    }));
    return { start: first.start, end: ms(end), text: cueWords.map((w) => w.text).join(" "), words: cueWords };
  });
}

/** Shorter than this a cue flashes by unread (seconds). Short-form captions change every 0.3–0.5 s; a lone word
 * under 0.4 s is what the eye misses. */
const MIN_CUE = 0.4;
/** Words that lead into the next one: a line does not end on them. */
const LEADING = new Set([
  "a",
  "an",
  "the",
  "of",
  "to",
  "in",
  "on",
  "at",
  "for",
  "by",
  "from",
  "with",
  "into",
  "and",
  "or",
  "but",
  "so",
  "if",
  "than",
  "as",
  "i",
  "my",
  "your",
  "our",
  "their",
  "his",
  "her",
  "its",
]);

function span(line: readonly TimelineWord[]): number {
  return (line[line.length - 1] as TimelineWord).end - (line[0] as TimelineWord).start;
}

/** Two lines within the limit from the words of a cue and the short one after it, the shorter on screen longest; null when no split beats `shortest`. */
function rebalance(
  words: readonly TimelineWord[],
  maxChars: number,
  shortest: number,
): [TimelineWord[], TimelineWord[]] | null {
  let best: [TimelineWord[], TimelineWord[]] | null = null;
  for (let k = 1; k < words.length; k++) {
    const left = words.slice(0, k),
      right = words.slice(k);
    if (
      chars(left) > maxChars ||
      chars(right) > maxChars ||
      LEADING.has((left[k - 1] as TimelineWord).text.toLowerCase())
    )
      continue;
    const m = Math.min(span(left), span(right));
    if (m > shortest) {
      shortest = m;
      best = [left, right];
    }
  }
  return best;
}

function chars(line: readonly TimelineWord[]): number {
  return line.reduce((n, w) => n + w.text.length, line.length - 1);
}

/** Where to end a line that overflows: the fullest prefix that ends on punctuation or a word that ends a phrase. */
function breakAt(line: readonly TimelineWord[], maxChars: number): number {
  let best = line.length,
    bestScore = Number.POSITIVE_INFINITY;
  for (let k = 1; k <= line.length; k++) {
    const last = (line[k - 1] as TimelineWord).text;
    let score = (maxChars - chars(line.slice(0, k))) / maxChars;
    if (/[,;:]$/.test(last)) score -= 0.5;
    if (LEADING.has(last.toLowerCase())) score += 1;
    if (score < bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return best;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Whether enough of a word plays inside `play` to caption it. A transcriber stretches a word over the pause next to
 * it, so a cut in that pause still keeps the word; a word only grazed by the cut is left out. */
function audible(w: TranscriptWord, play: AssetPlay): boolean {
  const inside = Math.min(w.end, play.out) - Math.max(w.start, play.in);
  return inside >= Math.min(0.15, (w.end - w.start) / 2) - 1e-6;
}

/** Generated `<Caption>` nodes for the cues, as children of the captions node. */
export function cueNodes(
  captions: CollectedNode,
  cues: readonly Cue[],
  taken: (id: string) => boolean,
): CollectedNode[] {
  const used = new Set<string>();
  return cues.map((cue, n) => {
    let id = `${captions.id}-${n + 1}`;
    for (let k = 2; taken(id) || used.has(id); k++) id = `${captions.id}-${n + 1}-${k}`;
    used.add(id);
    return {
      id,
      kind: "caption",
      parent: captions.id,
      children: [],
      editable: "generated",
      lockedProps: [],
      boundProps: {},
      props: { id, start: cue.start, end: cue.end, text: cue.text, words: cue.words },
      origin: { helper: "captions", callerId: captions.id, callIndex: 0 },
    };
  });
}

/** A stable key for the plays of one asset, so an unchanged timeline reuses the generated nodes. */
export function playsKey(plays: readonly AssetPlay[]): string {
  let key = "";
  for (const p of plays)
    key += `${p.id}:${p.start}:${p.in}:${p.out}:${p.speed}:${JSON.stringify(p.keys ?? [])}:${JSON.stringify(p.holds ?? [])};`;
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
  const start = ms(playTime(play, Math.max(w.start, play.in)));
  const end = ms(playTime(play, Math.min(w.end, play.out)));
  return {
    i: w.i,
    text: w.text,
    start,
    end,
    play: play.id,
    ...(w.speaker !== undefined ? { speaker: w.speaker } : {}),
  };
}

/** Composition time at which asset second `sec` plays in `play`: through the speed ramp, then past the holds before it. */
function playTime(play: AssetPlay, sec: number): number {
  const advance = Math.max(0, sec - play.in);
  const rel = play.keys ? rampInverse(play.keys, advance) : advance / play.speed;
  return play.start + (play.holds ? freezeUnshift(play.holds, rel) : rel);
}
