import type { z } from "zod";

import { builtInShader } from "../jsx/built-in-shaders";
import { capabilitiesOf } from "../jsx/capabilities";
import { effectParamProblem } from "../jsx/effect-params";
import { ENGINE_SCHEMAS, SCHEMAS_BY_KIND } from "../jsx/elements";
import {
  TRANSITION_TYPES,
  type TrackLayout,
  type TrackRole,
  type TransitionType,
  VIDEO_EFFECT_TYPES,
} from "../jsx/enums";
import { defaultTransitionParams, isBuiltInTransition } from "../jsx/schemas/transition";
import { type ShaderDefinition, shaderFor } from "../jsx/shaders";
import { parseTimeRef, resolveTimeRef } from "../manifest/timeref";
import { type AssetEntry, type AssetManifest, assetIdOf, lookupAsset } from "../manifest/types";
import type { PatchLog } from "../patches/types";
import type { DeclaredFont } from "../theme/fonts";
import { applyTheme, type ResolvedTheme, resolveTheme, type ThemeOrigin } from "../theme/theme";
import {
  type AssetPlay,
  type CueOptions,
  cueNodes,
  onTimeline,
  planCues,
  playsKey,
  sameAsset,
  timelineWords,
} from "./captions";
import type { ResolveError } from "./errors";
import { overlay } from "./overlay";
import { freezeHoldsOf, holdTotal, rampAdvance, rampInverse, speedKeysOf } from "./speed";
import type { CollectedNode, CollectedTree, Editable, LayerInterior } from "./tree";

export interface Placement {
  readonly id: string;
  readonly kind: string;
  readonly track: string | null;
  readonly parent: string | null;
  readonly children: readonly string[];
  readonly start: number;
  readonly end: number;
  readonly duration: number;
  readonly source?: { readonly in: number; readonly out: number; readonly speed: number; readonly asset: string };
  /** Schema-parsed props with defaults applied, after patches. Raw props when the schema rejected them. */
  readonly props: Readonly<Record<string, unknown>>;
  readonly editable: Editable;
  readonly lockedProps: readonly string[];
  /** Prop → `schema` key; editable, but the fold writes the value into `defaults` rather than the element. */
  readonly boundProps: Readonly<Record<string, string>>;
  readonly errors: readonly ResolveError[];
  /** For transitions between siblings: the two clips. */
  readonly between?: readonly [string, string];
  /** A Layer's handles: the component inside it and its current props. */
  readonly interior?: LayerInterior;
  /** Props the theme supplied, by dot path: `$primary`, `style:h1`, `motion` or `theme`. Absent when none did. */
  readonly themed?: Readonly<Record<string, ThemeOrigin>>;
}

export interface ResolvedTrack {
  readonly id: string;
  readonly layout: TrackLayout;
  readonly order: number;
  readonly locked: boolean;
  readonly hidden: boolean;
  readonly muted: boolean;
  readonly solo: boolean;
  readonly role?: TrackRole;
  readonly group?: string;
  readonly items: readonly string[];
}

export interface ResolvedState {
  readonly composition: {
    readonly id: string;
    readonly fps: number;
    readonly width: number;
    readonly height: number;
    readonly duration: number;
  };
  readonly tracks: readonly ResolvedTrack[];
  readonly items: ReadonlyMap<string, Placement>;
  readonly errors: readonly ResolveError[];
  readonly tree: CollectedTree;
  readonly manifest: AssetManifest;
  readonly log: PatchLog | undefined;
  /** The composition's theme, its base merged in; the default theme when the file declares none. */
  readonly theme: ResolvedTheme;
  /** The faces the file declares (`font()`, `googleFont()`), which every renderer loads. */
  readonly fonts: readonly DeclaredFont[];
  /** The effects and transitions the file declares (`defineEffect()`, `defineTransition()`). */
  readonly shaders: readonly ShaderDefinition[];
}

const DEFAULT_OVERLAY_DURATION = 5;
const IMAGE_DEFAULT_DURATION = 5;
const MAX_PASSES = 32;

interface Pending {
  readonly node: CollectedNode;
  readonly track: string | null;
  readonly parent: string | null;
  props: Record<string, unknown>;
  errors: ResolveError[];
  source?: Placement["source"];
  /** Intrinsic length, when it does not depend on other elements. */
  duration?: number;
  durationDep?: { kind: "match"; id: string } | { kind: "fill" };
  start?: number;
  /** `at` is a word, shot or silence of the anchor's source: the start is where the anchor plays it, plus `offset`. */
  anchorDep?: { id: string | "start"; offset: number; edge?: "end"; at?: string };
  between?: readonly [string, string];
}

interface Memo {
  readonly tree: CollectedTree;
  readonly manifest: AssetManifest;
  readonly version: number;
  readonly state: ResolvedState;
}
const byLog = new WeakMap<PatchLog, Memo>();
const byTree = new WeakMap<CollectedTree, Memo>();

/** Absolute placements for every element, computed from the tree, the manifests and the patch log. Memoised per log on its version. */
export function resolve(tree: CollectedTree, manifest: AssetManifest, log?: PatchLog): ResolvedState {
  const cached = log ? byLog.get(log) : byTree.get(tree);
  if (cached && cached.tree === tree && cached.manifest === manifest && cached.version === (log?.version ?? -1))
    return cached.state;
  // A log's first resolve may still reuse the plain resolve of the same tree.
  const previous = cached?.state.items ?? (log ? byTree.get(tree)?.state.items : undefined);
  const state = compute(tree, manifest, log, previous);
  const memo: Memo = { tree, manifest, version: log?.version ?? -1, state };
  if (log) byLog.set(log, memo);
  else byTree.set(tree, memo);
  return state;
}

/**
 * `previous` is the item map of the last resolve on the same log. A placement
 * equal to its predecessor is returned as the same object, so a drag step
 * allocates only for the elements it moved and consumers can memoise on
 * `Placement` identity.
 */
