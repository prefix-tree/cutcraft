import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  type AssetManifest,
  type CollectedNode,
  collectModule,
  type Placement,
  type ResolvedState,
  type ResolvedTrack,
  resolve,
  resolveTheme,
} from "@cutcraft/kit";

import * as sample from "../../../kit/fixtures/sample";

export const kitFixturesDir = join(import.meta.dirname, "..", "..", "..", "kit", "fixtures");
export const fixtureManifest = JSON.parse(
  readFileSync(join(kitFixturesDir, "sample.manifest.json"), "utf8"),
) as AssetManifest;

/** The kit's sample file, resolved. */
export function fixtureState(): ResolvedState {
  return resolve(collectModule(sample), fixtureManifest);
}

export function fixtureElement() {
  return sample.default(sample.defaults);
}

export interface ItemSpec {
  id: string;
  kind: string;
  start?: number;
  duration?: number;
  source?: { in: number; out: number; speed?: number; asset: string };
  props?: Record<string, unknown>;
  children?: ItemSpec[];
  text?: string;
  between?: [string, string];
}

export interface TrackSpec {
  id: string;
  layout?: "sequence" | "free";
  hidden?: boolean;
  muted?: boolean;
  solo?: boolean;
  role?: ResolvedTrack["role"];
  items: ItemSpec[];
}

export interface StateSpec {
  fps?: number;
  width?: number;
  height?: number;
  background?: { mode: "color" | "blur"; color?: string };
  tracks: TrackSpec[];
  manifest?: AssetManifest;
}

export const DEFAULT_MANIFEST: AssetManifest = {
  assets: {
    a: {
      id: "a",
      kind: "video",
      duration: 10,
      fps: 30,
      width: 640,
      height: 360,
      audio: { sampleRate: 48000, channels: 2, streams: 1 },
    },
    b: {
      id: "b",
      kind: "video",
      duration: 20,
      fps: 30,
      width: 1280,
      height: 720,
      audio: { sampleRate: 48000, channels: 2, streams: 1 },
    },
    silent: { id: "silent", kind: "video", duration: 10, fps: 30, width: 640, height: 360 },
    tone: { id: "tone", kind: "audio", duration: 90, audio: { sampleRate: 48000, channels: 2, streams: 1 } },
    img: { id: "img", kind: "image", duration: 0, width: 128, height: 128 },
  },
};

/**
 * Build a ResolvedState by hand. Sequence tracks place items back to back
 * (transitions overlap the way the kit resolver does); free tracks take
 * `start`. Media items without `duration` take it from their source.
 */
