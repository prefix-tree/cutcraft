import type { TrackFlag, TrackLayout, TrackRole, TransitionType } from "@uberscene/kit/schema";

import type { TimeRef } from "../../manifest/timeref";
import type { Json } from "../../patches/types";
import type { NodeSpec, PlacementSpec } from "./base";

export * from "./base";

type Id = string;
type Props = Readonly<Record<string, Json | undefined>>;

export interface CompositionActions {
  /** Sets the composition's fps, size, sample rate or channel count; only the fields given change. `fps` is a whole number of frames per second. An NTSC rate is a string in the file (`fps="29.97"`), which this action does not write. `sampleRate` must divide into whole ticks (44100, 48000, 96000). */
  "composition/updateSettings": {
    fps?: number;
    width?: number;
    height?: number;
    sampleRate?: number;
    channels?: number;
  };
  /**
   * Sets what shows behind every track: a `color`, or a `blur` of the picture; merges into the current `background`.
   */
  "composition/setBackground": { type?: "color" | "blur"; color?: string };
  /** The tweaks panel: rewrites the file's `defaults` literal. */
  "composition/setProps": { defaults: Readonly<Record<string, Json>> };
  /** Swap the theme (or remove it with null); with `merge`, lay the given parts over the current theme instead. */
  "composition/setTheme": { theme: Readonly<Record<string, Json>> | null; merge?: boolean };
  /** One theme value: a palette colour, a font role or `radius`, by token name without the `$`. */
  "theme/setToken": { token: string; value: string | number };
  /**
   * Set a font from a picker: on a title or the captions (`id`), or as a theme role (`role`: `heading`, `body`,
   * `mono`). The family is bundled, declared in the file, or in the font catalogue; a catalogue family the file does
   * not declare is loaded for the preview at once, and the fold writes its `googleFont()` declaration.
   */
  "font/use": { id?: Id; role?: string; family: string; weight?: number };
  /**
   * Runs several actions as one history entry, each checked against the state the one before left; its undo is their
   * inverses in reverse. Multi-action gestures and compound inverses use it.
   */
  "batch/apply": { actions: readonly ActionInput[] };
}

export interface TrackActions {
  /** Adds an empty track at `position` (last by default), with an optional layout, role and name. */
  "track/add": { trackId: Id; position?: number; layout?: TrackLayout; role?: TrackRole; name?: string };
  /** Deletes a track and everything on it. */
  "track/remove": { trackId: Id };
  /** The undo of track/remove: puts the track back where it was, with its contents. */
  "track/restore": { trackId: Id; node: NodeSpec; position: number };
  /**
   * Copies a track and its contents to `position` (below the source by default), named "<name> Copy"; `idMap` names the
   * copies, other ids get a `_<trackId>` suffix, and anchors inside the track follow the copies.
   */
  "track/duplicate": { sourceTrackId: Id; trackId: Id; idMap: Readonly<Record<Id, Id>>; position?: number };
  /** Sets the track's name. */
  "track/rename": { trackId: Id; name: string };
  /** Moves the track to `position` in the stack. */
  "track/reorder": { trackId: Id; position: number };
  /** Turns one track flag on or off: `locked`, `hidden`, `muted` or `solo`. */
  "track/setFlag": { trackId: Id; flag: TrackFlag; value: boolean };
  /**
   * Switches a track between sequence and free layout, keeping every element where it played: free gets explicit
   * starts, sequence gets a <Gap> per hole. Overlapping items cannot become a sequence.
   */
  "track/setLayout": { trackId: Id; layout: TrackLayout };
  /** Puts the track in a group, or takes it out when `group` is omitted. */
  "track/setGroup": { trackId: Id; group?: Id };
  /** Free tracks only: packs every element from 0 with no gaps, keeping their order. */
  "track/consolidate": { trackId: Id };
  /**
   * Sets the `start` of several elements at once; the undo of track/consolidate and of clip/closeGapBefore on a free
   * track.
   */
  "track/restorePositions": { trackId: Id; positions: readonly { id: Id; start: number }[] };
}