function compute(
  original: CollectedTree,
  manifest: AssetManifest,
  log: PatchLog | undefined,
  previous?: ReadonlyMap<string, Placement>,
): ResolvedState {
  const tree = overlay(original, log);
  fileShaders = original.shaders ?? [];
  const errors: ResolveError[] = [...tree.errors];
  const root = tree.root;
  const theme = resolveTheme(root.props.theme);
  const compParsed = parseProps(root, errors, theme);
  const markers = new Map<string, number>();
  const pending = new Map<string, Pending>();
  const tracks: ResolvedTrack[] = [];
  const reuse = (placement: Placement): Placement => {
    const prev = previous?.get(placement.id);
    return prev && samePlacement(prev, placement) ? prev : placement;
  };
  // Decide reuse before allocating: for an untouched element the previous placement is returned without building a new one.
  const place = (
    node: CollectedNode,
    track: string | null,
    parent: string | null,
    start: number,
    length: number,
    props: Record<string, unknown>,
    errors: readonly ResolveError[],
    source: Placement["source"],
    between: Placement["between"],
  ): Placement => {
    const prev = previous?.get(node.id);
    if (
      prev &&
      prev.kind === node.kind &&
      prev.track === track &&
      prev.parent === parent &&
      prev.start === start &&
      prev.duration === length &&
      prev.props === props &&
      prev.editable === node.editable &&
      prev.lockedProps === node.lockedProps &&
      prev.boundProps === node.boundProps &&
      sameSource(prev.source, source) &&
      sameBetween(prev.between, between) &&
      prev.interior === node.interior &&
      sameChildIds(prev.children, node.children) &&
      sameErrors(prev.errors, errors)
    )
      return prev;
    const placement: Placement = {
      id: node.id,
      kind: node.kind,
      track,
      parent,
      children: node.children.map((c) => c.id),
      start,
      end: start + length,
      duration: length,
      props,
      editable: node.editable,
      lockedProps: node.lockedProps,
      boundProps: node.boundProps,
      errors,
      ...(source ? { source } : {}),
      ...(between ? { between } : {}),
      ...(node.interior ? { interior: node.interior } : {}),
      ...themedField(props),
    };
    return placement;
  };

  for (const child of root.children) {
    if (child.kind === "marker") {
      // A failed parse returns the raw props; the schema error already names a non-numeric `at`.
      const at = parseProps(child, errors, theme).at;
      if (typeof at === "number") markers.set(child.id, at);
    }
  }

  const markersKey = markersSignature(markers);
  let order = 0;
  for (const child of root.children) {
    if (child.kind === "track") {
      const p = parseProps(child, errors, theme);
      tracks.push({
        id: child.id,
        layout: (p.layout as TrackLayout) ?? "sequence",
        order: order++,
        locked: Boolean(p.locked),
        hidden: Boolean(p.hidden),
        muted: Boolean(p.muted),
        solo: Boolean(p.solo),
        ...(typeof p.role === "string" ? { role: p.role as TrackRole } : {}),
        ...(typeof p.group === "string" ? { group: p.group } : {}),
        items: child.children.map((c) => c.id),
      });
      for (const item of child.children)
        intrinsic(item, child.id, pending, manifest, markers, markersKey, theme, errors);
    } else if (child.kind === "captions") {
      intrinsic(child, null, pending, manifest, markers, markersKey, theme, errors);
    } else if (child.kind === "multicam") {
      errors.push({ code: "INVALID_CHILD", id: child.id, message: "<Multicam> belongs inside a <Track>" });
    } else if (child.kind !== "marker") {
      errors.push({ code: "INVALID_CHILD", id: child.id, message: `<Composition> cannot contain <${child.kind}>` });
    }
  }

  for (const p of pending.values()) {
    const duck = p.props.duck as { under: string } | undefined;
    if (duck && !tracks.some((t) => t.id === duck.under || t.role === duck.under)) {
      p.errors.push({
        code: "UNKNOWN_REF",
        id: p.node.id,
        prop: "duck.under",
        message: `duck.under "${duck.under}" is neither a track id nor a track role`,
      });
    }
    if (p.props.frame && p.source) p.props = framed(p.props, manifest.assets[p.source.asset], compParsed);
  }

  // Place track children: sequence cursors, free starts; anchors and dependent durations by iteration.
  for (const track of tracks) {
    const trackNode = tree.byId.get(track.id);
    if (!trackNode) continue;
    placeTrack(trackNode, track, pending, theme, errors);
  }
  iterateDependencies(pending, manifest);
  placeCaptions(root, pending, tracks, manifest, markers);

  let compositionEnd = 0;
  for (const p of pending.values()) {
    if (p.start !== undefined && p.duration !== undefined && p.node.kind !== "transition")
      compositionEnd = Math.max(compositionEnd, p.start + p.duration);
  }
  for (const p of pending.values()) {
    if (p.durationDep?.kind === "fill" && p.start !== undefined) {
      p.duration = Math.max(0, compositionEnd - p.start);
      if (p.source) p.source = { ...p.source, out: p.source.in + sourceSpan(p.node, p.duration, p.source.speed) };
      delete p.durationDep;
    }
  }
  for (const p of pending.values()) {
    if (p.start === undefined || p.duration === undefined) {
      p.errors.push({
        code: p.anchorDep ? "DANGLING_ANCHOR" : "MISSING_START",
        id: p.node.id,
        message: `could not place <${p.node.kind} id="${p.node.id}">`,
      });
      p.start ??= 0;
      p.duration ??= 0;
    }
  }

  const items = new Map<string, Placement>();
  // The composition, its tracks and its markers are addressable too: the inspector edits them by id.
  const structural: Placement[] = [];
  for (const child of root.children) {
    if (child.kind === "track") {
      const own: ResolveError[] = [];
      const props = parseProps(child, own, theme);
      structural.push({
        id: child.id,
        kind: "track",
        track: child.id,
        parent: root.id,
        children: child.children.map((c) => c.id),
        start: 0,
        end: 0,
        duration: 0,
        props,
        editable: child.editable,
        lockedProps: child.lockedProps,
        boundProps: child.boundProps,
        errors: own,
        ...themedField(props),
      });
    } else if (child.kind === "marker") {
      const own: ResolveError[] = [];
      const props = parseProps(child, own, theme);
      const at = markers.get(child.id) ?? 0;
      structural.push({
        id: child.id,
        kind: "marker",
        track: null,
        parent: root.id,
        children: [],
        start: at,
        end: at,
        duration: 0,
        props,
        editable: child.editable,
        lockedProps: child.lockedProps,
        boundProps: child.boundProps,
        errors: own,
        ...themedField(props),
      });
    }
  }
  let duration = 0;
  for (const p of pending.values()) {
    const start = p.start as number;
    const length = p.duration as number;
    const placement = place(p.node, p.track, p.parent, start, length, p.props, p.errors, p.source, p.between);
    items.set(p.node.id, placement);
    if (p.errors.length > 0) errors.push(...p.errors);
    if (p.node.kind !== "transition") duration = Math.max(duration, placement.end);
    duration = placeChildren(p.node, placement, items, errors, place, duration, theme);
  }

  for (const s of structural) {
    items.set(s.id, reuse(s.kind === "track" ? { ...s, end: duration, duration } : s));
    errors.push(...s.errors);
  }
  items.set(
    root.id,
    reuse({
      id: root.id,
      kind: "composition",
      track: null,
      parent: null,
      children: root.children.map((c) => c.id),
      start: 0,
      end: duration,
      duration,
      props: compParsed,
      editable: root.editable,
      lockedProps: root.lockedProps,
      boundProps: root.boundProps,
      errors: [],
      ...themedField(compParsed),
    }),
  );
  errors.push(...textureErrors(items, manifest));
  errors.push(...keyframeErrors(items));
  return {
    composition: {
      id: root.id,
      fps: Number(compParsed.fps ?? 30),
      width: Number(compParsed.width ?? 1920),
      height: Number(compParsed.height ?? 1080),
      duration,
    },
    tracks,
    items,
    errors,
    tree,
    manifest,
    log,
    theme,
    fonts: original.fonts ?? [],
    shaders: original.shaders ?? [],
  };
}

