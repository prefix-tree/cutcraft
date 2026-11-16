---
"@cutcraft/kit": minor
"@cutcraft/render": patch
---

`audio/setDuck` takes a track role in `duck.under`, as a file does; it used to refuse anything but a track id. `<Multicam activeAngle>` and the `multicam/setActiveAngle` action are removed: nothing in the player or the export read the prop, so it changed nothing. A file that sets it now fails with an unrecognized key. `cutcraft inspect` names the element and the edge of a transition written with `on` and `edge`, where it printed `undefined → undefined`.
