// The browser export's page: the real Player, stepped frame by frame, captured with HTML-in-Canvas
// (`drawElementImage`) and encoded with WebCodecs. Node serves this page with a job (the cut file's source, its props,
// its manifest), asks for runs of frames, and reads the encoded bytes back; the sound is mixed in Node.
import "@cutcraft/player/fonts.css";

import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, WebMOutputFormat } from "mediabunny";
import { createRef } from "react";
import { createRoot } from "react-dom/client";

import { installFreeCodeLibraries } from "@cutcraft/graphics/libraries";
import { type AssetManifest, collectModule, layerFramesPending, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";
import { addFontFaces, Player, type PlayerRef } from "@cutcraft/player";

import type { PageApi, PageJob, SegmentRequest } from "./protocol";

declare global {
  interface Window {
    __cutcraft?: PageApi;
  }
}

const SETTLE_TIMEOUT_MS = 10_000;

async function start(): Promise<void> {
  const job = (await (await fetch("/job.json")).json()) as PageJob;
  // Faces passed beside the manifest (`--font`); the player loads the manifest's own.
  await addFontFaces(job.fonts.map((f) => ({ family: f.family, weight: f.weight, style: f.style, source: f.url })));
  const imports = installFreeCodeLibraries();
  const mod = loadModule(job.source, { imports });
  const manifest = job.manifest as AssetManifest;
  const props = { ...(mod.defaults ?? {}), ...job.props };
  const state = resolve(collectModule(mod as never, props), manifest);
  const element = mod.default(props);
  const { width, height, fps } = state.composition;
  const media = { resolve: async (id: string) => ({ kind: "url" as const, url: `/media/${encodeURIComponent(id)}` }) };

  const cap = document.getElementById("cap") as HTMLCanvasElement;
  cap.width = width;
  cap.height = height;
  const root = document.getElementById("root") as HTMLDivElement;
  root.style.width = `${width}px`;
  root.style.height = `${height}px`;
  const errors: string[] = [];
  const ref = createRef<PlayerRef>();
  createRoot(root).render(
    <Player
      ref={ref}
      state={state}
      element={element}
      media={media}
      fit="none"
      controls={false}
      onError={(e) => errors.push(`${e.asset ?? e.id ?? "?"}: ${e.error.message}`)}
    />,
  );
  while (!ref.current) await tick();
  const core = ref.current.core;
  // No frame is drawn before the manifest's fonts are in: text set in a fallback face would be captured.
  await core.fontsReady;
  const ctx = cap.getContext("2d") as CanvasRenderingContext2D & {
    drawElementImage(element: Element, x: number, y: number): void;
  };
  if (typeof ctx.drawElementImage !== "function")
    throw new Error(
      "this browser has no drawElementImage: Chrome 153 or later with --enable-features=CanvasDrawElement",
    );

  /** Draws composition time `t` into the capture canvas. */
  const frame = async (t: number): Promise<void> => {
    await core.compositor.step(t);
    await settle();
    await painted(cap);
    ctx.clearRect(0, 0, width, height);
    try {
      ctx.drawElementImage(root, 0, 0);
    } catch (error) {
      throw new Error(
        `drawElementImage failed in ${navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] ?? navigator.userAgent}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  let out: Uint8Array = new Uint8Array();
  const api: PageApi = {
    composition: { width, height, fps, duration: state.composition.duration },
    errors,
    async segment(r: SegmentRequest) {
      const target = new BufferTarget();
      const output = new Output({
        format: r.container === "mp4" ? new Mp4OutputFormat() : new WebMOutputFormat(),
        target,
      });
      const source = new CanvasSource(cap, {
        codec: r.codec,
        bitrate: r.bitrate,
        keyFrameInterval: r.keyFrameInterval,
        latencyMode: "quality",
      });
      output.addVideoTrack(source, { frameRate: fps });
      await output.start();
      for (let n = r.first; n < r.last; n++) {
        await frame(n / fps);
        await source.add((n - r.first) / fps, 1 / fps);
      }
      await output.finalize();
      out = new Uint8Array(target.buffer as ArrayBuffer);
      return out.length;
    },
    async still(t: number, type: "image/png" | "image/jpeg", quality?: number) {
      await frame(t);
      const blob = await new Promise<Blob>((ok, fail) =>
        cap.toBlob((b) => (b ? ok(b) : fail(new Error("the frame could not be encoded"))), type, quality),
      );
      out = new Uint8Array(await blob.arrayBuffer());
      return out.length;
    },
    read(offset: number, length: number) {
      let s = "";
      const part = out.subarray(offset, offset + length);
      for (let i = 0; i < part.length; i += 0x8000) s += String.fromCharCode(...part.subarray(i, i + 0x8000));
      return btoa(s);
    },
  };
  window.__cutcraft = api;
}

function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

/**
 * After a step: React has committed the new time (its update is flushed before the next task), and every engine
 * layer has drawn it. A three.js renderer created by a layer that just appeared takes a few frames.
 */
async function settle(): Promise<void> {
  await tick();
  const until = performance.now() + SETTLE_TIMEOUT_MS;
  while (layerFramesPending() > 0) {
    if (performance.now() > until)
      throw new Error(
        `${layerFramesPending()} engine layer(s) did not finish drawing a frame within 10 s; a three.js layer waits for its canvas to have a size, so check that the page's canvas lays out its children`,
      );
    await new Promise((r) => setTimeout(r, 4));
  }
}

/**
 * The canvas's subtree has been laid out and painted, so drawElementImage sees this frame. A browser without the
 * `paint` event (or one that never fires it) falls back to two animation frames after a second.
 */
function painted(cap: HTMLCanvasElement): Promise<void> {
  const request = (cap as unknown as { requestPaint?: () => void }).requestPaint;
  const frames = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  if (typeof request !== "function") return frames();
  return new Promise((r) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      r();
    };
    cap.addEventListener("paint", finish, { once: true });
    request.call(cap);
    setTimeout(() => void frames().then(finish), 1000);
  });
}

start().catch((error: unknown) => {
  (window as unknown as { __cutcraftError: string }).__cutcraftError =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
});
