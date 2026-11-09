// The live playground: a CodeMirror editor and the CutCraft player, mounted in the page by Playground.vue. The file is
// compiled in the browser (loadModule), resolved against the two clips in docs/public/playground, and played. It runs
// again 400 ms after typing stops; a file that fails keeps the last good picture and says what is wrong.
import { javascript } from "@codemirror/lang-javascript";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { basicSetup, EditorView } from "codemirror";
import { createRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { type AssetManifest, collectModule, type ResolvedState, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";
import { Player, type PlayerRef } from "@cutcraft/player";
import "@cutcraft/player/fonts.css";

import { MANIFEST } from "./starters";

export interface PlaygroundOptions {
  readonly editor: HTMLElement;
  readonly player: HTMLElement;
  readonly code: string;
  /** The site's base URL, for the clips (`/`). */
  readonly base: string;
  /** What is wrong with the file, or null once it plays. */
  readonly onError: (message: string | null) => void;
  /** The file as it now reads, for the share link. */
  readonly onChange?: (code: string) => void;
}

export interface Playground {
  /** Replaces the file (a starter or a shared link) and plays it. */
  setCode(code: string): void;
  /** The player, for tests and the page's own controls. */
  readonly player: () => PlayerRef | null;
  destroy(): void;
}

/** The editor's look: the site's dark code panel, in both colour schemes. */
const theme = EditorView.theme(
  {
    "&": { height: "100%", fontSize: "13px", backgroundColor: "#14141a", color: "#e6e3dc" },
    ".cm-content": { fontFamily: "var(--cc-mono)", caretColor: "#e0563d", padding: "12px 0" },
    ".cm-gutters": { backgroundColor: "#14141a", color: "#5c5a63", border: "none" },
    ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#1d1d25" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "#33333f !important" },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": { lineHeight: "1.6" },
  },
  { dark: true },
);

/** Syntax colours after the site's code blocks (Vitesse Dark), legible on the dark panel. */
const colours = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: "#4d9375" },
  { tag: [t.string, t.special(t.string)], color: "#c98a7d" },
  { tag: [t.number, t.bool, t.null], color: "#4c9a91" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#758575", fontStyle: "italic" },
  { tag: [t.tagName, t.typeName, t.className], color: "#80a665" },
  { tag: [t.attributeName, t.propertyName], color: "#b8a965" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#80a665" },
  { tag: [t.variableName, t.definition(t.variableName)], color: "#bd976a" },
  { tag: [t.punctuation, t.bracket, t.angleBracket, t.separator], color: "#666666" },
  { tag: t.operator, color: "#cb7676" },
]);

export function mountPlayground(options: PlaygroundOptions): Playground {
  const media = {
    aurora: `${options.base}playground/aurora.webm`,
    product: `${options.base}playground/product.webm`,
  };
  const root: Root = createRoot(options.player);
  const ref = createRef<PlayerRef>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let shown = false;

  /** Compiles and resolves the file; on any failure, says why and leaves the last picture playing. */
  function run(code: string): void {
    let state: ResolvedState;
    let element: ReactNode;
    try {
      const file = loadModule(code);
      state = resolve(collectModule(file), MANIFEST as unknown as AssetManifest);
      element = file.default(file.defaults ?? {});
    } catch (error) {
      options.onError(error instanceof Error ? error.message : String(error));
      return;
    }
    if (state.errors.length > 0) {
      options.onError(state.errors.map((e) => `${e.id}: ${e.message}`).join("\n"));
      if (shown) return;
    } else options.onError(null);
    shown = true;
    root.render(<Player ref={ref} state={state} element={element} media={media} controls loop autoPlay />);
  }

  const view = new EditorView({
    doc: options.code,
    parent: options.editor,
    extensions: [
      basicSetup,
      javascript({ jsx: true, typescript: true }),
      theme,
      syntaxHighlighting(colours),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        const code = update.state.doc.toString();
        options.onChange?.(code);
        clearTimeout(timer);
        timer = setTimeout(() => run(code), 400);
      }),
    ],
  });
  run(options.code);

  return {
    setCode(code) {
      clearTimeout(timer);
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
      clearTimeout(timer);
      run(code);
    },
    player: () => ref.current,
    destroy() {
      clearTimeout(timer);
      view.destroy();
      root.unmount();
    },
  };
}
