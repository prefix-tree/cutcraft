<!-- The landing page's install: pick your coding agent, copy the lines that give it the UberScene skill. Claude Code
     takes the plugin; the agents that read the shared Agent Skills folder (.agents/skills) take the CLI's
     `skills install`, which writes the skill that matches the installed version. -->
<script setup lang="ts">
import { withBase } from "vitepress";
import { computed, onMounted, ref } from "vue";

interface Agent {
  readonly id: string;
  readonly name: string;
  /** Two letters for its key when it has no logo. */
  readonly mark: string;

  /** Where the lines are typed. */
  readonly where: string;
  readonly lines: readonly string[];
}

const SHARED = "npx uberscene skills install --dir .agents/skills/uberscene";

const AGENTS: readonly Agent[] = [
  {
    id: "claude-code",
    mark: "CC",
    name: "Claude Code",
    where: "In Claude Code, one line at a time",
    lines: ["/plugin marketplace add prefix-tree/uberscene", "/plugin install uberscene@prefix-tree"],
  },
  { id: "codex", mark: "CX", name: "Codex", where: "In your project's terminal", lines: [SHARED] },
  { id: "cursor", mark: "CU", name: "Cursor", where: "In your project's terminal", lines: [SHARED] },
  { id: "gemini", mark: "GE", name: "Gemini CLI", where: "In your project's terminal", lines: [SHARED] },
  { id: "copilot", mark: "CP", name: "Copilot", where: "In your project's terminal", lines: [SHARED] },
  { id: "opencode", mark: "OC", name: "OpenCode", where: "In your project's terminal", lines: [SHARED] },
  {
    id: "other",
    mark: "+",
    name: "Other",
    where: "In your project's terminal. Point --dir at the folder your agent reads skills from",
    lines: [SHARED],
  },
];

/**
 * Logos: each agent's key shows docs/public/agents/<id>.svg when that file exists, and its two letters until then.
 * Use the file from the agent's own brand or press page, and follow its usage rules.
 */
const logo = (id: string): string => withBase(`/agents/${id}.svg`);
const hasLogo = ref(new Set<string>());
onMounted(() => {
  for (const a of AGENTS) {
    const img = new Image();
    img.onload = () => {
      hasLogo.value = new Set(hasLogo.value).add(a.id);
    };
    img.src = logo(a.id);
  }
});

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
        <span class="cc-agents-icon" aria-hidden="true">
          <img v-if="hasLogo.has(a.id)" :src="logo(a.id)" alt="" width="28" height="28" />
          <template v-else>{{ a.mark }}</template>
        </span>
        <span class="cc-agents-name">{{ a.name }}</span>
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
