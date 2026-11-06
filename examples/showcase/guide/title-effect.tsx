import { z } from "zod";

import { Clip, Composition, Effect, effect, Motion, Title, Track } from "@cutcraft/kit";

// The same kind of effect a clip takes, on a title and on a Motion layer: the overlay's pixels only.
const split = effect({
  name: "split",
  params: z.object({ amount: z.number().min(0).max(0.05).default(0.008) }),
  shader: `vec4 effect(vec2 uv) {
    vec2 o = vec2(params.amount * (1.0 + sin(time * 8.0)), 0.0);
    vec4 c = texture(image, uv);
    float r = texture(image, uv + o).a;
    float b = texture(image, uv - o).a;
    return vec4(max(c.r, r), c.g * c.a, max(c.b, b), max(c.a, max(r, b)));
  }`,
});

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="bg" src="asset:product" in={0} out={3} fit="cover" />
      </Track>
      <Track id="text" layout="free">
        <Title id="name" start={0.2} duration={2.8} size={130} color="#ffffff">
          <Effect id="title-split" type={split} />
          Shed
        </Title>
        <Motion
          id="badge"
          start={0.8}
          duration={2.2}
          sequence={[[".badge", { opacity: [0, 1], scale: [0.7, 1] }, { duration: 0.4 }]]}
        >
          <Effect id="badge-split" type={split} params={{ amount: 0.004 }} />
          <div
            className="badge"
            style={{
              position: "absolute",
              left: 640,
              top: 140,
              padding: "10px 22px",
              borderRadius: 999,
              background: "#e8a33d",
              color: "#101421",
              font: "700 34px 'Space Grotesk', sans-serif",
            }}
          >
            New
          </div>
        </Motion>
      </Track>
    </Composition>
  );
}
