import { defineConfig } from "vitepress";

import generated from "./sidebar.generated.json";

export default defineConfig({
  title: "UberScene",
  description:
    "Video editor as code: LLMs write code well and math badly, so a model writes a TSX file of words and shots, and UberScene does the arithmetic, plays it in the browser, edits it and exports it.",
  base: "/",
  cleanUrls: true,
  // The decision records are for the repository, not the site.
  srcExclude: ["decisions/**"],
  lastUpdated: true,
  // GitHub's code colours: light code on a light docs page, dark in the dark. The landing page keeps its code on dark
  // panels with the dark colours (theme/craft.css).
  markdown: { theme: { light: "github-light", dark: "github-dark" } },
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Big+Shoulders+Stencil+Display:wght@800;900&family=Geist+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  ],
  // The playground (theme/playground) is React: JSX compiles to the automatic runtime, as in the packages.
  // Its player, editor and the in-browser compiler are one lazy chunk (about 700 KB gzipped), fetched only where a
  // playground is on screen, so Vite's size warning is raised past it.
  vite: {
    esbuild: { jsx: "automatic" },
    build: { chunkSizeWarningLimit: 3000 },
    // The dev server's pre-bundled @babel/types reads this env var, and the browser has no `process`; the build
    // replaces it already.
    optimizeDeps: { esbuildOptions: { define: { "process.env.BABEL_TYPES_8_BREAKING": "false" } } },
  },
  themeConfig: {
    logo: "/logo.svg",
    // The top bar names three ways in, as short as a poster (on every page, the landing one included); the sidebar is the map of the docs.
    nav: [
      { text: "Docs", link: "/guide/introduction", activeMatch: "^/(guide|reference)/" },
      { text: "Examples", link: "/examples/", activeMatch: "^/(examples|recipes)" },
      { text: "Playground", link: "/playground", activeMatch: "^/playground" },
    ],
    sidebar: [
      {
        text: "Get started",
        items: [
          { text: "Introduction", link: "/guide/introduction" },
          { text: "Quick start", link: "/guide/getting-started" },
          { text: "With your agent", link: "/guide/agents" },
        ],
      },
      {
        // The model a reader needs before the task guides, in reading order.
        text: "Concepts",
        items: [
          { text: "Anatomy of a video", link: "/guide/anatomy" },
          { text: "Anatomy of an element", link: "/guide/elements" },
          { text: "Timing", link: "/guide/time" },
          { text: "The file", link: "/guide/the-file" },
        ],
      },
      {
        text: "Build a video",
        items: [
          { text: "Titles and graphics", link: "/guide/titles-and-graphics" },
          { text: "Captions and sound", link: "/guide/captions-and-sound" },
          { text: "Transitions", link: "/guide/transitions" },
          { text: "Colour and grading", link: "/guide/colour" },
          { text: "Keying, blurs and pins", link: "/guide/footage-tools" },
          { text: "Themes and fonts", link: "/guide/themes" },
          { text: "Free code", link: "/guide/free-code" },
          { text: "Blocks", link: "/guide/blocks" },
          { text: "Your own effects", link: "/guide/custom-effects" },
        ],
      },
      {
        text: "Check and export",
        items: [
          { text: "Checking a cut", link: "/guide/checking" },
          { text: "Exporting", link: "/guide/exporting" },
        ],
      },
      {
        text: "Architecture",
        items: [
          { text: "Overview", link: "/guide/architecture" },
          { text: "How the player draws", link: "/guide/how-the-player-draws" },
          { text: "How the export works", link: "/guide/export-architecture" },
          { text: "Native codecs (experimental)", link: "/guide/native-codecs" },
        ],
      },
      {
        text: "Embed and edit",
        items: [
          { text: "Player", link: "/guide/player" },
          { text: "Editing", link: "/guide/editing" },
        ],
      },
      {
        text: "Examples",
        items: [
          {
            text: "Showcase",
            link: "/examples/",
            collapsed: true,
            items: [
              { text: "The logo film", link: "/examples/hero" },
              { text: "A coffee film", link: "/examples/coffee" },
              { text: "A product launch", link: "/examples/launch" },
              { text: "Kinetic type", link: "/examples/kinetic" },
              { text: "A data story", link: "/examples/data" },
              { text: "A logo reveal", link: "/examples/logo" },
              { text: "An edit", link: "/examples/edit" },
              { text: "Captions and key points", link: "/examples/captions" },
              { text: "How game lighting fakes it", link: "/examples/game-lighting" },
              { text: "A talking head with a diagram", link: "/examples/lunar-eclipse" },
              { text: "One pixel", link: "/examples/one-pixel" },
              { text: "An interview that changes layout", link: "/examples/hundred-videos" },
              { text: "A game of snake that ends in a heart", link: "/examples/snake-heart" },
              { text: "From notes to a cut", link: "/examples/notes-to-cut" },
            ],
          },
          { text: "A launch video, line by line", link: "/guide/writing-files" },
          {
            text: "Recipes",
            link: "/recipes/",
            collapsed: true,
            items: [
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
            text: "Components",
            link: "/reference/components/",
            collapsed: true,
            items: generated.components,
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
          { text: "What renders", link: "/reference/rendering" },
          { text: "CLI", link: "/reference/cli" },
          { text: "API", link: "/reference/api" },
          { text: "Actions", link: "/reference/actions" },
        ],
      },
      {
        text: "Project",
        items: [
          { text: "Core principles", link: "/guide/principles" },
          { text: "Changelog", link: "https://github.com/prefix-tree/uberscene/blob/main/packages/kit/CHANGELOG.md" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/prefix-tree/uberscene" }],
    search: { provider: "local" },
    editLink: { pattern: "https://github.com/prefix-tree/uberscene/edit/main/docs/:path" },
    footer: { message: "MIT licensed." },
  },
});
