import { createContext } from "react";
import type { PlayerCore } from "../player";

export const PlayerContext = createContext<PlayerCore | null>(null);

/** 0..1 inside a `<Layer>`; NaN outside one. */
export const LayerContext = createContext<number>(Number.NaN);
