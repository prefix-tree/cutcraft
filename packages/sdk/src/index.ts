// Build tools on UberScene files: resolve a file to the exact placement of every element, edit it with undoable
// actions an editor or an agent runs, write those edits back into the file's text, lint it, and read it as rows and
// moments. A video file is written with `@uberscene/kit`; this package reads and changes it.
import "./actions/handlers";

export { type Affordances, actionTarget, affordances, type PropAccess } from "./actions/affordances";
export { type ActionResult, type CanResult, Executor, type ExecutorOptions } from "./actions/executor";
export { ActionHistory, type HistoryEntry, type HistorySnapshot } from "./actions/history";
export { type ActionHandler, listHandlers } from "./actions/registry";
export * from "./actions/types";
export * from "./inspect/index";
export * from "./manifest/cube";
export * from "./manifest/timeref";
export * from "./manifest/transcript";
export * from "./manifest/types";
export * from "./patches/log";
export * from "./patches/types";
export * from "./resolve/captions";
export * from "./resolve/collect";
export * from "./resolve/dependents";
export * from "./resolve/errors";
export * from "./resolve/resolve";
export * from "./resolve/scene";
export * from "./resolve/speed";
export * from "./resolve/subtitles";
export * from "./resolve/tree";
export { bake } from "./source/bake";
export { applyEdits, lineRange, type SourceEdit } from "./source/edits";
export { type FoldResult, fold, foldToSource } from "./source/fold";
export {
  buildSourceIndex,
  type ElementSite,
  type HelperCallSite,
  type HelperSite,
  indentOf,
  literalOf,
  type PropSite,
  type SourceIndex,
} from "./source/index";
export { insertLayer, type LayerPlacement } from "./source/insert-layer";
export { DEPRECATIONS, type Deprecation } from "./source/lint/deprecations";
export {
  attributeOf,
  jsxTags,
  type MoveOptions,
  movePropInto,
  movePropsInto,
  propAt,
  renameProp,
  renameValue,
  tagName,
} from "./source/lint/fixes";
export {
  type Diagnostic,
  type FixResult,
  fixSource,
  type LintOptions,
  type LintRule,
  lint,
  rules,
} from "./source/lint/index";
export { ALLOWED_IMPORTS, type CutModule, type LoadOptions, loadModule } from "./source/load";
export { type GatherOptions, gatherLocalFiles } from "./source/local-files";
export { parseSource, type Range, rangeOf } from "./source/parse";
export { elementName, printElement, printLiteral, printProp } from "./source/print";
