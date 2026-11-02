// The default theme dressed as a Craft app: warm paper, ink, one vermilion accent from the icon, a wide display face for
// headlines, monospaced labels and hairline rules. Components of our own: rendered previews, examples (a preview with
// its code) and the cards of the reference indexes.
import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Example from "./Example.vue";
import Preview from "./Preview.vue";
import PreviewCard from "./PreviewCard.vue";
import "./craft.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("Example", Example);
    app.component("Preview", Preview);
    app.component("PreviewCard", PreviewCard);
  },
} satisfies Theme;
