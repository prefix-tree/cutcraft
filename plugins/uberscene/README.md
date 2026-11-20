# The UberScene plugin

An [Agent Skill](https://agentskills.io) that teaches a coding agent to make and edit videos with UberScene: write the
TSX file, cut on words and shots, add titles, captions, effects and motion graphics, then check and render it with
the `uberscene` command line.

## Claude Code

```
/plugin marketplace add prefix-tree/uberscene
/plugin install uberscene@prefix-tree
```

## Any other agent

The skill is one folder, [`skills/uberscene`](skills/uberscene), in the open Agent Skills format. Copy it to where your
agent reads skills, for Claude Code without the plugin that is `.claude/skills/uberscene/` in a project or
`~/.claude/skills/uberscene/` for every project.

`SKILL.md` is written by hand. Everything in `references/` is generated from the code by `pnpm docs:gen`, so it
matches the code on the main branch; CI fails when it drifts.

See [With your agent](https://uberscene.prefixtree.xyz/guide/agents) in the docs.
