import { icons } from "lucide";
import { z } from "zod";
import { defineKind } from "../types";
import { color, el, n, roundRect, svg } from "../util";

type IconNode = readonly (readonly [string, Readonly<Record<string, string | number | undefined>>])[];
const ICONS = icons as unknown as Readonly<Record<string, IconNode>>;

/** `arrow-right`, `arrowRight` or `ArrowRight` → the Lucide icon's export name. */
function exportName(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join("");
}

/** The icon's nodes, or null when Lucide has no icon by that name. */
export function iconNode(name: string): IconNode | null {
  return ICONS[exportName(name)] ?? null;
}

export function isIcon(name: string): boolean {
  return iconNode(name) !== null;
}

/** Every icon name, kebab-case, as `<Graphic kind="icon" name>` and `icon:` stickers take them. */
export function iconNames(): string[] {
  return Object.keys(ICONS).map((k) =>
    k
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
      .toLowerCase(),
  );
}

export const icon = defineKind({
  kind: "icon",
  title: "Icon",
  category: "icons",
  description:
    "One of Lucide's line icons by name (`check`, `arrow-right`, `sparkles`, `play`, …), stroked in `color`, on an optional round or square plate.",
  shape: {
    name: z.string().refine(isIcon, {
      error: (issue) => `no Lucide icon "${String(issue.input)}"; names are kebab-case, as on lucide.dev/icons`,
    }),
    color: color("$text"),
    strokeWidth: z.number().min(0.25).max(6).default(2),
    plate: z.enum(["none", "circle", "square"]).default("none"),
    plateColor: color("$surface"),
  },
  example: { name: "sparkles", plate: "circle" },
  size: () => ({ width: 120, height: 120 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      side = Math.min(W, H);
    let body = "";
    if (p.plate === "circle")
      body += el("circle", { cx: W / 2, cy: H / 2, r: side / 2, fill: ctx.value(p.plateColor) });
    if (p.plate === "square")
      body += el("path", {
        d: roundRect((W - side) / 2, (H - side) / 2, side, side, side * 0.22),
        fill: ctx.value(p.plateColor),
      });
    const inner = p.plate === "none" ? side : side * 0.6,
      k = inner / 24;
    const nodes = (iconNode(p.name) ?? [])
      .map(([tag, attrs]) => el(tag, Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== "key"))))
      .join("");
    body += el(
      "g",
      {
        transform: `translate(${n((W - inner) / 2)} ${n((H - inner) / 2)}) scale(${n(k)})`,
        fill: "none",
        stroke: ctx.value(p.color),
        "stroke-width": p.strokeWidth,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      },
      nodes,
    );
    return { svg: svg(W, H, body), labels: [] };
  },
});
