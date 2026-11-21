import { type ReactElement, type ReactNode, useEffect } from "react";

import { Editor as Parts, useEdit, useEditor, useSelection } from "@uberscene/editor";
import { usePlayer } from "@uberscene/player";
import type { Executor } from "@uberscene/sdk";

import { Inspector } from "./inspector";
import { Layers } from "./layers";
import { Source } from "./source";
import { Timeline } from "./timeline";
import { Transport } from "./transport";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface VideoEditorProps {
  /** The edits run through it; `collectModule(file)` and the manifest make one. */
  readonly executor: Executor;
  /** The file's text as it was opened. The Source tab shows it with every edit written in. */
  readonly source: string;
  /** What the preview plays: the file's default export, called. */
  readonly element: ReactElement;
  /** Media files by asset id. */
  readonly media?: Readonly<Record<string, Blob | string>>;
  /** The file's name, for the Source tab and its download. */
  readonly name?: string;
  /** Shown at the left of the top bar. */
  readonly title?: ReactNode;
  readonly className?: string;
}

/**
 * A whole editor: layers on the left, the picture and its transport in the middle, the inspector on the right, and
 * the timeline and the file underneath. Every part is a file of its own in components/editor, to rearrange or replace.
 */
export function VideoEditor({
  executor,
  source,
  element,
  media = {},
  name = "video.tsx",
  title,
  className,
}: VideoEditorProps) {
  return (
    <Parts.Root executor={executor} media={media} loop>
      <Shortcuts />
      <div className={cn("flex h-svh flex-col bg-background text-foreground", className)} data-editor="">
        <header className="flex h-11 shrink-0 items-center gap-3 border-b px-4 text-sm">
          <span className="font-medium">{title ?? "UberScene"}</span>
          <span className="font-mono text-xs text-muted-foreground">{name}</span>
        </header>
        <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
          <ResizablePanel defaultSize="62" minSize="30">
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel defaultSize="17" minSize="12">
                <Layers />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize="58" minSize="30">
                <div className="flex h-full flex-col justify-center gap-3 p-4">
                  <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg border bg-black">
                    <Parts.Preview element={element} />
                  </div>
                  <Transport className="mx-auto w-full max-w-4xl" />
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize="25" minSize="18">
                <Inspector />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="38" minSize="15">
            <Tabs defaultValue="timeline" className="flex h-full min-h-0 flex-col gap-0">
              <TabsList className="m-1.5 shrink-0">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="source">Source</TabsTrigger>
              </TabsList>
              <TabsContent value="timeline" className="min-h-0 flex-1 border-t">
                <Timeline />
              </TabsContent>
              <TabsContent value="source" className="min-h-0 flex-1 border-t">
                <Source source={source} name={name} />
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </Parts.Root>
  );
}

/**
 * Space plays and pauses; Cmd/Ctrl+Z undoes and Shift+Cmd/Ctrl+Z redoes; Delete removes the selection; the arrows
 * move it by a frame, or a second with Shift. Keys typed into a field are left to the field.
 */
function Shortcuts() {
  const core = usePlayer();
  const { state } = useEditor();
  const [selected, select] = useSelection();
  const edit = useEdit();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable], [role=slider], [role=combobox]")) return;
      const mod = e.metaKey || e.ctrlKey;
      const item = selected ? state.items.get(selected) : undefined;
      if (e.key === " " && !target?.closest("button")) {
        e.preventDefault();
        void core.toggle();
      } else if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) edit.redo();
        else edit.undo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && item) {
        e.preventDefault();
        const result = edit.execute({ type: "element/remove", params: { id: item.id } });
        if (result.ok) select(null);
      } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && item) {
        e.preventDefault();
        // In whole frames, so steps add up exactly: three frames from 1 s at 30 fps is 1.1 s, not 1.099.
        const fps = state.composition.fps;
        const frames = (e.shiftKey ? fps : 1) * (e.key === "ArrowLeft" ? -1 : 1);
        const start = Math.max(0, Math.round(item.start * fps) + frames) / fps;
        edit.execute({ type: "clip/move", params: { id: item.id, place: { start: Math.round(start * 1e6) / 1e6 } } });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [core, state, selected, select, edit]);
  return null;
}
