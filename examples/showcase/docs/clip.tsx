import { Clip, Composition, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        {/* Seconds 1 to 3 of the file, then 4 seconds of another played at double speed. */}
        <Clip id="first" src="asset:spiral" in={1} out={3} fit="cover" />
        <Clip id="fast" src="asset:cells" in={0} out={4} speed={2} fit="cover" />
      </Track>
    </Composition>
  );
}
