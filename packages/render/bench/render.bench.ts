// Renders fixed compositions and reports frames per second and the memory Node holds.
//   pnpm --filter @cutcraft/render bench [--only <name>] [--tabs <n>] [--copy] [--json <file>]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import type { AssetManifest } from "@cutcraft/kit";

import { loadVideo } from "../src/load";
import { directoryResolver } from "../src/media";
import { type RenderResult, renderVideo } from "../src/renderer";
import { makePlaceholders } from "../test/helpers/placeholders";

const root = join(import.meta.dirname, "..", "..", "..");
const cache = join(import.meta.dirname, ".cache");

interface Case {
  readonly name: string;
  readonly file: string;
  readonly manifest: string;
  readonly media: string;
  readonly seconds: number;
  readonly prepare?: () => void;
}

const CUTS = `import { Clip, Composition, Track } from "@cutcraft/kit";
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="c1" src="asset:src" in={2} out={6} />
        <Clip id="c2" src="asset:src" in={9} out={13} />
        <Clip id="c3" src="asset:src" in={0} out={4} />
        <Clip id="c4" src="asset:src" in={14} out={18} />
        <Clip id="c5" src="asset:src" in={6} out={10} />
      </Track>
    </Composition>
  );
}
`;

/** One source clip for 5 s with these effects on it, for the shader cases. */
const effectsFile = (effects: string) => `import { Clip, Composition, Effect, effect, Track } from "@cutcraft/kit";
const same = effect({ name: "same", shader: "vec4 effect(vec2 uv) { return texture(image, uv); }" });
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="c1" src="asset:src" in={2} out={7}>${effects}</Clip>
      </Track>
    </Composition>
  );
}
`;

const EFFECT_CASES: readonly { readonly key: string; readonly label: string; readonly effects: string }[] = [
  {
    key: "passthrough",
    label: "passthrough, 5 s 1080p30 (one shader that changes nothing: the shader path's ceiling)",
    effects: `
          <Effect id="e1" type={same} />`,
  },
  {
    key: "grade",
    label: "colour grade, 5 s 1080p30 (exposure, white balance, curves, vibrance, LUT)",
    effects: `
          <Effect id="e1" type="exposure" params={{ stops: 0.4 }} />
          <Effect id="e2" type="whiteBalance" params={{ temperature: 0.2 }} />
          <Effect id="e3" type="curves" params={{ rgb: [[0, 0], [0.5, 0.6], [1, 1]] }} />
          <Effect id="e4" type="vibrance" params={{ amount: 0.4 }} />
          <Effect id="e5" type="lut" params={{ src: "asset:warm", amount: 0.5 }} />`,
  },
  {
    key: "interleaved",
    label: "interleaved, 5 s 1080p30 (brightness, levels, saturation, LUT: CSS and shader effects alternating)",
    effects: `
          <Effect id="e1" type="brightness" params={{ amount: 0.1 }} />
          <Effect id="e2" type="levels" params={{ gamma: 1.2 }} />
          <Effect id="e3" type="saturation" params={{ amount: 0.2 }} />
          <Effect id="e4" type="lut" params={{ src: "asset:warm", amount: 0.5 }} />`,
  },
  {
    key: "blurs",
    label: "blurs, 5 s 1080p30 (region blur of a small box, shadows and highlights)",
    effects: `
          <Effect id="e1" type="regionBlur" params={{ box: [0.4, 0.3, 0.15, 0.2], radius: 10 }} />
          <Effect id="e2" type="shadowsHighlights" params={{ shadows: 0.5, radius: 10 }} />`,
  },
  {
    key: "blur",
    label: "blur, 5 s 1080p30 (a plain blur of the footage)",
    effects: `
          <Effect id="e1" type="blur" params={{ radius: 8 }} />`,
  },
  {
    key: "zoom",
    label: "zoom, 5 s 1080p30 (a zoom blur of the footage)",
    effects: `
          <Effect id="e1" type="zoomBlur" params={{ length: 60 }} />`,
  },
  {
    key: "silhouette",
    label: "silhouette, 5 s 1080p30 (outline and glow on the footage)",
    effects: `
          <Effect id="e1" type="outline" params={{ width: 12 }} />
          <Effect id="e2" type="glow" params={{ radius: 8 }} />`,
  },
];

/** A size-17 LUT that warms, for the grade case. */
function warmCube(): string {
  const n = 17;
  const lines = [`LUT_3D_SIZE ${n}`];
  for (let b = 0; b < n; b++)
    for (let g = 0; g < n; g++)
      for (let r = 0; r < n; r++)
        lines.push(
          `${((r / (n - 1)) ** 0.85).toFixed(5)} ${(g / (n - 1)).toFixed(5)} ${((b / (n - 1)) ** 1.15).toFixed(5)}`,
        );
  return lines.join("\n");
}

