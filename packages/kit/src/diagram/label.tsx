import type { SVGProps } from "react";

import { DrawnLine, type Point } from "./drawn-line";
import { splitWhen, useProgress, type When } from "./progress";

export type LabelSide = "left" | "right" | "top" | "bottom";

export interface LabelProps extends When, Omit<SVGProps<SVGTextElement>, "x" | "y" | "to" | "name"> {
  readonly text: string;
  /** The middle of the word. */
  readonly x: number;
  readonly y: number;
  /** The point the word names: a line is drawn to it. Left out, there is no line. */
  readonly to?: Point;
  /** The edge of the word the line leaves from. Left out: the edge that faces `to`. */
  readonly side?: LabelSide;
  /** Pixels between the word and the start of the line. Default 10. */
  readonly gap?: number;
  /** The word's width in pixels, when the estimate from its length is not close enough. */
  readonly textWidth?: number;
  /** The line's colour and thickness in pixels. Default: the word's fill, 3. */
  readonly lineStroke?: string;
  readonly lineThickness?: number;
  /** What the layout check calls it. Default: the text in lower case, spaces as hyphens. */
  readonly name?: string;
}

/** The edge of a box that faces a point, measured against the box's own shape. */
function facing(dx: number, dy: number, halfWidth: number, halfHeight: number): LabelSide {
  if (Math.abs(dx) / halfWidth >= Math.abs(dy) / halfHeight) return dx < 0 ? "left" : "right";
  return dy < 0 ? "top" : "bottom";
}

/**
 * A word, with a line from beside it to the point it names. The word fades in as the line draws, and the line
 * leaves from an edge of the word, never through its letters. Goes inside an `<svg>`; takes a text's own props.
 */
export function Label(props: LabelProps) {
  const [when, rest] = splitWhen(props);
  const { text, x, y, to, side, gap = 10, textWidth, lineStroke, lineThickness = 3, name, ...type } = rest;
  const k = useProgress(when);
  const size = Number(type.fontSize ?? 32);
  const spacing = Number(type.letterSpacing ?? 0);
  // A sans capital is about 0.62 of its size wide; close enough to start a line beside the word.
  const halfWidth = (textWidth ?? text.length * (size * 0.62 + spacing)) / 2;
  const halfHeight = size / 2;
  const edge = to ? (side ?? facing(to[0] - x, to[1] - y, halfWidth, halfHeight)) : null;
  const start: Point | null =
    edge === "left"
      ? [x - halfWidth - gap, y]
      : edge === "right"
        ? [x + halfWidth + gap, y]
        : edge === "top"
          ? [x, y - halfHeight - gap]
          : edge === "bottom"
            ? [x, y + halfHeight + gap]
            : null;
  const fill = type.fill ?? "currentColor";
  return (
    <g data-name={name ?? text.toLowerCase().trim().replace(/\s+/g, "-")} opacity={k}>
      {to && start ? (
        <DrawnLine from={start} to={to} progress={k} stroke={lineStroke ?? fill} strokeWidth={lineThickness} />
      ) : null}
      <text
        fontSize={size}
        fontWeight={800}
        fill={fill}
        {...type}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {text}
      </text>
    </g>
  );
}