interface ParsedProps {
  readonly theme: ResolvedTheme;
  readonly unthemed: boolean;
  readonly data: Record<string, unknown>;
  readonly errors: readonly ResolveError[];
}

/**
 * Parsed props are cached per raw props object and theme: the overlay keeps
 * the props object of every node a patch did not touch, so a drag step
 * re-parses one node, not the whole tree. The cached `data` is shared, never
 * mutated, and is what `Placement.props` points at, so untouched placements
 * keep it across resolves and consumers can memoise on its identity.
 */
const parsedByProps = new WeakMap<object, ParsedProps>();
/** Which parsed props the theme supplied, keyed by the parsed `data`. */
const themedByData = new WeakMap<object, Readonly<Record<string, ThemeOrigin>>>();

/** The shaders of the file being resolved (`defineEffect`, `defineTransition`); set for the length of one `compute`. */
let fileShaders: readonly ShaderDefinition[] = [];

/**
 * An `<Effect>` or `<Transition>` of a type the file declares: its params checked and filled by the declared schema.
 * An unknown type is an error naming the built-in ones; null for a built-in type or any other element.
 */
function declaredShader(
  node: CollectedNode,
  data: Record<string, unknown>,
  own: ResolveError[],
): Record<string, unknown> | null {
  if (node.kind !== "effect" && node.kind !== "transition") return null;
  const type = String(data.type);
  const builtIn = (node.kind === "effect" ? VIDEO_EFFECT_TYPES : TRANSITION_TYPES) as readonly string[];
  const kitShader = node.kind === "effect" ? builtInShader(type) : undefined;
  if (builtIn.includes(type) && !kitShader) return null;
  const def = kitShader ?? shaderFor(fileShaders, node.kind, type);
  if (!def) {
    own.push({
      code: "SCHEMA",
      id: node.id,
      prop: "type",
      message: `unknown ${node.kind} "${type}": use one of ${builtIn.join(", ")}, or declare it with ${node.kind === "effect" ? "defineEffect" : "defineTransition"}()`,
    });
    return null;
  }
  const result = def.params.safeParse(data.params ?? {});
  if (result.success) return { ...data, params: result.data };
  for (const issue of result.error.issues)
    own.push({
      code: "SCHEMA",
      id: node.id,
      prop: ["params", ...issue.path.map(String)].join("."),
      message: issue.message,
    });
  return null;
}

function parseProps(node: CollectedNode, errors: ResolveError[], theme: ResolvedTheme): Record<string, unknown> {
  const cached = parsedByProps.get(node.props);
  if (cached && cached.theme === theme) {
    errors.push(...cached.errors);
    return cached.data;
  }
  const themed = applyTheme(node.kind, node.props, theme);
  // A theme change keeps the parse of an element the theme touches under neither theme.
  if (cached?.unthemed && themed.props === node.props) {
    parsedByProps.set(node.props, { ...cached, theme });
    errors.push(...cached.errors);
    return cached.data;
  }
  const own: ResolveError[] = themed.issues.map((issue) => ({
    code: issue.code,
    id: node.id,
    prop: issue.prop,
    message: issue.message,
  }));
  const engine = node.kind === "layer" && typeof node.props.engine === "string" ? node.props.engine : null;
  const schema = (engine ? ENGINE_SCHEMAS[engine] : SCHEMAS_BY_KIND[node.kind]) as z.ZodType | undefined;
  let data: Record<string, unknown>;
  if (!schema) data = { ...themed.props };
  else {
    const result = schema.safeParse(themed.props);
    if (result.success) {
      data = result.data as Record<string, unknown>;
      const declared = declaredShader(node, data, own);
      if (declared) data = declared;
      // A built-in transition's params are validated per type but not filled by its schema; fill them here.
      else if (node.kind === "transition" && isBuiltInTransition(String(data.type)))
        data = {
          ...data,
          params: {
            ...defaultTransitionParams(data.type as TransitionType),
            ...(data.params as Record<string, unknown>),
          },
        };
    } else {
      data = { ...themed.props };
      own.push(
        ...result.error.issues.map(
          (issue) =>
            ({
              code: "SCHEMA",
              id: node.id,
              prop: issue.path.map(String).join(".") || undefined,
              message: issue.message,
            }) as ResolveError,
        ),
      );
    }
  }
  if (Object.keys(themed.from).length > 0) themedByData.set(data, themed.from);
  const parsed: ParsedProps = { theme, unthemed: themed.props === node.props, data, errors: own };
  parsedByProps.set(node.props, parsed);
  errors.push(...own);
  return data;
}

function themedField(props: Record<string, unknown>): { themed?: Readonly<Record<string, ThemeOrigin>> } {
  const themed = themedByData.get(props);
  return themed ? { themed } : {};
}

/** What `intrinsic` derives for a node; cached per node object and copied into a fresh Pending each resolve. */
interface IntrinsicEntry {
  readonly manifest: AssetManifest;
  readonly markersKey: string;
  readonly theme: ResolvedTheme;
  /** The parent's parsed props a caption's transcript references were resolved against. */
  readonly parentProps: Record<string, unknown> | undefined;
  readonly template: Readonly<
    Pick<Pending, "props" | "errors" | "source" | "start" | "duration" | "durationDep" | "anchorDep">
  >;
}
const intrinsicByNode = new WeakMap<CollectedNode, IntrinsicEntry>();

function markersSignature(markers: ReadonlyMap<string, number>): string {
  let key = "";
  for (const [id, at] of markers) key += `${id}:${at};`;
  return key;
}

