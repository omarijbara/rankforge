# Changelog

## 0.3.0 — 2026-10-21
Read real search results pages, natively or with Playwright.
- `serp.mjs` (new): People also ask, related searches, Google AI Overview sub-headings (`serp-outline.csv`), top 10 with page format, SERP features, and a difficulty hint from who ranks. Engines: agent-native import (`--import`), DuckDuckGo HTML (native), Brave Search API, Google Programmable Search API, and Playwright (`--engine google`, `--engine bing --browser`).
- `serp-extract.js` (new): read-only in-page extractor for any agent browser tool (Claude in Chrome, Playwright MCP, ChatGPT Agent…) and for Playwright.
- Bot checks: on a CAPTCHA/challenge or an empty "no results" page served to scripts, the engine stops and says so. `--wait-for-human` lets you pass a check yourself in a visible window. Nothing tries to solve or evade bot checks. The Google consent wall is answered with "reject all".
- `research.mjs --serp <engine>` / `--serp-import captured.json`: fills `difficulty` from the SERP and adds "What ranks now", SERP keywords and the AI-Overview outline to the report.
- `references/agent-browser-serp.md` (new); SKILL.md step 2 and briefs updated; `package.json` with Playwright as an optional dependency.


## 0.2.0 — 2026-10-21
New ways to find keywords, and a one-command pipeline.
- `research.mjs`: runs every discovery step and drafts `keywords.csv` + `report.md` (top clusters, pages to update, comparisons, video/product demand, measured interest, questions, competitor gaps, on-topic trends).
- `signals.mjs`: Bing, YouTube, Amazon and Wikipedia autocomplete next to Google and DuckDuckGo; the platform becomes an intent hint; `--expand compare` mines alternatives; `--depth 2` snowball expansion; failing sources switch off cleanly.
- `pageviews.mjs` (new): Wikipedia page views → monthly interest, year-over-year trend, peak month, seasonality.
- `questions.mjs` (new): StackExchange questions with view counts, Hacker News discussions, `--since` filter.
- `gap.mjs` (new): competitor content gap from sitemaps (robots.txt discovery, sitemap indexes), falling back to RSS/Atom feeds when sitemaps are blocked.
- `lib.mjs` (new): shared tokenizer, CSV/JSON I/O, polite HTTP with retries; `cluster.mjs` and `overlap.mjs` use it. `overlap.mjs` now also accepts a domain.
- Docs: SKILL.md step 2 fast path; "Discovery methods" in references/demand-signals.md.

## 0.1.0 — 2026-10-21
First release: the `keyword-research` skill, `signals.mjs`, `cluster.mjs`, `overlap.mjs`, references, template, Claude Code plugin, AGENTS.md/GEMINI.md, ChatGPT adapter.

