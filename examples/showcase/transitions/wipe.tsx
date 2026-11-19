import { Clip, Composition, Track, Transition } from "@uberscene/kit";

// wipe: Wipes the next clip over the first, edge first.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip id="first" src="asset:redCup" in={6} out={8} fit="cover" />
        <Transition id="change" type="wipe" duration={1} />
        <Clip id="next" src="asset:coffee" in={4} out={6} fit="cover" />
      </Track>
    </Composition>
  );
}
