import { Clip, Composition, Track, Transition } from "@uberscene/kit";

// dipToBlack: Fades out to black, then in to the next clip.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="first" src="asset:espresso" in={14} out={16} fit="cover" />
        <Transition id="change" type="dipToBlack" duration={1} />
        <Clip id="next" src="asset:redCup" in={18} out={20} fit="cover" />
      </Track>
    </Composition>
  );
}
