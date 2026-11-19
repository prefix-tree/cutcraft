import { Clip, Composition, Track, Transition } from "@uberscene/kit";

// slide: Slides the next clip in over the first.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="first" src="asset:coffee" in={12} out={14} fit="cover" />
        <Transition id="change" type="slide" duration={1} />
        <Clip id="next" src="asset:coffeeWide" in={4} out={6} fit="cover" />
      </Track>
    </Composition>
  );
}
