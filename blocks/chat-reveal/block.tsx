// Chat reveal: a short exchange in plain chat bubbles. A message from the person slides up whole; a reply first shows
// three dots while it is being written, then types in word by word.
//
// What is meant to change is its props: the messages, who sends each, when each starts, how fast replies type, where
// the column sits and the colours. Safe to edit in this copy: the bubbles' shape and the dots. What holds it together:
// every bubble's words are counted from the same clock, so a reply is as far along in the export as in the preview.
import type { CSSProperties } from "react";
import { z } from "zod";

import { type BlockMeta, knob, progress, themeCss, useLayer } from "@uberscene/kit";

const message = z.object({
  from: z.enum(["person", "reply"]).describe("Who sends it: the person asking, or the one replying"),
  text: z.string().min(1).describe("What it says"),
  after: z.number().min(0).describe("Seconds since the layer started at which it appears"),
  name: z.string().optional().describe("What the layout check calls it; default message-1, message-2…"),
});

export const schema = z.object({
  messages: z.array(message).min(1).max(8).describe("The messages, in order"),
  thinking: z.number().min(0).describe("Seconds of dots before a reply starts typing"),
  wordsPerSecond: z.number().positive().describe("How fast a reply types, in words a second"),
  label: z.string().describe("A small line above the replies, such as the assistant's name; empty for none"),
  x: z.number().describe("Left edge of the column, in pixels"),
  y: z.number().describe("Top edge of the column, in pixels"),
  width: z.number().positive().describe("Width of the column, in pixels"),
  size: z.number().positive().describe("Size of the text, in pixels"),
  person: knob.color().describe("Colour of the person's bubbles"),
  onPerson: knob.color().describe("Colour of the text in the person's bubbles"),
  reply: knob.color().describe("Colour of the reply bubbles"),
  ink: knob.color().describe("Colour of the text in the reply bubbles"),
  muted: knob.color().describe("Colour of the dots and the label"),
  font: knob.font().describe("Font of the messages"),
});
export type ChatRevealProps = z.infer<typeof schema>;

export const defaults: ChatRevealProps = {
  messages: [
    { from: "person", text: "Can you turn my notes into a one minute video?", after: 0.3 },
    {
      from: "reply",
      text: "Yes. I'll pick the three strongest lines, time a title to each, and cut to your screen recording when you mention the demo.",
      after: 1.1,
    },
  ],
  thinking: 0.9,
  wordsPerSecond: 7,
  label: "ASSISTANT",
  x: 150,
  y: 560,
  width: 780,
  size: 40,
  person: "$primary",
  onPerson: "$onPrimary",
  reply: "$surface",
  ink: "$text",
  muted: "$muted",
  font: "$body",
};

export const meta: BlockMeta = {
  title: "Chat reveal",
  what: "A chat exchange: a question slides up, a reply shows dots, then types in word by word.",
  useWhen: [
    "show what someone asked and what came back",
    "a product demo of a prompt and its answer",
    "a conversation told as messages",
  ],
  avoidWhen: ["a real app's screen must be shown: record it instead", "long replies: they outgrow the frame"],
  pairsWith: ["terminal-typing", "phone-tap", "narrate"],
  tags: ["chat", "message", "prompt", "reply", "typing", "conversation"],
  aspects: ["9:16"],
  length: 5.5,
  beats: ["messages"],
  poster: 5.6,
};

function Dots({ elapsed, color }: { elapsed: number; color: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 10, padding: "6px 2px" }}>
      {[0, 1, 2].map((i) => {
        const lift = Math.max(0, Math.sin((elapsed * 2.4 - i * 0.18) * Math.PI * 2));
        return (
          <span
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: color,
              transform: `translateY(${-6 * lift}px)`,
              opacity: 0.5 + 0.5 * lift,
            }}
          />
        );
      })}
    </span>
  );
}

export function ChatReveal(props: Partial<ChatRevealProps>) {
  const p = { ...defaults, ...props };
  const clock = useLayer();
  const shown = p.messages.filter((m) => clock.elapsed >= m.after);
  const column: CSSProperties = {
    position: "absolute",
    left: p.x,
    top: p.y,
    width: p.width,
    display: "flex",
    flexDirection: "column",
    gap: p.size * 0.6,
    fontFamily: themeCss(p.font),
    fontSize: p.size,
    lineHeight: 1.32,
  };
  return (
    <div style={column}>
      {shown.map((m, i) => {
        const mine = m.from === "person";
        const since = clock.elapsed - m.after;
        const enter = progress(clock, { after: m.after, over: 0.35, easing: "ease-out" });
        const words = m.text.split(/\s+/);
        const typing = !mine && since < p.thinking;
        const count = mine ? words.length : Math.floor(Math.max(0, since - p.thinking) * p.wordsPerSecond);
        const typed = words.slice(0, Math.min(words.length, Math.max(1, count))).join(" ");
        const index = p.messages.indexOf(m);
        return (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: mine ? "flex-end" : "flex-start",
              opacity: enter,
              transform: `translateY(${(1 - enter) * 28}px)`,
            }}
          >
            {!mine && p.label ? (
              <div
                style={{
                  color: themeCss(p.muted),
                  fontSize: p.size * 0.5,
                  letterSpacing: 3,
                  fontWeight: 700,
                  margin: `0 0 ${p.size * 0.25}px ${p.size * 0.5}px`,
                }}
              >
                {p.label}
              </div>
            ) : null}
            <div
              data-name={m.name ?? `message-${i + 1}`}
              style={{
                maxWidth: mine ? "82%" : "100%",
                padding: `${p.size * 0.45}px ${p.size * 0.6}px`,
                borderRadius: p.size * 0.7,
                borderBottomRightRadius: mine ? p.size * 0.18 : p.size * 0.7,
                borderBottomLeftRadius: mine ? p.size * 0.7 : p.size * 0.18,
                background: themeCss(mine ? p.person : p.reply),
                color: themeCss(mine ? p.onPerson : p.ink),
                fontWeight: mine ? 600 : 400,
              }}
            >
              {typing ? <Dots elapsed={clock.elapsed} color={themeCss(p.muted)} /> : typed}
            </div>
          </div>
        );
      })}
    </div>
  );
}
