---
"@cutcraft/kit": patch
---

`defineEffect()` and `defineTransition()` refuse a param named after a GLSL built-in function (`mix`, `step`, `length`…) or a shader input, with a message naming it; before, the shader failed to compile with an unclear error.
