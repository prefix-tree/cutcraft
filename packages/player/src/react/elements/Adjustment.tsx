import { filterString } from "../../model/effects";
import { dataAttrs, type ElementProps } from "./shared";

/** Backdrop filter over the DOM items beneath it; the canvas part is the painter's adjustment op. */
export function Adjustment(p: ElementProps) {
  const { filter } = filterString(p.children, p.placement.id);
  const opacity = Number(p.placement.props.opacity ?? 1);
  return (
    <div
      {...dataAttrs(p.placement)}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity, ...(filter ? { backdropFilter: filter, WebkitBackdropFilter: filter } : {}) }}
    />
  );
}
