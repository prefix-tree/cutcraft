import { createElement, type ReactElement } from "react";

import { Composition } from "../jsx/elements";
import type { AssetManifest } from "../manifest/types";
import { collect } from "./collect";
import { type ResolvedState, resolve } from "./resolve";

export type SceneFn = (props: Record<string, unknown>) => ReactElement | null;

/**
 * Resolve a `<Nested of={Scene}>` interior: the scene is called with the
 * nested element's props (minus `of` and `id`) and what it returns is
 * resolved inside a composition of the outer size. The player renders the
 * result; `nested/extract` writes it into the file.
 */
export function resolveScene(
  of: SceneFn,
  props: Readonly<Record<string, unknown>>,
  outer: { readonly fps: number; readonly width: number; readonly height: number },
  manifest: AssetManifest,
): ResolvedState {
  const { of: _of, id: _id, ...rest } = props;
  const inner = of(rest);
  const element = createElement(
    Composition,
    { fps: outer.fps, width: outer.width, height: outer.height } as never,
    inner,
  );
  return resolve(collect(element as ReactElement), manifest);
}
