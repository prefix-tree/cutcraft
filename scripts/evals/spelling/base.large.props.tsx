import { Clip, Composition, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="a" src="asset:coffeeWide" in={4} out={7} fit="cover" />
        <Clip
          id="b"
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
          id="c"
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
        <Clip id="d" src="asset:coffee" in={1} out={5} fit="cover" />
        <Clip
          id="e"
          src="asset:espresso"
          in={20}
          out={22}
          fit="cover"
          transform={{
            opacity: [
              { at: 0, value: 0 },
              { at: 0.5, value: 1 },
            ],
          }}
          effects={[{ type: "blur", radius: 2 }]}
        />
        <Clip id="f" src="asset:redCup" in={10} out={12.4} fit="cover" />
      </Track>
    </Composition>
  );
}
