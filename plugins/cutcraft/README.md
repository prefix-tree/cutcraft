# The CutCraft plugin

An [Agent Skill](https://agentskills.io) that teaches a coding agent to make and edit videos with CutCraft: write the
TSX file, cut on words and shots, add titles, captions, effects and motion graphics, then check and render it with
the `cutcraft` command line.

## Claude Code

```
/plugin marketplace add prefix-tree/cutcraft
/plugin install cutcraft@prefix-tree
```

## Any other agent

The skill is one folder, [`skills/cutcraft`](skills/cutcraft), in the open Agent Skills format. Copy it to where your
agent reads skills, for Claude Code without the plugin that is `.claude/skills/cutcraft/` in a project or
`~/.claude/skills/cutcraft/` for every project.

`SKILL.md` is written by hand. Everything in `references/` is generated from the code by `pnpm docs:gen`, so it
matches the code on the main branch; CI fails when it drifts.

See [With your agent](https://cutcraft.prefixtree.xyz/guide/agents) in the docs.
