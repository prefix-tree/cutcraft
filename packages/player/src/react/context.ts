import { createContext } from "react";

import type { LayerClock } from "@cutcraft/kit";

import type { PlayerCore } from "../player";

export const PlayerContext = createContext<PlayerCore | null>(null);

/** The layer's clock inside a `<Layer>`; null outside one. */
export const LayerContext = createContext<LayerClock | null>(null);
