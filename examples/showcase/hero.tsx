import { Composition, googleFont, Layer, Title, Track, useLayer } from "@cutcraft/kit";

/**
 * The landing page's hero: the logo told as a woodblock print. Waves roll in under a red sun, a katana flashes, the sun
 * falls apart along the cut, and the print draws in to the tile of the logo, where the colours turn over: the red sun
 * on paper becomes the paper sun on red. It ends on the paper it began on, so it loops. Every shape is a function of
 * the layer's elapsed seconds, so the preview and the export draw the same frame.
 */
const display = googleFont("Archivo", { weights: [800] });
const mono = googleFont("Geist Mono", { weights: [500] });

const RED = "#c8402a";
const PAPER = "#f3ead6";
const INK = "#1b1712";
const W = 1280;
const H = 720;

export default function Video() {
  return (
    <Composition fps={30} width={W} height={H} background={{ mode: "color", color: PAPER }}>
      <Track id="print" layout="free">
        <Layer id="woodblock" start={0} duration={6}>
          <Woodblock />
        </Layer>
      </Track>
      <Track id="words" layout="free">
        <Title
          id="name"
          start={3.9}
          duration={1.95}
          font={display}
          size={112}
          weight={800}
          color={INK}
          transform={{ position: { x: 250, y: -22 } }}
          enter={{ type: "slide-up", duration: 0.6, easing: "easeOutCubic" }}
          exit={{ type: "fade", duration: 0.5 }}
        >
          CutCraft
        </Title>
        <Title
          id="tagline"
          start={4.25}
          duration={1.6}
          font={mono}
          size={26}
          weight={500}
          color={RED}
          transform={{ position: { x: 250, y: 62 } }}
          enter={{ type: "fade", duration: 0.5 }}
          exit={{ type: "fade", duration: 0.5 }}
        >
          VIDEO EDITOR AS CODE
        </Title>
      </Track>
    </Composition>
  );
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0 before `a`, 1 after `b`, eased between. */
const span = (t: number, a: number, b: number, ease: (x: number) => number = (x) => x) =>
  ease(clamp01((t - a) / (b - a)));
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const lerp = (a: number, b: number, q: number) => a + (b - a) * q;
/** Mixes two #rrggbb colours. */
function mix(a: string, b: string, q: number): string {
  const ch = (c: string, i: number) => Number.parseInt(c.slice(1 + 2 * i, 3 + 2 * i), 16);
  const out = [0, 1, 2].map((i) =>
    Math.round(lerp(ch(a, i), ch(b, i), q))
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${out.join("")}`;
}

/** The logo's sea: offset rows of seigaiha, each a paper disc with three ink rings, in the logo's 512-unit space. */
function Sea({ t }: { t: number }) {
  const rows = Array.from({ length: 9 }, (_, r) => {
    const y = 368 + r * 18;
    // Rows roll in from the right one after another, the far (top) rows last and slowest; then they keep drifting.
    const arrive = span(t, 0.05 + r * 0.06, 1.0 + r * 0.05, easeOutCubic);
    const drift = (t * (14 - r)) % 60;
    const dx = (1 - arrive) * 900 - drift;
    const offset = r % 2 === 0 ? 0 : 30;
    return (
      <g key={r} opacity={arrive}>
        {Array.from({ length: 34 }, (_, i) => -720 + offset + i * 60).map((x) => (
          <g key={x} transform={`translate(${x + dx} ${y})`}>
            <circle r={30} fill={PAPER} />
            <circle r={30} fill="none" />
            <circle r={21} fill="none" />
            <circle r={12} fill="none" />
          </g>
        ))}
      </g>
    );
  });
  return (
    <g stroke={INK} strokeWidth={3}>
      <rect x={-800} y={352} width={2200} height={400} fill={PAPER} stroke="none" />
      {rows}
    </g>
  );
}

function Woodblock() {
  // Seconds into the layer (useT() would be its 0..1 progress).
  const t = useLayer().elapsed;
  // The camera: the logo's 512-unit square, first filling the frame's height, then drawn in to a tile on the left.
  const draw = span(t, 3.3, 4.5, easeInOutCubic);
  const k = lerp(H / 512, 300 / 512, draw);
  const cx = lerp(W / 2, 430, draw);
  const cy = H / 2;
  // The tile the print becomes: from the whole frame (in logo units) to the logo's rounded square.
  const frame = { x: -(W / 2) / (H / 512) + 256, y: 0, w: W / (H / 512), h: 512 };
  const tile = {
    x: lerp(frame.x, 0, draw),
    y: lerp(frame.y, 0, draw),
    w: lerp(frame.w, 512, draw),
    h: lerp(frame.h, 512, draw),
    r: lerp(0, 112, draw),
  };
  // The colours turn over as the tile forms: red sun on paper, then paper sun on red.
  const turn = span(t, 3.5, 4.3, easeInOutSine);
  const sky = mix(PAPER, RED, turn);
  const sun = mix(RED, PAPER, turn);
  // The sun rises from behind the sea; the katana passes along the logo's cut; the halves slide apart.
  const rise = span(t, 0.8, 2.2, easeOutCubic);
  const sunY = lerp(206 + 300, 206, rise);
  const blade = span(t, 2.3, 2.6, easeInOutSine);
  const split = span(t, 2.6, 3.3, easeOutCubic) * 15;
  const flash = span(t, 2.55, 2.65) * (1 - span(t, 2.65, 2.95));
  // The cut runs from the hilt at (-60, 552) to past the tip at (600, -100); the blade travels along it.
  const ux = 660 / Math.hypot(660, 652);
  const uy = -652 / Math.hypot(660, 652);
  const along = lerp(-420, 1180, blade);
  const bx = -60 + ux * along;
  const by = 552 + uy * along;
  // The fade back to bare paper, so the last frame meets the first.
  const fade = span(t, 5.35, 5.85, easeInOutSine);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <title>A woodblock sun over seigaiha waves, cut in two by a katana, drawing in to the CutCraft logo</title>
      <defs>
        <clipPath id="hero-tile">
          <rect x={tile.x} y={tile.y} width={tile.w} height={tile.h} rx={tile.r} />
        </clipPath>
        <clipPath id="hero-above">
          <path d="M-60 552 L600 -100 L-600 -100 L-600 552Z" />
        </clipPath>
        <clipPath id="hero-below">
          <path d="M-60 552 L600 -100 L1400 -100 L1400 900 L-60 900Z" />
        </clipPath>
        <pattern id="hero-grain" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <path d="M0 0V6" stroke={INK} strokeWidth="1.2" opacity=".22" />
        </pattern>
        <filter id="hero-paper" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0.09 0" />
        </filter>
      </defs>

      <rect width={W} height={H} fill={PAPER} />
      <g transform={`translate(${cx} ${cy}) scale(${k}) translate(-256 -256)`}>
        <g clipPath="url(#hero-tile)">
          <rect x={-800} y={-200} width={2200} height={1000} fill={sky} />
          <rect x={-800} y={-200} width={2200} height={1000} fill="url(#hero-grain)" opacity={0.35 * turn} />

          {/* The sun, in two halves that slide apart along the cut. */}
          <g transform={`translate(${-split} ${-split})`} clipPath="url(#hero-above)">
            <circle cx={262} cy={sunY} r={118} fill={sun} stroke={INK} strokeWidth={7} />
            <path d={`M170 ${sunY - 64}a118 118 0 0 1 120-52`} fill="none" stroke={INK} strokeWidth={3} opacity={0.5} />
          </g>
          <g transform={`translate(${split} ${split})`} clipPath="url(#hero-below)">
            <circle cx={262} cy={sunY} r={118} fill={sun} stroke={INK} strokeWidth={7} />
            <circle cx={262} cy={sunY} r={118} fill="url(#hero-grain)" />
          </g>

          <Sea t={t} />

          {/* The cut itself, a hairline of light for a moment after the blade. */}
          <path d="M-60 552 L600 -100" stroke={PAPER} strokeWidth={5} opacity={flash} />
          {/* Ink thrown off the cut. */}
          {[0.2, 0.35, 0.5, 0.62].map((p, i) => {
            const fly = span(t, 2.6 + i * 0.03, 3.4 + i * 0.03);
            const ox = -60 + ux * (360 + p * 300);
            const oy = 552 + uy * (360 + p * 300);
            const dir = i % 2 === 0 ? 1 : -1;
            return (
              <circle
                key={p}
                cx={ox + dir * fly * (40 + i * 12)}
                cy={oy + dir * fly * (30 + i * 8) + fly * fly * 60}
                r={6 - i}
                fill={INK}
                opacity={fly > 0 && fly < 1 ? 1 - fly : 0}
              />
            );
          })}
          {/* The katana: a dark blade with a paper edge, passing along the cut. */}
          {blade > 0 && blade < 1 && (
            <g transform={`translate(${bx} ${by}) rotate(${(Math.atan2(uy, ux) * 180) / Math.PI}) scale(1.7)`}>
              {/* The light it leaves behind, then the blade, its paper edge, the guard and the hilt. */}
              <path d="M-700 -1 L-150 -3 L-150 3 L-700 1Z" fill={PAPER} opacity={0.75} />
              <path d="M-260 -6 L0 -8 Q24 -2 38 7 L-260 6Z" fill={INK} />
              <path d="M-260 5 L0 6 Q22 5 38 7" fill="none" stroke={PAPER} strokeWidth={2.5} />
              <rect x={-276} y={-16} width={12} height={32} rx={3} fill={INK} />
              <rect x={-350} y={-7} width={76} height={14} rx={4} fill={INK} />
              <path
                d="M-344 -7 L-332 7 M-330 -7 L-318 7 M-316 -7 L-304 7 M-302 -7 L-290 7"
                stroke={RED}
                strokeWidth={2}
              />
            </g>
          )}
        </g>
      </g>
      {/* The fade to bare paper goes under the paper's texture, so the last frame is the first. */}
      <rect width={W} height={H} fill={PAPER} opacity={fade} />
      <rect width={W} height={H} filter="url(#hero-paper)" />
    </svg>
  );
}
