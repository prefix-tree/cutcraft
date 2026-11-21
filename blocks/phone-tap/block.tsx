// Phone tap: a phone showing a simple screen, a title and a list of rows, or a picture of your own; a fingertip comes
// down on given points at given moments, each press sending out a ripple, and the row it lands on stays selected.
//
// What is meant to change is its props: the screen's title and rows (or a picture), the taps and their moments, where
// the phone sits and its colours. Safe to edit in this copy: the phone's outline and the rows' look. What holds it
// together: each tap is a moment on the clock, the fingertip, the ripple and the selection all read from it, so a
// row lights exactly when the ripple starts.
import { z } from "zod";

import { type BlockMeta, knob, progress, themeCss, useLayer } from "@uberscene/kit";

const tap = z.object({
  x: z.number().min(0).max(1).describe("Where across the screen, 0 at the left edge and 1 at the right"),
  y: z.number().min(0).max(1).describe("Where down the screen, 0 at the top and 1 at the bottom"),
  after: z.number().min(0).describe("Seconds since the layer started at which the finger presses"),
});

export const schema = z.object({
  title: z.string().describe("The screen's heading"),
  rows: z.array(z.string()).max(8).describe("The rows of the list on the screen"),
  image: z.string().optional().describe("A picture to show on the screen instead of the title and rows, as a URL"),
  taps: z.array(tap).max(6).describe("Where and when the finger presses"),
  x: z.number().describe("Left edge of the phone, in pixels"),
  y: z.number().describe("Top edge of the phone, in pixels"),
  height: z.number().positive().describe("Height of the phone, in pixels; its width follows"),
  body: knob.color().describe("Colour of the phone's frame"),
  screen: knob.color().describe("Colour of the screen"),
  row: knob.color().describe("Colour of a row"),
  ink: knob.color().describe("Colour of the title and the rows' text"),
  muted: knob.color().describe("Colour of the rows' second lines"),
  accent: knob.color().describe("Colour of a selected row's edge and of the ripple"),
  font: knob.font().describe("Font of the screen"),
});
export type PhoneTapProps = z.infer<typeof schema>;

export const defaults: PhoneTapProps = {
  title: "Today",
  rows: ["Morning run", "Team stand-up", "Lunch with Ana", "Review the cut", "Call the printer", "Pack for Lisbon"],
  taps: [
    { x: 0.5, y: 0.466, after: 1.2 },
    { x: 0.87, y: 0.1, after: 3.2 },
  ],
  x: 310,
  y: 290,
  height: 940,
  body: "#1b2133",
  screen: "$background",
  row: "$surface",
  ink: "$text",
  muted: "$muted",
  accent: "$accent",
  font: "$body",
};

export const meta: BlockMeta = {
  title: "Phone tap",
  what: "A phone with a simple screen; a fingertip presses given points, each with a ripple, and selects the row it hits.",
  useWhen: ["show where to tap in an app", "a step of a mobile flow", "point at one item of a list on a phone"],
  avoidWhen: ["a real app must be shown exactly: record its screen", "many screens in a row: cut between recordings"],
  pairsWith: ["chat-reveal", "point-list", "narrate"],
  tags: ["phone", "tap", "mobile", "app", "touch", "ui"],
  aspects: ["9:16"],
  length: 5,
  beats: ["taps"],
  poster: 1.9,
};

/** How far a press is: 0 until the finger lands, 1 once its ripple has spread. */
const pressOf = (elapsed: number, at: number) => Math.min(1, Math.max(0, (elapsed - at) / 0.6));

