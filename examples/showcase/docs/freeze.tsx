import { Clip, Composition, Freeze, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        {/* At 1 s into the clip, hold the source's frame at 1 s for one second, then play on. */}
        <Clip id="shot" src="asset:cells" in={0} out={3} fit="cover">
          <Freeze id="hold" at={1} start={1} duration={1} />
        </Clip>
      </Track>
    </Composition>
  );
}
