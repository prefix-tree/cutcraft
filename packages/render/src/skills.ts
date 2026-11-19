// `cutcraft skills install`: the agent skill that ships inside this package, written into a project, so an agent is
// taught the commands of the CLI that is installed and not those of another version. The plugin marketplace stays a
// way to get the skill too; this one cannot drift from the CLI.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Where an install records what it wrote, inside the skill's folder. */
const MARKER = ".cutcraft-skill.json";
/** Claude Code reads a project's skills from here; other agents take `--dir`. */
export const DEFAULT_SKILL_DIR = join(".claude", "skills", "cutcraft");

interface Marker {
  readonly version: string;
  /** Each file written, by its path in the folder, with the SHA-256 of what was written. */
  readonly files: Readonly<Record<string, string>>;
}

export interface SkillInstallOptions {
  /** The folder to write the skill into; default `.claude/skills/cutcraft` under `cwd`. */
  readonly dir?: string;
  /** Replace files edited since the last install, or a folder this command did not write. */
  readonly force?: boolean;
  readonly cwd?: string;
  /** Where the skill is read from; default the one shipped with this package. */
  readonly source?: string;
}

export interface SkillInstallResult {
  readonly dir: string;
  readonly version: string;
  /** The version the folder held before, when this command wrote it. */
  readonly previous?: string;
  readonly files: readonly string[];
}

/** The skill shipped with this package: copied into `dist/skill` at build, read from the repository when run from source. */
export function skillSource(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const built = join(here, "skill", "cutcraft");
  if (existsSync(join(built, "SKILL.md"))) return built;
  const repo = resolve(here, "..", "..", "..", "plugins", "cutcraft", "skills", "cutcraft");
  if (existsSync(join(repo, "SKILL.md"))) return repo;
  throw new Error(`the CutCraft skill is not in this package (looked in ${built} and ${repo})`);
}

/** This package's version, which every CutCraft package shares. */
export function packageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const dir of [resolve(here, ".."), resolve(here, "..", "..")]) {
    const file = join(dir, "package.json");
    if (existsSync(file)) {
      const pkg = JSON.parse(readFileSync(file, "utf8")) as { name?: string; version?: string };
      if (pkg.name === "@cutcraft/render" && pkg.version) return pkg.version;
    }
  }
  return "0.0.0";
}

/** Every file under a folder, as paths relative to it, in a stable order. */
function filesIn(dir: string): string[] {
  const out: string[] = [];
  const walk = (at: string) => {
    for (const name of readdirSync(at).sort()) {
      const path = join(at, name);
      if (statSync(path).isDirectory()) walk(path);
      else out.push(relative(dir, path));
    }
  };
  walk(dir);
  return out;
}

const sha256 = (bytes: Buffer | string): string => createHash("sha256").update(bytes).digest("hex");

/**
 * Writes the skill into a project. A folder this command wrote before is replaced when its files are as it left them;
 * one with edited files, or a folder it did not write, is left alone unless `force` is given, and the error names what
 * would be lost.
 */
export function installSkill(options: SkillInstallOptions = {}): SkillInstallResult {
  const cwd = options.cwd ?? process.cwd();
  const dir = resolve(cwd, options.dir ?? DEFAULT_SKILL_DIR);
  const source = options.source ?? skillSource();
  const version = packageVersion();
  const markerPath = join(dir, MARKER);
  let previous: Marker | undefined;

  if (existsSync(dir) && readdirSync(dir).length > 0) {
    if (existsSync(markerPath)) {
      previous = JSON.parse(readFileSync(markerPath, "utf8")) as Marker;
      const edited = Object.entries(previous.files)
        .filter(([file, hash]) => !existsSync(join(dir, file)) || sha256(readFileSync(join(dir, file))) !== hash)
        .map(([file]) => file);
      const added = filesIn(dir).filter((f) => f !== MARKER && !(f in previous!.files));
      if ((edited.length > 0 || added.length > 0) && !options.force)
        throw new Error(
          `${dir} has changes since the skill was installed (${[...edited, ...added].join(", ")}); keep them, or run again with --force to replace the folder`,
        );
    } else if (!options.force) {
      throw new Error(`${dir} already holds files this command did not write; run again with --force to replace it`);
    }
    rmSync(dir, { recursive: true, force: true });
  }

  const files = filesIn(source);
  const written: Record<string, string> = {};
  for (const file of files) {
    const bytes = readFileSync(join(source, file));
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), bytes);
    written[file] = sha256(bytes);
  }
  writeFileSync(markerPath, `${JSON.stringify({ version, files: written } satisfies Marker, null, 2)}\n`);
  return { dir, version, ...(previous ? { previous: previous.version } : {}), files };
}
