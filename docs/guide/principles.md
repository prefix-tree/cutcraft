# Core principles

CutCraft is built on a handful of choices, made one at a time and written down as
[decision records](/decisions/). This page is the short version: what each principle says, what it means for you,
and the records that decided it. A record is never rewritten; when a later one changes an earlier one, both are
linked here.

## 1. The file is the video

One TSX file is the edit. The resolver reads it, the editor edits it, the export plays it, and there is no project
document beside it. A model works on it the way it works on any code: it reads the file, changes text and writes it
back, and the lint tells it what it got wrong. Editor actions exist for a person's gestures, not as a tool catalog for
the model.

Decided in [0001](/decisions/0001-the-file-is-the-video) and [0004](/decisions/0004-the-model-edits-text).

## 2. A fixed vocabulary with literal ids

The timeline is written in a fixed set of elements whose props are Zod schemas, and every element carries a literal
`id`, unique in the file. That is how an editor, a lint or a model finds the element a change belongs to. A
collection the inspector edits one by one (keyframes, effects, captions) is child elements, not a prop array. Pure
helper functions, such as the ready-made components, expand into the same elements.

Decided in [0002](/decisions/0002-fixed-vocabulary-and-literal-ids) and
[0009](/decisions/0009-helpers-layers-and-editability).

## 3. Time by meaning

A cut says where it happens, not when: `in="word:12"`, `out="word:23.end"`, `at="shot:1"`. These resolve against the
asset manifest, through every trim and speed change. Tracks play their clips back to back by default, and an overlay
anchors to the clip it belongs to. Captions follow the clips that play their words, so a trim never leaves a caption
behind.

Decided in [0005](/decisions/0005-sequence-tracks-and-anchors),
[0006](/decisions/0006-time-references-against-a-manifest) and [0014](/decisions/0014-captions-follow-the-clips).

## 4. Every edit is an action written back

An editor's state is the file plus a log of patches. Each gesture is an action that validates, applies, inverts for
undo, and folds into the file as one changed value. Whoever opens the file next, a person or a model, reads the edit
as ordinary code. It stays fast because the resolver keeps every unchanged object identical, and consumers skip
what is identical instead of diffing.

Decided in [0003](/decisions/0003-patch-log-and-four-faced-actions) and
[0011](/decisions/0011-performance-contract).

## 5. The browser renders, and the export is the preview

The player draws the file in the browser, frame-exact for any time. The export runs that same player in headless
Chrome and captures each frame, so what you preview is what the file holds. An earlier engine drew the export in
Node; it was removed so that there is one way to draw a frame.

Decided in [0007](/decisions/0007-the-browser-renders), [0015](/decisions/0015-a-headless-engine-renders-the-export),
[0019](/decisions/0019-a-browser-engine-for-free-code) and [0021](/decisions/0021-one-export-engine).

## 6. Document order composites

The first track in the file is the bottom of the picture, and later tracks draw on top. A file reads as main
footage, then overlays, then music, which is how a brief is written.

Decided in [0008](/decisions/0008-tracks-composite-in-document-order).

## 7. Free code where the timeline stops

Time keeps a strict skeleton: compositions, tracks, clips, transitions, captions and keyframes. Pictures do not. A
`<Layer>` holds any React, CSS, canvas or WebGL, on the video's clock, and one component inside it gets handles the
editor can change. Ready-made pieces are plain functions built from the kit's own elements, not a second drawing
engine, so editing one turns it into elements you own.

Decided in [0018](/decisions/0018-free-code-in-a-timeline-skeleton) and
[0013](/decisions/0013-remotion-has-an-editor-and-layer-handles); `<Graphic>` was retired by
[0020](/decisions/0020-graphic-is-deprecated-for-free-code) and
[0024](/decisions/0024-graphic-kinds-become-components).

## 8. The look lives in the file

A theme is a prop of the composition: palette, fonts, radius, motion and presets, validated like any other prop.
Tokens such as `$primary` resolve before the schema reads the props, an element's own props always win, and nothing
is written into the file by resolving.

Decided in [0016](/decisions/0016-a-theme-lives-in-the-file).

## Free to use

The player, the editor actions, the export and the checks are all MIT: no paid tier, no licence key, no watermark
on the frames. Every effect is written from published techniques, so nothing in it carries another licence.

The full list, in the order the decisions were made, is in [Decision records](/decisions/).
