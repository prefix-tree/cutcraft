// Ranked list: a short ranking of rows, each with its place, its name, a bar and a value. When the values change, the
// rows slide to their new places and the bars and numbers follow, so a reordering reads at a glance.
//
// What is meant to change is its props: the rows and their values at each step, the moments the values change, the
// title and the colours. Safe to edit in this copy: the row's look and the number format. What holds it together:
// a row's place, its bar and its number are all read from one eased progress between two steps, so they never
// disagree mid-move.
import { z } from "zod";

import { type BlockMeta, knob, progress, themeCss, useLayer } from "@uberscene/kit";

const row = z.object({
  label: z.string().describe("The row's name"),
  values: z.array(z.number()).min(1).describe("Its value at each step: the first from the start, then one per change"),
  color: knob.color().optional().describe("Its bar's colour; default the bar colour, or the accent when it leads"),
});

export const schema = z.object({
  title: z.string().describe("The line above the ranking; empty for none"),
  rows: z.array(row).min(2).max(8).describe("The rows, in any order: they are placed by their values"),
  changes: z
    .array(z.number().min(0))
    .describe("Seconds since the layer started at which the values move to their next step"),
  over: z.number().positive().describe("How long a change takes, in seconds"),
  suffix: z.string().describe("Written after every value, such as % or k"),
  decimals: z.number().int().min(0).max(3).describe("Digits after the point in the values"),
  x: z.number().describe("Left edge of the ranking, in pixels"),
  y: z.number().describe("Top edge of the ranking, in pixels"),
  width: z.number().positive().describe("Width of the ranking, in pixels"),
  rowHeight: z.number().positive().describe("Height of a row, in pixels"),
  gap: z.number().min(0).describe("Pixels between rows"),
  accent: knob.color().describe("Colour of the leader's bar and place"),
  bar: knob.color().describe("Colour of the other bars"),
  track: knob.color().describe("Colour behind each bar"),
  ink: knob.color().describe("Colour of the names, the values and the title"),
  muted: knob.color().describe("Colour of the places other than the first"),
  font: knob.font().describe("Font of the whole ranking"),
  weight: z.number().int().min(100).max(900).describe("Weight of the names and values"),
});
export type RankedListProps = z.infer<typeof schema>;

export const defaults: RankedListProps = {
  title: "MOST USED, BY WEEK",
  rows: [
    { label: "Search", values: [62, 58, 51] },
    { label: "Maps", values: [44, 49, 47] },
    { label: "Notes", values: [31, 52, 64] },
    { label: "Music", values: [57, 41, 38] },
    { label: "Mail", values: [22, 27, 29] },
  ],
  changes: [1.6, 3.4],
  over: 0.7,
  suffix: "%",
  decimals: 0,
  x: 150,
  y: 560,
  width: 780,
  rowHeight: 92,
  gap: 18,
  accent: "$accent",
  bar: "$primary",
  track: "$surface",
  ink: "$text",
  muted: "$muted",
  font: "$heading",
  weight: 700,
};

