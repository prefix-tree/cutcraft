// Edge cases of the timeline: what the resolver places for each shape of cut an editor can write, right or wrong.
// Each case is a file's tracks and the whole timeline it resolves to, as text (see `timeline` in timeline-kit.ts).
// Every case is also checked against the properties every timeline has (`expectSane`).
import { describe, expect, it } from "vitest";

import { A, C, cut, G, M, O, T, Ti, W, X } from "./timeline-kit";

// A talking clip that says words 4 to 9 (2 s to 4.9 s of the talk), a half-second crossfade, and four seconds of
// b-roll: the cut most cases put their overlays against.
const MAIN = T(W("hook", "word:4", "word:9.end") + X("x1", 0.5) + C("b", 0, 4));

describe("a sequence of clips", () => {
  it("plays clips back to back in the order written", () => {
    expect(cut(T(C("a", 0, 4) + C("b", 4, 6) + C("c", 1, 2)))).toMatchInlineSnapshot(`
      "
      duration 7
      a clip 0..4 plays broll 0..4 x1
      b clip 4..6 plays broll 4..6 x1
      c clip 6..7 plays broll 1..2 x1
      "
    `);
  });

  it("a clip with no in or out plays its whole file", () => {
    expect(cut(T(`<Clip id="a" src="asset:broll" />`))).toMatchInlineSnapshot(`
      "
      duration 12
      a clip 0..12 plays broll 0..12 x1
      "
    `);
  });

  it("a still lasts five seconds unless told otherwise", () => {
    expect(
      cut(T(`<Clip id="a" src="asset:logo" />` + `<Clip id="b" src="asset:logo" duration={2} />` + C("c", 0, 1))),
    ).toMatchInlineSnapshot(`
      "
      duration 8
      a clip 0..5 plays logo 0..5 x1
      b clip 5..7 plays logo 0..2 x1
      c clip 7..8 plays broll 0..1 x1
      "
    `);
  });

  it("duration counts seconds of the video, so a faster clip plays more of its file", () => {
    expect(cut(T(`<Clip id="a" src="asset:broll" in={2} duration={3} speed={2} />`))).toMatchInlineSnapshot(`
      "
      duration 3
      a clip 0..3 plays broll 2..8 x2
      "
    `);
  });

  it("speed shortens or lengthens the clip, not what it plays", () => {
    expect(cut(T(C("a", 0, 4, "speed={2}") + C("b", 0, 4, "speed={0.5}") + C("c", 0, 1)))).toMatchInlineSnapshot(`
      "
      duration 11
      a clip 0..2 plays broll 0..4 x2
      b clip 2..10 plays broll 0..4 x0.5
      c clip 10..11 plays broll 0..1 x1
      "
    `);
  });

  it("the same range of the same file may play twice", () => {
    expect(cut(T(C("a", 0, 2) + C("b", 0, 2)))).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 0..2 plays broll 0..2 x1
      b clip 2..4 plays broll 0..2 x1
      "
    `);
  });

  it("lengths are kept as written, not snapped to frames", () => {
    expect(cut(T(C("a", 0, 1.01) + C("b", 0, 1.016)))).toMatchInlineSnapshot(`
      "
      duration 2.026
      a clip 0..1.01 plays broll 0..1.01 x1
      b clip 1.01..2.026 plays broll 0..1.016 x1
      "
    `);
  });

  it("an empty track is no time at all", () => {
    expect(cut(T(""))).toMatchInlineSnapshot(`
      "
      duration 0
      "
    `);
  });

  it("a file with no tracks is no time at all", () => {
    expect(cut("")).toMatchInlineSnapshot(`
      "
      duration 0
      "
    `);
  });
});

describe("gaps", () => {
  it("a gap holds time between two clips", () => {
    expect(cut(T(C("a", 0, 1) + G("g", 2) + C("b", 0, 1)))).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 0..1 plays broll 0..1 x1
      g gap 1..3
      b clip 3..4 plays broll 0..1 x1
      "
    `);
  });

  it("a gap at the start delays the first clip", () => {
    expect(cut(T(G("g", 2) + C("a", 0, 1)))).toMatchInlineSnapshot(`
      "
      duration 3
      g gap 0..2
      a clip 2..3 plays broll 0..1 x1
      "
    `);
  });

  it("a gap at the end still counts as the video", () => {
    expect(cut(T(C("a", 0, 1) + G("g", 2)))).toMatchInlineSnapshot(`
      "
      duration 3
      a clip 0..1 plays broll 0..1 x1
      g gap 1..3
      "
    `);
  });

  it("a track of gaps alone has their length", () => {
    expect(cut(T(G("g", 2) + G("h", 1)))).toMatchInlineSnapshot(`
      "
      duration 3
      g gap 0..2
      h gap 2..3
      "
    `);
  });

  it("a gap of no length or less is refused and holds no time", () => {
    expect(cut(T(C("a", 0, 1) + G("g", 0) + G("h", -1) + C("b", 0, 1)))).toMatchInlineSnapshot(`
      "
      duration 2
      a clip 0..1 plays broll 0..1 x1
      g gap 1..1
      h gap 1..1
      b clip 1..2 plays broll 0..1 x1
      ! SCHEMA g.duration
      ! SCHEMA h.duration
      "
    `);
  });
});

