import { SaxesParser } from "saxes";
import { shapeLength } from "./svg-length";

/**
 * SVG markup as both surfaces draw it. The browser preview inlines the string,
 * the Node export rasterises it with skia, so whatever this module returns is
 * what both show: it parses the markup once, drops what must not run, sizes the
 * root to the element's box, renames ids so two elements never share one, puts
 * theme tokens in, and applies the colour mode as an SVG filter (skia and the
 * browser both implement the filters used here).
 */

export interface SvgNode {
  readonly name: string;
  readonly attrs: Record<string, string>;
  readonly children: (SvgNode | string)[];
}

export interface SvgViewBox { readonly minX: number; readonly minY: number; readonly width: number; readonly height: number }

export interface SvgColor { readonly mode: "none" | "tint" | "replace"; readonly tint?: string; readonly opacity?: number }

export interface PrepareSvgOptions {
  /** The box the root is drawn into, in pixels. */
  readonly box: { readonly width: number; readonly height: number };
  readonly viewBox?: SvgViewBox | undefined;
  readonly preserveAspectRatio?: string | undefined;
  readonly color?: SvgColor | undefined;
  /** Values for `$name` and `var(--cc-name)` in attributes and styles. */
  readonly tokens?: Readonly<Record<string, string>> | undefined;
  /** Prefixed to every id, so two inline SVGs on one page cannot collide. */
  readonly idPrefix?: string | undefined;
  /** How much of the strokes are drawn (0..1); fills fade in over the last 40%. Omit for all of it. */
  readonly draw?: number | null | undefined;
  /** Room, in pixels, kept on every side of the box for strokes and shadows that reach past it. */
  readonly bleed?: number | undefined;
}

export interface PreparedSvg {
  readonly markup: string;
  /** Whether the markup changes over time (SMIL), so a cached picture is not enough. */
  readonly animated: boolean;
  readonly warnings: readonly string[];
}

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
/** Elements that run code, embed other documents or reach outside the file. */
const DROPPED = new Set(["script", "foreignObject", "iframe", "object", "embed", "audio", "video", "canvas", "handler", "listener"]);
const DEFAULT_SIZE = { width: 300, height: 150 };
const PARSE_CACHE = 64;

interface Parsed { readonly root: SvgNode | null; readonly warnings: readonly string[] }
const parsed = new Map<string, Parsed>();

/** Parses SVG markup into a small tree; the result is cached by the markup string. */
export function parseSvg(markup: string): Parsed {
  const hit = parsed.get(markup);
  if (hit) return hit;
  const result = parse(markup);
  parsed.set(markup, result);
  if (parsed.size > PARSE_CACHE) parsed.delete(parsed.keys().next().value as string);
  return result;
}

/** The size an SVG asks for: its width and height, else its viewBox, else the HTML default of 300 by 150. */
export function svgIntrinsicSize(markup: string, viewBox?: SvgViewBox): { width: number; height: number } {
  const root = parseSvg(markup).root;
  const box = viewBox ?? (root ? viewBoxOf(root) : null);
  const w = root ? length(root.attrs.width) : null, h = root ? length(root.attrs.height) : null;
  if (w !== null && h !== null) return { width: w, height: h };
  if (box) {
    if (w !== null) return { width: w, height: (w * box.height) / box.width };
    if (h !== null) return { width: (h * box.width) / box.height, height: h };
    return { width: box.width, height: box.height };
  }
  return { width: w ?? DEFAULT_SIZE.width, height: h ?? DEFAULT_SIZE.height };
}

const PREPARED_CACHE = 128;
const prepared = new Map<string, PreparedSvg>();

/** The markup to draw for an SVG element in a box of `options.box` pixels. Results are cached by markup and options. */
export function prepareSvg(markup: string, options: PrepareSvgOptions): PreparedSvg {
  const key = `${JSON.stringify(options)}\u0000${markup}`;
  const hit = prepared.get(key);
  if (hit) return hit;
  const result = build(markup, options);
  prepared.set(key, result);
  if (prepared.size > PREPARED_CACHE) prepared.delete(prepared.keys().next().value as string);
  return result;
}