export interface ClipActions {
  /** Puts a <Clip> of `src` on a track at `place`; `in` with `out` or `duration` picks the source range (not both). */
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
  /**
   * Deletes an element from its track: a clip, gap, title or anything else placed on a track. What was placed from it
   * comes along: titles anchored to it move to the clip before it, held inside that clip (removed with it when there is
   * none), a transition left without a clip on one side is removed, and a length that followed it becomes seconds.
   */
  "element/remove": { id: Id };
  /** The undo of element/remove: puts the element back on its track at its old placement. */
  "element/restore": {
    id: Id;
    node: NodeSpec;
    trackId: Id;
    place: PlacementSpec;
    /** The sibling it went after, when that differs from what `place` gives (an anchored element keeps its line). */
    after?: Id | null;
  };
  /**
   * Deletes the element and, on a free track, pulls every later element left by its length; a sequence closes up by
   * itself. What was placed from it comes along as with element/remove.
   */
  "clip/rippleDelete": { id: Id };
  /** The undo of clip/rippleDelete: puts the element back and restores the starts it shifted. */
  "clip/rippleRestore": {
    id: Id;
    node: NodeSpec;
    trackId: Id;
    place: PlacementSpec;
    affected: readonly { id: Id; start: number }[];
  };
  /**
   * Moves an element: reorders it in a sequence (`after`), sets its start on a free track, or re-anchors it; `trackId`
   * moves it to another track. A generated element must be baked first.
   */
  "clip/move": { id: Id; trackId?: Id; place: PlacementSpec };
  /**
   * Moves one edge. For a source clip `value` is the new source in or out (seconds, or a transcript or shot reference);
   * for anything else it is the timeline time of that edge. A title at a word the trim takes away keeps its time as an
   * offset, held inside the clip.
   */
  "clip/trim": { id: Id; edge: "in" | "out"; value: TimeRef };
  /**
   * Cuts an element in two at timeline time `at`; the right half gets `newId`, and keyframes, speed keys and freezes go
   * to the half they fall in. Titles at a word of the right half, anchors on the element's end, lengths until it ends
   * and a transition on its out edge move to `newId`.
   */
  "clip/split": { id: Id; at: number; newId: Id };
  /** The undo of clip/split: removes both halves and puts back the `original` element. */
  "clip/merge": { id: Id; rightId: Id; original: NodeSpec };
  /** Shifts the source window by `delta` seconds without moving the element on the timeline. */
  "clip/slip": { id: Id; delta: number };
  /**
   * Moves a clip by `delta` between its neighbours, keeping its content; the previous clip's tail and the next clip's
   * head absorb it. Both neighbours must be source clips.
   */
  "clip/slide": { id: Id; delta: number };
  /** Moves the cut between two adjacent source clips by `delta`; the total length stays the same. */
  "clip/roll": { leftId: Id; rightId: Id; delta: number };
  /** Trims the `in` or `out` edge to timeline time `at`, which must fall inside the element. */
  "clip/trimToPlayhead": { id: Id; at: number; edge: "in" | "out" };
  /** Writes back the given timing props (`in`, `out`, `duration`, `start`) as they were; used to undo timing edits. */
  "clip/restoreTiming": { id: Id; in?: TimeRef; out?: TimeRef; duration?: Json; start?: number };
  /**
   * Closes the gap before an element: on a free track it and every later element shift left to meet the previous one;
   * on a sequence the <Gap> before it is removed.
   */
  "clip/closeGapBefore": { id: Id };
  /** Sets playback speed, 0.1 to 20; the timeline length follows and `out` stays. */
  "clip/setSpeed": { id: Id; speed: number };
  /** Plays the source backwards, or forwards again. */
  "clip/setReverse": { id: Id; value: boolean };
  /** Sets the blend `mode` of anything that draws, and/or the blend `opacity` of a clip or a nested sequence. */
  "clip/setBlend": { id: Id; mode?: string; opacity?: number };
  /** Sets how a clip or nested scene fills the frame (`fit`); omit `value` to reset it. */
  "clip/setFit": { id: Id; value?: string };
  /**
   * Replaces the media in a slot: swaps `src` on a clip, audio, svg or sticker and keeps its timing and everything
   * else.
   */
  "clip/setSource": { id: Id; src: string };
  /**
   * Anchors the element to another element (or `"start"`) at `offset` seconds; omit `anchor` to unanchor. A new anchor
   * drops a word `at`.
   */
  "clip/setAnchor": { id: Id; anchor?: Id | "start"; offset?: number };
}

