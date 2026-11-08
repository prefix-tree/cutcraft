import { Clip, Composition, Track, Transition } from "@cutcraft/kit";

// clockWipe: Sweeps the next clip in around a centre, like a clock hand.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="first" src="asset:coffee" in={1} out={3} fit="cover" />
        <Transition id="change" type="clockWipe" duration={1} />
        <Clip id="next" src="asset:coffeeWide" in={4} out={6} fit="cover" />
      </Track>
    </Composition>
  );
}
