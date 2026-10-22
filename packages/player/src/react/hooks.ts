import { installUseT } from "@cut/kit";
import { useContext, useSyncExternalStore } from "react";
import type { PlayerCore } from "../player";
import { LayerContext, PlayerContext } from "./context";

export function usePlayer(): PlayerCore {
  const core = useContext(PlayerContext);
  if (!core) throw new Error("usePlayer() must be used inside <Player>");
  return core;
}

export function useCompositionTime(): number {
  const core = usePlayer();
  return useSyncExternalStore((fn) => core.subscribeTime(fn), () => core.getTime().time, () => core.getTime().time);
}

export function useCompositionFrame(): number {
  const core = usePlayer();
  return useSyncExternalStore((fn) => core.subscribeTime(fn), () => core.getTime().frame, () => core.getTime().frame);
}

/** What the kit's `useT()` delegates to while a Player is mounted. */
export function useLayerT(): number {
  const t = useContext(LayerContext);
  if (Number.isNaN(t)) throw new Error("useT() is only valid inside a <Layer>");
  return t;
}

let mounted = 0;

/** Installs `useT` for the first mounted Player and removes it after the last unmounts. */
export function retainUseT(): () => void {
  if (mounted++ === 0) installUseT(useLayerT);
  return () => {
    if (--mounted === 0) installUseT(null);
  };
}
