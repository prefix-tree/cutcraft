---
"@cutcraft/kit": patch
---

The resolver no longer places anything at a time that is not a number, before zero, backwards or for ever, whatever the file says. Found by a new suite of 129 pinned edge cases and 3,000 timelines made at random:

- A prop the schema refuses (a speed of 0, a negative duration or start, a prop the element does not take) is reported as before and then left out, so the element takes its default instead of the refused value.
- A transition that does not fit is reported and held to what its clips have. Two transitions that would meet inside a short clip are now reported (`INSUFFICIENT_HANDLES`), and two transitions in a row report `NOT_ADJACENT`.
- A `duration="fill"` clip or music bed shorter than the video stops where its file ends and reports `TRIM_PAST_SOURCE`, instead of claiming to play past the end of the file.
- `duration={{ match }}` on an element that fills now takes its length instead of reporting a cycle.
- A `<Freeze>` that starts after its clip has ended no longer lengthens the clip, and reports `INVALID_TIME_RANGE`. A speed key or a hold written past its clip's end no longer lengthens the video.
- An element with no length no longer makes the video longer.
