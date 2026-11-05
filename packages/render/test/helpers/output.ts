import { execFileSync, spawn } from "node:child_process";

export interface Probe {
  readonly codec: string;
  readonly width: number;
  readonly height: number;
  readonly frames: number;
  readonly duration: number;
  readonly fps: number;
  readonly audioStreams: number;
  /** Duration of the audio stream, when there is one. */
  readonly audioDuration: number | null;
}

/** What ffprobe says about a file, with the frames actually counted. */
export function probe(file: string): Probe {
  const run = (args: string[]): string =>
    execFileSync("ffprobe", ["-v", "error", ...args, file], { encoding: "utf8" }).trim();
  const v = JSON.parse(
    run([
      "-select_streams",
      "v:0",
      "-count_frames",
      "-show_entries",
      "stream=codec_name,width,height,nb_read_frames,avg_frame_rate",
      "-of",
      "json",
    ]),
  ).streams[0];
  const a = JSON.parse(run(["-select_streams", "a", "-show_entries", "stream=codec_name,duration", "-of", "json"]))
    .streams as { duration?: string }[];
  const duration = Number(run(["-show_entries", "format=duration", "-of", "default=nw=1:nk=1"]));
  const [num, den] = String(v.avg_frame_rate).split("/").map(Number);
  return {
    codec: v.codec_name,
    width: v.width,
    height: v.height,
    frames: Number(v.nb_read_frames),
    duration,
    fps: (num as number) / (den as number),
    audioStreams: a.length,
    audioDuration: a[0]?.duration ? Number(a[0].duration) : null,
  };
}

/** Decodes the whole file with ffmpeg; any decode error fails. */
export function decodesClean(file: string): void {
  execFileSync("ffmpeg", ["-v", "error", "-xerror", "-i", file, "-f", "null", "-"], {
    stdio: ["ignore", "ignore", "pipe"],
  });
}

export interface DecodedFrame {
  readonly timestamp: number;
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

/** Every video frame of a file as RGBA, in order, decoded by ffmpeg. */
export async function decodeFrames(file: string, visit: (frame: DecodedFrame, index: number) => void): Promise<number> {
  const { width, height, fps } = probe(file);
  const size = width * height * 4;
  const ffmpeg = spawn(
    "ffmpeg",
    ["-v", "error", "-i", file, "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
    {
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let errors = "";
  ffmpeg.stderr.on("data", (d: Buffer) => {
    errors += d.toString();
  });
  let n = 0;
  let pending: Buffer = Buffer.alloc(0);
  for await (const chunk of ffmpeg.stdout as AsyncIterable<Buffer>) {
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    while (pending.length >= size) {
      const rgba = new Uint8Array(pending.subarray(0, size));
      pending = pending.subarray(size);
      visit({ timestamp: n / fps, width, height, rgba }, n);
      n++;
    }
  }
  const code = await new Promise<number | null>((ok) => ffmpeg.on("close", ok));
  if (code !== 0) throw new Error(`ffmpeg could not decode ${file}: ${errors}`);
  return n;
}

/** An image file (PNG, JPEG) as RGBA, decoded by ffmpeg. */
export function readImage(file: string): DecodedFrame {
  const [width, height] = execFileSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  )
    .trim()
    .split(",")
    .map(Number) as [number, number];
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "rawvideo", "-pix_fmt", "rgba", "-"], {
    maxBuffer: 1 << 30,
  });
  return { timestamp: 0, width, height, rgba: new Uint8Array(raw.buffer, raw.byteOffset, raw.length) };
}

/**
 * The frame number the test media paints as ten binary cells across its top strip. Only the first nine are read: the
 * test media is 300 frames long, so the tenth (512) is never lit, and the e2e composition's counter covers it.
 */
export function readStrip(frame: DecodedFrame): number {
  let n = 0;
  const cell = frame.width / 10;
  for (let k = 0; k < 9; k++) {
    const x = Math.floor((k + 0.5) * cell),
      y = 20;
    if ((frame.rgba[(y * frame.width + x) * 4] as number) > 128) n |= 1 << k;
  }
  return n;
}

export function pixel(frame: DecodedFrame, x: number, y: number): [number, number, number] {
  const i = (y * frame.width + x) * 4;
  return [frame.rgba[i] as number, frame.rgba[i + 1] as number, frame.rgba[i + 2] as number];
}

/** The left channel of the soundtrack as float samples at 48 kHz, decoded by ffmpeg (no downmix, which would scale the level). */
export function decodeAudio(file: string): Float32Array {
  const raw = execFileSync(
    "ffmpeg",
    ["-v", "error", "-i", file, "-vn", "-af", "pan=mono|c0=c0", "-ar", "48000", "-f", "f32le", "-"],
    { maxBuffer: 1 << 30 },
  );
  return new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
}

/** Power of one frequency in a window, by the Goertzel algorithm. */
export function tonePower(samples: Float32Array, from: number, to: number, freq: number, sampleRate = 48000): number {
  const a = Math.floor(from * sampleRate),
    b = Math.floor(to * sampleRate);
  const k = 2 * Math.cos((2 * Math.PI * freq) / sampleRate);
  let s1 = 0,
    s2 = 0;
  for (let i = a; i < b; i++) {
    const s0 = (samples[i] as number) + k * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return (s1 * s1 + s2 * s2 - k * s1 * s2) / ((b - a) * (b - a));
}

export function rmsOf(samples: Float32Array, from: number, to: number, sampleRate = 48000): number {
  const a = Math.floor(from * sampleRate),
    b = Math.floor(to * sampleRate);
  let sum = 0;
  for (let i = a; i < b; i++) sum += (samples[i] as number) ** 2;
  return Math.sqrt(sum / (b - a));
}
