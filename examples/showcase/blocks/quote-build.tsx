// Quote build: a quotation that arrives a word at a time, its key words in the accent with a mark drawn under them,
// then the name of who said it. A large opening mark sets it up before the first word.
//
// What is meant to change is its props: the quote, the words to stress, who said it, when it starts, how fast it
// builds, where it sits and its colours. Safe to edit in this copy: the type and the mark under stressed words. What
// holds it together: each word's arrival is its place in the quote over the pace, so the build and a narration read
// at the same speed, and the name always follows the last word.
import { z } from "zod";

import { type BlockMeta, knob, progress, themeCss, useLayer } from "@uberscene/kit";

export const schema = z.object({
  text: z.string().min(1).describe("The quotation, without quote marks"),
  stress: z.array(z.string()).describe("Words to stress, as written in the quote; punctuation around them is ignored"),
  author: z.string().describe("Who said it; empty for none"),
  role: z.string().describe("A line under the name, such as a title or a year; empty for none"),
  after: z.number().min(0).describe("Seconds since the layer started at which the first word arrives"),
  wordsPerSecond: z.number().positive().describe("How fast the words arrive"),
  x: z.number().describe("Left edge of the quote, in pixels"),
  y: z.number().describe("Top edge of the quote, in pixels"),
  width: z.number().positive().describe("Width of the quote, in pixels"),
  size: z.number().positive().describe("Size of the quote's words, in pixels"),
  ink: knob.color().describe("Colour of the words"),
  accent: knob.color().describe("Colour of the stressed words, their marks and the opening mark"),
  muted: knob.color().describe("Colour of the role line"),
  font: knob.font().describe("Font of the quote"),
  weight: z.number().int().min(100).max(900).describe("Weight of the quote's words"),
});
export type QuoteBuildProps = z.infer<typeof schema>;

export const defaults: QuoteBuildProps = {
  text: "The first draft is only you telling yourself the story.",
  stress: ["yourself", "story"],
  author: "A writer's rule",
  role: "on drafts",
  after: 0.6,
  wordsPerSecond: 3.2,
  x: 150,
  y: 600,
  width: 780,
  size: 72,
  ink: "$text",
  accent: "$accent",
  muted: "$muted",
  font: "$heading",
  weight: 700,
};

export const meta: BlockMeta = {
  title: "Quote build",
  what: "A quotation arrives word by word, its key words stressed in the accent, then the name of who said it.",
  useWhen: ["a line worth reading on screen", "a testimonial or a quote from an interview", "the thesis of a video"],
  avoidWhen: [
    "more than about thirty words: split it",
    "words that must match a voice exactly: time them with captions",
  ],
  pairsWith: ["narrate", "chat-reveal"],
  tags: ["quote", "text", "testimonial", "typography", "words"],
  aspects: ["9:16"],
  length: 5,
  beats: ["after"],
  poster: 4.6,
};

const bare = (word: string) => word.replace(/[^\p{L}\p{N}'-]/gu, "").toLowerCase();

export function QuoteBuild(props: Partial<QuoteBuildProps>) {
  const p = { ...defaults, ...props };
  const clock = useLayer();
  const words = p.text.split(/\s+/).filter(Boolean);
  const stressed = new Set(p.stress.map(bare));
  const every = 1 / p.wordsPerSecond;
  const end = p.after + words.length * every;
  const mark = progress(clock, { after: Math.max(0, p.after - 0.5), over: 0.45, easing: "easeOut" });
  const name = progress(clock, { after: end + 0.25, over: 0.45, easing: "easeOut" });
  const font = themeCss(p.font);
  return (
    <div
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        width: p.width,
        fontFamily: font,
      }}
    >
      <div
        data-name="mark"
        style={{
          fontSize: p.size * 2.4,
          lineHeight: 0.8,
          height: p.size * 1.1,
          color: themeCss(p.accent),
          fontWeight: 800,
          opacity: mark,
          transform: `translateY(${(1 - mark) * 20}px)`,
        }}
      >
        {"“"}
      </div>
      <div
        data-name="quote"
        style={{
          fontSize: p.size,
          lineHeight: 1.18,
          fontWeight: p.weight,
          color: themeCss(p.ink),
          display: "flex",
          flexWrap: "wrap",
          columnGap: p.size * 0.26,
        }}
      >
        {words.map((word, i) => {
          const at = p.after + i * every;
          const k = progress(clock, { after: at, over: 0.32, easing: "easeOut" });
          const stress = stressed.has(bare(word));
          const line = stress ? progress(clock, { after: at + 0.15, over: 0.4, easing: "easeInOut" }) : 0;
          return (
            <span
              key={`${word}-${i}`}
              style={{
                position: "relative",
                display: "inline-block",
                opacity: k,
                transform: `translateY(${(1 - k) * p.size * 0.35}px)`,
                color: stress ? themeCss(p.accent) : undefined,
              }}
            >
              {word}
              {stress ? (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    bottom: p.size * 0.02,
                    height: p.size * 0.09,
                    width: `${line * 100}%`,
                    borderRadius: p.size * 0.05,
                    background: themeCss(p.accent),
                  }}
                />
              ) : null}
            </span>
          );
        })}
      </div>
      {p.author ? (
        <div
          data-name="author"
          style={{
            marginTop: p.size * 0.7,
            opacity: name,
            transform: `translateY(${(1 - name) * 16}px)`,
            display: "flex",
            alignItems: "center",
            gap: p.size * 0.3,
          }}
        >
          <span style={{ width: p.size * 0.7, height: 4, background: themeCss(p.accent), borderRadius: 2 }} />
          <span style={{ fontSize: p.size * 0.42, fontWeight: 700, color: themeCss(p.ink) }}>{p.author}</span>
          {p.role ? <span style={{ fontSize: p.size * 0.36, color: themeCss(p.muted) }}>{p.role}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
