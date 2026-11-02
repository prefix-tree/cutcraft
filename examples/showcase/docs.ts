// Renders the reference pages' element examples (docs/*.tsx) for the documentation site: a looping WebM and a poster
// each, in docs/public/previews/elements, through the same loader and renderer as `cutcraft-render`. The pages show the
// same files as code. A file that does not resolve cleanly stops the run; warnings are printed.
//   pnpm --filter @cutcraft/example-showcase docs [name…]
import { mkdirSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { directoryResolver, loadVideo, renderStill, renderVideo } from "@cutcraft/render";

const here = import.meta.dirname;
const out = join(here, "..", "..", "docs", "public", "previews", "elements");
mkdirSync(out, { recursive: true });
const only = process.argv.slice(2);

for (const file of readdirSync(join(here, "docs")).filter((f) => f.endsWith(".tsx")).sort()) {
  const name = basename(file, ".tsx");
  if (only.length > 0 && !only.includes(name)) continue;
  const video = await loadVideo(join(here, "docs", file), { manifest: join(here, "manifest.json") });
  if (video.state.errors.length > 0) throw new Error(`${name}: ${video.state.errors.map((e) => `${e.id}: ${e.message}`).join("; ")}`);
  const media = directoryResolver(join(here, "media"), video.manifest);
  const result = await renderVideo({ state: video.state, media, interiors: video.interiors, out: join(out, `${name}.webm`), silent: true, quality: "high" });
  for (const w of result.warnings) process.stderr.write(`${name}: warning: ${w}\n`);
  await renderStill({ state: video.state, media, interiors: video.interiors, out: join(out, `${name}.jpg`), time: video.state.composition.duration * 0.6 });
  process.stdout.write(`${name}: ${result.frames} frames, ${result.width}x${result.height}\n`);
}
