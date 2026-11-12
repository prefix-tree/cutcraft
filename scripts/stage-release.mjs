// Stages each unpublished package for npm's approval queue. pnpm pack applies publishConfig and
// replaces workspace:*; npm stage publish uploads that tarball. A maintainer approves with 2FA
// before the version is installable. OIDC can stage, and cannot list or approve.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("..", import.meta.url).pathname;

// Dependency order, so approving the stage ids from top to bottom publishes dependencies first.
export const PACKAGE_DIRS = ["packages/kit", "packages/player", "packages/graphics", "packages/render", "packages/cli"];

export function workspaceDependencyNames(manifest) {
  const names = [];
  for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
    for (const [name, spec] of Object.entries(manifest[field] ?? {})) {
      if (typeof spec === "string" && spec.startsWith("workspace:")) names.push(name);
    }
  }
  return names;
}

export function unpublished(packages, isOnRegistry) {
  return packages.filter((pkg) => !isOnRegistry(`${pkg.name}@${pkg.version}`));
}

function onRegistry(spec) {
  try {
    execFileSync("npm", ["view", spec, "version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function stageRelease() {
  const manifests = PACKAGE_DIRS.map((dir) => ({
    dir,
    ...JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8")),
  }));
  const pending = unpublished(manifests, onRegistry);

  if (pending.length === 0) {
    console.log("Every package version is already on the registry.");
    return;
  }

  const out = mkdtempSync(join(tmpdir(), "cutcraft-stage-"));
  try {
    for (const pkg of pending) {
      const cwd = join(root, pkg.dir);
      const before = new Set(readdirSync(out));
      execFileSync("pnpm", ["pack", "--pack-destination", out], { cwd, stdio: "inherit" });
      const tarball = join(
        out,
        readdirSync(out).find((file) => !before.has(file)),
      );
      console.log(`staging ${pkg.name}@${pkg.version}`);
      execFileSync("npm", ["stage", "publish", tarball, "--access", "public"], { stdio: "inherit" });
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
  console.log(
    "Approve these on https://www.npmjs.com (2FA), in the order printed above, before they can be installed.",
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) stageRelease();
