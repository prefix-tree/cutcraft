import { tmpdir } from "node:os";

import { type CatalogFont, type FontCategory, type FontRole, fontsFor } from "@uberscene/kit/schema";
import { collectModule, loadModule, type ResolvedState, resolve } from "@uberscene/sdk";

import { directoryResolver } from "./media";
import type { ExportSource } from "./renderer";
import { renderStill } from "./still";

export const FONT_ROLES: readonly FontRole[] = ["headline", "body", "captions", "numbers", "accent"];
export const FONT_CATEGORIES: readonly FontCategory[] = [
  "sans",
  "serif",
  "slab",
  "condensed",
  "display",
  "handwriting",
  "mono",
];

export interface FontFilter {
  readonly role?: string;
  readonly category?: string;
}

/** The catalogue's families for a role, a category, or both; a name that is neither is an error naming the choices. */
export function listFonts(filter: FontFilter = {}): CatalogFont[] {
  if (filter.role !== undefined && !(FONT_ROLES as readonly string[]).includes(filter.role))
    throw new Error(`--for wants one of ${FONT_ROLES.join(", ")}, got "${filter.role}"`);
  if (filter.category !== undefined && !(FONT_CATEGORIES as readonly string[]).includes(filter.category))
    throw new Error(`--category wants one of ${FONT_CATEGORIES.join(", ")}, got "${filter.category}"`);
  return fontsFor({
    ...(filter.role ? { role: filter.role as FontRole } : {}),
    ...(filter.category ? { category: filter.category as FontCategory } : {}),
  });
}

/** The weights as text: "400" for one, "200 to 700" for a run, with "+ italic" when there is one. */
function weightsText(font: CatalogFont): string {
  const { weights } = font;
  const run = weights.length > 2 && weights.every((w, i) => i === 0 || w - (weights[i - 1] as number) === 100);
  const text = run ? `${weights[0]} to ${weights.at(-1)}` : weights.join(", ");
  return font.italics.length > 0 ? `${text} + italic` : text;
}

/** The catalogue as a table to read: one family a line, with how to use it underneath. */
export function formatFonts(fonts: readonly CatalogFont[]): string {
  if (fonts.length === 0) return "no font in the catalogue matches\n";
  const rows = fonts.map((f) => [
    f.source === "bundled" ? `${f.family} *` : f.family,
    f.category,
    weightsText(f),
    f.roles.join(", "),
    f.feel,
  ]);
  const head = ["family", "category", "weights", "for", "looks like"];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] as string).length)));
  const line = (cells: readonly string[]) =>
    cells
      .map((c, i) => (i === cells.length - 1 ? c : c.padEnd(widths[i] as number)))
      .join("  ")
      .trimEnd();
  return `${[line(head), ...rows.map(line)].join("\n")}

* bundled: use it by name, font="Inter". Any other: declare it at the top of the file,
  const bebasNeue = googleFont("Bebas Neue"), and pass the value, font={bebasNeue}.
  uberscene fonts --sheet fonts.png --text "YOUR WORDS" draws them, to look at before choosing.
`;
}

const COLUMNS = 3;
const CELL = { width: 640, height: 190 };
const PAD = 28;

/** The heaviest weight a family has, and its regular one when that is another. */
function sheetWeights(font: CatalogFont): { heavy: number; regular: number | null } {
  const heavy = font.weights.at(-1) as number;
  const regular = font.weights.includes(400) ? 400 : (font.weights[0] as number);
  return { heavy, regular: regular === heavy ? null : regular };
}

/**
 * A cut file that draws the families as a specimen: each in a cell with its name, its weights and the sample text set
 * in its heaviest weight and, where it has another, its regular one. It declares every Google family it sets, so the
 * export loads them the way it loads any file's fonts.
 */