function build(markup: string, options: PrepareSvgOptions): PreparedSvg {
  const { root, warnings: parseWarnings } = parseSvg(markup);
  const warnings = [...parseWarnings];
  if (!root) return { markup: "", animated: false, warnings };
  const prefix = options.idPrefix ? `${options.idPrefix.replace(/[^A-Za-z0-9_-]/g, "_")}-` : "";
  const draw = options.draw === null || options.draw === undefined || options.draw >= 1 ? null : Math.max(0, options.draw);
  const ctx: Walk = { prefix, tokens: options.tokens ?? {}, warnings, unknownTokens: new Set(), animated: false, draw, inDefs: false };
  const body = root.children.map((c) => clean(c, ctx)).filter((c): c is SvgNode | string => c !== null);

  const box = options.viewBox ?? viewBoxOf(root) ?? { minX: 0, minY: 0, ...svgIntrinsicSize(markup) };
  const bleed = Math.max(0, options.bleed ?? 0);
  const bx = bleed * (box.width / Math.max(1e-9, options.box.width)), by = bleed * (box.height / Math.max(1e-9, options.box.height));
  const rootAttrs: Record<string, string> = {};
  for (const [k, v] of Object.entries(root.attrs)) {
    if (k === "width" || k === "height" || k === "viewBox" || k === "preserveAspectRatio" || k === "x" || k === "y" || k.startsWith("xmlns")) continue;
    const kept = cleanAttr(k, v, ctx);
    if (kept !== null) rootAttrs[k] = kept;
  }
  const head: Record<string, string> = {
    xmlns: SVG_NS,
    "xmlns:xlink": XLINK_NS,
    width: num(options.box.width + 2 * bleed),
    height: num(options.box.height + 2 * bleed),
    viewBox: `${num(box.minX - bx)} ${num(box.minY - by)} ${num(box.width + 2 * bx)} ${num(box.height + 2 * by)}`,
    preserveAspectRatio: options.preserveAspectRatio ?? root.attrs.preserveAspectRatio ?? "xMidYMid meet",
  };

  let children: (SvgNode | string)[] = body;
  const filter = colorFilter(options.color, `${prefix}cc-color`, { minX: box.minX - bx, minY: box.minY - by, width: box.width + 2 * bx, height: box.height + 2 * by });
  if (filter) children = [{ name: "defs", attrs: {}, children: [filter] }, { name: "g", attrs: { filter: `url(#${prefix}cc-color)` }, children: body }];
  const out = serialize({ name: "svg", attrs: { ...head, ...rootAttrs }, children });
  return { markup: out, animated: ctx.animated, warnings };
}

interface Walk {
  readonly prefix: string;
  readonly tokens: Readonly<Record<string, string>>;
  readonly warnings: string[];
  readonly unknownTokens: Set<string>;
  animated: boolean;
  /** Stroke drawing progress, or null when everything is drawn. */
  readonly draw: number | null;
  /** Inside definitions (gradients, clips, masks…), which are not drawn by themselves. */
  readonly inDefs: boolean;
}

const DEFINITIONS = new Set(["defs", "clipPath", "mask", "marker", "pattern", "symbol", "linearGradient", "radialGradient", "filter"]);
const FILLED = new Set(["path", "line", "polyline", "polygon", "circle", "ellipse", "rect", "text"]);

function clean(node: SvgNode | string, ctx: Walk): SvgNode | string | null {
  if (typeof node === "string") return node;
  if (DROPPED.has(node.name)) {
    ctx.warnings.push(`<${node.name}> is not drawn and was removed`);
    return null;
  }
  const attrs: Record<string, string> = {};
  for (const [k, v] of Object.entries(node.attrs)) {
    const kept = cleanAttr(k, v, ctx);
    if (kept !== null) attrs[k] = kept;
  }
  const inner: Walk = DEFINITIONS.has(node.name) && !ctx.inDefs ? { ...ctx, inDefs: true } : ctx;
  const children = node.children
    .map((c) => (node.name === "style" && typeof c === "string" ? cleanStyleSheet(c, inner) : clean(c, inner)))
    .filter((c): c is SvgNode | string => c !== null);
  if (inner !== ctx && inner.animated) ctx.animated = true;
  if (ctx.draw !== null && !ctx.inDefs && FILLED.has(node.name)) drawProgress(node.name, attrs, ctx.draw);
  // A link cannot be followed in a video; keep what it draws.
  if (node.name === "a") return { name: "g", attrs: Object.fromEntries(Object.entries(attrs).filter(([k]) => k !== "href" && k !== "xlink:href" && k !== "target")), children };
  return { name: node.name, attrs, children };
}

