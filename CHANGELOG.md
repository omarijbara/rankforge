# Changelog

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
