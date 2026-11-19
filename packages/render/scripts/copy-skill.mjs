// Copies the agent skill into dist/skill/cutcraft, so the published package carries the skill of its own version
// (`cutcraft skills install`). Run by `build`.
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const from = fileURLToPath(new URL("../../../plugins/cutcraft/skills/cutcraft/", import.meta.url));
const to = fileURLToPath(new URL("../dist/skill/cutcraft/", import.meta.url));
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
