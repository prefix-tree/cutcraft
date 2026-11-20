import { Clip, Composition, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="shot" src="asset:espresso" in={2} out={6} fit="cover" />
      </Track>
      <Track id="text">
        <Title
          id="title"
          anchor="shot"
          offset={0.4}
          duration={3.2}
          size={56}
          width={260}
          align="left"
          box={{ x: 160, y: 270, origin: "center" }}
        >
          Morning shot
        </Title>
      </Track>
    </Composition>
  );
}
