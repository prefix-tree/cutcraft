import { describe, expect, it } from "vitest";

import { parseTranscript } from "@cutcraft/kit";

const brief = (text: string, format?: "srt" | "vtt" | "json") =>
  parseTranscript(text, format).words.map((w) => [w.text, w.start, w.end, w.speaker ?? null, w.estimated ?? false]);

describe("parseTranscript", () => {
  it("shares an SRT cue's time across its words by length, joins lines and strips markup", () => {
    const srt = `1
00:00:01,000 --> 00:00:02,000
<i>Hi</i> {\\an8}there

2
00:00:03,000 --> 00:00:04,200
- Small
software
`;
    const parsed = parseTranscript(srt);
    expect(parsed.estimated).toBe(true);
    expect(brief(srt)).toEqual([
      ["Hi", 1, 1.286, null, true],
      ["there", 1.286, 2, null, true],
      ["Small", 3, 3.462, null, true],
      ["software", 3.462, 4.2, null, true],
    ]);
    expect(parsed.words.map((w) => w.i)).toEqual([0, 1, 2, 3]);
  });

  it("reads WebVTT voices and inline timestamps, skipping its header, notes and styles", () => {
    const vtt = `WEBVTT - talk

NOTE written by hand

STYLE
::cue { color: yellow }

intro
00:01.000 --> 00:03.000 align:start
<v Ann>Small <00:01.500>software <00:02.200>deserves it

00:00:04.000 --> 00:00:05.000
<v.loud Bob>Yes
`;
    expect(brief(vtt)).toEqual([
      ["Small", 1, 1.5, "Ann", false],
      ["software", 1.5, 2.2, "Ann", false],
      ["deserves", 2.2, 2.84, "Ann", true],
      ["it", 2.84, 3, "Ann", true],
      // A one-word cue is still an estimate: cue times usually pad the word.
      ["Yes", 4, 5, "Bob", true],
    ]);
  });

  it("keeps the word times of OpenAI's verbose JSON", () => {
    const openai = JSON.stringify({
      text: "Small software.",
      words: [
        { word: "Small", start: 0.42, end: 0.71 },
        { word: "software.", start: 0.71, end: 1.2 },
      ],
    });
    expect(parseTranscript(openai)).toEqual({
      words: [
        { i: 0, text: "Small", start: 0.42, end: 0.71 },
        { i: 1, text: "software.", start: 0.71, end: 1.2 },
      ],
      estimated: false,
    });
  });

  it("drops ElevenLabs' spacing and keeps its speakers", () => {
    const eleven = JSON.stringify({
      words: [
        { text: "Hello", start: 0, end: 0.4, type: "word", speaker_id: "speaker_0" },
        { text: " ", start: 0.4, end: 0.5, type: "spacing" },
        { text: "world", start: 0.5, end: 0.9, type: "word", speaker_id: "speaker_0" },
      ],
    });
    expect(brief(eleven)).toEqual([
      ["Hello", 0, 0.4, "speaker_0", false],
      ["world", 0.5, 0.9, "speaker_0", false],
    ]);
  });

  it("reads segments with words (whisper, WhisperX), and shares out a segment that has none", () => {
    const whisper = JSON.stringify({
      segments: [
        {
          start: 0,
          end: 1,
          speaker: "A",
          words: [
            { word: " Small", start: 0.1, end: 0.5, probability: 0.9 },
            { word: " app", start: 0.5, end: 0.9 },
          ],
        },
        { start: 2, end: 3, text: " No words" },
      ],
    });
    expect(brief(whisper)).toEqual([
      ["Small", 0.1, 0.5, "A", false],
      ["app", 0.5, 0.9, "A", false],
      ["No", 2, 2.286, null, true],
      ["words", 2.286, 3, null, true],
    ]);
  });

  it("joins whisper.cpp's sub-word tokens into words and drops its special tokens", () => {
    const cpp = JSON.stringify({
      transcription: [
        {
          offsets: { from: 0, to: 1500 },
          text: " Deploying software",
          tokens: [
            { text: "[_BEG_]", offsets: { from: 0, to: 0 } },
            { text: " Deploy", offsets: { from: 0, to: 300 } },
            { text: "ing", offsets: { from: 300, to: 520 } },
            { text: " software", offsets: { from: 520, to: 1100 } },
            { text: "[_TT_55]", offsets: { from: 1100, to: 1100 } },
          ],
        },
      ],
    });
    expect(brief(cpp)).toEqual([
      ["Deploying", 0, 0.52, null, false],
      ["software", 0.52, 1.1, null, false],
    ]);
  });

  it("passes CutCraft's own word list through, renumbered", () => {
    const own = JSON.stringify({ words: [{ i: 7, text: "Hi", start: 1, end: 1.2, estimated: true }] });
    expect(parseTranscript(own).words).toEqual([{ i: 0, text: "Hi", start: 1, end: 1.2, estimated: true }]);
  });

  it("says what it reads when it cannot read a file", () => {
    expect(() => parseTranscript("hello there")).toThrow("expected SRT, WebVTT or JSON");
    expect(() => parseTranscript(`{ "results": [] }`)).toThrow("whisper.cpp");
    expect(() => parseTranscript("{ nope")).toThrow("not a transcript");
  });
});
