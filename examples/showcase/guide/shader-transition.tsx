import { Clip, Composition, defineTransition, Track, Transition } from "@cutcraft/kit";

// The incoming clip opens as a circle from the centre of the frame.
const circle = defineTransition({
  name: "circle",
  shader: `vec4 transition(vec2 uv) {
    float d = distance(uv * resolution, resolution / 2.0) / length(resolution / 2.0);
    return d < progress ? texture(to, uv) : texture(from, uv);
  }`,
});

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="aurora" src="asset:aurora" in={0} out={2} fit="cover" />
        <Transition id="open" type={circle} duration={1} />
        <Clip id="fractal" src="asset:product" in={0} out={2} fit="cover" />
      </Track>
    </Composition>
  );
}
