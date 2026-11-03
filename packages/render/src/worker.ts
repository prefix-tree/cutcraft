import { parentPort, workerData } from "node:worker_threads";

import { type LoadedVideo, type LoadOptions, loadVideo } from "./load";
import { directoryResolver } from "./media";
import { type OverlayFont, OverlayPlane } from "./overlays";
import { encodeSegment, type SegmentStages, type VideoEncoding } from "./segment";

/** What a render worker needs to know before its first segment. */
export interface WorkerInit {
  readonly file: string;
  readonly load: LoadOptions;
  readonly mediaDir: string;
  readonly overrides: Readonly<Record<string, string>>;
  readonly fonts: readonly OverlayFont[];
  readonly encoding: VideoEncoding;
  readonly onAssetError: "throw" | "continue";
}

export interface SegmentRequest {
  readonly id: number;
  readonly first: number;
  readonly last: number;
}

export type SegmentReply =
  | {
      readonly id: number;
      readonly ok: true;
      readonly bytes: Uint8Array;
      readonly stages: SegmentStages;
      readonly warnings: readonly string[];
      readonly errors: readonly string[];
    }
  | { readonly id: number; readonly ok: false; readonly message: string };

const init = workerData as WorkerInit;
let loaded: Promise<{ video: LoadedVideo; overlays: OverlayPlane }> | null = null;
/** What the overlay plane, which lives across segments, has said since the last reply. */
const said: string[] = [];

function open(): Promise<{ video: LoadedVideo; overlays: OverlayPlane }> {
  loaded ??= loadVideo(init.file, init.load).then((video) => ({
    video,
    overlays: new OverlayPlane({
      state: video.state,
      media: directoryResolver(init.mediaDir, video.manifest, init.overrides),
      interiors: video.interiors,
      fonts: init.fonts,
      warn: (m) => said.push(m),
    }),
  }));
  return loaded;
}

parentPort?.on("message", (request: SegmentRequest) => {
  void (async () => {
    try {
      const { video, overlays } = await open();
      const result = await encodeSegment({
        state: video.state,
        media: directoryResolver(init.mediaDir, video.manifest, init.overrides),
        interiors: video.interiors,
        fonts: init.fonts,
        overlays,
        onAssetError: init.onAssetError,
        encoding: init.encoding,
        first: request.first,
        last: request.last,
      });
      const reply: SegmentReply = {
        id: request.id,
        ok: true,
        bytes: result.bytes,
        stages: result.stages,
        warnings: [...result.warnings, ...said.splice(0)],
        errors: result.errors.map((e) => `${e.asset ?? e.id ?? "?"}: ${e.error.message}`),
      };
      parentPort?.postMessage(reply, [result.bytes.buffer as ArrayBuffer]);
    } catch (error) {
      parentPort?.postMessage({
        id: request.id,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      } satisfies SegmentReply);
    }
  })();
});
