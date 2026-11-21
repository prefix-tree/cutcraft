import { z } from "zod";

import { Clip, Composition, effect, Track } from "@uberscene/kit";

// A two-colour tone (the kit has one built in, `duotone`; this is how such an effect is written): each pixel's
// brightness picks a colour between `dark` and `light`. Colour params arrive in the shader as vec3; `strength` blends
// from the footage to the toned picture, and the keyframes animate it.
const navyGold = effect({
  name: "navy-gold",
  params: z.object({
    dark: z.string().default("#101421"),
    light: z.string().default("#e8a33d"),
    strength: z.number().min(0).max(1).default(1),
  }),
  shader: `vec4 effect(vec2 uv) {
    vec4 c = texture(image, uv);
    float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    return vec4(mix(c.rgb, mix(params.dark, params.light, l), params.strength), c.a);
  }`,
});

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip
          id="pour"
          src="asset:redCup"
          in={18}
          out={21}
          fit="cover"
          effects={[
            {
              type: navyGold,
              dark: "#0b1d3a",
              light: "#ffcf70",
              strength: [
                { at: 0, value: 0 },
                { at: 1.5, value: 1 },
              ],
            },
          ]}
        />
      </Track>
    </Composition>
  );
}
