import { Adjustment, Clip, Composition, Effect, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="a" src="asset:coffee" in={0} out={2} fit="cover" />
        <Clip id="b" src="asset:coffee" in={10} out={12} fit="cover" />
      </Track>
      {/* One filter over everything beneath it, for its own stretch of time. */}
      <Track id="looks" layout="free">
        <Adjustment id="sepia" start={1} duration={2}>
          <Effect id="tone" type="sepia" />
        </Adjustment>
      </Track>
    </Composition>
  );
}
