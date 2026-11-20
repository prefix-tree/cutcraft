// Editor parts that share one player: drop them anywhere under <Editor.Root>.
import { Controls } from "@uberscene/player";

import { Layers } from "./Layers";
import { Preview } from "./Preview";
import { Root } from "./Root";
import { Timeline } from "./Timeline";

export const Editor = { Root, Preview, Controls, Layers, Timeline };

export { type EditApi, type EditorValue, useEdit, useEditor, useSelection } from "./context";
export { Layers } from "./Layers";
export { Preview } from "./Preview";
export { Root, type RootProps } from "./Root";
export { Timeline } from "./Timeline";
