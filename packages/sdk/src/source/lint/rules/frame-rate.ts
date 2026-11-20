// `fps={29.97}` reads as NTSC and is not: as a number it is 2997/100, which runs 0.108 frames an hour off 30000/1001
// and does not divide into whole ticks, so the resolver refuses it. The NTSC rates are written as strings.
import * as t from "@babel/types";

import { NTSC_RATES } from "@uberscene/kit/schema";

import type { SourceIndex } from "../../index";
import { attributeOf, idOf, jsxTags } from "../fixes";
import type { Diagnostic } from "../index";
import type { Rule } from "./index";

export const ntscFrameRate: Rule = {
  name: "ntsc-frame-rate",
  check: (index: SourceIndex) => {
    const out: Diagnostic[] = [];
    for (const tag of jsxTags(index, "Composition")) {
      const value = attributeOf(tag, "fps")?.value;
      if (!t.isJSXExpressionContainer(value) || !t.isNumericLiteral(value.expression)) continue;
      const fps = value.expression.value;
      const name = Object.keys(NTSC_RATES).find((n) => Number(n) === fps);
      if (!name || value.start == null || value.end == null) continue;
      const rate = NTSC_RATES[name] as { num: number; den: number };
      const id = idOf(tag);
      out.push({
        rule: "ntsc-frame-rate",
        severity: "error",
        message: `fps={${fps}} is the decimal ${fps}, not NTSC; write fps="${name}" for ${rate.num}/${rate.den}`,
        range: [value.start, value.end],
        ...(id ? { id } : {}),
        prop: "fps",
        fix: [{ kind: "text", id, range: [value.start, value.end], text: `"${name}"` }],
      });
    }
    return out;
  },
};
