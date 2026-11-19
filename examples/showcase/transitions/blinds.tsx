import { Clip, Composition, Track, Transition } from "@uberscene/kit";

// blinds: Opens the next clip through turning slats.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="first" src="asset:coffee" in={12} out={14} fit="cover" />
        <Transition id="change" type="blinds" duration={1} />
        <Clip id="next" src="asset:coffeeWide" in={4} out={6} fit="cover" />
      </Track>
    </Composition>
  );
}
