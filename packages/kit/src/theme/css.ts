/**
 * A theme value for CSS inside a Layer: `$accent` becomes `var(--cc-accent)`, which the Layer sets from the file's
 * theme; anything else is returned as written. Colours and fonts alike, so a component that takes `"$accent"` or
 * `"$heading"` as a default takes the look of the video it is placed in.
 */
export function themeCss(value: string): string {
  return /^\$[A-Za-z][\w-]*$/.test(value) ? `var(--cc-${value.slice(1)})` : value;
}
