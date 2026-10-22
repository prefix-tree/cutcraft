import { devWarn } from "../../warn";
import { useMediaUrl } from "./Svg";
import { dataAttrs, overlayStyle, type ElementProps } from "./shared";

/** An image asset; other `src` schemes (sticker packs) show a labelled placeholder. */
export function Sticker(p: ElementProps) {
  const props = p.placement.props as Record<string, unknown>;
  const src = String(props.src ?? "");
  const isAsset = src.startsWith("asset:");
  const url = useMediaUrl(isAsset ? src : null);
  if (!isAsset) devWarn(`sticker:${p.placement.id}`, `sticker "${src}" on "${p.placement.id}" has no media; showing a placeholder`);
  const size = Math.round(Math.min(p.state.composition.width, p.state.composition.height) / 4);
  const style = overlayStyle(p, { width: size, height: size });
  return (
    <div {...dataAttrs(p.placement)} style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {isAsset && url
        ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        : <div style={{ width: "100%", height: "100%", background: "#333", color: "#ccc", font: "16px monospace", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>{String(props.name ?? src)}</div>}
    </div>
  );
}
