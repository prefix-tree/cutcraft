import * as t from "@babel/types";

import type { SourceEdit } from "../../edits";
import { type Range, rangeOf } from "../../parse";
import type { Diagnostic } from "../index";
import type { Rule } from "./index";

/** HTML straight in a `<Track>` or `<Composition>`: the resolver walks past it and nothing draws it. */
export const strayHtml: Rule = {
  name: "stray-html",
  check: (index) =>
    index.strays.map(
      ({ name, range, parent }) =>
        ({
          rule: "stray-html",
          severity: "warning",
          range,
          message: `<${name}> sits straight in a <${parent}>, where nothing draws it; put free code inside a <Layer> (any React, CSS or WebGL renders there)`,
        }) satisfies Diagnostic,
    ),
};

/**
 * Free code renders frame by frame against the video's own clock. `useT()` and CSS animations follow it everywhere;
 * in an export the file's own requestAnimationFrame, Date, performance and Math.random do too, by name. Timers, the
 * same reached through `window`, media elements playing on their own and canvases kept on the CPU do not.
 */
/** Globals an export gives the file on the video's clock, when called by their bare name. */
const ON_THE_CLOCK = new Set(["requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"]);
/** Libraries with a clock of their own, by module: the imports that run on it, and the adapter that puts them on the video's. */
const OWN_CLOCK: Readonly<Record<string, { readonly names: readonly string[]; readonly use: string }>> = {
  "@react-three/fiber": { names: ["Canvas"], use: "<ThreeScene> from @uberscene/graphics/three" },
  motion: { names: ["animate"], use: "useTimeline from @uberscene/graphics/motion" },
  "motion/react": {
    names: ["animate", "useAnimate"],
    use: "useTimeline or useLayerTime from @uberscene/graphics/motion",
  },
  "framer-motion": {
    names: ["animate", "useAnimate"],
    use: "useTimeline or useLayerTime from @uberscene/graphics/motion",
  },
};
/** Props that start a Motion component's own animation. */
const MOTION_PLAYS = new Set(["animate", "whileInView"]);

export const freeCodeClock: Rule = {
  name: "free-code-clock",
  check: (index) => {
    const out: Diagnostic[] = [];
    const warn = (node: t.Node, message: string, fix?: readonly SourceEdit[]): void => {
      out.push({
        rule: "free-code-clock",
        severity: "warning",
        range: rangeOf(node),
        message,
        ...(fix ? { fix } : {}),
      });
    };
    // Names the file binds itself: writing one bare would reach the file's own, not the browser's.
    const bound = new Set<string>();
    t.traverseFast(index.ast.program, (node) => {
      if (t.isVariableDeclaration(node) || t.isFunctionDeclaration(node) || t.isImportDeclaration(node))
        for (const name of Object.keys(t.getBindingIdentifiers(node))) bound.add(name);
      if (t.isFunction(node))
        for (const param of node.params)
          for (const name of Object.keys(t.getBindingIdentifiers(param))) bound.add(name);
    });
    // Local names bound to a library's own-clock export, and to Motion's `motion` / `m` component factories.
    const ownClock = new Map<string, { imported: string; use: string }>();
    const motionFactories = new Set<string>();
    for (const node of index.ast.program.body) {
      if (!t.isImportDeclaration(node)) continue;
      const lib = OWN_CLOCK[node.source.value];
      if (!lib) continue;
      for (const spec of node.specifiers) {
        if (!t.isImportSpecifier(spec)) continue;
        const imported = t.isIdentifier(spec.imported) ? spec.imported.name : spec.imported.value;
        if (lib.names.includes(imported)) ownClock.set(spec.local.name, { imported, use: lib.use });
        if (node.source.value !== "motion" && (imported === "motion" || imported === "m"))
          motionFactories.add(spec.local.name);
      }
    }
    t.traverseFast(index.ast.program, (node) => {
      if (t.isCallExpression(node)) {
        const callee = node.callee;
        const name = t.isIdentifier(callee)
          ? callee.name
          : t.isMemberExpression(callee) && t.isIdentifier(callee.property)
            ? callee.property.name
            : null;
        if (name === "setTimeout" || name === "setInterval")
          warn(
            node,
            `${name} runs on the wall clock, so an export would not repeat it frame for frame; derive the change from useT() instead`,
          );
        if (name === "random" && t.isMemberExpression(callee) && t.isIdentifier(callee.object, { name: "Math" }))
          warn(
            node,
            "Math.random() gives each run of the file its own numbers, so pieces of an export rendered side by side can disagree; use random(seed) from @uberscene/kit",
          );
        const own = t.isIdentifier(callee) ? ownClock.get(callee.name) : undefined;
        if (own)
          warn(
            node,
            `${own.imported}() plays on its library's own clock, so a scrub or an export does not follow it; use ${own.use}`,
          );
      } else if (
        t.isMemberExpression(node) &&
        t.isIdentifier(node.object) &&
        (node.object.name === "window" || node.object.name === "globalThis") &&
        t.isIdentifier(node.property) &&
        ON_THE_CLOCK.has(node.property.name)
      ) {
        warn(
          node,
          `${node.object.name}.${node.property.name} is the browser's own, on the wall clock; write ${node.property.name} without ${node.object.name}. and an export runs it on the video's clock`,
          bound.has(node.property.name)
            ? undefined
            : [{ kind: "text", id: "", range: rangeOf(node), text: node.property.name }],
        );
      } else if (t.isJSXOpeningElement(node)) {
        const el = node.name;
        if (t.isJSXIdentifier(el) && (el.name === "video" || el.name === "audio")) {
          warn(
            node,
            `<${el.name}> plays on its own clock and its sound is not in the export; use a <Clip> or <Audio>, and useClipFrame for a clip's picture in free code`,
          );
        } else if (t.isJSXIdentifier(el) && ownClock.has(el.name)) {
          warn(
            node,
            `<${el.name}> draws on its own clock, so a scrub or an export does not follow it; use ${ownClock.get(el.name)!.use}`,
          );
        } else if (t.isJSXMemberExpression(el) && t.isJSXIdentifier(el.object) && motionFactories.has(el.object.name)) {
          const plays = node.attributes.find(
            (a) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name) && MOTION_PLAYS.has(a.name.name),
          );
          if (plays)
            warn(
              plays,
              `<${el.object.name}.${el.property.name}> animates on Motion's own clock, so a scrub or an export does not follow it; drive it with useTimeline or useLayerTime from @uberscene/graphics/motion`,
            );
        }
      } else if (t.isObjectExpression(node)) {
        const at = node.properties.findIndex(
          (p) =>
            t.isObjectProperty(p) &&
            t.isIdentifier(p.key) &&
            p.key.name === "willReadFrequently" &&
            t.isBooleanLiteral(p.value, { value: true }),
        );
        const option = node.properties[at];
        if (option) {
          // Taken out with the comma that joined it to its neighbour; alone, the braces are left empty.
          const next = node.properties[at + 1];
          const before = node.properties[at - 1];
          const range: Range = next
            ? [option.start as number, next.start as number]
            : before
              ? [before.end as number, option.end as number]
              : [(node.start as number) + 1, (node.end as number) - 1];
          warn(
            option,
            "a canvas with willReadFrequently is kept on the CPU and the export does not capture it; leave the option out",
            [{ kind: "text", id: "", range, text: "" }],
          );
        }
      }
    });
    return out;
  },
};