/** One key as a file writes it: `value` at `at` seconds into the element; `easing` leaves it. */
export interface KeyJson {
  readonly at: number;
  readonly value: Json;
  readonly easing?: string;
}

export interface FreezeActions {
  /** Replaces the element's holds: each keeps the source frame at `source` on screen from `at` for `duration`. */
  "freeze/setAll": { id: Id; freezes: readonly { start: number; duration: number; source: number }[] };
}

export interface TransformActions {
  /** Deep-merges `transform` into a visual element's transform; only the fields given change. */
  "transform/update": { id: Id; transform: Readonly<Record<string, Json>> };
  /**
   * Places an element or the captions: merges `box` (`x`, `y` in pixels from the frame's top left, `origin`) into its
   * box; only the fields given change, and a field set to null is removed, so that axis is centred again.
   */
  "box/update": { id: Id; box: Readonly<Record<string, Json>> };
}

export interface EffectActions {
  /**
   * Adds `effect` (`{ type, ...params }`, a built-in type or a shader the file declares) to element `id`'s effects at
   * `index` (last by default).
   */
  "effect/add": { id: Id; effect: Readonly<Record<string, Json>> & { readonly type: Json }; index?: number };
  /** Removes the effect at `index`. */
  "effect/remove": { id: Id; index: number };
  /** Merges `params` into the effect at `index`; a param set to null is removed. A param may be keys. */
  "effect/update": { id: Id; index: number; params: Readonly<Record<string, Json>> };
  /** Turns the effect at `index` on or off without removing it. */
  "effect/toggle": { id: Id; index: number; enabled: boolean };
  /** Reorders the effects: `order` lists the current indexes in their new order. */
  "effect/setOrder": { id: Id; order: readonly number[] };
  /** Replaces the element's effects with `effects`. */
  "effect/setStack": { id: Id; effects: readonly Readonly<Record<string, Json>>[] };
}

export interface KeyActions {
  /**
   * Adds a key at `at` seconds into element `id` on `path`: `transform.opacity`, `transform.scale`, `box.x`,
   * `volume`, `pan`, `speed`, `effects.<n>.<param>`… A constant there becomes the first key, at 0; a key already at
   * `at` is replaced.
   */
  "key/add": { id: Id; path: string; at: number; value: Json; easing?: string };
  /** Changes the value and/or easing of the key at `at` on `path`. */
  "key/update": { id: Id; path: string; at: number; value?: Json; easing?: string };
  /** Moves the key at `at` on `path` to `to`, seconds into the element; it must stay inside the element. */
  "key/move": { id: Id; path: string; at: number; to: number };
  /** Removes the key at `at` on `path`; removing the last one removes the value. */
  "key/remove": { id: Id; path: string; at: number };
  /** Replaces the keys on `path` with `keys`; none removes the value. */
  "key/setAll": { id: Id; path: string; keys: readonly KeyJson[] };
}

