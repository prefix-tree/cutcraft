import {
  Captions,
  Clapperboard,
  Layers as LayersIcon,
  type LucideIcon,
  Music,
  Shapes,
  Sparkles,
  Type,
} from "lucide-react";

import { useSelection } from "@uberscene/editor";

import { useRows } from "./use-rows";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  clip: Clapperboard,
  audio: Music,
  title: Type,
  captions: Captions,
  caption: Captions,
  shape: Shapes,
  svg: Shapes,
  transition: Sparkles,
  layer: LayersIcon,
};

/** Every element, grouped by track. A click selects it; the selection is the one the timeline and inspector share. */
export function Layers({ className }: { className?: string }) {
  const { byTrack } = useRows();
  const [selected, select] = useSelection();
  return (
    <ScrollArea className={cn("h-full", className)} data-editor-layers="">
      <div className="flex flex-col gap-4 p-3">
        {byTrack.map(({ track, rows }) => (
          <section key={track.id} className="flex flex-col gap-0.5">
            <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground">{track.id}</h3>
            {rows.map((row) => {
              const Icon = ICONS[row.kind] ?? Shapes;
              return (
                <Button
                  key={row.id}
                  data-editor-layer={row.id}
                  variant={row.id === selected ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start"
                  aria-pressed={row.id === selected}
                  onClick={() => select(row.id)}
                >
                  <Icon className="text-muted-foreground" />
                  <span className="truncate">{row.text ?? row.label ?? row.id}</span>
                </Button>
              );
            })}
          </section>
        ))}
      </div>
    </ScrollArea>
  );
}
