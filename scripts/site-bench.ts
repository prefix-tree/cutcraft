// The numbers on the site's landing page: the kit's editor-loop benchmark and the showcase export benchmark, merged
// into docs/bench.json with the machine and the date. The docs workflow runs it on GitHub's runner before building;
// the committed file is a local baseline, labelled with the machine it came from.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const scratch = mkdtempSync(join(tmpdir(), "site-bench-"));
try {
  const kit = join(scratch, "kit.json"), showcase = join(scratch, "showcase.json");
  execFileSync("pnpm", ["--filter", "@cutcraft/kit", "bench", "--json", kit], { cwd: root, stdio: "inherit" });
  execFileSync("pnpm", ["--filter", "@cutcraft/example-showcase", "gen"], { cwd: root, stdio: "inherit" });
  execFileSync("pnpm", ["--filter", "@cutcraft/example-showcase", "bench", "--json", showcase], { cwd: root, stdio: "inherit" });
  const k = JSON.parse(readFileSync(kit, "utf8")), s = JSON.parse(readFileSync(showcase, "utf8"));
  const out = { measured: new Date().toISOString().slice(0, 10), machine: s.machine, node: s.node, ci: Boolean(process.env.CI), editor: k.results, export: s.rows };
  writeFileSync(join(root, "docs", "bench.json"), `${JSON.stringify(out, null, 2)}\n`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
