import { Clip, Composition, Effect, Track } from "@cutcraft/kit";

// One shot cooled toward blue, then warmed toward amber, by white balance.
export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="cool" src="asset:product" in={0} out={1.5} fit="cover">
          <Effect id="cold" type="whiteBalance" params={{ temperature: -0.6 }} />
        </Clip>
        <Clip id="warm" src="asset:product" in={1.5} out={3} fit="cover">
          <Effect id="hot" type="whiteBalance" params={{ temperature: 0.6 }} />
        </Clip>
      </Track>
    </Composition>
  );
}
