// The edits a person makes in an editor, written so each finds its own target in any file: the first clip that has
// room to trim, the first title, the first transition. An edit that finds nothing in a file is not run on it.
import type { ActionInput, Placement, ResolvedState } from "@uberscene/sdk";

export interface Edit {
  /** What the edit is, as a person would say it. */
  readonly name: string;
  /** The action for this file, or nothing when the file has nothing to apply it to. */
  readonly pick: (state: ResolvedState) => ActionInput | undefined;
}

const items = (state: ResolvedState): Placement[] => [...state.items.values()];
/** Written in the file as an element of its own, so an edit to it lands on a line a person wrote. */
const literal = (p: Placement): boolean => p.editable === "literal" && p.lockedProps.length === 0;
const trackOf = (state: ResolvedState, p: Placement) => state.tracks.find((t) => t.id === p.track);
const onSequence = (state: ResolvedState, p: Placement): boolean => trackOf(state, p)?.layout === "sequence";
const first = (state: ResolvedState, test: (p: Placement) => boolean): Placement | undefined =>
  items(state).find((p) => literal(p) && test(p));
const r = (n: number): number => Math.round(n * 1000) / 1000;

/** A footage clip placed straight on a track (not inside a multicam), long enough to trim and split. */
const clip = (state: ResolvedState): Placement | undefined =>
  first(state, (p) => p.kind === "clip" && p.source !== undefined && p.duration > 1 && p.parent === p.track);

export const EDITS: readonly Edit[] = [
  {
    name: "trims the end of a clip",
    pick: (s) => {
      const c = clip(s);
      return c?.source && { type: "clip/trim", params: { id: c.id, edge: "out", value: r(c.source.out - 0.25) } };
    },
  },
  {
    name: "trims the start of a clip",
    pick: (s) => {
      const c = clip(s);
      return c?.source && { type: "clip/trim", params: { id: c.id, edge: "in", value: r(c.source.in + 0.2) } };
    },
  },
  {
    name: "splits a clip in two",
    pick: (s) => {
      const c = clip(s);
      return c && { type: "clip/split", params: { id: c.id, at: r((c.start + c.end) / 2), newId: `${c.id}_b` } };
    },
  },
  {
    name: "changes a clip's speed",
    pick: (s) => {
      const c = clip(s);
      return c && { type: "clip/setSpeed", params: { id: c.id, speed: 1.25 } };
    },
  },
  {
    name: "deletes a clip from a sequence",
    pick: (s) => {
      const c = first(s, (p) => p.kind === "clip" && p.parent === p.track && onSequence(s, p));
      return c && { type: "clip/remove", params: { id: c.id } };
    },
  },
  {
    name: "grades a clip with an effect",
    pick: (s) => {
      const c = clip(s);
      return c && { type: "effect/add", params: { id: c.id, childId: "e2e-look", type: "vignette" } };
    },
  },
  {
    name: "fades a clip in with a keyframe",
    pick: (s) => {
      const c = clip(s);
      return (
        c && {
          type: "keyframe/add",
          params: { id: c.id, keyId: "e2e-k", property: "transform.opacity", at: 0, value: 0 },
        }
      );
    },
  },
  {
    name: "masks a clip",
    pick: (s) => {
      const c = clip(s);
      if (!c?.source) return undefined;
      // An ellipse in the middle of the clip, in the clip's own pixels.
      const asset = s.manifest.assets[c.source.asset];
      const w = asset?.width ?? 1920;
      const h = asset?.height ?? 1080;
      return {
        type: "mask/create",
        params: {
          id: "e2e-mask",
          parentId: c.id,
          props: { shape: { ellipse: { cx: w / 2, cy: h / 2, rx: w / 3, ry: h / 3 } }, feather: 20 },
        },
      };
    },
  },
  {
    name: "rewrites a title",
    pick: (s) => {
      const t = first(s, (p) => p.kind === "title");
      return t && { type: "text/setContent", params: { id: t.id, text: "Edited by hand" } };
    },
  },
  {
    name: "resizes a title",
    pick: (s) => {
      const t = first(s, (p) => p.kind === "title");
      return t && { type: "text/update", params: { id: t.id, props: { size: t.props.size === 64 ? 72 : 64 } } };
    },
  },
  {
    name: "nudges an element on screen",
    pick: (s) => {
      const t = first(s, (p) => ["title", "shape", "layer", "sticker", "svg"].includes(p.kind));
      return t && { type: "transform/update", params: { id: t.id, transform: { position: { x: 40, y: -30 } } } };
    },
  },
  {
    name: "lengthens a transition",
    pick: (s) => {
      const t = first(s, (p) => p.kind === "transition");
      return (
        t && { type: "transition/update", params: { transitionId: t.id, duration: r(Math.max(0.2, t.duration * 0.8)) } }
      );
    },
  },
  {
    name: "changes a transition's look",
    pick: (s) => {
      const t = first(s, (p) => p.kind === "transition" && p.props.type !== "wipe");
      return t && { type: "transition/update", params: { transitionId: t.id, type: "wipe" } };
    },
  },
  {
    name: "adds a transition between two clips",
    pick: (s) => {
      for (const track of s.tracks) {
        if (track.layout !== "sequence") continue;
        const kinds = track.items.map((id) => s.items.get(id));
        for (let i = 0; i + 1 < kinds.length; i++) {
          const a = kinds[i];
          const b = kinds[i + 1];
          if (a?.kind === "clip" && b?.kind === "clip" && literal(a) && literal(b) && a.duration > 1 && b.duration > 1)
            return {
              type: "transition/add",
              params: { transitionId: "e2e-x", between: [a.id, b.id], type: "crossfade", duration: 0.3 },
            };
        }
      }
      return undefined;
    },
  },
  {
    name: "turns a sound down",
    pick: (s) => {
      const a = first(s, (p) => (p.kind === "audio" || p.kind === "clip") && p.source !== undefined);
      return a && { type: "audio/setVolume", params: { id: a.id, volume: 0.5 } };
    },
  },
  {
    name: "fades a sound out",
    pick: (s) => {
      const a = first(s, (p) => p.kind === "audio" && p.duration > 1);
      return a && { type: "audio/setFade", params: { id: a.id, out: 0.5 } };
    },
  },
  {
    name: "restyles the captions",
    pick: (s) => {
      const c = first(s, (p) => p.kind === "captions");
      return (
        c && {
          type: "caption/setAnimation",
          params: { captionsId: c.id, animation: c.props.animation === "karaoke" ? "word-highlight" : "karaoke" },
        }
      );
    },
  },
  {
    name: "retimes a layer",
    pick: (s) => {
      const l = first(s, (p) => p.kind === "layer" && typeof p.props.duration === "number");
      return l && { type: "layer/setTiming", params: { id: l.id, duration: r(l.duration + 0.5) } };
    },
  },
  {
    name: "drops a marker",
    pick: (s) => ({
      type: "marker/add",
      params: { markerId: "e2e-m", at: r(s.composition.duration / 2), label: "check" },
    }),
  },
  {
    name: "adds a track and a title on it",
    pick: () => ({
      type: "batch/apply",
      params: {
        actions: [
          { type: "track/add", params: { trackId: "e2e-notes", layout: "free" } },
          {
            type: "text/create",
            params: {
              id: "e2e-note",
              kind: "title",
              trackId: "e2e-notes",
              place: { start: 0 },
              props: { duration: 1 },
              text: "A note",
            },
          },
        ],
      },
    }),
  },
  {
    name: "moves the top track to the bottom",
    pick: (s) => {
      // Paint order is file order, so this moves the track's whole block to the top of the file.
      const tracks = [...s.tracks].sort((a, b) => a.order - b.order);
      const top = tracks.at(-1);
      return tracks.length > 1 && top ? { type: "track/reorder", params: { trackId: top.id, position: 0 } } : undefined;
    },
  },
  {
    name: "renames a track",
    pick: (s) => {
      const t = s.tracks.find((track) => track.items.some((id) => s.items.get(id)?.editable === "literal"));
      return t && { type: "track/rename", params: { trackId: t.id, name: "Renamed" } };
    },
  },
  {
    name: "changes the theme's primary colour",
    pick: (s) => (themeLocked(s) ? undefined : setPrimary),
  },
];

