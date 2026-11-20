import { forwardRef, type MouseEvent } from "react";

import { type PlayerRef, PlayerView, type PlayerViewProps } from "@uberscene/player";

import { useEditor } from "./context";

/**
 * The player's picture. A click selects the topmost overlay under the pointer.
 * shortcut: footage and shaders are drawn on the canvas and have no DOM box, so clicking them selects nothing;
 * hit-test the frame plan when the Timeline is not enough to select them.
 */
export const Preview = forwardRef<PlayerRef, PlayerViewProps>(function Preview(props, ref) {
  const { state, select } = useEditor();
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    // Overlays are pointer-events: none, so the click lands on the canvas; find the boxes under it instead.
    const boxes = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-el]")].filter((el) => {
      if (el.dataset.el === state.composition.id) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    select(boxes.at(-1)?.dataset.el ?? null);
  };
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: pointer shortcut; Layers is the keyboard path to selection.
    <div data-editor-preview="" onClick={onClick}>
      <PlayerView ref={ref} {...props} />
    </div>
  );
});
