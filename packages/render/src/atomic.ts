import { rename, rm, writeFile } from "node:fs/promises";

/** Where an export is written while it is made: beside the final file, renamed over it only once it is whole. */
export function partialPath(out: string): string {
  return `${out}.partial`;
}

/**
 * Writes the bytes beside `out`, then renames them over it, so a write that fails leaves the file that was there
 * before, not half of the new one.
 */
export async function writeAtomically(out: string, bytes: Uint8Array): Promise<void> {
  const partial = partialPath(out);
  try {
    await writeFile(partial, bytes);
    await rename(partial, out);
  } catch (error) {
    await rm(partial, { force: true }).catch(() => undefined);
    throw error;
  }
}