export function PhoneTap(props: Partial<PhoneTapProps>) {
  const p = { ...defaults, ...props };
  const clock = useLayer();
  const enter = progress(clock, { after: 0, over: 0.5, easing: "easeOut" });
  const width = Math.round(p.height * 0.49);
  const bezel = Math.round(p.height * 0.022);
  const screenW = width - 2 * bezel;
  const screenH = p.height - 2 * bezel;
  const radius = Math.round(p.height * 0.075);
  const font = themeCss(p.font);
  const pad = screenW * 0.07;
  const top = screenH * 0.16;
  const rowH = screenH * 0.105;
  const rowGap = screenH * 0.022;
  // The row a tap lands on, if any, is selected from that tap on; the last tap so far wins.
  const landed = p.taps.filter((t) => clock.elapsed >= t.after);
  const last = landed.at(-1);
  const selected = last ? Math.floor((last.y * screenH - top) / (rowH + rowGap)) : -1;
  const selectedRow = last && last.y * screenH >= top && selected < p.rows.length ? selected : -1;
  return (
    <div
      data-name="phone"
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        width,
        height: p.height,
        borderRadius: radius,
        background: themeCss(p.body),
        opacity: enter,
        transform: `translateY(${(1 - enter) * 40}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: bezel,
          top: bezel,
          width: screenW,
          height: screenH,
          borderRadius: radius - bezel,
          overflow: "hidden",
          background: themeCss(p.screen),
          fontFamily: font,
        }}
      >
        {p.image ? (
          <img
            src={p.image}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <>
            <div
              style={{
                position: "absolute",
                left: pad,
                top: screenH * 0.065,
                fontSize: screenW * 0.11,
                fontWeight: 700,
                color: themeCss(p.ink),
              }}
            >
              {p.title}
            </div>
            <div
              style={{
                position: "absolute",
                right: pad,
                top: screenH * 0.075,
                width: screenW * 0.12,
                height: screenW * 0.12,
                borderRadius: "50%",
                background: themeCss(p.row),
              }}
            />
            {p.rows.map((label, i) => {
              const on = i === selectedRow;
              return (
                <div
                  key={label}
                  style={{
                    position: "absolute",
                    left: pad,
                    top: top + i * (rowH + rowGap),
                    width: screenW - 2 * pad,
                    height: rowH,
                    borderRadius: rowH * 0.22,
                    background: themeCss(p.row),
                    boxShadow: on ? `inset 0 0 0 ${Math.max(3, rowH * 0.05)}px ${themeCss(p.accent)}` : "none",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    gap: rowH * 0.25,
                    padding: `0 ${rowH * 0.25}px`,
                  }}
                >
                  <div
                    style={{
                      width: rowH * 0.42,
                      height: rowH * 0.42,
                      borderRadius: "50%",
                      background: themeCss(on ? p.accent : p.muted),
                      opacity: on ? 1 : 0.5,
                      flex: "none",
                    }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: rowH * 0.08 }}>
                    <div style={{ fontSize: rowH * 0.3, fontWeight: 600, color: themeCss(p.ink) }}>{label}</div>
                    <div
                      style={{
                        width: (screenW - 2 * pad) * (0.3 + 0.12 * (i % 3)),
                        height: rowH * 0.1,
                        borderRadius: rowH * 0.05,
                        background: themeCss(p.muted),
                        opacity: 0.45,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </>
        )}
        {p.taps.map((t, i) => {
          // The fingertip shows from a little before the press to a little after; the ripple starts on the press.
          const since = clock.elapsed - t.after;
          if (since < -0.45 || since > 0.9) return null;
          const press = pressOf(clock.elapsed, t.after);
          const near = Math.min(1, Math.max(0, (since + 0.45) / 0.35));
          const leave = Math.min(1, Math.max(0, (since - 0.5) / 0.4));
          const finger = screenW * 0.16 * (since < 0 ? 1.15 - 0.15 * near : 1);
          const cx = t.x * screenW;
          const cy = t.y * screenH;
          return (
            <div key={i}>
              {press > 0 ? (
                <div
                  style={{
                    position: "absolute",
                    left: cx,
                    top: cy,
                    width: finger * (1 + 2.2 * press),
                    height: finger * (1 + 2.2 * press),
                    transform: "translate(-50%, -50%)",
                    borderRadius: "50%",
                    border: `${Math.max(2, finger * 0.08)}px solid ${themeCss(p.accent)}`,
                    opacity: 1 - press,
                  }}
                />
              ) : null}
              <div
                style={{
                  position: "absolute",
                  left: cx,
                  top: cy,
                  width: finger,
                  height: finger,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.55)",
                  boxShadow: "0 0 0 3px rgba(255, 255, 255, 0.25)",
                  opacity: near * (1 - leave),
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
