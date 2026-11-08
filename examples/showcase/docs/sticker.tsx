import { Clip, Composition, Sticker, Track } from "@cutcraft/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="shot" src="asset:aurora" in={0} out={3} fit="cover" />
      </Track>
      <Track id="stickers">
        <Sticker
          id="check"
          anchor="shot"
          offset={0.3}
          duration={2.5}
          src="asset:star"
          transform={{ scale: 2 }}
          enter={{ type: "scale", duration: 0.4 }}
        />
      </Track>
    </Composition>
  );
}