const cases: Case[] = [
  {
    name: "cuts only, 20 s 1080p30 (five hard cuts, one source, its own sound)",
    file: join(cache, "cuts.tsx"),
    manifest: join(cache, "cuts.manifest.json"),
    media: join(cache, "media"),
    seconds: 20,
    prepare: () => {
      mkdirSync(join(cache, "media"), { recursive: true });
      if (!existsSync(join(cache, "media", "src.webm"))) {
        execFileSync("ffmpeg", [
          "-v",
          "error",
          "-y",
          "-f",
          "lavfi",
          "-i",
          "testsrc2=size=1920x1080:rate=30:duration=20",
          "-f",
          "lavfi",
          "-i",
          "sine=frequency=220:sample_rate=48000:duration=20",
          "-c:v",
          "libvpx-vp9",
          "-deadline",
          "realtime",
          "-cpu-used",
          "8",
          "-g",
          "30",
          "-b:v",
          "4M",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "libopus",
          join(cache, "media", "src.webm"),
        ]);
      }
      writeFileSync(join(cache, "cuts.tsx"), CUTS);
      writeFileSync(
        join(cache, "cuts.manifest.json"),
        JSON.stringify({
          assets: {
            src: {
              id: "src",
              kind: "video",
              duration: 20,
              fps: 30,
              width: 1920,
              height: 1080,
              audio: { sampleRate: 48000, channels: 1, streams: 1 },
            },
          },
        }),
      );
    },
  },
  ...EFFECT_CASES.map(
    (e): Case => ({
      name: `effects: ${e.label}`,
      file: join(cache, `effects-${e.key}.tsx`),
      manifest: join(cache, "effects.manifest.json"),
      media: join(cache, "media"),
      seconds: 5,
      prepare: () => {
        // The cuts case makes the source; the LUT is written beside it.
        cases[0]?.prepare?.();
        writeFileSync(join(cache, "media", "warm.cube"), warmCube());
        writeFileSync(join(cache, `effects-${e.key}.tsx`), effectsFile(e.effects));
        writeFileSync(
          join(cache, "effects.manifest.json"),
          JSON.stringify({
            assets: {
              src: { id: "src", kind: "video", duration: 20, fps: 30, width: 1920, height: 1080 },
              warm: { id: "warm", kind: "lut", duration: 0 },
            },
          }),
        );
      },
    }),
  ),
  {
    name: "talking head, first 20 s of 1080p30 (generated captions on screen throughout; small stand-in footage)",
    file: join(root, "recipes", "talking-head.tsx"),
    manifest: join(root, "recipes", "manifest.json"),
    media: join(cache, "recipes-media"),
    seconds: 20,
    prepare: () => {
      if (!existsSync(join(cache, "recipes-media", "podcast.webm")))
        makePlaceholders(
          JSON.parse(readFileSync(join(root, "recipes", "manifest.json"), "utf8")) as AssetManifest,
          join(cache, "recipes-media"),
        );
    },
  },
  {
    name: "launch recap, first 10 s of 1080p30 (titles, captions, three sources)",
    file: join(root, "examples", "launch-recap", "video.tsx"),
    manifest: join(root, "examples", "launch-recap", "manifest.json"),
    media: join(root, "examples", "launch-recap", "public"),
    seconds: 10,
  },
];

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      only: { type: "string" },
      json: { type: "string" },
      tabs: { type: "string" },
      copy: { type: "boolean" },
    },
  });
  const rows: { name: string; result: RenderResult; rssMb: number; cpuMs: number }[] = [];
  const out = join(cache, "out.webm");
  mkdirSync(cache, { recursive: true });
  for (const c of cases) {
    if (values.only && !c.name.includes(values.only)) continue;
    c.prepare?.();
    if (!existsSync(c.media)) {
      console.log(`skipped "${c.name}": ${c.media} does not exist (the example's media is made by its \`gen\` script)`);
      continue;
    }
    const loaded = await loadVideo(c.file, { manifest: c.manifest });
    const cpu0 = process.cpuUsage();
    const result = await renderVideo({
      state: loaded.state,
      source: loaded.source,
      media: directoryResolver(c.media, loaded.manifest),
      out,
      to: c.seconds,
      tabs: Number(values.tabs ?? 1),
      ...(values.copy ? { smartCopy: true } : {}),
    });
    const cpu = process.cpuUsage(cpu0);
    rows.push({
      name: c.name,
      result,
      rssMb: process.resourceUsage().maxRSS / 1024,
      cpuMs: (cpu.user + cpu.system) / 1000,
    });
  }
  rmSync(out, { force: true });
  console.log(
    "\n| case | tabs | fps | Node cpu | Node peak RSS |  (cpu = core-ms per frame; Chrome's own is not counted)\n|---|---|---|---|---|",
  );
  for (const { name, result: r, rssMb, cpuMs } of rows)
    console.log(
      `| ${name} | ${r.tabs}${r.copiedFrames ? ` (${r.copiedFrames} copied)` : ""} | ${(r.frames / (r.wallMs / 1000)).toFixed(1)} | ${(cpuMs / r.frames).toFixed(0)} | ${rssMb.toFixed(0)} MB |`,
    );
  if (values.json)
    writeFileSync(
      values.json,
      JSON.stringify(
        rows.map(({ name, result, rssMb, cpuMs }) => ({
          name,
          fps: result.frames / (result.wallMs / 1000),
          frames: result.frames,
          wallMs: result.wallMs,
          tabs: result.tabs,
          rssMb,
          cpuMs,
        })),
        null,
        2,
      ),
    );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
