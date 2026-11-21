# Core principles

UberScene is built on a handful of choices. This page says what each one is and what it means for you.

## 1. The file is the video

One TSX file is the edit. The resolver reads it, the editor edits it, the export plays it, and there is no project
document beside it. A model works on it the way it works on any code: it reads the file, changes text and writes it
back, and the lint tells it what it got wrong. Editor actions exist for a person's gestures, not as a tool catalog for
the model.

## 2. A fixed vocabulary with literal ids

The timeline is written in a fixed set of elements whose props are Zod schemas, and every element carries a literal
`id`, unique in the file. That is how an editor, a lint or a model finds the element a change belongs to. Everything
about an element is a prop on it: a value that changes over time is a list of keys, and its effects are a list, so an
editor finds a key by the element, the prop's path and the time, and an effect by its place. Pure helper functions,
such as the ready-made components, expand into the same elements.

## 3. Time by meaning

Seconds work everywhere, and a cut can also say what it belongs to: `in="word:12"`, `out="word:23.end"`,
`at="shot:1"`. These resolve against the asset manifest, through every trim and speed change. Tracks play their clips
back to back by default, and an overlay anchors to the clip it belongs to. Captions follow the clips that play their words, so a trim never leaves a caption
behind.

## 4. Every edit is an action written back

An editor's state is the file plus a log of patches. Each gesture is an action that validates, applies, inverts for
undo, and folds into the file as one changed value. Whoever opens the file next, a person or a model, reads the edit
as ordinary code. It stays fast because the resolver keeps every unchanged object identical, and consumers skip
what is identical instead of diffing.

## 5. The browser renders, and the export is the preview

The player draws the file in the browser, frame-exact for any time. The export runs that same player in headless
Chrome and captures each frame, so what you preview is what the file holds. An earlier engine drew the export in
Node; it was removed so that there is one way to draw a frame.

## 6. Document order composites

The first track in the file is the bottom of the picture, and later tracks draw on top. A file reads as main
footage, then overlays, then music, which is how a brief is written.

## 7. Free code where the timeline stops

Time keeps a strict skeleton: compositions, tracks, clips, transitions, captions and keys. Pictures do not. A
`<Layer>` holds any React, CSS, canvas or WebGL, on the video's clock, and one component inside it gets handles the
editor can change. Ready-made pieces are plain functions built from the kit's own elements, not a second drawing
engine, so editing one turns it into elements you own.

## 8. The look lives in the file

A theme is a prop of the composition: palette, fonts, radius, motion and presets, validated like any other prop.
Tokens such as `$primary` resolve before the schema reads the props, an element's own props always win, and nothing
is written into the file by resolving.

## 9. A cut can be checked without watching it

A model can't watch a video, and a person shouldn't have to watch it again after every change. So the command line
reads the timeline back as text (`inspect`), draws many frames from one browser start (`look`), and caches each frame
by what draws it, so looking again after an edit is nearly free. A narrated film's words, lines and cues come from its
script with a helper, `narrate()`, not a new element.

## Free to use

The player, the editor actions, the export and the checks are all MIT: no paid tier, no licence key, no watermark
on the frames. Every effect is written from published techniques, so nothing in it carries another licence.
