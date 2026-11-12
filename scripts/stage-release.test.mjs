import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { PACKAGE_DIRS, unpublished, workspaceDependencyNames } from "./stage-release.mjs";

const root = new URL("..", import.meta.url).pathname;

test("each workspace dependency is staged before the package that needs it", () => {
  const names = PACKAGE_DIRS.map((dir) => JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8")).name);
  for (const dir of PACKAGE_DIRS) {
    const manifest = JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8"));
    for (const dependency of workspaceDependencyNames(manifest)) {
      assert.ok(
        names.indexOf(dependency) < names.indexOf(manifest.name),
        `${manifest.name} depends on ${dependency}, which is later in PACKAGE_DIRS`,
      );
    }
  }
});

test("versions already on the registry are left out", () => {
  const packages = [
    { name: "@cutcraft/kit", version: "0.3.0" },
    { name: "@cutcraft/player", version: "0.3.0" },
    { name: "cutcraft", version: "0.3.0" },
  ];
  const staged = unpublished(packages, (spec) => spec === "@cutcraft/player@0.3.0");
  assert.deepEqual(
    staged.map((pkg) => pkg.name),
    ["@cutcraft/kit", "cutcraft"],
  );
});
