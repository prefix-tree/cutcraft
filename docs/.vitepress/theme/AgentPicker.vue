<!-- The landing page's install: pick your coding agent, or By hand, and copy the lines. Claude Code takes the plugin;
     the agents that read the shared Agent Skills folder (.agents/skills) take the CLI's `skills install`, which writes
     the skill that matches the installed version; By hand is the npm install and the loop of commands. The hero shows
     the lines; with `full`, as in the Install section, an agent's panel also gives a brief to paste. -->
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
  /** A line under the commands. */
  readonly note?: string;
  /** False for By hand: there is no agent to brief. */
  readonly briefs: boolean;
}

const props = defineProps<{ full?: boolean }>();

/** What to ask once the skill is in: briefed the way you would brief an editor. */
const BRIEF =
  "Make a 30 second vertical clip from talk.mp4 for Reels. Open on the sentence about shipping on Fridays, add karaoke captions and a lower third with my name, Maya Chen, Founder. Put the name in the schema.";

const SHARED = "npx uberscene skills install --dir .agents/skills/uberscene";

const AGENTS: readonly Agent[] = [
  {
    id: "claude-code",
    mark: "CC",
    name: "Claude Code",
    where: "In Claude Code, one line at a time",
    lines: ["/plugin marketplace add prefix-tree/uberscene", "/plugin install uberscene@prefix-tree"],
    briefs: true,
  },
  { id: "codex", mark: "CX", name: "Codex", where: "In your project's terminal", lines: [SHARED], briefs: true },
  { id: "cursor", mark: "CU", name: "Cursor", where: "In your project's terminal", lines: [SHARED], briefs: true },
  { id: "gemini", mark: "GE", name: "Gemini CLI", where: "In your project's terminal", lines: [SHARED], briefs: true },
  { id: "copilot", mark: "CP", name: "Copilot", where: "In your project's terminal", lines: [SHARED], briefs: true },
  { id: "opencode", mark: "OC", name: "OpenCode", where: "In your project's terminal", lines: [SHARED], briefs: true },
  {
    id: "other",
    mark: "+",
    name: "Other",
    where: "In your project's terminal. Point --dir at the folder your agent reads skills from",
    lines: [SHARED],
    briefs: true,
  },
  {
    id: "by-hand",
    mark: "$",
    name: "By hand",
    where: "In a new folder, in your terminal",
    lines: [
      "npm install uberscene @uberscene/kit react zod",
      "npx uberscene add talk.mp4",
      "npx uberscene look video.tsx",
      "npx uberscene video.tsx --out video.mp4",
    ],
    note: "Write video.tsx after adding your footage. The first export downloads Chrome for Testing, which takes a minute.",
    briefs: false,
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
const copied = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = text;
    clearTimeout(timer);
    timer = setTimeout(() => (copied.value = ""), 1600);
  } catch {
    copied.value = "";
  }
}

function pick(id: string): void {
  selected.value = id;
  copied.value = "";
}
</script>

<template>
  <div class="cc-agents" :class="{ full: props.full }">
    <p class="cc-agents-label">Install: pick your agent, or by hand</p>
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
      <div v-for="line in agent.lines" :key="line" class="cc-agents-line">
        <code><span class="cc-agents-prompt" aria-hidden="true">{{ line.startsWith("/") ? "›" : "$" }}</span>{{ line }}</code>
        <button type="button" :aria-label="copied === line ? 'Copied' : `Copy: ${line}`" @click="copy(line)">
          {{ copied === line ? "Copied" : "Copy" }}
        </button>
      </div>
      <p v-if="agent.note" class="cc-agents-note">{{ agent.note }}</p>
      <template v-if="props.full && agent.briefs">
        <p class="cc-agents-where cc-agents-then">Then put your footage in the folder, a transcript beside each recording, and ask:</p>
        <div class="cc-agents-brief">
          <p>{{ BRIEF }}</p>
          <button type="button" :aria-label="copied === BRIEF ? 'Copied' : 'Copy the brief'" @click="copy(BRIEF)">
            {{ copied === BRIEF ? "Copied" : "Copy" }}
          </button>
        </div>
      </template>
      <span class="cc-sr" role="status">{{ copied ? "Copied to the clipboard" : "" }}</span>
    </div>
  </div>
</template>
