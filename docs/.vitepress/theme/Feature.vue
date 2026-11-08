<!-- One section of the landing page: a rendered video beside a heading, a few lines and a short excerpt of the file,
     with a link to the page that explains it. `reverse` puts the video on the right. -->
<script setup lang="ts">
import { withBase } from "vitepress";
import Preview from "./Preview.vue";

const props = defineProps<{ title: string; src: string; link: string; more?: string; reverse?: boolean }>();
</script>

<template>
  <section :class="['cc-feature', { reverse: props.reverse }]">
    <div class="cc-feature-media">
      <Preview :src="props.src" :alt="props.title" />
    </div>
    <div class="cc-feature-text">
      <h2>{{ props.title }}</h2>
      <slot />
      <a class="cc-feature-more" :href="withBase(props.link)">{{ props.more ?? "Learn more" }} →</a>
    </div>
  </section>
</template>
