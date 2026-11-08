---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

A typed API for effects and transitions. Breaking:

- `defineEffect()` and `defineTransition()` are now `effect()` and `transition()`. They take the same options and return the effect typed with its params schema (`EffectRef<P>`, `TransitionRef<P>`).
- `<Effect>` and `<Transition>` check `type` and `params` at compile time: a built-in type against its registry schema, and what `effect()` or `transition()` returned against its own schema. A plain string is no longer accepted for a file's own effect; pass what `effect()` returned.
- Shaders read their params as `params.<name>`, not by the bare name, so a param can take any name, a GLSL function's or an input's included. `effect()` refuses a shader that reads a param its schema does not declare. Update a shader by writing `params.` before each param it reads.
- `longShadow`'s `reach` param is now `length`.
- The `declaration` lint accepts `passes` as well as `shader`.
