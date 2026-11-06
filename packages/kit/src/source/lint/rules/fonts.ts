import * as t from "@babel/types";

import type { SourceIndex } from "../../index";
import { rangeOf } from "../../parse";
import type { Diagnostic } from "../index";
import type { Rule } from "./index";

const DECLARERS = new Set(["font", "googleFont", "effect", "transition"]);
/** Declarations whose arguments hold code (a zod schema): only their name and shader need be literal. */
const SHADERS = new Set(["effect", "transition"]);

/** Calls to the kit's declarations (`font()`, `googleFont()`, `effect()`, `transition()`), under whatever local names the file imports them as. */
function declarations(index: SourceIndex): { call: t.CallExpression; topLevel: boolean; declarer: string }[] {
  const local = new Map<string, string>();
  for (const node of index.ast.program.body) {
    if (!t.isImportDeclaration(node) || node.source.value !== "@cutcraft/kit") continue;
    for (const spec of node.specifiers) {
      if (!t.isImportSpecifier(spec)) continue;
      const imported = t.isIdentifier(spec.imported) ? spec.imported.name : spec.imported.value;
      if (DECLARERS.has(imported)) local.set(spec.local.name, imported);
    }
  }
  if (local.size === 0) return [];
  const top = new Set<t.Node>();
  for (const node of index.ast.program.body) {
    const decl = t.isExportNamedDeclaration(node) ? node.declaration : node;
    if (t.isVariableDeclaration(decl)) for (const d of decl.declarations) if (d.init) top.add(d.init);
  }
  const out: { call: t.CallExpression; topLevel: boolean; declarer: string }[] = [];
  t.traverseFast(index.ast.program, (node) => {
    if (t.isCallExpression(node) && t.isIdentifier(node.callee) && local.has(node.callee.name))
      out.push({ call: node, topLevel: top.has(node), declarer: local.get(node.callee.name) as string });
  });
  return out;
}

/** A value written out in the source: a string, number or boolean, or an array or object of them. */
function literal(node: t.Node): boolean {
  if (t.isStringLiteral(node) || t.isNumericLiteral(node) || t.isBooleanLiteral(node)) return true;
  if (t.isTemplateLiteral(node)) return node.expressions.length === 0;
  if (t.isArrayExpression(node)) return node.elements.every((e) => e !== null && literal(e));
  if (t.isObjectExpression(node))
    return node.properties.every(
      (p) =>
        t.isObjectProperty(p) && !p.computed && (t.isIdentifier(p.key) || t.isStringLiteral(p.key)) && literal(p.value),
    );
  return false;
}

/** The families a file declares with literal arguments: `font({ family: "…" })` and `googleFont("…")`. */
export function declaredFamilies(index: SourceIndex): Set<string> {
  const out = new Set<string>();
  for (const { call, declarer } of declarations(index)) {
    if (SHADERS.has(declarer)) continue;
    const [first] = call.arguments;
    if (t.isStringLiteral(first)) out.add(first.value);
    else if (t.isObjectExpression(first))
      for (const p of first.properties)
        if (t.isObjectProperty(p) && t.isIdentifier(p.key, { name: "family" }) && t.isStringLiteral(p.value))
          out.add(p.value.value);
  }
  return out;
}

/** A `name` and a `shader` or `passes` written out in an `effect()` / `transition()` call's options. */
function literalShader(call: t.CallExpression): boolean {
  const [options] = call.arguments;
  if (!t.isObjectExpression(options)) return false;
  const field = (key: string) =>
    options.properties.find((p): p is t.ObjectProperty => t.isObjectProperty(p) && t.isIdentifier(p.key, { name: key }))
      ?.value;
  const name = field("name");
  const shader = field("shader") ?? field("passes");
  return !!name && !!shader && literal(name) && literal(shader);
}

/**
 * The kit's declarations (`font()`, `googleFont()`, `effect()`, `transition()`) at the top of the file,
 * with what names them written out, where the editor and lint can read them.
 */
export const declaration: Rule = {
  name: "declaration",
  check: (index) =>
    declarations(index).flatMap(({ call, topLevel, declarer }): Diagnostic[] => {
      const name = (call.callee as t.Identifier).name;
      if (!topLevel)
        return [
          {
            rule: "declaration",
            severity: "warning",
            range: rangeOf(call),
            message: `${name}() inside a function or expression is hidden from the editor; declare it at the top of the file: const x = ${name}(…)`,
          },
        ];
      if (SHADERS.has(declarer) ? !literalShader(call) : !call.arguments.every(literal))
        return [
          {
            rule: "declaration",
            severity: "warning",
            range: rangeOf(call),
            message: SHADERS.has(declarer)
              ? `${name}() takes a literal name and shader (or passes), so the editor and lint can read them from the source`
              : `${name}() takes literal arguments, so the editor and lint can read the font from the source`,
          },
        ];
      return [];
    }),
};
