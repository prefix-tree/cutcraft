import {
  ALL_FORMATS,
  type EncodedPacket,
  EncodedPacketSink,
  type EncodedVideoPacketSource,
  FilePathSource,
  Input,
  type InputVideoTrack,
} from "mediabunny";

import { motionBlurOf, type ResolvedState } from "@cutcraft/kit";
import {
  buildFramePlan,
  coversCanvas,
  isVisibleAt,
  type MediaResolver,
  makeNestedResolver,
  OVERLAY_KINDS,
  PICK_EPS,
  visiblePlacements,
} from "@cutcraft/player/engine";

import type { VideoCodec } from "./encoding";
import { compatibleConfig } from "./join";

/**
 * Smart copy: where the picture is nothing but a stretch of one source file, shown as it is, the encoded packets
 * of whole groups of pictures can be copied instead of decoded and encoded again. Only the pieces at the ends of
 * the stretch, between its edges and the nearest keyframes, are rendered.
 *
 * It applies when the source is encoded with the codec the output uses (VP8 or VP9), at the composition's size
 * and frame rate, and nothing else shows: no overlay, caption, transition, effect, crop, fade or speed change.
 */
export interface CopyRun {
  readonly kind: "copy";
  /** Output frames [first, last). */
  readonly first: number;
  readonly last: number;
  readonly asset: string;
  readonly path: string;
  /** The source frame shown at output frame `first`, a keyframe. */
  readonly sourceFirst: number;
}

interface RenderRun {
  readonly kind: "render";
  readonly first: number;
  readonly last: number;
}

export type Run = CopyRun | RenderRun;

export interface CopyPlan {
  readonly runs: readonly Run[];
  /** Frames that will be copied. */
  readonly copied: number;
}

/** Codecs whose packets are one picture each and carry what they need in-stream, so pieces from different encoders join. */
const COPYABLE: ReadonlySet<VideoCodec> = new Set<VideoCodec>(["vp9"]);

interface Stretch {
  asset: string;
  first: number;
  last: number;
  sourceFirst: number;
}

export async function planCopy(options: {
  readonly state: ResolvedState;
  readonly media: MediaResolver;
  readonly codec: VideoCodec;
  /** Output frames [first, last) to plan. */
  readonly first: number;
  readonly last: number;
  /** Fewest frames worth copying. */
  readonly minFrames?: number;
}): Promise<CopyPlan> {
  const { state, first, last } = options;
  const whole: CopyPlan = { runs: [{ kind: "render", first, last }], copied: 0 };
  // Motion blur changes every moving picture, footage included: nothing is copied as it is.
  if (!COPYABLE.has(options.codec) || motionBlurOf(state)) return whole;
  const min = options.minFrames ?? 15;
  const { fps, width, height } = state.composition;
  const resolveNested = makeNestedResolver(() => state);

  // 1. Stretches of output frames that show consecutive source frames, untouched.
  const stretches: Stretch[] = [];
  let cur: Stretch | null = null;
  for (let n = first; n < last; n++) {
    const t = n / fps;
    const shown = hasOverlays(state, t) ? null : plainFrame(state, t, width, height, fps, resolveNested);
    if (shown && cur && shown.asset === cur.asset && shown.frame === cur.sourceFirst + (n - cur.first))
      cur.last = n + 1;
    else {
      if (cur) stretches.push(cur);
      cur = shown ? { asset: shown.asset, first: n, last: n + 1, sourceFirst: shown.frame } : null;
    }
  }
  if (cur) stretches.push(cur);

  // 2. Within each, the whole groups of pictures the source has.
  const copies: CopyRun[] = [];
  for (const stretch of stretches) {
    if (stretch.last - stretch.first < min) continue;
    const copy = await wholeGroups(stretch, options.media, options.codec, fps, width, height, min);
    if (copy) copies.push(copy);
  }
  if (copies.length === 0) return whole;

  const runs: Run[] = [];
  let at = first;
  for (const c of copies) {
    if (c.first > at) runs.push({ kind: "render", first: at, last: c.first });
    runs.push(c);
    at = c.last;
  }
  if (at < last) runs.push({ kind: "render", first: at, last });
  return { runs, copied: copies.reduce((sum, c) => sum + (c.last - c.first), 0) };
}

/** The one source frame an output frame shows if it shows nothing else, as the decoder would pick it. */
function plainFrame(
  state: ResolvedState,
  t: number,
  width: number,
  height: number,
  fps: number,
  resolveNested: ReturnType<typeof makeNestedResolver>,
): { asset: string; frame: number } | null {
  const plan = buildFramePlan(state, t, resolveNested);
  const op = plan.ops[0];
  if (
    plan.ops.length !== 1 ||
    !op ||
    op.kind !== "video" ||
    !op.asset ||
    op.sourceTime === undefined ||
    !coversCanvas(op, width, height)
  )
    return null;
  const asset = state.manifest.assets[op.asset];
  if (!asset || asset.fps === undefined || Math.abs(asset.fps - fps) > 1e-6 || asset.kind !== "video") return null;
  return { asset: op.asset, frame: Math.floor(op.sourceTime * fps + PICK_EPS * fps + 1e-9) };
}