/**
 * Everything about an element that does not depend on where other elements
 * are. Depends only on the node, the manifest and the markers, so the result
 * is cached per node object: the overlay keeps untouched nodes, and a drag
 * step re-derives one element's trim.
 */
function intrinsic(
  node: CollectedNode,
  track: string | null,
  pending: Map<string, Pending>,
  manifest: AssetManifest,
  markers: ReadonlyMap<string, number>,
  markersKey: string,
  theme: ResolvedTheme,
  errors: ResolveError[],
): void {
  const parentProps = node.kind === "caption" && node.parent ? pending.get(node.parent)?.props : undefined;
  const hit = intrinsicByNode.get(node);
  if (
    hit &&
    hit.manifest === manifest &&
    hit.markersKey === markersKey &&
    hit.theme === theme &&
    hit.parentProps === parentProps
  ) {
    const t = hit.template;
    const p: Pending = { node, track, parent: node.parent, props: t.props, errors: [...t.errors] };
    if (t.source) p.source = t.source;
    if (t.start !== undefined) p.start = t.start;
    if (t.duration !== undefined) p.duration = t.duration;
    if (t.durationDep) p.durationDep = { ...t.durationDep };
    if (t.anchorDep) p.anchorDep = { ...t.anchorDep };
    pending.set(node.id, p);
    if (node.kind === "captions")
      for (const child of node.children)
        if (child.kind === "caption") intrinsic(child, track, pending, manifest, markers, markersKey, theme, errors);
    return;
  }
  const p = intrinsicCompute(node, track, pending, manifest, markers, markersKey, theme, errors);
  intrinsicByNode.set(node, {
    manifest,
    markersKey,
    theme,
    parentProps,
    template: {
      props: p.props,
      errors: [...p.errors],
      ...(p.source ? { source: p.source } : {}),
      ...(p.start !== undefined ? { start: p.start } : {}),
      ...(p.duration !== undefined ? { duration: p.duration } : {}),
      ...(p.durationDep ? { durationDep: { ...p.durationDep } } : {}),
      ...(p.anchorDep ? { anchorDep: { ...p.anchorDep } } : {}),
    },
  });
}

function intrinsicCompute(
  node: CollectedNode,
  track: string | null,
  pending: Map<string, Pending>,
  manifest: AssetManifest,
  markers: ReadonlyMap<string, number>,
  markersKey: string,
  theme: ResolvedTheme,
  errors: ResolveError[],
): Pending {
  const caps = capabilitiesOf(node.kind);
  const own: ResolveError[] = [];
  const props = parseProps(node, own, theme);
  const p: Pending = { node, track, parent: node.parent, props, errors: own };
  pending.set(node.id, p);

  const dur = props.duration;
  if (typeof props.anchor === "string") {
    const end = props.anchor.endsWith(".end");
    p.anchorDep = {
      id: end ? props.anchor.slice(0, -4) : props.anchor,
      offset: Number(props.offset ?? 0),
      ...(end ? { edge: "end" as const } : {}),
    };
  }
  if (typeof props.at === "string") {
    // `at` names a moment of the anchor's own footage, so it needs a plain anchor: an element, not the start or an end.
    if (!p.anchorDep || p.anchorDep.id === "start" || p.anchorDep.edge === "end") {
      own.push({
        code: "SCHEMA",
        id: node.id,
        prop: "at",
        message: `at="${props.at}" needs anchor set to the clip that plays it (not "start" or an ".end")`,
      });
    } else {
      p.anchorDep.at = props.at;
    }
  }

  if (caps.trimSource && typeof props.src === "string") {
    const asset = lookupAsset(manifest, props.src);
    if (!asset) {
      own.push({
        code: "MISSING_ASSET",
        id: node.id,
        prop: "src",
        message: `asset ${props.src} is not in the manifest`,
      });
      p.duration = typeof dur === "number" ? dur : 0;
    } else if (asset.kind === "lut") {
      own.push({
        code: "SCHEMA",
        id: node.id,
        prop: "src",
        message: `asset ${props.src} is a LUT, which plays nothing; grade with it: <Effect type="lut" params={{ src: "${props.src}" }} />`,
      });
      p.duration = typeof dur === "number" ? dur : 0;
    } else {
      sourceRange(p, asset, markers);
    }
  } else if (node.kind === "transition") {
    p.duration = Number(props.duration ?? 0.5);
  } else if (node.kind === "gap") {
    p.duration = Number(props.duration);
  } else if (node.kind === "caption") {
    // Timed in the captions pass, once the clips that play the asset are placed.
  } else if (node.kind === "captions") {
    p.start = 0;
    p.durationDep = { kind: "fill" };
    for (const child of node.children)
      if (child.kind === "caption") intrinsic(child, track, pending, manifest, markers, markersKey, theme, errors);
    return p;
  } else if (node.kind === "multicam") {
    p.start = 0;
    p.durationDep = { kind: "fill" };
  } else if (caps.timed) {
    if (dur === undefined) p.duration = DEFAULT_OVERLAY_DURATION;
    else if (typeof dur === "number") p.duration = dur;
    else if (dur === "fill") p.durationDep = { kind: "fill" };
    else if (dur === "source") {
      own.push({
        code: "AMBIGUOUS_DURATION",
        id: node.id,
        prop: "duration",
        message: `<${node.kind}> has no source to take a duration from`,
      });
      p.duration = DEFAULT_OVERLAY_DURATION;
    } else if (typeof dur === "object" && dur && "match" in dur)
      p.durationDep = { kind: "match", id: String((dur as { match: string }).match) };
  }
  return p;
}

const framedByProps = new WeakMap<Record<string, unknown>, { key: string; props: Record<string, unknown> }>();

/** `frame` as a `transform.crop`: a window of the composition's aspect over the source, slid to the focus. A written crop wins. Memoised so an unchanged clip keeps its placement. */
function framed(
  props: Record<string, unknown>,
  asset: AssetEntry | undefined,
  comp: Record<string, unknown>,
): Record<string, unknown> {
  const transform = (props.transform ?? {}) as Record<string, unknown>;
  if (transform.crop || !asset?.width || !asset.height) return props;
  const key = `${comp.width}x${comp.height}`;
  const cached = framedByProps.get(props);
  if (cached?.key === key) return cached.props;
  const { focus } = props.frame as { focus: "left" | "center" | "right" | { x: number; y?: number } };
  const fx = focus === "left" ? 0 : focus === "right" ? 1 : typeof focus === "object" ? focus.x : 0.5;
  const fy = typeof focus === "object" ? (focus.y ?? 0.5) : 0.5;
  const ratio = Number(comp.width) / Number(comp.height) / (asset.width / asset.height);
  const width = Math.min(1, ratio),
    height = Math.min(1, 1 / ratio);
  const out = {
    ...props,
    transform: { ...transform, crop: { x: fx * (1 - width), y: fy * (1 - height), width, height } },
  };
  framedByProps.set(props, { key, props: out });
  return out;
}

