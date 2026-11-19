// The sound cues are made by media/sounds.ts. The committed files must be what it makes, so a change to a synth comes
// with its new file, and no cue may clip.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { AssetManifest } from "@uberscene/kit";

import { SOUNDS, wav } from "../media/sounds";

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "uberscene.json"), "utf8")) as AssetManifest;

describe.each(Object.keys(SOUNDS))("%s", (id) => {
  const synth = SOUNDS[id] as () => Float32Array;
  const made = wav(synth());

  it("is the same on every run, and the committed file is what the script makes", () => {
    expect(wav(synth()).equals(made)).toBe(true);
    expect(readFileSync(join(root, "media", `${id}.wav`)).equals(made)).toBe(true);
  });

  it("peaks below full scale", () => {
    let peak = 0;
    for (let i = 44; i < made.length; i += 2) peak = Math.max(peak, Math.abs(made.readInt16LE(i)));
    expect(peak / 32768).toBeLessThan(0.75);
    expect(peak / 32768).toBeGreaterThan(0.65);
  });

  it("is in the manifest as an audio asset of its length", () => {
    const entry = manifest.assets[id];
    expect(entry?.kind).toBe("audio");
    expect(entry?.duration).toBeCloseTo((made.length - 44) / 2 / 48_000, 3);
  });
});
