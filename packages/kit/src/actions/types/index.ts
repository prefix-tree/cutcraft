import type { TrackFlag, TrackLayout, TrackRole, TransitionType } from "../../jsx/enums";
import type { TimeRef } from "../../manifest/timeref";
import type { Json } from "../../patches/types";
import type { NodeSpec, PlacementSpec } from "./base";

export * from "./base";

type Id = string;
type Props = Readonly<Record<string, Json | undefined>>;

export interface CompositionActions {
  "composition/updateSettings": {
    fps?: number;
    width?: number;
    height?: number;
    sampleRate?: number;
    channels?: number;
  };
  "composition/setBackground": { mode?: "color" | "blur"; color?: string };
  /** The tweaks panel: rewrites the file's `defaults` literal. */
  "composition/setProps": { defaults: Readonly<Record<string, Json>> };
  /** Swap the theme (or remove it with null); with `merge`, lay the given parts over the current theme instead. */
  "composition/setTheme": { theme: Readonly<Record<string, Json>> | null; merge?: boolean };
  /** One theme value: a palette colour, a font role or `radius`, by token name without the `$`. */
  "theme/setToken": { token: string; value: string | number };
  "batch/apply": { actions: readonly ActionInput[] };
}

export interface TrackActions {
  "track/add": { trackId: Id; position?: number; layout?: TrackLayout; role?: TrackRole; name?: string };
  "track/remove": { trackId: Id };
  "track/restore": { trackId: Id; node: NodeSpec; position: number };
  "track/duplicate": { sourceTrackId: Id; trackId: Id; idMap: Readonly<Record<Id, Id>>; position?: number };
  "track/rename": { trackId: Id; name: string };
  "track/reorder": { trackId: Id; position: number };
  "track/setFlag": { trackId: Id; flag: TrackFlag; value: boolean };
  "track/setLayout": { trackId: Id; layout: TrackLayout };
  "track/setGroup": { trackId: Id; group?: Id };
  "track/consolidate": { trackId: Id };
  "track/restorePositions": { trackId: Id; positions: readonly { id: Id; start: number }[] };
}

export interface ClipActions {
  "clip/add": {
    id: Id;
    trackId: Id;
    src: string;
    place: PlacementSpec;
    in?: TimeRef;
    out?: TimeRef;
    duration?: number;
  };
  /** An <Audio> (sound only: music, a voice-over), placed like a clip; `duration: "fill"` runs to the composition's end. */
  "audio/add": {
    id: Id;
    trackId: Id;
    src: string;
    place: PlacementSpec;
    in?: TimeRef;
    out?: TimeRef;
    duration?: number | "fill";
  };
  "clip/remove": { id: Id };
  "clip/restore": { id: Id; node: NodeSpec; trackId: Id; place: PlacementSpec };
  "clip/rippleDelete": { id: Id };
  "clip/rippleRestore": {
    id: Id;
    node: NodeSpec;
    trackId: Id;
    place: PlacementSpec;
    affected: readonly { id: Id; start: number }[];
  };
  "clip/move": { id: Id; trackId?: Id; place: PlacementSpec };
  "clip/trim": { id: Id; edge: "in" | "out"; value: TimeRef };
  "clip/split": { id: Id; at: number; newId: Id };
  "clip/merge": { id: Id; rightId: Id; original: NodeSpec };
  "clip/slip": { id: Id; delta: number };
  "clip/slide": { id: Id; delta: number };
  "clip/roll": { leftId: Id; rightId: Id; delta: number };
  "clip/trimToPlayhead": { id: Id; at: number; edge: "in" | "out" };
  "clip/restoreTiming": { id: Id; in?: TimeRef; out?: TimeRef; duration?: Json; start?: number };
  "clip/closeGapBefore": { id: Id };
  "clip/setSpeed": { id: Id; speed: number };
  "clip/setReverse": { id: Id; value: boolean };
  "clip/setBlend": { id: Id; mode?: string; opacity?: number };
  "clip/setFit": { id: Id; value?: string };
  "clip/setSource": { id: Id; src: string };
  "clip/setAnchor": { id: Id; anchor?: Id | "start"; offset?: number };
}

export interface SpeedActions {
  "speed/setKeys": { id: Id; keys: readonly NodeSpec[]; after?: Id | null };
  "speed/setFreezes": { id: Id; freezes: readonly NodeSpec[]; after?: Id | null };
}

export interface TransformActions {
  "transform/update": { id: Id; transform: Readonly<Record<string, Json>> };
}

