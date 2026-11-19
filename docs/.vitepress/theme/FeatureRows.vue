<!-- The landing page's features as a list of big uppercase rows, each a link to the page that explains it. Hovering
     or focusing a row plays its clip in a small window at the corner; on a touch screen the window stays hidden. -->
<script setup lang="ts">
import { withBase } from "vitepress";
import { ref } from "vue";

interface Row {
  readonly title: string;
  readonly text: string;
  readonly link: string;
  /** The clip, as `<src>.webm` and `<src>.jpg` under `docs/public`. */
  readonly src: string;
}

const props = defineProps<{ rows: Row[] }>();
const active = ref<Row>();
// A reader who asked for reduced motion gets the poster, not the clip.
const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
</script>

<template>
  <div class="cc-rows" @mouseleave="active = undefined">
    <a v-for="row in props.rows" :key="row.link" class="cc-row" :href="withBase(row.link)"
      @mouseenter="active = row" @focus="active = row" @blur="active = undefined">
      <span class="cc-row-title">{{ row.title }}</span>
      <span class="cc-row-text">{{ row.text }}</span>
    </a>
    <div class="cc-rows-peek" :class="{ on: active }" aria-hidden="true">
      <video v-if="active" :key="active.src" :src="withBase(`/${active.src}.webm`)" :poster="withBase(`/${active.src}.jpg`)"
        :autoplay="!still" muted loop playsinline></video>
    </div>
  </div>
</template>
