import { stickerPlaceholder, stickerSize } from "../../overlays/content";
import { dataAttrs, type ElementProps, overlayStyle } from "../../overlays/layout";
import { useMediaUrl } from "./Svg";

/**
 * An image asset (`asset:party`), fitted into its box; a labelled placeholder shows until it has loaded, marked
 * `data-pending` so an export waits for the image instead of capturing the placeholder.
 */
export function Sticker(p: ElementProps) {
  const props = p.placement.props as Record<string, unknown>;
  const src = String(props.src ?? "");
  const url = useMediaUrl(src.startsWith("asset:") ? src : null);
  const size = stickerSize(p);
  const style = overlayStyle(p, { width: size, height: size });
  return (
    <div
      {...dataAttrs(p.placement)}
      {...(url ? {} : { "data-pending": "" })}
      style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {url ? (
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      ) : (
        stickerPlaceholder(src)
      )}
    </div>
  );
}
