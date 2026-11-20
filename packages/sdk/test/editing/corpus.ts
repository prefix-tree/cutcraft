// The files the editing tests run on: every example and recipe in the repository, each with the manifest beside it.
// They are real videos, written by hand and by agents, so they hold the shapes an editor meets: anchored titles,
// free code in layers, helpers, schema props, narration, generated captions.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  type AssetManifest,
  buildSourceIndex,
  type CollectedTree,
  collectModule,
  Executor,
  gatherLocalFiles,
  loadModule,
  type ResolvedState,
  resolve,
} from "@uberscene/sdk";

const root = join(import.meta.dirname, "..", "..", "..", "..");

export interface CorpusFile {
  /** Where it is, from the repository root: `recipes/talking-head.tsx`. */
  readonly name: string;
  readonly text: string;
  readonly manifest: AssetManifest;
  /** The file's own modules (a short's blocks), as the CLI reads them, keyed by path from its folder. */
  readonly files: Readonly<Record<string, string>>;
}

/** The video files of a folder (and of the subfolders named), with the folder's manifest. */
function folder(dir: string, subfolders: readonly string[] = []): CorpusFile[] {
  const manifest = JSON.parse(readFileSync(join(root, dir, "uberscene.json"), "utf8")) as AssetManifest;
  return ["", ...subfolders].flatMap((sub) =>
    readdirSync(join(root, dir, sub))
      .filter((f) => f.endsWith(".tsx"))
      .sort()
      .map((f) => {
        const name = join(dir, sub, f);
        const text = readFileSync(join(root, name), "utf8");
        const folder = join(root, dirname(name));
        const files = gatherLocalFiles(text, (path) =>
          existsSync(join(folder, path)) ? readFileSync(join(folder, path), "utf8") : undefined,
        );
        return { name, text, manifest, files };
      }),
  );
}

export const CORPUS: readonly CorpusFile[] = [
  ...folder("recipes"),
  ...folder("examples/showcase"),
  ...folder("examples/shorts", ["cards"]),
  ...folder("examples/launch-recap").filter((f) => f.name.endsWith("video.tsx")),
];

/** The file evaluated and collected as the editor does, with a source index so edits can be written back. */
export function treeOf(text: string, files: Readonly<Record<string, string>> = {}): CollectedTree {
  return collectModule(loadModule(text, { files }) as never, {}, { index: buildSourceIndex(text) });
}

export function resolveText(
  text: string,
  manifest: AssetManifest,
  files: Readonly<Record<string, string>> = {},
): ResolvedState {
  return resolve(treeOf(text, files), manifest);
}

export function executorFor(file: CorpusFile): Executor {
  let n = 0;
  return new Executor({
    tree: treeOf(file.text, file.files),
    manifest: file.manifest,
    now: () => 0,
    newActionId: () => `e${++n}`,
  });
}
