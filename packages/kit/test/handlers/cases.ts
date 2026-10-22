import type { ActionInput, ActionType } from "@cutcut/kit";

/** Stubs: specified, validated, not yet applied. */
export const STUBS: readonly ActionType[] = ["track/setLayout", "nested/extract", "multicam/flatten"];

const clipSpec = { id: "new1", kind: "clip", props: { id: "new1", src: "asset:city", in: 0, out: 2 } };

/** Actions whose effect lives outside the resolved state (a bake mark); the round trip only checks they run and undo. */
export const NO_STATE_CHANGE: readonly ActionType[] = ["source/bake"];

export interface Case { readonly input: ActionInput; readonly setup?: readonly ActionInput[] }

/** Actions that need the fixture prepared first, e.g. a gap removed so two clips meet. */
export const SETUP: Partial<Record<ActionType, readonly ActionInput[]>> = {
  "clip/slide": [{ type: "clip/remove", params: { id: "g1" } }, { type: "transition/remove", params: { transitionId: "x1" } }],
  "clip/roll": [{ type: "transition/remove", params: { transitionId: "x1" } }],
  "track/consolidate": [{ type: "clip/move", params: { id: "a1", place: { start: 2 } } }],
  "clip/merge": [{ type: "clip/split", params: { id: "c3", at: 11, newId: "c3_b" } }],
  "effect/setOrder": [{ type: "effect/add", params: { id: "c1", childId: "fx0", type: "sepia" } }],
  "audioEffect/setOrder": [{ type: "audioEffect/add", params: { id: "a1", childId: "ae0", type: "gain" } }],
};

