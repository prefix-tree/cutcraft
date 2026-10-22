import { parse, type ParseResult } from "@babel/parser";
import type * as t from "@babel/types";

export interface ParsedSource {
  readonly text: string;
  readonly ast: ParseResult<t.File>;
}

export function parseSource(text: string): ParsedSource {
  const ast = parse(text, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
    errorRecovery: true,
    ranges: false,
  });
  return { text, ast };
}

export type Range = readonly [start: number, end: number];

export function rangeOf(node: { start?: number | null; end?: number | null }): Range {
  return [node.start ?? 0, node.end ?? 0];
}
