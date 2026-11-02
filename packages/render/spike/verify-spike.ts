import { join } from "node:path";
import { SCENARIOS } from "../bench/scenarios/scenarios";
import { verify } from "../bench/scenarios/verify";
for (const s of SCENARIOS) console.log(s.name, JSON.stringify(verify(join(import.meta.dirname, `out-${s.name}.mp4`), s)));
