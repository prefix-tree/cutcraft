// How an export splits its frames into pieces. Each piece is held whole in memory until it is joined, so a long
// export must not make pieces that run for many minutes.
import { describe, expect, it } from "vitest";

import { LONGEST_PIECE_SECONDS, planSegments } from "../src/join";

const fps = 30;
const gop = 2 * fps;
const longest = LONGEST_PIECE_SECONDS * fps;

/** The pieces cover [first, last) end to end, each starting on a keyframe. */
function covers(pieces: { first: number; last: number }[], first: number, last: number) {
  expect(pieces[0]?.first).toBe(first);
  expect(pieces.at(-1)?.last).toBe(last);
  for (let i = 1; i < pieces.length; i++) expect(pieces[i]?.first).toBe(pieces[i - 1]?.last);
  for (const p of pieces) expect((p.first - first) % gop).toBe(0);
}

describe("planSegments", () => {
  it("splits an hour with one tab into pieces of at most a minute", () => {
    const frames = 60 * 60 * fps;
    const pieces = planSegments(0, frames, gop, 1, longest);
    covers(pieces, 0, frames);
    expect(Math.max(...pieces.map((p) => p.last - p.first))).toBeLessThanOrEqual(longest);
    expect(pieces).toHaveLength(60);
  });

  it("splits a short video as before: about three pieces a tab, the cap not reached", () => {
    const frames = 30 * fps;
    const pieces = planSegments(0, frames, gop, 2, longest);
    covers(pieces, 0, frames);
    expect(pieces).toEqual(planSegments(0, frames, gop, 2));
    expect(pieces.length).toBeGreaterThanOrEqual(4);
  });

  it("never makes a piece shorter than one keyframe interval", () => {
    const pieces = planSegments(0, 10 * fps, gop, 4, gop / 2);
    for (const p of pieces.slice(0, -1)) expect(p.last - p.first).toBe(gop);
  });

  it("splits a run that starts mid-video from its own first frame", () => {
    const pieces = planSegments(900, 900 + 5 * 60 * fps, gop, 1, longest);
    covers(pieces, 900, 900 + 5 * 60 * fps);
    expect(Math.max(...pieces.map((p) => p.last - p.first))).toBeLessThanOrEqual(longest);
  });
});
