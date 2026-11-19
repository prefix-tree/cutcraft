import { Clip, Composition, Freeze, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        {/* At 1 s into the clip, hold the source's frame at 15 s for one second, then play on. */}
        <Clip id="shot" src="asset:espresso" in={14} out={17} fit="cover">
          <Freeze id="hold" at={15} start={1} duration={1} />
        </Clip>
      </Track>
    </Composition>
  );
}
