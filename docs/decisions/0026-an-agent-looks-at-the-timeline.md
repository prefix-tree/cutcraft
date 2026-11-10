# 0026. An agent looks at the timeline: inspect, look, and a frame cache

> Status: proposed. Follows from [0004](./0004-the-model-edits-text.md) (the model edits text) and
> [0021](./0021-one-export-engine.md) (one export engine). The work plan at the end is the order it lands in.

## Context

An editor at a timeline looks all the time: parks the playhead on a cut, steps through a title's entrance, toggles a
grade off and on, watches the meters. An agent editing a CutCraft file needs the same, and today it has little.

- `cutcraft --still <seconds>` starts Chrome for every frame. One look costs a few seconds, so an agent looks rarely.
- The player's `captureSheet()` is quick but holds only the canvas: titles, layers and captions are DOM and are
  missing from it, and it needs a page the agent does not have.
- Nothing answers in words what is at a moment: which clips play, which word is spoken, what an effect's value is
  after its keyframes.
- An agent cannot hear, so sound is invisible to it.

Other tools leave this to the person: a preview app to watch, and one cold still per call for the agent. CutCraft can
do better because its resolver already knows every element's seconds, words and values. A timeline here is data, not
the side effect of running a component.

Two ways to get there were set aside before this record (see Alternatives): a browser session kept warm, and a query
language of our own.

## Decision

Three things, all one-shot commands: each call starts, answers and exits.

### 1. `cutcraft inspect`: the timeline as text, with no browser

It runs the resolver in Node and prints, in well under a second:

- with no option, the timeline: each track, each element with its seconds and source range, the words a clip plays,
  its effects, transitions and markers, and the file's errors;
- with `--at <moments>`, what is on screen and heard at each: the active elements, top to bottom, each effect's
  params after keyframes, the transform, the gain, and the word being spoken.

`--json` prints the same as flat rows, one array per kind (`elements`, `effects`, `keyframes`, `words`, `cuts`), each
row carrying its id, its seconds and its frames. Flat rows are what `jq`, a ten-line script against the kit's
`resolve()` or a SQL table take as they are.

### 2. `cutcraft look`: many frames from one browser start

The cost of a look is the browser, so one call takes every moment the agent wants and returns one image:

- `--at <moments>` the frames at those moments;
- `--around <id>` a cut or a transition from just before to just after, or an element entering, fully in and leaving;
- `--without <id>` each frame twice, with and without that effect or element, side by side;
- `--listen <range>` a strip under the frames with the waveform, the loudness and the words of that range;
- with none of these, the moments an editor would skim: the first frame of each clip, both sides of every cut, and
  every overlay fully in.

It writes a contact sheet (`--out sheet.png`), each cell labelled with its seconds, its frame and what it shows, and
prints the same legend as JSON, so a moment found by eye leads back to the element or the word to edit. The frames
come from the export page, so each is the frame the export would write (0021). `--cell <width>` sets the size of a
cell; `--frames <dir>` writes each frame as its own file as well.

### 3. Moments are written in the file's own vocabulary, or as plain time

`--at`, `--around` and `--listen` take a comma-separated list of:

| Form | Meaning |
|---|---|
| `4.5` | seconds of the finished video. A bare number is seconds, as everywhere in a file, never frames. |
| `90f` | frame 90 at the composition's frame rate |
| `2..6/0.5` | a range with a step; without a step, its two ends |
| `hook`, `hook.start`, `hook.mid`, `hook.end` | an element by id: its middle, or the named point |
| `x1` | a transition by id: both sides of the cut |
| `word:14`, `hook@word:14` | where that word is said in the finished video (of the one clip that plays it, or of the named clip) |
| `shot:1`, `marker:intro` | as in the file |

There is no query language. A model writes well what it has read a million times (JSON, `jq`, SQL, TypeScript,
shell) and guesses at a grammar invented last month. The address of a moment is what the model just wrote in the
file, and anything beyond an address is a query over the JSON rows in a language it already knows.

### 4. A frame cache on disk

`look` and `--still` keep each frame in `.cutcraft/cache`, keyed by a hash of what draws it: the resolved props of
every element active at that time, the media files' sizes and modified times, the composition's settings, the frame
size and the CutCraft version. A frame an edit did not touch is read from disk without starting a browser; when every
frame asked for is cached, the call answers in milliseconds. Trimming the fifth clip leaves the frames of the first
four valid. A `<Layer>`'s key includes its component's source text, so changing free code invalidates only the frames
it draws. `--no-cache` skips it, and the cache is safe to delete.

### 5. The skill teaches the loop

The agent skill's "look at it" step becomes: `inspect` to read the timeline and check moments in words, one `look`
after each stage of the edit, and `look --around` or `--without` for the thing just changed.

## Consequences

- An agent can skim a cut the way an editor does, in one call and one image, and can ask about any moment in words
  for almost nothing.
- Every command is stateless: it runs the same in a sandbox, in CI and on a laptop, with no process to start, find or
  clean up.
- The first look after an edit still pays one browser start. The cache makes the second look, and every untouched
  moment, free.
- The cache key must name everything that changes a frame. A key that misses something shows a stale frame, the one
  failure this design can have, so a test renders with and without the cache across each kind of edit and compares.
- `inspect --json`'s rows and the moment forms become public interface: adding a field or a form is cheap, renaming
  one is a breaking change.

## Alternatives

**A browser session kept warm** (`cutcraft view` with a control port, or an MCP server). A frame in a fraction of a
second, and one playhead a person and an agent could share. Set aside: it is a process to start, find, keep alive and
clean up, which is fragile in the sandboxes and one-shot shells agents run in, and it makes results depend on state.
The disk cache gets most of its speed with none of that. An editor's own preview will hold a page open anyway; that
is the editor's concern, not the agent's.

**A query language of our own** for the timeline. Set aside for the reason in section 3.

**SQL built into the CLI.** A timeline is tables with time ranges, and models write SQL well. Deferred: the flat JSON
rows load into SQLite in a line for anyone who wants it, and the CLI stays small.

**A low-resolution proxy render to seek through.** One render, then any frame by seeking. But every edit makes it
stale as a whole, where the frame cache goes stale one frame at a time.

**An MCP server as the way in.** Tools an agent can call directly. Deferred, not refused: plain commands work in
every agent that has a shell, and a server can wrap the same three commands later.

## Work plan

Each step is one pull request with its tests, docs and changeset.

1. **`inspect`.** The text and JSON views, the moment forms (parsed and resolved in the kit, so the editor can use
   them too), `--at`. Tests: each form against a manifest with words and shots; the rows of a known file.
2. **`look`.** Batched frames on the export page, the sheet with its legend, `--around`, `--without` and the default
   skim. Tests in the browser suite: cells match `--still` at the same times; the legend names the right elements.
3. **The frame cache**, for `look` and `--still`. Tests: a hit starts no browser; each kind of edit invalidates the
   frames it changes and no others.
4. **`--listen`** and the skill rewritten around `inspect` and `look`, with the dry run of its loop repeated.