/**
 * Keyframes against what they animate: a `param` keyframe sits inside an `<Effect>` and names one of its params, with a
 * value that param's schema takes; a `property` keyframe animates its parent element, so it does not sit in an effect.
 */
function keyframeErrors(items: ReadonlyMap<string, Placement>): ResolveError[] {
  const out: ResolveError[] = [];
  for (const k of items.values()) {
    if (k.kind !== "keyframe") continue;
    const parent = k.parent ? items.get(k.parent) : undefined;
    const param = k.props.param;
    if (typeof param !== "string") {
      if (parent?.kind === "effect")
        out.push({
          code: "INVALID_CHILD",
          id: k.id,
          prop: "property",
          message: `a keyframe inside an <Effect> animates one of its params: param="…", not property`,
        });
      continue;
    }
    if (parent?.kind !== "effect") {
      out.push({
        code: "INVALID_CHILD",
        id: k.id,
        prop: "param",
        message: `a keyframe with param goes inside the <Effect> it animates; on <${parent?.kind ?? "?"}> it takes property`,
      });
      continue;
    }
    const problem = effectParamProblem(parent.props.type, fileShaders, param, k.props.value);
    if (problem) out.push({ code: "SCHEMA", id: k.id, prop: problem.prop, message: problem.message });
  }
  return out;
}

/**
 * Effect params that name an asset (`"asset:ID"`, a texture the shader reads): the asset must be in the manifest, a
 * LUT for `<Effect type="lut">`, and an image or a LUT for an effect the file declares.
 */
function textureErrors(items: ReadonlyMap<string, Placement>, manifest: AssetManifest): ResolveError[] {
  const out: ResolveError[] = [];
  for (const p of items.values()) {
    if (p.kind !== "effect") continue;
    const params = (p.props.params ?? {}) as Readonly<Record<string, unknown>>;
    for (const [name, value] of Object.entries(params)) {
      if (typeof value !== "string" || !value.startsWith("asset:")) continue;
      const asset = lookupAsset(manifest, value);
      const prop = `params.${name}`;
      if (!asset) out.push({ code: "MISSING_ASSET", id: p.id, prop, message: `asset ${value} is not in the manifest` });
      else if (p.props.type === "lut" ? asset.kind !== "lut" : asset.kind !== "image" && asset.kind !== "lut")
        out.push({
          code: "SCHEMA",
          id: p.id,
          prop,
          message: `asset ${value} is ${asset.kind === "image" ? "an image" : `a ${asset.kind}`}; ${p.props.type === "lut" ? "a lut effect reads a .cube file (kind lut)" : "a shader reads an image or a LUT"}`,
        });
    }
  }
  return out;
}

/** The seconds a time reference resolved to, or `fallback` with its error recorded. */
function secondsOr(p: Pending, resolved: ReturnType<typeof resolveTimeRef>, fallback: number): number {
  if (typeof resolved === "number") return resolved;
  p.errors.push(resolved);
  return fallback;
}

function sourceRange(p: Pending, asset: AssetEntry, markers: ReadonlyMap<string, number>): void {
  const { node, props } = p;
  const speed = Number(props.speed ?? 1);
  const inRaw = props.in ?? 0;
  const inT = resolveTimeRef(inRaw, asset, markers, { id: node.id, prop: "in" });
  const inSec = secondsOr(p, inT, 0);
  const dur = props.duration;
  const keys = speedKeysOf(node.children);
  const holds = holdTotal(freezeHoldsOf(node.children));
  let outSec: number;
  /** Timeline seconds the source plays, when `duration` gave them exactly. */
  let played: number | undefined;
  if (props.out !== undefined && dur !== undefined) {
    p.errors.push({
      code: "AMBIGUOUS_DURATION",
      id: node.id,
      prop: "duration",
      message: "give either out or duration, not both",
    });
  }
  if (props.out !== undefined) {
    const o = resolveTimeRef(props.out, asset, markers, { id: node.id, prop: "out" });
    outSec = secondsOr(p, o, inSec);
  } else if (typeof dur === "number") {
    played = dur;
    outSec = inSec + (keys.length > 0 ? rampAdvance(keys, dur) : dur * speed);
  } else if (dur === "fill" || (typeof dur === "object" && dur !== null)) {
    p.durationDep = dur === "fill" ? { kind: "fill" } : { kind: "match", id: String((dur as { match: string }).match) };
    p.source = { in: inSec, out: inSec, speed, asset: asset.id };
    return;
  } else {
    outSec = asset.kind === "image" ? inSec + IMAGE_DEFAULT_DURATION * speed : asset.duration;
  }
  if (asset.kind !== "image" && outSec > asset.duration + 0.05) {
    p.errors.push({
      code: "TRIM_PAST_SOURCE",
      id: node.id,
      prop: "out",
      message: `out ${outSec}s is past the end of ${asset.id} (${asset.duration}s)`,
    });
    outSec = asset.duration;
    played = undefined;
  }
  if (outSec <= inSec) {
    p.errors.push({ code: "TRIM_PAST_SOURCE", id: node.id, prop: "out", message: "out must be after in" });
    outSec = inSec;
    played = undefined;
  }
  p.source = { in: inSec, out: outSec, speed, asset: asset.id };
  // Speed keys replace `speed`; freeze holds are inserted, so they lengthen the clip.
  p.duration = (played ?? (keys.length > 0 ? rampInverse(keys, outSec - inSec) : (outSec - inSec) / speed)) + holds;
}

/** Source seconds a clip plays over `length` timeline seconds: its freeze holds play none, its speed keys replace `speed`. */
function sourceSpan(node: CollectedNode, length: number, speed: number): number {
  const keys = speedKeysOf(node.children);
  const rel = Math.max(0, length - holdTotal(freezeHoldsOf(node.children)));
  return keys.length > 0 ? rampAdvance(keys, rel) : rel * speed;
}