/** One sample action per registered type, against fixtures/sample.tsx. */
export const CASES: Partial<Record<ActionType, ActionInput>> = {
  "composition/updateSettings": { type: "composition/updateSettings", params: { fps: 25 } },
  "composition/setBackground": { type: "composition/setBackground", params: { mode: "blur" } },
  "composition/setProps": { type: "composition/setProps", params: { defaults: { title: "New", accent: "#000000" } } },
  "batch/apply": { type: "batch/apply", params: { actions: [
    { type: "clip/trim", params: { id: "c2", edge: "out", value: 4.5 } },
    { type: "audio/setVolume", params: { id: "a1", volume: 0.3 } },
  ] } },

  "track/add": { type: "track/add", params: { trackId: "extra", position: 1, layout: "free", role: "effects", name: "Extra" } },
  "track/remove": { type: "track/remove", params: { trackId: "music" } },
  "track/restore": { type: "track/restore", params: { trackId: "restored", node: { id: "restored", kind: "track", props: { id: "restored", layout: "free" }, children: [{ id: "rc1", kind: "clip", props: { id: "rc1", src: "asset:city", start: 1, in: 0, out: 2 } }] }, position: 0 } },
  "track/duplicate": { type: "track/duplicate", params: { sourceTrackId: "main", trackId: "main2", idMap: { c1: "c1x" } } },
  "track/rename": { type: "track/rename", params: { trackId: "main", name: "Primary" } },
  "track/reorder": { type: "track/reorder", params: { trackId: "music", position: 0 } },
  "track/setFlag": { type: "track/setFlag", params: { trackId: "overlays", flag: "muted", value: true } },
  "track/setLayout": { type: "track/setLayout", params: { trackId: "main", layout: "free" } },
  "track/setGroup": { type: "track/setGroup", params: { trackId: "overlays", group: "g" } },
  "track/consolidate": { type: "track/consolidate", params: { trackId: "music" } },
  "track/restorePositions": { type: "track/restorePositions", params: { trackId: "music", positions: [{ id: "a1", start: 1 }] } },

  "clip/add": { type: "clip/add", params: { id: "new1", trackId: "main", src: "asset:city", place: { after: "c2" }, in: 0, out: 2 } },
  "clip/remove": { type: "clip/remove", params: { id: "c2" } },
  "clip/restore": { type: "clip/restore", params: { id: "new1", node: clipSpec, trackId: "main", place: { after: null } } },
  "clip/rippleDelete": { type: "clip/rippleDelete", params: { id: "a1" } },
  "clip/rippleRestore": { type: "clip/rippleRestore", params: { id: "new1", node: clipSpec, trackId: "music", place: { start: 3 }, affected: [] } },
  "clip/move": { type: "clip/move", params: { id: "c2", place: { after: "c3" } } },
  "clip/trim": { type: "clip/trim", params: { id: "c2", edge: "out", value: 4.4 } },
  "clip/split": { type: "clip/split", params: { id: "c3", at: 11, newId: "c3_b" } },
  "clip/merge": { type: "clip/merge", params: { id: "c3", rightId: "c3_b", original: { id: "c3", kind: "clip", props: { id: "c3", src: "asset:interview", in: "shot:2", out: "shot:2.end", speed: 1.2 } } } },
  "clip/slip": { type: "clip/slip", params: { id: "c3", delta: 1 } },
  "clip/slide": { type: "clip/slide", params: { id: "c2", delta: 0.2 } },
  "clip/roll": { type: "clip/roll", params: { leftId: "c1", rightId: "c2", delta: 0.2 } },
  "clip/trimToPlayhead": { type: "clip/trimToPlayhead", params: { id: "c3", at: 11, edge: "in" } },
  "clip/restoreTiming": { type: "clip/restoreTiming", params: { id: "c2", duration: 3 } },
  "clip/closeGapBefore": { type: "clip/closeGapBefore", params: { id: "c3" } },
  "clip/setSpeed": { type: "clip/setSpeed", params: { id: "c3", speed: 2 } },
  "clip/setReverse": { type: "clip/setReverse", params: { id: "c3", value: true } },
  "clip/setPitchCorrection": { type: "clip/setPitchCorrection", params: { id: "c3", value: true } },
  "clip/setSmoothSlowMo": { type: "clip/setSmoothSlowMo", params: { id: "c3", value: true } },
  "clip/setStabilization": { type: "clip/setStabilization", params: { id: "c3", value: { enabled: true, strength: 0.7, crop: "auto" } } },
  "clip/setChromaKey": { type: "clip/setChromaKey", params: { id: "c3", value: { enabled: true, color: "#00ff00" } } },
  "clip/setBlend": { type: "clip/setBlend", params: { id: "c2", mode: "screen", opacity: 0.8 } },
  "clip/setEmphasis": { type: "clip/setEmphasis", params: { id: "c2", value: "ken-burns" } },
  "clip/setFit": { type: "clip/setFit", params: { id: "c2", value: "contain" } },
  "clip/setSource": { type: "clip/setSource", params: { id: "c2", src: "asset:interview" } },
  "clip/setAnchor": { type: "clip/setAnchor", params: { id: "s1", anchor: "c3", offset: 0.5 } },

  "speed/setKeys": { type: "speed/setKeys", params: { id: "c2", keys: [{ id: "sk9", kind: "speedKey", props: { id: "sk9", at: 1, speed: 0.25 } }] } },
  "speed/setFreezes": { type: "speed/setFreezes", params: { id: "c2", freezes: [] } },
  "transform/update": { type: "transform/update", params: { id: "c2", transform: { position: { x: 10, y: 0 }, scale: 1.2 } } },

  "effect/add": { type: "effect/add", params: { id: "c3", childId: "fx9", type: "grain", params: { amount: 20 }, index: 0 } },
  "effect/remove": { type: "effect/remove", params: { id: "c1", childId: "fx1" } },
  "effect/restore": { type: "effect/restore", params: { id: "c3", node: { id: "fx8", kind: "effect", props: { id: "fx8", type: "blur", params: {}, enabled: true } }, after: null } },
  "effect/update": { type: "effect/update", params: { id: "c1", childId: "fx1", params: { radius: 9 } } },
  "effect/toggle": { type: "effect/toggle", params: { id: "c1", childId: "fx1", enabled: false } },
  "effect/setOrder": { type: "effect/setOrder", params: { id: "c1", childIds: ["fx0", "fx1"] } },
  "effect/setStack": { type: "effect/setStack", params: { id: "c1", nodes: [] } },
  "audioEffect/add": { type: "audioEffect/add", params: { id: "a1", childId: "ae9", type: "reverb" } },
  "audioEffect/remove": { type: "audioEffect/remove", params: { id: "a1", childId: "ae1" } },
  "audioEffect/restore": { type: "audioEffect/restore", params: { id: "a1", node: { id: "ae8", kind: "audioEffect", props: { id: "ae8", type: "gain", params: { value: 2 }, enabled: true } }, after: "ae1" } },
  "audioEffect/update": { type: "audioEffect/update", params: { id: "a1", childId: "ae1", params: { ratio: 8 } } },
  "audioEffect/toggle": { type: "audioEffect/toggle", params: { id: "a1", childId: "ae1", enabled: false } },
  "audioEffect/setOrder": { type: "audioEffect/setOrder", params: { id: "a1", childIds: ["ae0", "ae1"] } },
  "audioEffect/setStack": { type: "audioEffect/setStack", params: { id: "a1", nodes: [] } },
  "colorGrade/set": { type: "colorGrade/set", params: { id: "c2", grading: { temperature: 20 } } },

  "keyframe/add": { type: "keyframe/add", params: { id: "c2", keyId: "k9", property: "transform.scale.x", at: 1, value: 1.5, easing: "easeOutBack" } },
  "keyframe/remove": { type: "keyframe/remove", params: { id: "c1", keyId: "k1" } },
  "keyframe/restore": { type: "keyframe/restore", params: { id: "c1", node: { id: "k8", kind: "keyframe", props: { id: "k8", property: "transform.opacity", at: 0.2, value: 0.5 } }, after: "k1" } },
  "keyframe/update": { type: "keyframe/update", params: { id: "c1", keyId: "k2", value: 0.9, easing: "hold" } },
  "keyframe/move": { type: "keyframe/move", params: { id: "c1", keyId: "k2", at: 1 } },
  "keyframe/setAll": { type: "keyframe/setAll", params: { id: "c1", nodes: [] } },

  "transition/add": { type: "transition/add", params: { transitionId: "x9", between: ["c3", "n1"], type: "wipe", duration: 0.4, params: { direction: "right" } } },
  "transition/remove": { type: "transition/remove", params: { transitionId: "x1" } },
  "transition/restore": { type: "transition/restore", params: { transitionId: "x8", node: { id: "x8", kind: "transition", props: { id: "x8", type: "dipToBlack", duration: 0.3, params: {} } }, trackId: "main", after: "c2" } },
  "transition/update": { type: "transition/update", params: { transitionId: "x1", type: "zoom", duration: 0.8 } },

  "audio/setVolume": { type: "audio/setVolume", params: { id: "a1", volume: 0.5 } },
  "audio/setFade": { type: "audio/setFade", params: { id: "a1", in: 1, out: 2 } },
  "audio/setAutomation": { type: "audio/setAutomation", params: { id: "a1", lane: "volume", points: [[0, 1], [5, 0.2]] } },
  "audio/setDuck": { type: "audio/setDuck", params: { id: "a1", duck: { under: "overlays", to: 0.1 } } },

  "text/create": { type: "text/create", params: { id: "t9", kind: "title", trackId: "overlays", place: { anchor: "c2", offset: 1 }, props: { duration: 2, size: 40 }, text: "New title" } },
  "text/update": { type: "text/update", params: { id: "t1", props: { size: 72 } } },
  "text/remove": { type: "text/remove", params: { id: "t1" } },
  "text/setContent": { type: "text/setContent", params: { id: "t1", text: "Changed" } },
  "shape/create": { type: "shape/create", params: { id: "s9", kind: "shape", trackId: "overlays", place: { anchor: "start" }, props: { duration: 1, shape: "circle", width: 50, height: 50 } } },
  "shape/update": { type: "shape/update", params: { id: "s1", props: { cornerRadius: 0 } } },
  "shape/remove": { type: "shape/remove", params: { id: "s1" } },
  "svg/create": { type: "svg/create", params: { id: "v9", kind: "svg", trackId: "overlays", place: { anchor: "start" }, props: { duration: 1, content: "<svg/>" } } },
  "svg/update": { type: "svg/update", params: { id: "v1", props: { duration: 3 } } },
  "svg/remove": { type: "svg/remove", params: { id: "v1" } },
  "sticker/create": { type: "sticker/create", params: { id: "st9", kind: "sticker", trackId: "overlays", place: { anchor: "c1" }, props: { duration: 1, src: "sticker:x" } } },
  "sticker/update": { type: "sticker/update", params: { id: "st1", props: { emphasis: "shake" } } },
  "sticker/remove": { type: "sticker/remove", params: { id: "st1" } },
  "adjustment/create": { type: "adjustment/create", params: { id: "adj9", kind: "adjustment", trackId: "overlays", place: { anchor: "start" }, props: { duration: 2 } } },
  "adjustment/update": { type: "adjustment/update", params: { id: "adj1", props: { opacity: 0.5 } } },
  "adjustment/remove": { type: "adjustment/remove", params: { id: "adj1" } },
  "nested/create": { type: "nested/create", params: { id: "n9", kind: "nested", trackId: "main", place: { after: "c3" }, props: { of: "file:outro.tsx", duration: 2 } } },
  "nested/update": { type: "nested/update", params: { id: "n1", props: { volume: 0.5 } } },
  "nested/remove": { type: "nested/remove", params: { id: "n1" } },
  "nested/extract": { type: "nested/extract", params: { id: "n1" } },

  "caption/import": { type: "caption/import", params: { captionsId: "cap", items: [{ id: "cp9", kind: "caption", props: { id: "cp9", start: 0, end: 1, text: "x" } }] } },
  "caption/add": { type: "caption/add", params: { captionsId: "cap", captionId: "cp3", start: 7, end: 8, text: "later" } },
  "caption/update": { type: "caption/update", params: { captionId: "cp2", text: "to the SHOW", end: 6.5 } },
  "caption/remove": { type: "caption/remove", params: { captionId: "cp1" } },
  "caption/restore": { type: "caption/restore", params: { captionsId: "cap", node: { id: "cp8", kind: "caption", props: { id: "cp8", start: 1, end: 2, text: "r" } }, after: null } },
  "caption/setStyle": { type: "caption/setStyle", params: { captionsId: "cap", style: { size: 50 } } },
  "caption/setAnimation": { type: "caption/setAnimation", params: { captionsId: "cap", animation: "typewriter" } },
  "caption/setAll": { type: "caption/setAll", params: { captionsId: "cap", nodes: [] } },

  "marker/add": { type: "marker/add", params: { markerId: "m9", at: 5, label: "x" } },
  "marker/update": { type: "marker/update", params: { markerId: "m1", at: 3 } },
  "marker/remove": { type: "marker/remove", params: { markerId: "m1" } },
  "marker/restore": { type: "marker/restore", params: { node: { id: "m8", kind: "marker", props: { id: "m8", at: 1, label: "r" } }, after: null } },

  "mask/create": { type: "mask/create", params: { id: "mk9", parentId: "c2", props: { shape: { ellipse: { cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.3 } } } } },
  "mask/update": { type: "mask/update", params: { id: "mk1", props: { feather: 30 } } },
  "mask/remove": { type: "mask/remove", params: { id: "mk1" } },
  "mask/restore": { type: "mask/restore", params: { id: "mk8", parentId: "c2", node: { id: "mk8", kind: "mask", props: { id: "mk8", shape: { polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] } } }, after: null } },
  "mask/setPath": { type: "mask/setPath", params: { id: "mk1", path: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], closed: true } } },

  "multicam/create": { type: "multicam/create", params: { id: "mc9", trackId: "music", place: { start: 0 }, angles: [{ id: "an9", kind: "angle", props: { id: "an9", src: "asset:city" } }] } },
  "multicam/remove": { type: "multicam/remove", params: { id: "mc1" } },
  "multicam/restore": { type: "multicam/restore", params: { id: "mc8", node: { id: "mc8", kind: "multicam", props: { id: "mc8" }, children: [{ id: "an8", kind: "angle", props: { id: "an8", src: "asset:city" } }] }, trackId: "music", place: { start: 1 } } },
  "multicam/setActiveAngle": { type: "multicam/setActiveAngle", params: { id: "mc1", angle: "an2" } },
  "multicam/addCut": { type: "multicam/addCut", params: { id: "mc1", cutId: "cu9", at: 4, angle: "an1" } },
  "multicam/moveCut": { type: "multicam/moveCut", params: { cutId: "cu2", at: 3 } },
  "multicam/removeCut": { type: "multicam/removeCut", params: { cutId: "cu2" } },
  "multicam/restoreCut": { type: "multicam/restoreCut", params: { id: "mc1", node: { id: "cu8", kind: "cut", props: { id: "cu8", at: 1, angle: "an1" } }, after: "cu2" } },
  "multicam/flatten": { type: "multicam/flatten", params: { id: "mc1" } },

  "layer/setTiming": { type: "layer/setTiming", params: { id: "l1", duration: 2, offset: 0.5 } },
  "layer/setTransform": { type: "layer/setTransform", params: { id: "l1", transform: { opacity: 0.5 } } },

  "source/bake": { type: "source/bake", params: { id: "b1" } },
  "source/setProp": { type: "source/setProp", params: { id: "c2", prop: "fit", value: "none" } },
  "source/setProps": { type: "source/setProps", params: { id: "c2", props: { fit: "none", duration: 5 } } },
};
