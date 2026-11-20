import { Clip, Composition, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        {/* A slow push-in: two keys on each scale axis. */}
        <Clip
          id="shot"
          src="asset:espresso"
          in={2}
          out={5}
          fit="cover"
          transform={{
            scale: [
              { at: 0, value: 1, easing: "easeInOutSine" },
              { at: 3, value: 1.4 },
            ],
          }}
        />
      </Track>
    </Composition>
  );
}
