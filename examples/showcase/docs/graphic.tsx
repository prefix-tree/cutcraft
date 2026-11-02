import { Clip, Composition, Graphic, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="interview" src="asset:spiral" in={0} out={4} fit="cover" />
      </Track>
      <Track id="graphics">
        <Graphic id="who" kind="lower-third" name="Jane Doe" role="Founder, Shed" anchor="interview" offset={0.4} duration={3.2} />
      </Track>
    </Composition>
  );
}
