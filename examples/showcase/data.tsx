import { z } from "zod";

import { Clip, Composition, Layer, Motion, Track, useLayer } from "@cutcraft/kit";

export const schema = z.object({ accent: z.string() });
export const defaults = { accent: "#e8a33d" };

const label = { fill: "#c9c2b8", font: "500 18px Inter, sans-serif" } as const;
const value = { fill: "#f4efe6", font: "700 26px 'Space Grotesk', sans-serif" } as const;
const card = { position: "absolute", left: 520, width: 380, height: 260, top: 60 } as const;

/** A number that counts up over its layer's first second: any React, on the video's clock. */
function Count({
  to,
  prefix = "",
  suffix = "",
  label,
  color,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  label: string;
  color: string;
}) {
  const { elapsed } = useLayer();
  const t = Math.min(1, elapsed / 0.9);
  const shown = Math.round(to * (1 - (1 - t) ** 3));
  return (
    <div style={{ position: "absolute", left: 72, top: 150, opacity: Math.min(1, elapsed / 0.2) }}>
      <div style={{ color, font: "700 150px 'Space Grotesk', sans-serif", letterSpacing: "-0.05em", lineHeight: 1 }}>
        {prefix}
        {shown}
        {suffix}
      </div>
      <div style={{ color: "#f4efe6", font: "500 30px Inter, sans-serif", marginTop: 12 }}>{label}</div>
    </div>
  );
}

/**
 * A data story: each bar grows, and each number lands, on the word that says it. The chart is plain SVG animated by
 * Motion; the counters are a few lines of React reading the layer's clock.
 */
export default function Video({ accent }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={960} height={540} theme={{ extends: "midnight", palette: { primary: accent } }}>
      <Track id="main" name="Analyst">
        <Clip id="talk" src="asset:analyst" in="word:0" out="word:23.end" fit="cover" />
      </Track>
      <Track id="chart" name="Chart" layout="free">
        {/* The frame draws in as the analyst starts. */}
        <Motion
          id="frame"
          anchor="talk"
          at="word:0"
          duration={7.4}
          sequence={[
            [".panel", { opacity: [0, 1] }, { duration: 0.4 }],
            [".axis", { pathLength: [0, 1] }, { at: 0.2, duration: 0.6, ease: "easeOut" }],
            [".title", { opacity: [0, 1], y: [10, 0] }, { at: 0.4, duration: 0.4 }],
          ]}
        >
          <div className="panel" style={{ ...card, borderRadius: 18, background: "rgba(16, 20, 33, 0.78)" }} />
          <svg width="960" height="540" style={{ position: "absolute", inset: 0 }}>
            <title>Release time</title>
            <text className="title" x="548" y="100" style={{ ...label, font: "600 20px Inter, sans-serif" }}>
              Hours per release
            </text>
            <path className="axis" d="M 560 290 L 860 290" stroke="#5a6478" strokeWidth="2" fill="none" />
          </svg>
        </Motion>
        {/* Six hours: the tall bar, on "six". */}
        <Motion
          id="before"
          anchor="talk"
          at="word:5"
          duration={5.1}
          sequence={[
            [".bar", { scaleY: [0, 1] }, { duration: 0.6, ease: [0.2, 0.9, 0.2, 1] }],
            [".num", { opacity: [0, 1] }, { at: 0.4, duration: 0.3 }],
          ]}
        >
          <svg width="960" height="540" style={{ position: "absolute", inset: 0 }}>
            <title>Last year: six hours</title>
            <rect
              className="bar"
              x="600"
              y="160"
              width="90"
              height="130"
              fill="#5a6478"
              style={{ transformOrigin: "645px 290px" }}
            />
            <text className="num" x="645" y="150" textAnchor="middle" style={value}>
              6 h
            </text>
            <text x="645" y="312" textAnchor="middle" style={label}>
              last year
            </text>
          </svg>
        </Motion>
        {/* Ninety minutes: the short bar, on "ninety". */}
        <Motion
          id="after"
          anchor="talk"
          at="word:10"
          duration={2.6}
          sequence={[
            [".bar", { scaleY: [0, 1] }, { duration: 0.6, ease: [0.2, 0.9, 0.2, 1] }],
            [".num", { opacity: [0, 1] }, { at: 0.4, duration: 0.3 }],
          ]}
        >
          <svg width="960" height="540" style={{ position: "absolute", inset: 0 }}>
            <title>Today: ninety minutes</title>
            <rect
              className="bar"
              x="730"
              y="258"
              width="90"
              height="32"
              fill={accent}
              style={{ transformOrigin: "775px 290px" }}
            />
            <text className="num" x="775" y="248" textAnchor="middle" style={value}>
              1.5 h
            </text>
            <text x="775" y="312" textAnchor="middle" style={label}>
              today
            </text>
          </svg>
        </Motion>
      </Track>
      <Track id="numbers" name="Numbers" layout="free">
        <Layer id="four" anchor="talk" at="word:14" duration={2.4}>
          <Count to={4} suffix="×" label="as many releases" color={accent} />
        </Layer>
        <Layer id="forty" anchor="talk" at="word:22" duration={0.9}>
          <Count to={40} prefix="−" suffix="%" label="fewer incidents" color="#7fd1b9" />
        </Layer>
      </Track>
    </Composition>
  );
}
