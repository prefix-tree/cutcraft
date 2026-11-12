// Many timelines made at random from a seed, right and wrong values alike. No case pins a number: each timeline is
// checked against the properties every timeline has (`expectSane`), and against a few laws of editing that hold
// whatever the cut is. A failure prints the seed and the tracks, which then belong in timeline-edges.test.ts.
import { describe, expect, it } from "vitest";

import { expectSane, resolved, timeline } from "./timeline-kit";

/** mulberry32: a small seeded generator, so a failing case can be made again. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Dice {
  (): number;
  pick<T>(from: readonly T[]): T;
  chance(p: number): boolean;
}

function dice(seed: number): Dice {
  const next = seeded(seed) as Dice;
  next.pick = (from) => from[Math.floor(next() * from.length)] as (typeof from)[number];
  next.chance = (p) => next() < p;
  return next;
}

// Values an editor writes, and after them ones a slip or a model writes: zero, negative, past the file, not a frame.
// One seed in three draws only from the first kind, so whole files come out clean as well.
const pool = <T>(good: readonly T[], bad: readonly T[]) => ({ good, all: [...good, ...bad] });
const SECONDS_ = pool([0, 0.4, 1, 1.5, 2, 3.25, 4, 6, 9, 11.9], [12, 13, 25, -1, 0.001, 1 / 3]);
const LENGTHS_ = pool([0.2, 0.5, 1, 2, 3.5], [8, 0, -1, 30, 0.033]);
const SPEEDS_ = pool([1, 1, 1, 2, 0.5, 4], [0.1, 0, -1, 0.01, 100]);
const WORDS_ = pool(["word:0", "word:4", "word:9", "word:9.end", "word:20.end", "word:39.end"], ["word:40", "word:99"]);
let SECONDS: readonly number[] = SECONDS_.all,
  LENGTHS: readonly number[] = LENGTHS_.all,
  SPEEDS: readonly number[] = SPEEDS_.all,
  WORDS: readonly string[] = WORDS_.all;

/** One element for a sequence track, or for a free track when `free`. */
function element(d: Dice, id: string, ids: string[], free: boolean): string {
  const start = free && d.chance(0.9) ? ` start={${d.pick(SECONDS)}}` : !free && d.chance(0.05) ? " start={2}" : "";
  const speed = d.chance(0.3) ? ` speed={${d.pick(SPEEDS)}}` : "";
  const kind = d();
  ids.push(id);
  if (kind < 0.35) {
    const range = d.chance(0.7)
      ? ` in={${d.pick(SECONDS)}} out={${d.pick(SECONDS)}}`
      : d.chance(0.5)
        ? ` in={${d.pick(SECONDS)}} duration={${d.pick(LENGTHS)}}`
        : "";
    return `<Clip id="${id}" src="asset:${d.pick(["broll", "broll", "logo", "nope"])}"${range}${speed}${start} />`;
  }
  if (kind < 0.55)
    return `<Clip id="${id}" src="asset:talk" in="${d.pick(WORDS)}" out="${d.pick(WORDS)}"${speed}${start} />`;
  if (kind < 0.65) return `<Gap id="${id}" duration={${d.pick(LENGTHS)}}${start} />`;
  if (kind < 0.8 && !free) {
    ids.pop();
    return `<Transition id="${id}" type="crossfade" duration={${d.pick(LENGTHS)}} />`;
  }
  if (kind < 0.9) {
    const length = d.chance(0.4) ? ` duration="fill"` : ` in={${d.pick(SECONDS)}} duration={${d.pick(LENGTHS)}}`;
    return `<Audio id="${id}" src="asset:music"${length}${speed}${start} />`;
  }
  const holds = d.chance(0.5)
    ? `<Freeze id="${id}-f" at={${d.pick(SECONDS)}} start={${d.pick(SECONDS)}} duration={${d.pick(LENGTHS)}} />`
    : `<SpeedKey id="${id}-k1" at={0} speed={${d.pick(SPEEDS)}} /><SpeedKey id="${id}-k2" at={${d.pick(SECONDS)}} speed={${d.pick(SPEEDS)}} />`;
  return `<Clip id="${id}" src="asset:broll" in={${d.pick(SECONDS)}} out={${d.pick(SECONDS)}}${start}>${holds}</Clip>`;
}

