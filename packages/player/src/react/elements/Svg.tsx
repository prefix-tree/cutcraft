import { useEffect, useState } from "react";

import { dataAttrs, type ElementProps, layoutStyle, overlayStyle } from "../../overlays/layout";
import { svgDrawing } from "../../overlays/svg-element";
import { devWarn } from "../../warn";
import { usePlayer } from "../hooks";

/** Inline SVG markup, or an SVG asset read as text, prepared the way the export prepares it. */
export function Svg(p: ElementProps) {
  const props = p.placement.props as Record<string, unknown>;
  const content = typeof props.content === "string" ? props.content : null;
  const text = useMediaText(content === null && typeof props.src === "string" ? props.src : null);
  const markup = content ?? text;
  if (markup === null) return <div {...dataAttrs(p.placement)} style={overlayStyle(p, { width: 0, height: 0 })} />;
  const drawing = svgDrawing(p, markup);
  for (const w of drawing.prepared.warnings) devWarn(`svg:${p.placement.id}:${w}`, `svg "${p.placement.id}": ${w}`);
  return (
    <div
      {...dataAttrs(p.placement)}
      style={{ ...layoutStyle(drawing.layout), lineHeight: 0 }}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: prepareSvg (overlays/svg.ts) parses the markup and drops scripts, foreignObject, frames and event handlers.
      dangerouslySetInnerHTML={{ __html: drawing.prepared.markup }}
    />
  );
}

/** Resolves an `asset:` reference to an object URL or a plain URL. */
export function useMediaUrl(ref: string | null): string | null {
  const core = usePlayer();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!ref) {
      setUrl(null);
      return;
    }
    const id = ref.startsWith("asset:") ? ref.slice(6) : ref;
    let revoke: string | null = null;
    let cancelled = false;
    core
      .resolveMedia(id)
      .then((handle) => {
        if (cancelled) return;
        if (handle.kind === "url") setUrl(handle.url);
        else if (handle.kind === "blob") {
          revoke = URL.createObjectURL(handle.blob);
          setUrl(revoke);
        } else setUrl(null);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [core, ref]);
  return url;
}

/** Reads an `asset:` reference as text, for markup that is inlined rather than loaded as an image. */
export function useMediaText(ref: string | null): string | null {
  const core = usePlayer();
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!ref) {
      setText(null);
      return;
    }
    const id = ref.startsWith("asset:") ? ref.slice(6) : ref;
    let cancelled = false;
    core
      .resolveMedia(id)
      .then((handle) =>
        handle.kind === "url"
          ? fetch(handle.url).then((r) => r.text())
          : handle.kind === "blob"
            ? handle.blob.text()
            : null,
      )
      .then((t) => {
        if (!cancelled) setText(t);
      })
      .catch(() => {
        if (!cancelled) setText(null);
      });
    return () => {
      cancelled = true;
    };
  }, [core, ref]);
  return text;
}
