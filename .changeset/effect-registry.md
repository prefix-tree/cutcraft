---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

Every built-in effect and transition is now one entry in a registry (`EFFECTS`, `TRANSITIONS`, with `EFFECT_FAMILIES` and `TRANSITION_FAMILIES`): its name, a strict params schema, and how it draws. The type lists, shader lists, transition params and CSS fallbacks are derived from it, and the reference gains a generated page of every effect and transition with its params. Breaking: the CSS-type effects (`brightness`, `blur`, `shadow`, `vignette`…) now have params schemas, so an out-of-range or unknown param is an error, and the undocumented aliases `value` and `intensity` are gone (use `amount`, `radius` or `angle`). An unknown param on a shader effect is now an error too, where it was dropped.
