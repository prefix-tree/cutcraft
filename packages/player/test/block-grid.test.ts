// Where a decoded block lands in a range: on the grid its stream's blocks start on, so a block whose container time
// was rounded to the millisecond (WebM) is placed where the file has it. The preview and the export both use it.
import { blockGrid, blockStart } from "../src/media/block-grid";

// Opus at 48 kHz: a first block of 648 frames (960 less the 312 of pre-skip), then 960 each.
const OPUS = { base: 648, frames: 960 };

describe("blockStart", () => {
  it("puts a block a millisecond late back on its grid line", () => {
    // Block 299 after the first starts at 648 + 299 × 960 = 287 688 (5.9935 s); a WebM says 5.9945 s.
    expect(blockStart(5.9945, 960, 48000, OPUS)).toBe(287_688);
    expect(blockStart(5.9925, 960, 48000, OPUS)).toBe(287_688);
  });

  it("leaves an exact time exact", () => {
    expect(blockStart(287_688 / 48000, 960, 48000, OPUS)).toBe(287_688);
    expect(blockStart(1024 / 48000, 1024, 48000, { base: 1024, frames: 1024 })).toBe(1024);
  });

  it("keeps the time of a block of another length, or one far from a grid line", () => {
    expect(blockStart(0, 648, 48000, OPUS)).toBe(0);
    expect(blockStart(1.0001, 480, 48000, OPUS)).toBe(48_005);
    expect(blockStart((648 + 480) / 48000, 960, 48000, OPUS)).toBe(1128);
  });

  it("rounds to the nearest sample without a grid", () => {
    expect(blockStart(0.5, 960, 44100, null)).toBe(22_050);
  });
});

describe("blockGrid", () => {
  it("starts at the second block, as long as it", () => {
    expect(blockGrid({ start: 0, frames: 648 }, { start: 648, frames: 960 })).toEqual({ base: 648, frames: 960 });
  });

  it("is none for a stream of one block", () => {
    expect(blockGrid({ start: 0, frames: 648 }, undefined)).toBeNull();
    expect(blockGrid(undefined, undefined)).toBeNull();
  });
});
