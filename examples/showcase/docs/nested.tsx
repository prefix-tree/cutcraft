import { Clip, Composition, Nested, Title, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="intro" src="asset:aurora" in={0} out={1.5} fit="cover" />
        {/* A sequence written once and placed like a clip, here scaled into a picture-in-picture. */}
        <Nested id="card" of={EndCard} duration={2} transform={{ scale: 0.8 }} />
      </Track>
    </Composition>
  );
}

function EndCard() {
  return (
    <>
      <Track id="card-bg">
        <Clip id="card-shot" src="asset:cells" in={0} out={2} fit="cover" />
      </Track>
      <Track id="card-text">
        <Title id="card-title" anchor="card-shot" duration={2} size={56}>
          Thanks for watching
        </Title>
      </Track>
    </>
  );
}