function placeTrack(
  trackNode: CollectedNode,
  track: ResolvedTrack,
  pending: Map<string, Pending>,
  theme: ResolvedTheme,
  errors: ResolveError[],
): void {
  let cursor = 0;
  let prevClip: Pending | null = null;
  let pendingTransition: Pending | null = null;
  for (const child of trackNode.children) {
    const p = pending.get(child.id);
    if (!p) continue;
    const caps = capabilitiesOf(child.kind);
    if (child.kind === "multicam") {
      placeMulticam(child, p, track, pending, theme, errors);
      continue;
    }
    if (child.kind === "transition") {
      if (typeof p.props.on === "string") {
        p.anchorDep = { id: p.props.on, offset: 0 };
        // Edge transitions attach to a clip edge; resolved in iterateDependencies with edge logic.
        continue;
      }
      if (track.layout !== "sequence") {
        p.errors.push({
          code: "NOT_ADJACENT",
          id: child.id,
          message: "a transition between siblings needs a sequence track; use on/edge on free tracks",
        });
        continue;
      }
      pendingTransition = p;
      continue;
    }
    if (p.anchorDep) {
      if (typeof p.props.start === "number")
        p.errors.push({
          code: "SCHEMA",
          id: child.id,
          prop: "start",
          message: "anchored elements take offset, not start",
        });
      continue;
    }
    if (!caps.timed) continue;
    if (track.layout === "free") {
      if (typeof p.props.start !== "number")
        p.errors.push({
          code: "MISSING_START",
          id: child.id,
          prop: "start",
          message: "elements on a free track need start",
        });
      p.start = typeof p.props.start === "number" ? p.props.start : 0;
      continue;
    }
    if (typeof p.props.start === "number") {
      p.errors.push({
        code: "START_ON_SEQUENCE",
        id: child.id,
        prop: "start",
        message: "sequence tracks derive start from order; remove start or use a free track",
      });
    }
    if (p.durationDep?.kind === "fill") {
      p.errors.push({
        code: "AMBIGUOUS_DURATION",
        id: child.id,
        prop: "duration",
        message: '"fill" is not meaningful inside a sequence',
      });
      p.duration = 0;
      delete p.durationDep;
    }
    if (pendingTransition && child.kind === "gap") {
      pendingTransition.errors.push({
        code: "NOT_ADJACENT",
        id: pendingTransition.node.id,
        message: "a transition needs a clip on each side, not a gap",
      });
      pendingTransition.start = cursor;
      pendingTransition = null;
    }
    if (pendingTransition && prevClip) {
      const d = pendingTransition.duration ?? 0;
      const start = Math.max(0, cursor - d);
      pendingTransition.start = start;
      pendingTransition.between = [prevClip.node.id, child.id];
      if (d > (prevClip.duration ?? 0) || (p.duration !== undefined && d > p.duration)) {
        pendingTransition.errors.push({
          code: "INSUFFICIENT_HANDLES",
          id: pendingTransition.node.id,
          message: "transition is longer than one of its clips",
        });
      }
      cursor = start;
    } else if (pendingTransition) {
      pendingTransition.errors.push({
        code: "NOT_ADJACENT",
        id: pendingTransition.node.id,
        message: "a transition needs a clip on each side",
      });
      pendingTransition.start = cursor;
    }
    pendingTransition = null;
    p.start = cursor;
    if (p.duration !== undefined) cursor += p.duration;
    else p.durationDep ??= { kind: "fill" }; // match deps settle later; cursor cannot advance past an unknown length
    if (p.durationDep?.kind === "match") {
      p.errors.push({
        code: "AMBIGUOUS_DURATION",
        id: child.id,
        prop: "duration",
        message: "match durations are not allowed inside a sequence",
      });
      p.duration = 0;
      delete p.durationDep;
    }
    prevClip = child.kind === "gap" ? null : p;
  }
  if (pendingTransition) {
    pendingTransition.errors.push({
      code: "NOT_ADJACENT",
      id: pendingTransition.node.id,
      message: "a transition needs a clip on each side",
    });
    pendingTransition.start = cursor;
  }
}

function placeMulticam(
  node: CollectedNode,
  p: Pending,
  track: ResolvedTrack,
  pending: Map<string, Pending>,
  theme: ResolvedTheme,
  errors: ResolveError[],
): void {
  const angles = new Map<string, Record<string, unknown>>();
  const cuts: { node: CollectedNode; at: number; angle: string }[] = [];
  for (const child of node.children) {
    const cp = parseProps(child, errors, theme);
    if (child.kind === "angle") angles.set(child.id, cp);
    else if (child.kind === "cut" && typeof cp.at === "number")
      cuts.push({ node: child, at: cp.at, angle: String(cp.angle) });
  }
  cuts.sort((a, b) => a.at - b.at);
  const sync = Number(p.props.sync ?? 0);
  p.start = cuts[0]?.at ?? 0;
  cuts.forEach((cut, i) => {
    const next = cuts[i + 1];
    const angle = angles.get(cut.angle);
    if (!angle) {
      errors.push({
        code: "DANGLING_ANCHOR",
        id: cut.node.id,
        prop: "angle",
        message: `angle "${cut.angle}" is not in this multicam`,
      });
      return;
    }
    const id = `${node.id}.${cut.node.id}`;
    const inSec = Math.max(0, cut.at - sync + Number(angle.offset ?? 0));
    const generated: CollectedNode = {
      id,
      kind: "clip",
      parent: node.id,
      children: [],
      editable: "generated",
      lockedProps: [],
      boundProps: {},
      props: { id, src: angle.src, in: inSec },
      origin: { helper: "multicam", callerId: node.id, callIndex: 0 },
    };
    const gp: Pending = {
      node: generated,
      track: track.id,
      parent: node.id,
      props: generated.props as Record<string, unknown>,
      errors: [],
      start: cut.at,
    };
    gp.source = { in: inSec, out: inSec, speed: 1, asset: assetIdOf(String(angle.src)) };
    if (next) {
      gp.duration = next.at - cut.at;
      gp.source = { ...gp.source, out: inSec + gp.duration };
    } else {
      gp.durationDep = { kind: "fill" };
    }
    pending.set(id, gp);
  });
  p.durationDep = { kind: "fill" };
}