interface ChildStack<K extends string> {
  add: { id: Id; childId: Id; type: K; params?: Readonly<Record<string, Json>>; index?: number };
  remove: { id: Id; childId: Id };
  restore: { id: Id; node: NodeSpec; after: Id | null };
  update: { id: Id; childId: Id; params: Readonly<Record<string, Json>> };
  toggle: { id: Id; childId: Id; enabled: boolean };
  setOrder: { id: Id; childIds: readonly Id[] };
  setStack: { id: Id; nodes: readonly NodeSpec[]; after?: Id | null };
}

export interface EffectActions {
  "effect/add": ChildStack<string>["add"];
  "effect/remove": ChildStack<string>["remove"];
  "effect/restore": ChildStack<string>["restore"];
  "effect/update": ChildStack<string>["update"];
  "effect/toggle": ChildStack<string>["toggle"];
  "effect/setOrder": ChildStack<string>["setOrder"];
  "effect/setStack": ChildStack<string>["setStack"];
}

export interface KeyframeActions {
  /** `property` animates the element `id`; `param` animates a param of the effect `id`. One of the two. */
  "keyframe/add": {
    id: Id;
    keyId: Id;
    property?: string;
    param?: string;
    at: number;
    value: Json;
    easing?: string;
  };
  "keyframe/remove": { id: Id; keyId: Id };
  "keyframe/restore": { id: Id; node: NodeSpec; after: Id | null };
  "keyframe/update": { id: Id; keyId: Id; value?: Json; easing?: string };
  "keyframe/move": { id: Id; keyId: Id; at: number };
  "keyframe/setAll": { id: Id; nodes: readonly NodeSpec[]; after?: Id | null };
}

export interface TransitionActions {
  "transition/add": {
    transitionId: Id;
    between: readonly [Id, Id] | { on: Id; edge: "in" | "out" };
    /** A built-in transition, or one the file declares with `transition()`. */
    type: TransitionType | (string & {});
    duration: number;
    params?: Readonly<Record<string, Json>>;
  };
  "transition/remove": { transitionId: Id };
  "transition/restore": { transitionId: Id; node: NodeSpec; trackId: Id; after: Id | null };
  "transition/update": {
    transitionId: Id;
    type?: TransitionType | (string & {});
    duration?: number;
    params?: Readonly<Record<string, Json>>;
  };
}

export interface AudioActions {
  "audio/setVolume": { id: Id; volume: number };
  "audio/setFade": { id: Id; in?: number; out?: number };
  "audio/setAutomation": { id: Id; lane: "volume" | "pan"; points: readonly (readonly [number, number])[] };
  "audio/setDuck": { id: Id; duck?: { under: Id; to: number; attack?: number; release?: number } };
}

interface Overlay {
  create: {
    id: Id;
    kind: string;
    trackId: Id;
    place: PlacementSpec;
    props: Props;
    text?: string;
    children?: readonly NodeSpec[];
    after?: Id | null;
  };
  update: { id: Id; props: Props };
  remove: { id: Id };
}

export interface OverlayActions {
  "text/create": Overlay["create"];
  "text/update": Overlay["update"];
  "text/remove": Overlay["remove"];
  "text/setContent": { id: Id; text: string };
  "shape/create": Overlay["create"];
  "shape/update": Overlay["update"];
  "shape/remove": Overlay["remove"];
  "svg/create": Overlay["create"];
  "svg/update": Overlay["update"];
  "svg/remove": Overlay["remove"];
  "sticker/create": Overlay["create"];
  "sticker/update": Overlay["update"];
  "sticker/remove": Overlay["remove"];
  "graphic/create": Overlay["create"];
  "graphic/update": Overlay["update"];
  "graphic/remove": Overlay["remove"];
  "adjustment/create": Overlay["create"];
  "adjustment/update": Overlay["update"];
  "adjustment/remove": Overlay["remove"];
  "nested/create": Overlay["create"];
  "nested/update": Overlay["update"];
  "nested/remove": Overlay["remove"];
  "nested/extract": { id: Id };
}

export interface CaptionActions {
  "caption/import": { captionsId: Id; src?: string; items?: readonly NodeSpec[] };
  "caption/add": { captionsId: Id; captionId: Id; start: TimeRef; end: TimeRef; text: string; words?: Json };
  "caption/update": { captionId: Id; text?: string; start?: TimeRef; end?: TimeRef; words?: Json };
  "caption/remove": { captionId: Id };
  "caption/restore": { captionsId: Id; node: NodeSpec; after: Id | null };
  "caption/setStyle": { captionsId: Id; style?: Readonly<Record<string, Json>> };
  "caption/setAnimation": { captionsId: Id; animation: string };
  "caption/setAll": { captionsId: Id; nodes: readonly NodeSpec[]; after?: Id | null };
}

