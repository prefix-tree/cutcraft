# 0001. The file is the video

## Context

Three parties work on the same edit: a model that writes it, a person who
adjusts it in a timeline, and a renderer that plays it. Every editor on the
market keeps a project document (JSON, a database, an object graph) and treats
code, if it has any, as an export. Every code-based renderer (Remotion) has no
editor. The model is the author we care about most, and it is good at writing
code and bad at writing bespoke documents.

## Decision

One TSX file is the edit. It exports `schema` (the tweakable inputs), `defaults`
and a default component that returns a `<Composition>`. The resolver reads the
file; the editor edits the file; the renderer plays the file. There is no
project document beside it.

## Consequences

- The model's medium and the user's artifact are the same thing, so neither
  has to be synchronised with the other.
- The editor needs tooling that most editors do not: a source index, a fold
  that writes a gesture back as a small edit, a lint for the conventions that
  keep the file editable (see 0002, 0003).
- The preview is built from the file by a build step; the UI never compiles.

## Alternatives

A JSON project with code export (OpenReel, every NLE): the model would write a
format it does not know, and helpers, loops and computed values would have no
home. Code with a parallel document for edits: two sources of truth, and the
model's next turn would not see the user's changes unless the document is
re-serialised into something it can edit, which is the same problem with an
extra step.
