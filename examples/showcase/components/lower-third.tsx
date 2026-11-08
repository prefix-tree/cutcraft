import { Clip, Composition, LowerThird, Track } from "@cutcraft/kit";

// LowerThird: a name and a role, on a card that slides up, timed like any title.
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="shot" src="asset:coffeeWide" in={4} out={7} fit="cover" />
      </Track>
      <Track id="over" layout="free">
        <LowerThird id="lt" start={0.3} duration={2.7} name="Maya Chen" role="Head roaster, Shed Coffee" />
      </Track>
    </Composition>
  );
}
