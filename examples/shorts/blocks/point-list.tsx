// Point list: a row of tiles, one for each point of a list, each with a small drawing, a tag and a label. A tile
// arrives on its moment, is lit while it is the one being named, and dims when the next arrives.
//
// What is meant to change is its props: the points (their labels, tags, drawings and moments), the tile size, where
// the row sits and the colours. Safe to edit in this copy: the drawings and the tile's look. What holds it together:
// each tile's light is the difference between its own arrival and the next one's, so exactly one is lit at a time.
import type { ReactNode } from "react";
import { z } from "zod";

import { type BlockMeta, knob, themeCss, useProgress } from "@uberscene/kit";

const ICONS = ["lines", "cuts", "wave", "frame", "type", "none"] as const;
type IconKind = (typeof ICONS)[number];

const point = z.object({
  label: z.string().describe("The word under the tile"),
  tag: z.string().optional().describe("The small text at the tile's top left, such as #2"),
  icon: z.enum(ICONS).describe("The drawing: lines of a script, cuts, a sound wave, a frame, type, or none"),
  at: z.number().optional().describe("When it arrives, in seconds of the video"),
  after: z.number().optional().describe("When it arrives, in seconds since the layer started"),
  name: z.string().optional().describe("What the layout check calls it; default its label in lower case"),
});

export const schema = z.object({
  points: z.array(point).min(1).max(8).describe("The points, in the order they are named"),
  x: z.number().describe("Left edge of the row, in pixels"),
  y: z.number().describe("Top edge of the row, in pixels"),
  width: z.number().positive().describe("A tile's width, in pixels"),
  height: z.number().positive().describe("A tile's height, in pixels"),
  gap: z.number().min(0).describe("Pixels between tiles"),
  accent: knob.color().describe("Colour of the lit tile's edge, the tags and the drawings' highlights"),
  ink: knob.color().describe("Colour of a lit tile's drawing and label"),
  faded: knob.color().describe("Colour a drawing and label dim to once the next point arrives"),
  tile: knob.color().describe("Colour of the tiles"),
  font: knob.font().describe("Font of the tags and labels"),
  weight: z.number().int().min(100).max(900).describe("Weight of the tags and labels"),
});
export type PointListProps = z.infer<typeof schema>;
type Point = z.infer<typeof point>;

export const defaults: PointListProps = {
  points: [
    { label: "SCRIPT", tag: "#1", icon: "lines", after: 0.3 },
    { label: "EDITING", tag: "#2", icon: "cuts", after: 1.5 },
    { label: "VOICE", tag: "#3", icon: "wave", after: 2.7 },
    { label: "THUMBNAIL", tag: "#4", icon: "frame", after: 3.9 },
    { label: "TITLE", tag: "#5", icon: "type", after: 5.1 },
  ],
  x: 120,
  y: 830,
  width: 140,
  height: 170,
  gap: 17,
  accent: "$accent",
  ink: "$text",
  faded: "#7f8bb3",
  tile: "$surface",
  font: "$heading",
  weight: 800,
};

export const meta: BlockMeta = {
  title: "Point list",
  what: "A row of tiles, one per point, each with a small drawing and a label, lit in turn as each point is named.",
  useWhen: [
    "a list of three to six points named one after another",
    "steps, ingredients or improvements as they are said",
  ],
  avoidWhen: ["more than six points: they will not fit a row", "points that need a sentence each: use a card"],
  pairsWith: ["hundred-cells", "narrate"],
  tags: ["list", "steps", "points", "tiles", "icons"],
  aspects: ["9:16"],
  length: 6,
  beats: ["points"],
  poster: 3.2,
};

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

/** A small drawing, in a box 100 by 80 whose top left is the origin. */
function Icon({ kind, ink, accent, type }: { kind: IconKind; ink: string; accent: string; type: object }) {
  if (kind === "lines")
    return (
      <g>
        {[0, 1, 2, 3].map((row) => (
          <rect
            key={row}
            x={0}
            y={row * 22}
            width={[100, 78, 100, 56][row]}
            height={10}
            rx={5}
            fill={row === 1 ? accent : ink}
          />
        ))}
      </g>
    );
  if (kind === "cuts")
    return (
      <g>
        <rect x={0} y={18} width={40} height={36} rx={8} fill={ink} />
        <rect x={50} y={18} width={50} height={36} rx={8} fill={ink} />
        <rect x={42} y={4} width={6} height={72} rx={3} fill={accent} />
      </g>
    );
  if (kind === "wave")
    return (
      <g>
        {[26, 54, 78, 40, 66, 30, 48].map((h, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the bars are a fixed drawing.
          <rect key={i} x={i * 15} y={40 - h / 2} width={9} height={h} rx={4.5} fill={i === 2 ? accent : ink} />
        ))}
      </g>
    );
  if (kind === "frame")
    return (
      <g>
        <rect x={0} y={8} width={100} height={62} rx={10} fill="none" stroke={ink} strokeWidth={6} />
        <path d="M 40 24 L 66 39 L 40 54 Z" fill={accent} />
      </g>
    );
  if (kind === "type")
    return (
      <g>
        <text {...type} x={0} y={30} fontSize={54} fill={ink} dominantBaseline="central">
          Aa
        </text>
        <rect x={0} y={66} width={100} height={8} rx={4} fill={accent} />
      </g>
    );
  return null;
}

const arrival = (p: Point | undefined) => (p?.at !== undefined ? { at: p.at } : { after: p?.after ?? 1e6 });

function Tile({ index, p }: { index: number; p: PointListProps }) {
  const point = p.points[index] as Point;
  const accent = themeCss(p.accent);
  const type = { fontFamily: themeCss(p.font), fontWeight: p.weight, fill: themeCss(p.ink) } as const;
  const here = useProgress({ ...arrival(point), over: 0.3 });
  const passed = useProgress({ ...arrival(p.points[index + 1]), over: 0.3 });
  const x = p.x + index * (p.width + p.gap);
  const y = p.y + (1 - here) * 24 - (here - passed) * 8;
  const ink = mix(p.ink, p.faded, passed);
  return (
    <g
      data-name={point.name ?? point.label.toLowerCase()}
      opacity={here * (1 - passed * 0.35)}
      transform={`translate(${x} ${y})`}
    >
      <rect
        width={p.width}
        height={p.height}
        rx={20}
        fill={themeCss(p.tile)}
        stroke={accent}
        strokeOpacity={here - passed}
        strokeWidth={4}
      />
      {point.tag ? (
        <text {...type} x={16} y={26} fontSize={20} fill={accent} dominantBaseline="central">
          {point.tag}
        </text>
      ) : null}
      <g transform={`translate(${(p.width - 100) / 2} ${p.height - 108})`}>
        <Icon kind={point.icon} ink={ink} accent={accent} type={type} />
      </g>
      <text
        {...type}
        x={p.width / 2}
        y={p.height + 30}
        fontSize={20}
        fill={ink}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {point.label}
      </text>
    </g>
  );
}

function Board({ children }: { children: ReactNode }) {
  return (
    <svg width="100%" height="100%" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} role="img">
      <title>graphic</title>
      {children}
    </svg>
  );
}

export function PointList(props: Partial<PointListProps>) {
  const p = { ...defaults, ...props };
  return (
    <Board>
      {p.points.map((point, index) => (
        <Tile key={point.name ?? point.label} index={index} p={p} />
      ))}
    </Board>
  );
}
