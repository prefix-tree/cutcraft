# Shorts

Short vertical explainers. Each is one file, and each answers one "how does that work?" question in 20 seconds to
two minutes, at 1080x1920, with its words kept inside the area TikTok, Reels and Shorts leave clear.

Three are pure animation with no footage: everything on screen is drawn by code on the video's clock. One is a talking
head cut out of a real interview, with captions and cards timed by the words of its transcript.

| File | What it explains |
|---|---|
| `game-lighting.tsx` | How game lighting fakes it: a small room with no lighting, then direct light, shadows, bounce light, ambient occlusion and bloom switched on one at a time. |
| `lunar-eclipse.tsx` | Why there is no lunar eclipse every month, and why the Moon turns red: five cuts from a NASA interview, with word-timed captions, type cards, badges and a quotation. Footage credit in `media/CREDITS.md`. |
| `one-pixel.tsx` | How a game lights a room, told by following one dot of the screen: why real light is too slow to copy, then five cheats (facing the lamp, the shadow, the bounce, the corners, the glow). Two stages: a 3D room, and the same room cut in half as a diagram with a brightness number on every dot. Subtitles only, timed word by word for a voice to be added. A first cut. |
| `lighting-explained.tsx` | Every lighting trick a game uses, one at a time, each on the same small stage shown twice: without the trick on top, with it underneath. The opening and the first three so far: direct light, the shadow map, ambient light. |

## On the documentation site

`game-lighting.tsx` is on the [examples page](https://cutcraft.prefixtree.xyz/examples#how-game-lighting-fakes-it).
Its video and poster in `docs/public/shorts` are made by:

```sh
pnpm --filter @cutcraft/example-shorts render
```

`one-pixel.tsx` is there as well, [under its own heading](https://cutcraft.prefixtree.xyz/examples#one-pixel).
`lunar-eclipse.tsx` is there too, [with its sound](https://cutcraft.prefixtree.xyz/examples#a-talking-head-with-cards).

## Render one

The two animations need no media. The interview reads its clip from `media/`:

```sh
npx cutcraft lunar-eclipse.tsx --manifest manifest.json --media media --out out/lunar-eclipse.mp4
```

```sh
npx cutcraft game-lighting.tsx --manifest manifest.json --out out/game-lighting.mp4
```

Look at it without rendering the whole film:

```sh
npx cutcraft look game-lighting.tsx --manifest manifest.json --at 1.5,8,12.5,17,21.5,25.5 --out look.png
```

The words and the two wall colours are props, so a variant needs no edit:

```sh
npx cutcraft game-lighting.tsx --manifest manifest.json \
  --props '{"hook":"Your favourite game is lying to you.","warmWall":"#7a4fd6","coolWall":"#e0a526"}' \
  --out out/game-lighting-purple.mp4
```

## How game-lighting.tsx is made

- The room is a `<Three>` scene: plain three.js in `setup`, and a function of the layer's time that sets every light
  and the camera for each frame.
- Each trick is a number from 0 to 1 worked out from the time. Direct light, shadows and bounce light are the
  strengths of lights. Ambient occlusion is baked into the vertices once, in `setup`, and faded in.
- Bloom is not in the scene: it is a `glow` `<Effect>` on the `<Three>` tag, with keyframes.
- The words are ordinary subtitles at the top: a `<Captions>` element with one `<Caption>` per line, each with its
  start and end, so an editor can retime or reword them. They say only how each trick works.
- The row of chips at the bottom is one `<Layer>` with a small React component that reads the video's time.

## How lunar-eclipse.tsx is made

- Every cut is made on a word: `<Clip in="word:5" out="word:19.end">`. The clip is 79 seconds of an interview and
  the film plays five pieces of it.
- The captions come from the transcript (`<Captions src="asset:eclipse">`), with a box behind the word being said.
- Each card line, badge and highlight names the word it comes in on (`at="word:15"`) and lasts until its clip ends
  (`duration={{ until: "why" }}`). No time is typed as seconds, so trimming a clip moves everything said over it.
- The speaker is shown two ways from one square source: filling the frame, and in a box under a card with a `Frame`
  drawn round it. Both are a `transform` on the clip.
- The accent colour and the opening lines are props.
