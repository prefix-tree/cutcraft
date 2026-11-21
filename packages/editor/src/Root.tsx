import { type ReactNode, useCallback, useMemo, useState } from "react";

import { PlayerProvider, type PlayerProviderProps } from "@uberscene/player";
import type { Executor, ResolvedState } from "@uberscene/sdk";

import { EditorContext, type EditorValue } from "./context";

export type RootProps = Omit<PlayerProviderProps, "state" | "children"> & {
  readonly children?: ReactNode;
} & (
    | { readonly executor: Executor; readonly state?: undefined }
    | { readonly state: ResolvedState; readonly executor?: undefined }
  );

/**
 * One player and one selection for every part inside. With an `executor` the parts can edit
 * (`useEdit()`); with only a `state` they show it.
 */
export function Root(props: RootProps) {
  const { executor, state, children, ...player } = props;
  // Bumped after each executor call so `executor.state()` is read again.
  const [version, setVersion] = useState(0);
  const [selection, select] = useState<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: version is the signal that the executor's state moved.
  const current = useMemo(() => (executor ? executor.state() : state), [executor, state, version]) as ResolvedState;
  const commit = useCallback<EditorValue["commit"]>(
    (run) => {
      if (!executor) throw new Error("This editor is read-only: pass an executor to <Editor.Root>");
      const result = run(executor);
      setVersion((v) => v + 1);
      return result;
    },
    [executor],
  );
  const value = useMemo<EditorValue>(
    () => ({ state: current, executor: executor ?? null, selection, select, commit }),
    [current, executor, selection, commit],
  );
  return (
    <PlayerProvider state={current} {...player}>
      <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
    </PlayerProvider>
  );
}
