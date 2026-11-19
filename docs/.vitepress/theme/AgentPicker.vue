<!-- The landing page's install: pick your coding agent, copy the lines that give it the UberScene skill. Claude Code
     takes the plugin; the agents that read the shared Agent Skills folder (.agents/skills) take the CLI's
     `skills install`, which writes the skill that matches the installed version. -->
<script setup lang="ts">
import { computed, ref } from "vue";

interface Agent {
  readonly id: string;
  readonly name: string;
  /** Where the lines are typed. */
  readonly where: string;
  readonly lines: readonly string[];
}

const SHARED = "npx uberscene skills install --dir .agents/skills/uberscene";

const AGENTS: readonly Agent[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    where: "In Claude Code, one line at a time",
    lines: ["/plugin marketplace add prefix-tree/uberscene", "/plugin install uberscene@prefix-tree"],
  },
  { id: "codex", name: "Codex", where: "In your project's terminal", lines: [SHARED] },
  { id: "cursor", name: "Cursor", where: "In your project's terminal", lines: [SHARED] },
  { id: "gemini", name: "Gemini CLI", where: "In your project's terminal", lines: [SHARED] },
  { id: "copilot", name: "Copilot", where: "In your project's terminal", lines: [SHARED] },
  { id: "opencode", name: "OpenCode", where: "In your project's terminal", lines: [SHARED] },
  {
    id: "other",
    name: "Other",
    where: "In your project's terminal. Point --dir at the folder your agent reads skills from",
    lines: [SHARED],
  },
];

const selected = ref(AGENTS[0]!.id);
const agent = computed(() => AGENTS.find((a) => a.id === selected.value) ?? AGENTS[0]!);
const copied = ref(-1);
let timer: ReturnType<typeof setTimeout> | undefined;

async function copy(index: number): Promise<void> {
  try {
    await navigator.clipboard.writeText(agent.value.lines[index]!);
    copied.value = index;
    clearTimeout(timer);
    timer = setTimeout(() => (copied.value = -1), 1600);
  } catch {
    copied.value = -1;
  }
}

function pick(id: string): void {
  selected.value = id;
  copied.value = -1;
}
</script>

<template>
  <div class="cc-agents">
    <p class="cc-agents-label">Give your agent the skill</p>
    <div class="cc-agents-tabs" role="tablist" aria-label="Coding agent">
      <button
        v-for="a in AGENTS"
        :key="a.id"
        type="button"
        role="tab"
        :aria-selected="a.id === selected"
        :class="{ active: a.id === selected }"
        @click="pick(a.id)"
      >
        {{ a.name }}
      </button>
    </div>
    <div class="cc-agents-panel" role="tabpanel" :aria-label="agent.name">
      <p class="cc-agents-where">{{ agent.where }}</p>
      <div v-for="(line, i) in agent.lines" :key="line" class="cc-agents-line">
        <code><span class="cc-agents-prompt" aria-hidden="true">{{ line.startsWith("/") ? "›" : "$" }}</span>{{ line }}</code>
        <button type="button" :aria-label="copied === i ? 'Copied' : `Copy: ${line}`" @click="copy(i)">
          {{ copied === i ? "Copied" : "Copy" }}
        </button>
      </div>
      <span class="cc-sr" role="status">{{ copied >= 0 ? "Copied to the clipboard" : "" }}</span>
    </div>
  </div>
</template>
