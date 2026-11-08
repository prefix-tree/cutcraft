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

- **The loop.** Add the media to the manifest with `cutcraft add` (transcripts included), write `video.tsx`, check
  it with `--check-layout`, look at stills with `--still`, then render with `--out`, and with `--props` for variants.
- **The file.** Its shape, `schema` and `defaults`, and the rules an editor relies on: literal ids, cuts on words and
  shots, anchors, transitions between clips, captions that follow the clips.
- **The look.** A theme first, tokens instead of literal colours, presets for text, the ready-made components, effects
  in the order a colourist works, and free code in a `<Layer>` drawn from the video's time.
- **How to edit.** The brief first, the spine of the interview before anything else, pauses inside clips, and a
  checklist before handing over.

Its reference files, every element, effect, transition and component with its props, and what renders, are generated
from CutCraft's code, so they match the version on the main branch.

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
