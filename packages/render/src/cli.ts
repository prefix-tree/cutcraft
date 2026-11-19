import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { MOMENT_FORMS, subtitles } from "@uberscene/kit";

import { addAsset, describeAdded } from "./add";
import { QUALITIES, type QualityName, type VideoCodec } from "./encoding";
import type { FontFile, FontWeight } from "./fonts";
import { fontSheet, formatFonts, listFonts } from "./fonts-list";
import { inspect } from "./inspect";
import { checkLayout, formatLayout, type Insets, SAFE_ZONES, type SafeZoneName } from "./layout-check";
import { loadVideo } from "./load";
import { renderLook } from "./look";
import { mediaFolders } from "./manifest-file";
import { directoryResolver } from "./media";
import { draftPath, renderVideo } from "./renderer";
import { installSkill } from "./skills";
import { renderStill } from "./still";
import { CHROME_MILESTONE, cachedChrome, installChrome } from "./web/chrome";
import { formatWhere, whereThings } from "./where";

/** --check-layout found issues: apart from 1 (an error) and 2 (usage), so a script can tell them apart. */
const EXIT_LAYOUT_ISSUES = 3;

const USAGE = `Usage: uberscene <file.tsx> --out <video.mp4|.webm|.mp3|.wav> [--draft] [options]
       uberscene <file.tsx> --still <seconds> --out <image.png|.jpg> [options]
       uberscene <file.tsx> --check-layout [--safe-zone <zone>] [--subject <x,y,w,h>] [--json] [options]
       uberscene <file.tsx> --srt <captions.srt> | --vtt <captions.vtt> [--from <s> --to <s>]
       uberscene inspect <file.tsx> [--at <moments>] [--json] [--manifest <file>] [--props <json>]
       uberscene look <file.tsx> [--at <moments> | --around <id>] [--without <id>] [--listen <stretch>]
                    [--zones <zone>] [--out look.png] [options]
       uberscene look <file.tsx> --motion <stretch> [--step <s>] [--listen <stretch>] [--out look.png] [options]
       uberscene where <file.tsx> --at <moments> [--safe-zone <zone>] [--json] [options]
       uberscene fonts [--for <role>] [--category <category>] [--sheet fonts.png [--text <words>]] [--json]
       uberscene add <media file>... [--manifest <file>] [--id <id>] [--transcript <file>]
       uberscene browser install
       uberscene skills install [--dir <folder>] [--force]

  Every export draws its frames in Chrome. The first one downloads Chrome for Testing ${CHROME_MILESTONE} into
  ~/.cache/uberscene/browsers (or UBERSCENE_BROWSER_CACHE); UBERSCENE_CHROMIUM names a Chrome 153+ to use instead.

  inspect               print the timeline as text, without a browser: each track and element with its seconds,
                        the words each clip plays, effects, keyframes and cuts; --json prints flat rows instead
  --at <moments>        (inspect) what is on screen and heard at each moment, comma-separated. A moment is one of:
                        ${MOMENT_FORMS}
  look                  draw many frames in one browser start, as one contact sheet (--out, default look.png), and
                        print what each cell is as JSON. Without --at or --around: the first frame of each clip,
                        both sides of every cut and each overlay, as an editor skims a cut
  --around <id>         (look) five moments across a transition, or an element coming in, in and going out
  --without <id>        (look) each frame twice, with and without an effect, an adjustment or an overlay
  --motion <stretch>    (look) read a move: a strip of small frames at even steps across a range such as 2..3 or
                        an element's id, each labelled with its time. Twelve frames unless --step <s> says how
                        far apart they are. On its own: not with --at, --around or --without
  --zones <zone>        (look) draw a safe zone over every cell (the zones --safe-zone takes): what is outside it
                        shaded, and an outline round each overlay, the captions and each named part, red where
                        it leaves the zone or the frame. The legend's cells gain "things": where each one is.
                        Not with --without
  --listen <stretch>    (look) show the sound of a stretch under the cells: all, a range such as 2..6, or an
                        element's id. The strip is the mix's waveform with a time scale and the words said; the
                        legend says how loud it is and where it is silent
  --cell <px>           (look) the width of a cell's picture (default 480; in a --motion strip 240, or 180 for
                        a portrait video)
  --columns <n>         (look) cells in a row (default up to 4, up to 12 in a --motion strip)
  --frames <dir>        (look) also write each cell's full frame there as PNG
  --no-cache            (look, --still) draw every frame again. Without it, frames are kept in .uberscene/cache
                        beside the file, keyed by what draws them, and a frame an edit did not touch is read from
                        there without starting a browser
  fonts                 list the fonts to choose from: the bundled families and a short list from Google Fonts,
                        each with its category, its weights, what it suits and how it looks; --json prints rows
  --for <role>          (fonts) only families that suit a role: headline, body, captions, numbers or accent
  --category <name>     (fonts) only one category: sans, serif, slab, condensed, display, handwriting or mono
  --sheet <image>       (fonts) also draw the listed families as one image, each setting the same words in its
                        heaviest weight and its regular one. The first time, Google's are downloaded into the
                        font cache
  --text <words>        (fonts --sheet) the words to set; default "Make It Move 2026"
  skills install        write the agent skill that ships with this CLI into .claude/skills/uberscene (or --dir
                        <folder>), so the agent learns this version's commands. Again after an upgrade, it replaces
                        the folder it wrote; a folder with edits, or one it did not write, wants --force
  add                   write each media file's entry into the manifest (default: the nearest uberscene.json): its
                        kind, length, size, frame rate and sound, read from the file, and its words from the
                        transcript beside it (talk.json from Whisper or ElevenLabs, talk.vtt or talk.srt)
  --id <id>             (add) the asset id; default the file name without its extension
  --transcript <file>   (add) a transcript other than the one beside the media
  browser install       download Chrome for Testing now, rather than on the first export
  --srt <file>          also write the captions the cut plays as SRT, timed like the export (alone: only that)
  --vtt <file>          the same as WebVTT

  --out <file>          where to write; the extension picks the container: .mp4 (H.264 and AAC), .webm (VP9 and
                        Opus), or .mp3/.wav for the soundtrack alone
  --still <s>           write the frame at this time as a PNG or JPEG instead of a video
  --check-layout        print every overlay that leaves the frame or the safe zone, or covers captions or the
                        subject: where it is in the file, when, and how to fix it, as a compiler does; writes no file
  --json                print the layout check as JSON instead; it exits 3 when it finds issues
  where                 print where each thing on screen is at each moment of --at: its box in pixels, whether it
                        is in the frame and in each safe zone (tiktok, reels and shorts for a portrait video,
                        or the one --safe-zone names), and what it overlaps. A part a layer's code names with
                        data-name="lamp" is listed too, as <layer id>/lamp; --json prints the same as data
  --safe-zone <zone>    tiktok, reels, shorts, title-safe (default) or action-safe, or top,right,bottom,left fractions
  --subject <x,y,w,h>   where the subject is, as fractions of the frame, for footage the manifest has no subjects for
  --step <s>            seconds between layout samples (default: every frame), or between the frames of a
                        --motion strip
  --manifest <file>     asset manifest JSON (default: the file's \`manifest\` export, then the nearest
                        uberscene.json from the file's folder upward)
  --media <dir>         folder holding one file per asset id (default: the file's folder, the manifest's,
                        then media/ beside the manifest)
  --props <json>        props for the file's component
  --from <s> --to <s>   render only this part of the composition
  --codec <name>        avc (default for .mp4), vp9 (default for .webm), or av1 in either
  --bitrate <bps>       video bits per second (default: about 0.1 per pixel per frame)
  --quality <preset>    very-low, low, medium, high or very-high, in place of --bitrate
  --draft               a render for watching, not keeping: every second frame, each shown twice as long, at half
                        the width and height and a low quality preset. Written beside --out as <name>.draft.<ext>
  --tabs <n>            pages of the browser that render pieces at once (default 1)
  --copy                copy encoded pictures from the source where a cut shows nothing else (VP9 at the composition's
                        size and rate), and render only the ends; fast for plain cuts
  --keyframe <seconds>  seconds between keyframes (default 2)
  --frame-timeout <s>   seconds one frame may take before the command fails, naming the frame (default 60)
  --silent              no soundtrack
  --font <spec>         extra font for titles: Name=file.ttf, Name:700=file.ttf or Name:700:italic=file.ttf
  --import <spec>       a module the file may import beyond react, zod and the kit: three, or name=specifier
                        (a package, or a path relative to the file); the editor must offer the same modules
  --continue            draw the grey placeholder for an asset that cannot be read, instead of failing
  --quiet               no progress
`;

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string" },
      for: { type: "string" },
      category: { type: "string" },
      sheet: { type: "string" },
      text: { type: "string" },
      tabs: { type: "string" },
      "frame-timeout": { type: "string" },
      keyframe: { type: "string" },
      manifest: { type: "string" },
      media: { type: "string" },
      props: { type: "string" },
      from: { type: "string" },
      to: { type: "string" },
      codec: { type: "string" },
      bitrate: { type: "string" },
      quality: { type: "string" },
      still: { type: "string" },
      "check-layout": { type: "boolean" },
      json: { type: "boolean" },
      "safe-zone": { type: "string" },
      subject: { type: "string" },
      step: { type: "string" },
      silent: { type: "boolean" },
      font: { type: "string", multiple: true },
      import: { type: "string", multiple: true },
      continue: { type: "boolean" },
      copy: { type: "boolean" },
      quiet: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      id: { type: "string" },
      transcript: { type: "string" },
      srt: { type: "string" },
      vtt: { type: "string" },
      at: { type: "string" },
      around: { type: "string" },
      motion: { type: "string" },
      zones: { type: "string" },
      draft: { type: "boolean" },
      without: { type: "string" },
      cell: { type: "string" },
      columns: { type: "string" },
      frames: { type: "string" },
      "no-cache": { type: "boolean" },
      listen: { type: "string" },
      dir: { type: "string" },
      force: { type: "boolean" },
    },
  });
  if (positionals[0] === "add") return add(positionals.slice(1), values);
  if (positionals[0] === "skills") {
    if (positionals[1] !== "install" || positionals.length > 2) {
      process.stderr.write(USAGE);
      return 2;
    }
    const result = installSkill({
      ...(values.dir === undefined ? {} : { dir: values.dir }),
      ...(values.force ? { force: true } : {}),
    });
    const from = result.previous && result.previous !== result.version ? ` (was ${result.previous})` : "";
    process.stderr.write(
      `the UberScene skill ${result.version}${from} → ${result.dir} (${result.files.length} files)\n`,
    );
    return 0;
  }
  const limit = values["frame-timeout"] === undefined ? undefined : Number(values["frame-timeout"]);
  if (limit !== undefined && !(limit > 0))
    throw new Error(`--frame-timeout wants seconds above 0, got "${values["frame-timeout"]}"`);
  const frameTimeout = limit === undefined ? {} : { frameTimeout: limit };
  // How every command loads the file: the manifest, the props and the modules given on the command line.
  const loadOptions = {
    ...(values.manifest ? { manifest: resolve(values.manifest) } : {}),
    ...(values.props ? { props: JSON.parse(values.props) as Record<string, unknown> } : {}),
    ...(values.import ? { imports: Object.fromEntries(values.import.map(readImport)) } : {}),
  };
  if (positionals[0] === "fonts") {
    if (positionals.length > 1) {
      process.stderr.write(USAGE);
      return 2;
    }
    const fonts = listFonts({
      ...(values.for === undefined ? {} : { role: values.for }),
      ...(values.category === undefined ? {} : { category: values.category }),
    });
    if (values.sheet !== undefined) {
      const drawn = await fontSheet({
        fonts,
        out: resolve(values.sheet),
        ...(values.text === undefined ? {} : { text: values.text }),
        onLog: (m: string) => process.stderr.write(`${m}\n`),
        ...frameTimeout,
      });
      for (const w of drawn.warnings) process.stderr.write(`warning: ${w}\n`);
      process.stderr.write(
        `${values.sheet}: ${drawn.families.length} families, ${drawn.columns} to a row, ${drawn.width}x${drawn.height}\n`,
      );
    }
    process.stdout.write(values.json ? `${JSON.stringify(fonts, null, 2)}\n` : formatFonts(fonts));
    return 0;
  }
  if (positionals[0] === "inspect") {
    const target = positionals[1];
    if (!target || positionals.length > 2) {
      process.stderr.write(USAGE);
      return 2;
    }
    const video = await loadVideo(target, loadOptions);
    const result = inspect(target, video.state, {
      ...(values.at !== undefined ? { at: values.at } : {}),
      ...(values.json ? { json: true } : {}),
    });
    process.stdout.write(result.output);
    for (const e of result.errors) process.stderr.write(`error: ${e}\n`);
    return result.errors.length > 0 ? 1 : 0;
  }
  if (positionals[0] === "browser") {
    if (positionals[1] !== "install") {
      process.stderr.write(USAGE);
      return 2;
    }
    // A Chrome already in the cache is kept: the command needs no network then, as on a CI runner with a warm cache.
    const cached = await cachedChrome();
    const path = cached ?? (await installChrome((m) => process.stderr.write(`${m}\n`)));
    process.stderr.write(`Chrome is at ${path}${cached ? " (already in the cache)" : ""}\n`);
    return 0;
  }
  if (positionals[0] === "look") {
    if (values.draft) throw new Error("--draft is a render of the video; look draws its own small frames");
    const target = positionals[1];
    if (!target || positionals.length > 2) {
      process.stderr.write(USAGE);
      return 2;
    }
    const video = await loadVideo(target, loadOptions);
    for (const e of video.state.errors) process.stderr.write(`warning: ${e.id ?? "?"}: ${e.message}\n`);
    const result = await renderLook({
      state: video.state,
      source: video.source,
      media: directoryResolver(mediaIn(values.media, target, video.manifestPath), video.manifest),
      out: resolve(values.out ?? "look.png"),
      fonts: (values.font ?? []).map(readFont),
      onLog: (m: string) => process.stderr.write(`${m}\n`),
      ...frameTimeout,
      ...(values.at !== undefined ? { at: values.at } : {}),
      ...(values.around !== undefined ? { around: values.around } : {}),
      ...(values.motion !== undefined ? { motion: values.motion } : {}),
      ...(values.zones !== undefined ? { zones: readZone(values.zones) } : {}),
      ...(values.step ? { step: Number(values.step) } : {}),
      ...(values.without !== undefined ? { without: values.without } : {}),
      ...(values.cell ? { cell: Number(values.cell) } : {}),
      ...(values.columns ? { columns: Number(values.columns) } : {}),
      ...(values.frames ? { frames: resolve(values.frames) } : {}),
      ...(values.listen !== undefined ? { listen: values.listen } : {}),
      ...(values["no-cache"] ? {} : { cacheDir: cacheDirOf(target) }),
      ...(values.continue ? { onAssetError: "continue" as const } : {}),
    });
    for (const w of result.warnings) process.stderr.write(`warning: ${w}\n`);
    for (const e of result.errors) process.stderr.write(`error: ${e}\n`);
    const { errors: _errors, warnings: _warnings, ...legend } = result;
    process.stdout.write(`${JSON.stringify(legend, null, 2)}\n`);
    if (result.sheet)
      process.stderr.write(
        `${result.sheet}: ${result.cells.length} cells, ${result.width}x${result.height}${result.cached > 0 ? ` (${result.cached} from the cache)` : ""}\n`,
      );
    return result.errors.length > 0 ? 1 : 0;
  }
  if (positionals[0] === "where") {
    const target = positionals[1];
    if (!target || positionals.length > 2 || values.at === undefined) {
      process.stderr.write(USAGE);
      return 2;
    }
    const video = await loadVideo(target, loadOptions);
    for (const e of video.state.errors) process.stderr.write(`warning: ${e.id ?? "?"}: ${e.message}\n`);
    const result = await whereThings({
      state: video.state,
      source: video.source,
      media: directoryResolver(mediaIn(values.media, target, video.manifestPath), video.manifest),
      at: values.at,
      fonts: (values.font ?? []).map(readFont),
      onLog: (m: string) => process.stderr.write(`${m}\n`),
      ...frameTimeout,
      ...(values["safe-zone"] ? { safeZone: readZone(values["safe-zone"]) } : {}),
    });
    for (const w of result.warnings) process.stderr.write(`warning: ${w}\n`);
    for (const e of result.errors) process.stderr.write(`error: ${e}\n`);
    const { errors: _errors, warnings: _warnings, ...report } = result;
    process.stdout.write(values.json ? `${JSON.stringify(report, null, 2)}\n` : formatWhere(result));
    return result.errors.length > 0 ? 1 : 0;
  }
  const [file] = positionals;
  const subtitlesOnly = !values.out && !values["check-layout"] && Boolean(values.srt || values.vtt);
  if (values.help || !file || (!values.out && !values["check-layout"] && !subtitlesOnly)) {
    process.stderr.write(USAGE);
    return values.help ? 0 : 2;
  }
  const loaded = await loadVideo(file, loadOptions);
  for (const e of loaded.state.errors) process.stderr.write(`warning: ${e.id ?? "?"}: ${e.message}\n`);
  const media = directoryResolver(mediaIn(values.media, file, loaded.manifestPath), loaded.manifest);
  // Subtitles first: they need no rendering, and a long export should not be the thing that delays them.
  for (const [format, path] of [
    ["srt", values.srt],
    ["vtt", values.vtt],
  ] as const) {
    if (!path) continue;
    const range = {
      ...(values.from ? { from: Number(values.from) } : {}),
      ...(values.to ? { to: Number(values.to) } : {}),
    };
    if (![...loaded.state.items.values()].some((p) => p.kind === "caption"))
      process.stderr.write(`warning: ${file} has no captions; ${path} holds none\n`);
    writeFileSync(resolve(path), subtitles(loaded.state, { format, ...range }));
    process.stderr.write(`${path}: ${format === "srt" ? "SRT" : "WebVTT"} captions\n`);
  }
  if (subtitlesOnly) return 0;
  const fonts = (values.font ?? []).map(readFont);
  const common = {
    state: loaded.state,
    source: loaded.source,
    media,
    fonts,
    onLog: (m: string) => process.stderr.write(`${m}\n`),
    ...frameTimeout,
  };
  if (values.draft && (values["check-layout"] || values.still !== undefined || values.copy))
    throw new Error(
      `--draft is a render of the video for watching; leave out ${values["check-layout"] ? "--check-layout" : values.still !== undefined ? "--still" : "--copy"}`,
    );
  if (values["check-layout"]) {
    const result = await checkLayout({
      ...common,
      source: { ...loaded.source, file },
      ...(values["safe-zone"] ? { safeZone: readZone(values["safe-zone"]) } : {}),
      ...(values.subject ? { subject: readSubject(values.subject) } : {}),
      ...(values.step ? { step: Number(values.step) } : {}),
      ...(values.from ? { from: Number(values.from) } : {}),
      ...(values.to ? { to: Number(values.to) } : {}),
    });
    process.stdout.write(values.json ? `${JSON.stringify(result, null, 2)}\n` : formatLayout(result));
    return result.issues.length > 0 ? EXIT_LAYOUT_ISSUES : 0;
  }
  const out = values.out as string; // the usage check above: only --check-layout runs without --out
  if (values.still !== undefined) {
    const time = Number(values.still);
    if (!Number.isFinite(time)) throw new Error(`--still wants seconds, got "${values.still}"`);
    const still = await renderStill({
      ...common,
      out: resolve(out),
      time,
      ...(values.continue ? { onAssetError: "continue" as const } : {}),
      ...(values["no-cache"] ? {} : { cacheDir: cacheDirOf(file) }),
    });
    for (const w of still.warnings) process.stderr.write(`warning: ${w}\n`);
    process.stderr.write(
      `${values.out}: frame ${still.frame}, ${still.width}x${still.height}${still.cached ? " (from the cache)" : ""}\n`,
    );
    return 0;
  }
  if (values.quality !== undefined && !(values.quality in QUALITIES))
    throw new Error(`--quality wants ${Object.keys(QUALITIES).join(", ")}, got "${values.quality}"`);
  if (values.quality !== undefined && values.bitrate !== undefined)
    throw new Error("--quality and --bitrate both set the size; pass one");
  if (values.codec !== undefined && !["avc", "vp9", "av1"].includes(values.codec))
    throw new Error(`--codec wants avc, vp9 or av1, got "${values.codec}"`);
  const tabs = values.tabs === undefined ? 1 : Math.floor(Number(values.tabs));
  if (!(tabs >= 1)) throw new Error(`--tabs wants a number of pages, got "${values.tabs}"`);
  const tty = process.stderr.isTTY && !values.quiet;
  // A draft goes beside the file --out names, under its own name: it never replaces the video.
  const written = values.draft ? draftPath(out) : out;
  const result = await renderVideo({
    ...common,
    out: resolve(written),
    ...(values.draft ? { draft: true } : {}),
    tabs,
    ...(values.from ? { from: Number(values.from) } : {}),
    ...(values.to ? { to: Number(values.to) } : {}),
    ...(values.codec ? { videoCodec: values.codec as VideoCodec } : {}),
    ...(values.bitrate ? { bitrate: Number(values.bitrate) } : {}),
    ...(values.quality ? { quality: values.quality as QualityName } : {}),
    ...(values.silent ? { silent: true } : {}),
    ...(values.copy ? { smartCopy: true } : {}),
    ...(values.keyframe ? { keyFrameInterval: Number(values.keyframe) } : {}),
    ...(values.continue ? { onAssetError: "continue" as const } : {}),
    onProgress: tty ? (p) => process.stderr.write(`\rframe ${p.frame}/${p.frames}`) : () => undefined,
  });
  if (tty) process.stderr.write("\n");
  for (const w of result.warnings) process.stderr.write(`warning: ${w}\n`);
  const seconds = (result.wallMs / 1000).toFixed(1);
  process.stderr.write(
    `${written}: ${values.draft ? "a draft, every second frame at half size: " : ""}${result.frames} frames, ${result.width}x${result.height} at ${result.fps} fps${result.audio ? ", with sound" : ""}, in ${seconds}s${result.tabs > 1 ? ` on ${result.tabs} tabs` : ""}${result.copiedFrames > 0 ? `, ${result.copiedFrames} frames copied` : ""} (${(result.frames / (result.wallMs / 1000)).toFixed(1)} fps)\n`,
  );
  return 0;
}

