// The export server's side of the native codecs: it runs `uberscene-codec` for the page. Decoding streams an asset's
// pictures to the page as they are made; encoding takes the page's pictures in order and keeps the packets for the
// engine, which reads them in this process instead of through the browser.
import { type ChildProcessByStdio, execFile, spawn } from "node:child_process";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Readable, Writable } from "node:stream";

import type { MediaResolver } from "@uberscene/player/engine";

import { isAssetId } from "../media";
import type { CodecModes } from "./codecs";
import { type NativeEncoded, parseEncoded, rawHeader } from "./wire";

/** What the page sends to open an encoder: the arguments of `uberscene-codec encode`. */
interface EncodeRequest {
  readonly codec: "h264" | "prores";
  readonly width: number;
  readonly height: number;
  readonly fpsNum: number;
  readonly fpsDen: number;
  readonly keyint: number;
  readonly kbps?: number;
  readonly crf?: number;
  readonly preset?: "speed" | "balanced" | "quality";
  readonly proresProfile?: "proxy" | "lt" | "standard" | "hq" | "4444";
}

/** Worker threads per decoding process: an export runs one per clip on screen, on every page at once. */
const DECODE_THREADS = 2;

type Child = ChildProcessByStdio<Writable | null, Readable, Readable>;

interface Session {
  readonly child: ChildProcessByStdio<Writable, Readable, Readable>;
  readonly width: number;
  readonly height: number;
  readonly out: Buffer[];
  readonly err: Buffer[];
  readonly exited: Promise<number | null>;
  /** The next picture to write, and pictures that arrived ahead of it. */
  next: number;
  readonly waiting: Map<number, { body: Buffer; done: (error?: Error) => void }>;
  writing: boolean;
}

export interface NativeRoutes {
  /** Answers `/native/...`; false when `path` is not one of them. */
  handle(req: IncomingMessage, res: ServerResponse, path: string): Promise<boolean>;
  /** The packets of an encode the page finished, once. */
  takeEncoded(session: string): NativeEncoded;
  close(): void;
}

