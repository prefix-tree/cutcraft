import { execFileSync } from "node:child_process";
import { ALL_FORMATS, FilePathSource, Input, VideoSampleSink } from "mediabunny";
import { initEnv } from "../../src";

export interface Probe {
  readonly codec: string;
  readonly width: number;
  readonly height: number;
  readonly frames: number;
  readonly duration: number;
  readonly fps: number;
  readonly audioStreams: number;
}

/** What ffprobe says about a file, with the frames actually counted. */
export function probe(file: string): Probe {
  const run = (args: string[]): string => execFileSync("ffprobe", ["-v", "error", ...args, file], { encoding: "utf8" }).trim();
  const v = JSON.parse(run(["-select_streams", "v:0", "-count_frames", "-show_entries", "stream=codec_name,width,height,nb_read_frames,avg_frame_rate", "-of", "json"])).streams[0];
  const a = JSON.parse(run(["-select_streams", "a", "-show_entries", "stream=codec_name", "-of", "json"])).streams as unknown[];
  const duration = Number(run(["-show_entries", "format=duration", "-of", "default=nw=1:nk=1"]));
  const [num, den] = String(v.avg_frame_rate).split("/").map(Number);
  return { codec: v.codec_name, width: v.width, height: v.height, frames: Number(v.nb_read_frames), duration, fps: (num as number) / (den as number), audioStreams: a.length };
}

/** Decodes the whole file with ffmpeg; any decode error fails. */
export function decodesClean(file: string): void {
  execFileSync("ffmpeg", ["-v", "error", "-xerror", "-i", file, "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] });
}

export interface DecodedFrame {
  readonly timestamp: number;
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

/** Every video frame of a file as RGBA, in order. */
export async function decodeFrames(file: string, visit: (frame: DecodedFrame, index: number) => void): Promise<number> {
  initEnv();
  const input = new Input({ source: new FilePathSource(file), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error("no video track");
  const sink = new VideoSampleSink(track, { hardwareAcceleration: "prefer-software" });
  let n = 0;
  for await (const sample of sink.samples()) {
    const rgba = new Uint8Array(sample.codedWidth * sample.codedHeight * 4);
    await sample.copyTo(rgba, { format: "RGBA" });
    visit({ timestamp: sample.timestamp, width: sample.codedWidth, height: sample.codedHeight, rgba }, n++);
    sample.close();
  }
  input.dispose();
  return n;
}

/** The frame number the test media paints as ten binary cells across its top strip. */
export function readStrip(frame: DecodedFrame): number {
  let n = 0;
  const cell = frame.width / 10;
  for (let k = 0; k < 10; k++) {
    const x = Math.floor((k + 0.5) * cell), y = 20;
    if ((frame.rgba[(y * frame.width + x) * 4] as number) > 128) n |= 1 << k;
  }
  return n;
}

export function pixel(frame: DecodedFrame, x: number, y: number): [number, number, number] {
  const i = (y * frame.width + x) * 4;
  return [frame.rgba[i] as number, frame.rgba[i + 1] as number, frame.rgba[i + 2] as number];
}
