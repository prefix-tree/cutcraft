import { createRequire } from "node:module";
import { join } from "node:path";

import { COMPONENTS, EFFECTS, ELEMENTS, ENGINE_LAYERS, TRANSITIONS } from "../packages/kit/src/index";

const kit = join(import.meta.dirname, "..", "packages", "kit");
const ts = createRequire(join(kit, "package.json"))("typescript") as typeof import("typescript");

export interface PropDocs {
  /** Each prop's JSDoc, by table: `element:Clip`, `effect:glow`, `transition:iris`, `component:LowerThird`. */
  readonly props: ReadonlyMap<string, ReadonlyMap<string, string>>;
  /** Each action's JSDoc and params' names, from the interfaces in `actions/types/index.ts`. */
  readonly actions: ReadonlyMap<string, { readonly note: string; readonly params: string }>;
}

/**
 * The prose of the reference tables is the JSDoc on the code: on a schema's props (which an editor's hover shows
 * too) and on the action interfaces. The TypeScript checker reads it through `z.input`, so a prop documented once
 * in a shared schema (`timedProps`) is documented on every element that spreads it.
 */
export function readPropDocs(): PropDocs {
  const probe = join(kit, "src", "__docs_probe.ts");
  const tables: [key: string, type: string][] = [
    ...Object.keys(ELEMENTS).map((n) => [`element:${n}`, `(typeof ELEMENTS)["${n}"]["schema"]`] as [string, string]),
    ...Object.keys(ENGINE_LAYERS).map(
      (n) => [`element:${n}`, `(typeof ENGINE_LAYERS)["${n}"]["schema"]`] as [string, string],
    ),
    ...Object.keys(EFFECTS).map((n) => [`effect:${n}`, `(typeof EFFECTS)["${n}"]["params"]`] as [string, string]),
    ...Object.keys(TRANSITIONS).map(
      (n) => [`transition:${n}`, `(typeof TRANSITIONS)["${n}"]["params"]`] as [string, string],
    ),
    ...Object.keys(COMPONENTS).map(
      (n) => [`component:${n}`, `(typeof COMPONENTS)["${n}"]["props"]`] as [string, string],
    ),
  ];
  const source = [
    'import type { z } from "zod";',
    'import type { COMPONENTS, EFFECTS, ELEMENTS, ENGINE_LAYERS, TRANSITIONS } from "./index";',
    ...tables.map(([, type], i) => `export type T${i} = z.input<${type}>;`),
  ].join("\n");

  const config = ts.getParsedCommandLineOfConfigFile(
    join(kit, "tsconfig.json"),
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (d) => console.error(d.messageText) },
  );
  if (!config) throw new Error("cannot read packages/kit/tsconfig.json");
  const host = ts.createCompilerHost(config.options);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  host.readFile = (f) => (f === probe ? source : readFile(f));
  host.fileExists = (f) => f === probe || fileExists(f);
  const program = ts.createProgram([probe], config.options, host);
  const checker = program.getTypeChecker();

  const props = new Map<string, Map<string, string>>();
  const aliases = program.getSourceFile(probe)!.statements.filter(ts.isTypeAliasDeclaration);
  aliases.forEach((alias, i) => {
    const docs = new Map<string, string>();
    for (const p of checker.getTypeAtLocation(alias.name).getProperties()) {
      const doc = ts.displayPartsToString(p.getDocumentationComment(checker)).trim();
      if (doc) docs.set(p.name, doc);
    }
    props.set(tables[i]![0], docs);
  });

  const actions = new Map<string, { note: string; params: string }>();
  const types = program.getSourceFile(join(kit, "src", "actions", "types", "index.ts"));
  if (!types) throw new Error("actions/types/index.ts is not in the program");
  for (const statement of types.statements) {
    if (!ts.isInterfaceDeclaration(statement)) continue;
    for (const member of statement.members) {
      if (!ts.isPropertySignature(member) || !member.type || !ts.isStringLiteral(member.name)) continue;
      const symbol = checker.getSymbolAtLocation(member.name);
      const note = symbol ? ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim() : "";
      // The params' names, `?` on the optional ones: the type text is often an alias (`Overlay["create"]`).
      const params = checker
        .getTypeAtLocation(member.type)
        .getProperties()
        .map((p) => `${p.name}${p.flags & ts.SymbolFlags.Optional ? "?" : ""}`);
      actions.set(member.name.text, { note, params: params.length ? `{ ${params.join(", ")} }` : "{}" });
    }
  }
  return { props, actions };
}
