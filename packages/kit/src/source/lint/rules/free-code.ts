import * as t from "@babel/types";
import { rangeOf } from "../../parse";
import type { Diagnostic } from "../index";
import type { Rule } from "./index";

/** HTML straight in a `<Track>` or `<Composition>`: the resolver walks past it and nothing draws it. */
export const strayHtml: Rule = {
  name: "stray-html",
  check: (index) => index.strays.map(({ name, range, parent }) => ({
    rule: "stray-html", severity: "warning", range,
    message: `<${name}> sits straight in a <${parent}>, where nothing draws it; put free code inside a <Layer> (any React, CSS or WebGL renders there)`,
  } satisfies Diagnostic)),
};

/**
 * Free code renders frame by frame against the video's own clock. `useT()`, requestAnimationFrame, Date, performance
 * and CSS animations follow it; timers, media elements playing on their own and canvases kept on the CPU do not.
 */
export const freeCodeClock: Rule = {
  name: "free-code-clock",
  check: (index) => {
    const out: Diagnostic[] = [];
    const warn = (node: t.Node, message: string): void => { out.push({ rule: "free-code-clock", severity: "warning", range: rangeOf(node), message }); };
    t.traverseFast(index.ast.program, (node) => {
      if (t.isCallExpression(node)) {
        const callee = node.callee;
        const name = t.isIdentifier(callee) ? callee.name : t.isMemberExpression(callee) && t.isIdentifier(callee.property) ? callee.property.name : null;
        if (name === "setTimeout" || name === "setInterval") warn(node, `${name} runs on the wall clock, so an export would not repeat it frame for frame; derive the change from useT() instead`);
      } else if (t.isJSXOpeningElement(node) && t.isJSXIdentifier(node.name) && (node.name.name === "video" || node.name.name === "audio")) {
        warn(node, `<${node.name.name}> plays on its own clock and its sound is not in the export; use a <Clip> or <Audio>, and useClipFrame for a clip's picture in free code`);
      } else if (t.isObjectProperty(node) && t.isIdentifier(node.key) && node.key.name === "willReadFrequently" && t.isBooleanLiteral(node.value, { value: true })) {
        warn(node, "a canvas with willReadFrequently is kept on the CPU and the export does not capture it; leave the option out");
      }
    });
    return out;
  },
};
