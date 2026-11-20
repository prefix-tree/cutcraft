import { Clip, Composition, Title, Track } from "@uberscene/kit";

// shadow: Casts a soft drop shadow behind the element's own shape.
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="main">
        <Clip
          id="backdrop"
          src="asset:espresso"
          in={10}
          out={13}
          fit="cover"
          effects={[
            { type: "blur", radius: 10 },
            { type: "brightness", amount: -0.35 },
          ]}
        />
      </Track>
      <Track id="text" layout="free">
        <Title
          id="word"
          start={0}
          duration={3}
          size={128}
          color="#e8a33d"
          effects={[
            {
              type: "shadow",
              x: 8,
              y: 8,
              radius: 3,
              opacity: [
                { at: 0.5, value: 0, easing: "ease-in-out" },
                { at: 1.5, value: 0.9 },
              ],
            },
          ]}
        >
          Crema
        </Title>
      </Track>
    </Composition>
  );
}