function numbers(spec: string, flag: string): number[] {
  const parts = spec.split(",").map(Number);
  if (parts.length !== 4 || !parts.every((v) => Number.isFinite(v) && v >= 0 && v <= 1))
    throw new Error(`${flag} wants four fractions 0..1 separated by commas, got "${spec}"`);
  return parts;
}

function readZone(spec: string): SafeZoneName | Insets {
  if (spec in SAFE_ZONES) return spec as SafeZoneName;
  if (!spec.includes(","))
    throw new Error(`--safe-zone wants ${Object.keys(SAFE_ZONES).join(", ")} or top,right,bottom,left, got "${spec}"`);
  const [top = 0, right = 0, bottom = 0, left = 0] = numbers(spec, "--safe-zone");
  return { top, right, bottom, left };
}

function readSubject(spec: string): { x: number; y: number; w: number; h: number } {
  const [x = 0, y = 0, w = 0, h = 0] = numbers(spec, "--subject");
  return { x, y, w, h };
}

/** Where media is looked for: the folder named, or the video's, the manifest's and `media/` beside the manifest. */
const mediaIn = (given: string | undefined, video: string, manifestPath: string | undefined): string[] =>
  given === undefined ? mediaFolders(dirname(resolve(video)), manifestPath) : [resolve(given)];

