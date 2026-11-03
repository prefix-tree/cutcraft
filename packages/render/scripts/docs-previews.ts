import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { GRAPHIC_KIND_NAMES } from "@cutcraft/graphics";
import { Composition, Graphic, Track, collect, resolve } from "@cutcraft/kit";
import { EXAMPLE_SECONDS, graphicExample } from "../../../scripts/graphic-example";
import { directoryResolver, renderStill, renderVideo } from "../src/index";

/**
 * The reference pages' examples, rendered by the export engine: for each graphic kind, the composition its page shows
 * as code (`graphicExample`), as a looping WebM and a poster. Not checked by CI; run `pnpm docs:previews` after
 * changing a kind.
 *
 *   pnpm docs:previews [--only <name>]   (from the repository root)
 */
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;
const out = join(import.meta.dirname, "..", "..", "..", "docs", "public", "previews", "graphics");
mkdirSync(out, { recursive: true });
const media = directoryResolver("/nowhere", { assets: {} });

for (const name of GRAPHIC_KIND_NAMES) {
  if (only && name !== only) continue;
  const example = graphicExample(name);
  const el = h(
    Composition,
    { fps: 30, width: example.width, height: example.height },
    h(Track, { id: "main", layout: "free" }, h(Graphic, example.props as never)),
  );
  const state = resolve(collect(el), { assets: {} });
  if (state.errors.length) throw new Error(`${name}: ${state.errors.map((e) => e.message).join("; ")}`);
  const r = await renderVideo({ state, media, out: join(out, `${name}.webm`), silent: true, quality: "high" });
  for (const w of r.warnings) process.stderr.write(`${name}: warning: ${w}\n`);
  await renderStill({ state, media, out: join(out, `${name}.jpg`), time: EXAMPLE_SECONDS / 2 });
  process.stdout.write(`${name}: ${r.width}x${r.height}, ${r.frames} frames in ${(r.wallMs / 1000).toFixed(1)} s\n`);
}
