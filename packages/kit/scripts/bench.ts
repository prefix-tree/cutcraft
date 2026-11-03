import { readFileSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { Executor, collectModule, resolve, type AssetManifest, type CollectedTree } from "../src/index";
import { buildSourceIndex } from "../src/source/index-public";
import { buildLarge } from "../fixtures/large";
import * as sample from "../fixtures/sample";

/**
 * Per-step cost of the editor's drag loop: one action through the Executor
 * (validate, invert, patch, resolve). Run before and after a change to
 * resolve() or overlay(). `--json <file>` also writes the rows, with the machine, for the site's benchmarks.
 */
const results: { fixture: string; nodes: number; step: string; usPerStep: number; usPerNode: number }[] = [];
const fixtures = join(import.meta.dirname, "..", "fixtures");
const manifest = JSON.parse(readFileSync(join(fixtures, "sample.manifest.json"), "utf8")) as AssetManifest;

function bench(n: number, fn: (i: number) => void): number {
  for (let i = 0; i < 10; i++) fn(i);
  const t0 = performance.now();
  for (let i = 0; i < n; i++) fn(i);
  return ((performance.now() - t0) / n) * 1000;
}

function report(name: string, tree: CollectedTree, trimId: string, transformId: string): void {
  const nodes = tree.byId.size;
  const rows: [string, number][] = [];
  rows.push(["resolve, memo defeated", bench(100, () => resolve({ ...tree }, manifest))]);
  const trimmer = new Executor({ tree, manifest, now: () => 0 });
  const base = trimmer.state().items.get(trimId)!.source!;
  rows.push([
    "clip/trim out (edge drag)",
    bench(240, (i) => {
      const r = trimmer.execute({
        type: "clip/trim",
        params: { id: trimId, edge: "out", value: base.in + 0.5 + (i % 50) / 100 },
      });
      if (!r.ok) throw new Error(JSON.stringify(r.errors));
    }),
  ]);
  const mover = new Executor({ tree, manifest, now: () => 0 });
  rows.push([
    "transform/update (position drag)",
    bench(240, (i) => {
      const r = mover.execute({
        type: "transform/update",
        params: { id: transformId, transform: { position: { x: i % 50, y: 0 } } },
      });
      if (!r.ok) throw new Error(JSON.stringify(r.errors));
    }),
  ]);
  console.log(`\n${name}: ${nodes} nodes`);
  for (const [label, us] of rows)
    console.log(
      `  ${label.padEnd(36)} ${us.toFixed(0).padStart(7)} µs/step  ${(us / nodes).toFixed(2).padStart(6)} µs/node`,
    );
  for (const [step, us] of rows)
    results.push({
      fixture: name,
      nodes,
      step,
      usPerStep: Math.round(us),
      usPerNode: Math.round((us / nodes) * 100) / 100,
    });
}

const sampleTree = collectModule(
  sample,
  {},
  { index: buildSourceIndex(readFileSync(join(fixtures, "sample.tsx"), "utf8")) },
);
report("sample fixture", sampleTree, "c2", "c2");
report("large(500)", collectModule(buildLarge(500)), "c3", "c3");

const json = process.argv.indexOf("--json");
if (json >= 0 && process.argv[json + 1]) {
  writeFileSync(
    process.argv[json + 1]!,
    `${JSON.stringify({ machine: `${cpus()[0]?.model ?? "?"}, ${cpus().length} cores`, node: process.version, results }, null, 2)}\n`,
  );
}
