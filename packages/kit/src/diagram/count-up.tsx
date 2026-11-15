import type { SVGProps } from "react";

import { splitWhen, useProgress, type When } from "./progress";

export interface CountUpProps extends When, Omit<SVGProps<SVGTextElement>, "from" | "to" | "format"> {
  /** Default 0. */
  readonly from?: number;
  readonly to: number;
  /** What is shown for the number so far. Default: the number rounded. */
  readonly format?: (value: number) => string;
}

/** A number that counts from one value to another. Goes inside an `<svg>`; takes a text's own props. */
export function CountUp(props: CountUpProps) {
  const [when, { from = 0, to, format, ...type }] = splitWhen(props);
  const value = from + (to - from) * useProgress(when);
  return (
    <text fill="currentColor" {...type}>
      {format ? format(value) : String(Math.round(value))}
    </text>
  );
}