export const meta: BlockMeta = {
  title: "Ranked list",
  what: "Rows ranked by their values; when the values change, the rows slide to their new places.",
  useWhen: [
    "a ranking that changes: before and after, week by week",
    "show who overtakes whom",
    "a top five whose order is the story",
  ],
  avoidWhen: [
    "a race over many periods: use bar-race",
    "values that do not change: a plain list reads faster",
    "more than eight rows",
  ],
  pairsWith: ["bar-race", "hundred-cells", "narrate"],
  tags: ["ranking", "list", "data", "chart", "leaderboard", "reorder"],
  aspects: ["9:16"],
  length: 5,
  beats: ["changes"],
  poster: 4.6,
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Each row's place at a step, 0 for the first: highest value first, ties kept in the order given. */
function placesAt(rows: RankedListProps["rows"], step: number): number[] {
  const value = (i: number) => {
    const values = rows[i]?.values ?? [];
    return values[Math.min(step, values.length - 1)] ?? 0;
  };
  const order = rows.map((_, i) => i).sort((a, b) => value(b) - value(a) || a - b);
  const places: number[] = [];
  order.forEach((index, place) => {
    places[index] = place;
  });
  return places;
}

export function RankedList(props: Partial<RankedListProps>) {
  const p = { ...defaults, ...props };
  const clock = useLayer();
  // The step it is moving into, and how far: 0 before the first change, then each change in turn.
  const done = p.changes.filter((t) => clock.elapsed >= t + p.over).length;
  const moving = p.changes.findIndex((t) => clock.elapsed >= t && clock.elapsed < t + p.over);
  const step = moving >= 0 ? moving + 1 : done;
  const k = moving >= 0 ? ease((clock.elapsed - (p.changes[moving] as number)) / p.over) : 1;
  const from = placesAt(p.rows, Math.max(0, step - 1));
  const to = placesAt(p.rows, step);
  const valueAt = (r: RankedListProps["rows"][number], s: number) => r.values[Math.min(s, r.values.length - 1)] ?? 0;
  const max = Math.max(...p.rows.flatMap((r) => r.values), 1);
  const font = { fontFamily: themeCss(p.font), fontWeight: p.weight } as const;
  const titleSpace = p.title ? 70 : 0;
  const place = 64;
  const labelWidth = 230;
  const valueWidth = 140;
  const barX = place + labelWidth;
  const barWidth = p.width - barX - valueWidth;
  return (
    <svg width="100%" height="100%" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} role="img">
      <title>ranking</title>
      <g transform={`translate(${p.x} ${p.y})`}>
        {p.title ? (
          <text
            data-name="title"
            {...font}
            x={0}
            y={22}
            fontSize={30}
            letterSpacing={3}
            fill={themeCss(p.ink)}
            opacity={progress(clock, { after: 0, over: 0.4 })}
            dominantBaseline="central"
          >
            {p.title}
          </text>
        ) : null}
        {p.rows.map((r, i) => {
          const a = from[i] as number;
          const b = to[i] as number;
          const at = a + (b - a) * k;
          const value = valueAt(r, Math.max(0, step - 1)) + (valueAt(r, step) - valueAt(r, Math.max(0, step - 1))) * k;
          const leads = Math.round(at) === 0;
          const enter = progress(clock, { after: 0.15 + 0.08 * b, over: 0.4, easing: "ease-out" });
          const y = titleSpace + at * (p.rowHeight + p.gap) + (1 - enter) * 30;
          const fill = r.color ? themeCss(r.color) : themeCss(leads ? p.accent : p.bar);
          return (
            <g key={r.label} data-name={r.label.toLowerCase()} transform={`translate(0 ${y})`} opacity={enter}>
              <text
                {...font}
                x={0}
                y={p.rowHeight / 2}
                fontSize={40}
                fill={themeCss(leads ? p.accent : p.muted)}
                dominantBaseline="central"
              >
                {b + 1}
              </text>
              <text
                {...font}
                x={place}
                y={p.rowHeight / 2}
                fontSize={36}
                fill={themeCss(p.ink)}
                dominantBaseline="central"
              >
                {r.label}
              </text>
              <rect
                x={barX}
                y={p.rowHeight * 0.25}
                width={barWidth}
                height={p.rowHeight * 0.5}
                rx={p.rowHeight * 0.12}
                fill={themeCss(p.track)}
              />
              <rect
                x={barX}
                y={p.rowHeight * 0.25}
                width={Math.max(0, (barWidth * value) / max)}
                height={p.rowHeight * 0.5}
                rx={p.rowHeight * 0.12}
                fill={fill}
              />
              <text
                {...font}
                x={p.width}
                y={p.rowHeight / 2}
                fontSize={36}
                fill={themeCss(p.ink)}
                textAnchor="end"
                dominantBaseline="central"
              >
                {`${value.toFixed(p.decimals)}${p.suffix}`}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
