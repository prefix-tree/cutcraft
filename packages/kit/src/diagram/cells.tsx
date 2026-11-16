import type { SVGProps } from "react";

export interface CellsProps {
  /** What is written under each cell; or `count` for cells with nothing under them. */
  readonly values?: readonly (string | number)[];
  readonly count?: number;
  /** The top left corner of the first cell. */
  readonly x: number;
  readonly y: number;
  /** A cell's width, and its height when `height` is left out. */
  readonly size: number;
  readonly height?: number;
  /** Pixels between cells. Default a quarter of the size. */
  readonly gap?: number;
  /** Corner radius. Default a fifth of the size. */
  readonly radius?: number;
  /** A cell's colour: one for all, or one for each by its index. */
  readonly fill?: string | ((index: number) => string);
  /** The colour of a lit cell, and which are lit: the first so many, or each by its index. */
  readonly litFill?: string;
  readonly lit?: number | ((index: number) => boolean);
  /** The index of one cell to ring. */
  readonly highlight?: number;
  readonly highlightStroke?: string;
  /** The type of the values, and how far under the cells their middle sits. Default: half the size. */
  readonly valueProps?: Omit<SVGProps<SVGTextElement>, "x" | "y">;
  readonly valueGap?: number;
  /** What the layout check calls the row. */
  readonly name?: string;
}

/** A row of cells, each with a value under it if you give them: months counted off, a row of dots with numbers. */
export function Cells(p: CellsProps) {
  const count = p.values?.length ?? p.count ?? 0;
  const height = p.height ?? p.size;
  const gap = p.gap ?? p.size / 4;
  const radius = p.radius ?? p.size / 5;
  const isLit = (i: number): boolean => (typeof p.lit === "function" ? p.lit(i) : i < (p.lit ?? 0));
  const colour = (i: number): string =>
    isLit(i) && p.litFill ? p.litFill : typeof p.fill === "function" ? p.fill(i) : (p.fill ?? "currentColor");
  const left = (i: number): number => p.x + i * (p.size + gap);
  return (
    <g {...(p.name ? { "data-name": p.name } : {})}>
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: cells are a fixed row, told apart by their place.
        <rect key={i} x={left(i)} y={p.y} width={p.size} height={height} rx={radius} fill={colour(i)} />
      ))}
      {p.highlight !== undefined && p.highlight >= 0 && p.highlight < count ? (
        <rect
          x={left(p.highlight) - 5}
          y={p.y - 5}
          width={p.size + 10}
          height={height + 10}
          rx={radius + 4}
          fill="none"
          stroke={p.highlightStroke ?? "currentColor"}
          strokeWidth={5}
        />
      ) : null}
      {p.values?.map((value, i) => (
        <text
          // biome-ignore lint/suspicious/noArrayIndexKey: a value belongs to the cell at its place.
          key={i}
          fill="currentColor"
          {...p.valueProps}
          x={left(i) + p.size / 2}
          y={p.y + height + (p.valueGap ?? p.size / 2)}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {value}
        </text>
      ))}
    </g>
  );
}
