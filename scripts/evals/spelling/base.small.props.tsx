import { Clip, Composition, Title, Track, Transition } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="open" src="asset:coffeeWide" in={4} out={7} fit="cover" />
        <Transition id="x1" type="wipe" duration={0.6} params={{ direction: "left" }} />
        <Clip
          id="zoom"
          src="asset:espresso"
          in={2}
          out={5.5}
          fit="cover"
          transform={{
            scale: {
              x: [
                { at: 0, value: 1, ease: "ease-in-out" },
                { at: 3.5, value: 1.2 },
              ],
              y: [
                { at: 0, value: 1, ease: "ease-in-out" },
                { at: 3.5, value: 1.2 },
              ],
            },
          }}
        />
        <Clip
          id="close"
          src="asset:redCup"
          in={18}
          out={20.6}
          fit="cover"
          effects={[
            {
              type: "blur",
              radius: [
                { at: 0, value: 0, ease: "ease-in-out" },
                { at: 2, value: 8 },
              ],
            },
          ]}
        />
      </Track>
      <Track id="text" layout="free">
        <Title id="title" start={0.3} duration={2.2} box={{ x: 240, y: 100, origin: "center" }}>
          Slow pour
        </Title>
      </Track>
    </Composition>
  );
}
