// The native codecs (UBERSCENE_CODECS): the flag, the wire format, and the server routes run against the real
// `uberscene-codec` binary, without a browser. The routes' tests are skipped when the binary is not built
// (`pnpm native:build`); CI builds it.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { EncodedVideoPacketSource, FilePathTarget, Output } from "mediabunny";

import { containerOf, outputFormat, PRORES_FOURCC } from "../src/encoding";
import { feedPackets } from "../src/join";
import { codecBinary, codecModes } from "../src/native/codecs";
import { type NativeRoutes, nativeRoutes } from "../src/native/routes";
import { avcCodecString, parseEncoded, rawHeader } from "../src/native/wire";
import { FRAME_HEADER, type NativeFrameData, parseFrame, planeBytes, readFrames } from "../src/web/page/native-frames";
import { decodesClean, probe } from "./helpers/output";

describe("UBERSCENE_CODECS", () => {
  it("is the browser's codecs unless it names native ones", () => {
    expect(codecModes({})).toEqual({ decode: "browser", encode: "browser" });
    expect(codecModes({ UBERSCENE_CODECS: "" })).toEqual({ decode: "browser", encode: "browser" });
    expect(codecModes({ UBERSCENE_CODECS: "native" })).toEqual({ decode: "native", encode: "native" });
    expect(codecModes({ UBERSCENE_CODECS: "Native-Decode" })).toEqual({ decode: "native", encode: "browser" });
    expect(codecModes({ UBERSCENE_CODECS: "native-encode" })).toEqual({ decode: "browser", encode: "native" });
  });

  it("names the values it takes when given another", () => {
    expect(() => codecModes({ UBERSCENE_CODECS: "ffmpeg" })).toThrow(
      'UBERSCENE_CODECS wants one of browser, native, native-decode, native-encode; got "ffmpeg"',
    );
  });

  it("refuses a binary that is not there", () => {
    expect(() => codecBinary({ UBERSCENE_CODEC_BIN: "/nonexistent/uberscene-codec" })).toThrow(/does not exist/);
  });

  it("writes a .mov only when the native encoder is on", () => {
    expect(() => containerOf("out.mov")).toThrow(/UBERSCENE_CODECS=native-encode/);
    expect(containerOf("out.mov", { nativeEncode: true })).toBe("mov");
    expect(containerOf("out.mp4", { nativeEncode: true })).toBe("mp4");
  });
});

describe("the wire format", () => {
  const frame = (w: number, h: number, pts: number): Uint8Array => {
    const out = new Uint8Array(FRAME_HEADER + planeBytes(w, h));
    const view = new DataView(out.buffer);
    out.set([0x55, 0x42, 0x46, 0x31], 0);
    view.setUint32(4, w, true);
    view.setUint32(8, h, true);
    out[12] = 1;
    view.setFloat64(16, pts, true);
    view.setFloat64(24, 1 / 30, true);
    out.fill(7, FRAME_HEADER);
    return out;
  };

  it("parses a picture only once all of it is there", () => {
    const bytes = frame(3, 3, 0.5);
    expect(planeBytes(3, 3)).toBe(9 + 2 * 4);
    expect(parseFrame(bytes.subarray(0, 20))).toBeNull();
    expect(parseFrame(bytes.subarray(0, bytes.length - 1))).toBeNull();
    const parsed = parseFrame(bytes);
    expect(parsed?.length).toBe(bytes.length);
    expect(parsed?.frame).toMatchObject({ width: 3, height: 3, matrix: 1, fullRange: false, timestamp: 0.5 });
    expect(() => parseFrame(new Uint8Array(40))).toThrow(/not a picture/);
  });

  it("reads pictures from a stream however its chunks fall", async () => {
    const all = new Uint8Array([...frame(4, 2, 0), ...frame(4, 2, 1 / 30)]);
    const chunks = [all.subarray(0, 5), all.subarray(5, 50), all.subarray(50)];
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (const chunk of chunks) c.enqueue(chunk);
        c.close();
      },
    });
    const times: number[] = [];
    for await (const f of readFrames(stream)) times.push(f.timestamp);
    expect(times).toEqual([0, 1 / 30]);
  });

  it("fails a stream that ends inside a picture", async () => {
    const cut = frame(4, 2, 0).subarray(0, 40);
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(cut);
        c.close();
      },
    });
    await expect(async () => {
      for await (const _ of readFrames(stream)) void _;
    }).rejects.toThrow(/ended inside a picture/);
  });

  it("reads the encoder's configuration and packets", () => {
    const config = new Uint8Array([1, 0x64, 0x00, 0x28, 0xff]);
    const head = new Uint8Array(8);
    head.set([0x55, 0x42, 0x43, 0x31]);
    new DataView(head.buffer).setUint32(4, config.length, true);
    const packet = new Uint8Array(32 + 3);
    packet.set([0x55, 0x42, 0x50, 0x31]);
    packet[4] = 1;
    new DataView(packet.buffer).setBigInt64(8, 4n, true);
    new DataView(packet.buffer).setBigInt64(16, 4n, true);
    new DataView(packet.buffer).setUint32(24, 3, true);
    packet.set([9, 9, 9], 32);
    const parsed = parseEncoded(new Uint8Array([...head, ...config, ...packet]));
    expect(Array.from(parsed.config)).toEqual(Array.from(config));
    expect(parsed.packets).toEqual([{ key: true, pts: 4, dts: 4, data: new Uint8Array([9, 9, 9]) }]);
    expect(avcCodecString(config)).toBe("avc1.640028");
    expect(() => parseEncoded(new Uint8Array([...head, ...config, ...packet.subarray(0, 33)]))).toThrow(/cut short/);
    expect(rawHeader(2, 4).subarray(0, 4).toString()).toBe("UBR1");
  });
});

