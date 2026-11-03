import { z } from "zod";

import { GRAPHIC_KINDS, type GraphicKindName, graphicSize } from "../packages/graphics/src/index";

/**
 * Frame widths an example may take, 16:9; the smallest that holds the graphic wins, so small ones are not lost. Not
 * below 640, which the page shows at about its own size.
 */
const WIDTHS = [640, 800, 960, 1280];
export const EXAMPLE_SECONDS = 3;

export interface GraphicExample {
  readonly width: number;
  readonly height: number;
  /** The `<Graphic>` element's props, in the order the code shows them. */
  readonly props: Readonly<Record<string, unknown>>;
  /** The whole file the preview renders, as a reader would write it. */
  readonly code: string;
}

/**
 * A graphic kind's example: its example props in a composition just large enough for it. The docs show `code` and the
 * previews script renders the same props in the same frame, so the code and the video cannot disagree.
 */
export function graphicExample(name: GraphicKindName): GraphicExample {
  const kind = GRAPHIC_KINDS[name];
  const parsed = z.strictObject(kind.shape).parse(kind.example) as Record<string, unknown>;
  const fits = (width: number): boolean => {
    const height = (width * 9) / 16;
    const size = graphicSize({ kind: name, ...parsed }, { width, height });
    // A kind that fills its frame (a background, a full-width bar) fits any of them.
    return (size.width <= width * 0.8 && size.height <= height * 0.8) || (size.width >= width && size.height >= height);
  };
  const width = WIDTHS.find(fits) ?? WIDTHS[WIDTHS.length - 1]!;
  const height = (width * 9) / 16;
  const props = { id: "g1", kind: name, ...kind.example, start: 0, duration: EXAMPLE_SECONDS };
  const attrs = Object.entries(props).map(([k, v]) =>
    typeof v === "string" ? `${k}="${v}"` : `${k}={${JSON.stringify(v)}}`,
  );
  // One line while it reads as one; otherwise a prop per line, as a formatter would.
  const graphic =
    `<Graphic ${attrs.join(" ")} />`.length <= 64
      ? [`    <Graphic ${attrs.join(" ")} />`]
      : ["    <Graphic", ...attrs.map((a) => `      ${a}`), "    />"];
  const code = [
    `<Composition fps={30} width={${width}} height={${height}}>`,
    `  <Track id="main" layout="free">`,
    ...graphic,
    `  </Track>`,
    `</Composition>`,
  ].join("\n");
  return { width, height, props, code };
}
