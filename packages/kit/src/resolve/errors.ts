export type ResolveErrorCode =
  | "DANGLING_ANCHOR"
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
