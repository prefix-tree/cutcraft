import { collectModule, resolve, type AssetManifest, type ResolvedState } from "@cutcut/kit";
import { lint } from "@cutcut/kit/source";
import { Player } from "@cutcut/player";
import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import manifestJson from "../manifest.json";
import text from "../video.tsx?raw";
import * as file from "../video";

const manifest = manifestJson as AssetManifest;
const media = { founder: "/founder.webm", product: "/product.webm", screen: "/screen.webm", music: "/music.ogg", logo: "/logo.png" };
const diagnostics = lint(text, { manifest });

function App() {
  const [tweaks, setTweaks] = useState<Record<string, string>>({});
  const props = { ...file.defaults, ...tweaks };
  const state: ResolvedState = useMemo(() => resolve(collectModule(file, tweaks), manifest), [tweaks]);
  const element = useMemo(() => file.default(props as typeof file.defaults), [props.product, props.tagline, props.accent, props.cta]);
  return (
    <>
      <h1 style={{ fontWeight: 600, fontSize: 20, margin: "0 0 4px" }}>launch recap</h1>
      <p style={{ margin: "0 0 16px", color: "#9aa3b5" }}>
        <code>video.tsx</code> written from <code>brief.md</code> under <code>prompt.md</code>; resolved and played here. Placeholder footage from <code>pnpm gen</code>.
      </p>
      <Player state={state} element={element} media={media} controls />
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 20 }}>
        <div>
          <h2 style={{ fontSize: 14, margin: "0 0 8px", color: "#9aa3b5" }}>Tweaks (<code>schema</code>)</h2>
          {Object.keys(file.defaults).map((key) => (
            <label key={key} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ width: 80 }}>{key}</span>
              <input value={props[key as keyof typeof props]} onChange={(e) => setTweaks({ ...tweaks, [key]: e.target.value })} style={{ flex: 1, background: "#161a24", color: "inherit", border: "1px solid #2a3040", borderRadius: 4, padding: "4px 8px" }} />
            </label>
          ))}
        </div>
        <div>
          <h2 style={{ fontSize: 14, margin: "0 0 8px", color: "#9aa3b5" }}>Checks</h2>
          <p style={{ margin: 0 }}>lint: {diagnostics.length === 0 ? "clean" : diagnostics.map((d) => `${d.rule}: ${d.message}`).join("; ")}</p>
          <p style={{ margin: 0 }}>resolve: {state.errors.length === 0 ? "no errors" : state.errors.map((e) => `${e.id}: ${e.code}`).join("; ")}</p>
          <p style={{ margin: 0 }}>duration: {state.composition.duration.toFixed(2)} s, {state.items.size} addressable elements</p>
        </div>
      </section>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