/** `uberscene add <media>...`: one manifest entry per file. */
async function add(
  files: readonly string[],
  values: { manifest?: string | undefined; id?: string | undefined; transcript?: string | undefined },
): Promise<number> {
  if (files.length === 0) {
    process.stderr.write(USAGE);
    return 2;
  }
  if (files.length > 1 && (values.id || values.transcript))
    throw new Error("--id and --transcript name one asset; add the files one at a time with them");
  for (const media of files) {
    const result = await addAsset(media, {
      ...(values.manifest ? { manifest: values.manifest } : {}),
      ...(values.id ? { id: values.id } : {}),
      ...(values.transcript ? { transcript: values.transcript } : {}),
    });
    for (const w of result.warnings) process.stderr.write(`warning: ${w}\n`);
    process.stderr.write(`${describeAdded(result)} → ${result.manifest}\n`);
  }
  return 0;
}

/** Where a file's frames are kept: `.uberscene/cache` beside it. */
function cacheDirOf(file: string): string {
  return join(dirname(resolve(file)), ".uberscene", "cache");
}

function readFont(spec: string): FontFile {
  const eq = spec.indexOf("=");
  if (eq < 1) throw new Error(`--font wants Name=file, got "${spec}"`);
  const [name = "", weight, style] = spec.slice(0, eq).split(":");
  const w = weight ? Number(weight) : 400;
  if (![100, 200, 300, 400, 500, 600, 700, 800, 900].includes(w))
    throw new Error(`--font weight must be 100 to 900, got "${weight}"`);
  if (style && style !== "normal" && style !== "italic")
    throw new Error(`--font style must be normal or italic, got "${style}"`);
  return {
    name,
    data: readFileSync(spec.slice(eq + 1)),
    weight: w as FontWeight,
    style: style === "italic" ? "italic" : "normal",
  };
}

/** `three` offers the package under its own name; `name=specifier` offers a package or a file under the name the cut imports. */
function readImport(spec: string): [string, string] {
  const eq = spec.indexOf("=");
  if (eq === 0) throw new Error(`--import wants name or name=specifier, got "${spec}"`);
  return eq < 0 ? [spec, spec] : [spec.slice(0, eq), spec.slice(eq + 1)];
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  },
);
