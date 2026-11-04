import { describe, expect, it } from "vitest";

import { type AssetManifest, collectModule, planCues, resolve, subtitles, type TimelineWord } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

const words = ["Small", "software", "deserves", "a", "real", "cloud.", "It", "should", "be", "cheap."];
const manifest: AssetManifest = {
  assets: {
    talk: {
      id: "talk",
      kind: "video",
      duration: 10,
      fps: 30,
      width: 640,
      height: 360,
      transcript: { words: words.map((text, i) => ({ i, text, start: 1 + i * 0.5, end: 1.4 + i * 0.5 })) },
    },
  },
};

const stateOf = (captions: string, clip = `in={0} out={10}`) =>
  resolve(
    collectModule(
      loadModule(`import { Caption, Captions, Clip, Composition, Track } from "@cutcraft/kit";
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main"><Clip id="c" src="asset:talk" ${clip} /></Track>
      ${captions}
    </Composition>
  );
}`) as never,
    ),
    manifest,
  );

describe("subtitles", () => {
  const written = `<Captions id="cc">
        <Caption id="b" start={3} end={4.25} text="Second line" />
        <Caption id="a" start={0.5} end={2} text="First line" />
      </Captions>`;

  it("writes the captions as SRT, in time order", () => {
    expect(subtitles(stateOf(written), { format: "srt" })).toBe(
      "1\n00:00:00,500 --> 00:00:02,000\nFirst line\n\n2\n00:00:03,000 --> 00:00:04,250\nSecond line\n",
    );
  });

  it("writes WebVTT, and times a part of the composition from its start", () => {
    expect(subtitles(stateOf(written), { format: "vtt", from: 1, to: 3.5 })).toBe(
      "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nFirst line\n\n00:00:02.000 --> 00:00:02.500\nSecond line\n",
    );
  });

  it("writes the cues generated from the transcript, where the cut plays them", () => {
    // The clip starts at second 2 of the talk, so the third word plays at 0 s.
    const srt = subtitles(stateOf(`<Captions id="cc" src="asset:talk" />`, `in={2} out={6}`), { format: "srt" });
    expect(srt.split("\n").slice(0, 3)).toEqual(["1", "00:00:00,000 --> 00:00:01,900", "Deserves a real cloud."]);
  });

  it("writes a valid empty file when there are no captions", () => {
    expect(subtitles(stateOf(""), { format: "vtt" })).toBe("WEBVTT\n\n");
    expect(subtitles(stateOf(""), { format: "srt" })).toBe("");
  });
});

describe("breakAfter", () => {
  const w = (i: number, text: string, start: number, end: number): TimelineWord => ({ i, text, start, end, play: "c" });

  it("ends a cue after the word, and the short cue after it does not join back", () => {
    const line = [w(0, "Ship", 0, 0.4), w(1, "it", 0.4, 0.6), w(2, "today", 0.6, 0.8)];
    const options = { maxChars: 42, maxDuration: 5, maxGap: 0.8 };
    expect(planCues(line, options).map((c) => c.text)).toEqual(["Ship it today"]);
    expect(planCues(line, { ...options, breakAfter: new Set([1]) }).map((c) => c.text)).toEqual(["Ship it", "today"]);
  });

  it("is a prop on the captions, as word refs", () => {
    const state = stateOf(`<Captions id="cc" src="asset:talk" breakAfter={["word:2"]} />`);
    const cues = [...state.items.values()].filter((p) => p.kind === "caption").map((p) => p.props.text);
    expect(cues[0]).toBe("Small software deserves");
    const bad = stateOf(`<Captions id="cc" src="asset:talk" breakAfter={["shot:2"]} />`);
    expect(bad.errors.map((e) => e.message).join(" ")).toContain('a word ref such as "word:12"');
  });
});
