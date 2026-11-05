import type { ReactElement, ReactNode } from "react";

import * as kit from "@cutcraft/kit";

/** Each kit element by the name the kit exports it as. */
const NAMES = new Map<unknown, string>(Object.entries(kit).map(([name, value]) => [value, name]));

/**
 * A composition built in memory with `createElement`, written back as a cut file's source, so the export page can load
 * it. Only kit elements with plain props (no functions), which is all the tests build.
 */
export function toSource(root: ReactElement): string {
  const used = new Set<string>();
  const write = (node: ReactNode): string => {
    if (node === null || node === undefined || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return `{${JSON.stringify(node)}}`;
    if (Array.isArray(node)) return node.map(write).join("");
    const el = node as ReactElement<Record<string, unknown>>;
    const name = NAMES.get(el.type);
    if (!name) throw new Error("toSource writes kit elements only");
    used.add(name);
    const { children, ...props } = el.props;
    const attrs = Object.entries(props)
      .map(([k, v]) => {
        if (typeof v === "function") throw new Error(`toSource cannot write the function prop ${k}`);
        return ` ${k}={${JSON.stringify(v)}}`;
      })
      .join("");
    const inner = write(children as ReactNode);
    return inner ? `<${name}${attrs}>${inner}</${name}>` : `<${name}${attrs} />`;
  };
  const body = write(root);
  return `import { ${[...used].sort().join(", ")} } from "@cutcraft/kit";\n\nexport default function Video() {\n  return ${body};\n}\n`;
}
