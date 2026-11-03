import { titleBox, titleContent } from "../../overlays/content";
import { dataAttrs, type ElementProps, overlayStyle } from "../../overlays/layout";

/** Text title: the file's text content with font props; entrance/exit presets as CSS transforms. */
export function Title(p: ElementProps & { readonly text: string }) {
  const comp = p.state.composition;
  return (
    <div {...dataAttrs(p.placement)} style={overlayStyle(p, titleBox(p.placement.props, comp))}>
      {titleContent(p)}
    </div>
  );
}
