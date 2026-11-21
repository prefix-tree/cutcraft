import { type ActionInput, buildSourceIndex, collectModule, Executor, foldToSource } from "@uberscene/sdk";
import "@uberscene/player/fonts.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import * as file from "../video";
import source from "../video.tsx?raw";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VideoEditor } from "@/registry/editor/editor";
import "./index.css";

declare global {
  interface Window {
    /** The demo's executor, its file and the actions it ran, for the end-to-end tests to read. */
    __editor?: {
      executor: Executor;
      source: () => string;
      actions: ActionInput[];
      replay: (actions: readonly ActionInput[]) => string;
    };
  }
}

/** An executor over the file, with its text indexed so props written as code are known and locked. */
const open = () =>
  new Executor({ tree: collectModule(file, {}, { index: buildSourceIndex(source) }), manifest: { assets: {} } });
// One executor for the page, made outside React so StrictMode's double render cannot make a second one.
const executor = open();
// Every action that went through, in order, so a test can run the same ones through the sdk and compare the files.
const actions: ActionInput[] = [];
const execute = executor.execute.bind(executor);
executor.execute = ((input: ActionInput) => {
  const result = execute(input);
  if (result.ok) actions.push(input);
  return result;
}) as typeof executor.execute;
window.__editor = {
  executor,
  source: () => foldToSource(source, executor.log(), executor.state()).text,
  actions,
  // The same actions through a fresh executor and straight to the sdk: what a tool without this editor would save.
  replay: (list) => {
    const fresh = open();
    for (const action of list) if (!fresh.execute(action).ok) throw new Error(`refused: ${action.type}`);
    return foldToSource(source, fresh.log(), fresh.state()).text;
  },
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider>
      <VideoEditor executor={executor} source={source} element={file.default()} title="UberScene editor" />
    </TooltipProvider>
  </StrictMode>,
);
