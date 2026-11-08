import { Clip, Composition, ProgressBar, Track } from "@cutcraft/kit";

// ProgressBar: a bar that fills from the left to its value.
export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="shot" src="asset:coffeeWide" in={4} out={7} fit="cover" />
      </Track>
      <Track id="over" layout="free">
        <ProgressBar id="brew" start={0.3} duration={2.7} value={0.7} fillFor={1.8} />
      </Track>
    </Composition>
  );
}
