import { Clip, Composition, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="plain" src="asset:redCup" in={18} out={19.5} fit="cover" />
        <Clip
          id="graded"
          src="asset:redCup"
          in={19.5}
          out={21}
          fit="cover"
          effects={[{ type: "grayscale" }, { type: "vignette", amount: 0.6 }]}
        />
      </Track>
    </Composition>
  );
}
