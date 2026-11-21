// Bar race: horizontal bars that grow and overtake one another over a run of periods, with the period named beside
// them. Only the leaders are shown; a series that climbs into them slides in from below.
//
// What is meant to change is its props: the series and their values per period, the period names, how long each
// period lasts, how many bars show and the colours. Safe to edit in this copy: the bar's look and the period label.
// What holds it together: every bar's length and place come from the same continuous time, so a bar overtaking
// another moves past it smoothly instead of swapping on a frame.
import { z } from "zod";

import { type BlockMeta, knob, progress, themeCss, useLayer } from "@uberscene/kit";

const series = z.object({
  label: z.string().describe("The series' name, written on its bar"),
  values: z.array(z.number()).min(1).describe("Its value in each period, in order"),
  color: knob.color().optional().describe("Its bar's colour; default the next colour of the palette"),
});

export const schema = z.object({
  series: z.array(series).min(2).max(16).describe("The series that race"),
  periods: z.array(z.string()).min(2).describe("The name of each period, such as a year"),
  after: z.number().min(0).describe("Seconds since the layer started at which the race begins"),
  every: z.number().positive().describe("Seconds each period lasts"),
  show: z.number().int().min(2).max(10).describe("How many bars are shown, the leaders"),
  suffix: z.string().describe("Written after every value"),
  x: z.number().describe("Left edge of the race, in pixels"),
  y: z.number().describe("Top edge of the race, in pixels"),
  width: z.number().positive().describe("Width of the longest bar's lane, in pixels"),
  barHeight: z.number().positive().describe("Height of a bar, in pixels"),
  gap: z.number().min(0).describe("Pixels between bars"),
  palette: z.array(knob.color()).min(1).describe("Colours the bars take in turn, unless a series names its own"),
  ink: knob.color().describe("Colour of the names, values and the period"),
  muted: knob.color().describe("Colour of the axis line"),
  font: knob.font().describe("Font of the race"),
  weight: z.number().int().min(100).max(900).describe("Weight of the names and values"),
});
export type BarRaceProps = z.infer<typeof schema>;

export const defaults: BarRaceProps = {
  series: [
    { label: "Bikes", values: [12, 20, 28, 33, 37, 40] },
    { label: "Buses", values: [29, 30, 30, 29, 26, 24] },
    { label: "Trams", values: [6, 10, 15, 21, 27, 38] },
    { label: "Cars", values: [42, 38, 35, 32, 29, 27] },
    { label: "Walking", values: [20, 21, 22, 23, 24, 24] },
    { label: "Scooters", values: [2, 4, 7, 10, 13, 15] },
  ],
  periods: ["2019", "2020", "2021", "2022", "2023", "2024"],
  after: 0.5,
  every: 0.9,
  show: 5,
  suffix: "%",
  x: 150,
  y: 520,
  width: 780,
  barHeight: 84,
  gap: 20,
  palette: ["$accent", "$primary", "$secondary", "#e5677d", "#7bd389", "#b78cff"],
  ink: "$text",
  muted: "$muted",
  font: "$heading",
  weight: 700,
};

export const meta: BlockMeta = {
  title: "Bar race",
  what: "Bars grow and overtake each other period by period, the leaders shown, the period named beside them.",
  useWhen: [
    "how a ranking changed over years or months",
    "a race between options over time",
    "show who rose and who fell",
  ],
  avoidWhen: ["two or three steps only: use ranked-list", "values that never cross: a plain bar chart says it"],
  pairsWith: ["ranked-list", "narrate"],
  tags: ["race", "bars", "chart", "data", "time", "ranking"],
  aspects: ["9:16"],
  length: 5.5,
  beats: ["after"],
  poster: 5.2,
};

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Each series' value at a fractional period, eased between periods. */
function valuesAt(series: BarRaceProps["series"], at: number): number[] {
  const lo = Math.floor(at);
  const k = smooth(at - lo);
  return series.map((s) => {
    const a = s.values[Math.min(lo, s.values.length - 1)] ?? 0;
    const b = s.values[Math.min(lo + 1, s.values.length - 1)] ?? a;
    return a + (b - a) * k;
  });
}

/** Each series' place at a moment, 0 for the leader, ties in the order given. */
function placesOf(values: number[]): number[] {
  const order = values.map((_, i) => i).sort((a, b) => (values[b] as number) - (values[a] as number) || a - b);
  const places: number[] = [];
  order.forEach((index, place) => {
    places[index] = place;
  });
  return places;
}

export function BarRace(props: Partial<BarRaceProps>) {
  const p = { ...defaults, ...props };
  const clock = useLayer();
  const last = p.periods.length - 1;
  const at = Math.min(last, Math.max(0, (clock.elapsed - p.after) / p.every));
  const values = valuesAt(p.series, at);
  // A bar slides to a new place instead of jumping: its place is the average of its places over the last stretch of
  // the race, as if each place change were eased in over that stretch.
  const SAMPLES = 12;
  const WINDOW = 0.3;
  const places = p.series.map(() => 0);
  for (let s = 0; s < SAMPLES; s++) {
    const then = Math.max(0, at - (WINDOW * s) / (SAMPLES - 1));
    placesOf(valuesAt(p.series, then)).forEach((place, i) => {
      places[i] = (places[i] as number) + place / SAMPLES;
    });
  }
  const max = Math.max(...values, 1);
  const font = { fontFamily: themeCss(p.font), fontWeight: p.weight } as const;
  const row = p.barHeight + p.gap;
  const height = p.show * row - p.gap;
  const enter = progress(clock, { after: 0, over: 0.45, easing: "easeOut" });
  const period = p.periods[Math.min(last, Math.round(at))] as string;
  return (
    <svg width="100%" height="100%" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} role="img">
      <title>bar race</title>
      <g transform={`translate(${p.x} ${p.y})`} opacity={enter}>
        <rect data-name="axis" x={0} y={-12} width={4} height={height + 24} rx={2} fill={themeCss(p.muted)} />
        {p.series.map((s, i) => {
          const place = places[i] as number;
          // Bars below the shown ones fade out as they slide past the last place.
          const shown = Math.max(0, Math.min(1, p.show - place));
          if (shown <= 0) return null;
          const value = values[i] as number;
          const length = Math.max(6, ((p.width - 150) * value) / max);
          const color = themeCss(s.color ?? (p.palette[i % p.palette.length] as string));
          const inside = length > 260;
          return (
            <g
              key={s.label}
              data-name={s.label.toLowerCase()}
              transform={`translate(8 ${place * row})`}
              opacity={shown}
            >
              <rect width={length} height={p.barHeight} rx={p.barHeight * 0.18} fill={color} />
              <text
                {...font}
                x={inside ? 22 : length + 18}
                y={p.barHeight / 2}
                fontSize={32}
                fill={inside ? "#0b1020" : themeCss(p.ink)}
                dominantBaseline="central"
              >
                {s.label}
              </text>
              <text
                {...font}
                x={inside ? length + 18 : length + 18 + s.label.length * 19 + 16}
                y={p.barHeight / 2}
                fontSize={30}
                fill={themeCss(p.ink)}
                opacity={0.85}
                dominantBaseline="central"
              >
                {`${Math.round(value)}${p.suffix}`}
              </text>
            </g>
          );
        })}
        <text
          data-name="period"
          {...font}
          x={p.width}
          y={height + 100}
          fontSize={110}
          fill={themeCss(p.ink)}
          opacity={0.9}
          textAnchor="end"
          dominantBaseline="central"
        >
          {period}
        </text>
      </g>
    </svg>
  );
}
