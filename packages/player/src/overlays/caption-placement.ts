import type { CSSProperties } from "react";

/** Where the file puts the captions: the numbers on `<Captions>` and the short form in its style. */
export interface CaptionPlace {
  /** The block's middle, in pixels right of the frame's centre and below it. */
  readonly x?: number;
  readonly y?: number;
  /** The widest a line may be, in pixels. */
  readonly width?: number;
  readonly align?: "left" | "center" | "right";
  /** `top`, `center` or `bottom`, or the height of the block's middle as a fraction of the frame. */
  readonly position?: string | number;
}

const ITEMS = { left: "flex-start", center: "center", right: "flex-end" } as const;

/** Reads the placement out of an element's props, which arrive untyped: anything that is not a placement is left out. */
export function captionPlace(
  props: Readonly<Record<string, unknown>>,
  style: { readonly position?: unknown },
): CaptionPlace {
  const number = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const x = number(props.x),
    y = number(props.y),
    width = number(props.width);
  const align = props.align === "left" || props.align === "right" || props.align === "center" ? props.align : undefined;
  const position =
    typeof style.position === "string" || typeof style.position === "number" ? style.position : undefined;
  return {
    ...(x !== undefined ? { x } : {}),
    ...(y !== undefined ? { y } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(align ? { align } : {}),
    ...(position !== undefined ? { position } : {}),
  };
}

/**
 * The CSS that puts the caption block where the file says, in a frame of the given size. Across: a block `width`
 * wide centred on `x`, or the frame less a margin at each side. Down: `y` when given, else the style's position.
 * Both shifts are one `translate`, so there is one place a block is moved from where it is anchored.
 */
export function captionPlacement(
  place: CaptionPlace,
  comp: { readonly width: number; readonly height: number },
): CSSProperties {
  const portrait = comp.height > comp.width;
  const x = place.x ?? 0;
  const across: CSSProperties =
    place.width === undefined
      ? // Vertical video: the platform's own UI covers the right edge, so the margin is wider.
        { left: 0, right: 0, padding: portrait ? "0 12%" : "0 8%" }
      : { left: "50%", width: place.width };
  // Anchored by its middle (shifted up by half its own height) or by an edge.
  const down: { css: CSSProperties; middle: boolean } =
    place.y !== undefined
      ? { css: { top: `calc(50% ${place.y < 0 ? "-" : "+"} ${Math.abs(place.y)}px)` }, middle: true }
      : typeof place.position === "number"
        ? { css: { top: `${place.position * 100}%` }, middle: true }
        : place.position === "center"
          ? { css: { top: "50%" }, middle: true }
          : place.position === "top"
            ? { css: { top: comp.height * 0.08 }, middle: false }
            : // The platform's own UI covers the bottom fifth of a vertical video.
              { css: { bottom: comp.height * (portrait ? 0.2 : 0.08) }, middle: false };
  const tx = place.width === undefined ? (x === 0 ? "0" : `${x}px`) : x === 0 ? "-50%" : `calc(-50% + ${x}px)`;
  const ty = down.middle ? "-50%" : "0";
  const align = place.align ?? "center";
  return {
    position: "absolute",
    ...across,
    ...down.css,
    ...(tx === "0" && ty === "0" ? {} : { transform: `translate(${tx}, ${ty})` }),
    display: "flex",
    flexDirection: "column",
    alignItems: ITEMS[align],
    textAlign: align,
  };
}
