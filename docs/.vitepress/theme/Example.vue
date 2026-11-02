<!-- An example: the video the export renders, with the code that made it right under it. -->
<script setup lang="ts">
import Preview from "./Preview.vue";

const props = defineProps<{ src: string; alt?: string }>();
</script>

<template>
  <figure class="cc-example">
    <Preview :src="props.src" :alt="props.alt" />
    <div class="cc-example-code"><slot /></div>
  </figure>
</template>
