<!-- A shell command on one line with a button that copies it. -->
<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{ command: string }>();
const copied = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.command);
    copied.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => (copied.value = false), 1600);
  } catch {
    copied.value = false;
  }
}
</script>

<template>
  <div class="cc-command">
    <code><span class="cc-command-prompt" aria-hidden="true">$</span>{{ props.command }}</code>
    <button type="button" :aria-label="copied ? 'Copied' : 'Copy the command'" @click="copy">
      {{ copied ? "Copied" : "Copy" }}
    </button>
    <span class="cc-sr" role="status">{{ copied ? "Copied to the clipboard" : "" }}</span>
  </div>
</template>
