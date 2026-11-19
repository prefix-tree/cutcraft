import { Clip, Composition, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="shot" src="asset:coffee" in={3} out={7} fit="cover" />
      </Track>
      <Track id="text">
        <Title
          id="title"
          anchor="shot"
          offset={0.3}
          duration={3.4}
          style="h1"
          size={64}
          width={360}
          align="left"
          transform={{ position: { x: -280, y: 190 } }}
          animation={{ preset: "word-by-word" }}
        >
          Bloom first
        </Title>
      </Track>
    </Composition>
  );
}
