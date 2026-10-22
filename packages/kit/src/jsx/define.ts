import type { ReactElement, ReactNode } from "react";
import type { z } from "zod";

export type PlacementScope = "composition" | "track" | "child" | "none";

export interface ElementCapabilities {
  /** Occupies a time range on the timeline. */
  readonly timed: boolean;
  /** Draws pixels. */
  readonly visual: boolean;
  /** Produces sound. */
  readonly audio: boolean;
  /** Has a source range (`in`/`out`) that can be trimmed, slipped, split. */
  readonly trimSource: boolean;
  /** Accepts a `transform` prop. */
  readonly transformable: boolean;
  /** May hold vocabulary children. */
  readonly container: boolean;
  /** Kinds allowed as direct children. */
  readonly childKinds: readonly string[];
  /** Where the element may appear. */
  readonly placementScope: PlacementScope;
}

export type VocabularyProps<S extends z.ZodType> = z.input<S> & { readonly children?: ReactNode };

export type VocabularyComponent<K extends string, S extends z.ZodType> = ((
  props: VocabularyProps<S>,
) => ReactElement | null) & {
  readonly kind: K;
  readonly schema: S;
  readonly isVocabulary: true;
  readonly capabilities: ElementCapabilities;
  readonly displayName: string;
};

export interface ElementDefinition<K extends string, S extends z.ZodType> {
  readonly kind: K;
  readonly schema: S;
  readonly capabilities: ElementCapabilities;
  /** Optional renderer. The kit ships none; a Player supplies them through context. */
  readonly render?: (props: z.output<S> & { readonly children?: ReactNode }) => ReactElement | null;
}

/**
 * A vocabulary element is an ordinary React component that also carries its
 * kind, its Zod prop schema and its editing capabilities, so the resolver and
 * the editor can read the element tree without rendering it.
 */
export function defineElement<K extends string, S extends z.ZodType>(
  def: ElementDefinition<K, S>,
): VocabularyComponent<K, S> {
  const component = ((props: VocabularyProps<S>) => {
    if (!def.render) return null;
    const { children, ...rest } = props;
    const parsed = def.schema.parse(rest) as z.output<S> & object;
    return def.render({ ...parsed, children } as z.output<S> & { readonly children?: ReactNode });
  }) as VocabularyComponent<K, S>;
  Object.defineProperties(component, {
    kind: { value: def.kind, enumerable: true },
    schema: { value: def.schema, enumerable: true },
    isVocabulary: { value: true, enumerable: true },
    capabilities: { value: def.capabilities, enumerable: true },
    displayName: { value: def.kind, enumerable: true },
  });
  return component;
}

export function isVocabulary(type: unknown): type is VocabularyComponent<string, z.ZodType> {
  return typeof type === "function" && (type as { isVocabulary?: unknown }).isVocabulary === true;
}

export function kindOf(type: unknown): string | null {
  return isVocabulary(type) ? type.kind : null;
}
