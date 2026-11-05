import { defineConfig } from "vitepress";

import generated from "./sidebar.generated.json";

export default defineConfig({
  title: "CutCraft",
  description:
    "Video editor as code: a model writes a TSX file with words and shots instead of seconds, the browser plays it, an editor edits the same file, and Node exports it.",
  base: "/cutcraft/",
  cleanUrls: true,
  // Decision records are for contributors and live in the repository, not on the site.
  srcExclude: ["decisions/**"],
  lastUpdated: true,
  // Code in one dark style in both colour schemes, so it reads as the screen it describes and joins the videos above it.
  markdown: { theme: { light: "vitesse-dark", dark: "vitesse-dark" } },
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/cutcraft/favicon.svg" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,600..900&family=Geist+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  ],
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Guide", link: "/guide/introduction" },
      { text: "Examples", link: "/examples" },
      { text: "Recipes", link: "/recipes/" },
      { text: "Reference", link: "/reference/elements/" },
      { text: "Compare", link: "/comparisons/remotion" },
      { text: "GitHub", link: "https://github.com/prefix-tree/cutcraft" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Start",
          items: [
            { text: "Introduction", link: "/guide/introduction" },
            { text: "Quick start", link: "/guide/getting-started" },
          ],
        },
        {
          text: "Writing videos",
          items: [
            { text: "The file", link: "/guide/the-file" },
            { text: "Time by meaning", link: "/guide/time" },
            { text: "Free code", link: "/guide/free-code" },
            { text: "Titles and graphics", link: "/guide/titles-and-graphics" },
            { text: "Captions and sound", link: "/guide/captions-and-sound" },
            { text: "Themes", link: "/guide/themes" },
          ],
        },
        {
          text: "In your app",
          items: [
            { text: "Player", link: "/guide/player" },
            { text: "Editing", link: "/guide/editing" },
            { text: "Exporting", link: "/guide/exporting" },
            { text: "How the export works", link: "/guide/export-architecture" },
          ],
        },
        { text: "Walkthrough", items: [{ text: "A launch video, line by line", link: "/guide/writing-files" }] },
      ],
      // Before "/reference/": the most specific prefix wins only when it comes first.
      "/reference/elements/": [
        { text: "Elements", items: [{ text: "All elements", link: "/reference/elements/" }] },
        ...generated.elements.map((group) => ({ ...group, collapsed: false })),
        {
          text: "Reference",
          items: [
            { text: "Graphics", link: "/reference/graphics/" },
            { text: "What renders", link: "/reference/rendering" },
            { text: "CLI", link: "/reference/cli" },
            { text: "API", link: "/reference/api" },
            { text: "Actions", link: "/reference/actions" },
          ],
        },
      ],
      "/reference/graphics/": [
        { text: "Graphics", items: [{ text: "All graphics", link: "/reference/graphics/" }] },
        ...generated.graphics.map((group) => ({ ...group, collapsed: false })),
        {
          text: "Reference",
          items: [
            { text: "Elements", link: "/reference/elements/" },
            { text: "What renders", link: "/reference/rendering" },
            { text: "CLI", link: "/reference/cli" },
            { text: "API", link: "/reference/api" },
            { text: "Actions", link: "/reference/actions" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Elements", link: "/reference/elements/" },
            { text: "Graphics", link: "/reference/graphics/" },
            { text: "What renders", link: "/reference/rendering" },
            { text: "CLI", link: "/reference/cli" },
            { text: "API", link: "/reference/api" },
            { text: "Actions", link: "/reference/actions" },
          ],
        },
      ],
      "/recipes/": [
        {
          text: "Recipes",
          items: [
            { text: "Overview", link: "/recipes/" },
            { text: "Talking-head cut", link: "/recipes/talking-head" },
            { text: "Product demo with zoom-ins", link: "/recipes/product-demo" },
            { text: "Vertical clip from a podcast", link: "/recipes/vertical-podcast" },
            { text: "Slideshow with motion", link: "/recipes/slideshow" },
            { text: "Stats with handles", link: "/recipes/stats" },
            { text: "Variants from one file", link: "/recipes/variants" },
            { text: "Multicam highlights", link: "/recipes/highlights" },
            { text: "Brand spot in any theme", link: "/recipes/brand-spot" },
          ],
        },
      ],
      "/comparisons/": [
        {
          text: "Compare",
          items: [
            { text: "Remotion", link: "/comparisons/remotion" },
            { text: "Diffusion Studio", link: "/comparisons/diffusion-studio" },
          ],
        },
      ],
    },
    socialLinks: [{ icon: "github", link: "https://github.com/prefix-tree/cutcraft" }],
    search: { provider: "local" },
    editLink: { pattern: "https://github.com/prefix-tree/cutcraft/edit/main/docs/:path" },
    footer: { message: "MIT licensed." },
  },
});
