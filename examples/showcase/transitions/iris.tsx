import { Clip, Composition, Track, Transition } from "@uberscene/kit";

// iris: Opens the next clip through a growing circle, polygon or star.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="first" src="asset:coffeeWide" in={12} out={14} fit="cover" />
        <Transition id="change" type="iris" duration={1} />
        <Clip id="next" src="asset:espresso" in={26} out={28} fit="cover" />
      </Track>
    </Composition>
  );
}
