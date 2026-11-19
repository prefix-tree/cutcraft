import { Clip, Composition, Track, Transition, transition } from "@uberscene/kit";

// The incoming clip opens as a circle from the centre of the frame. (The built-in `iris` does this and more; this shows
// how a transition of your own is written.)
const circle = transition({
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
        <Clip id="first" src="asset:coffee" in={0} out={2} fit="cover" />
        <Transition id="open" type={circle} duration={1} />
        <Clip id="pour" src="asset:coffee" in={15} out={17} fit="cover" />
      </Track>
    </Composition>
  );
}
