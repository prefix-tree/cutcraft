import { Clip, Composition, Title, Track } from "@uberscene/kit";

// outline: Draws a line around the element's shape.
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
          style={{ size: 128, color: "#e8a33d" }}
          effects={[
            {
              type: "outline",
              color: "#f4efe6",
              thickness: [
                { at: 0.5, value: 0, easing: "easeInOut" },
                { at: 1.5, value: 4 },
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
