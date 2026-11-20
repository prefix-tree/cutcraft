import {
  type CSSProperties,
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ResolvedState } from "@uberscene/sdk/resolver";

import { backdropTracks } from "../model/backdrop";
import { compositionBackground } from "../model/frame-plan";
import { indexLayerInteriors } from "../overlays/layer-interiors";
import { PlayerCore, type PlayerOptions } from "../player";
import { backgroundCss } from "../render/painter";
import type { MediaResolver, PlayerEvents } from "../types";
import { Controls } from "./Controls";
import { PlayerContext } from "./context";
import { DomLayer } from "./DomLayer";
import { retainUseT, usePlayer } from "./hooks";

export interface PlayerProviderProps {
  readonly state: ResolvedState;
  readonly media: MediaResolver | Readonly<Record<string, Blob | string>>;
  readonly loop?: boolean;
  readonly autoPlay?: boolean;
  readonly initiallyMuted?: boolean;
  readonly playbackRate?: number;
  readonly audioContext?: AudioContext;
  readonly onError?: (e: PlayerEvents["error"]) => void;
  readonly onFrame?: (e: PlayerEvents["frameupdate"]) => void;
  /** Test seams forwarded to PlayerCore. */
  readonly coreOptions?: Partial<PlayerOptions>;
  readonly children?: ReactNode;
}

export interface PlayerViewProps {
  /** The evaluated file element (`mod.default(props)`); needed only to render `<Layer>` interiors. */
  readonly element?: ReactNode;
  readonly controls?: boolean;
  /** `contain` scales the composition into the box; `none` renders at composition pixels. */
  readonly fit?: "contain" | "none";
  readonly style?: CSSProperties;
  readonly className?: string;
}

export interface PlayerProps extends Omit<PlayerProviderProps, "children">, PlayerViewProps {}

export type PlayerRef = Pick<
  PlayerCore,
  | "play"
  | "pause"
  | "toggle"
  | "seekTo"
  | "seekToFrame"
  | "getCurrentTime"
  | "getCurrentFrame"
  | "isPlaying"
  | "addEventListener"
  | "removeEventListener"
  | "renderFrame"
  | "captureSheet"
  | "duration"
  | "state"
> & {
  playbackRate: number;
  loop: boolean;
  muted: boolean;
  volume: number;
  readonly core: PlayerCore;
  readonly canvas: HTMLCanvasElement | null;
};

// The state as rendered: children render before the provider's layout effect pushes it into the core.
const StateContext = createContext<ResolvedState | null>(null);

/**
 * Owns the PlayerCore and shares it with everything inside: a `<PlayerView>`, `<Controls>`, `usePlayer()`.
 * Lets a page put the picture, the controls and its own panels anywhere under one player.
 */
export function PlayerProvider(props: PlayerProviderProps) {
  const {
    state,
    media,
    loop,
    autoPlay,
    initiallyMuted,
    playbackRate,
    audioContext,
    onError,
    onFrame,
    coreOptions,
    children,
  } = props;
  const [core, setCore] = useState<PlayerCore | null>(null);

  // One core per media/audio context; state updates are pushed into it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the other props are initial values; the effects below push their changes into the existing core.
  useLayoutEffect(() => {
    const c = new PlayerCore({
      state,
      media,
      ...(audioContext ? { audioContext } : {}),
      loop: loop ?? false,
      initiallyMuted: initiallyMuted ?? false,
      ...(playbackRate !== undefined ? { playbackRate } : {}),
      ...(coreOptions ?? {}),
    });
    const release = retainUseT();
    setCore(c);
    return () => {
      release();
      c.dispose();
    };
  }, [media, audioContext]);

  useLayoutEffect(() => {
    if (core && core.state !== state) core.setState(state);
  }, [core, state]);
  useEffect(() => {
    if (core && loop !== undefined) core.loop = loop;
  }, [core, loop]);
  useEffect(() => {
    if (core && playbackRate !== undefined) core.playbackRate = playbackRate;
  }, [core, playbackRate]);
  useEffect(() => (core && onError ? core.addEventListener("error", onError) : undefined), [core, onError]);
  useEffect(() => (core && onFrame ? core.addEventListener("frameupdate", onFrame) : undefined), [core, onFrame]);
  useEffect(() => {
    if (core && autoPlay) void core.play();
  }, [core, autoPlay]);

  if (!core) return null;
  return (
    <PlayerContext.Provider value={core}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </PlayerContext.Provider>
  );
}

/**
 * The picture of the enclosing `<PlayerProvider>`: canvas for media, DOM for overlays, controls below.
 * The root carries `data-time` and `data-frame`; every element carries `data-el`/`data-kind`.
 */
