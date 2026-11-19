// Hundred cells: a grid of cells that fills, each a shade nearer the accent than the last, with the count beside it;
// then one more arrives, ringed. Made for "do it a hundred times" and any count that is the point of the line.
//
// What is meant to change is its props: the count, the label, the colours, where it sits and when it fills. They are
// set where it is placed, so two placements differ without two copies. Safe to edit in this copy: the shapes and the
// type. What holds the motion together: the cells fill in reading order on one eased progress, and the count is read
// from that same progress, so the number and the cells always agree.
import type { ReactNode } from "react";
import { z } from "zod";

import { type BlockMeta, Cells, knob, themeCss, useProgress, type When } from "@uberscene/kit";

const when = z
  .object({
    at: z.number().optional().describe("Seconds of the video, from a narration cue"),
    after: z.number().optional().describe("Seconds since the layer started"),
    over: z.number().positive().optional().describe("How long it takes, in seconds"),
  })
  .describe("When it happens: at a second of the video, or so long after the layer starts");

export const schema = z.object({
  total: z.number().int().min(1).max(400).describe("How many cells fill"),
  columns: z.number().int().min(1).max(40).describe("Cells to a row"),
  label: z.string().describe("The word under the count"),
  extra: z.boolean().describe("Whether one more cell arrives after the rest, ringed"),
  fill: when.describe("When the cells fill"),
  next: when.describe("When the extra cell arrives"),
  x: z.number().describe("Left edge of the grid, in pixels"),
  y: z.number().describe("Top edge of the grid, in pixels"),
  cell: z.number().positive().describe("A cell's size, in pixels"),
  gap: z.number().min(0).describe("Pixels between cells"),
  accent: knob.color().describe("Colour of the last cells, the extra cell and the label"),
  from: knob.color().describe("Colour of the first cell"),
  dim: knob.color().describe("Colour of a cell not yet filled"),
  ink: knob.color().describe("Colour of the count and of the ring"),
  font: knob.font().describe("Font of the count and the label"),
  weight: z.number().int().min(100).max(900).describe("Weight of the count and the label"),
});
export type HundredCellsProps = z.infer<typeof schema>;

export const defaults: HundredCellsProps = {
  total: 100,
  columns: 20,
  label: "VIDEOS",
  extra: true,
  fill: { after: 0.3, over: 2 },
  next: { after: 3.4, over: 0.3 },
  x: 120,
  y: 840,
  cell: 26,
  gap: 6,
  accent: "$accent",
  from: "#8fa0d0",
  dim: "$surface",
  ink: "$text",
  font: "$heading",
  weight: 800,
};

export const meta: BlockMeta = {
  title: "Hundred cells",
  what: "A grid of cells fills one by one, each a shade nearer the accent, with the count beside it; then one more arrives.",
  useWhen: ["count up to a big number", "show a hundred tries, days or videos", "make progress visible"],
  avoidWhen: ["the number is a measurement, not a count of things: use CountUp", "fewer than ten things"],
  pairsWith: ["point-list", "narrate"],
  tags: ["count", "progress", "grid", "number", "data"],
  aspects: ["9:16"],
  length: 4,
  beats: ["fill", "next"],
  poster: 4.2,
};

/** A moment as the kit's timing takes it, with the length it has when none is given. */
function moment(m: HundredCellsProps["fill"], over: number): When {
  return {
    over: m.over ?? over,
    ...(m.at !== undefined ? { at: m.at } : {}),
    ...(m.after !== undefined ? { after: m.after } : {}),
  };
}

/** A colour between two: exact for two hex colours, `color-mix` for anything else (a theme token, a name). */
function mix(a: string, b: string, k: number): string {
  const hex = /^#[0-9a-f]{6}$/i;
  if (hex.test(a) && hex.test(b)) {
    const part = (h: string, i: number) => Number.parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
    const at = (i: number) => Math.round(part(a, i) + (part(b, i) - part(a, i)) * k);
    return `rgb(${at(0)}, ${at(1)}, ${at(2)})`;
  }
  return `color-mix(in srgb, ${themeCss(b)} ${Math.round(k * 100)}%, ${themeCss(a)})`;
}

function Board({ ink, children }: { ink: string; children: ReactNode }) {
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", color: ink }}
      role="img"
    >
      <title>graphic</title>
      {children}
    </svg>
  );
}

export function HundredCells(props: Partial<HundredCellsProps>) {
  const p = { ...defaults, ...props };
  const accent = themeCss(p.accent);
  const ink = themeCss(p.ink);
  const type = { fontFamily: themeCss(p.font), fontWeight: p.weight, fill: ink } as const;
  const rows = Math.ceil(p.total / p.columns);
  const filled = Math.round(p.total * useProgress({ ...moment(p.fill, 2), easing: "ease-in-out" }));
  const next = useProgress(moment(p.next, 0.3));
  const arrived = p.extra ? next : 0;
  const pitch = p.cell + p.gap;
  const right = p.x + p.columns * pitch - p.gap;
  const below = p.y + rows * pitch;
  return (
    <Board ink={ink}>
      {Array.from({ length: rows }, (_, row) => (
        <Cells
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are a fixed stack, told apart by their place.
          key={row}
          {...(row === 0 ? { name: "grid" } : {})}
          count={Math.min(p.columns, p.total - row * p.columns)}
          x={p.x}
          y={p.y + row * pitch}
          size={p.cell}
          gap={p.gap}
          radius={6}
          fill={(i) => {
            const n = row * p.columns + i;
            return n < filled ? mix(p.from, p.accent, n / Math.max(1, p.total - 1)) : themeCss(p.dim);
          }}
        />
      ))}
      {p.extra ? (
        // The one after the rest: the next row's first cell, ringed.
        <g data-name="next" opacity={next}>
          <rect x={p.x + 8} y={below} width={p.cell} height={p.cell} rx={6} fill={accent} />
          <rect
            x={p.x + 3}
            y={below - 5}
            width={p.cell + 10}
            height={p.cell + 10}
            rx={10}
            fill="none"
            stroke={ink}
            strokeWidth={3}
          />
        </g>
      ) : null}
      <g data-name="count">
        <text {...type} x={right + 64} y={p.y + 62} fontSize={60} textAnchor="middle" dominantBaseline="central">
          {filled + Math.round(arrived)}
        </text>
        <text
          {...type}
          x={right + 64}
          y={p.y + 128}
          fontSize={24}
          fill={accent}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {p.label}
        </text>
      </g>
    </Board>
  );
}
