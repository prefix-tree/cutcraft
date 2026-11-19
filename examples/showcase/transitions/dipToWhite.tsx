import { Clip, Composition, Track, Transition } from "@uberscene/kit";

// dipToWhite: Fades out to white, then in to the next clip.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="first" src="asset:coffeeWide" in={12} out={14} fit="cover" />
        <Transition id="change" type="dipToWhite" duration={1} />
        <Clip id="next" src="asset:espresso" in={26} out={28} fit="cover" />
      </Track>
    </Composition>
  );
}
