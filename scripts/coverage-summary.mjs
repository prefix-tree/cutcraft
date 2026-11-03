// A Markdown table of line, branch and function coverage per package, from the `json-summary` reports that
// `pnpm test:coverage` writes. CI appends it to the job summary.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const DIRS = [
  "packages/kit",
  "packages/graphics",
  "packages/player",
  "packages/render",
  "packages/libraries",
  "recipes",
  "examples/launch-recap",
];

const pct = (m) => `${m.pct.toFixed(1)}%`;
const rows = DIRS.flatMap((dir) => {
  const file = join(root, dir, "coverage", "coverage-summary.json");
  if (!existsSync(file)) return [];
  const { total } = JSON.parse(readFileSync(file, "utf8"));
  return [`| \`${dir}\` | ${pct(total.lines)} | ${pct(total.branches)} | ${pct(total.functions)} |`];
});

console.log(["## Coverage", "", "| | Lines | Branches | Functions |", "|---|---|---|---|", ...rows].join("\n"));
