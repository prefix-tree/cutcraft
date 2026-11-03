import type { z } from "zod";

import { GRAPHIC_BASE_PROPS, GRAPHIC_KIND_NAMES, GRAPHIC_KINDS, isIcon } from "@cutcraft/graphics";

import type { Diagnostic } from "../index";
import type { Rule } from "./index";

/** `<Graphic>` kinds and their literal props, and `icon:` sticker names, checked before anything renders. */
export const graphicProps: Rule = {
  name: "graphic-props",
  check: (index) => {
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      if (site.kind === "sticker") {
        const src = site.props.get("src");
        if (typeof src?.literal === "string" && src.literal.startsWith("icon:") && !isIcon(src.literal.slice(5))) {
          out.push({
            rule: "graphic-props",
            severity: "warning",
            message: `"${site.id}": no Lucide icon "${src.literal.slice(5)}"; the sticker shows a placeholder`,
            range: src.range,
            id: site.id,
            prop: "src",
          });
        }
        continue;
      }
      if (site.kind !== "graphic") continue;
      const kind = site.props.get("kind");
      if (typeof kind?.literal !== "string") continue;
      if (!(GRAPHIC_KIND_NAMES as readonly string[]).includes(kind.literal)) {
        const near = GRAPHIC_KIND_NAMES.filter(
          (k) => k.includes(kind.literal as string) || (kind.literal as string).includes(k.split("-")[0]!),
        );
        out.push({
          rule: "graphic-props",
          severity: "error",
          message: `"${site.id}": no graphic kind "${kind.literal}"${near.length ? `; did you mean ${near.map((k) => `"${k}"`).join(", ")}?` : ` (see the graphics reference)`}`,
          range: kind.range,
          id: site.id,
          prop: "kind",
        });
        continue;
      }
      // Only the kind's own props: the shared ones are checked by the resolver against their references and the theme.
      const shape = GRAPHIC_KINDS[kind.literal as keyof typeof GRAPHIC_KINDS].shape as z.ZodRawShape;
      for (const [name, prop] of site.props) {
        if (name === "kind" || (GRAPHIC_BASE_PROPS as readonly string[]).includes(name)) continue;
        if (!Object.hasOwn(shape, name)) {
          out.push({
            rule: "graphic-props",
            severity: "error",
            message: `"${site.id}": ${kind.literal} has no prop "${name}" (${Object.keys(shape).join(", ")})`,
            range: prop.range,
            id: site.id,
            prop: name,
          });
          continue;
        }
        if (prop.literal === undefined || (prop.isExpression && prop.binding !== undefined)) continue;
        const result = (shape[name] as z.ZodType).safeParse(prop.literal);
        if (!result.success)
          out.push({
            rule: "graphic-props",
            severity: "error",
            message: `"${site.id}.${name}": ${result.error.issues[0]?.message ?? "invalid"}`,
            range: prop.range,
            id: site.id,
            prop: name,
          });
      }
    }
    return out;
  },
};