/** An overlay placed against something that may or may not be there. */
function overlay(d: Dice, id: string, ids: readonly string[]): string {
  const target = d.chance(0.85) && ids.length > 0 ? d.pick(ids) : d.pick(["nope", "start", id]);
  const edge = d.chance(0.3) ? ".end" : "";
  const at = d.chance(0.3) ? ` at="${d.pick(WORDS)}"` : "";
  const offset = d.chance(0.5) ? ` offset={${d.pick([...SECONDS, -3])}}` : "";
  const duration = d.chance(0.7)
    ? ` duration={${d.pick(LENGTHS)}}`
    : d.chance(0.5) && ids.length > 0
      ? ` duration={{ match: "${d.pick(ids)}" }}`
      : "";
  return `<Title id="${id}" anchor="${target}${edge}"${at}${offset}${duration}>Hi</Title>`;
}

/** The tracks of one random file. */
function randomTracks(seed: number): string {
  const d = dice(seed);
  const which = seed % 3 === 0 ? "good" : "all";
  SECONDS = SECONDS_[which];
  LENGTHS = LENGTHS_[which];
  SPEEDS = SPEEDS_[which];
  WORDS = WORDS_[which];
  const ids: string[] = [];
  let out = "";
  const tracks = 1 + Math.floor(d() * 3);
  for (let t = 0; t < tracks; t++) {
    const free = t > 0 && d.chance(0.5);
    let inner = "";
    const count = Math.floor(d() * 7);
    for (let i = 0; i < count; i++) inner += element(d, `e${t}_${i}`, ids, free);
    out += `<Track id="t${t}"${free ? ` layout="free"` : ""}>${inner}</Track>`;
  }
  let overlays = "";
  const count = Math.floor(d() * 5);
  for (let i = 0; i < count; i++) {
    const id = `o${i}`;
    overlays += overlay(d, id, ids);
    ids.push(id);
  }
  out += `<Track id="over">${overlays}</Track>`;
  if (d.chance(0.3)) out += `<Captions id="cap" src="asset:talk" />`;
  return out;
}

const SEEDS = Array.from({ length: 3000 }, (_, i) => i + 1);

describe("timelines made at random", () => {
  it("every one resolves without throwing and is sane", () => {
    for (const seed of SEEDS) {
      const tracks = randomTracks(seed);
      try {
        expectSane(resolved(tracks));
      } catch (e) {
        throw new Error(`seed ${seed}: ${(e as Error).message}\n${tracks}`);
      }
    }
  });

  it("resolving the same file twice gives the same timeline", () => {
    for (const seed of SEEDS.slice(0, 150)) {
      const tracks = randomTracks(seed);
      expect(timeline(resolved(tracks)), `seed ${seed}`).toBe(timeline(resolved(tracks)));
    }
  });

  it("the generator makes both clean files and broken ones", () => {
    const states = SEEDS.slice(0, 600).map((seed) => resolved(randomTracks(seed)));
    const clean = states.filter((s) => s.errors.length === 0 && s.composition.duration > 0).length;
    expect(clean).toBeGreaterThan(10);
    expect(states.length - clean).toBeGreaterThan(300);
    const codes = new Set(states.flatMap((s) => s.errors.map((e) => e.code)));
    for (const code of [
      "SCHEMA",
      "TRIM_PAST_SOURCE",
      "NOT_ADJACENT",
      "INSUFFICIENT_HANDLES",
      "DANGLING_ANCHOR",
      "CYCLE",
      "INVALID_ANCHOR",
      "UNKNOWN_REF",
      "MISSING_ASSET",
    ])
      expect([...codes], code).toContain(code);
  });
});