export interface TransitionActions {
  /**
   * Adds a transition between two adjacent clips on a sequence track (`between: [a, b]`), or on one edge of a clip on
   * any track (`{ on, edge }`); it may not be longer than its clips.
   */
  "transition/add": {
    transitionId: Id;
    between: readonly [Id, Id] | { on: Id; edge: "in" | "out" };
    /** A built-in transition, or one the file declares with `transition()`. */
    type: TransitionType | (string & {});
    duration: number;
    params?: Readonly<Record<string, Json>>;
  };
  /** Deletes a transition. */
  "transition/remove": { transitionId: Id };
  /** The undo of transition/remove: puts the transition back where it was. */
  "transition/restore": { transitionId: Id; node: NodeSpec; trackId: Id; after: Id | null };
  /** Changes a transition's type, duration or params; a new `type` resets params to its defaults plus any given. */
  "transition/update": {
    transitionId: Id;
    type?: TransitionType | (string & {});
    duration?: number;
    params?: Readonly<Record<string, Json>>;
  };
}

export interface AudioActions {
  /** Sets the element's volume, 0 to 4 (1 leaves it as recorded). */
  "audio/setVolume": { id: Id; volume: number };
  /** Sets the fade-in and/or fade-out length in seconds; merges into `fade`. */
  "audio/setFade": { id: Id; in?: number; out?: number };
  /**
   * Turns this sound down to `to` while the track `under` plays, over `attack` and `release` seconds; omit `duck` to
   * stop ducking. `under` is a track id or a track role, as in a file.
   */
  "audio/setDuck": { id: Id; duck?: { under: string; to: number; attack?: number; release?: number } };
}

interface Overlay {
  create: {
    id: Id;
    /** title, shape, svg, sticker, adjustment, nested or layer. */
    kind: string;
    trackId: Id;
    place: PlacementSpec;
    props: Props;
    text?: string;
    children?: readonly NodeSpec[];
    after?: Id | null;
  };
  update: { id: Id; props: Props };
}

export interface OverlayActions {
  /** Adds a title, shape, svg, sticker, adjustment layer, nested scene or layer to a track at `place`, with its props and a title's text. */
  "element/create": Overlay["create"];
  /** Sets literal props on a title, shape, svg, sticker, adjustment layer, nested scene or layer. */
  "element/update": Overlay["update"];
  /** Replaces a title's text. */
  "text/setContent": { id: Id; text: string };
  /**
   * Replaces a <Nested> scene by its contents: one free track per inner track, inserted below, every item at the time
   * it played; on a sequence a <Gap> keeps its slot.
   */
  "nested/extract": { id: Id };
}

export interface CaptionActions {
  /**
   * Creates the composition's one <Captions> from `src` or `items`, or replaces the src and items of the existing one.
   */
  "caption/import": { captionsId: Id; src?: string; items?: readonly NodeSpec[] };
  /** Adds one cue; if the cues were generated from `src`, they all become literal first. */
  "caption/add": { captionsId: Id; captionId: Id; start: TimeRef; end: TimeRef; text: string; words?: Json };
  /** Changes a cue's text, times or words; editing a generated cue makes every cue literal first. */
  "caption/update": { captionId: Id; text?: string; start?: TimeRef; end?: TimeRef; words?: Json };
  /** Deletes one cue; deleting a generated cue makes the others literal first. */
  "caption/remove": { captionId: Id };
  /** The undo of caption/remove: puts the cue back where it was. */
  "caption/restore": { captionsId: Id; node: NodeSpec; after: Id | null };
  /** Sets the captions' `style`: a theme preset's name, or an object (`{ preset, size, align, … }`); omit it to clear. */
  "caption/setStyle": { captionsId: Id; style?: string | Readonly<Record<string, Json>> };
  /** Sets how caption words animate in (`animation`), separate from the style. */
  "caption/setAnimation": { captionsId: Id; animation: string };
  /** Replaces every literal cue with `nodes`; empty `nodes` lets the cues generated from `src` come back. */
  "caption/setAll": { captionsId: Id; nodes: readonly NodeSpec[]; after?: Id | null };
}

