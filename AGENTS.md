# AGENTS.md: instructions for any AI agent using this repo

This repository is a library of **SEO skills for AI agents** (Claude, ChatGPT/Codex, Gemini, Cursor, Copilot, open-source agents, …). Each skill is a folder under `skills/` in the open **Agent Skills** format:

```
skills/<skill-name>/
├── SKILL.md       ← start here: YAML frontmatter (name, description) + the workflow
├── references/    ← deeper docs; read only the one SKILL.md points you to
├── scripts/       ← dependency-free Node 18+ tools; run them, don't rewrite them
└── templates/     ← output formats to fill in
```

## How to use a skill
1. When a task matches a skill's `description`, read that skill's `SKILL.md` fully before acting.
2. Follow its steps in order. Load files from `references/` only when the step tells you to.
3. Run the bundled scripts with `node skills/<skill>/scripts/<script>.mjs …` when you can execute code. If you can't (no shell, no network), do the step manually as the skill describes. Never invent the data a script would have produced.
4. Produce the outputs the skill defines (usually a CSV in `templates/` plus a short plan).

## Skills available
| Skill | Use it for |
|---|---|
| `keyword-research` | keyword research, SEO content plans, topic/blog ideas, content gaps, trending topics, clustering, cannibalization checks, feeding automated publishing pipelines |

## Rules that apply to every skill here
- Never fabricate search volumes, rankings, statistics, sources or quotes. Label estimates as estimates.
- Prefer improving an existing page over creating a competing one.
- Flag penalty risks (scaled thin content, off-brand content, YMYL without expertise) instead of quietly producing them.
