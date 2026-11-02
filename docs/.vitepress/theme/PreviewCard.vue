<!-- One item of an index grid: its preview, its name and a line about it, all one link. -->
<script setup lang="ts">
import { withBase } from "vitepress";
import Preview from "./Preview.vue";

const props = defineProps<{ title: string; link: string; src?: string; text?: string; code?: boolean }>();
</script>

<template>
  <a class="cc-card" :href="withBase(props.link)">
    <Preview v-if="props.src" :src="props.src" :alt="props.title" />
    <span class="cc-card-title"><code v-if="props.code">{{ props.title }}</code><template v-else>{{ props.title }}</template></span>
    <span v-if="props.text" class="cc-card-text">{{ props.text }}</span>
  </a>
</template>
