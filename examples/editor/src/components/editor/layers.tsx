import { Type } from "lucide-react";

import { useSelection } from "@uberscene/editor";

import { useRows } from "./use-rows";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Layers() {
  const { byTrack } = useRows();
  const [selected, select] = useSelection();
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-3">
        {byTrack.map(({ track, rows }) => (
          <section key={track.id} className="flex flex-col gap-1">
            <h3 className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{track.id}</h3>
            {rows.map((row) => (
              <Button
                key={row.id}
                variant={row.id === selected ? "secondary" : "ghost"}
                size="sm"
                className="justify-start"
                aria-pressed={row.id === selected}
                onClick={() => select(row.id)}
              >
                <Type />
                <span className="truncate">{row.text ?? row.id}</span>
              </Button>
            ))}
          </section>
        ))}
      </div>
    </ScrollArea>
  );
}