/** Hides the stroke beyond `draw` of its length with a dash, and fades the fill in over the last 40%. */
function drawProgress(name: string, attrs: Record<string, string>, draw: number): void {
  const style = attrs.style ?? "";
  const stroke = attrs.stroke ?? style.match(/(?:^|;)\s*stroke\s*:\s*([^;]+)/)?.[1]?.trim();
  if (stroke && stroke !== "none") {
    const len = shapeLength(name, attrs);
    if (len !== null && len > 0) {
      attrs["stroke-dasharray"] = `${num(len)} ${num(len)}`;
      attrs["stroke-dashoffset"] = num(len * (1 - draw));
    }
  }
  const fade = Math.max(0, Math.min(1, (draw - 0.6) / 0.4));
  const own = parseFloat(attrs["fill-opacity"] ?? "1");
  attrs["fill-opacity"] = num((Number.isFinite(own) ? own : 1) * fade);
}

function cleanAttr(name: string, value: string, ctx: Walk): string | null {
  if (/^on/i.test(name)) return null;
  if (name.startsWith("xmlns")) return null;
  if (name === "href" || name === "xlink:href") {
    const v = value.trim();
    if (v.startsWith("#")) return `#${ctx.prefix}${v.slice(1)}`;
    if (/^data:image\/(png|jpe?g|gif|webp);/i.test(v)) return v;
    ctx.warnings.push(`a link to "${v.slice(0, 40)}" was removed: only #ids and embedded raster images are drawn`);
    return null;
  }
  if (name === "id") return `${ctx.prefix}${value}`;
  let v = withTokens(value, ctx);
  if (name === "style") v = cleanStyleSheet(v, ctx);
  else v = prefixUrls(v, ctx.prefix);
  return v;
}

/** Drops imports and outside URLs from CSS, prefixes `url(#id)` and fills in tokens. */
function cleanStyleSheet(css: string, ctx: Walk): string {
  let out = withTokens(css, ctx).replace(/@import[^;]*;?/gi, "");
  out = out.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (_m, _q: string, target: string) => {
    const t = target.trim();
    if (t.startsWith("#")) return `url(#${ctx.prefix}${t.slice(1)})`;
    if (/^data:image\/(png|jpe?g|gif|webp);/i.test(t)) return `url(${t})`;
    return "none";
  });
  // Selectors that name ids must follow the renamed ids.
  return ctx.prefix ? out.replace(/#([A-Za-z_][\w-]*)(?=[^{}]*\{)/g, `#${ctx.prefix}$1`) : out;
}

