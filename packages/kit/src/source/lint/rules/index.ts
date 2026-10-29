import type { Diagnostic, LintOptions } from "../index";
import type { ElementSite, SourceIndex } from "../../index";
import { lookupAsset } from "../../../manifest/types";
import { graphicProps } from "./graphic";
import { notRendered } from "./not-rendered";
import { cutNearShot, shotChangeInsideCrop } from "./shots";
import { fontAvailable, themeLiterals, themeRefs } from "./theme";

export interface Rule {
  readonly name: string;
  check(index: SourceIndex, options: LintOptions): Diagnostic[];
}

const TIMING_PROPS = ["in", "out", "duration", "start", "offset", "anchor", "at"] as const;

export const literalIds: Rule = {
  name: "literal-ids",
  check: (index) => index.anonymous.map((a) => ({ rule: "literal-ids", severity: "error", message: `<${a.kind}>: ${a.reason}; every element needs a literal id so the editor can address it`, range: a.range })),
};

export const uniqueIds: Rule = {
  name: "unique-ids",
  check: (index) => {
    // The index keeps the last site per id; find duplicates by rescanning element names in order.
    const seen = new Map<string, number>();
    const out: Diagnostic[] = [];
    const re = /\bid=(?:"([^"]+)"|\{"([^"]+)"\})/g;
    for (const m of index.text.matchAll(re)) {
      const id = (m[1] ?? m[2]) as string;
      const count = (seen.get(id) ?? 0) + 1;
      seen.set(id, count);
      if (count === 2) out.push({ rule: "unique-ids", severity: "error", message: `id "${id}" is used more than once`, range: [m.index ?? 0, (m.index ?? 0) + m[0].length], id });
    }
    return out;
  },
};

export const noStartOnSequence: Rule = {
  name: "no-start-on-sequence",
  check: (index) => {
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      const start = site.props.get("start");
      if (!start || !site.parent) continue;
      const parent = index.elements.get(site.parent);
      if (parent?.kind !== "track") continue;
      const layout = parent.props.get("layout")?.literal;
      if (layout === "free") continue;
      if (site.props.has("anchor")) continue;
      out.push({ rule: "no-start-on-sequence", severity: "error", message: `"${site.id}" has start on a sequence track; order decides start there, or use layout="free"`, range: start.range, id: site.id, prop: "start" });
    }
    return out;
  },
};

/** The hooks a Layer interior may call: they read the player's clock, nothing else. */
const LAYER_HOOKS: ReadonlySet<string> = new Set(["useT", "useLayer"]);

export const pureHelpers: Rule = {
  name: "pure-helpers",
  check: (index) => [...index.helpers.values()].filter((h) => !h.pure && h.hooks.some((n) => !LAYER_HOOKS.has(n))).map((h) => ({
    rule: "pure-helpers", severity: "error", message: `helper ${h.name} calls ${h.hooks.filter((n) => !LAYER_HOOKS.has(n)).join(", ")}; helpers must be pure so the resolver can expand them`, range: h.range,
  } satisfies Diagnostic)),
};

export const expressionLocked: Rule = {
  name: "expression-locked",
  check: (index) => {
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      for (const prop of TIMING_PROPS) {
        const p = site.props.get(prop);
        if (p?.isExpression && p.binding === undefined) out.push({ rule: "expression-locked", severity: "warning", message: `"${site.id}.${prop}" is an expression; the timeline will show it locked`, range: p.range, id: site.id, prop });
      }
    }
    return out;
  },
};

export const oneCaptions: Rule = {
  name: "one-captions",
  check: (index) => {
    const sites = [...index.elements.values()].filter((s) => s.kind === "captions");
    return sites.slice(1).map((s) => ({ rule: "one-captions", severity: "error", message: "a composition has one <Captions>", range: s.range, id: s.id } satisfies Diagnostic));
  },
};

