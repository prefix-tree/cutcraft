// Before and after, as one card to share: the interview as it was shot, and the short cut from it, playing in step.
// The edit is the rendered `hundred-videos.tsx` (the asset `hundred-videos-short`), so render that file first.

import { z } from "zod";

import { Clip, Composition, Layer, Track } from "@cutcraft/kit";

export const schema = z.object({
  /** The label over the source. */
  before: z.string(),
  /** The label over the short. */
  after: z.string(),
  /** The colour behind the second label. */
  accent: z.string(),
});
export const defaults: z.infer<typeof schema> = { before: "Raw video", after: "CutCraft edit", accent: "#ffd23f" };

// A 4:5 card, the shape a feed post takes.
const FRAME = { width: 1080, height: 1350 };
const PAPER = "#f3f1ea";
const INK = "#14161c";

// The short: 9:16, the larger of the two, on the right.
const AFTER = { x: 452, y: 236, width: 584, height: 1038, radius: 36 };
// The source: 16:9, smaller, on the left, tucked a little way under the short.
const BEFORE = { x: 44, y: 612, width: 480, height: 270, radius: 24 };

// The short starts 0.44 s into the excerpt and runs to its 44th second; the source plays the same stretch.
const FROM = 0.44;
const TO = 44;

/** A clip's transform that puts it in a box: the clip is fitted to the frame, then scaled and moved. */
const boxed = (box: typeof AFTER, fitted: { width: number; height: number }) => ({
  scale: box.width / fitted.width,
  position: { x: box.x + box.width / 2 - FRAME.width / 2, y: box.y + box.height / 2 - FRAME.height / 2 },
  borderRadius: box.radius / (box.width / fitted.width),
});
// What each picture measures once fitted inside the frame: the source by its width, the short by its height.
const SOURCE_FITTED = { width: FRAME.width, height: (FRAME.width * 9) / 16 };
const SHORT_FITTED = { width: (FRAME.height * 9) / 16, height: FRAME.height };

/** The paper, the two shadows the pictures sit on, and the two labels. */
function Card({ before, after, accent }: z.infer<typeof schema>) {
  const shadow = (box: typeof AFTER) =>
    ({
      position: "absolute",
      left: box.x,
      top: box.y,
      width: box.width,
      height: box.height,
      borderRadius: box.radius,
      background: INK,
      boxShadow: "0 30px 60px rgba(20, 22, 28, 0.28), 0 6px 16px rgba(20, 22, 28, 0.18)",
    }) as const;
  const label = {
    position: "absolute",
    fontFamily: '"Space Grotesk"',
    fontWeight: 700,
    color: INK,
    lineHeight: 1,
  } as const;
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${PAPER}, #ffffff)` }}>
      <div style={shadow(BEFORE)} />
      <div style={shadow(AFTER)} />
      <div data-name="before" style={{ ...label, left: BEFORE.x + 6, top: BEFORE.y - 70, fontSize: 50 }}>
        {before}
      </div>
      <div
        data-name="after"
        style={{
          ...label,
          left: AFTER.x + AFTER.width / 2,
          top: AFTER.y - 92,
          transform: "translateX(-50%)",
          fontSize: 56,
          whiteSpace: "nowrap",
          padding: "8px 16px 12px",
          borderRadius: 8,
          background: accent,
        }}
      >
        {after}
      </div>
    </div>
  );
}

export default function Video(props: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={FRAME.width} height={FRAME.height} background={{ mode: "color", color: PAPER }}>
      <Track id="card" layout="free">
        <Layer id="paper" anchor="edit" duration={{ until: "edit" }}>
          <Card {...props} />
        </Layer>
      </Track>
      {/* The source, with its sound. */}
      <Track id="before">
        <Clip id="raw" src="asset:hundred-videos" in={FROM} out={TO} transform={boxed(BEFORE, SOURCE_FITTED)} />
      </Track>
      {/* The short, silent here: it carries the same sound. */}
      <Track id="after">
        <Clip id="edit" src="asset:hundred-videos-short" volume={0} transform={boxed(AFTER, SHORT_FITTED)} />
      </Track>
    </Composition>
  );
}
