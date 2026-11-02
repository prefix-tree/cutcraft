# Feature parity with OpenReel: JSX vocabulary, action set, kit skeleton

## Context

We are designing a video-editing DSL where the LLM writes a TSX file, the browser renders it as the editor's preview, and the editor's timeline, inspector and preview gestures edit that same file. Decisions already made in this conversation:

- The file is canonical. Elements carry literal ids; editable values are literals or schema props; helper components are pure.
- Editor state is `{ file, patches }`. Gestures dispatch invertible actions into a patch log that the resolver applies over the placement map; the log is folded into the file at sync points (before a model turn, on save or export). Each action has four faces: `validate`, `apply`, `invert`, `fold`.
- Sequential tracks (magnetic storyline) with anchored overlays are the default; free-positioned tracks exist for absolute placement.
- The model edits the file with read, string-replace and write. It has no tool catalog.
- The browser is the renderer for preview and export.

OpenReel Video (MIT, clone at `/tmp/claude-0/-home-user/228eaac9-6e23-53eb-80af-1dce1dfbefbb/scratchpad/openreel/repo`) is the UX reference: 115 executable action types across 16 namespaces, a `{validate, apply, invert}` handler registry, history with gesture auto-grouping. This plan maps our vocabulary and action set onto that feature set so the editor can do everything OpenReel's timeline does, in our file-based model.

**Scope (agreed):** Core NLE + advanced timeline: tracks, clips, trim/split/slip/slide/roll/ripple, speed, reverse, speed ramps, freeze frames, transforms, crop, video and audio effects, color grading, keyframes, transitions, text, shapes/SVG/stickers, captions, markers, audio levels/fades/automation/ducking, masks, adjustment layers, compound (nested) clips, multicam groups, stabilization, chroma key. **Out:** Motion Creator compositions, generated shaders, expressions, 3D creation scenes, 3D mesh shapes.

**Deliverable (agreed):** this spec plus a TypeScript kit package skeleton `@cutcraft/kit` in a new standalone pnpm workspace at `/home/user/cutcut` (`packages/kit`): Zod prop schemas per element, action type unions, registry, history, executor, stub handlers with the four faces, resolver and source-index interfaces, lint rules, fixtures and the first tests. No renderer, no DOM, no UI.

## Sources consulted

- OpenReel `packages/core/src/types/{actions,timeline,project,effects}.ts`, `actions/{registry,action-history,action-executor,inverse-action-generator,action-validator}.ts`, `actions/handlers/*.ts`, `text/types.ts`, `graphics/types.ts`, `video/{adjustment-layer-engine,mask-engine,multicam-engine}.ts`, `timeline/{nested-sequence-engine,timeline-items,timeline-placement}.ts`, `editing/{portable-project,safe-json}.ts`, `capabilities/manifest.ts`
- OpenReel `apps/web/src/components/editor/{Timeline,InspectorPanel,QuickEditBar}.tsx`, `timeline/*`, `inspector/*`, `apps/web/src/stores/project/*-slice.ts`, `services/keyboard-shortcuts.ts`, specs under `docs/superpowers/specs/`
- Claude Design leak (tweaks binding via `data-props`/EDITMODE literal, mentioned-element, comment anchors, static-markup-is-editable rule)

---

## Part A. Element vocabulary (the JSX kit)

### A.1 File shape and shared conventions

A video file is:

```tsx
export const schema = z.object({...});          // tweakable props → inspector/tweaks panel
export const defaults = { ... };                // JSON literal; composition/setProps rewrites it
export default function Video(props) { return <Composition ...>...</Composition>; }
function Helper(...) {...}                       // helpers that make elements are pure; free code inside a Layer may use any hook
```

