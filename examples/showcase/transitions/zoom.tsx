import { Clip, Composition, Track, Transition } from "@uberscene/kit";

// zoom: Zooms through the first clip into the next, with a blur.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="first" src="asset:redCup" in={6} out={8} fit="cover" />
        <Transition id="change" type="zoom" duration={1} />
        <Clip id="next" src="asset:coffee" in={4} out={6} fit="cover" />
      </Track>
    </Composition>
  );
}
