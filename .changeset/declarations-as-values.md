---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

Declarations are values, not registrations: no global store. Breaking.

- `effect()` and `transition()` return the definition itself (`EffectRef`, `TransitionRef`: `{ name, definition }`), and `font()` and `googleFont()` return a `FontRef` that stands for its family wherever a string goes (a `font` prop, a theme, a CSS `fontFamily`, a template string, JSON). Nothing is registered anywhere.
- A tree's effects, transitions and fonts are collected from the elements that use them (however deep in a prop, and in a Layer's free code) and from the module's exports. Each file's declarations are its own, so many players on one page never share them, and a file imported directly (a bundled preview) needs no wrapper.
- An effect or font the editor should offer before anything uses it must be exported. The `declaration` lint warns on one that is neither exported nor used.
- The editor's fold writes a declared effect, transition or font back as its identifier: `type={glitch}`, `font={titan}`.
- Two different definitions under one name are an error.
- Removed: `collectShaders`, `shadersOf`, `MODULE_SHADERS`, `collectFonts`, `fontsOf`, `MODULE_FONTS`, and the stores on `globalThis`.