export const ambiguousDuration: Rule = {
  name: "ambiguous-duration",
  check: (index) => {
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      if (!["clip", "audio", "nested"].includes(site.kind)) continue;
      const d = site.props.get("duration");
      if (d && site.props.has("out")) out.push({ rule: "ambiguous-duration", severity: "error", message: `"${site.id}" gives both out and duration`, range: d.range, id: site.id, prop: "duration" });
    }
    return out;
  },
};

export const fileShape: Rule = {
  name: "file-shape",
  check: (index) => {
    const out: Diagnostic[] = [];
    if (!index.hasDefaultExport) out.push({ rule: "file-shape", severity: "error", message: "the file must default-export the video component", range: [0, 0] });
    if (index.hasSchema && !index.defaults) out.push({ rule: "file-shape", severity: "error", message: "`export const schema` needs an `export const defaults = {…}` object literal", range: [0, 0] });
    if (!index.compositionId) out.push({ rule: "file-shape", severity: "error", message: "no <Composition> found", range: [0, 0] });
    return out;
  },
};

export const missingAsset: Rule = {
  name: "missing-asset",
  check: (index, options) => {
    if (!options.manifest) return [];
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      const src = site.props.get("src");
      if (typeof src?.literal !== "string" || !src.literal.startsWith("asset:")) continue;
      if (!options.manifest.assets[src.literal.slice("asset:".length)]) {
        out.push({ rule: "missing-asset", severity: "error", message: `${src.literal} is not in the manifest`, range: src.range, id: site.id, prop: "src" });
      }
    }
    return out;
  },
};

export const sequenceGap: Rule = {
  name: "sequence-gap",
  check: (index) => {
    const main = firstSequenceTrack(index);
    if (!main) return [];
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      if (site.kind !== "gap" || site.parent !== main.id) continue;
      out.push({ rule: "sequence-gap", severity: "warning", message: `"${site.id}" is a gap on the first sequence track "${main.id}"; nothing is under it, so those frames are black unless another track covers them`, range: site.range, id: site.id });
    }
    return out;
  },
};

export const cutInsideWord: Rule = {
  name: "cut-inside-word",
  check: (index, options) => {
    if (!options.manifest) return [];
    const out: Diagnostic[] = [];
    for (const site of index.elements.values()) {
      if (site.kind !== "clip" && site.kind !== "audio") continue;
      const src = site.props.get("src")?.literal;
      if (typeof src !== "string") continue;
      const words = lookupAsset(options.manifest, src)?.transcript?.words;
      if (!words || words.length === 0) continue;
      for (const prop of ["in", "out"] as const) {
        const p = site.props.get(prop);
        if (typeof p?.literal !== "number") continue;
        const t = p.literal;
        const word = words.find((w) => t > w.start && t < w.end);
        if (!word) continue;
        const ref = prop === "in" ? `word:${word.i}` : `word:${word.i}.end`;
        out.push({ rule: "cut-inside-word", severity: "warning", message: `"${site.id}.${prop}" = ${t} cuts inside "${word.text}" (${word.start}–${word.end}); use ${ref} or a time outside the word`, range: p.range, id: site.id, prop });
      }
    }
    return out;
  },
};

export const rules: readonly Rule[] = [literalIds, uniqueIds, noStartOnSequence, pureHelpers, expressionLocked, oneCaptions, ambiguousDuration, fileShape, missingAsset, sequenceGap, cutInsideWord, cutNearShot, shotChangeInsideCrop, themeRefs, themeLiterals, fontAvailable, graphicProps, notRendered];

/** The composition's first track in document order that lays out as a sequence and is not hidden: the one under everything else. */
function firstSequenceTrack(index: SourceIndex): ElementSite | null {
  let first: ElementSite | null = null;
  for (const site of index.elements.values()) {
    if (site.kind !== "track" || site.parent !== index.compositionId) continue;
    if (site.props.get("layout")?.literal === "free" || site.props.get("hidden")?.literal === true) continue;
    if (!first || site.siblingIndex < first.siblingIndex) first = site;
  }
  return first;
}
