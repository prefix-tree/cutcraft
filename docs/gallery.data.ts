import { readFileSync } from "node:fs";

/** One tile of the landing page's gallery: a rendered example, what kind of video it is, and the file that made it. */
export interface GalleryItem {
  readonly title: string;
  readonly kind: string;
  /** The preview, as `<src>.webm` and `<src>.jpg` under `docs/public`. */
  readonly src: string;
  /** Width over height, so a tile holds its shape before its poster loads. */
  readonly aspect: number;
  readonly link: string;
  /** The file's length in lines, counted at build time so the caption cannot drift from the file. */
  readonly lines: number;
}

// CSS columns fill top to bottom, one column after another: ordered so the four columns end at about the same height.
const ITEMS: readonly (Omit<GalleryItem, "lines"> & { readonly file: string })[] = [
  {
    title: "A coffee film",
    kind: "Edit",
    src: "showcase/coffee",
    aspect: 16 / 9,
    link: "/examples/coffee",
    file: "showcase/coffee.tsx",
  },
  {
    title: "The logo film",
    kind: "Logo film",
    src: "showcase/hero",
    aspect: 16 / 9,
    link: "/examples/hero",
    file: "showcase/hero.tsx",
  },
  {
    title: "How game lighting fakes it",
    kind: "3D explainer",
    src: "shorts/game-lighting",
    aspect: 9 / 16,
    link: "/examples/game-lighting",
    file: "shorts/game-lighting.tsx",
  },
  {
    title: "A product launch",
    kind: "Product launch",
    src: "showcase/launch",
    aspect: 16 / 9,
    link: "/examples/launch",
    file: "showcase/launch.tsx",
  },
  {
    title: "A data story",
    kind: "Data story",
    src: "showcase/data",
    aspect: 16 / 9,
    link: "/examples/data",
    file: "showcase/data.tsx",
  },
  {
    title: "One pixel",
    kind: "Narrated explainer",
    src: "shorts/one-pixel",
    aspect: 9 / 16,
    link: "/examples/one-pixel",
    file: "shorts/one-pixel.tsx",
  },
  {
    title: "The interview, before and after",
    kind: "Before and after",
    src: "shorts/hundred-videos-compare",
    aspect: 4 / 5,
    link: "/examples/hundred-videos",
    file: "shorts/cards/hundred-videos-compare.tsx",
  },
  {
    title: "A logo reveal",
    kind: "Logo reveal",
    src: "showcase/logo",
    aspect: 16 / 9,
    link: "/examples/logo",
    file: "showcase/logo.tsx",
  },
  {
    title: "A talking head with a diagram",
    kind: "Talking-head short",
    src: "shorts/lunar-eclipse",
    aspect: 9 / 16,
    link: "/examples/lunar-eclipse",
    file: "shorts/lunar-eclipse.tsx",
  },
  {
    title: "Kinetic type",
    kind: "Kinetic type",
    src: "showcase/kinetic",
    aspect: 9 / 16,
    link: "/examples/kinetic",
    file: "showcase/kinetic.tsx",
  },
  {
    title: "An interview that changes layout",
    kind: "Interview short",
    src: "shorts/hundred-videos",
    aspect: 9 / 16,
    link: "/examples/hundred-videos",
    file: "shorts/hundred-videos.tsx",
  },
  {
    title: "An edit",
    kind: "Edit",
    src: "showcase/edit",
    aspect: 16 / 9,
    link: "/examples/edit",
    file: "showcase/edit.tsx",
  },
  {
    title: "Captions and key points",
    kind: "Captions",
    src: "showcase/captions",
    aspect: 9 / 16,
    link: "/examples/captions",
    file: "showcase/captions.tsx",
  },
  {
    title: "A game of snake that ends in a heart",
    kind: "Generative short",
    src: "shorts/snake-heart",
    aspect: 9 / 16,
    link: "/examples/snake-heart",
    file: "shorts/snake-heart.tsx",
  },
  {
    title: "From notes to a cut",
    kind: "Built from blocks",
    src: "shorts/notes-to-cut",
    aspect: 9 / 16,
    link: "/examples/notes-to-cut",
    file: "shorts/notes-to-cut.tsx",
  },
];

const examples = new URL("../examples/", import.meta.url);

export default {
  watch: ITEMS.map((item) => `../examples/${item.file}`),
  load(): GalleryItem[] {
    return ITEMS.map(({ file, ...item }) => ({
      ...item,
      lines: readFileSync(new URL(file, examples), "utf8").trimEnd().split("\n").length,
    }));
  },
};
