// Copies the agent skill into dist/skill/uberscene, so the published package carries the skill of its own version
// (`uberscene skills install`). Run by `build`.
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const from = fileURLToPath(new URL("../../../plugins/uberscene/skills/uberscene/", import.meta.url));
const to = fileURLToPath(new URL("../dist/skill/uberscene/", import.meta.url));
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