let binary: string | null = null;
try {
  binary = codecBinary();
} catch {
  binary = null;
}

describe.skipIf(!binary)("the native codec routes", () => {
  let dir = "";
  let server: Server;
  let routes: NativeRoutes;
  let base = "";
  const files: Record<string, string> = {};

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "uberscene-native-"));
    const make = (name: string, args: string[]): void => {
      files[name] = join(dir, name);
      execFileSync("ffmpeg", [
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=320x240:rate=30:duration=2",
        ...args,
        files[name] as string,
      ]);
    };
    make("h264.mp4", ["-pix_fmt", "yuv420p", "-c:v", "libx264", "-bf", "2", "-g", "30"]);
    make("hevc.mp4", [
      "-pix_fmt",
      "yuv420p10le",
      "-c:v",
      "libx265",
      "-x265-params",
      "log-level=error",
      "-tag:v",
      "hvc1",
    ]);
    make("prores.mov", ["-c:v", "prores_ks", "-profile:v", "3"]);
    make("vp9.webm", ["-pix_fmt", "yuv420p", "-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "8"]);
    const media = {
      resolve: async (id: string) =>
        id === "remote"
          ? { kind: "url" as const, url: "https://example.com/x.mp4" }
          : { kind: "path" as const, path: files[id] as string },
    };
    routes = nativeRoutes(binary as string, { decode: "native", encode: "native" }, media);
    server = createServer((req, res) => {
      const path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
      void routes.handle(req, res, path).catch((error: unknown) => {
        if (!res.headersSent) res.writeHead(500);
        res.end(error instanceof Error ? error.message : String(error));
      });
    });
    await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    routes?.close();
    await new Promise<void>((ok) => server?.close(() => ok()));
    rmSync(dir, { recursive: true, force: true });
  });

  const framesOf = async (id: string, query: string): Promise<NativeFrameData[]> => {
    const res = await fetch(`${base}/native/frames/${id}${query}`);
    expect(res.status).toBe(200);
    const out: NativeFrameData[] = [];
    for await (const f of readFrames(res.body as ReadableStream<Uint8Array>)) out.push(f);
    return out;
  };

  it.each(["h264.mp4", "hevc.mp4", "prores.mov", "vp9.webm"])("probes %s as decodable at its size", async (id) => {
    const res = await fetch(`${base}/native/probe/${id}`);
    const info = (await res.json()) as Record<string, unknown>;
    expect(info).toMatchObject({ width: 320, height: 240, decodable: true });
    expect(info.duration).toBeCloseTo(2, 1);
  });

  it("streams the pictures of a range, the one showing at its start first", async () => {
    for (const id of ["h264.mp4", "hevc.mp4", "prores.mov", "vp9.webm"]) {
      const frames = await framesOf(id, "?from=0.51&to=0.7");
      expect(
        frames.map((f) => Math.round(f.timestamp * 30)),
        id,
      ).toEqual([15, 16, 17, 18, 19, 20]);
      expect(frames.every((f) => f.width === 320 && f.height === 240 && f.planes.length === planeBytes(320, 240))).toBe(
        true,
      );
      expect(frames[0]?.duration).toBeCloseTo(1 / 30, 2);
    }
  });

  it("streams every picture of a file to its end", async () => {
    const frames = await framesOf("hevc.mp4", "?from=0");
    expect(frames).toHaveLength(60);
    expect(frames.at(-1)?.timestamp).toBeCloseTo(59 / 30, 3);
  });

  it("gives the one picture showing at a time, and none before the first", async () => {
    expect((await framesOf("h264.mp4", "?at=1.01")).map((f) => Math.round(f.timestamp * 30))).toEqual([30]);
    expect(await framesOf("h264.mp4", "?at=0")).toHaveLength(1);
  });

  it("stops the decoder when the page stops reading", async () => {
    const abort = new AbortController();
    const res = await fetch(`${base}/native/frames/h264.mp4?from=0`, { signal: abort.signal });
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    await reader.read();
    abort.abort();
    // The next request still works: nothing is left holding the server.
    expect(await framesOf("h264.mp4", "?at=1")).toHaveLength(1);
  });

  it("refuses an asset served from a URL, so the page falls back to the browser", async () => {
    expect((await fetch(`${base}/native/probe/remote`)).status).toBe(409);
  });

  /** Sends `count` testsrc2 pictures to a new encode session, out of order, and returns the packets. */
  const encode = async (request: Record<string, unknown>, count: number) => {
    const raw = execFileSync(
      "ffmpeg",
      [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=320x240:rate=30",
        "-frames:v",
        String(count),
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "-",
      ],
      { maxBuffer: 1 << 28 },
    );
    const opened = await fetch(`${base}/native/encode`, { method: "POST", body: JSON.stringify(request) });
    const { session } = (await opened.json()) as { session: string };
    const size = 320 * 240 * 4;
    const order = Array.from({ length: count }, (_, i) => i);
    // Two pictures in flight arrive swapped: the server writes them in order all the same.
    [order[0], order[1]] = [order[1] as number, order[0] as number];
    await Promise.all(
      order.map((n) =>
        fetch(`${base}/native/encode/${session}?n=${n}`, {
          method: "POST",
          body: raw.subarray(n * size, (n + 1) * size),
        }),
      ),
    );
    const ended = await fetch(`${base}/native/encode/${session}/end`, { method: "POST" });
    expect(ended.status).toBe(200);
    return routes.takeEncoded(session);
  };

  it("encodes H.264 that joins into an MP4 ffmpeg plays", async () => {
    const request = { codec: "h264", width: 320, height: 240, fpsNum: 30, fpsDen: 1, keyint: 30, kbps: 1000 };
    const first = await encode(request, 30);
    const second = await encode(request, 30);
    expect(first.packets).toHaveLength(30);
    expect(first.packets.filter((p) => p.key).map((p) => p.pts)).toEqual([0]);
    const out = join(dir, "joined.mp4");
    const output = new Output({ format: outputFormat("mp4"), target: new FilePathTarget(out) });
    const source = new EncodedVideoPacketSource("avc");
    output.addVideoTrack(source, { frameRate: 30 });
    await output.start();
    const config = { current: null };
    const into = { source, fps: 30, config, codec: avcCodecString(first.config), width: 320, height: 240 };
    await feedPackets(first, { ...into, offsetFrames: 0 }, async () => undefined);
    await feedPackets(second, { ...into, offsetFrames: 30 }, async () => undefined);
    await output.finalize();
    expect(probe(out)).toMatchObject({ codec: "h264", width: 320, height: 240, frames: 60 });
    decodesClean(out);
  });

  it("encodes ProRes into a MOV", async () => {
    const encoded = await encode(
      { codec: "prores", width: 320, height: 240, fpsNum: 30, fpsDen: 1, keyint: 1, proresProfile: "lt" },
      10,
    );
    expect(encoded.config.length).toBe(0);
    expect(encoded.packets.every((p) => p.key)).toBe(true);
    const out = join(dir, "prores.mov");
    const output = new Output({ format: outputFormat("mov"), target: new FilePathTarget(out) });
    const source = new EncodedVideoPacketSource("prores");
    output.addVideoTrack(source, { frameRate: 30 });
    await output.start();
    const into = { source, fps: 30, config: { current: null }, codec: PRORES_FOURCC.lt, width: 320, height: 240 };
    await feedPackets(encoded, { ...into, offsetFrames: 0 }, async () => undefined);
    await output.finalize();
    expect(probe(out)).toMatchObject({ codec: "prores", width: 320, height: 240, frames: 10 });
    decodesClean(out);
  });

  it("reports an encoder that fails", async () => {
    const opened = await fetch(`${base}/native/encode`, {
      method: "POST",
      body: JSON.stringify({ codec: "h264", width: 321, height: 240, fpsNum: 30, fpsDen: 1, keyint: 30 }),
    });
    const { session } = (await opened.json()) as { session: string };
    const ended = await fetch(`${base}/native/encode/${session}/end`, { method: "POST" });
    expect(ended.status).toBe(500);
    expect(await ended.text()).toMatch(/sides must be even/);
  });
});
