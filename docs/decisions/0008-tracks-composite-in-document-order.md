# 0008. Tracks composite in document order

## Context

Timelines draw track 1 at the bottom of the UI and composite it at the bottom
of the picture; OpenReel's data model lists tracks top-first. A file is read
top to bottom.

## Decision

The first `<Track>` in the file is the bottom of the picture; later tracks draw
on top. A file reads as "main footage, then overlays, then music", which is
how briefs are written.

## Consequences

- The timeline UI must list tracks in reverse of the file to look conventional.
- Captions, which are not on a track, draw above everything.
