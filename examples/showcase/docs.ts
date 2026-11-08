// Renders the examples the documentation shows next to their code: the reference pages' element examples (docs/*.tsx)
// into docs/public/previews/elements, the guide's feature examples (guide/*.tsx) into docs/public/previews/guide, and
// the demo of each built-in effect and transition (effects/*.tsx, transitions/*.tsx, written by `pnpm docs:gen`) into
// docs/public/previews/effects and transitions.
// A looping WebM and a poster each, through the same loader and renderer as `cutcraft`. A file that does not resolve cleanly stops the run; warnings are printed.
// The export runs in headless Chrome, downloaded on the first run.
//   pnpm --filter @cutcraft/example-showcase docs [name…]
import { mkdirSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

import { directoryResolver, loadVideo, renderStill, renderVideo } from "@cutcraft/render";

const here = import.meta.dirname;
const previews = join(here, "..", "..", "docs", "public", "previews");
const only = process.argv.slice(2);
/** Examples whose poster is a moment of one element (what they show: id, fraction through it), instead of 60% of the way through. */
const POSTER_AT: Readonly<Record<string, readonly [string, number]>> = {
  "at-a-cut": ["flare", 0.65],
  "shader-transition": ["open", 0.5],
};
const files = [
  ...readdirSync(join(here, "docs")).map((f) => ({ dir: "docs", file: f, out: join(previews, "elements") })),
  ...readdirSync(join(here, "guide")).map((f) => ({ dir: "guide", file: f, out: join(previews, "guide") })),
  ...readdirSync(join(here, "effects")).map((f) => ({ dir: "effects", file: f, out: join(previews, "effects") })),
  ...readdirSync(join(here, "components")).map((f) => ({
    dir: "components",
    file: f,
    out: join(previews, "components"),
  })),
  ...readdirSync(join(here, "transitions")).map((f) => ({
    dir: "transitions",
    file: f,
    out: join(previews, "transitions"),
  })),
].filter((f) => f.file.endsWith(".tsx"));

for (const { dir, file, out } of files.sort((a, b) => a.file.localeCompare(b.file))) {
  const name = basename(file, ".tsx");
  if (only.length > 0 && !only.includes(name)) continue;
  mkdirSync(out, { recursive: true });
  const video = await loadVideo(join(here, dir, file), { manifest: join(here, "manifest.json") });
  if (video.state.errors.length > 0)
    throw new Error(`${name}: ${video.state.errors.map((e) => `${e.id}: ${e.message}`).join("; ")}`);
  const media = directoryResolver(join(here, "media"), video.manifest);
  const result = await renderVideo({
    state: video.state,
    media,
    out: join(out, `${name}.webm`),
    silent: true,
    quality: "high",
    source: video.source,
  });
  for (const w of result.warnings) process.stderr.write(`${name}: warning: ${w}\n`);
  await renderStill({
    state: video.state,
    media,
    out: join(out, `${name}.jpg`),
    time: posterTime(dir, name, video.state),
    source: video.source,
  });
  process.stdout.write(`${name}: ${result.frames} frames, ${result.width}x${result.height}\n`);
}

function posterTime(dir: string, name: string, state: Awaited<ReturnType<typeof loadVideo>>["state"]): number {
  // A transition's demo halfway through it (a dip a quarter in, before the colour fills the frame); an effect's once it
  // is keyed up and held.
  if (dir === "transitions") return posterAt(state, "change", name.startsWith("dipTo") ? 0.25 : 0.5);
  if (dir === "effects") return state.composition.duration * 0.8;
  const [id, fraction] = POSTER_AT[name] ?? ["", 0];
  return posterAt(state, id, fraction);
}

function posterAt(state: Awaited<ReturnType<typeof loadVideo>>["state"], id: string, fraction: number): number {
  const at = state.items.get(id);
  return at ? at.start + at.duration * fraction : state.composition.duration * 0.6;
}