function iterateDependencies(pending: Map<string, Pending>, manifest: AssetManifest): void {
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let progressed = false;
    for (const p of pending.values()) {
      if (p.anchorDep && p.start === undefined) {
        const dep = p.anchorDep;
        if (dep.id === "start") {
          p.start = Math.max(0, dep.offset);
          progressed = true;
          continue;
        }
        const target = pending.get(dep.id);
        if (!target) {
          p.errors.push({
            code: "DANGLING_ANCHOR",
            id: p.node.id,
            prop: p.node.kind === "transition" ? "on" : "anchor",
            message: `anchor "${dep.id}" does not exist`,
          });
          p.start = 0;
          delete p.anchorDep;
          progressed = true;
          continue;
        }
        if (
          target.start !== undefined &&
          (target.duration !== undefined || (p.node.kind !== "transition" && dep.edge !== "end"))
        ) {
          if (p.node.kind === "transition") {
            const edge = p.props.edge === "in" ? "in" : "out";
            const d = p.duration ?? 0;
            p.start = edge === "in" ? target.start : target.start + (target.duration ?? 0) - d;
          } else {
            const base =
              dep.at !== undefined
                ? playedAt(p, target, dep.at, manifest)
                : dep.edge === "end"
                  ? (target.duration ?? 0)
                  : 0;
            p.start = Math.max(0, target.start + base + dep.offset);
          }
          progressed = true;
        }
      }
      if (p.durationDep?.kind === "match" && p.duration === undefined) {
        const target = pending.get(p.durationDep.id);
        if (!target) {
          p.errors.push({
            code: "DANGLING_ANCHOR",
            id: p.node.id,
            prop: "duration",
            message: `match target "${p.durationDep.id}" does not exist`,
          });
          p.duration = 0;
          delete p.durationDep;
          progressed = true;
        } else if (target.duration !== undefined) {
          p.duration = target.duration;
          if (p.source) p.source = { ...p.source, out: p.source.in + sourceSpan(p.node, p.duration, p.source.speed) };
          delete p.durationDep;
          progressed = true;
        }
      }
    }
    if (!progressed) break;
  }
  for (const p of pending.values()) {
    if ((p.anchorDep && p.start === undefined) || (p.durationDep?.kind === "match" && p.duration === undefined)) {
      p.errors.push({
        code: "CYCLE",
        id: p.node.id,
        message: `"${p.node.id}" depends on itself through anchors or match durations`,
      });
      p.start ??= 0;
      p.duration ??= 0;
      delete p.anchorDep;
      delete p.durationDep;
    }
  }
}

/**
 * Seconds after `target` starts at which it plays `at`, a word, shot or silence of its source:
 * (source time − source in) / speed. A target that is not footage, plays the moment reversed or through a speed ramp,
 * or has trimmed it out is reported on `p`; then the moment is held to the nearest part the target plays.
 */
function playedAt(p: Pending, target: Pending, at: string, manifest: AssetManifest): number {
  const src = target.source;
  const fail = (code: "INVALID_ANCHOR" | "UNSUPPORTED_ANCHOR", message: string): number => {
    p.errors.push({ code, id: p.node.id, prop: "at", message });
    return 0;
  };
  if (!src)
    return fail(
      "INVALID_ANCHOR",
      `at="${at}" needs anchor "${target.node.id}" to be a clip or audio cut from an asset`,
    );
  if (target.props.reverse === true)
    return fail("UNSUPPORTED_ANCHOR", `at="${at}" on reversed "${target.node.id}" is not supported yet; use offset`);
  if (target.node.children.some((c) => c.kind === "speedKey" || c.kind === "freeze")) {
    return fail(
      "UNSUPPORTED_ANCHOR",
      `at="${at}" on "${target.node.id}", which has speed keys or freezes, is not supported yet; use offset`,
    );
  }
  const t = resolveTimeRef(at, lookupAsset(manifest, src.asset), new Map(), { id: p.node.id, prop: "at" });
  if (typeof t !== "number") {
    p.errors.push(t);
    return 0;
  }
  const EPS = 1e-6;
  if (t < src.in - EPS || t > src.out + EPS) {
    p.errors.push({
      code: "INVALID_ANCHOR",
      id: p.node.id,
      prop: "at",
      message: `${at} (${t.toFixed(2)} s) is not in what "${target.node.id}" plays (${src.in.toFixed(2)}–${src.out.toFixed(2)} s of ${src.asset}): it was trimmed out`,
    });
  }
  return (Math.max(src.in, Math.min(src.out, t)) - src.in) / src.speed;
}

/** Whether two placements would render and edit the same; used to hand back the previous object. */
export function samePlacement(a: Placement, b: Placement): boolean {
  if (a === b) return true;
  if (a.id !== b.id || a.kind !== b.kind || a.track !== b.track || a.parent !== b.parent) return false;
  if (a.start !== b.start || a.end !== b.end || a.duration !== b.duration) return false;
  if (
    a.props !== b.props ||
    a.editable !== b.editable ||
    a.lockedProps !== b.lockedProps ||
    a.boundProps !== b.boundProps
  )
    return false;
  if (!sameSource(a.source, b.source) || !sameBetween(a.between, b.between) || a.interior !== b.interior) return false;
  if (a.children.length !== b.children.length || a.children.some((id, i) => id !== b.children[i])) return false;
  return sameErrors(a.errors, b.errors);
}

function sameSource(a: Placement["source"], b: Placement["source"]): boolean {
  if (!a || !b) return a === b;
  return a.asset === b.asset && a.in === b.in && a.out === b.out && a.speed === b.speed;
}

function sameBetween(a: Placement["between"], b: Placement["between"]): boolean {
  if (!a || !b) return a === b;
  return a[0] === b[0] && a[1] === b[1];
}

function sameChildIds(ids: readonly string[], children: readonly CollectedNode[]): boolean {
  if (ids.length !== children.length) return false;
  for (let i = 0; i < ids.length; i++) if (ids[i] !== children[i]!.id) return false;
  return true;
}

function sameErrors(a: readonly ResolveError[], b: readonly ResolveError[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!,
      y = b[i]!;
    if (x.code !== y.code || x.prop !== y.prop || x.message !== y.message) return false;
  }
  return true;
}

type Place = (
  node: CollectedNode,
  track: string | null,
  parent: string | null,
  start: number,
  length: number,
  props: Record<string, unknown>,
  errors: readonly ResolveError[],
  source: Placement["source"],
  between: Placement["between"],
) => Placement;

