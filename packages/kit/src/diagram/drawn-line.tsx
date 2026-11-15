import type { SVGProps } from "react";

import { splitWhen, useProgress, type When } from "./progress";

export type Point = readonly [x: number, y: number];

export interface DrawnLineProps
  extends When,
    Omit<SVGProps<SVGLineElement>, "from" | "to" | "x1" | "y1" | "x2" | "y2"> {
  readonly from: Point;
  readonly to: Point;
}

/** A line that draws itself from one point to another. Goes inside an `<svg>`; takes a line's own props. */
export function DrawnLine(props: DrawnLineProps) {
  const [when, { from, to, ...line }] = splitWhen(props);
  const k = useProgress(when);
  // Nothing before it starts: a line of no length with round ends would draw a dot.
  if (k <= 0) return null;
  return (
    <line
      stroke="currentColor"
      {...line}
      x1={from[0]}
      y1={from[1]}
      x2={from[0] + (to[0] - from[0]) * k}
      y2={from[1] + (to[1] - from[1]) * k}
    />
  );
}
