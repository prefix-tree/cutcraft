import { Clip, Composition, Effect, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="plain" src="asset:aurora" in={0} out={1.5} fit="cover" />
        <Clip id="graded" src="asset:aurora" in={1.5} out={3} fit="cover">
          <Effect id="mono" type="grayscale" />
          <Effect id="edges" type="vignette" params={{ amount: 0.6 }} />
        </Clip>
      </Track>
    </Composition>
  );
}