export function makeState(spec: StateSpec): ResolvedState {
  const fps = spec.fps ?? 30,
    width = spec.width ?? 640,
    height = spec.height ?? 360;
  const manifest = spec.manifest ?? DEFAULT_MANIFEST;
  const items = new Map<string, Placement>();
  const byId = new Map<string, CollectedNode>();
  const tracks: ResolvedTrack[] = [];
  const trackNodes: CollectedNode[] = [];

  const node = (
    id: string,
    kind: string,
    parent: string | null,
    props: Record<string, unknown>,
    children: CollectedNode[],
    text?: string,
  ): CollectedNode => {
    const n: CollectedNode = {
      id,
      kind,
      parent,
      props,
      children,
      editable: "literal",
      lockedProps: [],
      boundProps: {},
      ...(text !== undefined ? { text } : {}),
    };
    byId.set(id, n);
    return n;
  };

  const place = (it: ItemSpec, track: string, parent: string, start: number): Placement => {
    const speed = it.source?.speed ?? 1;
    const source = it.source ? { in: it.source.in, out: it.source.out, speed, asset: it.source.asset } : undefined;
    const duration = it.duration ?? (source ? (source.out - source.in) / speed : it.kind === "transition" ? 0.5 : 5);
    const props = { id: it.id, ...(it.props ?? {}) };
    const childNodes: CollectedNode[] = [];
    const childPlacements: Placement[] = [];
    for (const c of it.children ?? []) {
      let cs = start,
        cd = duration;
      if (c.kind === "keyframe" || c.kind === "speedKey") {
        cs = start + Number(c.props?.at ?? 0);
        cd = 0;
      }
      if (c.kind === "freeze") {
        cs = start + Number(c.props?.start ?? 0);
        cd = Number(c.props?.duration ?? 0);
      }
      const cp: Placement = {
        id: c.id,
        kind: c.kind,
        track,
        parent: it.id,
        children: [],
        start: cs,
        end: cs + cd,
        duration: cd,
        props: { id: c.id, ...(c.props ?? {}) },
        editable: "literal",
        lockedProps: [],
        boundProps: {},
        errors: [],
      };
      items.set(c.id, cp);
      childPlacements.push(cp);
      childNodes.push(node(c.id, c.kind, it.id, cp.props as Record<string, unknown>, []));
    }
    node(it.id, it.kind, parent, props, childNodes, it.text);
    const p: Placement = {
      id: it.id,
      kind: it.kind,
      track,
      parent,
      children: childPlacements.map((c) => c.id),
      start,
      end: start + duration,
      duration,
      ...(source ? { source } : {}),
      props,
      editable: "literal",
      lockedProps: [],
      boundProps: {},
      errors: [],
      ...(it.between ? { between: it.between } : {}),
    };
    items.set(it.id, p);
    return p;
  };

  spec.tracks.forEach((t, order) => {
    const layout = t.layout ?? "sequence";
    let cursor = 0;
    let pendingTransition: ItemSpec | null = null;
    let prev: Placement | null = null;
    const placed: Placement[] = [];
    for (const it of t.items) {
      if (layout === "sequence") {
        if (it.kind === "transition") {
          pendingTransition = it;
          continue;
        }
        if (pendingTransition && prev) {
          const d = pendingTransition.duration ?? 0.5;
          const xs = Math.max(0, cursor - d);
          placed.push(place({ ...pendingTransition, duration: d, between: [prev.id, it.id] }, t.id, t.id, xs));
          cursor = xs;
        }
        pendingTransition = null;
        const p = place(it, t.id, t.id, cursor);
        placed.push(p);
        cursor = p.end;
        prev = it.kind === "gap" ? null : p;
      } else {
        placed.push(place(it, t.id, t.id, it.start ?? 0));
      }
    }
    const trackNode = node(
      t.id,
      "track",
      "composition",
      { id: t.id, layout },
      placed.map((p) => byId.get(p.id)!),
    );
    trackNodes.push(trackNode);
    tracks.push({
      id: t.id,
      layout,
      order,
      locked: false,
      hidden: t.hidden ?? false,
      muted: t.muted ?? false,
      solo: t.solo ?? false,
      ...(t.role ? { role: t.role } : {}),
      items: placed.map((p) => p.id),
    });
  });

  const duration = Math.max(0, ...[...items.values()].filter((i) => i.kind !== "transition").map((i) => i.end));
  for (const t of tracks) {
    items.set(t.id, {
      id: t.id,
      kind: "track",
      track: t.id,
      parent: "composition",
      children: t.items,
      start: 0,
      end: duration,
      duration,
      props: { id: t.id, layout: t.layout },
      editable: "literal",
      lockedProps: [],
      boundProps: {},
      errors: [],
    });
  }
  const compProps = {
    id: "composition",
    fps,
    width,
    height,
    ...(spec.background ? { background: spec.background } : {}),
  };
  const root = node("composition", "composition", null, compProps, trackNodes);
  items.set("composition", {
    id: "composition",
    kind: "composition",
    track: null,
    parent: null,
    children: tracks.map((t) => t.id),
    start: 0,
    end: duration,
    duration,
    props: compProps,
    editable: "literal",
    lockedProps: [],
    boundProps: {},
    errors: [],
  });
  return {
    composition: { id: "composition", fps, width, height, duration },
    tracks,
    items,
    errors: [],
    tree: { root, byId, errors: [] },
    manifest,
    log: undefined,
    theme: resolveTheme(undefined),
    fonts: [],
    shaders: [],
  };
}

export function childrenOf(state: ResolvedState, id: string): Placement[] {
  return (state.items.get(id)?.children ?? []).map((c) => state.items.get(c)!).filter(Boolean);
}
