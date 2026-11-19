---
"@cutcraft/kit": minor
"@cutcraft/render": minor
"cutcraft": minor
---

A video file may import modules of its own: `import { ChatReveal } from "./blocks/chat-reveal"`. Each is a `.ts` or `.tsx` file inside the project (the folder of the nearest `cutcraft.json`), compiled and run like the file, once. `gatherLocalFiles(source, read)` collects their texts and `loadModule(source, { files })` runs them; the command line reads them from disk, refuses one outside the project, names a missing one with where it looked, passes them to the export page, and keys cached frames drawn by their code on their text.