export const PlayerView = forwardRef<PlayerRef, PlayerViewProps>(function PlayerView(props, ref) {
  const { element, controls, fit = "contain", style, className } = props;
  const core = usePlayer();
  const state = useContext(StateContext) ?? core.state;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const interiors = useMemo(() => indexLayerInteriors(element ?? null), [element]);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    core.attachCanvas(canvasRef.current);
    return () => core.attachCanvas(null);
  }, [core]);

  // Scale the DOM layer with the box the canvas is shown in.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || fit === "none" || typeof ResizeObserver === "undefined") return;
    const update = () => setScale(root.clientWidth / state.composition.width || 1);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(root);
    return () => ro.disconnect();
  }, [fit, state.composition.width]);

  useImperativeHandle(ref, () => refOf(core, canvasRef.current), [core]);

  const { width, height } = state.composition;
  const snapshot = core.getTime();
  const backdrop = backdropTracks(state).size > 0;
  const layerStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width,
    height,
    transformOrigin: "0 0",
    transform: fit === "none" ? undefined : `scale(${scale})`,
    pointerEvents: "none",
  };
  const rootStyle: CSSProperties =
    fit === "none"
      ? { position: "relative", width, height, overflow: "hidden", background: "#000", ...style }
      : {
          position: "relative",
          width: "100%",
          aspectRatio: `${width} / ${height}`,
          overflow: "hidden",
          background: "#000",
          ...style,
        };
  return (
    <div
      ref={rootRef}
      className={className}
      style={rootStyle}
      data-time={snapshot.time.toFixed(4)}
      data-frame={snapshot.frame}
      data-player=""
    >
      {/* Overlays beneath the footage: the background, then those tracks, then the canvas over a transparent ground. */}
      {backdrop && (
        <div
          data-ground=""
          style={{ position: "absolute", inset: 0, zIndex: 0, background: backgroundCss(compositionBackground(state)) }}
        />
      )}
      {backdrop && (
        <div data-dom-layer="backdrop" style={{ ...layerStyle, zIndex: 0 }}>
          <DomLayer state={state} interiors={interiors} layer="backdrop" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        data-el={state.composition.id}
        data-kind="composition"
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", zIndex: 1 }}
      />
      <div data-dom-layer="" style={{ ...layerStyle, zIndex: 2 }}>
        <TimeAttrs />
        <DomLayer state={state} interiors={interiors} />
      </div>
      {controls && <Controls />}
    </div>
  );
});

/** A `<PlayerProvider>` with its `<PlayerView>`. */
export const Player = forwardRef<PlayerRef, PlayerProps>(function Player(props, ref) {
  const { element, controls, fit, style, className, ...provider } = props;
  return (
    <PlayerProvider {...provider}>
      <PlayerView
        ref={ref}
        element={element}
        {...(controls !== undefined ? { controls } : {})}
        {...(fit !== undefined ? { fit } : {})}
        {...(style !== undefined ? { style } : {})}
        {...(className !== undefined ? { className } : {})}
      />
    </PlayerProvider>
  );
});

/** Keeps `data-time`/`data-frame` on the root current without re-rendering the whole player. */
function TimeAttrs() {
  const core = usePlayer();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(
    () =>
      core.subscribeTime(() => {
        const root = ref.current?.closest("[data-player]") as HTMLElement | null;
        if (!root) return;
        const { time, frame } = core.getTime();
        root.dataset.time = time.toFixed(4);
        root.dataset.frame = String(frame);
      }),
    [core],
  );
  return <span ref={ref} hidden />;
}

function refOf(core: PlayerCore, canvas: HTMLCanvasElement | null): PlayerRef {
  return {
    core,
    canvas,
    play: () => core.play(),
    pause: () => core.pause(),
    toggle: () => core.toggle(),
    seekTo: (t) => core.seekTo(t),
    seekToFrame: (f) => core.seekToFrame(f),
    getCurrentTime: () => core.getCurrentTime(),
    getCurrentFrame: () => core.getCurrentFrame(),
    isPlaying: () => core.isPlaying(),
    addEventListener: (type, fn) => core.addEventListener(type, fn),
    removeEventListener: (type, fn) => core.removeEventListener(type, fn),
    renderFrame: (t) => core.renderFrame(t),
    captureSheet: (times, o) => core.captureSheet(times, o),
    get duration() {
      return core.duration;
    },
    get state() {
      return core.state;
    },
    get playbackRate() {
      return core.playbackRate;
    },
    set playbackRate(v) {
      core.playbackRate = v;
    },
    get loop() {
      return core.loop;
    },
    set loop(v) {
      core.loop = v;
    },
    get muted() {
      return core.muted;
    },
    set muted(v) {
      core.muted = v;
    },
    get volume() {
      return core.volume;
    },
    set volume(v) {
      core.volume = v;
    },
  };
}
