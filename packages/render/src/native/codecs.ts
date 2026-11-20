// Which codecs an export uses: the browser's (WebCodecs, the default) or the native codec process
// (`native/`, craft-video), chosen with UBERSCENE_CODECS. The browser stays the reference; native is experimental.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

type CodecSide = "browser" | "native";

export interface CodecModes {
  /** Who decodes the footage the page draws. */
  readonly decode: CodecSide;
  /** Who encodes the pictures of a video export. */
  readonly encode: CodecSide;
}

export const BROWSER_CODECS: CodecModes = { decode: "browser", encode: "browser" };

const MODES: Readonly<Record<string, CodecModes>> = {
  browser: BROWSER_CODECS,
  native: { decode: "native", encode: "native" },
  "native-decode": { decode: "native", encode: "browser" },
  "native-encode": { decode: "browser", encode: "native" },
};

/** The codecs `UBERSCENE_CODECS` asks for; unset or empty is the browser's. */
export function codecModes(env: NodeJS.ProcessEnv = process.env): CodecModes {
  const value = env.UBERSCENE_CODECS?.trim().toLowerCase();
  if (!value) return BROWSER_CODECS;
  const modes = MODES[value];
  if (!modes)
    throw new Error(`UBERSCENE_CODECS wants one of ${Object.keys(MODES).join(", ")}; got "${env.UBERSCENE_CODECS}"`);
  return modes;
}

export function usesNative(modes: CodecModes): boolean {
  return modes.decode === "native" || modes.encode === "native";
}

/** Where `pnpm native:build` writes the binary, in the workspace. */
const BUILT = fileURLToPath(new URL("../../../../native/target/release/uberscene-codec", import.meta.url));

/** The native codec binary: `UBERSCENE_CODEC_BIN`, else the one built in the workspace. */
export function codecBinary(env: NodeJS.ProcessEnv = process.env): string {
  const named = env.UBERSCENE_CODEC_BIN;
  if (named) {
    if (!existsSync(named)) throw new Error(`UBERSCENE_CODEC_BIN names ${named}, which does not exist`);
    return named;
  }
  const built = process.platform === "win32" ? `${BUILT}.exe` : BUILT;
  if (existsSync(built)) return built;
  throw new Error(
    "UBERSCENE_CODECS asks for the native codecs, which are not built: run `pnpm native:build` in the UberScene workspace, or set UBERSCENE_CODEC_BIN to an uberscene-codec binary",
  );
}