- **`id`**: required string literal on every vocabulary element, unique per file. Editor-generated ids derive from the parent (`c2` split → `c2`, `c2_b`). Every create action carries its id in params (no `__LAST_ADDED__`).
- **`TimeRef`**: seconds, or `"word:N"`, `"word:N.end"`, `"shot:N"`, `"shot:N.end"`, `"silence:N"`, `"marker:ID"`, resolved against the asset manifest. A gesture that changes a reference writes seconds.
- **Placement by track layout.** `layout="sequence"` (default): children play back to back in source order; `<Gap>` inserts a hole; `start` is a lint error. `layout="free"`: every child has literal `start`. On any track an overlay may use `anchor="<id>" offset={s}`; anchors cannot form cycles.
- **`duration`**: `number | "fill" | "source" | { match: id }`. Media clips give `in`/`out` instead; `duration = (out − in) / speed`. Giving both `in/out` and `duration` is a lint error.
- **Expressions** are legal in any prop; the editor shows that prop locked (`lockedProps`) with a bake action. Literals and references to `schema` props are editable.
- **Child elements** for collections the editor addresses individually: `<Keyframe>`, `<Effect>`, `<AudioEffect>`, `<ColorGrade>`, `<SpeedKey>`, `<Freeze>`, `<Mask>`, `<Caption>`, `<Angle>`, `<Cut>`. Authoring shorthands (`animate={{ opacity: [[0,0],[1,1]] }}`, `<Captions src=...>`) are allowed; the first user edit of an item inside a shorthand bakes it into children.
- **Editable state per resolved element:** `literal` (id in the source index), `generated` (from a loop or a helper used more than once; gestures bake first), `opaque` (a `<Layer>` interior; model-only).

### A.2 Element table (ours ↔ OpenReel)

| Element | OpenReel kind | Key props beyond id/placement |
|---|---|---|
| `<Composition>` | Project settings + Timeline | `fps`, `width`, `height`, `sampleRate=48000`, `channels=2`, `background={{ mode: "color"\|"blur"\|"gradient", color, gradient }}`, `theme={{ extends, palette, fonts, radius, motion, styles }}` (see the Themes guide); children `<Track>`, `<Marker>` (a `<Multicam>` goes inside a `<Track>`) |
| `<Track>` | Track (universal) | `layout`, `name`, `role: general\|captions\|dialogue\|music\|effects\|ambience`, `locked`, `hidden`, `muted`, `solo`, `group`. Child order = compositing order, first on top. Any item kind on any track. |
| `<Clip>` (alias `<Audio>`) | Clip (video/image/audio media) | `src="asset:ID"`, `in`, `out`, `duration`, `speed` 0.1–20, `reverse`, `pitchCorrection`, `smoothSlowMo`, `interpolation`, `transform`, `fit`, `blend`, `blendOpacity`, `volume` 0–4, `fade={{in,out}}`, `automation={{volume:[[t,v]], pan:[[t,v]]}}`, `duck={{ under: trackId, to, attack?, release? }}`, `audioTrack`, `stabilize`, `chromaKey`, `emphasis`, `behindSubject`; children `<Effect>`, `<AudioEffect>`, `<ColorGrade>`, `<Keyframe>`, `<Mask>`, `<SpeedKey>`, `<Freeze>` |
| `<Gap>` | (gaps) | `duration` |
| `<Transition>` | Transition | Sibling between two clips in a sequence track: `type`, `duration`, `params`. Edge form: `on="<clipId>" edge="in"\|"out"`. In sequence layout the two clips overlap by `duration` (each extends its source by `duration/2`; needs handles) and the sequence shortens by `duration`. The resolver emits a placement for the transition itself at `boundary − duration/2`. |
| `<Title>` | TextClip | text as children; `style` (theme preset); flat style props (`font`, `size`, `weight`, `italic`, `color`, `background`, `stroke`, `shadow`, `align`, `valign`, `lineHeight`, `letterSpacing`, `decoration`); `animation={{ preset, in, out, stagger, unit, params }}`; `text3d`; `enter`, `exit`; `transform`, `blend`, `emphasis`; children `<Effect>`, `<Keyframe>` |
| `<Shape>` | ShapeClip | `style` (theme preset), `shape` (rectangle, circle, ellipse, triangle, arrow, line, polygon, path, star), `points`, `fill`, `stroke`, `shadow`, `shadows`, `cornerRadius`/`cornerRadii`, `starPoints`, `innerRadius`; `enter`, `exit`; transform/blend/emphasis; children `<Effect>`, `<Keyframe>` |
| `<Svg>` | SVGClip | `style`, `src` or `content`, `viewBox`, `preserveAspectRatio`, `color={{ mode, tint, opacity }}`, `enter`, `exit` |
| `<Sticker>` | StickerClip | `style`, `src`, `category`, `name`; `enter`, `exit`; transform/blend/emphasis |
| `<Captions>` | Timeline.subtitles | `src="asset:ID"` (generated children from the transcript) or literal `<Caption id start end text words>` children; `style={{ font, size, color, background, position, highlight, upcoming }}` or a theme preset name, `animation`. One per composition. |
| `<Marker>` | Marker | `at`, `label`, `color`; child of `<Composition>` |
| `<Adjustment>` | AdjustmentLayer | `affects="all" \| [trackId]`, `opacity`, `blend`, `enabled`, `transform`; children `<Effect>` |
| `<Mask>` | Mask | child of a visual element: `type: shape\|drawn\|matte`, `shape` or `path={{ points, closed }}`, `feather` 0–100, `inverted`, `expansion` −100..100, `opacity`, `matte={{ source, channel: alpha\|luminance\|bounds }}`; children `<Keyframe property="path">` |
| `<Nested>` | CompoundClip + instance | `of={SceneHelper}` (pure helper returning tracks/composition), `in`, `out`, `transform`, `volume` |
| `<Multicam>` + `<Angle>` + `<Cut>` | MultiCamGroup + angles + switches | `<Multicam id name sync>` with `<Angle id src offset color/>` and `<Cut id at angle/>`; the resolver expands cuts into generated clips on the containing track; angle sources render hidden |
| `<Layer>` | — (ours) | `duration`, `anchor`/`offset`, `transform`, `enter`, `exit`; free code inside (any React, hooks, CSS, canvas, WebGL, host-offered libraries; decision 0018), timed by `useT()` (0..1) or `useLayer()` (seconds elapsed, remaining, duration); one component child gives the Layer handles (`layer/setProps`) |
| `<Effect>` / `<AudioEffect>` | Effect | `type`, `params`, `enabled`; order = stack order |
| `<ColorGrade>` | ClipColorGrading | `wheels`, `curves`, `lut`, `hsl`, `temperature`, `tint` |
| `<Keyframe>` | Keyframe | `property`, `at` (element-relative), `value`, `easing`, `handles`, `roving` |
| `<SpeedKey>` / `<Freeze>` | SpeedKeyframe / FreezeFrame | `at, speed, easing` / `at` (source), `start` (element-relative), `duration` |

