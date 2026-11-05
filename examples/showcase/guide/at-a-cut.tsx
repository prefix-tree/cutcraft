import { Clip, Composition, Motion, Track } from "@cutcraft/kit";

// A warm flare over the cut from the founder to the product shot. It sits on a free track, anchored to the clip that
// comes in, starting 0.4 s before it: the cut does not move and the video stays as long as its clips. Trim "talk"
// and the flare follows the cut.
export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="talk" src="asset:founder" in="word:0" out="word:5.end" fit="cover" />
        <Clip id="product" src="asset:product" in={0} out={2.5} fit="cover" />
      </Track>
      <Track id="fx" layout="free">
        <Motion
          id="flare"
          anchor="product"
          offset={-0.4}
          duration={0.8}
          sequence={[[".flare", { opacity: [0, 0.7, 0] }, { duration: 0.8, ease: "easeInOut" }]]}
        >
          <div
            className="flare"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 78% 25%, rgba(255, 210, 140, 0.95), rgba(255, 130, 60, 0.35) 30%, transparent 55%)",
            }}
          />
        </Motion>
      </Track>
    </Composition>
  );
}
