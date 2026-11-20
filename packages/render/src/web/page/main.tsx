// The export page: the real Player, stepped frame by frame, captured with HTML-in-Canvas (`drawElementImage`) and
// encoded with WebCodecs. Node serves this page with a job (the cut file's source, its props, its manifest), asks for
// runs of frames, the soundtrack, or the ink of the overlays at a moment, and reads the bytes back.
import "@uberscene/player/fonts.css";

import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  QUALITY_VERY_HIGH,
  QUALITY_VERY_LOW,
  WebMOutputFormat,
} from "mediabunny";
import { createRef } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { installFreeCodeLibraries } from "@uberscene/graphics/libraries";
import {
  frameAtSeconds,
  frameStartSeconds,
  layerFramesPending,
  motionBlurOf,
  shutterTimes,
} from "@uberscene/kit/schema";
import { addFontFaces, backdropTracks, Player, type PlayerRef } from "@uberscene/player";
import {
  defaultCreateCanvas,
  MediabunnyInputs,
  mediabunnyFrameSourceFactory,
  SETTLE_MS,
} from "@uberscene/player/engine";
import { type AssetManifest, collectModule, createPatchLog, loadModule, resolve } from "@uberscene/sdk";

import { measureSound, renderSoundtrack } from "./audio";
import { createFreeCodeClock } from "./clock";
import { inkOf, offFrame, pastEdges } from "./ink";
import { nativeFrameSourceFactory } from "./native-frames";
import type {
  AudioRequest,
  BoundsOptions,
  InkBounds,
  ListenRequest,
  PageApi,
  PageJob,
  SegmentRequest,
  TilesRequest,
} from "./protocol";
import { LISTEN_HEIGHT, TILE_BAND, TILE_GROUND } from "./protocol";

declare global {
  interface Window {
    __uberscene?: PageApi;
  }
}

const SETTLE_TIMEOUT_MS = 10_000;

const QUALITY = {
  "very-low": QUALITY_VERY_LOW,
  low: QUALITY_LOW,
  medium: QUALITY_MEDIUM,
  high: QUALITY_HIGH,
  "very-high": QUALITY_VERY_HIGH,
} as const;

