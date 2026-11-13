# With your agent

CutCraft was built for a model to write: a cut names words and shots instead of seconds, every element has an id a
tool can find, and the command line checks the file like a compiler. The **CutCraft skill** puts all of that in front
of your coding agent, so you can ask for a video in plain words and get a file, stills and a render back.

## Install it

**In Claude Code**, add the repository as a plugin marketplace, then install the plugin:

```
/plugin marketplace add prefix-tree/cutcraft
/plugin install cutcraft@prefix-tree
```

**In another agent**, or in Claude Code without the plugin, copy the skill's folder,
[`plugins/cutcraft/skills/cutcraft`](https://github.com/prefix-tree/cutcraft/tree/main/plugins/cutcraft/skills/cutcraft),
to where the agent reads skills: for Claude Code that is `.claude/skills/cutcraft/` in a project, or
`~/.claude/skills/cutcraft/` for all of them. It follows the open [Agent Skills](https://agentskills.io) format: one
`SKILL.md` and the reference files it links.

The skill's first step installs CutCraft in the project:

```sh
npm install cutcraft @cutcraft/kit react zod
```

## What it teaches

- **The loop.** Add the media to the manifest with `cutcraft add` (transcripts included), write `video.tsx`, read
  the timeline back with `cutcraft inspect`, check it with `--check-layout`, look at a sheet of its frames with
  `cutcraft look`, then render with `--out`, and with `--props` for variants.
- **The file.** Its shape, `schema` and `defaults`, and the rules an editor relies on: literal ids, cuts on words and
  shots, anchors, transitions between clips, captions that follow the clips.
- **The look.** A theme first, tokens instead of literal colours, presets for text, the ready-made components, effects
  in the order a colourist works, and free code in a `<Layer>` drawn from the video's time.
- **How to edit.** The brief first, the spine of the interview before anything else, pauses inside clips, and a
  checklist before handing over.

Its reference files, every element, effect, transition and component with its props, and what renders, are generated
from CutCraft's code, so they match the version on the main branch.

## How the agent looks at a cut

An agent cannot watch a video, so it looks at sheets of frames, each drawn by one command in a few seconds. Every
cell is labelled with its time, its frame and what it is, and a legend printed beside the image says which elements
are on screen in each. The frames are the export's own, so what a sheet shows is what the file renders.

**Skim the cut.** After each stage of an edit, `cutcraft look video.tsx` shows what an editor would scrub through:
the first frame of each clip, both sides and the middle of every transition, and each title once.

[![A contact sheet of ten frames of a cut: each clip's first frame, both sides and the middle of two transitions, and each title, with its time, frame and name under it](/reference/look.jpg)](/reference/look.jpg)

**Follow what just changed.** `--around x1` walks through one transition, or through one title coming in and going
out. Here each moment is also drawn without the title, to see how it leaves over the cut.

[![Ten frames across a wipe between two clips, in pairs: each moment with the title "Cut by words" and without it](/reference/look-around.jpg)](/reference/look-around.jpg)

**Compare with and without.** `--without grade` draws each frame as written and without one effect, side by side, so
the agent can see what a grade, a blur or a title actually does to the picture.

[![Four frames of coffee being poured: at 1 second the two are the same; at 2.5 seconds the one with the grade is warmer and brighter than the one without](/reference/look-without.jpg)](/reference/look-without.jpg)

**Listen to it.** `--listen all` adds a strip of the mix under the frames: its level over time, the words where they
are said, and the silent stretches shaded. The legend gives the peak, the average level and the loudness (LUFS) in numbers, and counts the samples
above full scale, so the agent can tell that the music ducks under the voice, that nothing clips, and that no clip
lost its sound.

[![Three frames of a cut above a strip of its sound: a steady tone for two seconds with three words marked on it, two seconds of shaded silence, then a louder tone to the end](/reference/look-listen.png)](/reference/look-listen.png)

Looking again is nearly free. Every frame drawn is kept beside the file, under a key made from what draws it, so
after an edit only the frames that changed are drawn again: an agent can look after every step.

Before any picture, `cutcraft inspect` reads the same timeline back as text, with no browser at all. The
[CLI reference](/reference/cli#look) has every option of both.

## Ask for a video

Put the media in a folder, with a transcript beside each recording (`talk.json` from Whisper, or `talk.srt`), and ask
for the video the way you would brief an editor:

> Make a 30 second vertical clip from talk.mp4 for Reels. Open on the sentence about shipping on Fridays, keep only
> the best take of each line, add karaoke captions and a lower third with my name, Maya Chen, Founder. Put the name
> in the schema so I can change it.

The agent adds the media, writes the file, checks it, renders stills of each cut and graphic to look at, fixes what it
sees, and renders `video.mp4`. You can then drag a clip in an editor or ask for a change in words: either way the
change lands in the same file, where the next edit can read it.

[A launch video, line by line](./writing-files) follows a file a model wrote from a brief like this one.
