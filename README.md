# RankForge

**SEO planner & analyzer skills for AI agents.** Give Claude, ChatGPT, Codex, Gemini or any coding agent the playbook of a senior SEO strategist, plus a toolkit that pulls **real, free search-demand data from 9 sources**, so agents produce content plans that rank instead of keyword lists they made up.

> First skill: **`keyword-research`** (v0.2). More are on the way (see [ROADMAP](ROADMAP.md)).

## One command → a researched keyword map
```bash
node skills/keyword-research/scripts/research.mjs \
  --seeds "cookie banner,barrierefreie website" --lang de --country de \
  --site https://your-site.de --competitors "rival-a.de,rival-b.de"
```
In a few minutes, with no API keys, you get `research-<date>/keywords.csv` and a `report.md` with:
- **Real phrases** from 5–6 platforms, clustered by intent (one cluster = one page)
- **Your pages to improve first**: phrases you already have a page for (update beats duplicate)
- **Comparisons buyers weigh** ("real cookie banner vs borlabs"), **video demand** (YouTube), **buying demand** (Amazon)
- **Measured interest**: monthly attention, year-over-year trend and **the month to publish** (seasonality)
- **Competitor gaps**: topics rivals cover and you don't
- **Real questions** with view counts, and **today's on-topic trends**

Then your agent does what tools can't: checks the SERPs, judges fit and difficulty, and prioritizes, following the skill.

## New ways to find keywords
| Method | What it reveals |
|---|---|
| **Platform-as-intent** | The same seed on Google, Bing, DuckDuckGo, YouTube, Amazon and Wikipedia. *Where* demand lives tells you the format: video, product page or explainer. |
| **Cross-platform agreement** | Phrases confirmed by several engines are the strongest free demand signal there is. |
| **Snowball expansion** | The best new phrases become seeds again, reaching second-order keywords no seed list contains. |
| **Comparison mining** | "X vs / oder / alternative / statt" maps the alternatives buyers compare. |
| **Seasonality & fading topics** | Wikipedia page views show peak months (Black Friday: 8×) and topics losing 30–50 % of interest year over year. |
| **Validated competitor gaps** | Topics several competitors invested in that you don't cover, from sitemaps, or RSS feeds when sitemaps are blocked. |
| **Pain mining** | StackExchange questions with view counts, Hacker News discussions. |

## Why
AI agents are fast at producing keyword lists and articles, and just as fast at producing **made-up search volumes, duplicate pages and off-brand content at scale**, the pattern Google's spam and core updates punish. RankForge bakes in the discipline: real signals with labeled estimates, one intent per URL, cannibalization checks, fit and penalty-risk rules, answer-engine-ready briefs, and proven rules for scheduled research and publishing agents.

## What's inside
```
skills/keyword-research/
├── SKILL.md                    the workflow any agent can follow
├── references/                 demand signals & discovery methods · intent & clustering · fit & risk · AEO/GEO · output formats
├── scripts/                    Node 18+, zero dependencies, zero API keys
│   ├── research.mjs            one-command pipeline → keywords.csv + report.md
│   ├── signals.mjs             multi-platform autocomplete, compare mining, snowball; Google Trends
│   ├── pageviews.mjs           measured interest, YoY trend, peak month (Wikimedia API)
│   ├── questions.mjs           StackExchange (with views) + Hacker News
│   ├── gap.mjs                 competitor content gap from sitemaps/feeds
│   ├── cluster.mjs             intent-aware clustering
│   ├── overlap.mjs             cannibalization check vs a folder, sitemap or domain
│   └── lib.mjs                 shared helpers
└── templates/keywords.csv      the keyword-map format
AGENTS.md / GEMINI.md           instructions for agents that read those files
adapters/chatgpt/               Custom GPT / ChatGPT Project setup
.claude-plugin/                 Claude Code plugin + marketplace manifest
```

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
Clone the repo into the workspace. `AGENTS.md` / `GEMINI.md` tell the agent to load `skills/keyword-research/SKILL.md` for SEO and keyword work.

## Individual tools
```bash
S=skills/keyword-research/scripts
node $S/signals.mjs suggest --seeds "website redesign" --lang en --country us --sources google,bing,ddg,youtube,amazon,wikipedia --depth 2
node $S/pageviews.mjs --topics "content management system,black friday" --lang en
node $S/questions.mjs --seeds "website redesign seo" --hn --since 2023
node $S/gap.mjs --competitors "rival-a.com,rival-b.com" --mine https://your-site.com
node $S/cluster.mjs --in signals.json --out clustered.csv
node $S/overlap.mjs --keywords clustered.csv --titles ./src/content
```

Example prompts for your agent:
- "Do keyword research for my web agency in Munich. We want leads, not just traffic. Our blog is in `src/content/`."
- "Find what my two biggest competitors cover that we don't, and which of those topics are growing."
- "Set up a weekly agent that finds new keywords and adds them to our content backlog without duplicates."

## Principles
1. Real signals beat guesses, and estimates are always labeled.
2. Fit beats volume.
3. One intent, one URL.
4. Research is a loop: trends expire, Search Console feeds back in.

## Contributing
PRs welcome: more languages for the question/modifier/compare lists in `signals.mjs`, more keyless data sources, new skills from the [roadmap](ROADMAP.md). Keep scripts dependency-free and every claim honest.

## License
MIT © Omar Ijbara
