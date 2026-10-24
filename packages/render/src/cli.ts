#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadVideo } from "./load";
import { directoryResolver } from "./media";
import type { FontWeight, OverlayFont } from "./overlays";
import { renderVideo, type VideoCodec } from "./renderer";

const USAGE = `Usage: cutcut-render <file.tsx> --out <video.webm|video.mp4> [options]

  --out <file>          where to write; .webm or .mp4 picks the container
  --manifest <file>     asset manifest JSON (default: the file's \`manifest\` export)
  --media <dir>         folder holding one file per asset id (default: the file's folder)
  --props <json>        props for the file's component
  --from <s> --to <s>   render only this part of the composition
  --codec <name>        vp9 (default for webm), vp8, av1, avc (default for mp4), hevc
  --bitrate <bps>       video bits per second (default: about 0.1 per pixel per frame)
  --silent              no soundtrack
  --font <spec>         extra font for titles: Name=file.ttf, Name:700=file.ttf or Name:700:italic=file.ttf
  --tsconfig <file>     how to compile the file (default: the nearest tsconfig.json)
  --continue            draw the grey placeholder for an asset that cannot be read, instead of failing
  --quiet               no progress
`;

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string" }, manifest: { type: "string" }, media: { type: "string" }, props: { type: "string" },
      from: { type: "string" }, to: { type: "string" }, codec: { type: "string" }, bitrate: { type: "string" },
      silent: { type: "boolean" }, font: { type: "string", multiple: true }, tsconfig: { type: "string" },
      continue: { type: "boolean" }, quiet: { type: "boolean" }, help: { type: "boolean", short: "h" },
    },
  });
  const [file] = positionals;
  if (values.help || !file || !values.out) {
    process.stderr.write(USAGE);
    return values.help ? 0 : 2;
  }
  const loaded = await loadVideo(file, {
    ...(values.manifest ? { manifest: values.manifest } : {}),
    ...(values.props ? { props: JSON.parse(values.props) as Record<string, unknown> } : {}),
    ...(values.tsconfig ? { tsconfig: values.tsconfig } : {}),
  });
  for (const e of loaded.state.errors) process.stderr.write(`warning: ${e.id ?? "?"}: ${e.message}\n`);
  const media = directoryResolver(resolve(values.media ?? dirname(file)), loaded.manifest);
  const tty = process.stderr.isTTY && !values.quiet;
  const result = await renderVideo({
    state: loaded.state, media, out: resolve(values.out), interiors: loaded.interiors,
    ...(values.from ? { from: Number(values.from) } : {}),
    ...(values.to ? { to: Number(values.to) } : {}),
    ...(values.codec ? { videoCodec: values.codec as VideoCodec } : {}),
    ...(values.bitrate ? { bitrate: Number(values.bitrate) } : {}),
    ...(values.silent ? { silent: true } : {}),
    ...(values.continue ? { onAssetError: "continue" as const } : {}),
    fonts: (values.font ?? []).map(readFont),
    onProgress: tty ? (p) => process.stderr.write(`\rframe ${p.frame}/${p.frames}`) : () => undefined,
  });
  if (tty) process.stderr.write("\n");
  for (const w of result.warnings) process.stderr.write(`warning: ${w}\n`);
  const seconds = (result.wallMs / 1000).toFixed(1);
  process.stderr.write(`${values.out}: ${result.frames} frames, ${result.width}x${result.height} at ${result.fps} fps${result.audio ? ", with sound" : ""}, in ${seconds}s (${(result.frames / (result.wallMs / 1000)).toFixed(1)} fps)\n`);
  return 0;
}

function readFont(spec: string): OverlayFont {
  const eq = spec.indexOf("=");
  if (eq < 1) throw new Error(`--font wants Name=file, got "${spec}"`);
  const [name = "", weight, style] = spec.slice(0, eq).split(":");
  const w = weight ? Number(weight) : 400;
  if (![100, 200, 300, 400, 500, 600, 700, 800, 900].includes(w)) throw new Error(`--font weight must be 100 to 900, got "${weight}"`);
  if (style && style !== "normal" && style !== "italic") throw new Error(`--font style must be normal or italic, got "${style}"`);
  return { name, data: readFileSync(spec.slice(eq + 1)), weight: w as FontWeight, style: style === "italic" ? "italic" : "normal" };
}

main().then((code) => process.exit(code), (error: unknown) => {
  process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