export function nativeRoutes(binary: string, modes: CodecModes, media: MediaResolver): NativeRoutes {
  const running = new Set<Child>();
  const sessions = new Map<string, Session>();
  const finished = new Map<string, NativeEncoded>();
  let counter = 0;

  const fileOf = async (id: string): Promise<string | null> => {
    if (!isAssetId(id)) throw new Error(`"${id}" is not an asset id`);
    const handle = await media.resolve(id);
    return handle.kind === "path" ? handle.path : null;
  };

  const probe = async (res: ServerResponse, id: string): Promise<void> => {
    const file = await fileOf(id);
    if (!file) {
      res.writeHead(409, { "content-type": "text/plain" });
      res.end("the native decoder reads files, and this asset is served from a URL");
      return;
    }
    const json = await new Promise<string>((ok, fail) =>
      execFile(binary, ["probe", file], { maxBuffer: 1 << 20 }, (error, stdout, stderr) =>
        error ? fail(new Error(stderr.trim() || error.message)) : ok(stdout),
      ),
    );
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(json);
  };

  const frames = async (res: ServerResponse, id: string, query: URLSearchParams): Promise<void> => {
    const file = await fileOf(id);
    if (!file) {
      res.writeHead(409, { "content-type": "text/plain" });
      res.end("the native decoder reads files, and this asset is served from a URL");
      return;
    }
    const seconds = (name: string): string | null => {
      const v = query.get(name);
      if (v === null) return null;
      if (!Number.isFinite(Number(v))) throw new Error(`${name} wants seconds, got "${v}"`);
      return String(Number(v));
    };
    const at = seconds("at");
    const from = seconds("from");
    const to = seconds("to");
    const args = ["decode", file, "--threads", String(DECODE_THREADS)];
    if (at !== null) args.push("--at", at);
    else args.push("--from", from ?? "0", ...(to !== null ? ["--to", to] : []));
    const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
    running.add(child);
    const err: Buffer[] = [];
    child.stderr.on("data", (b: Buffer) => err.push(b));
    // The page stops reading when its clip moves on: the decoder stops with it.
    res.on("close", () => child.kill());
    child.on("exit", () => running.delete(child));
    let started = false;
    child.stdout.on("data", (chunk: Buffer) => {
      if (!started) {
        started = true;
        res.writeHead(200, { "content-type": "application/octet-stream", "cache-control": "no-store" });
      }
      if (!res.write(chunk)) {
        child.stdout.pause();
        res.once("drain", () => child.stdout.resume());
      }
    });
    await new Promise<void>((ok) => {
      child.on("close", (code) => {
        if (code !== 0 && code !== null) {
          const message = Buffer.concat(err).toString().trim() || `uberscene-codec exited with ${code}`;
          if (!started) {
            res.writeHead(500, { "content-type": "text/plain" });
            res.end(message);
          } else res.destroy(new Error(message));
        } else {
          if (!started) res.writeHead(200, { "content-type": "application/octet-stream" });
          res.end();
        }
        ok();
      });
    });
  };

  const openEncoder = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const r = JSON.parse((await body(req)).toString()) as EncodeRequest;
    const args = [
      "encode",
      "--codec",
      r.codec,
      "--width",
      String(r.width),
      "--height",
      String(r.height),
      "--fps",
      `${r.fpsNum}/${r.fpsDen}`,
      "--keyint",
      String(r.keyint),
    ];
    if (r.kbps) args.push("--kbps", String(r.kbps));
    else if (r.crf !== undefined) args.push("--crf", String(r.crf));
    if (r.preset) args.push("--preset", r.preset);
    if (r.proresProfile) args.push("--prores-profile", r.proresProfile);
    const child = spawn(binary, args, { stdio: ["pipe", "pipe", "pipe"] });
    running.add(child);
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (b: Buffer) => out.push(b));
    child.stderr.on("data", (b: Buffer) => err.push(b));
    child.stdin.on("error", () => undefined);
    const exited = new Promise<number | null>((ok) =>
      child.on("close", (code) => {
        running.delete(child);
        ok(code);
      }),
    );
    const id = `e${++counter}`;
    sessions.set(id, {
      child,
      width: r.width,
      height: r.height,
      out,
      err,
      exited,
      next: 0,
      waiting: new Map(),
      writing: false,
    });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ session: id }));
  };

  /** Writes the pictures that are next in order, each once stdin has room for it. */
  const pump = (s: Session): void => {
    if (s.writing) return;
    const item = s.waiting.get(s.next);
    if (!item) return;
    s.waiting.delete(s.next);
    s.next++;
    s.writing = true;
    const header = rawHeader(s.width, s.height);
    s.child.stdin.write(header);
    s.child.stdin.write(item.body, (error) => {
      s.writing = false;
      item.done(error ?? undefined);
      pump(s);
    });
  };

  const encodeFrame = async (req: IncomingMessage, res: ServerResponse, s: Session, n: number): Promise<void> => {
    const data = await body(req);
    if (data.length !== s.width * s.height * 4)
      throw new Error(`a picture of ${data.length} bytes was sent to an encoder of ${s.width}x${s.height}`);
    await new Promise<void>((ok, fail) => {
      s.waiting.set(n, { body: data, done: (error) => (error ? fail(error) : ok()) });
      pump(s);
    });
    res.writeHead(204);
    res.end();
  };

  const endEncoder = async (res: ServerResponse, id: string, s: Session): Promise<void> => {
    sessions.delete(id);
    s.child.stdin.end();
    const code = await s.exited;
    if (code !== 0) throw new Error(Buffer.concat(s.err).toString().trim() || `uberscene-codec exited with ${code}`);
    const encoded = parseEncoded(Buffer.concat(s.out));
    finished.set(id, encoded);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ packets: encoded.packets.length }));
  };

  return {
    async handle(req, res, path) {
      if (!path.startsWith("/native/")) return false;
      const url = new URL(req.url ?? "/", "http://localhost");
      const [, , kind, id, action] = path.split("/");
      if (req.method === "GET" && kind === "probe" && id && modes.decode === "native") await probe(res, id);
      else if (req.method === "GET" && kind === "frames" && id && modes.decode === "native")
        await frames(res, id, url.searchParams);
      else if (req.method === "POST" && kind === "encode" && !id && modes.encode === "native")
        await openEncoder(req, res);
      else if (req.method === "POST" && kind === "encode" && id) {
        const s = sessions.get(id);
        if (!s) throw new Error(`no native encode session ${id}`);
        if (action === "end") await endEncoder(res, id, s);
        else await encodeFrame(req, res, s, Number(url.searchParams.get("n") ?? s.next));
      } else {
        res.writeHead(404);
        res.end();
      }
      return true;
    },
    takeEncoded(session) {
      const encoded = finished.get(session);
      if (!encoded) throw new Error(`the native encode session ${session} has no packets`);
      finished.delete(session);
      return encoded;
    },
    close() {
      for (const child of running) child.kill();
      running.clear();
      sessions.clear();
      finished.clear();
    },
  };
}

function body(req: IncomingMessage): Promise<Buffer> {
  return new Promise((ok, fail) => {
    const parts: Buffer[] = [];
    req.on("data", (b: Buffer) => parts.push(b));
    req.on("end", () => ok(Buffer.concat(parts)));
    req.on("error", fail);
  });
}
