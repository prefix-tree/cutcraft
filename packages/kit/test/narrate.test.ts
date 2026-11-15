import { narrate } from "../src";

describe("narrate: the script", () => {
  it("times every word at a speaking pace, from the start", () => {
    const story = narrate("A game has no real light.");
    // 0.09 s a word and 0.04 s a letter, from 0.3 s.
    expect(story.words).toEqual([
      { text: "A", start: 0.3, end: 0.43 },
      { text: "game", start: 0.43, end: 0.68 },
      { text: "has", start: 0.68, end: 0.89 },
      { text: "no", start: 0.89, end: 1.06 },
      { text: "real", start: 1.06, end: 1.31 },
      { text: "light.", start: 1.31, end: 1.6 },
    ]);
    // The breath after the full stop is part of the narration.
    expect(story.duration).toBe(1.85);
  });

  it("takes a breath after a comma and a longer one after a full stop", () => {
    const [, b, , d] = narrate("one, two. three four").words;
    // "one," ends at 0.51: 0.11 s later "two." starts. "two." ends at 0.83: 0.25 s later "three" starts.
    expect(b?.start).toBe(0.62);
    expect(d?.start).toBeCloseTo(1.08 + 0.09 + 0.2, 3);
  });

  it("names a cue by a bracketed word, at the word's start, and keeps the brackets out of the text", () => {
    const story = narrate("So it [cheats]. [Real] light.");
    expect(story.words.map((w) => w.text)).toEqual(["So", "it", "cheats.", "Real", "light."]);
    expect(story.cues).toEqual({ cheats: story.words[2]?.start, Real: story.words[3]?.start });
    expect(story.at("cheats")).toBe(story.words[2]?.start);
  });

  it("waits out a pause, and marks a moment by name with no word", () => {
    const story = narrate("one (1.5) {here} two");
    const [one, two] = story.words;
    expect(story.at("here")).toBe(ms((one?.end ?? 0) + 1.5));
    expect(two?.start).toBe(story.at("here"));
    // A pause at the end is part of the length.
    expect(narrate("one (2)").duration).toBe(ms(0.3 + 0.09 + 0.12 + 2));
  });

  it("refuses a cue it does not have, and a cue named twice", () => {
    const story = narrate("a [b] {c}");
    expect(() => story.at("d")).toThrow('the script has no cue "d"; it has: b, c');
    expect(() => narrate("[go] and [go]")).toThrow('the script names the cue "go" twice');
  });

  it("takes a start, a pace and a hold", () => {
    const slow = narrate("go on", { start: 1, pace: { word: 0.2, letter: 0.1 } });
    expect(slow.words).toEqual([
      { text: "go", start: 1, end: 1.4 },
      { text: "on", start: 1.4, end: 1.8 },
    ]);
    expect(narrate("go on", { hold: 0.5 }).lines[0]?.end).toBe(ms(0.3 + 0.17 + 0.17 + 0.5));
  });
});

describe("narrate: the subtitles", () => {
  const texts = (script: string, options = {}) => narrate(script, options).lines.map((l) => l.text);

  it("ends a line with its sentence, and at a pause", () => {
    expect(texts("It can't. So it cheats. (0.5) Next")).toEqual(["It can't.", "So it cheats.", "Next"]);
    expect(texts("one two (1) three four")).toEqual(["one two", "three four"]);
  });

  it("ends a line at a comma once it has some length, and when it would run too long", () => {
    // The first comma comes too early to break at; the second does not.
    expect(texts("Well, a game has to do it, sixty times a second")).toEqual([
      "Well, a game has to do it,",
      "sixty times a second",
    ]);
    expect(texts("aaaa bbbb cccc dddd eeee ffff gggg hhhh", { lineLength: 20 })).toEqual([
      "aaaa bbbb cccc dddd",
      "eeee ffff gggg hhhh",
    ]);
  });

  it("leaves no line of one or two words over from a long sentence", () => {
    // Broken at 30 characters the second line would be "foxtrot now." alone: it takes a word back from the first.
    expect(texts("alpha bravo charlie delta echo foxtrot now.", { lineLength: 30 })).toEqual([
      "alpha bravo charlie delta",
      "echo foxtrot now.",
    ]);
    // Not across the end of a sentence: a short sentence is a line of its own.
    expect(texts("alpha bravo charlie delta echo. Go now.")).toEqual(["alpha bravo charlie delta echo.", "Go now."]);
  });

  it("gives a line its words and their times, and holds it a moment, but never into the next line", () => {
    const story = narrate("One two. Three four.", { hold: 0.4 });
    const [a, b] = story.lines;
    expect(a?.words).toEqual(story.words.slice(0, 2));
    expect(a?.start).toBe(0.3);
    // The hold would run past the next line's first word (0.25 s after "two."), so it stops there.
    expect(a?.end).toBe(b?.start);
    expect(b?.end).toBe(ms((story.words[3]?.end ?? 0) + 0.4));
  });
});