describe("trims the file cannot give", () => {
  it("out before in: the clip is refused and takes no time", () => {
    expect(cut(T(C("a", 5, 2) + C("b", 4, 8)))).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 0..0 plays broll 5..5 x1
      b clip 0..4 plays broll 4..8 x1
      ! TRIM_PAST_SOURCE a.out
      "
    `);
  });

  it("out equal to in is no clip", () => {
    expect(cut(T(C("a", 3, 3) + C("b", 4, 8)))).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 0..0 plays broll 3..3 x1
      b clip 0..4 plays broll 4..8 x1
      ! TRIM_PAST_SOURCE a.out
      "
    `);
  });

  it("out past the end of the file is held to the end", () => {
    expect(cut(T(C("a", 10, 13) + C("b", 4, 8)))).toMatchInlineSnapshot(`
      "
      duration 6
      a clip 0..2 plays broll 10..12 x1
      b clip 2..6 plays broll 4..8 x1
      ! TRIM_PAST_SOURCE a.out
      "
    `);
  });

  it("in past the end of the file leaves nothing to play", () => {
    expect(cut(T(C("a", 13, 14) + C("b", 4, 8)))).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 0..0 plays broll 13..13 x1
      b clip 0..4 plays broll 4..8 x1
      ! TRIM_PAST_SOURCE a.out
      ! TRIM_PAST_SOURCE a.out
      "
    `);
  });

  it("a duration past the end of the file is held to the end", () => {
    expect(cut(T(`<Clip id="a" src="asset:broll" in={10} duration={5} />`))).toMatchInlineSnapshot(`
      "
      duration 2
      a clip 0..2 plays broll 10..12 x1
      ! TRIM_PAST_SOURCE a.out
      "
    `);
  });

  it("a negative in is refused and the clip starts at the top of the file", () => {
    expect(cut(T(C("a", -1, 2)))).toMatchInlineSnapshot(`
      "
      duration 2
      a clip 0..2 plays broll 0..2 x1
      ! SCHEMA a.in
      "
    `);
  });

  it("out and duration together: out wins and the file is told", () => {
    expect(cut(T(`<Clip id="a" src="asset:broll" in={0} out={2} duration={5} />`))).toMatchInlineSnapshot(`
      "
      duration 2
      a clip 0..2 plays broll 0..2 x1
      ! AMBIGUOUS_DURATION a.duration
      "
    `);
  });

  it("an asset the manifest does not have takes no time and the cut goes on", () => {
    expect(cut(T(`<Clip id="a" src="asset:nope" in={0} out={2} />` + C("b", 0, 1)))).toMatchInlineSnapshot(`
      "
      duration 1
      a clip 0..0
      b clip 0..1 plays broll 0..1 x1
      ! MISSING_ASSET a.src
      "
    `);
  });

  it("the same id twice is told", () => {
    expect(cut(T(C("a", 0, 1) + C("a", 0, 2)))).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 2..4 plays broll 0..2 x1
      ! DUPLICATE_ID a
      "
    `);
  });
});

describe("speeds the schema refuses", () => {
  it("a speed of zero is refused: the clip plays at its written length, not for ever", () => {
    expect(cut(T(C("a", 0, 4, "speed={0}")))).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 0..4 plays broll 0..4 x1
      ! SCHEMA a.speed
      "
    `);
  });

  it("a negative speed is refused: the clip does not run backwards in time", () => {
    expect(cut(T(C("a", 0, 4, "speed={-1}") + C("b", 0, 1)))).toMatchInlineSnapshot(`
      "
      duration 5
      a clip 0..4 plays broll 0..4 x1
      b clip 4..5 plays broll 0..1 x1
      ! SCHEMA a.speed
      "
    `);
  });

  it("a speed below a tenth is refused", () => {
    expect(cut(T(C("a", 0, 4, "speed={0.01}")))).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 0..4 plays broll 0..4 x1
      ! SCHEMA a.speed
      "
    `);
  });

  it("a refused duration on a still falls back to five seconds", () => {
    expect(cut(T(`<Clip id="a" src="asset:logo" duration={0} />`))).toMatchInlineSnapshot(`
      "
      duration 5
      a clip 0..5 plays logo 0..5 x1
      ! SCHEMA a.duration
      "
    `);
  });
});

