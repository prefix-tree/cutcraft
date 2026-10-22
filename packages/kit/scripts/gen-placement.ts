import { writeFileSync } from "node:fs";
import { resolve } from "../src/index";
import { fixtureTree, manifest, serialize } from "../test/helpers";

const state = resolve(fixtureTree(), manifest);
if (state.errors.length) {
  console.error(state.errors);
  process.exit(1);
}
const rows = serialize(state, false).map(({ props, ...rest }) => (void props, rest));
writeFileSync(new URL("../fixtures/sample.placement.json", import.meta.url), JSON.stringify(rows, null, 2) + "\n");
console.log(`wrote ${rows.length} placements`);
