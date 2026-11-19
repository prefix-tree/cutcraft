// Copies what the CLI hands out into dist, so the published package carries its own version of each: the agent skill
// into dist/skill/uberscene (`uberscene skills install`) and the blocks into dist/blocks (`uberscene blocks`), each
// block's folder without the workspace's package files and tests. Run by `build`.
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const skillFrom = fileURLToPath(new URL("../../../plugins/uberscene/skills/uberscene/", import.meta.url));
const skillTo = fileURLToPath(new URL("../dist/skill/uberscene/", import.meta.url));
rmSync(skillTo, { recursive: true, force: true });
cpSync(skillFrom, skillTo, { recursive: true });

const blocksFrom = fileURLToPath(new URL("../../../blocks/", import.meta.url));
const blocksTo = fileURLToPath(new URL("../dist/blocks/", import.meta.url));
rmSync(blocksTo, { recursive: true, force: true });
for (const name of readdirSync(blocksFrom))
  if (existsSync(join(blocksFrom, name, "block.tsx")))
    cpSync(join(blocksFrom, name), join(blocksTo, name), { recursive: true });
