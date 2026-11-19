// Character wall: the whole frame a grid of characters, each changing on its own at its own pace, and all of them at
// once on the moments it is given. A living ground for a game, a word or a phrase that sits on top.
//
// What is meant to change is its props: the characters, the grid, the colours, how fast it changes and when it changes
// all at once. Safe to edit in this copy: the type and the pace curve. What holds it together: every cell's character
// is a seeded random number of its cell, its turn and the count of moments passed, so a frame is the same in the
// preview and the export, and scrubbing back shows what was there.
import { z } from "zod";

import { type BlockMeta, knob, progress, random, themeCss, useLayer } from "@uberscene/kit";

export const schema = z.object({
  chars: z.string().min(1).describe("The characters the wall is made of; use a font that has them"),
  columns: z.number().int().min(1).max(40).describe("Cells across the frame"),
  rows: z
    .number()
    .int()
    .min(1)
    .max(80)
    .describe("Rows of cells, centred top to bottom; rows past the frame run off it"),
  color: knob.color().describe("Colour of the characters"),
  background: knob.color().describe("Colour behind them"),
  font: knob.font().describe("Font of the characters"),
  weight: z.number().int().min(100).max(900).describe("Weight of the characters"),
  scale: z.number().positive().max(2).describe("A character's size, as a share of its cell"),
  pace: z.number().positive().describe("How slowly the characters change: 1 is the default pace, 2 half as fast"),
  changeAt: z.array(z.number()).describe("Seconds since the layer started at which every character changes at once"),
  dim: z
    .object({
      after: z.number().describe("Seconds since the layer started"),
      over: z.number().positive().describe("How long it takes, in seconds"),
      to: z.number().min(0).max(1).describe("The opacity it ends at"),
    })
    .optional()
    .describe("When the wall fades back, to leave room for what is on top"),
});
export type CharacterWallProps = z.infer<typeof schema>;

export const defaults: CharacterWallProps = {
  chars: "春夏秋冬日月星光年梦声歌诗画书茶酒灯窗桥路城门钟船信纸笔琴棋伞镜糖盐米面",
  columns: 8,
  rows: 15,
  color: "$muted",
  background: "$background",
  font: "$heading",
  weight: 400,
  scale: 0.9,
  pace: 1,
  changeAt: [],
};

export const meta: BlockMeta = {
  title: "Character wall",
  what: "A frame-filling grid of characters, each changing at its own pace, and all at once on the moments given.",
  useWhen: [
    "a living ground behind a game, a word or a phrase",
    "a busy texture of letters or signs",
    "a beat the whole frame reacts to",
  ],
  avoidWhen: ["text that must be read: the wall is texture, not words", "footage under it: it covers the frame"],
  pairsWith: ["narrate", "grid"],
  tags: ["background", "letters", "texture", "chinese", "grid", "ground"],
  aspects: ["9:16"],
  length: 6,
  beats: ["changeAt", "dim"],
  poster: 2.2,
};

export function CharacterWall(props: Partial<CharacterWallProps>) {
  const p = { ...defaults, ...props };
  const clock = useLayer();
  const set = [...p.chars];
  const passed = p.changeAt.filter((t) => t <= clock.elapsed).length;
  const faded = p.dim ? progress(clock, { after: p.dim.after, over: p.dim.over, easing: "ease-out" }) : 0;
  const cells = p.columns * p.rows;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: themeCss(p.background),
        opacity: 1 - (1 - (p.dim?.to ?? 1)) * faded,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          width: "100%",
          aspectRatio: `${p.columns} / ${p.rows}`,
          transform: "translateY(-50%)",
          containerType: "inline-size",
        }}
      >
        {Array.from({ length: cells }, (_, index) => {
          // Each cell keeps its own time: how long it holds a character, and how far into that it starts. So the
          // wall never changes all at once on its own; it does on the moments given.
          const every = p.pace * (0.28 + 2.2 * random("pace", index) ** 2);
          const turn = Math.floor((clock.elapsed + 2.5 * random("late", index)) / every);
          const char = set[Math.floor(random("char", index, turn, passed) * set.length)];
          return (
            <div
              key={index}
              style={{
                position: "absolute",
                left: `${((index % p.columns) * 100) / p.columns}%`,
                top: `${(Math.floor(index / p.columns) * 100) / p.rows}%`,
                width: `${100 / p.columns}%`,
                height: `${100 / p.rows}%`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: themeCss(p.font),
                fontWeight: p.weight,
                fontSize: `${(p.scale * 100) / p.columns}cqw`,
                lineHeight: 1,
                color: themeCss(p.color),
              }}
            >
              {char}
            </div>
          );
        })}
      </div>
    </div>
  );
}
