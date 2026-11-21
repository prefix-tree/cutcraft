// The playground's starter files. Each uses only the coffee clip in docs/public/playground, so every one plays in the
// browser with nothing else to download. aurora and product stay for links shared before the starters moved to coffee;
// their files are now cut from the espresso and red cup clips, so every picture here is coffee footage.

export interface Starter {
  readonly name: string;
  /** The rendered preview shown where the live player cannot run. */
  readonly preview: string;
  readonly code: string;
}

export const STARTERS: readonly Starter[] = [
  {
    name: "Launch",
    preview: "previews/transitions/iris",
    code: `import { Clip, Composition, LowerThird, Title, Track, Transition } from "@uberscene/kit";

// Change a word, a colour or a number: the video follows.
export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="open" src="asset:coffee" in={0} out={3} fit="cover" />
        <Transition id="change" type="iris" duration={0.8} params={{ sides: 5, star: 0.5 }} />
        <Clip id="product" src="asset:coffee" in={6} out={9} fit="cover" />
      </Track>
      <Track id="text">
        <Title id="title" anchor="open" offset={0.3} duration={2.2} style={{ size: 72 }}
          animation={{ type: "wordByWord" }}>
          Make videos with code
        </Title>
      </Track>
      <Track id="over" layout="free">
        <LowerThird id="name" anchor="product" offset={0.3} duration={2.2}
          name="Halvard Coffee" role="Roasted on Monday" box={{ x: 230, y: 440 }} width={400} />
      </Track>
    </Composition>
  );
}
`,
  },
  {
    name: "Lower third",
    preview: "previews/components/lower-third",
    code: `import { Badge, Clip, Composition, LowerThird, Track } from "@uberscene/kit";

// Ready-made components, made of the kit's own titles and shapes. Change the name, or try type="bar".
export default function Video() {
  return (
    <Composition fps={30} width={1280} height={720}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={0} out={4} fit="cover" />
      </Track>
      <Track id="over" layout="free">
        <LowerThird id="lt" start={0.3} duration={3.7} name="Maya Chen" role="Head roaster, Halvard" box={{ x: 310, y: 580 }} width={540} />
        <Badge id="new" start={1} duration={3} text="Live" box={{ x: 1120, y: 100 }} />
      </Track>
    </Composition>
  );
}
`,
  },
  {
    name: "Transition",
    preview: "previews/transitions/iris",
    code: `import { Clip, Composition, Track, Transition } from "@uberscene/kit";

// Try type="clockWipe", "blinds", "filmBurn" or "pixelDissolve".
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="first" src="asset:coffee" in={0} out={2.5} fit="cover" />
        <Transition id="change" type="iris" duration={1} params={{ sides: 5, star: 0.5 }} />
        <Clip id="next" src="asset:coffee" in={6} out={8.5} fit="cover" />
      </Track>
    </Composition>
  );
}
`,
  },
  {
    name: "Grade",
    preview: "previews/guide/colour-grade",
    code: `import { Clip, Composition, Track } from "@uberscene/kit";

// Effects run in the order they are written. Change a value, or swap two lines.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip
          id="pour"
          src="asset:coffee"
          in={6}
          out={10}
          fit="cover"
          effects={[
            { type: "exposure", stops: -0.3 },
            { type: "whiteBalance", temperature: [{ at: 0, value: -0.6, easing: "easeInOut" }, { at: 3, value: 0.6 }] },
            { type: "vibrance", amount: 0.5 },
            { type: "vignette", amount: 0.6 },
          ]}
        />
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

import { Clip, Composition, effect, Track } from "@uberscene/kit";

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
        <Clip
          id="pour"
          src="asset:coffee"
          in={6}
          out={10}
          fit="cover"
          effects={[{ type: tone, strength: [{ at: 0, value: 0 }, { at: 2, value: 1 }] }]}
        />
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
    coffee: { id: "coffee", kind: "video", duration: 12, fps: 30, width: 640, height: 360 },
    aurora: { id: "aurora", kind: "video", duration: 4, fps: 30, width: 640, height: 360 },
    product: { id: "product", kind: "video", duration: 4, fps: 30, width: 640, height: 360 },
  },
} as const;
