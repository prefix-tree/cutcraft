// A worker thread does not inherit the parent's TypeScript loader, so register tsx here, then load the worker proper.
import { register } from "tsx/esm/api";

register();
await import("./worker.ts");
