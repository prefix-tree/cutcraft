import { Clip, Composition, Title, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="shot" src="asset:aurora" in={0} out={4} fit="cover" />
      </Track>
      <Track id="text">
        <Title id="title" anchor="shot" offset={0.4} duration={3.2} size={56}>
          One file, one video
        </Title>
      </Track>
    </Composition>
  );
}
