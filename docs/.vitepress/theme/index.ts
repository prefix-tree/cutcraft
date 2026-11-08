// The default theme dressed as a Craft app: warm paper, ink, one vermilion accent from the icon, a wide display face for
// headlines, monospaced labels and hairline rules. Components of our own: rendered previews, examples (a preview with
// its code), the cards of the reference indexes, the landing page's hero video and copy command, and the live playground.

import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";

import CopyCommand from "./CopyCommand.vue";
import Example from "./Example.vue";
import HeroVideo from "./HeroVideo.vue";
import Playground from "./Playground.vue";
import Preview from "./Preview.vue";
import PreviewCard from "./PreviewCard.vue";
import "./craft.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("CopyCommand", CopyCommand);
    app.component("Example", Example);
    app.component("HeroVideo", HeroVideo);
    app.component("Playground", Playground);
    app.component("Preview", Preview);
    app.component("PreviewCard", PreviewCard);
  },
} satisfies Theme;