describe("laws of a sequence", () => {
  /** A clean sequence of clips of the b-roll, each from `a` for `len` seconds. */
  const clips = (d: Dice, count: number): { id: string; len: number; text: string }[] =>
    Array.from({ length: count }, (_, i) => {
      const a = Math.floor(d() * 8);
      const len = 1 + Math.floor(d() * 3);
      return { id: `c${i}`, len, text: `<Clip id="c${i}" src="asset:broll" in={${a}} out={${a + len}} />` };
    });
  const track = (inner: string): string => `<Track id="main">${inner}</Track>`;

  it("the video is as long as its clips together, less each transition", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const d = dice(seed);
      const list = clips(d, 2 + Math.floor(d() * 5));
      let inner = "",
        expected = 0;
      for (const [i, c] of list.entries()) {
        // A transition no longer than half of either clip, so two never meet in one clip.
        if (i > 0 && d.chance(0.5)) {
          const x = Math.min(c.len, (list[i - 1] as { len: number }).len) / 2;
          inner += `<Transition id="x${i}" type="crossfade" duration={${x}} />`;
          expected -= x;
        }
        inner += c.text;
        expected += c.len;
      }
      const state = resolved(track(inner));
      expectSane(state);
      expect(state.errors, `seed ${seed}`).toEqual([]);
      expect(state.composition.duration, `seed ${seed}`).toBeCloseTo(expected, 9);
    }
  });

  it("a gap put before a clip moves that clip and all after it by the gap, and nothing before it", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const d = dice(seed);
      const list = clips(d, 2 + Math.floor(d() * 5));
      const at = Math.floor(d() * list.length);
      const gap = 0.5 + Math.floor(d() * 4) / 2;
      const before = resolved(track(list.map((c) => c.text).join("")));
      const after = resolved(
        track(list.map((c, i) => (i === at ? `<Gap id="g" duration={${gap}} />` : "") + c.text).join("")),
      );
      expectSane(after);
      for (const [i, c] of list.entries()) {
        const was = before.items.get(c.id)?.start as number;
        expect(after.items.get(c.id)?.start, `seed ${seed} ${c.id}`).toBeCloseTo(was + (i >= at ? gap : 0), 9);
      }
      expect(after.composition.duration).toBeCloseTo(before.composition.duration + gap, 9);
    }
  });

  it("trimming a clip moves only what comes after it, by what was trimmed", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const d = dice(seed);
      const list = clips(d, 3 + Math.floor(d() * 4));
      const at = Math.floor(d() * list.length);
      const before = resolved(track(list.map((c) => c.text).join("")));
      // The trimmed clip keeps its in and loses half a second of its end.
      const trimmed = list.map((c, i) =>
        i === at ? c.text.replace(/out=\{(\d+)\}/, (_, out: string) => `out={${Number(out) - 0.5}}`) : c.text,
      );
      const after = resolved(track(trimmed.join("")));
      expectSane(after);
      for (const [i, c] of list.entries()) {
        const was = before.items.get(c.id)?.start as number;
        expect(after.items.get(c.id)?.start, `seed ${seed} ${c.id}`).toBeCloseTo(was - (i > at ? 0.5 : 0), 9);
      }
    }
  });

  it("an overlay on a word stays on that word wherever its clip moves and however it is trimmed", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const d = dice(seed);
      const lead = Math.floor(d() * 4);
      const first = Math.floor(d() * 10);
      const word = first + Math.floor(d() * 5);
      const last = word + Math.floor(d() * 5);
      const speed = d.pick([1, 2, 0.5]);
      const state = resolved(
        `<Track id="main">${lead > 0 ? `<Gap id="g" duration={${lead}} />` : ""}<Clip id="hook" src="asset:talk" in="word:${first}" out="word:${last}.end" speed={${speed}} /></Track>
         <Track id="text"><Title id="t" anchor="hook" at="word:${word}" duration={0.2}>Hi</Title></Track>`,
      );
      expect(state.errors, `seed ${seed}`).toEqual([]);
      // Word n starts n/2 seconds into the talk; the clip starts at word `first` and plays at `speed`.
      const expected = lead + (word * 0.5 - first * 0.5) / speed;
      expect(state.items.get("t")?.start, `seed ${seed}`).toBeCloseTo(expected, 9);
    }
  });

  it("the order of tracks does not change when anything plays", () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const tracks = randomTracks(seed);
      const parts = tracks.match(/<Track id="t\d+".*?<\/Track>/g) ?? [];
      if (parts.length < 2) continue;
      const rest = tracks.slice(parts.join("").length);
      const a = resolved(parts.join("") + rest);
      const b = resolved([...parts].reverse().join("") + rest);
      const times = (s: typeof a): string[] =>
        [...s.items.values()]
          // Caption cues are numbered in the order they are made, which follows the tracks; their times are compared.
          .filter((p) => p.kind !== "track" && p.kind !== "composition")
          .map((p) => (p.kind === "caption" ? { ...p, id: "cue" } : p))
          .map((p) => `${p.id} ${p.start.toFixed(6)} ${p.end.toFixed(6)}`)
          .sort();
      expect(times(b), `seed ${seed}`).toEqual(times(a));
    }
  });
});