const setPrimary: ActionInput = { type: "theme/setToken", params: { token: "$primary", value: "#ff5a1f" } };
/** The composition's theme written as an expression (`palette: { accent }`), which the editor cannot rewrite. */
const themeLocked = (s: ResolvedState): boolean =>
  items(s).some((p) => p.kind === "composition" && p.lockedProps.includes("theme"));

export interface Refusal {
  readonly name: string;
  /** The action, on a file where the editor must refuse it; nothing where it would be allowed. */
  readonly pick: (state: ResolvedState) => ActionInput | undefined;
  /** The error code the refusal carries. */
  readonly code: string;
  /** The files it applies to; every file when left out. */
  readonly on?: readonly string[];
  /** An edit of `EDITS` that these files refuse rather than take. */
  readonly replaces?: string;
}

/** An edit of `EDITS`, refused on the files given with `BREAKS_FILE`: what it would leave behind is an error. */
const breaks = (edit: string, files: readonly string[], name: string): Refusal => ({
  name,
  pick: (s) => EDITS.find((e) => e.name === edit)?.pick(s),
  code: "BREAKS_FILE",
  on: files,
  replaces: edit,
});

/** Edits the editor must refuse, with a reason, and leave the file as it was. */
export const REFUSALS: readonly Refusal[] = [
  {
    name: "refuses to rewrite a theme written as an expression",
    pick: (s) => (themeLocked(s) ? setPrimary : undefined),
    code: "LOCKED_PROP",
  },
  // A caption cue there starts or ends on a word these edits take away. Decision 0014 makes a word no clip plays an
  // error, and nothing moves a cue's words, so the editor refuses rather than leave the file broken.
  breaks("trims the end of a clip", ["examples/launch-recap/video.tsx"], "refuses a trim that cuts a caption's word"),
  breaks(
    "trims the start of a clip",
    ["examples/launch-recap/video.tsx"],
    "refuses a trim from the start that cuts a caption's word",
  ),
  breaks(
    "deletes a clip from a sequence",
    ["examples/launch-recap/video.tsx"],
    "refuses to delete a clip a caption's words play in",
  ),
];
