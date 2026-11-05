---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

Colour effects for footage, drawn as shaders: `exposure` (stops), `vibrance`, `whiteBalance` (temperature and tint as a chromatic adaptation), `shadowsHighlights` (a local adjustment over a blurred luminance), `duotone` and `curves` (monotone splines through points, per channel). Effect params may now hold lists of points. A built-in shader can compute tables from its params (`ShaderDefinition.tables`). These names are now built in, so a file that declares its own effect under one of them (`duotone`, for example) needs to rename it.
