import { Clip, Composition, Title, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="shot" src="asset:espresso" in={3} out={7} fit="cover" />
      </Track>
      <Track id="text">
        <Title
          id="title"
          anchor="shot"
          offset={0.3}
          duration={3.4}
          style="h1"
          size={64}
          animation={{ preset: "word-by-word" }}
        >
          Cut by words, not seconds
        </Title>
      </Track>
    </Composition>
  );
}