async function start(): Promise<void> {
  const job = (await (await fetch("/job.json")).json()) as PageJob;
  // Every face, the file's and `--font`, read in Node and served here, so the export sets text in the same files and an
  // export needs no network once Google's are cached. The player is told not to fetch them again.
  await addFontFaces(job.fonts.map((f) => ({ family: f.family, weight: f.weight, style: f.style, source: f.url })));
  const imports = installFreeCodeLibraries();
  // The file's own requestAnimationFrame, performance, Date and Math.random run on the video's clock, set per frame.
  const clock = createFreeCodeClock(job.startedAt);
  const mod = loadModule(job.source, { imports, scope: clock.scope, ...(job.files ? { files: job.files } : {}) });
  const manifest = job.manifest as AssetManifest;
  const props = { ...(mod.defaults ?? {}), ...job.props };
  const tree = collectModule(mod as never, props);
  const state = resolve(tree, manifest);
  // The same file with some effects switched off, for a sheet's "without" cells: a patch on each, nothing else moved.
  let bare = state;
  if (job.disabled?.length) {
    const log = createPatchLog();
    for (const id of job.disabled) log.append({ op: "set", id, prop: "enabled", value: false });
    bare = resolve(tree, manifest, log);
  }
  const element = mod.default(props);
  const { width, height, fps } = state.composition;
  const media = { resolve: async (id: string) => ({ kind: "url" as const, url: `/media/${encodeURIComponent(id)}` }) };
  // With UBERSCENE_CODECS=native (or native-decode), footage comes from the native codec process; the browser's
  // decoder stays for images and for whatever the native one cannot read.
  const frameSourceFactory =
    job.decoder === "native"
      ? nativeFrameSourceFactory(
          defaultCreateCanvas,
          mediabunnyFrameSourceFactory(new MediabunnyInputs(), defaultCreateCanvas),
        )
      : undefined;

  const cap = document.getElementById("cap") as HTMLCanvasElement;
  cap.width = width;
  cap.height = height;
  const root = document.getElementById("root") as HTMLDivElement;
  root.style.width = `${width}px`;
  root.style.height = `${height}px`;
  const errors: string[] = [];
  const ref = createRef<PlayerRef>();
  const reactRoot = createRoot(root);
  let shown = state;
  const render = (which: typeof state): void =>
    reactRoot.render(
      <Player
        ref={ref}
        state={which}
        element={element}
        media={media}
        fit="none"
        controls={false}
        coreOptions={{ loadFonts: false, exactTime: true, ...(frameSourceFactory ? { frameSourceFactory } : {}) }}
        onError={(e) => errors.push(`${e.asset ?? e.id ?? "?"}: ${e.error.message}`)}
      />,
    );
  /** Puts the file, or the file without its disabled effects, in the player. */
  const show = async (which: typeof state): Promise<void> => {
    if (shown === which) return;
    shown = which;
    render(which);
    // React commits on its own schedule: the frame is drawn only once the player holds this state.
    while (ref.current?.core.state !== which) await tick();
    // A player given a new state redraws its own playhead at once and again once it has settled. A frame stepped
    // before that second redraw would be painted over by it, so it is waited out: this timer is set after the
    // player's, with the same delay, so it fires after it, and the next step then runs after that redraw.
    await new Promise((r) => setTimeout(r, SETTLE_MS));
  };
  render(state);
  while (!ref.current) await tick();
  const core = ref.current.core;
  const ctx = cap.getContext("2d") as CanvasRenderingContext2D & {
    drawElementImage(element: Element, x: number, y: number): void;
  };
  if (typeof ctx.drawElementImage !== "function")
    throw new Error(
      "this browser has no drawElementImage: the export runs on Chrome 157 with --enable-features=CanvasDrawElement",
    );

  const blur = motionBlurOf(state);
  /** Draws composition time `t` into the capture canvas: one moment, or the average of the moments its shutter sees. */
  const frame = async (t: number): Promise<void> => {
    if (!blur) return capture(t);
    // Summed in 32 bits and divided once, so eight samples blend without the banding of repeated 8-bit blends.
    const sum = new Uint32Array(width * height * 4);
    const times = shutterTimes(t, fps, blur, state.composition.duration);
    for (const at of times) {
      await capture(at);
      const { data } = ctx.getImageData(0, 0, width, height);
      for (let i = 0; i < data.length; i++) sum[i] = (sum[i] as number) + (data[i] as number);
    }
    const average = new ImageData(width, height);
    for (let i = 0; i < sum.length; i++) average.data[i] = Math.round((sum[i] as number) / times.length);
    ctx.putImageData(average, 0, 0);
  };
  /** What the frame being drawn is doing, for the message when it never finishes. */
  let stage = "step";
  /**
   * Runs a part of the frame at `t`. An error from it names the frame; when it outlasts the deadline, the frame
   * fails with the step it was in, so a stuck decoder or a layer that never draws ends the export with a reason.
   */
  const withinDeadline = async <T,>(t: number, work: () => Promise<T>): Promise<T> => {
    let timer = 0;
    const late = new Promise<never>((_, fail) => {
      timer = window.setTimeout(
        () => fail(new Error(`did not finish within ${job.frameTimeout / 1000} s: stuck in ${stage}`)),
        job.frameTimeout,
      );
    });
    try {
      return await Promise.race([work(), late]);
    } catch (error) {
      const said = error instanceof Error ? error.message : String(error);
      throw new Error(
        `frame ${frameAtSeconds(t, state.composition.rate)} (${t.toFixed(2)} s) ${said.startsWith("did not finish") ? "" : "failed: "}${said}`,
      );
    } finally {
      clearTimeout(timer);
    }
  };
  /** Draws the single moment `t` into the capture canvas. */
  const capture = (t: number): Promise<void> => withinDeadline(t, () => draw(t));
  const draw = async (t: number): Promise<void> => {
    clock.set(t);
    stage = "step";
    await core.compositor.step(t);
    stage = "settle";
    await settle();
    // The file's animation-frame callbacks for this frame: after the commit, so a loop a layer started as it mounted
    // ticks in its first frame. React commits what they set before `flushSync` returns: a setState from a callback
    // that is no React event is otherwise left to React's scheduler, which no wait here is ordered after, and the
    // frame was now and then captured with the state of the frame before.
    let ran = false;
    flushSync(() => {
      ran = clock.flush();
    });
    if (ran) await settle();
    stage = "paint";
    await painted(cap);
    // A face is fetched only when layout first sets text in it, which can be this paint: `settle` looked before the
    // fetch began. Text painted meanwhile is in the fallback face, so the frame waits for the face and paints again.
    while (document.fonts.status === "loading") {
      await document.fonts.ready;
      await painted(cap);
    }
    stage = "draw";
    ctx.clearRect(0, 0, width, height);
    try {
      ctx.drawElementImage(root, 0, 0);
    } catch (error) {
      throw new Error(
        `drawElementImage failed in ${navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] ?? navigator.userAgent}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  /** Kinds the layout check measures: overlays drawn as DOM, and the captions. */
  const MEASURED = new Set(["title", "shape", "svg", "sticker", "layer", "captions"]);
  const backdrop = backdropTracks(state);

  let out: Uint8Array = new Uint8Array();
  /** The cells the last `tiles` call drew, and their full frames when it was asked to keep them. */
  let keptTiles: Uint8Array[] = [];
  let keptBounds: (readonly InkBounds[])[] = [];
  let kept: Uint8Array[] = [];
  const encode = async (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Uint8Array> => {
    const blob = await new Promise<Blob>((ok, fail) =>
      canvas.toBlob((b) => (b ? ok(b) : fail(new Error("the picture could not be encoded"))), type, quality),
    );
    return new Uint8Array(await blob.arrayBuffer());
  };
  /**
   * Frames [first, last) encoded by the native codec process: each picture read back as RGBA and sent to Node, which
   * writes it to `uberscene-codec encode` in order. Two pictures may be on their way while the next is drawn.
   * Returns the session whose packets Node keeps.
   */
  const encodeNatively = async (
    r: SegmentRequest,
    rate: number,
    exact: { readonly num: number; readonly den: number },
    drawn: (n: number) => Promise<HTMLCanvasElement>,
  ): Promise<string> => {
    const native = r.native as NonNullable<SegmentRequest["native"]>;
    const outW = r.scale && r.scale < 1 ? Math.max(2, Math.round((width * r.scale) / 2) * 2) : width;
    const outH = r.scale && r.scale < 1 ? Math.max(2, Math.round((height * r.scale) / 2) * 2) : height;
    const opened = await fetch("/native/encode", {
      method: "POST",
      body: JSON.stringify({
        ...native,
        width: outW,
        height: outH,
        fpsNum: exact.num,
        fpsDen: exact.den,
        keyint: Math.max(1, Math.round(r.keyFrameInterval * rate)),
      }),
    });
    if (!opened.ok) throw new Error(`the native encoder did not start: ${await opened.text()}`);
    const { session } = (await opened.json()) as { session: string };
    const inFlight: Promise<void>[] = [];
    const send = async (index: number, pixels: Uint8Array<ArrayBuffer>): Promise<void> => {
      const res = await fetch(`/native/encode/${session}?n=${index}`, { method: "POST", body: pixels });
      if (!res.ok) throw new Error(`the native encoder failed: ${await res.text()}`);
    };
    for (let n = r.first; n < r.last; n++) {
      const canvas = await drawn(n);
      const pixels = await withinDeadline(n / rate, async (): Promise<Uint8Array<ArrayBuffer>> => {
        stage = "encode";
        const picture = new VideoFrame(canvas, { timestamp: 0 });
        try {
          const buffer = new Uint8Array(outW * outH * 4);
          await picture.copyTo(buffer, { format: "RGBA" });
          return buffer;
        } finally {
          picture.close();
        }
      });
      inFlight.push(send(n - r.first, pixels));
      if (inFlight.length >= 2) await withinDeadline(n / rate, () => inFlight.shift() as Promise<void>);
    }
    await Promise.all(inFlight);
    const ended = await fetch(`/native/encode/${session}/end`, { method: "POST" });
    if (!ended.ok) throw new Error(`the native encoder failed: ${await ended.text()}`);
    return session;
  };

  const api: PageApi = {
    composition: { width, height, fps, rate: state.composition.rate, duration: state.composition.duration },
    errors,
    get paintFallbacks() {
      return paintFallbacks;
    },
    async segment(r: SegmentRequest) {
      const rate = r.fps ?? fps;
      const exact = r.rate ?? state.composition.rate;
      // A smaller picture is the captured frame drawn down into a second canvas, with even sides for the encoder.
      const scale = r.scale ?? 1;
      const small = scale < 1 ? document.createElement("canvas") : null;
      if (small) {
        small.width = Math.max(2, Math.round((width * scale) / 2) * 2);
        small.height = Math.max(2, Math.round((height * scale) / 2) * 2);
      }
      const smallCtx = small?.getContext("2d") ?? null;
      const drawn = async (n: number): Promise<HTMLCanvasElement> => {
        await frame(frameStartSeconds(n, exact));
        if (small && smallCtx) {
          smallCtx.clearRect(0, 0, small.width, small.height);
          smallCtx.drawImage(cap, 0, 0, small.width, small.height);
        }
        return small ?? cap;
      };
      if (r.native) return { session: await encodeNatively(r, rate, exact, drawn) };
      const target = new BufferTarget();
      const output = new Output({
        format: r.container === "mp4" ? new Mp4OutputFormat() : new WebMOutputFormat(),
        target,
      });
      const source = new CanvasSource(small ?? cap, {
        codec: r.codec,
        bitrate: r.quality ? QUALITY[r.quality] : r.bitrate,
        keyFrameInterval: r.keyFrameInterval,
        latencyMode: "quality",
      });
      output.addVideoTrack(source, { frameRate: rate });
      await output.start();
      for (let n = r.first; n < r.last; n++) {
        await drawn(n);
        await withinDeadline(n / rate, () => {
          stage = "encode";
          return source.add((n - r.first) / rate, 1 / rate);
        });
      }
      await output.finalize();
      out = new Uint8Array(target.buffer as ArrayBuffer);
      return out.length;
    },
    async audio(r: AudioRequest) {
      const track = await renderSoundtrack(state, media, r);
      out = track.bytes ?? new Uint8Array();
      return { length: out.length, codec: track.codec, warnings: track.warnings };
    },
    async bounds(t: number, options?: BoundsOptions) {
      await capture(t);
      // Each overlay alone: everything else hidden, the frame drawn, its pixels scanned for ink.
      const cells = [...root.querySelectorAll<HTMLElement>("[data-el][data-kind]")].filter(
        (el) => MEASURED.has(el.dataset.kind ?? "") && !el.parentElement?.closest("[data-el]"),
      );
      /** The ink of one element, with the rest of the page hidden. */
      const measure = async (el: HTMLElement | SVGElement) => {
        const before = el.style.visibility;
        el.style.visibility = "visible";
        try {
          // drawElementImage draws only into the canvas that holds the element, so the capture canvas measures.
          await painted(cap);
          ctx.clearRect(0, 0, width, height);
          // An overlay that paints nothing just now (captions between two lines, an empty layer) leaves the browser
          // with no picture of the page to draw, and it says so by throwing. Nothing painted is no ink.
          try {
            ctx.drawElementImage(root, 0, 0);
          } catch (e) {
            if (!(e instanceof DOMException) || e.name !== "InvalidStateError") throw e;
          }
          const r = el.getBoundingClientRect();
          const o = root.getBoundingClientRect();
          const k = width / o.width;
          const box = { x: (r.left - o.left) * k, y: (r.top - o.top) * k, w: r.width * k, h: r.height * k };
          const seen = inkOf(ctx.getImageData(0, 0, width, height).data, width, height);
          return seen ? pastEdges(seen, box, width, height) : offFrame(box, width, height);
        } finally {
          el.style.visibility = before;
        }
      };
      // Which named parts are drawn is asked now, while the page is as the file left it: once the page is hidden to
      // measure, a part the file's own code hid looks the same as any other.
      const partsOf = new Map<Element, (HTMLElement | SVGElement)[]>();
      if (options?.parts)
        for (const el of cells)
          partsOf.set(
            el,
            [...el.querySelectorAll<HTMLElement | SVGElement>("[data-name]")].filter(
              (part) => part.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true,
            ),
          );
      const found: InkBounds[] = [];
      root.style.visibility = "hidden";
      try {
        for (const el of cells) {
          const ink = await measure(el);
          if (!ink) continue;
          const track = el.closest<HTMLElement>("[data-track]")?.dataset.track;
          const id = el.dataset.el as string;
          // A ground: beneath the footage, or a layer the file marks with `ground` (a scrim over the footage, which
          // things are meant to sit on).
          const under = (track !== undefined && backdrop.has(track)) || state.items.get(id)?.props.ground === true;
          found.push({ id, kind: el.dataset.kind as string, ...ink, backdrop: under });
          // What the element's own code named: each part alone, measured the same way.
          for (const part of partsOf.get(el) ?? []) {
            const name = part.dataset.name;
            const partInk = name ? await measure(part) : null;
            if (name && partInk) found.push({ id: `${id}/${name}`, kind: "part", of: id, ...partInk, backdrop: under });
          }
        }
      } finally {
        root.style.visibility = "";
        await painted(cap);
      }
      return found;
    },
    async still(t: number, type: "image/png" | "image/jpeg", quality?: number) {
      await frame(t);
      out = await encode(cap, type, quality);
      return out.length;
    },
    async tiles(r: TilesRequest) {
      const cellHeight = Math.round((r.cellWidth * height) / width);
      const tile = document.createElement("canvas");
      tile.width = r.cellWidth;
      tile.height = cellHeight + TILE_BAND;
      const g = tile.getContext("2d") as CanvasRenderingContext2D;
      // The labels are set in a bundled face, so a sheet reads the same on every machine.
      await document.fonts.load('500 14px "JetBrains Mono"');
      g.imageSmoothingQuality = "high";
      g.textBaseline = "middle";
      keptTiles = [];
      keptBounds = [];
      kept = [];
      try {
        // The cells of the file as written first, then the ones without its disabled effects: the state changes once.
        const order = [...r.cells.entries()].sort(
          ([, a], [, b]) => Number(Boolean(a.without?.effects)) - Number(Boolean(b.without?.effects)),
        );
        for (const [i, cell] of order) {
          await show(cell.without?.effects ? bare : state);
          // An overlay is in the DOM only while it is on screen, so it is hidden after a step that mounts it.
          if (cell.without?.overlay) await core.compositor.step(cell.t).then(settle);
          const target = cell.without?.overlay
            ? root.querySelector<HTMLElement>(`[data-el="${CSS.escape(cell.without.overlay)}"]`)
            : null;
          const before = target?.style.visibility ?? "";
          if (target) target.style.visibility = "hidden";
          try {
            // Measured first: measuring draws each thing alone into the capture canvas, so the frame is drawn after.
            if (r.zone) keptBounds[i] = await api.bounds(cell.t, { parts: true });
            await frame(cell.t);
          } finally {
            if (target) target.style.visibility = before;
          }
          g.fillStyle = TILE_GROUND;
          g.fillRect(0, 0, tile.width, tile.height);
          g.drawImage(cap, 0, 0, r.cellWidth, cellHeight);
          if (r.zone)
            drawZone(g, r.zone, keptBounds[i] ?? [], {
              scale: r.cellWidth / width,
              width,
              height,
              labels: r.labels === true,
            });
          g.fillStyle = "#f2f1ee";
          g.font = '500 14px "JetBrains Mono", monospace';
          g.fillText(cell.label, 2, cellHeight + 14, r.cellWidth - 4);
          if (cell.sub) {
            g.fillStyle = "#a9a8b0";
            g.font = '400 12px "JetBrains Mono", monospace';
            g.fillText(cell.sub, 2, cellHeight + 32, r.cellWidth - 4);
          }
          keptTiles[i] = await encode(tile, "image/png");
          if (r.keepFrames) kept[i] = await encode(cap, "image/png");
        }
      } finally {
        await show(state);
      }
      return r.cells.length;
    },
    async listen(r: ListenRequest) {
      const strip = document.createElement("canvas");
      strip.width = r.width;
      strip.height = LISTEN_HEIGHT;
      const g = strip.getContext("2d") as CanvasRenderingContext2D;
      await document.fonts.load('500 14px "JetBrains Mono"');
      const sound = await measureSound(state, media, r.from, r.to, r.width);
      g.fillStyle = TILE_GROUND;
      g.fillRect(0, 0, strip.width, strip.height);
      g.textBaseline = "middle";
      const level = (v: number | null): string => (v === null ? "silent" : `${v.toFixed(1)} dBFS`);
      g.fillStyle = "#f2f1ee";
      g.font = '500 14px "JetBrains Mono", monospace';
      g.fillText(
        `sound ${r.from.toFixed(2)}..${r.to.toFixed(2)} s · peak ${level(sound.peakDb)} · rms ${level(sound.rmsDb)}${
          sound.lufs === null ? "" : ` · ${sound.lufs.toFixed(1)} LUFS`
        }${sound.clipped > 0 ? ` · clips at ${(sound.clippedAt ?? 0).toFixed(2)} s` : ""}`,
        2,
        12,
        r.width - 4,
      );
      // The level over time, on a decibel scale from -60 dBFS at the bottom to full scale at the top: a linear
      // waveform shows quiet speech as a flat line. Each column is its loudest sample, with its average level inside.
      const top = 26,
        tall = 64,
        floor = -60;
      const x = (t: number): number => ((t - r.from) / (r.to - r.from)) * r.width;
      const rise = (v: number): number =>
        v <= 0 ? 0 : Math.max(0, Math.min(1, 1 - (20 * Math.log10(v)) / floor)) * tall;
      g.fillStyle = "#20202a";
      g.fillRect(0, top, r.width, tall);
      g.fillStyle = "#2f2f3d";
      for (const [a, b] of sound.silences) g.fillRect(x(a), top, x(b) - x(a), tall);
      g.fillStyle = "#56628a";
      for (const [i, p] of sound.peaks.entries()) g.fillRect(i, top + tall - rise(p), 1, rise(p));
      g.fillStyle = "#c8d2f0";
      for (const [i, v] of sound.rms.entries()) g.fillRect(i, top + tall - rise(v), 1, rise(v));
      // A line every 20 dB, named at the right edge.
      g.font = '400 10px "JetBrains Mono", monospace';
      for (const db of [-20, -40]) {
        const y = top + (db / floor) * tall;
        g.fillStyle = "rgba(242, 241, 238, 0.18)";
        g.fillRect(0, y, r.width, 1);
        g.fillStyle = "#8d8c96";
        g.fillText(`${db}`, r.width - 22, y - 6);
      }
      // A time scale: a tick every step that leaves room for its number.
      const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60];
      const step = steps.find((s) => ((r.to - r.from) / s) * 56 <= r.width) ?? 120;
      g.font = '400 11px "JetBrains Mono", monospace';
      g.fillStyle = "#8d8c96";
      for (let t = Math.ceil(r.from / step - 1e-9) * step; t <= r.to + 1e-9; t += step) {
        g.fillRect(x(t), top + tall, 1, 5);
        g.fillText(`${Number(t.toFixed(2))}`, Math.min(x(t) + 3, r.width - 30), top + tall + 12);
      }
      // The words, each where it is said; one that would run into the word before it is left out.
      g.font = '400 12px "JetBrains Mono", monospace';
      let free = 0;
      for (const word of r.words) {
        const at = x(word.start);
        g.fillStyle = "#4c4c5a";
        g.fillRect(at, top, 1, tall);
        if (at < free) continue;
        g.fillStyle = "#f2f1ee";
        g.fillText(word.text, at + 2, LISTEN_HEIGHT - 10);
        free = at + 2 + g.measureText(word.text).width + 6;
      }
      out = await encode(strip, "image/png");
      const { peaks: _peaks, rms: _rms, ...measured } = sound;
      return { length: out.length, ...measured };
    },
    tile(index: number) {
      const bytes = keptTiles[index];
      if (!bytes) throw new Error(`the last call drew no tile ${index}`);
      out = bytes;
      return out.length;
    },
    tileBounds(index: number) {
      const bounds = keptBounds[index];
      if (!bounds) throw new Error(`the last call measured no tile ${index}`);
      return bounds;
    },
    frame(index: number) {
      const bytes = kept[index];
      if (!bytes) throw new Error(`the last call kept no frame ${index}`);
      out = bytes;
      return out.length;
    },
    read(offset: number, length: number) {
      let s = "";
      const part = out.subarray(offset, offset + length);
      for (let i = 0; i < part.length; i += 0x8000) s += String.fromCharCode(...part.subarray(i, i + 0x8000));
      return btoa(s);
    },
  };
  window.__uberscene = api;
}

/** Pixels a thing may stray past an edge before it counts as outside: the ink scan's own slack. */
const ZONE_SLACK = 2;
const ZONE_IN = "#a3e635";
const ZONE_OUT = "#ff4d4d";

/**
 * Draws a safe zone over a cell's picture: what is outside it shaded, a line at its edge, and an outline round each
 * thing measured, red where it leaves the zone or the frame. A layer whose code named parts is drawn as its parts;
 * what fills the frame, or sits beneath the footage, is not drawn.
 */
function drawZone(
  g: CanvasRenderingContext2D,
  zone: { readonly x: number; readonly y: number; readonly w: number; readonly h: number },
  bounds: readonly InkBounds[],
  o: { readonly scale: number; readonly width: number; readonly height: number; readonly labels: boolean },
): void {
  const k = o.scale;
  g.save();
  // Everything outside the zone, as one shape: the frame with the zone cut out of it.
  const outside = new Path2D();
  outside.rect(0, 0, o.width * k, o.height * k);
  outside.rect(zone.x * k, zone.y * k, zone.w * k, zone.h * k);
  g.fillStyle = "rgba(0, 0, 0, 0.45)";
  g.fill(outside, "evenodd");
  g.strokeStyle = "rgba(255, 255, 255, 0.75)";
  g.lineWidth = 1;
  g.setLineDash([4, 3]);
  g.strokeRect(zone.x * k + 0.5, zone.y * k + 0.5, zone.w * k - 1, zone.h * k - 1);
  g.setLineDash([]);
  const withParts = new Set(bounds.flatMap((b) => (b.of ? [b.of] : [])));
  for (const b of bounds) {
    const { x, y, w, h } = b.rect;
    const fills = x <= ZONE_SLACK && y <= ZONE_SLACK && x + w >= o.width - ZONE_SLACK && y + h >= o.height - ZONE_SLACK;
    if (b.backdrop || fills || withParts.has(b.id)) continue;
    const out =
      Math.max(zone.x - x, zone.y - y, x + w - (zone.x + zone.w), y + h - (zone.y + zone.h)) > ZONE_SLACK ||
      Math.max(-x, -y, x + w - o.width, y + h - o.height) > ZONE_SLACK;
    if (out) {
      // The part of it that is outside the zone.
      g.save();
      g.clip(outside, "evenodd");
      g.fillStyle = "rgba(255, 77, 77, 0.3)";
      g.fillRect(x * k, y * k, w * k, h * k);
      g.restore();
    }
    g.strokeStyle = out ? ZONE_OUT : ZONE_IN;
    g.lineWidth = 1.5;
    g.strokeRect(x * k, y * k, w * k, h * k);
    if (!o.labels) continue;
    g.font = '500 11px "JetBrains Mono", monospace';
    g.textBaseline = "middle";
    const wide = g.measureText(b.id).width + 6;
    // Above the outline, or inside its top edge where there is no room above.
    const top = y * k >= 14 ? y * k - 14 : y * k + 1;
    const left = Math.min(Math.max(0, x * k), o.width * k - wide);
    g.fillStyle = "rgba(10, 12, 19, 0.85)";
    g.fillRect(left, top, wide, 13);
    g.fillStyle = out ? ZONE_OUT : ZONE_IN;
    g.fillText(b.id, left + 3, top + 7);
  }
  g.restore();
}

function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

/**
 * After a step: React has committed the new time (the player's time is an external store, whose update React
 * flushes before the next task; an ordinary setState is not, see `draw`), every engine layer has drawn it, every
 * face its text uses has loaded, and every image or SVG file an overlay shows has loaded. A three.js renderer created by a layer that just appeared
 * takes a few frames; a bundled face (fonts.css) is fetched only once text first uses it, so text that appears after
 * the first frame would otherwise be captured in the fallback face.
 */
async function settle(): Promise<void> {
  await tick();
  if (document.fonts.status === "loading") await document.fonts.ready;
  const until = performance.now() + SETTLE_TIMEOUT_MS;
  // An overlay still loading its file (a sticker's image, an SVG's markup) says so with `data-pending`.
  while (document.querySelector("[data-pending]")) {
    if (performance.now() > until) throw new Error("an overlay's media did not load within 10 s");
    await new Promise((r) => setTimeout(r, 4));
  }
  await Promise.all(
    [...document.images].filter((img) => !img.complete).map((img) => img.decode().catch(() => undefined)),
  );
  while (layerFramesPending() > 0) {
    if (performance.now() > until)
      throw new Error(
        `${layerFramesPending()} engine layer(s) did not finish drawing a frame within 10 s; a three.js layer waits for its canvas to have a size, so check that the page's canvas lays out its children`,
      );
    await new Promise((r) => setTimeout(r, 4));
  }
}

/** How many times `painted` gave up on the paint event; the export reports it, as such a frame may be stale. */
let paintFallbacks = 0;
/**
 * The canvas's subtree has been laid out and painted, so drawElementImage sees this frame. A browser without the
 * `paint` event (or one that never fires it) falls back to two animation frames after a second.
 */
function painted(cap: HTMLCanvasElement): Promise<void> {
  const request = (cap as unknown as { requestPaint?: () => void }).requestPaint;
  const frames = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  return new Promise((r) => {
    let done = false;
    const finish = (fallback: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (fallback) paintFallbacks++;
      r();
    };
    const timer = setTimeout(() => void frames().then(() => finish(true)), typeof request === "function" ? 1000 : 0);
    if (typeof request !== "function") return;
    cap.addEventListener("paint", () => finish(false), { once: true });
    request.call(cap);
  });
}

start().catch((error: unknown) => {
  (window as unknown as { __ubersceneError: string }).__ubersceneError =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
});