describe("transitions", () => {
  it("a transition overlaps its two clips by its length", () => {
    expect(cut(T(C("a", 0, 4) + X("x", 1) + C("b", 4, 8)))).toMatchInlineSnapshot(`
      "
      duration 7
      a clip 0..4 plays broll 0..4 x1
      x transition 3..4 joins a>b
      b clip 3..7 plays broll 4..8 x1
      "
    `);
  });

  it("two transitions on a clip long enough for both", () => {
    expect(cut(T(C("a", 0, 4) + X("x1", 1) + C("b", 4, 7) + X("x2", 1) + C("c", 0, 4)))).toMatchInlineSnapshot(`
      "
      duration 9
      a clip 0..4 plays broll 0..4 x1
      x1 transition 3..4 joins a>b
      b clip 3..6 plays broll 4..7 x1
      x2 transition 5..6 joins b>c
      c clip 5..9 plays broll 0..4 x1
      "
    `);
  });

  it("two transitions that exactly use up the clip between them", () => {
    expect(cut(T(C("a", 0, 4) + X("x1", 1) + C("b", 4, 6) + X("x2", 1) + C("c", 0, 4)))).toMatchInlineSnapshot(`
      "
      duration 8
      a clip 0..4 plays broll 0..4 x1
      x1 transition 3..4 joins a>b
      b clip 3..5 plays broll 4..6 x1
      x2 transition 4..5 joins b>c
      c clip 4..8 plays broll 0..4 x1
      "
    `);
  });

  it("two transitions that would meet inside the clip between them: the second is told and held to what is left", () => {
    expect(cut(T(C("a", 0, 4) + X("x1", 1.5) + C("b", 4, 6) + X("x2", 1.5) + C("c", 6, 10)))).toMatchInlineSnapshot(`
      "
      duration 8
      a clip 0..4 plays broll 0..4 x1
      x1 transition 2.5..4 joins a>b
      b clip 2.5..4.5 plays broll 4..6 x1
      x2 transition 4..4.5 joins b>c
      c clip 4..8 plays broll 6..10 x1
      ! INSUFFICIENT_HANDLES x2
      "
    `);
  });

  it("a transition as long as the incoming clip", () => {
    expect(cut(T(C("a", 0, 4) + X("x", 2) + C("b", 4, 6)))).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 0..4 plays broll 0..4 x1
      x transition 2..4 joins a>b
      b clip 2..4 plays broll 4..6 x1
      "
    `);
  });

  it("a transition longer than the outgoing clip is told and held to it", () => {
    expect(cut(T(C("a", 0, 1) + X("x", 2) + C("b", 4, 8)))).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 0..1 plays broll 0..1 x1
      x transition 0..1 joins a>b
      b clip 0..4 plays broll 4..8 x1
      ! INSUFFICIENT_HANDLES x
      "
    `);
  });

  it("a transition longer than the incoming clip is told and held to it", () => {
    expect(cut(T(C("a", 0, 4) + X("x", 2) + C("b", 4, 5)))).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 0..4 plays broll 0..4 x1
      x transition 3..4 joins a>b
      b clip 3..4 plays broll 4..5 x1
      ! INSUFFICIENT_HANDLES x
      "
    `);
  });

  it("a transition before the first clip joins nothing", () => {
    expect(cut(T(X("x", 1) + C("a", 0, 4)))).toMatchInlineSnapshot(`
      "
      duration 4
      x transition 0..1
      a clip 0..4 plays broll 0..4 x1
      ! NOT_ADJACENT x
      "
    `);
  });

  it("a transition after the last clip joins nothing", () => {
    expect(cut(T(C("a", 0, 4) + X("x", 1)))).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 0..4 plays broll 0..4 x1
      x transition 4..5
      ! NOT_ADJACENT x
      "
    `);
  });

  it("two transitions in a row: the first joins nothing", () => {
    expect(cut(T(C("a", 0, 4) + X("x1", 1) + X("x2", 1) + C("b", 4, 8)))).toMatchInlineSnapshot(`
      "
      duration 7
      a clip 0..4 plays broll 0..4 x1
      x1 transition 4..5
      x2 transition 3..4 joins a>b
      b clip 3..7 plays broll 4..8 x1
      ! NOT_ADJACENT x1
      "
    `);
  });

  it("a transition cannot follow a gap", () => {
    expect(cut(T(C("a", 0, 4) + G("g", 1) + X("x", 1) + C("b", 4, 8)))).toMatchInlineSnapshot(`
      "
      duration 9
      a clip 0..4 plays broll 0..4 x1
      g gap 4..5
      x transition 5..6
      b clip 5..9 plays broll 4..8 x1
      ! NOT_ADJACENT x
      "
    `);
  });

  it("a transition cannot lead into a gap", () => {
    expect(cut(T(C("a", 0, 4) + X("x", 1) + G("g", 1) + C("b", 4, 8)))).toMatchInlineSnapshot(`
      "
      duration 9
      a clip 0..4 plays broll 0..4 x1
      x transition 4..5
      g gap 4..5
      b clip 5..9 plays broll 4..8 x1
      ! NOT_ADJACENT x
      "
    `);
  });

  it("a transition of no length or less is refused and takes the default half second", () => {
    expect(cut(T(C("a", 0, 4) + X("x", 0) + C("b", 4, 8) + X("y", -1) + C("c", 0, 4)))).toMatchInlineSnapshot(`
      "
      duration 11
      a clip 0..4 plays broll 0..4 x1
      x transition 3.5..4 joins a>b
      b clip 3.5..7.5 plays broll 4..8 x1
      y transition 7..7.5 joins b>c
      c clip 7..11 plays broll 0..4 x1
      ! SCHEMA x.duration
      ! SCHEMA y.duration
      "
    `);
  });

  it("a transition with no duration lasts half a second", () => {
    expect(cut(T(C("a", 0, 4) + `<Transition id="x" type="crossfade" />` + C("b", 4, 8)))).toMatchInlineSnapshot(`
      "
      duration 7.5
      a clip 0..4 plays broll 0..4 x1
      x transition 3.5..4 joins a>b
      b clip 3.5..7.5 plays broll 4..8 x1
      "
    `);
  });

  it("a transition into a clip the file cannot give has no length", () => {
    expect(cut(T(C("a", 0, 4) + X("x", 1) + C("b", 5, 2) + C("c", 0, 1)))).toMatchInlineSnapshot(`
      "
      duration 5
      a clip 0..4 plays broll 0..4 x1
      x transition 4..4 joins a>b
      b clip 4..4 plays broll 5..5 x1
      c clip 4..5 plays broll 0..1 x1
      ! INSUFFICIENT_HANDLES x
      ! TRIM_PAST_SOURCE b.out
      "
    `);
  });

  it("a transition between clips of different speeds", () => {
    expect(cut(T(C("a", 0, 4, "speed={2}") + X("x", 1) + C("b", 0, 4, "speed={0.5}")))).toMatchInlineSnapshot(`
      "
      duration 9
      a clip 0..2 plays broll 0..4 x2
      x transition 1..2 joins a>b
      b clip 1..9 plays broll 0..4 x0.5
      "
    `);
  });

  it("a transition between siblings needs a sequence track", () => {
    expect(
      cut(T(C("a", 0, 4, "start={0}") + X("x", 1) + C("b", 0, 4, "start={3}"), `layout="free"`)),
    ).toMatchInlineSnapshot(`
      "
      duration 7
      a clip 0..4 plays broll 0..4 x1
      x transition 0..1
      b clip 3..7 plays broll 0..4 x1
      ! NOT_ADJACENT x
      "
    `);
  });

  it("a transition on one edge of a clip of a free track", () => {
    expect(
      cut(
        T(
          C("a", 0, 4, "start={1}") + X("in", 0.5, `on="a" edge="in"`) + X("out", 0.5, `on="a" edge="out"`),
          `layout="free"`,
        ),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 5
      a clip 1..5 plays broll 0..4 x1
      in transition 1..1.5
      out transition 4.5..5
      "
    `);
  });

  it("an edge transition on a clip that is not there", () => {
    expect(
      cut(T(C("a", 0, 4, "start={1}") + X("in", 0.5, `on="zz" edge="in"`), `layout="free"`)),
    ).toMatchInlineSnapshot(`
      "
      duration 5
      a clip 1..5 plays broll 0..4 x1
      in transition 0..0.5
      ! DANGLING_ANCHOR in.on
      "
    `);
  });
  it("a transition longer than both of its clips is held to the shorter", () => {
    expect(cut(T(C("a", 0, 2) + X("x", 9) + C("b", 0, 1) + C("c", 0, 1)))).toMatchInlineSnapshot(`
      "
      duration 3
      a clip 0..2 plays broll 0..2 x1
      x transition 1..2 joins a>b
      b clip 1..2 plays broll 0..1 x1
      c clip 2..3 plays broll 0..1 x1
      ! INSUFFICIENT_HANDLES x
      "
    `);
  });

  it("a long transition after a gap cannot pull its clip back over the gap", () => {
    expect(cut(T(G("g", 0.5) + C("a", 0, 2) + X("x", 8) + C("b", 0, 10)))).toMatchInlineSnapshot(`
      "
      duration 10.5
      g gap 0..0.5
      a clip 0.5..2.5 plays broll 0..2 x1
      x transition 0.5..2.5 joins a>b
      b clip 0.5..10.5 plays broll 0..10 x1
      ! INSUFFICIENT_HANDLES x
      "
    `);
  });
});

describe("free tracks", () => {
  it("each element is where its start says, and they may overlap", () => {
    expect(
      cut(T(C("a", 0, 4, "start={0}") + C("b", 0, 4, "start={2}") + C("c", 0, 1, "start={10}"), `layout="free"`)),
    ).toMatchInlineSnapshot(`
      "
      duration 11
      a clip 0..4 plays broll 0..4 x1
      b clip 2..6 plays broll 0..4 x1
      c clip 10..11 plays broll 0..1 x1
      "
    `);
  });

  it("the order written does not matter", () => {
    expect(
      cut(T(C("late", 0, 1, "start={5}") + C("early", 0, 1, "start={0}"), `layout="free"`)),
    ).toMatchInlineSnapshot(`
      "
      duration 6
      late clip 5..6 plays broll 0..1 x1
      early clip 0..1 plays broll 0..1 x1
      "
    `);
  });

  it("an element without a start is told and put at zero", () => {
    expect(cut(T(C("a", 0, 2) + C("b", 0, 1, "start={1}"), `layout="free"`))).toMatchInlineSnapshot(`
      "
      duration 2
      a clip 0..2 plays broll 0..2 x1
      b clip 1..2 plays broll 0..1 x1
      ! MISSING_START a.start
      "
    `);
  });

  it("a negative start is refused once and the element put at zero", () => {
    expect(cut(T(C("a", 0, 4, "start={-2}"), `layout="free"`))).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 0..4 plays broll 0..4 x1
      ! SCHEMA a.start
      "
    `);
  });

  it("a start on a sequence track is told and ignored", () => {
    expect(cut(T(C("a", 0, 2, "start={5}") + C("b", 0, 1)))).toMatchInlineSnapshot(`
      "
      duration 3
      a clip 0..2 plays broll 0..2 x1
      b clip 2..3 plays broll 0..1 x1
      ! START_ON_SEQUENCE a.start
      "
    `);
  });

  it("a video that starts late is still measured from zero", () => {
    expect(cut(T(C("a", 0, 2, "start={3}"), `layout="free"`))).toMatchInlineSnapshot(`
      "
      duration 5
      a clip 3..5 plays broll 0..2 x1
      "
    `);
  });
  it("a prop the element does not take is told and left out", () => {
    expect(
      cut(T(C("a", 0, 1, "start={0}") + `<Gap id="g" duration={2} start={-1} />`, `layout="free"`)),
    ).toMatchInlineSnapshot(`
      "
      duration 2
      a clip 0..1 plays broll 0..1 x1
      g gap 0..2
      ! SCHEMA g
      "
    `);
  });
});