describe("narrate: with the transcript of a recorded voice", () => {
  const heard = (words: [string, number, number][]) => ({
    words: words.map(([text, start, end]) => ({ text, start, end })),
  });

  it("takes the voice's times, whatever its case and punctuation", () => {
    const story = narrate("So it [cheats]. Every time.", {
      transcript: heard([
        ["so", 1.0, 1.2],
        ["it", 1.2, 1.3],
        ["cheats", 1.5, 2.0],
        ["EVERY", 3.0, 3.4],
        ["time", 3.4, 3.9],
      ]),
    });
    expect(story.words.map((w) => [w.text, w.start, w.end])).toEqual([
      ["So", 1.0, 1.2],
      ["it", 1.2, 1.3],
      ["cheats.", 1.5, 2.0],
      ["Every", 3.0, 3.4],
      ["time.", 3.4, 3.9],
    ]);
    expect(story.at("cheats")).toBe(1.5);
    expect(story.duration).toBe(3.9);
    expect(story.warnings).toEqual([]);
    // The lines follow the script's sentences, with the voice's times.
    expect(story.lines.map((l) => [l.text, l.start])).toEqual([
      ["So it cheats.", 1.0],
      ["Every time.", 3.0],
    ]);
  });

  it("does not add a written pause, and puts a named moment after the word before it", () => {
    const story = narrate("one (0.5) {here} two (9) {late} three", {
      transcript: heard([
        ["one", 0, 1],
        ["two", 4, 5],
        ["three", 6, 7],
      ]),
    });
    expect(story.words.map((w) => w.start)).toEqual([0, 4, 6]);
    // Half a second after "one"; and never later than the word that follows.
    expect(story.at("here")).toBe(1.5);
    expect(story.at("late")).toBe(6);
    // The pause still ends the line.
    expect(story.lines.map((l) => l.text)).toEqual(["one", "two", "three"]);
  });

  it("times a word the voice changed between its neighbours, and says so", () => {
    const story = narrate("the big red ball", {
      transcript: heard([
        ["the", 0, 0.5],
        ["large", 0.5, 1.0],
        ["scarlet", 1.0, 2.0],
        ["ball", 2.5, 3.0],
      ]),
    });
    const [, big, red, ball] = story.words;
    // "big" and "red" share the time between "the" and "ball", equally: they are as long as each other.
    expect([big?.start, big?.end, red?.start, red?.end]).toEqual([0.5, 1.5, 1.5, 2.5]);
    expect(ball?.start).toBe(2.5);
    expect(story.warnings).toEqual([
      'the transcript does not have "big red" where the script does; they are timed between the words either side',
    ]);
  });

  it("refuses a transcript of something else", () => {
    expect(() =>
      narrate("light goes straight through this ball", {
        transcript: heard([
          ["hello", 0, 1],
          ["this", 1, 2],
          ["world", 2, 3],
        ]),
      }),
    ).toThrow("the transcript has 1 of the script's 6 words: it is not a recording of this script");
  });
});

function ms(t: number): number {
  return Math.round(t * 1000) / 1000;
}
