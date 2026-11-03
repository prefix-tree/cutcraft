import type { ResolvedState } from "@cutcraft/kit";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { PlayerCore, type PlayerOptions } from "../player";
import type { MediaResolver, PlayerEvents } from "../types";
import { PlayerContext } from "./context";
import { Controls } from "./Controls";
import { DomLayer } from "./DomLayer";
import { retainUseT, usePlayer } from "./hooks";
import { indexLayerInteriors } from "../overlays/layer-interiors";
import { backdropTracks } from "../model/backdrop";
import { compositionBackground } from "../model/frame-plan";
import { backgroundCss } from "../render/painter";

export interface PlayerProps {
  readonly state: ResolvedState;
  readonly media: MediaResolver | Readonly<Record<string, Blob | string>>;
  /** The evaluated file element (`mod.default(props)`); needed only to render `<Layer>` interiors. */
  readonly element?: ReactNode;
  readonly controls?: boolean;
  readonly loop?: boolean;
  readonly autoPlay?: boolean;
  readonly initiallyMuted?: boolean;
  readonly playbackRate?: number;
  /** `contain` scales the composition into the box; `none` renders at composition pixels. */
  readonly fit?: "contain" | "none";
  readonly style?: CSSProperties;
  readonly className?: string;
  readonly audioContext?: AudioContext;
  readonly onError?: (e: PlayerEvents["error"]) => void;
  readonly onFrame?: (e: PlayerEvents["frameupdate"]) => void;
  /** Test seams forwarded to PlayerCore. */
  readonly coreOptions?: Partial<PlayerOptions>;
}

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

/**
 * Canvas for media, DOM for overlays, controls below. The root carries
 * `data-time` and `data-frame`; every element carries `data-el`/`data-kind`.
 */
export const Player = forwardRef<PlayerRef, PlayerProps>(function Player(props, ref) {
  const {
    state,
    media,
    element,
    controls,
    loop,
    autoPlay,
    initiallyMuted,
    playbackRate,
    fit = "contain",
    style,
    className,
    audioContext,
    onError,
    onFrame,
    coreOptions,
  } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [core, setCore] = useState<PlayerCore | null>(null);
  const interiors = useMemo(() => indexLayerInteriors(element ?? null), [element]);
  const [scale, setScale] = useState(1);

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
  useLayoutEffect(() => {
    core?.attachCanvas(canvasRef.current);
    return () => core?.attachCanvas(null);
  }, [core]);
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

  useImperativeHandle(ref, () => (core ? refOf(core, canvasRef.current) : null) as PlayerRef, [core]);

  const { width, height } = state.composition;
  const snapshot = core?.getTime() ?? { time: 0, frame: 0 };
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
      {backdrop && core && (
        <PlayerContext.Provider value={core}>
          <div data-dom-layer="backdrop" style={{ ...layerStyle, zIndex: 0 }}>
            <DomLayer state={state} interiors={interiors} layer="backdrop" />
          </div>
        </PlayerContext.Provider>
      )}
      <canvas
        ref={canvasRef}
        data-el={state.composition.id}
        data-kind="composition"
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", zIndex: 1 }}
      />
      {core && (
        <PlayerContext.Provider value={core}>
          <div data-dom-layer="" style={{ ...layerStyle, zIndex: 2 }}>
            <TimeAttrs />
            <DomLayer state={state} interiors={interiors} />
          </div>
          {controls && <Controls />}
        </PlayerContext.Provider>
      )}
    </div>
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
