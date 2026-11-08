import { Clip, Composition, Track, Transition } from "@cutcraft/kit";

// slide: Slides the next clip in over the first.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="first" src="asset:coffee" in={1} out={3} fit="cover" />
        <Transition id="change" type="slide" duration={1} />
        <Clip id="next" src="asset:product" in={0} out={2} fit="cover" />
      </Track>
    </Composition>
  );
}
