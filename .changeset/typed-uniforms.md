---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

Shader uniforms are typed by the params schema, once, instead of by each frame's values.

- A `z.enum` param now reaches a shader as an `int`, and the shader names its options: `params.direction == params.direction.clockwise`. `clockWipe` uses this, and the built-in `uniforms` hook is gone.
- `effect()` refuses a shader that reads a param no uniform can carry (a list of points, say), naming it.
- Definitions carry `uniforms` (`ShaderUniform`, `uniformsOf`), and passes carry them to the player.
- The player builds a program's text once, keeps it by source and declared types, and looks up each uniform's location once.
- Shared GLSL in the built-ins is a module, placed once with its dependencies.
- The output is unchanged.
