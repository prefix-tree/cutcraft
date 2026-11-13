# 0028. Tools for narrated explainers

> Status: proposed. Follows from [0018](./0018-free-code-in-a-timeline-skeleton.md) (free code in a timeline
> skeleton) and [0026](./0026-an-agent-looks-at-the-timeline.md) (an agent looks at the timeline). The work plan at
> the end is the order it lands in.

## Context

`examples/shorts/one-pixel.tsx` is a two minute explainer: a narrator's words lead, subtitles show them, and each
thing on screen arrives on the word that names it. It has two stages, a three.js room and a flat diagram of the same
room drawn as SVG in a `<Layer>`. It was written by an agent, in one file of about 950 lines.

Writing it was quick. Judging it was slow, and several things were built by hand inside the film that every film of
this kind will need again:

- **The narration.** The film holds its own small format: a script where `[word]` names a cue and `(1.5)` is a
  pause, a model of speaking pace that gives every word a time, and a rule for breaking the words into subtitle
  lines. Every animation reads the cue times. Nothing in the kit does this.
- **Motion was never seen.** `cutcraft look` shows still frames in seconds. The only way to see movement is the full
  render, which ran at 3 to 6 frames a second: about twelve minutes for the film. Timing, easing and transitions were
  judged from stills.
- **Labels over a 3D scene.** The labels are drawn over the three.js scene, so the film works out by hand where the
  lamp and the shadow land on the frame for the camera's position at each moment.
- **The diagram.** Every ray, pin, leader line, numbered cell and counting number is raw SVG with its own easing.
- **Placement by guessing.** Each thing was placed by writing coordinates, drawing a frame, reading it and adjusting.
  A shot took three or four rounds. The opening was rebuilt three times. The layout check sees overlays but not
  what a layer's own code draws inside it.
- **Studying a reference.** The film's opening was redesigned after taking a reference video apart: its frames at
  short steps and its narration with a time for every word. That took a download tool, a speech-to-text tool and
  hand-written commands.

There was also no voice, so the speaking pace is a guess.

## Decision

Six additions. The author of the project ruled on each; the wording in brackets is that ruling.

### 1. A narration helper in the kit ("a good util")

A function, not an element. It takes a script and returns what the film needs from it:

- the words, each with a start and an end, at a speaking pace the caller can set;
- the subtitle lines, a phrase at a time, ready to give to `<Captions>` as `<Caption>` children with `words`;
- the cues by name, as seconds, for free code and for `start` props.

The script marks a cue by bracketing a word, a pause by a number of seconds in round brackets, and a named moment
with no word in curly brackets, as `one-pixel.tsx` does today. Given a transcript with word times (the manifest's
form), it uses those times in place of the pace model, so a voice recorded later moves the picture with it.

It stays a helper because the film decides what to do with the times. The kit gains no new element and the resolver
no new rule.

### 2. Motion in the command line ("great as a CLI tool to explore with")

Two forms, both one-shot commands like `look`:

- `cutcraft look --motion <range>`: the frames of a short range at a fixed step, in a row, so a move, an entrance or
  a transition is read left to right. `--step` sets the spacing.
- `cutcraft <file> --draft`: a render at a fraction of the size and half the frame rate, for watching. It is marked
  as a draft in its file name and is never what `--out` writes by default.

### 3. A label pinned to a point in a 3D scene

A way to say "this label points at that place in the `<Three>` scene" and have it follow the camera. The scene
publishes where named points land on the frame at each time; a label component reads that. The film stops carrying
projection arithmetic.

### 4. Building blocks for diagrams

A small set of parts for free code in a `<Layer>`, each driven by a time or a cue: a line that draws itself from one
point to another, a label with a leader line, a number that counts to a value, a row of cells with values. They are
ordinary React components that read the layer's clock, exported from the kit, in the same spirit as the ready-made
components of [0024](./0024-graphic-kinds-become-components.md).

### 5. Where things landed ("YES")

The first to build. Two parts:

- **A report.** A command that prints, for a moment, where each named thing is on the frame: its box in pixels,
  whether it is inside the frame and inside each safe zone, and what it overlaps. It covers what a layer's own code
  draws, for elements that carry a name (a `data-name` attribute), not only the kit's overlays.
- **A picture.** `cutcraft look --zones <zone>` draws the safe zone and those boxes over each cell.

An author then reads "the label is 40 px outside the TikTok zone on the right" in place of guessing from a frame.

### 6. `cutcraft study`: take a reference apart

Given a video file, it writes a contact sheet of the opening at short steps, a contact sheet of the whole video, and
the cuts it finds. Given a transcript beside the file (the forms `cutcraft add` reads), it adds the words with their
times and the speaking rate.

It works on a file. Fetching a video from a site and turning speech into text stay with the tools people already
have for them; the docs name them.

### 7. Not now: a voice

Text to speech is left out of this record ("no, for this"). The narration helper is built so that a voice's
transcript can replace its timings, which is all a later voice needs from it.

## Consequences

- A narrated explainer becomes a format: a script, a few diagram parts and cues, not a thousand lines of one-off
  code. `one-pixel.tsx` should shrink by more than half when it is rewritten on these.
- An agent can check motion and placement without a person watching, which today it cannot.
- The kit grows: one helper, a handful of diagram parts, one label component. Each needs a reference page, a demo
  and tests, as the components do.
- `look` grows two options and the CLI one command. The frame cache has to key a `--motion` row and the boxes drawn
  by `--zones` so that a look stays cheap.
- Names on elements inside free code are a new convention. Code that does not name its parts is reported as before:
  as one layer.

## Alternatives

**A `<Narration>` element.** The resolver would own the words and the cues. Rejected for now: the film needs the
times in free code, in props and in subtitles alike, and a function serves all three without a new kind of element.
If a second film wants cues as timeline items, this is the next step.

**A preview app to watch motion.** A person could watch; an agent could not, and the agent is the one writing.
`--motion` gives both something to read, and `--draft` gives a person something to watch.

**Labels drawn inside the 3D scene.** They would follow the camera for free, but they take the scene's effects: a
glow on the scene blooms white text. Labels over the scene stay sharp and take the theme's type.

**A full diagram language.** Too much, too early. A few parts that fall out of one film are enough to see what a
second film needs.

**Fetching and transcribing inside `study`.** It would tie CutCraft to sites and models that change, and to network
access an environment may not give. Working on a file keeps the command small and always runnable.

## Work plan

1. **Where things landed** (decision 5): the report, then `--zones` on `look`.
2. **The narration helper** (decision 1), with `one-pixel.tsx` moved onto it.
3. **Motion** (decision 2): `look --motion`, then `--draft`.
4. **The pinned label** (decision 3).
5. **Diagram parts** (decision 4), with `one-pixel.tsx`'s diagram rewritten on them.
6. **`cutcraft study`** (decision 6).

Each is its own pull request with tests and docs. This record changes no code.