describe("overlays against a clip", () => {
  it("an offset counts from the clip's start", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="hook" offset={1} duration={1}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 1..2
      "
    `);
  });

  it("a negative offset cannot go before the video starts", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="hook" offset={-1} duration={1}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..1
      "
    `);
  });

  it("the clip's end, and an offset back from it", () => {
    expect(
      cut(
        MAIN + O(Ti("t", `anchor="hook.end" duration={1}`) + Ti("u", `anchor="hook.end" offset={-0.5} duration={1}`)),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 2.9..3.9
      u title 2.4..3.4
      "
    `);
  });

  it("a word the clip says", () => {
    expect(
      cut(
        MAIN +
          O(Ti("t", `anchor="hook" at="word:6" duration={1}`) + Ti("u", `anchor="hook" at="word:6.end" duration={1}`)),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 1..2
      u title 1.4..2.4
      "
    `);
  });

  it("a word and an offset together", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="hook" at="word:6" offset={0.25} duration={1}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 1.25..2.25
      "
    `);
  });

  it("a word of a faster clip arrives sooner", () => {
    expect(
      cut(T(W("hook", "word:4", "word:9.end", "speed={2}")) + O(Ti("t", `anchor="hook" at="word:6" duration={1}`))),
    ).toMatchInlineSnapshot(`
      "
      duration 1.5
      hook clip 0..1.45 plays talk 2..4.9 x2
      t title 0.5..1.5
      "
    `);
  });

  it("a word the clip trimmed off its end is held to the clip's end", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="hook" at="word:20" duration={1}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 2.9..3.9
      ! INVALID_ANCHOR t.at
      "
    `);
  });

  it("a word the clip trimmed off its start is held to the clip's start", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="hook" at="word:1" duration={1}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..1
      ! INVALID_ANCHOR t.at
      "
    `);
  });

  it("a word the transcript does not have", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="hook" at="word:99" duration={1}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..1
      ! UNKNOWN_REF t.at
      "
    `);
  });

  it("a word of a clip played backwards cannot be found yet", () => {
    expect(
      cut(T(W("hook", "word:4", "word:9.end", "reverse")) + O(Ti("t", `anchor="hook" at="word:6" duration={1}`))),
    ).toMatchInlineSnapshot(`
      "
      duration 2.9
      hook clip 0..2.9 plays talk 2..4.9 x1
      t title 0..1
      ! UNSUPPORTED_ANCHOR t.at
      "
    `);
  });

  it("a word of something that is not footage", () => {
    expect(
      cut(MAIN + O(Ti("t", `anchor="hook" duration={1}`) + Ti("u", `anchor="t" at="word:5" duration={1}`))),
    ).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..1
      u title 0..1
      ! INVALID_ANCHOR u.at
      "
    `);
  });

  it("an anchor that is not in the file", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="nope" duration={1}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..1
      ! DANGLING_ANCHOR t.anchor
      "
    `);
  });

  it("a track is not something to anchor to", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="main" duration={1}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..1
      ! DANGLING_ANCHOR t.anchor
      "
    `);
  });

  it("an element anchored to itself", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="t" duration={1}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..1
      ! CYCLE t
      "
    `);
  });

  it("two elements anchored to each other", () => {
    expect(
      cut(MAIN + O(Ti("t", `anchor="u" duration={1}`) + Ti("u", `anchor="t" duration={1}`))),
    ).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..1
      u title 0..1
      ! CYCLE t
      ! CYCLE u
      "
    `);
  });

  it("a chain of anchors, each from the one before", () => {
    expect(
      cut(
        MAIN +
          O(
            Ti("t", `anchor="hook" offset={1} duration={1}`) +
              Ti("u", `anchor="t.end" offset={0.5} duration={1}`) +
              Ti("v", `anchor="u.end" duration={1}`),
          ),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 1..2
      u title 2.5..3.5
      v title 3.5..4.5
      "
    `);
  });

  it("a chain written in the reverse order", () => {
    expect(
      cut(
        MAIN +
          O(
            Ti("v", `anchor="u.end" duration={1}`) +
              Ti("u", `anchor="t.end" offset={0.5} duration={1}`) +
              Ti("t", `anchor="hook" offset={1} duration={1}`),
          ),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      v title 3.5..4.5
      u title 2.5..3.5
      t title 1..2
      "
    `);
  });

  it("an anchored element takes offset, not start", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="hook" start={2} duration={1}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..1
      ! SCHEMA t.start
      "
    `);
  });

  it("a transition and a gap can be anchored to", () => {
    expect(
      cut(
        T(C("a", 0, 2) + X("x", 0.5) + C("b", 0, 2) + G("g", 2)) +
          O(Ti("t", `anchor="x" duration={1}`) + Ti("u", `anchor="g" duration={1}`)),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 5.5
      a clip 0..2 plays broll 0..2 x1
      x transition 1.5..2 joins a>b
      b clip 1.5..3.5 plays broll 0..2 x1
      g gap 3.5..5.5
      t title 1.5..2.5
      u title 3.5..4.5
      "
    `);
  });

  it("the start of the video", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="start" offset={1} duration={1}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 1..2
      "
    `);
  });

  it("an overlay that outlasts the footage makes the video longer", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="b.end" offset={2} duration={3}`)))).toMatchInlineSnapshot(`
      "
      duration 11.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 8.4..11.4
      "
    `);
  });

  it("an overlay with no duration lasts five seconds", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="hook"`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..5
      "
    `);
  });

  it("an overlay follows its clip when a gap moves the clip", () => {
    expect(
      cut(T(G("g", 3) + W("hook", "word:4", "word:9.end")) + O(Ti("t", `anchor="hook" at="word:6" duration={1}`))),
    ).toMatchInlineSnapshot(`
      "
      duration 5.9
      g gap 0..3
      hook clip 3..5.9 plays talk 2..4.9 x1
      t title 4..5
      "
    `);
  });
});

describe("lengths taken from something else", () => {
  it("fill lasts to the end of the video from where the element starts", () => {
    expect(cut(MAIN + O(Ti("t", `start={1} duration="fill"`), `layout="free"`))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 1..6.4
      "
    `);
  });

  it("fill means nothing on a sequence track", () => {
    expect(cut(MAIN + O(Ti("t", `duration="fill"`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..0
      ! AMBIGUOUS_DURATION t.duration
      "
    `);
  });

  it("a fill alone in the file has nothing to fill, and the video has no length", () => {
    expect(cut(O(Ti("t", `start={1} duration="fill"`), `layout="free"`))).toMatchInlineSnapshot(`
      "
      duration 0
      t title 1..1
      "
    `);
  });

  it("two fills do not feed each other", () => {
    expect(
      cut(M(A("bed", `start={0} duration="fill"`) + A("bed2", `start={2} duration="fill"`))),
    ).toMatchInlineSnapshot(`
      "
      duration 0
      bed audio 0..0 plays music 0..0 x1
      bed2 audio 2..2 plays music 0..0 x1
      "
    `);
  });

  it("a music bed fills the video and plays as much of its file", () => {
    expect(cut(MAIN + M(A("bed", `start={0} duration="fill"`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      bed audio 0..6.4 plays music 0..6.4 x1
      "
    `);
  });

  it("a bed that starts late, from inside its file", () => {
    expect(cut(MAIN + M(A("bed", `start={3} in={10} duration="fill"`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      bed audio 3..6.4 plays music 10..13.4 x1
      "
    `);
  });

  it("a faster bed plays more of its file in the same time", () => {
    expect(cut(MAIN + M(A("bed", `start={0} duration="fill" speed={2}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      bed audio 0..6.4 plays music 0..12.8 x2
      "
    `);
  });

  it("a bed shorter than the video stops where its file does, and the file is told", () => {
    expect(
      cut(
        T(C("a", 0, 12) + C("b", 0, 12) + C("c", 0, 12) + C("d", 0, 12) + C("e", 0, 12) + C("f", 0, 12)) +
          M(A("bed", `start={0} duration="fill"`)),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 72
      a clip 0..12 plays broll 0..12 x1
      b clip 12..24 plays broll 0..12 x1
      c clip 24..36 plays broll 0..12 x1
      d clip 36..48 plays broll 0..12 x1
      e clip 48..60 plays broll 0..12 x1
      f clip 60..72 plays broll 0..12 x1
      bed audio 0..60 plays music 0..60 x1
      ! TRIM_PAST_SOURCE bed.duration
      "
    `);
  });

  it("a bed that starts after everything else has no length and adds none", () => {
    expect(cut(MAIN + M(A("bed", `start={30} duration="fill"`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      bed audio 30..30 plays music 0..0 x1
      "
    `);
  });

  it("match takes another element's length", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="hook" duration={{ match: "hook" }}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..2.9
      "
    `);
  });

  it("match on an element that fills", () => {
    expect(
      cut(
        MAIN +
          O(Ti("t", `start={0} duration={{ match: "bed" }}`), `layout="free"`) +
          M(A("bed", `start={0} duration="fill"`)),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..6.4
      bed audio 0..6.4 plays music 0..6.4 x1
      "
    `);
  });

  it("match through a chain", () => {
    expect(
      cut(
        MAIN +
          O(
            Ti("t", `start={0} duration={{ match: "u" }}`) + Ti("u", `start={0} duration={{ match: "hook" }}`),
            `layout="free"`,
          ),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..2.9
      u title 0..2.9
      "
    `);
  });

  it("match on something that is not in the file", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="hook" duration={{ match: "zz" }}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..0
      ! DANGLING_ANCHOR t.duration
      "
    `);
  });

  it("match on itself", () => {
    expect(cut(MAIN + O(Ti("t", `anchor="hook" duration={{ match: "t" }}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..0
      ! CYCLE t
      "
    `);
  });

  it("two elements that match each other", () => {
    expect(
      cut(
        MAIN +
          O(
            Ti("t", `start={0} duration={{ match: "u" }}`) + Ti("u", `start={0} duration={{ match: "t" }}`),
            `layout="free"`,
          ),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      t title 0..0
      u title 0..0
      ! CYCLE t
      ! CYCLE u
      "
    `);
  });

  it("match is not allowed on a sequence track", () => {
    expect(cut(T(C("a", 0, 2) + `<Clip id="b" src="asset:broll" duration={{ match: "a" }} />`))).toMatchInlineSnapshot(`
      "
      duration 2
      a clip 0..2 plays broll 0..2 x1
      b clip 2..2 plays broll 0..0 x1
      ! AMBIGUOUS_DURATION b.duration
      "
    `);
  });

  it("a duck under a track that is not there is told", () => {
    expect(cut(MAIN + M(A("bed", `start={0} duration="fill" duck={{ under: "zz", to: 0.2 }}`)))).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      bed audio 0..6.4 plays music 0..6.4 x1
      ! UNKNOWN_REF bed.duck.under
      "
    `);
  });
});

describe("cuts by meaning", () => {
  it("from one word to the end of another", () => {
    expect(cut(T(W("a", "word:4", "word:9.end")))).toMatchInlineSnapshot(`
      "
      duration 2.9
      a clip 0..2.9 plays talk 2..4.9 x1
      "
    `);
  });

  it("a single word", () => {
    expect(cut(T(W("a", "word:4", "word:4.end")))).toMatchInlineSnapshot(`
      "
      duration 0.4
      a clip 0..0.4 plays talk 2..2.4 x1
      "
    `);
  });

  it("a word to its own start is no clip", () => {
    expect(cut(T(W("a", "word:4", "word:4")))).toMatchInlineSnapshot(`
      "
      duration 0
      a clip 0..0 plays talk 2..2 x1
      ! TRIM_PAST_SOURCE a.out
      "
    `);
  });

  it("words in the wrong order are no clip", () => {
    expect(cut(T(W("a", "word:9", "word:4")))).toMatchInlineSnapshot(`
      "
      duration 0
      a clip 0..0 plays talk 4.5..4.5 x1
      ! TRIM_PAST_SOURCE a.out
      "
    `);
  });

  it("the first and the last word of the transcript", () => {
    expect(cut(T(W("a", "word:0", "word:39.end")))).toMatchInlineSnapshot(`
      "
      duration 19.9
      a clip 0..19.9 plays talk 0..19.9 x1
      "
    `);
  });

  it("a word past the end of the transcript", () => {
    expect(cut(T(W("a", "word:38", "word:40.end") + C("b", 0, 1)))).toMatchInlineSnapshot(`
      "
      duration 1
      a clip 0..0 plays talk 19..19 x1
      b clip 0..1 plays broll 0..1 x1
      ! UNKNOWN_REF a.out
      ! TRIM_PAST_SOURCE a.out
      "
    `);
  });

  it("a word of a file with no transcript", () => {
    expect(cut(T(`<Clip id="a" src="asset:broll" in="word:1" out="word:2" />` + C("b", 0, 1)))).toMatchInlineSnapshot(`
      "
      duration 1
      a clip 0..0 plays broll 0..0 x1
      b clip 0..1 plays broll 0..1 x1
      ! UNKNOWN_REF a.in
      ! UNKNOWN_REF a.out
      ! TRIM_PAST_SOURCE a.out
      "
    `);
  });

  it("a shot, whole", () => {
    expect(cut(T(`<Clip id="a" src="asset:broll" in="shot:1" out="shot:1.end" />`))).toMatchInlineSnapshot(`
      "
      duration 5
      a clip 0..5 plays broll 4..9 x1
      "
    `);
  });

  it("from one shot into the next", () => {
    expect(cut(T(`<Clip id="a" src="asset:broll" in="shot:0" out="shot:1.end" />`))).toMatchInlineSnapshot(`
      "
      duration 9
      a clip 0..9 plays broll 0..9 x1
      "
    `);
  });

  it("a shot the file does not have", () => {
    expect(
      cut(T(`<Clip id="a" src="asset:broll" in="shot:5" out="shot:5.end" />` + C("b", 0, 1))),
    ).toMatchInlineSnapshot(`
      "
      duration 1
      a clip 0..0 plays broll 0..0 x1
      b clip 0..1 plays broll 0..1 x1
      ! UNKNOWN_REF a.in
      ! UNKNOWN_REF a.out
      ! TRIM_PAST_SOURCE a.out
      "
    `);
  });

  it("a word mixed with seconds", () => {
    expect(cut(T(`<Clip id="a" src="asset:talk" in="word:4" out={6} />`))).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 0..4 plays talk 2..6 x1
      "
    `);
  });

  it("a reference that is not one", () => {
    expect(cut(T(`<Clip id="a" src="asset:talk" in="sentence:4" out={6} />`))).toMatchInlineSnapshot(`
      "
      duration 6
      a clip 0..6 plays talk 0..6 x1
      ! SCHEMA a.in
      "
    `);
  });

  it("the same words in two clips, each placed on its own", () => {
    expect(cut(T(W("a", "word:4", "word:9.end") + W("b", "word:6", "word:12.end")))).toMatchInlineSnapshot(`
      "
      duration 6.3
      a clip 0..2.9 plays talk 2..4.9 x1
      b clip 2.9..6.3 plays talk 3..6.4 x1
      "
    `);
  });
});

describe("time changes inside a clip", () => {
  it("speed keys replace the clip's speed", () => {
    expect(
      cut(
        T(
          `<Clip id="a" src="asset:broll" in={0} out={6}><SpeedKey id="k1" at={0} speed={1} /><SpeedKey id="k2" at={2} speed={2} /></Clip>` +
            C("b", 0, 1),
        ),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 4.5
      a clip 0..3.5 plays broll 0..6 x1
      k1 speedKey 0..0
      k2 speedKey 2..2
      b clip 3.5..4.5 plays broll 0..1 x1
      "
    `);
  });

  it("a freeze lengthens the clip by its hold", () => {
    expect(
      cut(
        T(
          `<Clip id="a" src="asset:broll" in={0} out={4}><Freeze id="f" at={1} start={1} duration={2} /></Clip>` +
            C("b", 0, 1),
        ),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 7
      a clip 0..6 plays broll 0..4 x1
      f freeze 1..3
      b clip 6..7 plays broll 0..1 x1
      "
    `);
  });

  it("two freezes add up", () => {
    expect(
      cut(
        T(
          `<Clip id="a" src="asset:broll" in={0} out={4}><Freeze id="f" at={1} start={1} duration={2} /><Freeze id="g" at={3} start={3} duration={1} /></Clip>`,
        ),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 7
      a clip 0..7 plays broll 0..4 x1
      f freeze 1..3
      g freeze 3..4
      "
    `);
  });

  it("a word of a clip with a freeze cannot be anchored to yet", () => {
    expect(
      cut(
        T(
          `<Clip id="hook" src="asset:talk" in="word:4" out="word:9.end"><Freeze id="f" at={1} start={1} duration={2} /></Clip>`,
        ) + O(Ti("t", `anchor="hook" at="word:6" duration={1}`)),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 4.9
      hook clip 0..4.9 plays talk 2..4.9 x1
      f freeze 1..3
      t title 0..1
      ! UNSUPPORTED_ANCHOR t.at
      "
    `);
  });

  it("a transition into a clip with a freeze uses the lengthened clip", () => {
    expect(
      cut(
        T(
          C("a", 0, 2) +
            X("x", 1) +
            `<Clip id="b" src="asset:broll" in={0} out={1}><Freeze id="f" at={0.5} start={0.5} duration={2} /></Clip>`,
        ),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 4
      a clip 0..2 plays broll 0..2 x1
      x transition 1..2 joins a>b
      b clip 1..4 plays broll 0..1 x1
      f freeze 1.5..3.5
      "
    `);
  });
  it("a freeze on the clip's last frame holds it", () => {
    expect(
      cut(
        T(
          `<Clip id="a" src="asset:broll" in={0} out={4}><Freeze id="f" at={4} start={4} duration={2} /></Clip>` +
            C("b", 0, 1),
        ),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 7
      a clip 0..6 plays broll 0..4 x1
      f freeze 4..6
      b clip 6..7 plays broll 0..1 x1
      "
    `);
  });

  it("a freeze written after the clip has ended never holds, and is told", () => {
    expect(
      cut(
        T(
          `<Clip id="a" src="asset:broll" in={0} out={1}><Freeze id="f" at={0.5} start={9} duration={8} /></Clip>` +
            C("b", 0, 1),
        ),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 2
      a clip 0..1 plays broll 0..1 x1
      f freeze 9..17
      b clip 1..2 plays broll 0..1 x1
      ! INVALID_TIME_RANGE f.start
      "
    `);
  });

  it("a second freeze is reached because the first one lengthened the clip", () => {
    expect(
      cut(
        T(
          `<Clip id="a" src="asset:broll" in={0} out={2}><Freeze id="f" at={1} start={1} duration={3} /><Freeze id="g" at={2} start={5} duration={1} /></Clip>`,
        ),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 6
      a clip 0..6 plays broll 0..2 x1
      f freeze 1..4
      g freeze 5..6
      "
    `);
  });

  it("a freeze of no length is refused and holds nothing", () => {
    expect(
      cut(T(`<Clip id="a" src="asset:broll" in={0} out={2}><Freeze id="f" at={1} start={1} duration={0} /></Clip>`)),
    ).toMatchInlineSnapshot(`
      "
      duration 2
      a clip 0..2 plays broll 0..2 x1
      f freeze 1..1
      ! SCHEMA f.duration
      "
    `);
  });

  it("a speed key the schema refuses takes no part in the ramp", () => {
    expect(
      cut(
        T(
          `<Clip id="a" src="asset:broll" in={0} out={4}><SpeedKey id="k1" at={0} speed={2} /><SpeedKey id="k2" at={1} speed={0} /></Clip>`,
        ),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 2
      a clip 0..2 plays broll 0..4 x1
      k1 speedKey 0..0
      k2 speedKey 1..1
      ! SCHEMA k2.speed
      "
    `);
  });

  it("a speed key written past the clip's end does not lengthen the video", () => {
    expect(
      cut(
        T(
          `<Clip id="a" src="asset:broll" in={0} out={2}><SpeedKey id="k1" at={0} speed={1} /><SpeedKey id="k2" at={30} speed={1} /></Clip>`,
        ),
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 2
      a clip 0..2 plays broll 0..2 x1
      k1 speedKey 0..0
      k2 speedKey 30..30
      "
    `);
  });
});

describe("captions and markers", () => {
  it("captions follow the words the cut plays", () => {
    expect(cut(MAIN + `<Captions id="cap" src="asset:talk" />`)).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      cap captions 0..6.4
      cap-1 caption 0..2.9
      "
    `);
  });

  it("captions over a cut that plays the same words twice", () => {
    expect(
      cut(
        T(W("a", "word:4", "word:9.end") + W("b", "word:6", "word:12.end")) + `<Captions id="cap" src="asset:talk" />`,
      ),
    ).toMatchInlineSnapshot(`
      "
      duration 6.3
      a clip 0..2.9 plays talk 2..4.9 x1
      b clip 2.9..6.3 plays talk 3..6.4 x1
      cap captions 0..6.3
      cap-1 caption 0..2.9
      cap-2 caption 2.9..6.3
      "
    `);
  });

  it("captions of a file the cut does not play", () => {
    expect(cut(T(C("a", 0, 2)) + `<Captions id="cap" src="asset:talk" />`)).toMatchInlineSnapshot(`
      "
      duration 2
      a clip 0..2 plays broll 0..2 x1
      cap captions 0..2
      "
    `);
  });

  it("captions of a faster clip", () => {
    expect(
      cut(T(W("a", "word:4", "word:9.end", "speed={2}")) + `<Captions id="cap" src="asset:talk" />`),
    ).toMatchInlineSnapshot(`
      "
      duration 1.45
      a clip 0..1.45 plays talk 2..4.9 x2
      cap captions 0..1.45
      cap-1 caption 0..1.45
      "
    `);
  });

  it("captions when a gap delays the speech", () => {
    expect(
      cut(T(G("g", 2) + W("a", "word:4", "word:9.end")) + `<Captions id="cap" src="asset:talk" />`),
    ).toMatchInlineSnapshot(`
      "
      duration 4.9
      g gap 0..2
      a clip 2..4.9 plays talk 2..4.9 x1
      cap captions 0..4.9
      cap-1 caption 2..4.9
      "
    `);
  });

  it("a marker is a point, and one past the end does not lengthen the video", () => {
    expect(cut(`<Marker id="m1" at={1.5} /><Marker id="m2" at={99} />` + MAIN)).toMatchInlineSnapshot(`
      "
      duration 6.4
      hook clip 0..2.9 plays talk 2..4.9 x1
      x1 transition 2.4..2.9 joins hook>b
      b clip 2.4..6.4 plays broll 0..4 x1
      m1 marker 1.5..1.5
      m2 marker 99..99
      "
    `);
  });
});

describe("tracks", () => {
  it("tracks run side by side from zero, and the longest sets the length", () => {
    expect(cut(T(C("a", 0, 2)) + O(C("b", 0, 5)))).toMatchInlineSnapshot(`
      "
      duration 5
      a clip 0..2 plays broll 0..2 x1
      b clip 0..5 plays broll 0..5 x1
      "
    `);
  });

  it("a hidden or muted track still takes its time", () => {
    expect(
      cut(T(C("a", 0, 5), "hidden muted") + O(Ti("t", `start={0} duration={3}`), `layout="free"`)),
    ).toMatchInlineSnapshot(`
      "
      duration 5
      a clip 0..5 plays broll 0..5 x1
      t title 0..3
      "
    `);
  });

  it("two tracks with one id", () => {
    expect(cut(T(C("a", 0, 1)) + T(C("b", 0, 2)))).toMatchInlineSnapshot(`
      "
      duration 2
      a clip 0..1 plays broll 0..1 x1
      b clip 0..2 plays broll 0..2 x1
      ! DUPLICATE_ID main
      ! MISSING_START a
      "
    `);
  });

  it("an element id used on two tracks", () => {
    expect(cut(T(C("a", 0, 1)) + O(C("a", 0, 2)))).toMatchInlineSnapshot(`
      "
      duration 2
      a clip 0..2 plays broll 0..2 x1
      ! DUPLICATE_ID a
      "
    `);
  });
});
