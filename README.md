# RankForge

**SEO planner & analyzer skills for AI agents.** Give Claude, ChatGPT, Codex, Gemini or any coding agent the playbook of a senior SEO strategist, plus small tools that fetch **real** search-demand data, so agents produce content plans that rank instead of keyword lists they made up.

> First skill: **`keyword-research`**. More are on the way (see [ROADMAP](ROADMAP.md)).

## Why
AI agents are fast at producing keyword lists and articles, and just as fast at producing **made-up search volumes, duplicate pages and off-brand content at scale**. That last pattern is exactly what gets sites hit by Google's spam and core updates. RankForge bakes in the discipline:

- **Real signals first:** Google and DuckDuckGo autocomplete, Google Trends, Search Console. No API keys needed for the basics.
- **Intent and clustering:** one page per search intent, and question variants merged ("what is X" = "X meaning").
- **Cannibalization checks:** every keyword is compared with the pages you already have (content folder or sitemap). Update before you duplicate.
- **Fit and risk:** on-brand vs another property vs skip; flags scaled-content, YMYL and fabricated-E-E-A-T risks.
- **Answer-engine ready:** briefs built to be quoted by AI Overviews, ChatGPT, Perplexity and Claude.
- **Built for automation:** rules for scheduled research and publishing agents (scout/publisher split, caps, dedup, trend expiry), taken from a real production setup.

## What's inside
```
skills/keyword-research/
├── SKILL.md                     the workflow (any agent can follow it)
├── references/                  demand signals · intent & clustering · fit & risk · AEO/GEO · output formats
├── scripts/
│   ├── signals.mjs              autocomplete expansion + Google Trends (keyless)
│   ├── cluster.mjs              intent-aware lexical clustering
│   └── overlap.mjs              cannibalization check vs a content folder or sitemap
└── templates/keywords.csv       the keyword-map format
AGENTS.md / GEMINI.md            instructions for agents that read those files
adapters/chatgpt/                Custom GPT / ChatGPT Project setup
.claude-plugin/                  Claude Code plugin + marketplace manifest
```
The scripts need **Node 18+** and nothing else.

## Install

### Claude Code
```
/plugin marketplace add omarijbara/rankforge
/plugin install rankforge@rankforge
```
Or copy `skills/keyword-research` into `~/.claude/skills/` (personal) or `.claude/skills/` (one project).

### Claude.ai / Claude Desktop
Zip the `skills/keyword-research` folder and upload it under **Settings → Capabilities → Skills**.

### OpenAI Codex (CLI / IDE)
Copy `skills/keyword-research` to `~/.codex/skills/keyword-research` (Agent Skills format), or keep the repo in your workspace; Codex reads `AGENTS.md`.

### ChatGPT (Custom GPT or Project)
See [`adapters/chatgpt/`](adapters/chatgpt/README.md): paste the instructions and upload `SKILL.md` and the `references/` as knowledge files.

### Gemini CLI, Cursor, Copilot, Windsurf, open-source agents
Clone the repo into the workspace. `AGENTS.md` / `GEMINI.md` tell the agent to load `skills/keyword-research/SKILL.md` when the task is SEO or keyword research.

## Quick start (any shell)
```bash
S=skills/keyword-research/scripts
node $S/signals.mjs suggest --lang en --country us --seeds "website redesign,small business website" --out signals.json
node $S/signals.mjs trends --country us --out trends.json
node $S/cluster.mjs --in signals.json --out clustered.csv
node $S/overlap.mjs --keywords clustered.csv --titles https://example.com/sitemap.xml --out overlap.csv
```
Then ask your agent: *"Use the keyword-research skill to turn clustered.csv and overlap.csv into a prioritized content plan for example.com."*

Example prompts:
- "Do keyword research for my web agency in Munich. We want leads, not just traffic. Our blog is in `src/content/`."
- "Find trending topics this month that my online shoe store could rank for, and check which ones we already cover."
- "Set up a weekly agent that finds new keywords and adds them to our content backlog without duplicates."

## Principles
1. Real signals beat guesses, and estimates are always labeled.
2. Fit beats volume.
3. One intent, one URL.
4. Research is a loop: trends expire, Search Console feeds back in.

## Contributing
PRs welcome: more languages for the question and modifier lists in `signals.mjs`, more data sources, new skills from the [roadmap](ROADMAP.md). Keep scripts dependency-free and every claim honest.

## License
MIT © Omar Ijbara