export interface MarkerActions {
  /** Adds a timeline marker at `start` seconds, with an optional label and colour. */
  "marker/add": { markerId: Id; start: number; label?: string; color?: string };
  /** Changes a marker's time, label or colour. */
  "marker/update": { markerId: Id; start?: number; label?: string; color?: string };
  /** Deletes a marker. */
  "marker/remove": { markerId: Id };
  /** The undo of marker/remove: puts the marker back where it was. */
  "marker/restore": { node: NodeSpec; after: Id | null };
}

export interface MaskActions {
  /** Adds a mask to the visual element `parentId`. */
  "mask/create": { id: Id; parentId: Id; props: Props };
  /** Sets literal props on a mask. */
  "mask/update": { id: Id; props: Props };
  /** Deletes a mask. */
  "mask/remove": { id: Id };
  /** The undo of mask/remove: puts the mask back on its element. */
  "mask/restore": { id: Id; parentId: Id; node: NodeSpec; after: Id | null };
  /** Gives a mask a drawn `path`, replacing its preset `shape`. */
  "mask/setPath": { id: Id; path: Json };
}

export interface MulticamActions {
  /** Adds a <Multicam> of `angles` to a track at `place`; `sync` is the timeline time the angles line up at. */
  "multicam/create": { id: Id; trackId: Id; place: PlacementSpec; angles: readonly NodeSpec[]; sync?: number };
  /** Deletes a multicam group with its angles and cuts; a group is an element like any other. */
  "multicam/remove": { id: Id };
  /** The undo of multicam/remove: puts the group back on its track at its old placement. */
  "multicam/restore": { id: Id; node: NodeSpec; trackId: Id; place: PlacementSpec };
  /** Adds a cut at `at` that switches the multicam to `angle`. */
  "multicam/addCut": { id: Id; cutId: Id; at: number; angle: Id };
  /** Moves a cut to `at`. */
  "multicam/moveCut": { cutId: Id; at: number };
  /** Deletes a cut. */
  "multicam/removeCut": { cutId: Id };
  /** The undo of multicam/removeCut: puts the cut back in place. */
  "multicam/restoreCut": { id: Id; node: NodeSpec; after: Id | null };
  /**
   * Replaces the multicam by one literal <Clip> per cut, at the time and source range the cut played; free tracks only.
   */
  "multicam/flatten": { id: Id };
}

export interface LayerActions {
  /**
   * Sets a <Layer>'s duration, anchor, offset or start; the escape hatch for timing a Layer. A new anchor drops a word
   * `at`.
   */
  "layer/setTiming": { id: Id; duration?: Json; anchor?: Id | "start"; offset?: number; start?: number };
  /** Sets the handles of a Layer: the props of the one component inside it. */
  "layer/setProps": { id: Id; props: Readonly<Record<string, Json | undefined>> };
}

export interface SourceActions {
  /** Marks a generated element so the next fold writes it and its children as literals; undo is a file revert. */
  "source/bake": { id: Id };
  /** Writes one literal prop on any element; the inspector's generic write. */
  "source/setProp": { id: Id; prop: string; value: Json | undefined };
  /** Several literal props at once; the inverse of every prop-writing action. */
  "source/setProps": { id: Id; props: Readonly<Record<string, Json | undefined>> };
}

export type ActionMap = CompositionActions &
  TrackActions &
  ClipActions &
  FreezeActions &
  TransformActions &
  EffectActions &
  KeyActions &
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
  "box/update",
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
  "key/move",
  "key/update",
  "composition/updateSettings",
  "composition/setBackground",
  "theme/setToken",
  "font/use",
  "element/update",
  "mask/update",
  "layer/setTiming",
  "layer/setProps",
]);

export const TARGET_PARAM_KEYS = [
  "id",
  "leftId",
  "trackId",
  "transitionId",
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
