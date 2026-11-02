import { collectModule, resolve } from "@cutcraft/kit";
import { Player, type PlayerRef } from "@cutcraft/player";
import { createRef } from "react";
import { createRoot } from "react-dom/client";
import * as bars from "./composition";
import * as overlays from "./overlays";
import * as transitions from "./transitions";

declare global {
  interface Window {
    __player: PlayerRef | null;
    __ctx: AudioContext;
    __errors: unknown[];
    __playerErrors: unknown[];
  }
}

window.__errors = [];
window.__playerErrors = [];
const origError = console.error.bind(console);
console.error = (...args: unknown[]) => { window.__errors.push(args.map(String).join(" ")); origError(...args); };

async function main(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const video = params.get("video") ?? "bars.webm";
  const file = ({ overlays, transitions } as Record<string, typeof bars>)[params.get("comp") ?? ""] ?? bars;
  const blob = await (await fetch(`/${video}`)).blob();
  const media = { bars: blob, tone: "/tone.ogg", logo: "/logo.png", solid: "/solid.webm" };
  const state = resolve(collectModule(file), file.manifest);
  const element = file.default();
  const ctx = new AudioContext({ sampleRate: 48000 });
  window.__ctx = ctx;
  const ref = createRef<PlayerRef>();
  createRoot(document.getElementById("root")!).render(
    <Player ref={ref} state={state} element={element} media={media} audioContext={ctx} controls onError={(e) => window.__playerErrors.push(e)} />,
  );
  const wait = (): void => {
    if (ref.current) { window.__player = ref.current; document.body.dataset.ready = "1"; }
    else requestAnimationFrame(wait);
  };
  wait();
}

void main();
