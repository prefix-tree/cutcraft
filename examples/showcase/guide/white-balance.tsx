import { Clip, Composition, Track } from "@uberscene/kit";

// One shot cooled toward blue, then warmed toward amber, by white balance.
export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip
          id="cool"
          src="asset:redCup"
          in={18}
          out={19.5}
          fit="cover"
          effects={[{ type: "whiteBalance", temperature: -0.6 }]}
        />
        <Clip
          id="warm"
          src="asset:redCup"
          in={19.5}
          out={21}
          fit="cover"
          effects={[{ type: "whiteBalance", temperature: 0.6 }]}
        />
      </Track>
    </Composition>
  );
}
