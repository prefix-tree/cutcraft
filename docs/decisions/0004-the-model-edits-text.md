# 0004. The model edits text and has no tool catalog

## Context

The obvious design hands the model the same actions the editor dispatches:
`clip/trim`, `keyframe/add`, a catalog of a hundred tools. OpenReel's agent
does this. Models are measurably worse at choosing among many tools than at
writing code, and a tool catalog has to be kept in sync with the vocabulary.

## Decision

The model reads the file, replaces strings in it and writes it back. Its
instructions are a prompt that explains the vocabulary and the conventions; the
lint tells it what it got wrong. Actions are for the editor's gestures only.

## Consequences

- The model can do anything the vocabulary allows in one edit, including
  restructuring, which no tool catalog expresses well.
- A model edit replaces the tree: the executor's log and history are cleared
  (`replaceTree`), so a gesture in flight must be folded first (0003).
- The quality of the prompt is a product surface; it lives next to the example
  that was written from it.

## Alternatives

A tool per action: rejected for the reasons above. A hybrid where the model
emits actions for small changes: not worth two code paths.
