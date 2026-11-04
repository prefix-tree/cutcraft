import { z } from "zod";

import { Clip, Composition, defineEffect, Effect, Keyframe, Track } from "@cutcraft/kit";

// A duotone: each pixel's brightness picks a colour between `dark` and `light`. Colour params arrive in the shader as
// vec3; `strength` blends from the footage to the duotone, and the keyframes animate it.
const duotone = defineEffect({
  name: "duotone",
  params: z.object({
    dark: z.string().default("#101421"),
    light: z.string().default("#e8a33d"),
    strength: z.number().min(0).max(1).default(1),
  }),
  shader: `vec4 effect(vec2 uv) {
    vec4 c = texture(image, uv);
    float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    return vec4(mix(c.rgb, mix(dark, light, l), strength), c.a);
  }`,
});

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="fractal" src="asset:product" in={0} out={3} fit="cover">
          <Effect id="tone" type={duotone} params={{ dark: "#0b1d3a", light: "#ffcf70" }} />
          <Keyframe id="k1" property="effect.tone.strength" at={0} value={0} />
          <Keyframe id="k2" property="effect.tone.strength" at={1.5} value={1} />
        </Clip>
      </Track>
    </Composition>
  );
}
