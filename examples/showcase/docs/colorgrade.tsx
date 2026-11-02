import { Clip, ColorGrade, Composition, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="cool" src="asset:cells" in={0} out={1.5} fit="cover">
          <ColorGrade id="cold" temperature={-60} />
        </Clip>
        <Clip id="warm" src="asset:cells" in={1.5} out={3} fit="cover">
          <ColorGrade id="hot" temperature={60} tint={10} />
        </Clip>
      </Track>
    </Composition>
  );
}
