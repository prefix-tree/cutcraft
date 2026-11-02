import { z } from "zod";
import { Angle, Clip, Composition, Cut, Multicam, Title, Track } from "@cutcraft/kit";

export const schema = z.object({
  title: z.string().describe("Lower-third title"),
});

export const defaults = { title: "Highlights" };

/**
 * Highlights from a two-camera recording. The multicam switches to camera B
 * at its shot boundaries; `multicam/flatten` turns the cuts into literal
 * clips once the switching is settled. The dense segment is picked by the
 * transcript's silences on camera A and kept on a hidden track as a
 * reference for the next pass.
 */
export default function Video({ title }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} background={{ mode: "color", color: "#000000" }}>
      <Track id="cams" layout="free" name="Cameras">
        {/* Cuts take seconds; these sit on camera B's shot boundaries at 10 and 25. */}
        <Multicam id="mc" sync={0}>
          <Angle id="a" src="asset:cam-a" />
          <Angle id="b" src="asset:cam-b" />
          <Cut id="cut-1" at={0} angle="a" />
          <Cut id="cut-2" at={10} angle="b" />
          <Cut id="cut-3" at={25} angle="a" />
        </Multicam>
      </Track>

      <Track id="pull" name="Pull quote" hidden>
        {/* Between the first long pause and the second: the sentence everyone quotes. */}
        <Clip id="dense" src="asset:cam-a" in="silence:0.end" out="silence:1" />
      </Track>

      <Track id="overlays" name="Overlays">
        <Title id="lower" anchor="start" offset={0.5} duration={4} size={72} weight={700} align="left" valign="bottom" transform={{ position: { x: 120, y: -140 } }} animation={{ preset: "slide-left", in: 0.3, out: 0.3 }}>
          {title}
        </Title>
      </Track>
    </Composition>
  );
}