function prefixUrls(value: string, prefix: string): string {
  if (!prefix || !value.includes("url(")) return value;
  return value.replace(/url\(\s*(['"]?)#([^'")]+)\1\s*\)/g, (_m, _q: string, id: string) => `url(#${prefix}${id})`);
}

function withTokens(value: string, ctx: Walk): string {
  if (!value.includes("$") && !value.includes("--cc-")) return value;
  const look = (name: string, whole: string): string => {
    const v = ctx.tokens[name];
    if (v !== undefined) return v;
    if (!ctx.unknownTokens.has(name)) {
      ctx.unknownTokens.add(name);
      ctx.warnings.push(`unknown token "${name}" is left as written`);
    }
    return whole;
  };
  return value
    .replace(/var\(\s*--cc-([A-Za-z][\w-]*)\s*(?:,\s*([^)]*))?\)/g, (whole, name: string, fallback: string | undefined) => ctx.tokens[name] ?? (fallback?.trim() || look(name, whole)))
    .replace(/\$([A-Za-z][\w-]*)/g, (whole, name: string) => look(name, whole));
}

/** `replace` paints every drawn pixel in the colour; `tint` keeps the shading and colours it. `opacity` is how much. */
function colorFilter(color: SvgColor | undefined, id: string, region: SvgViewBox): SvgNode | null {
  if (!color || color.mode === "none" || !color.tint) return null;
  const amount = Math.max(0, Math.min(1, color.opacity ?? 1));
  const recoloured: SvgNode = color.mode === "replace"
    ? { name: "g", attrs: {}, children: [
        { name: "feFlood", attrs: { "flood-color": color.tint, result: "flood" }, children: [] },
        { name: "feComposite", attrs: { in: "flood", in2: "SourceAlpha", operator: "in", result: "coloured" }, children: [] },
      ] }
    : (() => {
        const [r, g, b] = rgb(color.tint as string);
        const row = (k: number): string => `${num(0.2126 * k)} ${num(0.7152 * k)} ${num(0.0722 * k)} 0 0`;
        return { name: "g", attrs: {}, children: [
          { name: "feColorMatrix", attrs: { in: "SourceGraphic", type: "matrix", values: `${row(r)}  ${row(g)}  ${row(b)}  0 0 0 1 0`, result: "coloured" }, children: [] },
        ] };
      })();
  const steps = (recoloured.children as SvgNode[]).slice();
  if (amount < 1) {
    steps.push({ name: "feComposite", attrs: { in: "coloured", in2: "SourceGraphic", operator: "arithmetic", k1: "0", k2: num(amount), k3: num(1 - amount), k4: "0" }, children: [] });
  }
  // The region is the visible area in user units: skia mis-sizes a region relative to the bounding box.
  const bounds = { filterUnits: "userSpaceOnUse", x: num(region.minX), y: num(region.minY), width: num(region.width), height: num(region.height) };
  return { name: "filter", attrs: { id, ...bounds, "color-interpolation-filters": "sRGB" }, children: steps };
}

/** A CSS colour as 0..1 channels; named colours other than black and white count as white. */
export function rgb(color: string): [number, number, number] {
  const c = color.trim().toLowerCase();
  const hex = c.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    const h = hex[1] as string;
    const full = h.length <= 4 ? h.split("").map((x) => x + x).join("") : h;
    return [parseInt(full.slice(0, 2), 16) / 255, parseInt(full.slice(2, 4), 16) / 255, parseInt(full.slice(4, 6), 16) / 255];
  }
  const fn = c.match(/^rgba?\(\s*([\d.]+)%?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?/);
  if (fn) return [Number(fn[1]) / 255, Number(fn[2]) / 255, Number(fn[3]) / 255];
  return c === "black" ? [0, 0, 0] : [1, 1, 1];
}

function viewBoxOf(node: SvgNode): SvgViewBox | null {
  const raw = node.attrs.viewBox;
  if (!raw) return null;
  const n = raw.trim().split(/[\s,]+/).map(Number);
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x)) || (n[2] as number) <= 0 || (n[3] as number) <= 0) return null;
  return { minX: n[0] as number, minY: n[1] as number, width: n[2] as number, height: n[3] as number };
}

/** A length attribute in user units; percentages and font-relative units have no size of their own. */
function length(v: string | undefined): number | null {
  if (!v) return null;
  const m = v.trim().match(/^([\d.]+)(px)?$/);
  return m ? Number(m[1]) : null;
}

function parse(markup: string): Parsed {
  const warnings: string[] = [];
  const parser = new SaxesParser({ xmlns: false });
  const stack: SvgNode[] = [];
  let root: SvgNode | null = null;
  parser.on("opentag", (tag) => {
    const node: SvgNode = { name: tag.name, attrs: { ...(tag.attributes as Record<string, string>) }, children: [] };
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else if (!root) root = node;
    stack.push(node);
  });
  parser.on("closetag", () => { stack.pop(); });
  const text = (t: string): void => {
    const parent = stack[stack.length - 1];
    if (parent && t.length > 0) parent.children.push(t);
  };
  parser.on("text", text);
  parser.on("cdata", text);
  parser.on("error", (e) => { throw e; });
  try {
    parser.write(markup).close();
  } catch (error) {
    warnings.push(`the SVG could not be read: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
    return { root: null, warnings };
  }
  const found = root as SvgNode | null;
  if (!found || found.name !== "svg") {
    warnings.push("the markup is not an <svg> element");
    return { root: null, warnings };
  }
  return { root: found, warnings };
}

export function serialize(node: SvgNode | string): string {
  if (typeof node === "string") return escapeText(node);
  const attrs = Object.entries(node.attrs).map(([k, v]) => ` ${k}="${escapeAttr(v)}"`).join("");
  if (node.children.length === 0) return `<${node.name}${attrs}/>`;
  return `<${node.name}${attrs}>${node.children.map(serialize).join("")}</${node.name}>`;
}

function escapeText(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(t: string): string {
  return escapeText(t).replace(/"/g, "&quot;");
}

function num(v: number): string {
  return String(Math.round(v * 1000) / 1000);
}
