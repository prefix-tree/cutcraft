import { Clip, Composition, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        {/* Seconds 1 to 3 of the file, then 4 seconds of another played at double speed. */}
        <Clip id="first" src="asset:coffee" in={6} out={8} fit="cover" />
        <Clip id="fast" src="asset:coffee" in={10} out={14} speed={2} fit="cover" />
      </Track>
    </Composition>
  );
}
