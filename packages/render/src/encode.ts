import { VideoSample, type VideoSampleSource } from "mediabunny";
import type { FramePipeline } from "./pipeline";

export interface EncodeFramesOptions {
  readonly pipeline: FramePipeline;
  readonly source: VideoSampleSource;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  /** Frames `first` to `last - 1` of the composition; the first is written at time 0. */
  readonly first: number;
  readonly last: number;
  /** Runs before frame `n` is rendered, to keep something else (the soundtrack) in step. */
  readonly before?: (n: number) => Promise<void>;
  readonly progress?: (done: number) => void;
  readonly signal?: AbortSignal | undefined;
}

/**
 * Renders frames in order and hands them to a video encoder. The encoder works on one frame while the
 * next is composited, so only the frame before it has to be done. Returns the milliseconds spent waiting for it.
 */
export async function encodeFrames(options: EncodeFramesOptions): Promise<number> {
  const { pipeline, source, fps, width, height, first, last } = options;
  let encoding: Promise<void> = Promise.resolve();
  let waited = 0;
  const settle = async (): Promise<void> => {
    const at = performance.now();
    try { await encoding; } finally { waited += performance.now() - at; }
  };
  for (let n = first; n < last; n++) {
    if (options.signal?.aborted) throw new Error("render aborted");
    await options.before?.(n);
    const raw = await pipeline.frame(n, true);
    const timestamp = (n - first) / fps;
    let sample: VideoSample;
    if (raw instanceof VideoSample) {
      sample = raw;
      sample.setTimestamp(timestamp);
      sample.setDuration(1 / fps);
    } else {
      sample = new VideoSample(raw, { format: "RGBA", codedWidth: width, codedHeight: height, timestamp, duration: 1 / fps });
    }
    await settle();
    encoding = source.add(sample).finally(() => sample.close());
    encoding.catch(() => undefined); // reported when it is awaited, next frame
    options.progress?.(n - first + 1);
  }
  await settle();
  return waited;
}
