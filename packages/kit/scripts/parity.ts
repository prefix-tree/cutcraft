import { writeFileSync } from "node:fs";
import { listHandlers } from "../src/index";

import { OURS_ONLY, PARITY } from "./parity-table";

export { OURS_ONLY, PARITY };

export function parityMarkdown(): string {
  const ours = new Set(listHandlers());
  const lines = [
    "# Action parity with OpenReel",
    "",
    `OpenReel executable action types: ${PARITY.length}. Ours: ${ours.size}.`,
    "",
    "| OpenReel | Ours |",
    "|---|---|",
    ...PARITY.map(([a, b]) => `| \`${a}\` | ${b.startsWith("out:") || b.startsWith("—") ? b : b.split(/,| \/ | \+ /).map((s) => `\`${s.trim()}\``).join(", ")} |`),
    "",
    "## Ours with no OpenReel equivalent",
    "",
    "| Ours | Why |",
    "|---|---|",
    ...OURS_ONLY.map(([a, b]) => `| \`${a}\` | ${b} |`),
    "",
  ];
  return lines.join("\n");
}

export function parityGaps(): { unmappedOurs: string[]; unknownOurs: string[] } {
  const ours = new Set(listHandlers());
  const referenced = new Set<string>();
  for (const [, b] of PARITY) for (const m of b.matchAll(/[a-zA-Z]+\/[a-zA-Z]+/g)) referenced.add(m[0]);
  for (const [a] of OURS_ONLY) referenced.add(a);
  return {
    unmappedOurs: [...ours].filter((t) => !referenced.has(t)),
    unknownOurs: [...referenced].filter((t) => !ours.has(t as never) && !PARITY.some(([o]) => o === t)),
  };
}

if (process.argv[1] && process.argv[1].endsWith("parity.ts")) {
  await import("../src/actions/handlers");
  writeFileSync(new URL("../docs/parity.md", import.meta.url), parityMarkdown());
  console.log(parityGaps());
}
