import { useContext, useSyncExternalStore } from "react";

import { installLayerClock, type LayerClock } from "@cutcraft/kit";

import type { PlayerCore } from "../player";
import { LayerContext, PlayerContext } from "./context";

export function usePlayer(): PlayerCore {
  const core = useContext(PlayerContext);
  if (!core) throw new Error("usePlayer() must be used inside <Player>");
  return core;
}

export function useCompositionTime(): number {
  const core = usePlayer();
  return useSyncExternalStore(
    (fn) => core.subscribeTime(fn),
    () => core.getTime().time,
    () => core.getTime().time,
  );
}

export function useCompositionFrame(): number {
  const core = usePlayer();
  return useSyncExternalStore(
    (fn) => core.subscribeTime(fn),
    () => core.getTime().frame,
    () => core.getTime().frame,
  );
}

/** What the kit's `useLayer()` and `useT()` delegate to while a Player is mounted. */
export function useLayerClock(): LayerClock {
  const clock = useContext(LayerContext);
  if (!clock) throw new Error("useLayer() and useT() are only valid inside a <Layer>");
  return clock;
}

/** 0..1 progress through the enclosing Layer. */
export function useLayerT(): number {
  return useLayerClock().t;
}

let mounted = 0;

/** Installs the kit's layer hooks for the first mounted Player and removes them after the last unmounts. */
export function retainUseT(): () => void {
  if (mounted++ === 0) installLayerClock(useLayerClock);
  return () => {
    if (--mounted === 0) installLayerClock(null);
  };
}
