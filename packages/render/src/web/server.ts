// Serves the export page, its job and the media to the page, on a local port only the export's browser uses.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import type { MediaResolver } from "@cutcraft/player/engine";

import type { FontFile } from "../fonts";
import type { PageJob } from "./page/protocol";

const TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
};

export interface PageServer {
  readonly url: string;
  /** Why media the page asked for could not be served: the resolver's own messages, which the page sees only as a 500. */
  readonly mediaErrors: readonly string[];
  close(): Promise<void>;
}

/**
 * A published build serves the page built into dist; from source (tests, the workspace) Vite serves it, unless
 * CUTCRAFT_EXPORT_PAGE names a built page to serve instead.
 */
const builtPage = process.env.CUTCRAFT_EXPORT_PAGE;
const fromSource = !builtPage && import.meta.url.endsWith(".ts");

export async function servePage(
  job: Omit<PageJob, "fonts">,
  media: MediaResolver,
  fonts: readonly FontFile[] = [],
): Promise<PageServer> {
  const page: PageJob = {
    ...job,
    fonts: fonts.map((f, i) => ({
      family: f.name,
      weight: f.weight ?? 400,
      style: f.style ?? "normal",
      url: `/fonts/${i}`,
    })),
  };
  const mediaErrors: string[] = [];
  const vite = fromSource ? await sourcePage() : null;
  const built = fromSource
    ? null
    : normalize(`${builtPage ?? fileURLToPath(new URL("./web/page/", import.meta.url))}/`);
  const server = createServer((req, res) => {
    void handle(req, res).catch((error: unknown) => {
      if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain" });
      res.end(error instanceof Error ? error.message : String(error));
    });
  });
  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    if (path === "/job.json") {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(page));
      return;
    }
    const font = /^\/fonts\/(\d+)$/.exec(path);
    if (font) {
      const data = fonts[Number(font[1])]?.data;
      if (!data) {
        res.writeHead(404);
        res.end();
        return;
      }
      const bytes = Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data);
      res.writeHead(200, { "content-type": "application/octet-stream", "content-length": bytes.length });
      res.end(bytes);
      return;
    }
    if (path.startsWith("/media/")) {
      await sendMedia(req, res, media, path.slice("/media/".length)).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        if (!mediaErrors.includes(message)) mediaErrors.push(message);
        throw error;
      });
      return;
    }
    if (vite) {
      vite.middlewares(req, res, () => {
        res.writeHead(404);
        res.end();
      });
      return;
    }
    const file = normalize(join(built as string, path === "/" ? "index.html" : path));
    if (!file.startsWith(built as string) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404);
      res.end();
      return;
    }
    sendFile(req, res, file);
  };
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/`,
    mediaErrors,
    close: async () => {
      await vite?.close();
      await closeServer(server);
    },
  };
}

interface Middlewares {
  middlewares(req: IncomingMessage, res: ServerResponse, next: () => void): void;
  close(): Promise<void>;
}

async function sourcePage(): Promise<Middlewares> {
  // Vite is a dev dependency: only the workspace serves the page from source.
  const { createServer: createVite } = await import("vite");
  const { default: react } = await import("@vitejs/plugin-react");
  const root = fileURLToPath(new URL("./page/", import.meta.url));
  const repo = fileURLToPath(new URL("../../../../", import.meta.url));
  return createVite({
    root,
    configFile: false,
    logLevel: "error",
    appType: "spa",
    plugins: [react()],
    resolve: { dedupe: ["react", "react-dom"] },
    define: { "process.env": "{}" },
    server: { middlewareMode: true, hmr: false, ws: false, fs: { allow: [repo] } },
    optimizeDeps: { include: ["react", "react-dom/client", "mediabunny", "zod", "three", "motion"] },
  });
}

async function sendMedia(req: IncomingMessage, res: ServerResponse, media: MediaResolver, id: string): Promise<void> {
  const handle = await media.resolve(id);
  if (handle.kind === "url") {
    res.writeHead(302, { location: handle.url });
    res.end();
  } else if (handle.kind === "blob") {
    const bytes = Buffer.from(await handle.blob.arrayBuffer());
    res.writeHead(200, {
      "content-type": handle.blob.type || "application/octet-stream",
      "content-length": bytes.length,
    });
    res.end(bytes);
  } else {
    sendFile(req, res, handle.path);
  }
}

/** A file, with byte ranges: the page's decoders read media in pieces. */
function sendFile(req: IncomingMessage, res: ServerResponse, file: string): void {
  const size = statSync(file).size;
  const type = TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
    if (start > end || start >= size) {
      res.writeHead(416, { "content-range": `bytes */${size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      "content-type": type,
      "accept-ranges": "bytes",
      "content-range": `bytes ${start}-${end}/${size}`,
      "content-length": end - start + 1,
    });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { "content-type": type, "accept-ranges": "bytes", "content-length": size });
  createReadStream(file).pipe(res);
}

function closeServer(server: Server): Promise<void> {
  return new Promise((ok) => {
    server.closeAllConnections();
    server.close(() => ok());
  });
}