export function sheetSource(
  fonts: readonly CatalogFont[],
  text: string,
): { text: string; width: number; height: number } {
  const columns = Math.min(COLUMNS, Math.max(1, fonts.length));
  const rows = Math.ceil(fonts.length / columns);
  const width = columns * CELL.width;
  const height = rows * CELL.height;
  const declarations = fonts
    .map((font, i) => {
      if (font.source !== "google") return "";
      const { heavy, regular } = sheetWeights(font);
      const weights = regular === null ? [heavy] : [regular, heavy];
      return `export const f${i} = googleFont(${JSON.stringify(font.family)}, { weights: [${weights.join(", ")}] });\n`;
    })
    .join("");
  const cells = fonts.map((font) => {
    const { heavy, regular } = sheetWeights(font);
    return { family: font.family, note: `${font.category} · ${weightsText(font)}`, heavy, regular };
  });
  return {
    width,
    height,
    text: `import { Composition, googleFont, Layer, Track } from "@uberscene/kit";
${declarations}
const CELLS = ${JSON.stringify(cells)};
const TEXT = ${JSON.stringify(text)};
const line = { whiteSpace: "nowrap", overflow: "hidden" };

export default function Sheet() {
  return (
    <Composition fps={1} width={${width}} height={${height}} background={{ mode: "color", color: "#111318" }}>
      <Track id="sheet" layout="free">
        <Layer id="fonts" start={0} duration={1}>
          <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(${columns}, ${CELL.width}px)", gridAutoRows: "${CELL.height}px", color: "#f4f1ea" }}>
            {CELLS.map((cell) => (
              <div key={cell.family} style={{ padding: "18px ${PAD}px", boxSizing: "border-box", borderRight: "1px solid #2a2e37", borderBottom: "1px solid #2a2e37", overflow: "hidden" }}>
                <div style={{ ...line, fontFamily: '"Inter"', fontSize: 20, fontWeight: 700 }}>
                  {cell.family} <span style={{ fontWeight: 400, color: "#8b93a3" }}>{cell.note}</span>
                </div>
                <div style={{ ...line, fontFamily: JSON.stringify(cell.family), fontWeight: cell.heavy, fontSize: 52, lineHeight: "84px" }}>{TEXT}</div>
                {cell.regular === null ? null : (
                  <div style={{ ...line, fontFamily: JSON.stringify(cell.family), fontWeight: cell.regular, fontSize: 28, lineHeight: "40px" }}>{TEXT}</div>
                )}
              </div>
            ))}
          </div>
        </Layer>
      </Track>
    </Composition>
  );
}
`,
  };
}

export interface FontSheetOptions {
  /** The families to draw. */
  readonly fonts: readonly CatalogFont[];
  /** The image to write: .jpg or .jpeg writes a JPEG, anything else a PNG. */
  readonly out: string;
  /** The words each family sets; default a line with capitals, lower case and figures. */
  readonly text?: string;
  readonly frameTimeout?: number;
  readonly onLog?: (message: string) => void;
}

export interface FontSheetResult {
  readonly width: number;
  readonly height: number;
  /** The families drawn, in reading order: left to right, then down. */
  readonly families: readonly string[];
  readonly columns: number;
  readonly warnings: readonly string[];
}

export const SHEET_TEXT = "Make It Move 2026";

/** Draws the families as one image, each setting the same words: what a font looks like, before one is chosen. */
export async function fontSheet(options: FontSheetOptions): Promise<FontSheetResult> {
  if (options.fonts.length === 0) throw new Error("no font to draw: the filter matches none");
  const sheet = sheetSource(options.fonts, options.text ?? SHEET_TEXT);
  const manifest = { assets: {} };
  const source: ExportSource = { text: sheet.text, manifest };
  const state: ResolvedState = resolve(collectModule(loadModule(sheet.text) as never), manifest);
  if (state.errors.length > 0)
    throw new Error(`the specimen did not resolve: ${state.errors.map((e) => e.message).join("; ")}`);
  const result = await renderStill({
    state,
    source,
    media: directoryResolver(tmpdir(), manifest),
    out: options.out,
    time: 0,
    ...(options.frameTimeout === undefined ? {} : { frameTimeout: options.frameTimeout }),
    ...(options.onLog ? { onLog: options.onLog } : {}),
  });
  return {
    width: result.width,
    height: result.height,
    families: options.fonts.map((f) => f.family),
    columns: Math.min(COLUMNS, options.fonts.length),
    warnings: result.warnings,
  };
}
