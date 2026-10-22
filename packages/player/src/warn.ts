const seen = new Set<string>();
let sink: ((message: string) => void) | null = null;

/** Warn once per key. Tests capture warnings with `captureWarnings`. */
export function devWarn(key: string, message: string): void {
  if (seen.has(key)) return;
  seen.add(key);
  if (sink) sink(message);
  else console.warn(`[cutcut/player] ${message}`);
}

export function captureWarnings(fn: ((message: string) => void) | null): void {
  sink = fn;
  seen.clear();
}
