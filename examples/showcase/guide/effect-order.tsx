import { Clip, Composition, Effect, Track } from "@cutcraft/kit";

// The same two effects in either order. Left: grayscale, then duotone, which maps the grey onto navy and amber.
// Right: duotone, then grayscale, which takes the colour back out. Effects run in the order the file lists them.
export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="left">
        <Clip
          id="grey-first"
          src="asset:coffee"
          in={12}
          out={15}
          fit="cover"
          transform={{ position: { x: -240, y: 0 }, scale: { x: 0.5, y: 0.5 } }}
        >
          <Effect id="grey-a" type="grayscale" />
          <Effect id="tone-a" type="duotone" />
        </Clip>
      </Track>
      <Track id="right">
        <Clip
          id="tone-first"
          src="asset:coffee"
          in={12}
          out={15}
          fit="cover"
          transform={{ position: { x: 240, y: 0 }, scale: { x: 0.5, y: 0.5 } }}
        >
          <Effect id="tone-b" type="duotone" />
          <Effect id="grey-b" type="grayscale" />
        </Clip>
      </Track>
    </Composition>
  );
}
