import { z } from "zod";
import { Clip, Composition, Layer, Title, Track, useLayer } from "@cutcut/kit";

export const schema = z.object({
  accent: z.string().describe("Number colour"),
});

export const defaults = { accent: "#7cff8a" };

/**
 * Two numbers count up over a product shot. Each counter is the one
 * component inside a Layer, so its `value` and `label` are handles the
 * editor can change without reading the component; `accent` is bound to
 * the schema and an edit writes to `defaults`.
 */
export default function Video({ accent }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080} background={{ mode: "color", color: "#0b0d12" }}>
      <Track id="main" name="Footage">
        <Clip id="bg" src="asset:product" in="shot:1" out="shot:1.end" fit="cover" transform={{ opacity: 0.5 }} />
        <Clip id="bg2" src="asset:product" in="shot:2" out="shot:2.end" fit="cover" transform={{ opacity: 0.5 }} />
      </Track>

      <Track id="numbers" name="Numbers">
        <Title id="heading" anchor="bg" offset={0.3} duration={11} size={64} weight={600} valign="top" transform={{ position: { x: 0, y: 140 } }}>
          Last quarter
        </Title>
        <Layer id="stat-deploys" anchor="bg" offset={0.8} duration={5} transform={{ position: { x: -360, y: 0 } }}>
          <Counter value={12800} label="deployments" accent={accent} />
        </Layer>
        <Layer id="stat-uptime" anchor="bg2" offset={0.4} duration={5} transform={{ position: { x: 360, y: 0 } }}>
          <Counter value={99.97} label="% uptime" accent={accent} />
        </Layer>
      </Track>
    </Composition>
  );
}

/** Counts from 0 to `value` over the first 60% of the layer, on the layer's clock, so scrubbing shows the right number. */
function Counter({ value, label, accent }: { value: number; label: string; accent: string }) {
  const { t } = useLayer();
  const shown = value * Math.min(1, t / 0.6);
  const text = Number.isInteger(value) ? Math.round(shown).toLocaleString("en-US") : shown.toFixed(2);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <div style={{ font: "700 160px Inter, system-ui, sans-serif", color: accent, fontVariantNumeric: "tabular-nums" }}>{text}</div>
      <div style={{ font: "400 40px Inter, system-ui, sans-serif", color: "#c8ccd6" }}>{label}</div>
    </div>
  );
}
