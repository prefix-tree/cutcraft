import { useEffect, useState } from "react";
import { usePlayer } from "../hooks";
import { dataAttrs, overlayStyle, type ElementProps } from "../../overlays/layout";

/** Inline SVG markup, or an SVG asset through the media resolver. */
export function Svg(p: ElementProps) {
  const props = p.placement.props as Record<string, unknown>;
  const comp = p.state.composition;
  const style = overlayStyle(p, { width: comp.width, height: comp.height });
  const content = typeof props.content === "string" ? props.content : null;
  const src = typeof props.src === "string" ? props.src : null;
  const url = useMediaUrl(src);
  const tint = props.color as { mode: string; tint?: string; opacity?: number } | undefined;
  const filter = tint?.mode === "tint" && tint.tint ? { filter: `drop-shadow(0 0 0 ${tint.tint})` } : {};
  return (
    <div {...dataAttrs(p.placement)} style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {content
        ? <div style={{ width: "100%", height: "100%", ...filter }} dangerouslySetInnerHTML={{ __html: content }} />
        : url ? <img src={url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", ...filter }} /> : null}
    </div>
  );
}

/** Resolves an `asset:` reference to an object URL or a plain URL. */
export function useMediaUrl(ref: string | null): string | null {
  const core = usePlayer();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!ref) { setUrl(null); return; }
    const id = ref.startsWith("asset:") ? ref.slice(6) : ref;
    let revoke: string | null = null;
    let cancelled = false;
    core.resolveMedia(id).then((handle) => {
      if (cancelled) return;
      if (handle.kind === "url") setUrl(handle.url);
      else if (handle.kind === "blob") { revoke = URL.createObjectURL(handle.blob); setUrl(revoke); }
      else setUrl(null);
    }).catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke); };
  }, [core, ref]);
  return url;
}
