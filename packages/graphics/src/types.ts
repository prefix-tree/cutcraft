import type { z } from "zod";

/** What a kind draws with: its box, its clock and the theme. */
export interface GraphicContext {
  /** The box in composition pixels. */
  readonly width: number;
  readonly height: number;
  /** Seconds since the element started, and its length. */
  readonly t: number;
  readonly duration: number;
  /** A stable number per element, for kinds that scatter things. */
  readonly seed: number;
  /** A theme value for a `$token`, or the value itself. */
  value(v: string): string;
}

/** Text a kind places in its box; the renderers lay it out the way they lay out titles. */
export interface Label {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly text: string;
  readonly font: string;
  readonly size: number;
  readonly weight: number;
  readonly color: string;
  readonly align: "left" | "center" | "right";
  readonly valign: "top" | "middle" | "bottom";
  readonly italic?: boolean;
  readonly letterSpacing?: number;
  readonly lineHeight?: number;
}

/** A drawn graphic: SVG art sized to the box (no `<text>`), and labels above it. */
export interface Drawn {
  readonly svg: string;
  readonly labels: readonly Label[];
}

export type KindCategory = "arrows" | "callouts" | "lower thirds" | "frames" | "highlights" | "progress" | "data" | "dividers" | "backgrounds" | "effects" | "icons";

export interface GraphicKind<S extends z.ZodRawShape = z.ZodRawShape> {
  readonly kind: string;
  readonly title: string;
  readonly category: KindCategory;
  readonly description: string;
  /** The kind's own props, beside the props every graphic takes. */
  readonly shape: S;
  /** Props for the catalog's example and thumbnail. */
  readonly example: Readonly<Record<string, unknown>>;
  /** Whether the drawing changes with time (the export redraws it every frame). */
  readonly animated?: boolean;
  /** The box when the element gives no `width`/`height`; `frame` is the composition size. */
  size(props: z.output<z.ZodObject<S>>, frame: { readonly width: number; readonly height: number }): { width: number; height: number };
  draw(props: z.output<z.ZodObject<S>>, ctx: GraphicContext): Drawn;
}

export function defineKind<S extends z.ZodRawShape>(kind: GraphicKind<S>): GraphicKind<S> {
  return kind;
}
