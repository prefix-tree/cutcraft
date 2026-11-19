import { Clip, Composition, Freeze, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        {/* At 1 s into the clip, hold the source's frame at 11 s for one second, then play on. */}
        <Clip id="shot" src="asset:coffee" in={10} out={13} fit="cover">
          <Freeze id="hold" at={11} start={1} duration={1} />
        </Clip>
      </Track>
    </Composition>
  );
}
