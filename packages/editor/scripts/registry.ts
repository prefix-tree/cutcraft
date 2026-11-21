// Builds the shadcn registry the docs site serves at /r/: registry.json, with our packages pinned to the versions in
// this workspace and our own items addressed by URL, through `shadcn build`. With --check it builds into a temporary
// folder and fails when the committed files in docs/public/r differ.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const editor = here("..");
const committed = here("../../../docs/public/r");
const shadcn = here("../app/node_modules/.bin/shadcn");
const base = process.env.REGISTRY_URL ?? "https://uberscene.prefixtree.xyz/r";
const check = process.argv.includes("--check");

const versionOf = (pkg: string): string => {
  if (pkg.startsWith("@uberscene/")) {
    const json = JSON.parse(readFileSync(here(`../../${pkg.slice("@uberscene/".length)}/package.json`), "utf8"));
    return json.version as string;
  }
  const own = JSON.parse(readFileSync(join(editor, "package.json"), "utf8"));
  const range = own.devDependencies?.[pkg] ?? own.dependencies?.[pkg];
  if (!range) throw new Error(`${pkg}: not in packages/editor/package.json, so its version is unknown`);
  return range as string;
};

interface Item {
  dependencies?: string[];
  registryDependencies?: string[];
}
const registry = JSON.parse(readFileSync(join(editor, "registry.json"), "utf8")) as { items: Item[] };
for (const item of registry.items) {
  item.dependencies = item.dependencies?.map((d) => `${d}@${versionOf(d)}`);
  item.registryDependencies = item.registryDependencies?.map((d) => d.replace("{{registry}}", base));
}

const pinned = join(editor, ".registry.pinned.json");
const out = check ? mkdtempSync(join(tmpdir(), "uberscene-registry-")) : committed;
writeFileSync(pinned, `${JSON.stringify(registry, null, 2)}\n`);
try {
  execFileSync(shadcn, ["build", pinned, "-o", out, "-c", editor], { stdio: check ? "pipe" : "inherit" });
} finally {
  rmSync(pinned, { force: true });
}

if (check) {
  const names = (dir: string) => readdirSync(dir).sort();
  const stale = [...new Set([...names(out), ...names(committed)])].filter((name) => {
    try {
      return readFileSync(join(out, name), "utf8") !== readFileSync(join(committed, name), "utf8");
    } catch {
      return true;
    }
  });
  rmSync(out, { recursive: true, force: true });
  if (stale.length > 0) {
    console.error(`docs/public/r is out of date (${stale.join(", ")}): run pnpm registry:build`);
    process.exit(1);
  }
  console.log("docs/public/r is up to date");
}
