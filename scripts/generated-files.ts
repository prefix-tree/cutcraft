import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface GeneratedFilesOptions {
  readonly check: boolean;
  readonly directories: readonly string[];
  readonly obsolete: readonly string[];
}

/** Compare the complete generated file set without changing it, or replace its owned directories. */
export function syncGeneratedFiles(
  root: string,
  expected: ReadonlyMap<string, string>,
  options: GeneratedFilesOptions,
): string[] {
  if (!options.check) {
    for (const path of [...options.directories, ...options.obsolete])
      rmSync(join(root, path), { recursive: true, force: true });
    for (const [path, content] of expected) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    return [];
  }

  const problems: string[] = [];
  for (const [path, content] of expected) {
    if (!existsSync(join(root, path))) problems.push(`missing: ${path}`);
    else if (readFileSync(join(root, path), "utf8") !== content) problems.push(`changed: ${path}`);
  }
  const visit = (directory: string) => {
    if (!existsSync(join(root, directory))) return;
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) visit(path);
      else if (!expected.has(path)) problems.push(`unexpected: ${path}`);
    }
  };
  for (const directory of options.directories) visit(directory);
  for (const path of options.obsolete) if (existsSync(join(root, path))) problems.push(`obsolete: ${path}`);
  return problems.sort();
}
