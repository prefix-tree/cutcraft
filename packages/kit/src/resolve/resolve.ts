import type { z } from "zod";
import { SCHEMAS_BY_KIND } from "../jsx/elements";
import type { TrackLayout } from "../jsx/enums";
import { capabilitiesOf } from "../jsx/capabilities";
import { lookupAsset, type AssetEntry, type AssetManifest } from "../manifest/types";
import { resolveTimeRef } from "../manifest/timeref";
import type { PatchLog } from "../patches/types";
import type { ResolveError } from "./errors";
import { overlay } from "./overlay";
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
}

export interface ResolvedTrack {
  readonly id: string;
  readonly layout: TrackLayout;
  readonly order: number;
  readonly locked: boolean;
  readonly hidden: boolean;
  readonly muted: boolean;
  readonly solo: boolean;
  readonly group?: string;
  readonly items: readonly string[];
}

export interface ResolvedState {
  readonly composition: { readonly id: string; readonly fps: number; readonly width: number; readonly height: number; readonly duration: number };
  readonly tracks: readonly ResolvedTrack[];
  readonly items: ReadonlyMap<string, Placement>;
  readonly errors: readonly ResolveError[];
  readonly tree: CollectedTree;
  readonly manifest: AssetManifest;
  readonly log: PatchLog | undefined;
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
  anchorDep?: { id: string | "start"; offset: number };
  between?: readonly [string, string];
}

interface Memo { readonly tree: CollectedTree; readonly manifest: AssetManifest; readonly version: number; readonly state: ResolvedState }
const byLog = new WeakMap<PatchLog, Memo>();
const byTree = new WeakMap<CollectedTree, Memo>();