export interface MarkerActions {
  "marker/add": { markerId: Id; at: number; label?: string; color?: string };
  "marker/update": { markerId: Id; at?: number; label?: string; color?: string };
  "marker/remove": { markerId: Id };
  "marker/restore": { node: NodeSpec; after: Id | null };
}

export interface MaskActions {
  "mask/create": { id: Id; parentId: Id; props: Props };
  "mask/update": { id: Id; props: Props };
  "mask/remove": { id: Id };
  "mask/restore": { id: Id; parentId: Id; node: NodeSpec; after: Id | null };
  "mask/setPath": { id: Id; path: Json };
}

export interface MulticamActions {
  "multicam/create": { id: Id; trackId: Id; place: PlacementSpec; angles: readonly NodeSpec[]; sync?: number };
  "multicam/remove": { id: Id };
  "multicam/restore": { id: Id; node: NodeSpec; trackId: Id; place: PlacementSpec };
  "multicam/setActiveAngle": { id: Id; angle: Id };
  "multicam/addCut": { id: Id; cutId: Id; at: number; angle: Id };
  "multicam/moveCut": { cutId: Id; at: number };
  "multicam/removeCut": { cutId: Id };
  "multicam/restoreCut": { id: Id; node: NodeSpec; after: Id | null };
  "multicam/flatten": { id: Id };
}

export interface LayerActions {
  "layer/setTiming": { id: Id; duration?: Json; anchor?: Id | "start"; offset?: number; start?: number };
  "layer/setProps": { id: Id; props: Readonly<Record<string, Json | undefined>> };
  "layer/setTransform": { id: Id; transform: Readonly<Record<string, Json>> };
}

export interface SourceActions {
  "source/bake": { id: Id };
  "source/setProp": { id: Id; prop: string; value: Json | undefined };
  /** Several literal props at once; the inverse of every prop-writing action. */
  "source/setProps": { id: Id; props: Readonly<Record<string, Json | undefined>> };
}

export type ActionMap = CompositionActions &
  TrackActions &
  ClipActions &
  SpeedActions &
  TransformActions &
  EffectActions &
  KeyframeActions &
  TransitionActions &
  AudioActions &
  OverlayActions &
  CaptionActions &
  MarkerActions &
  MaskActions &
  MulticamActions &
  LayerActions &
  SourceActions;

export type ActionType = keyof ActionMap;

export interface Action<T extends ActionType = ActionType> {
  readonly type: T;
  readonly actionId: string;
  readonly ts: number;
  readonly params: ActionMap[T];
}

export type ActionInput<T extends ActionType = ActionType> = { readonly type: T; readonly params: ActionMap[T] };

export type Namespace = ActionType extends `${infer N}/${string}` ? N : never;

/** Rapid repeats of these on the same target collapse into one undo step (OpenReel's rule). */
export const AUTO_GROUP_TYPES: ReadonlySet<ActionType> = new Set<ActionType>([
  "transform/update",
  "effect/update",
  "audio/setVolume",
  "audio/setFade",
  "audio/setDuck",
  "transition/update",
  "clip/setBlend",
  "clip/move",
  "clip/trim",
  "clip/slip",
  "clip/slide",
  "clip/roll",
  "clip/setSpeed",
  "keyframe/move",
  "keyframe/update",
  "composition/updateSettings",
  "composition/setBackground",
  "theme/setToken",
  "text/update",
  "shape/update",
  "svg/update",
  "sticker/update",
  "graphic/update",
  "mask/update",
  "layer/setTiming",
  "layer/setTransform",
  "layer/setProps",
]);

export const TARGET_PARAM_KEYS = [
  "id",
  "leftId",
  "trackId",
  "transitionId",
  "childId",
  "keyId",
  "captionId",
  "captionsId",
  "cutId",
  "markerId",
] as const;

export function targetIdOf(action: ActionInput): string | null {
  const params = action.params as Record<string, unknown>;
  for (const key of TARGET_PARAM_KEYS) {
    const value = params[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

export function describeAction(action: ActionInput): string {
  const [ns, name] = action.type.split("/") as [string, string];
  const words = name.replace(/([A-Z])/g, " $1").toLowerCase();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} ${ns}`;
}
