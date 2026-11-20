// Runs every task in both spellings against a model through `claude -p`, and scores each answer with the real
// resolver and lint: does the file load clean, and is the edit the one asked for.
//
//   npx tsx scripts/evals/spelling/run.ts --model claude-haiku-5-5 --trials 3 [--out results.json]
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { load, type Spelling } from "./check";
import { systemPrompt, userPrompt } from "./prompt";
import { TASKS } from "./tasks";

const arg = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? (process.argv[i + 1] as string) : fallback;
};
const model = arg("model", "claude-haiku-5-5");
const trials = Number(arg("trials", "3"));
/** `small`, `large` or `all`: which base file's tasks to run. */
const only = arg("base", "all");
const out = arg("out", "");
const PARALLEL = 5;
const SPELLINGS: readonly Spelling[] = ["children", "props"];
// An empty directory, so the model sees no project files or instructions.
const cwd = mkdtempSync(join(tmpdir(), "spelling-eval-"));

interface Row {
  readonly task: string;
  readonly spelling: Spelling;
  readonly trial: number;
  /** The file loads, resolves and lints with no error. */
  readonly clean: boolean;
  /** Clean, and the edit is the one asked for. */
  readonly right: boolean;
  readonly why: string;
  readonly outputTokens: number;
  readonly answer: string;
}

function ask(system: string, user: string): Promise<{ text: string; outputTokens: number }> {
  return new Promise((ok, fail) => {
    const child = execFile(
      "claude",
      ["-p", "--model", model, "--system-prompt", system, "--max-turns", "1", "--output-format", "json"],
      { cwd, maxBuffer: 1 << 24, timeout: 180_000 },
      (error, stdout) => {
        if (error) return fail(error);
        const json = JSON.parse(stdout) as { result?: string; usage?: { output_tokens?: number } };
        ok({ text: json.result ?? "", outputTokens: json.usage?.output_tokens ?? 0 });
      },
    );
    child.stdin?.end(user);
  });
}

async function one(task: (typeof TASKS)[number], spelling: Spelling, trial: number): Promise<Row> {
  const base = readFileSync(join(import.meta.dirname, `base.${task.base}.${spelling}.tsx`), "utf8");
  const row = { task: task.name, spelling, trial };
  let reply: { text: string; outputTokens: number };
  try {
    reply = await ask(systemPrompt(spelling), userPrompt(base, task.ask));
  } catch (error) {
    return {
      ...row,
      clean: false,
      right: false,
      why: `no answer: ${(error as Error).message}`,
      outputTokens: 0,
      answer: "",
    };
  }
  const fenced = /```(?:tsx|jsx|typescript)?\n([\s\S]*?)```/.exec(reply.text);
  const answer = fenced ? (fenced[1] as string) : reply.text;
  const file = load(answer, spelling);
  const clean = file.problems.length === 0;
  const wrong = clean ? task.check(file) : null;
  return {
    ...row,
    clean,
    right: clean && wrong === null,
    why: clean ? (wrong ?? "") : file.problems.join("; "),
    outputTokens: reply.outputTokens,
    answer,
  };
}

const tasks = TASKS.filter((t) => only === "all" || t.base === only);
const jobs = tasks.flatMap((task) =>
  SPELLINGS.flatMap((spelling) => Array.from({ length: trials }, (_, trial) => () => one(task, spelling, trial))),
);
async function main(): Promise<void> {
  const rows: Row[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      while (next < jobs.length) {
        const row = await (jobs[next++] as () => Promise<Row>)();
        rows.push(row);
        process.stderr.write(row.right ? "." : row.clean ? "x" : "E");
      }
    }),
  );
  process.stderr.write("\n");

  console.log(`model ${model}, ${trials} trials per task and spelling\n`);
  console.log("task                  children (clean/right)   props (clean/right)");
  for (const task of tasks) {
    const cell = (s: Spelling): string => {
      const mine = rows.filter((r) => r.task === task.name && r.spelling === s);
      return `${mine.filter((r) => r.clean).length}/${mine.filter((r) => r.right).length} of ${mine.length}`;
    };
    console.log(`${task.name.padEnd(22)}${cell("children").padEnd(25)}${cell("props")}`);
  }
  for (const s of SPELLINGS) {
    const mine = rows.filter((r) => r.spelling === s);
    const tokens = mine.reduce((a, r) => a + r.outputTokens, 0) / Math.max(1, mine.length);
    console.log(
      `\n${s}: clean ${mine.filter((r) => r.clean).length}/${mine.length}, right ${mine.filter((r) => r.right).length}/${mine.length}, ${Math.round(tokens)} output tokens on average`,
    );
    for (const r of mine.filter((x) => !x.right)) console.log(`  ${r.task} #${r.trial}: ${r.why}`);
  }
  if (out) writeFileSync(out, JSON.stringify({ model, trials, rows }, null, 2));
}

void main();
