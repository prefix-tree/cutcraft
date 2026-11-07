/**
 * The font families the player ships: the preview and the export load them
 * from `@cutcraft/player/fonts.css`. All are under the SIL
 * Open Font License, from the `@fontsource` packages named here. Each comes in
 * regular and bold, and italic where the family has one.
 */
export interface BundledFont {
  readonly family: string;
  /** The `@fontsource` package, and the file prefix inside its `files/` directory. */
  readonly id: string;
  readonly italic: boolean;
}

export const BUNDLED_FONTS: readonly BundledFont[] = [
  { family: "Inter", id: "inter", italic: true },
  { family: "Space Grotesk", id: "space-grotesk", italic: false },
  { family: "Playfair Display", id: "playfair-display", italic: true },
  { family: "DM Sans", id: "dm-sans", italic: true },
  { family: "JetBrains Mono", id: "jetbrains-mono", italic: true },
];

export const BUNDLED_FONT_WEIGHTS = [400, 700] as const;

export function isBundledFont(family: string): boolean {
  return BUNDLED_FONTS.some((f) => f.family === family);
}

export type FontStyle = "normal" | "italic";

/** Where a declared face's file comes from. */
export type FontSource =
  /** A file found the way an asset is: `<id>.ttf` (`.otf`, `.woff`, `.woff2`) in the media folder, or the player's `media`. */
  | { readonly kind: "asset"; readonly id: string }
  /** Google Fonts: the export downloads it once into a local cache; the player loads it from Google. */
  | { readonly kind: "google" };

/** One face a file declares with `font()` or `googleFont()`. */
export interface DeclaredFont {
  readonly family: string;
  readonly weight: number;
  readonly style: FontStyle;
  readonly source: FontSource;
}

const DECLARED = Symbol.for("cutcraft.declared");

/**
 * A family a file declares, as `font()` and `googleFont()` return it: a value with no side effect, which carries its
 * faces. It stands for its family wherever a string is expected (a `font` prop, a theme font, a CSS `fontFamily`, a
 * template string, JSON), so it is typed as one. Collection (resolve/collect.ts) finds it on the elements that use it
 * and among the module's exports, and reads its faces from it.
 */
export type FontRef = string & { readonly [DECLARED]?: "font" };

interface FontValue {
  readonly [DECLARED]: "font";
  readonly family: string;
  readonly faces: readonly DeclaredFont[];
}

/** Whether a value is a family a file declared, and if so its faces. */
export function fontFaces(value: unknown): readonly DeclaredFont[] | undefined {
  const v = value as Partial<FontValue> | null;
  return v?.[DECLARED] === "font" ? v.faces : undefined;
}

function checked(face: DeclaredFont): DeclaredFont {
  if (!(Number.isInteger(face.weight) && face.weight >= 100 && face.weight <= 900 && face.weight % 100 === 0))
    throw new Error(`font "${face.family}": weight must be 100, 200 … 900, got ${face.weight}`);
  if (face.style !== "normal" && face.style !== "italic")
    throw new Error(`font "${face.family}": style must be "normal" or "italic", got "${face.style}"`);
  return face;
}

function fontRef(family: string, faces: readonly DeclaredFont[]): FontRef {
  const value: FontValue & { toString(): string; toJSON(): string; [Symbol.toPrimitive](): string } = {
    [DECLARED]: "font",
    family,
    faces: Object.freeze(faces.map(checked)),
    toString: () => family,
    toJSON: () => family,
    [Symbol.toPrimitive]: () => family,
  };
  return Object.freeze(value) as unknown as FontRef;
}

/**
 * Declares a face from a font file and returns it (a `FontRef`, standing for its family), to pass as a `font` prop, a
 * theme font or a CSS `fontFamily`. Call it at the top of the file with literal arguments, as the editor and lint read
 * them from the source; export it when only free code uses it, so the player loads it.
 *
 *   const brand = font({ family: "Brand Sans", src: "asset:brand", weight: 700 });
 *   <Title id="hello" font={brand}>Hello</Title>
 *
 * `src: "asset:brand"` finds `brand.ttf` (or `.otf`, `.woff`, `.woff2`) where the export finds media, and asks the
 * player's `media` for `brand`.
 */
export function font(options: {
  readonly family: string;
  readonly src: string;
  readonly weight?: number;
  readonly style?: FontStyle;
}): FontRef {
  if (!options.src.startsWith("asset:") || options.src.length === "asset:".length)
    throw new Error(`font "${options.family}": src must be "asset:<id>", got "${options.src}"`);
  return fontRef(options.family, [
    {
      family: options.family,
      weight: options.weight ?? 400,
      style: options.style ?? "normal",
      source: { kind: "asset", id: options.src.slice("asset:".length) },
    },
  ]);
}

/**
 * Declares a Google Fonts family, in each weight and style given (default 400, normal), and returns it (a `FontRef`). The
 * export downloads the files once into `~/.cache/cutcraft/fonts` (`CUTCRAFT_FONT_CACHE` moves it) and reads them from
 * there; the player loads them from Google.
 *
 *   const titan = googleFont("Titan One");
 *   const inter = googleFont("Inter Tight", { weights: [400, 700], styles: ["normal", "italic"] });
 */
export function googleFont(
  family: string,
  options: { readonly weights?: readonly number[]; readonly styles?: readonly FontStyle[] } = {},
): FontRef {
  const faces: DeclaredFont[] = [];
  for (const weight of options.weights ?? [400])
    for (const style of options.styles ?? ["normal"]) faces.push({ family, weight, style, source: { kind: "google" } });
  return fontRef(family, faces);
}
