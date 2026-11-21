import { createRequire } from "node:module";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const ts = createRequire(join(root, "packages", "sdk", "package.json"))("typescript") as typeof import("typescript");

export interface ApiExport {
  readonly name: string;
  /** `function`, `class`, `const`, `type`, `interface`, `enum` or `namespace`. */
  readonly kind: string;
  /** The first sentence of its JSDoc, or empty. */
  readonly doc: string;
}

export interface ApiEntry {
  /** The import specifier (`@uberscene/kit/schema`). */
  readonly specifier: string;
  readonly exports: readonly ApiExport[];
}

/** Every public entry a package's `exports` names, except CSS and the JSX runtime. */
const ENTRIES: readonly { readonly pkg: string; readonly name: string }[] = [
  { pkg: "kit", name: "." },
  { pkg: "kit", name: "./schema" },
  { pkg: "sdk", name: "." },
  { pkg: "sdk", name: "./resolver" },
  { pkg: "player", name: "." },
  { pkg: "player", name: "./engine" },
  { pkg: "editor", name: "." },
  { pkg: "render", name: "." },
  { pkg: "graphics", name: "." },
  { pkg: "graphics", name: "./libraries" },
  { pkg: "graphics", name: "./three" },
  { pkg: "graphics", name: "./motion" },
];

function kindOf(symbol: import("typescript").Symbol): string {
  const f = symbol.flags;
  if (f & ts.SymbolFlags.Class) return "class";
  if (f & ts.SymbolFlags.Function) return "function";
  if (f & ts.SymbolFlags.Enum) return "enum";
  if (f & ts.SymbolFlags.Variable) return "const";
  if (f & ts.SymbolFlags.Interface) return "interface";
  if (f & ts.SymbolFlags.TypeAlias) return "type";
  if (f & ts.SymbolFlags.Module) return "namespace";
  return "other";
}

/** The first sentence of a JSDoc comment, on one line. A `.` or `:` inside a code span does not end it. */
function firstSentence(text: string): string {
  const flat = text.replace(/\s*\n\s*/g, " ").trim();
  let code = false;
  for (let i = 0; i < flat.length; i++) {
    const c = flat[i];
    if (c === "`") code = !code;
    else if (!code && (c === "." || c === ":") && (i + 1 === flat.length || /\s/.test(flat[i + 1] as string)))
      return flat.slice(0, i + 1).replace(/:$/, ".");
  }
  return flat;
}

/** The names each public entry exports, read by the TypeScript checker over each package's own tsconfig. */
export function readApiExports(): ApiEntry[] {
  const out: ApiEntry[] = [];
  for (const pkg of [...new Set(ENTRIES.map((e) => e.pkg))]) {
    const dir = join(root, "packages", pkg);
    const manifest = createRequire(join(dir, "package.json"))("./package.json") as {
      name: string;
      exports: Record<string, string>;
    };
    const entries = ENTRIES.filter((e) => e.pkg === pkg).map((e) => ({
      specifier: e.name === "." ? manifest.name : `${manifest.name}/${e.name.slice(2)}`,
      file: join(dir, manifest.exports[e.name] as string),
    }));
    const config = ts.getParsedCommandLineOfConfigFile(
      join(dir, "tsconfig.json"),
      {},
      { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (d) => console.error(d.messageText) },
    );
    if (!config) throw new Error(`cannot read packages/${pkg}/tsconfig.json`);
    const program = ts.createProgram(
      entries.map((e) => e.file),
      config.options,
    );
    const checker = program.getTypeChecker();
    for (const entry of entries) {
      const source = program.getSourceFile(entry.file);
      const moduleSymbol = source && checker.getSymbolAtLocation(source);
      if (!moduleSymbol) throw new Error(`${entry.specifier}: ${entry.file} is not a module`);
      const exports = checker
        .getExportsOfModule(moduleSymbol)
        .map((symbol) => {
          const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
          const doc = ts.displayPartsToString(target.getDocumentationComment(checker));
          return { name: symbol.name, kind: kindOf(target), doc: firstSentence(doc) };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "en"));
      out.push({ specifier: entry.specifier, exports });
    }
  }
  return out;
}