/** Absolute placements for every element, computed from the tree, the manifests and the patch log. Memoised per log on its version. */
export function resolve(tree: CollectedTree, manifest: AssetManifest, log?: PatchLog): ResolvedState {
  const cached = log ? byLog.get(log) : byTree.get(tree);
  if (cached && cached.tree === tree && cached.manifest === manifest && cached.version === (log?.version ?? -1)) return cached.state;
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
function compute(original: CollectedTree, manifest: AssetManifest, log: PatchLog | undefined, previous?: ReadonlyMap<string, Placement>): ResolvedState {
  const tree = overlay(original, log);
  const errors: ResolveError[] = [...tree.errors];
  const root = tree.root;
  const compParsed = parseProps(root, errors);
  const markers = new Map<string, number>();
  const pending = new Map<string, Pending>();
  const tracks: ResolvedTrack[] = [];
  const reuse = (placement: Placement): Placement => {
    const prev = previous?.get(placement.id);
    return prev && samePlacement(prev, placement) ? prev : placement;
  };
  // Decide reuse before allocating: for an untouched element the previous placement is returned without building a new one.
  const place = (node: CollectedNode, track: string | null, parent: string | null, start: number, length: number, props: Record<string, unknown>, errors: readonly ResolveError[], source: Placement["source"], between: Placement["between"]): Placement => {
    const prev = previous?.get(node.id);
    if (prev && prev.kind === node.kind && prev.track === track && prev.parent === parent && prev.start === start && prev.duration === length && prev.props === props
      && prev.editable === node.editable && prev.lockedProps === node.lockedProps && prev.boundProps === node.boundProps && sameSource(prev.source, source) && sameBetween(prev.between, between)
      && prev.interior === node.interior && sameChildIds(prev.children, node.children) && sameErrors(prev.errors, errors)) return prev;
    const placement: Placement = {
      id: node.id, kind: node.kind, track, parent, children: node.children.map((c) => c.id),
      start, end: start + length, duration: length, props, editable: node.editable, lockedProps: node.lockedProps, boundProps: node.boundProps, errors,
      ...(source ? { source } : {}), ...(between ? { between } : {}), ...(node.interior ? { interior: node.interior } : {}),
    };
    return placement;
  };

  for (const child of root.children) {
    if (child.kind === "marker") {
      const p = parseProps(child, errors);
      const at = p.at;
      if (typeof at === "number") markers.set(child.id, at);
      else errors.push({ code: "UNKNOWN_REF", id: child.id, prop: "at", message: "markers take seconds, not references" });
    }
  }

  const markersKey = markersSignature(markers);
  let order = 0;
  for (const child of root.children) {
    if (child.kind === "track") {
      const p = parseProps(child, errors);
      tracks.push({
        id: child.id,
        layout: (p.layout as TrackLayout) ?? "sequence",
        order: order++,
        locked: Boolean(p.locked), hidden: Boolean(p.hidden), muted: Boolean(p.muted), solo: Boolean(p.solo),
        ...(typeof p.group === "string" ? { group: p.group } : {}),
        items: child.children.map((c) => c.id),
      });
      for (const item of child.children) intrinsic(item, child.id, pending, manifest, markers, markersKey, errors);
    } else if (child.kind === "captions") {
      intrinsic(child, null, pending, manifest, markers, markersKey, errors);
    } else if (child.kind === "multicam") {
      errors.push({ code: "INVALID_CHILD", id: child.id, message: "<Multicam> belongs inside a <Track>" });
    } else if (child.kind !== "marker") {
      errors.push({ code: "INVALID_CHILD", id: child.id, message: `<Composition> cannot contain <${child.kind}>` });
    }
  }

  // Place track children: sequence cursors, free starts; anchors and dependent durations by iteration.
  for (const track of tracks) {
    const trackNode = tree.byId.get(track.id);
    if (!trackNode) continue;
    placeTrack(trackNode, track, pending, errors);
  }
  iterateDependencies(pending, errors);

  let compositionEnd = 0;
  for (const p of pending.values()) {
    if (p.start !== undefined && p.duration !== undefined && p.node.kind !== "transition") compositionEnd = Math.max(compositionEnd, p.start + p.duration);
  }
  for (const p of pending.values()) {
    if (p.durationDep?.kind === "fill" && p.start !== undefined) {
      p.duration = Math.max(0, compositionEnd - p.start);
      delete p.durationDep;
    }
  }
  for (const p of pending.values()) {
    if (p.start === undefined || p.duration === undefined) {
      p.errors.push({ code: p.anchorDep ? "DANGLING_ANCHOR" : "MISSING_START", id: p.node.id, message: `could not place <${p.node.kind} id="${p.node.id}">` });
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
      const props = parseProps(child, own);
      structural.push({ id: child.id, kind: "track", track: child.id, parent: root.id, children: child.children.map((c) => c.id), start: 0, end: 0, duration: 0, props, editable: child.editable, lockedProps: child.lockedProps, boundProps: child.boundProps, errors: own });
    } else if (child.kind === "marker") {
      const own: ResolveError[] = [];
      const props = parseProps(child, own);
      const at = markers.get(child.id) ?? 0;
      structural.push({ id: child.id, kind: "marker", track: null, parent: root.id, children: [], start: at, end: at, duration: 0, props, editable: child.editable, lockedProps: child.lockedProps, boundProps: child.boundProps, errors: own });
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
    duration = placeChildren(p.node, placement, items, errors, place, duration);
  }

  for (const s of structural) {
    items.set(s.id, reuse(s.kind === "track" ? { ...s, end: duration, duration } : s));
    errors.push(...s.errors);
  }
  items.set(root.id, reuse({
    id: root.id, kind: "composition", track: null, parent: null, children: root.children.map((c) => c.id),
    start: 0, end: duration, duration, props: compParsed, editable: root.editable, lockedProps: root.lockedProps, boundProps: root.boundProps, errors: [],
  }));
  return {
    composition: {
      id: root.id,
      fps: Number(compParsed.fps ?? 30),
      width: Number(compParsed.width ?? 1920),
      height: Number(compParsed.height ?? 1080),
      duration,
    },
    tracks, items, errors, tree, manifest, log,
  };
}

interface ParsedProps { readonly data: Record<string, unknown>; readonly errors: readonly ResolveError[] }

/**
 * Parsed props are cached per raw props object: the overlay keeps the props
 * object of every node a patch did not touch, so a drag step re-parses one
 * node, not the whole tree. The cached `data` is shared, never mutated, and
 * is what `Placement.props` points at, so untouched placements keep it
 * across resolves and consumers can memoise on its identity.
 */
const parsedByProps = new WeakMap<object, ParsedProps>();

function parseProps(node: CollectedNode, errors: ResolveError[]): Record<string, unknown> {
  const cached = parsedByProps.get(node.props);
  if (cached) {
    errors.push(...cached.errors);
    return cached.data;
  }
  const schema = SCHEMAS_BY_KIND[node.kind] as z.ZodType | undefined;
  let parsed: ParsedProps;
  if (!schema) parsed = { data: { ...node.props }, errors: [] };
  else {
    const result = schema.safeParse(node.props);
    parsed = result.success
      ? { data: result.data as Record<string, unknown>, errors: [] }
      : { data: { ...node.props }, errors: result.error.issues.map((issue) => ({ code: "SCHEMA", id: node.id, prop: issue.path.map(String).join(".") || undefined, message: issue.message }) as ResolveError) };
  }
  parsedByProps.set(node.props, parsed);
  errors.push(...parsed.errors);
  return parsed.data;
}

/** What `intrinsic` derives for a node; cached per node object and copied into a fresh Pending each resolve. */
interface IntrinsicEntry {
  readonly manifest: AssetManifest;
  readonly markersKey: string;
  /** The parent's parsed props a caption's transcript references were resolved against. */
  readonly parentProps: Record<string, unknown> | undefined;
  readonly template: Readonly<Pick<Pending, "props" | "errors" | "source" | "start" | "duration" | "durationDep" | "anchorDep">>;
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
  errors: ResolveError[],
): void {
  const parentProps = node.kind === "caption" && node.parent ? pending.get(node.parent)?.props : undefined;
  const hit = intrinsicByNode.get(node);
  if (hit && hit.manifest === manifest && hit.markersKey === markersKey && hit.parentProps === parentProps) {
    const t = hit.template;
    const p: Pending = { node, track, parent: node.parent, props: t.props, errors: [...t.errors] };
    if (t.source) p.source = t.source;
    if (t.start !== undefined) p.start = t.start;
    if (t.duration !== undefined) p.duration = t.duration;
    if (t.durationDep) p.durationDep = { ...t.durationDep };
    if (t.anchorDep) p.anchorDep = { ...t.anchorDep };
    pending.set(node.id, p);
    if (node.kind === "captions") for (const child of node.children) if (child.kind === "caption") intrinsic(child, track, pending, manifest, markers, markersKey, errors);
    return;
  }
  const p = intrinsicCompute(node, track, pending, manifest, markers, markersKey, errors);
  intrinsicByNode.set(node, {
    manifest, markersKey, parentProps,
    template: {
      props: p.props, errors: [...p.errors],
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
  errors: ResolveError[],
): Pending {
  const caps = capabilitiesOf(node.kind);
  const own: ResolveError[] = [];
  const props = parseProps(node, own);
  const p: Pending = { node, track, parent: node.parent, props, errors: own };
  pending.set(node.id, p);

  const dur = props.duration;
  if (typeof props.anchor === "string") {
    p.anchorDep = { id: props.anchor, offset: Number(props.offset ?? 0) };
  }

  if (caps.trimSource && typeof props.src === "string") {
    const asset = lookupAsset(manifest, props.src);
    if (!asset) {
      own.push({ code: "MISSING_ASSET", id: node.id, prop: "src", message: `asset ${props.src} is not in the manifest` });
      p.duration = typeof dur === "number" ? dur : 0;
    } else {
      sourceRange(p, asset, markers);
    }
  } else if (node.kind === "transition") {
    p.duration = Number(props.duration ?? 0.5);
  } else if (node.kind === "gap") {
    p.duration = Number(props.duration);
  } else if (node.kind === "caption") {
    const parent = node.parent ? pending.get(node.parent) : undefined;
    const asset = parent && typeof parent.props.src === "string" ? lookupAsset(manifest, parent.props.src) : null;
    const s = resolveTimeRef(props.start, asset, markers, { id: node.id, prop: "start" });
    const e = resolveTimeRef(props.end, asset, markers, { id: node.id, prop: "end" });
    if (typeof s !== "number") own.push(s);
    if (typeof e !== "number") own.push(e);
    p.start = typeof s === "number" ? s : 0;
    p.duration = typeof s === "number" && typeof e === "number" ? Math.max(0, e - s) : 0;
  } else if (node.kind === "captions") {
    p.start = 0;
    p.durationDep = { kind: "fill" };
    for (const child of node.children) if (child.kind === "caption") intrinsic(child, track, pending, manifest, markers, markersKey, errors);
    return p;
  } else if (node.kind === "multicam") {
    p.start = 0;
    p.durationDep = { kind: "fill" };
  } else if (caps.timed) {
    if (dur === undefined) p.duration = DEFAULT_OVERLAY_DURATION;
    else if (typeof dur === "number") p.duration = dur;
    else if (dur === "fill") p.durationDep = { kind: "fill" };
    else if (dur === "source") { own.push({ code: "AMBIGUOUS_DURATION", id: node.id, prop: "duration", message: `<${node.kind}> has no source to take a duration from` }); p.duration = DEFAULT_OVERLAY_DURATION; }
    else if (typeof dur === "object" && dur && "match" in dur) p.durationDep = { kind: "match", id: String((dur as { match: string }).match) };
  }
  return p;
}

function sourceRange(p: Pending, asset: AssetEntry, markers: ReadonlyMap<string, number>): void {
  const { node, props } = p;
  const speed = Number(props.speed ?? 1);
  const inRaw = props.in ?? 0;
  const inT = resolveTimeRef(inRaw, asset, markers, { id: node.id, prop: "in" });
  const inSec = typeof inT === "number" ? inT : (p.errors.push(inT), 0);
  const dur = props.duration;
  let outSec: number;
  if (props.out !== undefined && dur !== undefined) {
    p.errors.push({ code: "AMBIGUOUS_DURATION", id: node.id, prop: "duration", message: "give either out or duration, not both" });
  }
  if (props.out !== undefined) {
    const o = resolveTimeRef(props.out, asset, markers, { id: node.id, prop: "out" });
    outSec = typeof o === "number" ? o : (p.errors.push(o), inSec);
  } else if (typeof dur === "number") {
    outSec = inSec + dur * speed;
  } else if (dur === "fill" || (typeof dur === "object" && dur !== null)) {
    p.durationDep = dur === "fill" ? { kind: "fill" } : { kind: "match", id: String((dur as { match: string }).match) };
    p.source = { in: inSec, out: inSec, speed, asset: asset.id };
    return;
  } else {
    outSec = asset.kind === "image" ? inSec + IMAGE_DEFAULT_DURATION * speed : asset.duration;
  }
  if (asset.kind !== "image" && outSec > asset.duration + 0.05) {
    p.errors.push({ code: "TRIM_PAST_SOURCE", id: node.id, prop: "out", message: `out ${outSec}s is past the end of ${asset.id} (${asset.duration}s)` });
    outSec = asset.duration;
  }
  if (outSec <= inSec) {
    p.errors.push({ code: "TRIM_PAST_SOURCE", id: node.id, prop: "out", message: "out must be after in" });
    outSec = inSec;
  }
  p.source = { in: inSec, out: outSec, speed, asset: asset.id };
  p.duration = (outSec - inSec) / speed;
}

function placeTrack(trackNode: CollectedNode, track: ResolvedTrack, pending: Map<string, Pending>, errors: ResolveError[]): void {
  let cursor = 0;
  let prevClip: Pending | null = null;
  let pendingTransition: Pending | null = null;
  for (const child of trackNode.children) {
    const p = pending.get(child.id);
    if (!p) continue;
    const caps = capabilitiesOf(child.kind);
    if (child.kind === "multicam") {
      placeMulticam(child, p, track, pending, errors);
      continue;
    }
    if (child.kind === "transition") {
      if (typeof p.props.on === "string") {
        p.anchorDep = { id: p.props.on, offset: 0 };
        // Edge transitions attach to a clip edge; resolved in iterateDependencies with edge logic.
        continue;
      }
      if (track.layout !== "sequence") {
        p.errors.push({ code: "NOT_ADJACENT", id: child.id, message: "a transition between siblings needs a sequence track; use on/edge on free tracks" });
        continue;
      }
      pendingTransition = p;
      continue;
    }
    if (p.anchorDep) {
      if (typeof p.props.start === "number") p.errors.push({ code: "SCHEMA", id: child.id, prop: "start", message: "anchored elements take offset, not start" });
      continue;
    }
    if (!caps.timed) continue;
    if (track.layout === "free") {
      if (typeof p.props.start !== "number") p.errors.push({ code: "MISSING_START", id: child.id, prop: "start", message: "elements on a free track need start" });
      p.start = typeof p.props.start === "number" ? p.props.start : 0;
      continue;
    }
    if (typeof p.props.start === "number") {
      p.errors.push({ code: "START_ON_SEQUENCE", id: child.id, prop: "start", message: "sequence tracks derive start from order; remove start or use a free track" });
    }
    if (p.durationDep?.kind === "fill") {
      p.errors.push({ code: "AMBIGUOUS_DURATION", id: child.id, prop: "duration", message: '"fill" is not meaningful inside a sequence' });
      p.duration = 0;
      delete p.durationDep;
    }
    if (pendingTransition && child.kind === "gap") {
      pendingTransition.errors.push({ code: "NOT_ADJACENT", id: pendingTransition.node.id, message: "a transition needs a clip on each side, not a gap" });
      pendingTransition.start = cursor;
      pendingTransition = null;
    }
    if (pendingTransition && prevClip) {
      const d = pendingTransition.duration ?? 0;
      const start = Math.max(0, cursor - d);
      pendingTransition.start = start;
      pendingTransition.between = [prevClip.node.id, child.id];
      if (d > (prevClip.duration ?? 0) || (p.duration !== undefined && d > p.duration)) {
        pendingTransition.errors.push({ code: "INSUFFICIENT_HANDLES", id: pendingTransition.node.id, message: "transition is longer than one of its clips" });
      }
      cursor = start;
    } else if (pendingTransition) {
      pendingTransition.errors.push({ code: "NOT_ADJACENT", id: pendingTransition.node.id, message: "a transition needs a clip on each side" });
      pendingTransition.start = cursor;
    }
    pendingTransition = null;
    p.start = cursor;
    if (p.duration !== undefined) cursor += p.duration;
    else p.durationDep ??= { kind: "fill" }; // match deps settle later; cursor cannot advance past an unknown length
    if (p.durationDep?.kind === "match") {
      p.errors.push({ code: "AMBIGUOUS_DURATION", id: child.id, prop: "duration", message: "match durations are not allowed inside a sequence" });
      p.duration = 0;
      delete p.durationDep;
    }
    prevClip = child.kind === "gap" ? null : p;
  }
  if (pendingTransition) {
    pendingTransition.errors.push({ code: "NOT_ADJACENT", id: pendingTransition.node.id, message: "a transition needs a clip on each side" });
    pendingTransition.start = cursor;
  }
}

function placeMulticam(node: CollectedNode, p: Pending, track: ResolvedTrack, pending: Map<string, Pending>, errors: ResolveError[]): void {
  const angles = new Map<string, Record<string, unknown>>();
  const cuts: { node: CollectedNode; at: number; angle: string }[] = [];
  for (const child of node.children) {
    const cp = parseProps(child, errors);
    if (child.kind === "angle") angles.set(child.id, cp);
    else if (child.kind === "cut") {
      if (typeof cp.at !== "number") { errors.push({ code: "UNKNOWN_REF", id: child.id, prop: "at", message: "cuts take seconds" }); continue; }
      cuts.push({ node: child, at: cp.at, angle: String(cp.angle) });
    }
  }
  cuts.sort((a, b) => a.at - b.at);
  const sync = Number(p.props.sync ?? 0);
  p.start = cuts[0]?.at ?? 0;
  cuts.forEach((cut, i) => {
    const next = cuts[i + 1];
    const angle = angles.get(cut.angle);
    if (!angle) { errors.push({ code: "DANGLING_ANCHOR", id: cut.node.id, prop: "angle", message: `angle "${cut.angle}" is not in this multicam` }); return; }
    const id = `${node.id}.${cut.node.id}`;
    const inSec = Math.max(0, cut.at - sync + Number(angle.offset ?? 0));
    const generated: CollectedNode = {
      id, kind: "clip", parent: node.id, children: [], editable: "generated", lockedProps: [], boundProps: {},
      props: { id, src: angle.src, in: inSec },
      origin: { helper: "multicam", callerId: node.id, callIndex: 0 },
    };
    const gp: Pending = { node: generated, track: track.id, parent: node.id, props: generated.props as Record<string, unknown>, errors: [], start: cut.at };
    gp.source = { in: inSec, out: inSec, speed: 1, asset: String(angle.src) };
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

function iterateDependencies(pending: Map<string, Pending>, _errors: ResolveError[]): void {
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let progressed = false;
    for (const p of pending.values()) {
      if (p.anchorDep && p.start === undefined) {
        const dep = p.anchorDep;
        if (dep.id === "start") { p.start = Math.max(0, dep.offset); progressed = true; continue; }
        const target = pending.get(dep.id);
        if (!target) {
          p.errors.push({ code: "DANGLING_ANCHOR", id: p.node.id, prop: p.node.kind === "transition" ? "on" : "anchor", message: `anchor "${dep.id}" does not exist` });
          p.start = 0;
          delete p.anchorDep;
          progressed = true;
          continue;
        }
        if (target.start !== undefined && (target.duration !== undefined || p.node.kind !== "transition")) {
          if (p.node.kind === "transition") {
            const edge = p.props.edge === "in" ? "in" : "out";
            const d = p.duration ?? 0;
            p.start = edge === "in" ? target.start : target.start + (target.duration ?? 0) - d;
          } else {
            p.start = Math.max(0, target.start + dep.offset);
          }
          progressed = true;
        }
      }
      if (p.durationDep?.kind === "match" && p.duration === undefined) {
        const target = pending.get(p.durationDep.id);
        if (!target) {
          p.errors.push({ code: "DANGLING_ANCHOR", id: p.node.id, prop: "duration", message: `match target "${p.durationDep.id}" does not exist` });
          p.duration = 0;
          delete p.durationDep;
          progressed = true;
        } else if (target.duration !== undefined) {
          p.duration = target.duration;
          if (p.source) p.source = { ...p.source, out: p.source.in + p.duration * p.source.speed };
          delete p.durationDep;
          progressed = true;
        }
      }
    }
    if (!progressed) break;
  }
  for (const p of pending.values()) {
    if ((p.anchorDep && p.start === undefined) || (p.durationDep?.kind === "match" && p.duration === undefined)) {
      p.errors.push({ code: "CYCLE", id: p.node.id, message: `"${p.node.id}" depends on itself through anchors or match durations` });
      p.start ??= 0;
      p.duration ??= 0;
      delete p.anchorDep;
      delete p.durationDep;
    }
  }
}

/** Whether two placements would render and edit the same; used to hand back the previous object. */
export function samePlacement(a: Placement, b: Placement): boolean {
  if (a === b) return true;
  if (a.id !== b.id || a.kind !== b.kind || a.track !== b.track || a.parent !== b.parent) return false;
  if (a.start !== b.start || a.end !== b.end || a.duration !== b.duration) return false;
  if (a.props !== b.props || a.editable !== b.editable || a.lockedProps !== b.lockedProps || a.boundProps !== b.boundProps) return false;
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
    const x = a[i]!, y = b[i]!;
    if (x.code !== y.code || x.prop !== y.prop || x.message !== y.message) return false;
  }
  return true;
}

type Place = (node: CollectedNode, track: string | null, parent: string | null, start: number, length: number, props: Record<string, unknown>, errors: readonly ResolveError[], source: Placement["source"], between: Placement["between"]) => Placement;

/** Non-timed children get the parent's range so the editor can address them; keyframes sit at their `at`. Returns the running composition end. */
function placeChildren(node: CollectedNode, parent: Placement, items: Map<string, Placement>, errors: ResolveError[], place: Place, end: number): number {
  for (const child of node.children) {
    if (items.has(child.id)) continue;
    const own: ResolveError[] = [];
    const props = parseProps(child, own);
    const caps = capabilitiesOf(child.kind);
    if (caps.placementScope !== "child") {
      own.push({ code: "INVALID_CHILD", id: child.id, message: `<${child.kind}> cannot be a child of <${node.kind}>` });
    }
    let start = parent.start;
    let duration = parent.duration;
    if (child.kind === "keyframe" || child.kind === "speedKey") { start = parent.start + Number(props.at ?? 0); duration = 0; }
    if (child.kind === "freeze") { start = parent.start + Number(props.start ?? 0); duration = Number(props.duration ?? 0); }
    const placement = place(child, parent.track, node.id, start, duration, props, own, undefined, undefined);
    items.set(child.id, placement);
    if (own.length > 0) errors.push(...own);
    if (child.kind !== "transition") end = Math.max(end, placement.end);
    end = placeChildren(child, placement, items, errors, place, end);
  }
  return end;
}
