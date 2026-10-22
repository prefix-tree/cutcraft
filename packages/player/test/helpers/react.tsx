import type { ResolvedState } from "@cutcut/kit";
import { ManualClock, Player, type PlayerOptions, type PlayerRef } from "@cutcut/player";
import { act, createRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { FakeAudioOutput, FakeAudioSource, FakeFrameSource, fakeResolver, recorderCanvas, recorderContext } from "./fakes";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** jsdom has no canvas; hand out a recording context. */
export function stubCanvas(): void {
  const rec = recorderContext();
  HTMLCanvasElement.prototype.getContext = (() => rec.ctx) as unknown as HTMLCanvasElement["getContext"];
}

export interface Mounted {
  root: Root;
  container: HTMLDivElement;
  ref: PlayerRef;
  seek: (t: number) => Promise<void>;
  unmount: () => Promise<void>;
}

export async function mountPlayer(state: ResolvedState, element?: ReactNode, extra: Partial<PlayerOptions> = {}): Promise<Mounted> {
  stubCanvas();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const ref = createRef<PlayerRef>();
  const media = fakeResolver(Object.keys(state.manifest.assets));
  const coreOptions: Partial<PlayerOptions> = {
    clock: new ManualClock(), audioOutput: new FakeAudioOutput(), toContextTime: (t) => t,
    frameSourceFactory: (id) => new FakeFrameSource(id, state.manifest.assets[id]?.duration ?? 10),
    audioSourceFactory: (id) => new FakeAudioSource(id),
    createCanvas: recorderCanvas,
    raf: () => 0, cancelRaf: () => {}, setInterval: () => 1, clearInterval: () => {},
    ...extra,
  };
  await act(async () => {
    root.render(<Player ref={ref} state={state} media={media} element={element} coreOptions={coreOptions} />);
  });
  const current = ref.current!;
  return {
    root, container, ref: current,
    seek: (t) => act(async () => { await current.seekTo(t); }),
    unmount: () => act(async () => { root.unmount(); container.remove(); }),
  };
}
