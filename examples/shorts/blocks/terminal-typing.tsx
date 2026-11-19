// Terminal typing: a terminal window where commands type in a letter at a time after the prompt, and what each prints
// appears line by line beneath it. A block cursor blinks where the next letter goes.
//
// What is meant to change is its props: the commands and their output, when each command starts, how fast it types,
// the prompt, the window's title, size and colours. Safe to edit in this copy: the window's look. What holds it
// together: each line's progress is read from the clock and its start, so lines never overlap, and a scrub back
// shows the terminal exactly as it was.
import { z } from "zod";

import { type BlockMeta, knob, progress, themeCss, useLayer } from "@uberscene/kit";

const step = z.object({
  command: z.string().describe("What is typed after the prompt"),
  output: z.array(z.string()).describe("The lines it prints, in order"),
  after: z.number().min(0).describe("Seconds since the layer started at which it starts typing"),
});

export const schema = z.object({
  steps: z.array(step).min(1).max(6).describe("The commands, in order"),
  prompt: z.string().describe("What comes before each command, such as $ or >"),
  title: z.string().describe("The window's title; empty for none"),
  lettersPerSecond: z.number().positive().describe("How fast a command types"),
  lineGap: z.number().min(0).describe("Seconds between output lines"),
  x: z.number().describe("Left edge of the window, in pixels"),
  y: z.number().describe("Top edge of the window, in pixels"),
  width: z.number().positive().describe("Width of the window, in pixels"),
  height: z.number().positive().describe("Height of the window, in pixels"),
  size: z.number().positive().describe("Size of the text, in pixels"),
  window: knob.color().describe("Colour of the window"),
  bar: knob.color().describe("Colour of the title bar"),
  ink: knob.color().describe("Colour of the commands"),
  output: knob.color().describe("Colour of the output"),
  accent: knob.color().describe("Colour of the prompt and the cursor"),
  font: knob.font().describe("Font of the terminal; a monospaced one"),
});
export type TerminalTypingProps = z.infer<typeof schema>;

export const defaults: TerminalTypingProps = {
  steps: [
    { command: "uberscene blocks --for count", output: ["hundred-cells   a grid that counts"], after: 0.5 },
    {
      command: "uberscene render video.tsx",
      output: ["resolving   12 elements", "drawing     900 frames", "done        video.mp4"],
      after: 2.6,
    },
  ],
  prompt: "$",
  title: "terminal",
  lettersPerSecond: 22,
  lineGap: 0.28,
  x: 160,
  y: 600,
  width: 760,
  height: 440,
  size: 30,
  window: "#0d111c",
  bar: "$surface",
  ink: "$text",
  output: "$muted",
  accent: "$accent",
  font: "$mono",
};

export const meta: BlockMeta = {
  title: "Terminal typing",
  what: "A terminal window: commands type in after a prompt, and their output appears line by line.",
  useWhen: ["show a command and what it does", "a developer tool in action", "install or run steps"],
  avoidWhen: ["output longer than the window: it is not scrolled", "a real tool's exact screen must be shown"],
  pairsWith: ["chat-reveal", "narrate"],
  tags: ["terminal", "code", "command", "typing", "developer", "cli"],
  aspects: ["9:16"],
  length: 5,
  beats: ["steps"],
  poster: 4.8,
};

export function TerminalTyping(props: Partial<TerminalTypingProps>) {
  const p = { ...defaults, ...props };
  const clock = useLayer();
  const enter = progress(clock, { after: 0, over: 0.4, easing: "ease-out" });
  const lineHeight = p.size * 1.5;
  const barHeight = p.title ? p.size * 2 : 0;
  // What each step shows now: how many letters of its command, and how many lines of its output.
  const lines: { text: string; prompt: boolean }[] = [];
  let cursorOn: number | null = null;
  for (const s of p.steps) {
    if (clock.elapsed < s.after) break;
    const typing = (clock.elapsed - s.after) * p.lettersPerSecond;
    const letters = Math.min(s.command.length, Math.floor(typing));
    lines.push({ text: s.command.slice(0, letters), prompt: true });
    cursorOn = lines.length - 1;
    const typedAt = s.after + s.command.length / p.lettersPerSecond;
    if (clock.elapsed < typedAt) break;
    const printed = Math.min(s.output.length, Math.floor((clock.elapsed - typedAt) / p.lineGap));
    for (const line of s.output.slice(0, printed)) lines.push({ text: line, prompt: false });
    if (printed === s.output.length) cursorOn = null;
  }
  // The cursor waits on an empty prompt once a step is done; it blinks twice a second.
  const idle = cursorOn === null;
  if (idle) lines.push({ text: "", prompt: true });
  const blink = Math.floor(clock.elapsed * 2) % 2 === 0;
  const cursorLine = idle ? lines.length - 1 : (cursorOn as number);
  const font = themeCss(p.font);
  return (
    <div
      data-name="window"
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        width: p.width,
        height: p.height,
        background: themeCss(p.window),
        borderRadius: 22,
        overflow: "hidden",
        boxShadow: "0 12px 26px rgba(0, 0, 0, 0.4)",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 24}px)`,
        fontFamily: font,
        fontSize: p.size,
        lineHeight: `${lineHeight}px`,
      }}
    >
      {p.title ? (
        <div
          style={{
            height: barHeight,
            background: themeCss(p.bar),
            display: "flex",
            alignItems: "center",
            padding: `0 ${p.size}px`,
            color: themeCss(p.output),
            fontSize: p.size * 0.75,
            letterSpacing: 2,
          }}
        >
          <span
            style={{
              width: p.size * 0.5,
              height: p.size * 0.5,
              borderRadius: 4,
              background: themeCss(p.accent),
              marginRight: p.size * 0.5,
            }}
          />
          {p.title}
        </div>
      ) : null}
      <div style={{ padding: `${p.size * 0.8}px ${p.size}px`, whiteSpace: "pre" }}>
        {lines.map((line, i) => (
          <div key={i} style={{ color: themeCss(line.prompt ? p.ink : p.output), height: lineHeight }}>
            {line.prompt ? <span style={{ color: themeCss(p.accent) }}>{`${p.prompt} `}</span> : null}
            {line.text}
            {i === cursorLine ? (
              <span
                style={{
                  display: "inline-block",
                  width: p.size * 0.6,
                  height: p.size * 1.1,
                  verticalAlign: "middle",
                  background: themeCss(p.accent),
                  opacity: idle && !blink ? 0 : 1,
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
