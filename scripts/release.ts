// `pnpm release 0.2.0`: sets every published package to that version, dates the changelog's Unreleased section,
// commits, tags v0.2.0 and pushes both. The tag starts .github/workflows/release.yml, which publishes to npm.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const git = (...args: string[]): string => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

const version = process.argv[2]?.replace(/^v/, "");
if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) throw new Error("usage: pnpm release <version>, e.g. pnpm release 0.2.0");
if (git("branch", "--show-current") !== "main") throw new Error("release from main");
if (git("status", "--porcelain")) throw new Error("commit or stash your changes first");
git("pull", "--ff-only");
if (git("tag", "--list", `v${version}`)) throw new Error(`v${version} is already tagged`);

const files: string[] = [];
for (const dir of readdirSync(join(root, "packages"))) {
  const file = join(root, "packages", dir, "package.json");
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  if (pkg.private) continue;
  pkg.version = version;
  writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
  files.push(file);
}

const changelog = join(root, "CHANGELOG.md");
const today = new Date().toISOString().slice(0, 10);
writeFileSync(changelog, readFileSync(changelog, "utf8").replace("## [Unreleased]", `## [Unreleased]\n\n## [${version}] - ${today}`));

git("add", changelog, ...files);
git("commit", "-m", `chore: release v${version}`);
git("tag", `v${version}`);
git("push", "--atomic", "origin", "main", `v${version}`);
console.log(`v${version} pushed; the Release workflow publishes it: https://github.com/prefix-tree/cutcraft/actions/workflows/release.yml`);
