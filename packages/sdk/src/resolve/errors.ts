export type ResolveErrorCode =
  | "DANGLING_ANCHOR"
  /** `at` names a moment the anchor does not play: trimmed out, or the anchor is not footage. */
  | "INVALID_ANCHOR"
  /** `at` on an anchor the first version cannot map: reversed, or with speed keys or freezes. */
  | "UNSUPPORTED_ANCHOR"
  | "CYCLE"
  | "TRIM_PAST_SOURCE"
  | "UNKNOWN_REF"
  | "NOT_ADJACENT"
  | "INSUFFICIENT_HANDLES"
  | "NO_VISUAL_PARENT"
  | "DUPLICATE_ID"
  | "MISSING_ASSET"
  | "START_ON_SEQUENCE"
  | "MISSING_START"
  | "AMBIGUOUS_DURATION"
  | "INVALID_CHILD"
  | "INVALID_TIME_RANGE"
  | "UNKNOWN_TOKEN"
  | "UNKNOWN_STYLE"
  | "SCHEMA";

export interface ResolveError {
  readonly code: ResolveErrorCode;
  readonly id: string;
  readonly prop?: string;
  readonly message: string;
}

export function isResolveError(value: unknown): value is ResolveError {
  return typeof value === "object" && value !== null && "code" in value && "message" in value && "id" in value;
}