### A.3 Enums (single source `jsx/enums.ts`, adopted from OpenReel)

- Transitions (24) with per-type param schemas and engine defaults. Easing (50). Blend modes (18). Fit modes (4). Video effects (one unified list of 20, percent-based ranges from OpenReel's `EFFECT_DEFINITIONS`; brightness standardised to −100..100). Audio effects (9). Text animation presets (25), caption animations (6), graphic enter/exit (20), emphasis (26). Keyframe properties use the descriptor naming (`transform.opacity`, `audio.volume`, `effect.<id>.<param>`). Shape types: the 9 2D shapes.

### A.4 Resolver output

`ResolvedState` = composition meta, tracks (layout, order, flags, item ids), `items: Map<id, Placement>` with `{ kind, track, parent, children, start, end, duration, source?: {in,out,speed}, props, editable, lockedProps, errors }`, plus `errors`. Error codes: `DANGLING_ANCHOR, CYCLE, TRIM_PAST_SOURCE, UNKNOWN_REF, NOT_ADJACENT, INSUFFICIENT_HANDLES, NO_VISUAL_PARENT, DUPLICATE_ID, MISSING_ASSET, START_ON_SEQUENCE, MISSING_START, AMBIGUOUS_DURATION, SCHEMA`.

---

## Part B. Action set

### B.1 Action, handler, history

```ts
type Action<T> = { type: T; actionId: string; ts: number; params: ActionMap[T] };   // params.id = target element

interface ActionHandler<T> {
  type: T;
  validate(a, state: ResolvedState): ValidationResult;      // codes below
  apply(a, log: PatchLog, state): void;                      // appends patches only
  invert(a, before: ResolvedState): Action | Action[];       // arrays are wrapped as batch/apply; never null
  fold(a, index: SourceIndex, state): SourceEdit[];          // [] = generic fold from the net patch
}
```

Validation codes (one list, shared with resolver): `ELEMENT_NOT_FOUND, TRACK_LOCKED, LOCKED_PROP, OPAQUE_TARGET, INVALID_PARAMS, INVALID_TIME_RANGE, OUT_OF_BOUNDS, NOT_ADJACENT, INSUFFICIENT_HANDLES, CYCLE, DUPLICATE_ID, UNSUPPORTED_ON_LAYOUT, UNKNOWN_ACTION`.

History: port of OpenReel's `ActionHistory` (explicit nested groups, auto-group same type + same target within 100 ms, max 1000, named snapshots), each entry also carrying its patch-log mark range. Target id keys: `id, leftId, trackId, transitionId, effectId, keyId, captionId, cutId`.

### B.2 Action table

Fold: `prop` = rewrite a literal prop; `ins`/`rm`/`mv` = element insert/remove/reorder; `bake` = bake generated subtree first. Inverse `self` = same type with prior values.

**composition/** ↔ project/: `updateSettings` (prop), `setBackground` (prop), `setProps {defaults}` (rewrites the `defaults` literal). **batch/apply {actions[]}** (meta, inverse = reversed inverses).

**track/** ↔ track/ (12): `add {trackId, position?, layout?, role?, name?}` ↔ `remove`; `remove` ↔ `restore {source, position}`; `duplicate {sourceTrackId, trackId, idMap}`; `rename`; `reorder {position}` (mv); `setFlag {flag: locked|hidden|muted|solo, value}`; `setLayout {layout}` (prop + rewrite children `start` ↔ order/gaps, inverse batch of restoreTiming); `setGroup`; `consolidate` (free only) ↔ `restorePositions {positions[]}`.

**clip/** ↔ clip/ (24), on any timed element where meaningful:
| Action | Params | Inverse | Fold |
|---|---|---|---|
| add | `id, trackId, src, after?\|start?, in?, out?, duration?` | remove | ins |
| remove | `id` | restore | rm |
| restore | `id, node, trackId, after?\|start?` | remove | ins |
| rippleDelete | `id` | rippleRestore | free: rm + prop `start` on later siblings; sequence: = remove |
| move | `id, trackId?, after?` (sequence) or `start` (free) | self | mv / prop |
| trim | `id, edge: in\|out, value: TimeRef` | restoreTiming | prop `in`/`out`; free layout + edge `in` also rewrites `start` |
| split | `id, at, newId` | merge | replace element by two: children with `at`/`start` before the split stay left, others move right with times shifted; Mask/Effect/ColorGrade duplicated; free layout right half gets `start = at` |
| merge | `id, originalNode` | split | replace two by original |
| slip | `id, delta` | restoreTiming | prop `in`,`out` |
| slide | `id, delta` (this clip keeps content; prev tail +Δ; next head +Δ) | batch restoreTiming ×3 | prop ×3 |
| roll | `leftId, rightId, delta` | batch restoreTiming ×2 | prop ×2 |
| trimToPlayhead | `id, at, edge` | restoreTiming | prop |
| restoreTiming | `id, in, out, duration?, start?` | self | prop |
| closeGapBefore | `id` | track/restorePositions | free: prop `start`; sequence: rm `<Gap>` |
| setSpeed | `id, speed` (duration always recomputed) | self | prop |
| setReverse, setPitchCorrection, setSmoothSlowMo, setStabilization, setChromaKey, setBlend, setEmphasis, setFit, setSource, setAnchor | `id, value…` | self | prop |

**speed/** (2): `setKeys {id, keys[]}`, `setFreezes {id, freezes[]}` → replace children.

**transform/** (1): `update {id, transform: DeepPartial}` deep-merge per axis; inverse full prior; prop.

**effect/** and **audioEffect/** (6 each, same shape): `add {id, effectId, type, params?, index?}` ↔ `remove`; `remove` ↔ `restore {node, index}`; `update {params}` (inverse exact prior, replace not merge); `toggle`; `setOrder {effectIds[]}`; `setStack {effects[]}`. **colorGrade/set {id, grading?}**.

**keyframe/** (5): `add {id, keyId, property, at, value, easing?, handles?}` ↔ `remove` (inverse keeps easing/handles); `update {value?, easing?, handles?, roving?}`; `move {at}`; `setAll`.

**transition/** (4): `add {transitionId, between:[a,b] | {on, edge}, type, duration, params?}` (validates adjacency ‹1 ms and handles) ↔ `remove`; `remove` ↔ `restore {node, position}`; `update {type?, duration?, params?}`.

**audio/** (4): `setVolume`, `setFade {in?, out?}`, `setAutomation {lane, points[]}`, `setDuck {under, to, attack?, release?}`.

**text/, shape/, svg/, sticker/, adjustment/, nested/** (create/update/remove each, + `text/setContent {text}`, `nested/extract {id}` = bake the scene's tracks inline).

**caption/** (7): `import {captionsId, src | items[]}`, `add`, `update`, `remove`, `setStyle`, `setAnimation`, `setAll`. Updates on `src`-generated children bake first.

**marker/** (3): `add {markerId, at, label, color}`, `update`, `remove`.

**mask/** (4): `create {id, parentId, props}`, `update`, `remove`, `setPath {path}`; keyframe/* on the mask id.

**multicam/** (6): `create {id, angles[], sync}`, `setActiveAngle`, `addCut {cutId, at, angle}`, `moveCut`, `removeCut`, `flatten {id}` (bake cuts into literal clips).

**layer/** (2): `setTiming`, `setTransform`. **source/** (2): `bake {id}`, `setProp {id, prop, value}` (generic inspector write). The model's file writes are outside the action system and the history.

Count: 92 action types, every one with a non-null inverse.

### B.3 Deliberate deviations from OpenReel (their bugs, not copied)

1. Trim and split recompute duration with speed (OpenReel ignores speed).
2. `slide` is the textbook definition (OpenReel only adjusts one neighbour and moves `in` the wrong way).
3. `slip`/`slide`/`roll` have inverses (OpenReel returns null; undo fails).
4. `track/consolidate` and `closeGapBefore` undo actually dispatch (OpenReel routes them to a switch with no case).
5. `keyframe/remove` inverse keeps easing and handles; `keyframe/move` exists.
6. `*/update` inverses restore the exact prior object.
7. Split pre-assigns the new id.
8. Validation covers slip/slide/roll/trimToPlayhead/closeGap (locked track, bounds).
9. Edge trim, chroma key, track grouping, 3D transforms and ducking all go through actions (in OpenReel's UI they bypass undo).
10. No stack-above placement rule: a drop into an occupied spot on a sequence track inserts between siblings; on a free track it is refused with `OUT_OF_BOUNDS` and the UI offers "place above".

### B.4 Auto-group set

transform/update, effect/update, audioEffect/update, audio/setVolume, audio/setFade, audio/setDuck, transition/update, clip/setBlend, colorGrade/set, clip/move, clip/trim, clip/slip, clip/slide, clip/roll, clip/setSpeed, clip/setChromaKey, clip/setStabilization, keyframe/move, keyframe/update, composition/updateSettings, composition/setBackground, text/update, shape/update, svg/update, sticker/update, mask/update, layer/setTiming, layer/setTransform.

---

## Part C. Gesture and UI mapping (parity with OpenReel's editor)

Snapping rules copied as is: snap on by default, threshold 40 px, priority clip edges › playhead › 1 s grid, playhead excluded while dragging, both edges of the dragged item tested. Drags start after 5 px. One history group per gesture; per-frame commits inside the group.

| OpenReel gesture / control | Ours → action |
|---|---|
| Drag clip body (same or other track) | sequence: `clip/move {after}`; free: `clip/move {start, trackId?}`. Multi-select: `batch/apply` of moves. |
| Drag clip edge | `clip/trim {edge, value}` (OpenReel writes the store directly here; we fix it). Clamped to source length via manifest. |
| Linked captions follow a moved clip | inherent: captions anchored to the clip; nothing dispatched. |
| Drop media from assets panel / OS files | `clip/add` (+ `track/add` when dropping on empty space) |
| Drag effect card onto clip | `effect/add` |
| Drag transition card onto clip half | `transition/add {between}` or `{on, edge}` with duration 1.0 |
| Transition chip at every cut (click → menu: add / change type / remove) | `transition/add`, `transition/update {type}`, `transition/remove` |
| Keyframe diamond drag / right-click | `keyframe/move`, `keyframe/remove` (OpenReel's lanes are unreachable; ours open from the Animate section) |
| Track header drag / double-click name / icons | `track/reorder`, `track/rename`, `track/setFlag` |
| Marker click/double-click/X | seek, `marker/update`, `marker/remove` |
| Ruler drag, wheel zoom, marquee, range in/out | UI only |
| Clip context menu | Copy (clipboard), Duplicate (`clip/add` after original), Split at playhead (`clip/split`), Close gap (`clip/closeGapBefore`), Copy/Paste effects (`batch/apply` of `effect/add`, grouped, unlike OpenReel), Separate audio (`batch`: `track/add`, `clip/add` per stream, `audio/setVolume 0`), Ripple delete, Delete |
| Overlay context menu | Duplicate (`{kind}/create`, fixing OpenReel's never-shown item), Select all on track, Delete |
| Track header menu | Rename, Remove gaps (`track/consolidate`, free layout only), Group/Ungroup (`track/setGroup`, with undo), Delete |
| Timeline toolbar | Undo, Redo, Split (S), Trim start/end to playhead (Q/W), Delete, Duplicate (⌘D), Ripple delete (⇧Del), Add track (role presets), Track layers popover, zoom, snap (N), track height |
| Quick edit bar (single media clip, playhead inside) | Split here, Trim start/end (`clip/trimToPlayhead`), Add captions, Clean audio (`audioEffect/add noiseReduction`), Export |
| Inspector: Transform (position, scale, rotation, anchor, opacity, radius, fit, crop, align, blend, 3D) | `transform/update`, `clip/setFit`, `clip/setBlend` (3D fields through `transform/update`, with undo) |
| Inspector: Style (text / shape / svg) | `text/update`, `text/setContent`, `shape/update`, `svg/update` |
| Inspector: Color grading | `colorGrade/set` |
| Inspector: Effects (stack, chroma key, masking, nested, adjustment, PiP presets, behind-subject) | `effect/*`, `clip/setChromaKey`, `mask/*`, `nested/*`, `adjustment/*`, `transform/update`, `text/update` |
| Inspector: Audio (volume, fades, noise removal, effects, ducking) | `audio/setVolume`, `audio/setFade`, `audioEffect/*`, `audio/setDuck` |
| Inspector: Speed (presets, reverse, stabilization, speed curves) | `clip/setSpeed`, `clip/setReverse`, `clip/setStabilization`, `speed/setKeys`, `speed/setFreezes` |
| Inspector: Animate (keyframes, entry/exit, motion presets, emphasis, text animation) | `keyframe/*`, `clip/setEmphasis`, `text/update {animation}` |
| Transition inspector | `transition/update`, `transition/remove` |
| Multi-clip inspector (align, distribute, nudge, batch effects, delete, duplicate) | `batch/apply` |
| Caption selected | `caption/update`, `caption/remove` |
| Tweaks panel (schema props) | `composition/setProps` |
| Preview canvas: drag/resize element, arrow nudge 1 px / ⇧ 10 px, ⌥ disables snap | `transform/update` on the selected id (via `data-el`) |
| Keyboard | OpenReel's default map copied (Space, ←/→ frame, ⇧←/→ second, ↑/↓ 5 s, Home/End, [ ] clip edges, I/O loop, ⌘Z/⌘⇧Z, ⌘X/C/V, ⌘D, Del, ⇧Del, S, Q/W, ⌘A/Esc, N, ⌘=/−/0, ?, T title, M marker) plus the CapCut/Premiere/Final Cut/DaVinci split-key presets |

Behaviours we add beyond OpenReel: magnetic sequence tracks (ripple on move/delete is the layout, not a command), connected-clip lines for anchors, `word:`/`shot:` snapping targets from the manifest, locked-prop and generated-block visuals, bake on gesture, select-and-ask with source range for `<Layer>` interiors.

---

## Part D. Kit package skeleton (`@cutcraft/kit` at `/home/user/cutcut/packages/kit`)

### D.1 Workspace and tooling

`/home/user/cutcut`: `pnpm-workspace.yaml` (`packages/*`), root `package.json` (scripts fan out with `pnpm -r`), `tsconfig.base.json`. Package: React 19, Zod, `@babel/parser`, `@babel/traverse`, `@babel/types`, `recast`; dev: vitest, typescript, eslint + typescript-eslint. `tsconfig`: strict, `jsx: react-jsx`, `moduleResolution: bundler`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. ESLint flat config bans DOM and `node:` imports under `src/`. Vitest runs the same tests in `node` and `jsdom` projects to prove resolver parity.

### D.2 Directory tree

```
packages/kit/
  package.json  tsconfig.json  eslint.config.js  vitest.config.ts
  src/
    index.ts
    jsx/
      define.ts            defineElement(), VocabularyComponent, isVocabulary()
      enums.ts             A.3 lists as `as const` tuples + z.enum
      capabilities.ts      KIND_CAPABILITIES: kind → {timed, visual, audio, trimSource, transformable, container, childKinds, placementScope} (port of timeline-items.ts)
      schemas/common.ts    id, timeRef, duration, placement, transform, blend, emphasis, color
      schemas/{composition,media,overlays,children,transition,captions,multicam}.ts
      elements.ts          the 26 components = defineElement(kind, schema, capabilities)
      use-t.ts             useT(): throws outside a renderer (fixtures typecheck)
    manifest/types.ts      AssetManifest, AssetEntry, TranscriptWord, Shot, Silence, WaveformSummary
    manifest/timeref.ts    parseTimeRef(), resolveTimeRef()
    resolve/{tree,collect,overlay,placement,errors,resolve}.ts
    patches/{types,log}.ts
    actions/types/{base,composition,track,clip,speed,transform,effect,keyframe,transition,audio,overlay,caption,marker,adjustment,mask,nested,multicam,layer,source,index}.ts
    actions/{registry,handler-kit,history,executor}.ts
    actions/handlers/{index,composition,track,clip-structure,clip-timing,clip-props,speed,transform,effect,keyframe,transition,audio,overlay,caption,marker,adjustment,mask,nested,multicam,layer,source}.ts
    source/{parse,index,edits,print,fold,bake}.ts
    source/lint/index.ts + rules/{literal-ids,unique-ids,no-start-on-sequence,pure-helpers,expression-locked,one-captions,ambiguous-duration,file-shape}.ts
  fixtures/sample.tsx  sample.manifest.json  sample.placement.json
  test/{resolve,timeref,patches,fold,bake,lint}.test.ts
  test/handlers/{cases.ts,roundtrip.test.ts,clip-timing.test.ts,transition.test.ts}
```

### D.3 Public API (signatures to implement)

```ts
defineElement({ kind, schema, capabilities, render? }): VocabularyComponent      // component + .kind .schema .isVocabulary .capabilities
parseTimeRef(ref): ParsedTimeRef | { kind: "invalid" }
resolveTimeRef(ref, asset, markers): number | ResolveError
collect(element, { index? }): CollectedTree                                       // expands pure helpers; stops at Layer; marks generated
collectModule({ default, defaults }, overrides?): CollectedTree
resolve(tree, manifest, log?): ResolvedState                                      // memoised on log.version
createPatchLog(): PatchLog   // entries, net: Map<id, NetPatch>, version, append(), mark(), truncate(), clear()
registerHandler(h); getHandler(type); listHandlers()
new ActionHistory(max?)       // push(action, inverse, mark), undo/redo, undoGroup/redoGroup, beginGroup/endGroup, snapshots
new Executor({ tree, manifest, log?, history?, now?, newActionId? })
  .execute(input): ActionResult   // validate → invert(before) → apply → history.push
  .undo() .redo() .beginGroup() .endGroup() .state() .log() .history() .replaceTree(tree)
buildSourceIndex(text): SourceIndex   // elements: Map<id, ElementSite | GeneratedSite>, helpers, defaults literal site, compositionId
applyEdits(text, edits): string       // descending splice, overlap check
fold(log, index, state): SourceEdit[]
foldToSource(text, log, state): { text, edits, baked: string[] }   // bakes generated targets, re-indexes, re-folds
bake(text, id, state, index?): SourceEdit[]
lint(text, { manifest?, rules? }): Diagnostic[]
```

Patch shape: `set {id, prop, value} | text {id, text} | insert {id, parent, after, node} | remove {id} | move {id, parent, after} | bake {id}`. `append` is O(1) and keeps `net` reduced per id (last write wins for props; remove of an inserted id deletes the entry; insert after remove with an equal node restores `present`). Fold emits from `net`: one `prop` edit per touched prop, one `insert`/`remove`/`move` per structural change, `bake` edits first. Handler `fold` faces are declared but never consulted: every action, split/merge/setLayout/extract/flatten included, is expressed in the patch ops above and folds through the generic path. Placed siblings that have no site yet (a chain of inserts, a reorder) share one insertion point and are printed as a group in overlay order; an inserted node is printed as it stands after later patches, so its children and props ride with it. A trim therefore folds to one `prop` edit whose range is exactly the old value token.

`handler-kit.ts`: `makePropHandler` (≈55 self-inverse prop actions, with `derive` for setSpeed), `makeChildCollectionHandlers` (effect/audioEffect/keyframe/speed/caption/marker/mask/cut), `makeCreateRemovePair` (track, clip, text, shape, svg, sticker, adjustment, nested). Hand-written handlers: split, merge, slide, roll, rippleDelete/Restore, track/setLayout, track/consolidate, transition/add, nested/extract, multicam/flatten, source/bake, source/setProp, batch/apply. `stub()` remains in handler-kit for a future action that is specified before it is built; nothing uses it today.

### D.4 Implementation order

1. Workspace + tooling; `jsx/define.ts`, `enums.ts`, `schemas/common.ts`, `elements.ts` with placeholder schemas. Goal: `fixtures/sample.tsx` typechecks.
2. `manifest/*`; `resolve/tree.ts`, `collect.ts`.
3. `patches/*`; `resolve/placement.ts`, `resolve.ts` for sequence, free, anchor, Gap (transition/multicam/nested placement return TODO errors). `test/resolve.test.ts` passes.
4. `actions/types/*`, `registry`, `handler-kit`, `history`, `executor`; `handlers/clip-timing.ts`. `test/patches.test.ts`, `test/handlers/clip-timing.test.ts` pass.
5. `source/parse,index,edits,print,fold`. `test/fold.test.ts` passes.
6. Remaining handlers through the factories; `handlers/cases.ts` + `roundtrip.test.ts`.
7. Lint rules, `bake.ts`, full schemas, transition/multicam/nested placement, `transition.test.ts`.

First tests: (1) resolve of a two-clip sequence with a gap and a speed change gives `c2.start = 5`, `c2.duration = 2`, composition duration 7; (2) patch-log reduction table; (3) trim then undo restores the resolved state and leaves the inverse in the log.

---

## Verification

```
cd /home/user/cutcut && pnpm install
pnpm --filter @cutcraft/kit typecheck      # tsc --noEmit, fixtures included
pnpm --filter @cutcraft/kit lint
pnpm --filter @cutcraft/kit test           # vitest, node + jsdom projects
```

End-to-end on `fixtures/sample.tsx` (exercises every element in A.2):

1. **Resolve matches expectation.** `resolve(collectModule(sample), manifest)` serialised (items sorted by id, props omitted) equals `sample.placement.json`; `state.errors` and `lint(text, { manifest })` are empty.
2. **Trim → undo → redo round trip.** Execute `clip/trim {id: "c2", edge: "out", value: "word:12.end"}`; `c2.end` changes and `c3.start` shifts by the same delta on the sequence track; `undo()` restores the pre-trim serialisation; `redo()` reproduces the trimmed one. The table-driven `roundtrip.test.ts` does the same for one case per registered action.
3. **Fold is a one-token diff.** After the trim, `foldToSource` yields one `prop` edit on `out` whose range is the old literal token; re-indexing and resolving the new text equals the patched resolved state; a line diff of old vs new source changes exactly one line.
4. **Parity matrix check.** `listHandlers()` covers every row in B.2 (92 types), and a generated `docs/parity.md` maps each OpenReel action type (115) to ours or to an explicit "out of scope" / "merged into" note.

## Non-goals of this plan

Renderer (Player, decoders, audio engine), editor UI, export pipeline, asset ingest service, the model's tool surface. The kit is the shared core those will import.
