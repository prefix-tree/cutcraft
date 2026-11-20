import { Editor } from "@uberscene/editor";
import { collectModule, Executor } from "@uberscene/sdk";
import "@uberscene/player/fonts.css";

import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

import * as file from "../video";
import { Inspector } from "@/components/editor/inspector";
import { Layers } from "@/components/editor/layers";
import { Timeline } from "@/components/editor/timeline";
import { Transport } from "@/components/editor/transport";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import "./index.css";

const media = {};

function App() {
  const [executor] = useState(() => new Executor({ tree: collectModule(file), manifest: { assets: {} } }));
  return (
    <Editor.Root executor={executor} media={media} loop>
      <div className="flex h-svh flex-col bg-background text-foreground">
        <header className="flex h-12 items-center border-b px-4 text-sm font-medium">UberScene editor</header>
        <ResizablePanelGroup orientation="vertical" className="flex-1">
          <ResizablePanel defaultSize="70">
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel defaultSize="18" minSize="12">
                <Layers />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize="57">
                <div className="flex h-full flex-col justify-center gap-3 p-4">
                  <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg border">
                    <Editor.Preview element={file.default()} />
                  </div>
                  <div className="mx-auto w-full max-w-4xl">
                    <Transport />
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize="25" minSize="18">
                <Inspector />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="30" minSize="15">
            <Timeline />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </Editor.Root>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
