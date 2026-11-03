// Checks what npm would get: each published package is packed the way `pnpm publish` packs it (publishConfig applied,
// workspace:* replaced), then publint checks the package.json against the files, and attw checks that every export
// resolves with types for ESM consumers. Run after `pnpm build`: `pnpm check:packages`.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const PACKAGES = [
  { dir: "packages/kit" },
  { dir: "packages/graphics" },
  // A stylesheet, not a module: attw would try to resolve it as one.
  { dir: "packages/player", attw: ["--exclude-entrypoints", "fonts.css"] },
  { dir: "packages/render" },
  { dir: "packages/cli" },
];

const bin = (name) => join(root, "node_modules", ".bin", name);
const out = mkdtempSync(join(tmpdir(), "cutcraft-packs-"));
let failed = false;
try {
  for (const { dir, attw = [] } of PACKAGES) {
    const cwd = join(root, dir);
    const before = new Set(readdirSync(out));
    execFileSync("pnpm", ["pack", "--pack-destination", out], { cwd, stdio: "ignore" });
    const tarball = join(
      out,
      readdirSync(out).find((f) => !before.has(f)),
    );
    for (const [tool, args] of [
      ["publint", [tarball, "--strict"]],
      // ESM only: the packages do not ship CommonJS, so node10 and require() resolution are not checked.
      ["attw", [tarball, "--profile", "esm-only", "--format", "table-flipped", ...attw]],
    ]) {
      try {
        execFileSync(bin(tool), args, { cwd, stdio: "pipe" });
        console.log(`ok    ${tool.padEnd(7)} ${dir}`);
      } catch (error) {
        failed = true;
        console.log(`FAIL  ${tool.padEnd(7)} ${dir}\n${error.stdout ?? ""}${error.stderr ?? ""}`);
      }
    }
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
