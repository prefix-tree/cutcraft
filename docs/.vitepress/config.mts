import { defineConfig } from "vitepress";

import generated from "./sidebar.generated.json";

export default defineConfig({
  title: "CutCraft",
  description:
    "Video editor as code: LLMs write code well and math badly, so a model writes a TSX file of words and shots, and CutCraft does the arithmetic, plays it in the browser, edits it and exports it.",
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
  // The playground (theme/playground) is React: JSX compiles to the automatic runtime, as in the packages.
  // Its player, editor and the in-browser compiler are one lazy chunk (about 700 KB gzipped), fetched only where a
  // playground is on screen, so Vite's size warning is raised past it.
  vite: { esbuild: { jsx: "automatic" }, build: { chunkSizeWarningLimit: 3000 } },
  themeConfig: {
    logo: "/logo.svg",
    // The top bar names the four ways in (on every page, the landing one included); the sidebar is the map of the docs.
    nav: [
      { text: "Guide", link: "/guide/introduction", activeMatch: "^/(guide|recipes)/" },
      { text: "Reference", link: "/reference/elements/", activeMatch: "^/reference/(?!effects|transitions)" },
      { text: "Effects", link: "/reference/effects/", activeMatch: "^/reference/(effects|transitions)/" },
      { text: "Examples", link: "/examples", activeMatch: "^/examples" },
      { text: "Playground", link: "/playground", activeMatch: "^/playground" },
    ],
    sidebar: [
      {
        text: "Get started",
        items: [
          { text: "Introduction", link: "/guide/introduction" },
          { text: "Quick start", link: "/guide/getting-started" },
          { text: "A launch video, line by line", link: "/guide/writing-files" },
          { text: "Examples", link: "/examples" },
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
          { text: "Colour and grading", link: "/guide/colour" },
          { text: "Keying, blurs and pins", link: "/guide/footage-tools" },
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
      {
        text: "Recipes",
        collapsed: true,
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
      {
        text: "Reference",
        collapsed: true,
        items: [
          {
            text: "Elements",
            link: "/reference/elements/",
            collapsed: true,
            items: generated.elements.map((group) => ({ ...group, collapsed: true })),
          },
          {
            text: "Effects and transitions",
            link: "/reference/effects/",
            collapsed: true,
            items: [
              ...generated.effects.map((group) => ({ ...group, collapsed: true })),
              ...generated.transitions.map((group) => ({
                ...group,
                text: `Transitions: ${group.text}`,
                collapsed: true,
              })),
            ],
          },
          {
            text: "Graphics",
            link: "/reference/graphics/",
            collapsed: true,
            items: generated.graphics.map((group) => ({ ...group, collapsed: true })),
          },
          { text: "What renders", link: "/reference/rendering" },
          { text: "CLI", link: "/reference/cli" },
          { text: "API", link: "/reference/api" },
          { text: "Actions", link: "/reference/actions" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/prefix-tree/cutcraft" }],
    search: { provider: "local" },
    editLink: { pattern: "https://github.com/prefix-tree/cutcraft/edit/main/docs/:path" },
    footer: { message: "MIT licensed." },
  },
});