/** Non-timed children get the parent's range so the editor can address them; keyframes sit at their `at`. Returns the running composition end. */
function placeChildren(
  node: CollectedNode,
  parent: Placement,
  items: Map<string, Placement>,
  errors: ResolveError[],
  place: Place,
  end: number,
  theme: ResolvedTheme,
): number {
  for (const child of node.children) {
    if (items.has(child.id)) continue;
    const own: ResolveError[] = [];
    const props = parseProps(child, own, theme);
    const caps = capabilitiesOf(child.kind);
    if (caps.placementScope !== "child") {
      own.push({ code: "INVALID_CHILD", id: child.id, message: `<${child.kind}> cannot be a child of <${node.kind}>` });
    }
    let start = parent.start;
    let duration = parent.duration;
    if (child.kind === "keyframe" || child.kind === "speedKey") {
      start = parent.start + Number(props.at ?? 0);
      duration = 0;
    }
    if (child.kind === "freeze") {
      start = parent.start + Number(props.start ?? 0);
      duration = Number(props.duration ?? 0);
    }
    const placement = place(child, parent.track, node.id, start, duration, props, own, undefined, undefined);
    items.set(child.id, placement);
    if (own.length > 0) errors.push(...own);
    if (child.kind !== "transition") end = Math.max(end, placement.end);
    end = placeChildren(child, placement, items, errors, place, end, theme);
  }
  return end;
}

interface CueMemo {
  readonly key: string;
  readonly manifest: AssetManifest;
  readonly props: Record<string, unknown>;
  readonly nodes: readonly CollectedNode[];
}
const cuesByCaptions = new WeakMap<CollectedNode, CueMemo>();

/**
 * Captions follow the clips: a word reference on a literal <Caption> means
 * the composition time at which that word plays, and <Captions src> with no
 * literal cues generates them from the asset's transcript along the timeline.
 */
function placeCaptions(
  root: CollectedNode,
  pending: Map<string, Pending>,
  tracks: readonly ResolvedTrack[],
  manifest: AssetManifest,
  markers: ReadonlyMap<string, number>,
): void {
  for (const node of root.children) {
    if (node.kind !== "captions") continue;
    const cp = pending.get(node.id);
    if (!cp) continue;
    const src = typeof cp.props.src === "string" ? cp.props.src : null;
    const asset = src ? lookupAsset(manifest, src) : null;
    const plays = src ? assetPlays(src, pending, tracks) : [];
    const literal = node.children.filter((c) => c.kind === "caption");
    if (literal.length > 0) {
      for (const child of literal) {
        const p = pending.get(child.id);
        if (!p) continue;
        const s = captionTime(p.props.start, asset, plays, markers, { id: child.id, prop: "start", src });
        const e = captionTime(p.props.end, asset, plays, markers, { id: child.id, prop: "end", src });
        if (typeof s !== "number") p.errors.push(s);
        if (typeof e !== "number") p.errors.push(e);
        p.start = typeof s === "number" ? s : 0;
        p.duration = typeof s === "number" && typeof e === "number" ? Math.max(0, e - s) : 0;
      }
      continue;
    }
    if (!asset?.transcript) continue;
    const key = playsKey(plays);
    const hit = cuesByCaptions.get(node);
    let nodes: readonly CollectedNode[];
    if (hit && hit.key === key && hit.manifest === manifest && hit.props === cp.props) nodes = hit.nodes;
    else {
      const options: CueOptions = {
        maxChars: Number(cp.props.maxChars ?? lineChars(root, cp.props.style)),
        maxDuration: Number(cp.props.maxDuration ?? 5),
        maxGap: Number(cp.props.maxGap ?? 0.8),
        ...(Array.isArray(cp.props.breakAfter)
          ? { breakAfter: new Set((cp.props.breakAfter as string[]).map((ref) => Number(ref.slice("word:".length)))) }
          : {}),
      };
      nodes = cueNodes(node, planCues(timelineWords(asset, plays), options), (id) => pending.has(id));
      cuesByCaptions.set(node, { key, manifest, props: cp.props, nodes });
    }
    for (const cue of nodes) {
      pending.set(cue.id, {
        node: cue,
        track: null,
        parent: node.id,
        props: cue.props as Record<string, unknown>,
        errors: [],
        start: Number(cue.props.start),
        duration: Number(cue.props.end) - Number(cue.props.start),
      });
    }
  }
}

/**
 * How many characters fit on one caption line: the player's side margins (12% a side on vertical video, 8% otherwise)
 * and cue padding (1 em), at about 0.55 em a character. Never more than the old fixed 42.
 */
function lineChars(root: CollectedNode, style: unknown): number {
  const width = Number(root.props.width ?? 1920),
    height = Number(root.props.height ?? 1080);
  const size = Number(
    (typeof style === "object" && style !== null ? (style as { size?: unknown }).size : undefined) ??
      Math.round(height / 24),
  );
  return Math.max(8, Math.min(42, Math.floor((width * (height > width ? 0.76 : 0.84) - size) / (size * 0.55))));
}

/** Where an asset plays: media placements on visible tracks that draw from it, in start order. */
function assetPlays(src: string, pending: Map<string, Pending>, tracks: readonly ResolvedTrack[]): AssetPlay[] {
  const hidden = new Set(tracks.filter((t) => t.hidden).map((t) => t.id));
  const plays: AssetPlay[] = [];
  for (const p of pending.values()) {
    if (!p.source || p.start === undefined || !sameAsset(p.source.asset, src)) continue;
    if (p.track && hidden.has(p.track)) continue;
    if (p.node.kind !== "clip" && p.node.kind !== "audio") continue;
    const keys = speedKeysOf(p.node.children),
      holds = freezeHoldsOf(p.node.children);
    plays.push({
      id: p.node.id,
      start: p.start,
      in: p.source.in,
      out: p.duration === undefined ? Number.POSITIVE_INFINITY : p.source.out,
      speed: p.source.speed,
      ...(keys.length > 0 ? { keys } : {}),
      ...(holds.length > 0 ? { holds } : {}),
    });
  }
  return plays.sort((a, b) => a.start - b.start);
}

function captionTime(
  ref: unknown,
  asset: AssetEntry | null,
  plays: readonly AssetPlay[],
  markers: ReadonlyMap<string, number>,
  ctx: { id: string; prop: string; src: string | null },
): number | ResolveError {
  const parsed = parseTimeRef(ref);
  if (parsed.kind === "seconds" || parsed.kind === "marker" || parsed.kind === "invalid")
    return resolveTimeRef(ref as never, asset, markers, ctx);
  const sec = resolveTimeRef(ref as never, asset, markers, ctx);
  if (typeof sec !== "number") return sec;
  const at = onTimeline(sec, plays);
  if (at === null)
    return {
      code: "UNKNOWN_REF",
      id: ctx.id,
      prop: ctx.prop,
      message: `${String(ref)} of ${ctx.src ?? "the asset"} is not on the timeline`,
    };
  return at;
}
