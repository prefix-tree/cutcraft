import { createContext, useContext } from "react";

import type { ActionInput, ActionResult, Executor, ResolvedState } from "@uberscene/sdk";

export interface EditorValue {
  /** The state on screen: the executor's after every edit, or the `state` prop. */
  readonly state: ResolvedState;
  readonly executor: Executor | null;
  readonly selection: string | null;
  readonly select: (id: string | null) => void;
  /** Runs one executor call and re-renders with the state it leaves. */
  readonly commit: <R extends ActionResult | null>(run: (e: Executor) => R) => R;
}

export const EditorContext = createContext<EditorValue | null>(null);

export function useEditor(): EditorValue {
  const editor = useContext(EditorContext);
  if (!editor) throw new Error("Editor parts and hooks must be used inside <Editor.Root>");
  return editor;
}

/** The selected element id and the setter. */
export function useSelection(): readonly [string | null, (id: string | null) => void] {
  const { selection, select } = useEditor();
  return [selection, select];
}

export interface EditApi {
  execute(input: ActionInput): ActionResult;
  undo(): ActionResult | null;
  redo(): ActionResult | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

/** Undoable edits through the Root's executor. Throws when the Root has none (a read-only editor). */
export function useEdit(): EditApi {
  const { executor, commit } = useEditor();
  if (!executor) throw new Error("useEdit() needs <Editor.Root executor={...}>; this editor is read-only");
  const history = executor.history();
  return {
    execute: (input) => commit((e) => e.execute(input)),
    undo: () => commit((e) => e.undo()),
    redo: () => commit((e) => e.redo()),
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
  };
}