async function wholeGroups(
  s: Stretch,
  media: MediaResolver,
  codec: VideoCodec,
  fps: number,
  width: number,
  height: number,
  min: number,
): Promise<CopyRun | null> {
  let handle: Awaited<ReturnType<MediaResolver["resolve"]>>;
  try {
    handle = await media.resolve(s.asset);
  } catch {
    return null;
  }
  if (handle.kind !== "path") return null;
  const input = new Input({ source: new FilePathSource(handle.path), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (
      !track ||
      track.codec !== codec ||
      (await track.getCodedWidth()) !== width ||
      (await track.getCodedHeight()) !== height ||
      (await track.getRotation()) !== 0
    )
      return null;
    const sink = new EncodedPacketSink(track);
    const frameOf = (p: EncodedPacket): number => Math.floor(p.timestamp * fps + PICK_EPS * fps + 1e-9);
    const sourceLast = s.sourceFirst + (s.last - s.first);
    // The first keyframe at or after the stretch starts, and the last at or before it ends.
    let start = await sink.getKeyPacket(s.sourceFirst / fps + PICK_EPS, { metadataOnly: true });
    if (start && frameOf(start) < s.sourceFirst) start = await sink.getNextKeyPacket(start, { metadataOnly: true });
    const stop = await sink.getKeyPacket(sourceLast / fps + PICK_EPS, { metadataOnly: true });
    if (!start || !stop) return null;
    const from = frameOf(start),
      to = frameOf(stop);
    if (to - from < min || from < s.sourceFirst || to > sourceLast) return null;
    // One packet per picture, in order: anything else (a hidden frame of its own) and the pieces would not line up.
    let expected = from;
    for await (const packet of sink.packets(start, stop, { metadataOnly: true })) {
      if (frameOf(packet) !== expected++) return null;
    }
    if (expected !== to) return null;
    return {
      kind: "copy",
      first: s.first + (from - s.sourceFirst),
      last: s.first + (to - s.sourceFirst),
      asset: s.asset,
      path: handle.path,
      sourceFirst: from,
    };
  } finally {
    input.dispose();
  }
}

/** Writes the packets of a copy run into the output's video track, at the frames they are shown. */
export async function feedCopy(
  run: CopyRun,
  into: {
    source: EncodedVideoPacketSource;
    fps: number /** The composition frame the output starts at. */;
    originFrame: number;
    config: { current: VideoDecoderConfig | null };
  },
  before: (timestamp: number) => Promise<void>,
): Promise<void> {
  const input = new Input({ source: new FilePathSource(run.path), formats: ALL_FORMATS });
  try {
    const track = (await input.getPrimaryVideoTrack()) as InputVideoTrack;
    const config = await track.getDecoderConfig();
    if (!config) throw new Error(`${run.asset} has no decoder configuration`);
    const sink = new EncodedPacketSink(track);
    const fps = into.fps;
    const frameOf = (p: EncodedPacket): number => Math.floor(p.timestamp * fps + PICK_EPS * fps + 1e-9);
    const start = await sink.getKeyPacket(run.sourceFirst / fps + PICK_EPS);
    const stop = await sink.getKeyPacket(run.sourceFirst / fps + (run.last - run.first) / fps + PICK_EPS);
    if (!start || !stop) throw new Error(`${run.asset} lost its keyframes between planning and copying`);
    const first = into.config.current;
    if (first && !compatibleConfig(first, config))
      throw new Error(
        `${run.asset} is encoded differently from the rest of the output (${config.codec} against ${first.codec}); it cannot be copied`,
      );
    for await (const packet of sink.packets(start, stop)) {
      const timestamp = (frameOf(packet) - run.sourceFirst + run.first - into.originFrame) / fps;
      await before(timestamp);
      await into.source.add(
        packet.clone({ timestamp, duration: 1 / fps }),
        first ? undefined : { decoderConfig: config },
      );
    }
    into.config.current ??= config;
  } finally {
    input.dispose();
  }
}

/** Whether anything but footage shows at `t`: an overlay element, or a caption line. */
function hasOverlays(state: ResolvedState, t: number): boolean {
  if (visiblePlacements(state, t).some((v) => OVERLAY_KINDS.has(v.placement.kind))) return true;
  return [...state.items.values()].some((p) => p.kind === "caption" && isVisibleAt(p, t, state.composition.duration));
}
