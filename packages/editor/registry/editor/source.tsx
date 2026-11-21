import { Check, Copy, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useSource } from "./use-source";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/**
 * The file as the edits so far leave it, with the lines they changed marked. What an editor saves is this text: the
 * same file, one value changed where you changed one.
 */
export function Source({
  source,
  name = "video.tsx",
  className,
}: {
  source: string;
  name?: string;
  className?: string;
}) {
  const { text, changed, skipped } = useSource(source);
  const [copied, setCopied] = useState(false);
  const lines = text.split("\n");
  const view = useRef<HTMLPreElement>(null);
  // The first changed line comes into view, so an edit made elsewhere is seen landing in the file.
  const first = Math.min(...changed);
  useEffect(() => {
    if (Number.isFinite(first))
      view.current?.querySelector(`[data-line="${first}"]`)?.scrollIntoView({ block: "center" });
  }, [first]);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)} data-editor-source="">
      <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-mono">{name}</span>
        <span>{changed.size === 0 ? "unchanged" : `${changed.size} line${changed.size === 1 ? "" : "s"} changed`}</span>
        {skipped.length > 0 && <span className="text-destructive">{skipped.length} edit(s) not written</span>}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" onClick={copy}>
            {copied ? <Check /> : <Copy />} Copy
          </Button>
          <Button variant="ghost" size="sm" onClick={download}>
            <Download /> Download
          </Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <pre ref={view} className="py-2 font-mono text-xs leading-5">
          {lines.map((line, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: a line's place is its identity here.
              key={i}
              data-line={i}
              data-changed={changed.has(i) || undefined}
              className={cn("flex pr-4", changed.has(i) && "bg-primary/10")}
            >
              <span
                className={cn(
                  "w-10 shrink-0 pr-3 text-right text-muted-foreground/60 select-none",
                  changed.has(i) && "border-l-2 border-primary text-primary",
                )}
              >
                {i + 1}
              </span>
              <code className="whitespace-pre">{line || " "}</code>
            </div>
          ))}
        </pre>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
