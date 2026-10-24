import { stickerPlaceholder, stickerSize } from "../../overlays/content";
import { dataAttrs, overlayStyle, type ElementProps } from "../../overlays/layout";
import { devWarn } from "../../warn";
import { useMediaUrl } from "./Svg";

/** An image asset; other `src` schemes (sticker packs) show a labelled placeholder. */
export function Sticker(p: ElementProps) {
  const props = p.placement.props as Record<string, unknown>;
  const src = String(props.src ?? "");
  const isAsset = src.startsWith("asset:");
  const url = useMediaUrl(isAsset ? src : null);
  if (!isAsset) devWarn(`sticker:${p.placement.id}`, `sticker "${src}" on "${p.placement.id}" has no media; showing a placeholder`);
  const size = stickerSize(p);
  const style = overlayStyle(p, { width: size, height: size });
  return (
    <div {...dataAttrs(p.placement)} style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {isAsset && url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : stickerPlaceholder(String(props.name ?? src))}
    </div>
  );
}
