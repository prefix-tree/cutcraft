// The playground's starter files. Each uses only the two clips in docs/public/playground (aurora, product), so every
// one plays in the browser with nothing else to download.

export interface Starter {
  readonly name: string;
  /** The rendered preview shown where the live player cannot run. */
  readonly preview: string;
  readonly code: string;
}

export const STARTERS: readonly Starter[] = [
  {
    name: "Cut and title",
    preview: "previews/elements/title",
    code: `import { Clip, Composition, Title, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="open" src="asset:aurora" in={0} out={2} fit="cover" />
        <Clip id="fractal" src="asset:product" in={0} out={2} fit="cover" />
      </Track>
      <Track id="text">
        <Title id="title" anchor="open" offset={0.2} duration={3.6} size={44}
          animation={{ preset: "word-by-word" }}>
          Edit me: the video follows
        </Title>
      </Track>
    </Composition>
  );
}
`,
  },
  {
    name: "Transition",
    preview: "previews/transitions/iris",
    code: `import { Clip, Composition, Track, Transition } from "@cutcraft/kit";

// Try type="clockWipe", "blinds", "filmBurn" or "pixelDissolve".
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="first" src="asset:aurora" in={0} out={2.5} fit="cover" />
        <Transition id="change" type="iris" duration={1} params={{ sides: 5, star: 0.5 }} />
        <Clip id="next" src="asset:product" in={0} out={2.5} fit="cover" />
      </Track>
    </Composition>
  );
}
`,
  },
  {
    name: "Grade",
    preview: "previews/guide/colour-grade",
    code: `import { Clip, Composition, Effect, Keyframe, Track } from "@cutcraft/kit";

// Effects run in the order they are written. Change a value, or swap two lines.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="fractal" src="asset:product" in={0} out={4} fit="cover">
          <Effect id="expose" type="exposure" params={{ stops: -0.3 }} />
          <Effect id="balance" type="whiteBalance">
            <Keyframe id="k1" param="temperature" at={0} value={-0.6} />
            <Keyframe id="k2" param="temperature" at={3} value={0.6} easing="ease-in-out" />
          </Effect>
          <Effect id="pop" type="vibrance" params={{ amount: 0.5 }} />
          <Effect id="edges" type="vignette" params={{ amount: 0.6 }} />
        </Clip>
      </Track>
    </Composition>
  );
}
`,
  },
  {
    name: "Your own effect",
    preview: "previews/guide/shader-effect",
    code: `import { z } from "zod";

import { Clip, Composition, Effect, effect, Keyframe, Track } from "@cutcraft/kit";

// A shader of your own: each pixel's brightness picks a colour between dark and light.
const tone = effect({
  name: "tone",
  params: z.object({
    dark: z.string().default("#0b1d3a"),
    light: z.string().default("#ffcf70"),
    strength: z.number().min(0).max(1).default(1),
  }),
  shader: \`vec4 effect(vec2 uv) {
    vec4 c = texture(image, uv);
    float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    return vec4(mix(c.rgb, mix(params.dark, params.light, l), params.strength), c.a);
  }\`,
});

export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="fractal" src="asset:product" in={0} out={4} fit="cover">
          <Effect id="look" type={tone}>
            <Keyframe id="k1" param="strength" at={0} value={0} />
            <Keyframe id="k2" param="strength" at={2} value={1} />
          </Effect>
        </Clip>
      </Track>
    </Composition>
  );
}
`,
  },
];

/** The footage the starters use, as the manifest describes it. */
export const MANIFEST = {
  assets: {
    aurora: { id: "aurora", kind: "video", duration: 4, fps: 30, width: 640, height: 360 },
    product: { id: "product", kind: "video", duration: 4, fps: 30, width: 640, height: 360 },
  },
} as const;
