import { defineConfig } from "vitepress";

export default defineConfig({
  title: "cutcut",
  description: "A video-editing DSL: a model writes a TSX file, the browser renders it, the editor edits the same file.",
  base: "/cutcut/",
  cleanUrls: true,
  lastUpdated: true,
  head: [["link", { rel: "icon", type: "image/svg+xml", href: "/cutcut/favicon.svg" }]],
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Reference", link: "/reference/elements" },
      { text: "Decisions", link: "/decisions/" },
      { text: "Recipes", link: "/recipes/" },
      { text: "Comparisons", link: "/comparisons/diffusion-studio" },
      { text: "GitHub", link: "https://github.com/bsnisar/cutcut" },
    ],
    sidebar: {
      "/guide/": [
        { text: "Guide", items: [
          { text: "Getting started", link: "/guide/getting-started" },
          { text: "Writing a file", link: "/guide/writing-files" },
          { text: "Editing", link: "/guide/editing" },
          { text: "Themes and style", link: "/guide/themes" },
          { text: "Rendering", link: "/guide/rendering" },
          { text: "Exporting", link: "/guide/exporting" },
        ] },
      ],
      "/reference/": [
        { text: "Reference", items: [
          { text: "Elements", link: "/reference/elements" },
          { text: "Actions", link: "/reference/actions" },
          { text: "Specification (kit)", link: "https://github.com/bsnisar/cutcut/blob/main/packages/kit/docs/spec.md" },
          { text: "OpenReel parity (kit)", link: "https://github.com/bsnisar/cutcut/blob/main/packages/kit/docs/parity.md" },
        ] },
      ],
      "/decisions/": [
        { text: "Decisions", items: [
          { text: "Index", link: "/decisions/" },
          { text: "0001 The file is the video", link: "/decisions/0001-the-file-is-the-video" },
          { text: "0002 Fixed vocabulary and literal ids", link: "/decisions/0002-fixed-vocabulary-and-literal-ids" },
          { text: "0003 Patch log and four-faced actions", link: "/decisions/0003-patch-log-and-four-faced-actions" },
          { text: "0004 The model edits text", link: "/decisions/0004-the-model-edits-text" },
          { text: "0005 Sequence tracks and anchors", link: "/decisions/0005-sequence-tracks-and-anchors" },
          { text: "0006 Time references", link: "/decisions/0006-time-references-against-a-manifest" },
          { text: "0007 The browser renders", link: "/decisions/0007-the-browser-renders" },
          { text: "0008 Document-order compositing", link: "/decisions/0008-tracks-composite-in-document-order" },
          { text: "0009 Helpers, layers, editability", link: "/decisions/0009-helpers-layers-and-editability" },
          { text: "0010 OpenReel as the reference", link: "/decisions/0010-openreel-as-the-ux-reference" },
          { text: "0011 Performance contract", link: "/decisions/0011-performance-contract" },
          { text: "0012 What we adopt from Diffusion Studio", link: "/decisions/0012-what-we-adopt-from-diffusion-studio" },
          { text: "0013 Remotion and Layer handles", link: "/decisions/0013-remotion-has-an-editor-and-layer-handles" },
          { text: "0014 Captions follow the clips", link: "/decisions/0014-captions-follow-the-clips" },
          { text: "0015 A headless engine exports", link: "/decisions/0015-a-headless-engine-renders-the-export" },
          { text: "0016 A theme lives in the file", link: "/decisions/0016-a-theme-lives-in-the-file" },
        ] },
      ],
      "/recipes/": [
        { text: "Recipes", items: [
          { text: "Overview", link: "/recipes/" },
          { text: "Talking-head cut", link: "/recipes/talking-head" },
          { text: "Product demo with zoom-ins", link: "/recipes/product-demo" },
          { text: "Vertical clip from a podcast", link: "/recipes/vertical-podcast" },
          { text: "Slideshow with motion", link: "/recipes/slideshow" },
          { text: "Stats with handles", link: "/recipes/stats" },
          { text: "Variants from one file", link: "/recipes/variants" },
          { text: "Multicam highlights", link: "/recipes/highlights" },
        ] },
      ],
      "/comparisons/": [
        { text: "Comparisons", items: [
          { text: "Diffusion Studio", link: "/comparisons/diffusion-studio" },
          { text: "Remotion", link: "/comparisons/remotion" },
        ] },
      ],
    },
    socialLinks: [{ icon: "github", link: "https://github.com/bsnisar/cutcut" }],
    search: { provider: "local" },
    editLink: { pattern: "https://github.com/bsnisar/cutcut/edit/main/docs/:path" },
    footer: { message: "MIT licensed." },
  },
});
