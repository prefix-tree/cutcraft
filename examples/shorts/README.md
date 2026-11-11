# Shorts

Short vertical explainers made of pure animation. Each is one file with no footage: everything on screen is drawn by
code on the video's clock, so the export shows exactly what the preview shows.

Each film answers one "how does that work?" question in 20 seconds to two minutes, at 1080x1920, with its words kept inside
the area TikTok, Reels and Shorts leave clear. It ends as it begins, so it loops.

| File | What it explains |
|---|---|
| `game-lighting.tsx` | How game lighting fakes it: a small room with no lighting, then direct light, shadows, bounce light, ambient occlusion and bloom switched on one at a time. |
| `lighting-explained.tsx` | Every lighting trick a game uses, one at a time, each on the same small stage shown twice: without the trick on top, with it underneath. The opening and the first three so far: direct light, the shadow map, ambient light. |

## Render one

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
