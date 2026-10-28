import { MASKED_KINDS, MASK_NOT_RENDERED, NOT_RENDERED, RENDERED_VALUES } from "../../../jsx/rendering";
import type { Json } from "../../../patches/types";
import type { ElementSite } from "../../index";
import type { Diagnostic } from "../index";
import type { Rule } from "./index";

/** Values that ask for nothing, so writing them is never reported. */
const OFF: readonly Json[] = [false, 0, "none", "all"];

/** `prop` or `prop.field`: the written literal, or undefined when it is absent or not a literal. */
function literalAt(site: ElementSite, path: string): { value: Json | undefined; range: ElementSite["range"]; prop: string } | null {
  const [prop, ...fields] = path.split(".") as [string, ...string[]];
  const p = site.props.get(prop);
  if (!p) return null;
  let value: Json | undefined = p.literal;
  for (const f of fields) value = value !== null && typeof value === "object" && !Array.isArray(value) ? value[f] : undefined;
  return { value, range: p.range, prop };
}

/** Props, values and elements the schemas accept but the player and renderer do not draw or play; see `jsx/rendering.ts`. */
export const notRendered: Rule = {
  name: "not-rendered",
  check: (index) => {
    const out: Diagnostic[] = [];
    const warn = (site: ElementSite, what: string, reason: string, range = site.range, prop?: string) =>
      out.push({ rule: "not-rendered", severity: "warning", message: `"${site.id}" <${site.name}>${what ? ` ${what}` : ""} ${reason}`, range, id: site.id, ...(prop ? { prop } : {}) });
    const masks = new Map<string, number>();
    for (const site of index.elements.values()) {
      for (const v of RENDERED_VALUES) {
        if (v.kind !== site.kind) continue;
        const at = literalAt(site, v.prop);
        if (typeof at?.value !== "string" || v.values.includes(at.value)) continue;
        if (NOT_RENDERED.some((n) => n.kind === site.kind && n.prop === v.prop && n.value === at.value)) continue;
        warn(site, `${v.prop} "${at.value}"`, v.reason, at.range, at.prop);
      }
      for (const n of NOT_RENDERED) {
        if (n.kind !== "*" && n.kind !== site.kind) continue;
        if (!n.prop) { warn(site, "", n.reason); continue; }
        const at = literalAt(site, n.prop);
        if (!at || (n.prop.includes(".") && at.value === undefined)) continue;
        if (n.value !== undefined ? at.value !== n.value : OFF.includes(at.value as Json)) continue;
        warn(site, n.value !== undefined ? `${n.prop} "${n.value}"` : n.prop, n.reason, at.range, at.prop);
      }
      if (site.kind === "mask" && site.parent) {
        const parent = index.elements.get(site.parent);
        const count = (masks.get(site.parent) ?? 0) + 1;
        masks.set(site.parent, count);
        if (parent && !(MASKED_KINDS as readonly string[]).includes(parent.kind)) warn(site, `on ${parent.kind} "${parent.id}"`, MASK_NOT_RENDERED.kind);
        else if (count > 1) warn(site, "", MASK_NOT_RENDERED.second);
      }
    }
    return out;
  },
};
