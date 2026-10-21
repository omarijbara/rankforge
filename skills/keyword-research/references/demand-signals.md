# Demand signals: what each source tells you (and what it doesn't)

Use the strongest source available and say which one you used. Never turn a weak signal into a fake number.

| Source | What it proves | What it does NOT prove | Access |
|---|---|---|---|
| **Search Console** (Performance → Queries) | Real queries that already show this site, with impressions, clicks, average position | Demand for topics the site doesn't rank for yet | Export, API, or a GSC connector/MCP |
| **Keyword tools** (Google Keyword Planner, Ahrefs, Semrush, Sistrix) | Approximate monthly volume, difficulty, CPC | Exact numbers. Tools disagree by 2–5x; treat as ranges | Paid account, export, or MCP |
| **Autocomplete** (Google, Bing, DuckDuckGo, YouTube, Amazon, Wikipedia) | That real people type this phrase, in this wording; the platform hints at intent | How many people; order is NOT a volume ranking | `scripts/signals.mjs suggest` (keyless) |
| **Wikipedia page views** | Measured monthly attention for a topic/entity, year-over-year trend, seasonal peak | Search volume of a long-tail phrase (most have no article) | `scripts/pageviews.mjs` (official Wikimedia API, keyless) |
| **StackExchange / Hacker News** | Real problems in real words, with view counts (StackExchange) or points/comments (HN) | Local-language demand (mostly English) | `scripts/questions.mjs` (keyless) |
| **Competitor sitemaps / feeds** | What several competitors invested in = validated market demand; your gaps | Whether those pages rank or convert | `scripts/gap.mjs` (keyless) |
| **Google Trends** | Direction (rising/falling), seasonality, regional interest, today's spikes | Absolute volume; most daily trends are news/celebrities | `scripts/signals.mjs trends` (keyless RSS) or the Trends website |
| **SERP features** ("People also ask", related searches) | Sub-questions searchers have; which formats Google rewards | Volume | Web search / browsing |
| **Communities** (Reddit, forums, Q&A, reviews, support tickets, sales calls) | The words customers really use, pain points, objections | Search volume | Web search, user-provided data |
| **Competitor content** (sitemaps, blogs, category pages) | Topics a market already invests in; gaps you can fill | That those pages perform | Sitemap fetch, browsing, `scripts/overlap.mjs --titles <their sitemap>` |

## Reading autocomplete well
- A phrase that appears for **several expansions** (e.g. as "X kosten" and in "was kostet X") or from **both engines** is a stronger signal. `signals.mjs` reports this as `hits`.
- Keep the searcher's exact wording for titles and H2s. That is the phrase that ranks and that answer engines match.
- Brand/navigation noise ("X login", "X app download") is demand for someone else's product: drop it.

## Relative demand labels (when no real volume exists)
Use these, and say they are estimates:
- `high`: head term, appears on its own in autocomplete, many variants.
- `medium`: clear phrase with several modifier variants.
- `rising`: growing in Trends or tied to a new law/product/change.
- `long-tail`: specific phrasing, few variants. Lower volume, usually higher intent.

## Trend hygiene
- Record `found` (date) and the source domain for every trend.
- Default expiry: 30 days if unused. Before writing, check whether it's still relevant.
- Trending ≠ on-brand. Daily trending lists are mostly celebrities, sports and news; keep only items the site can serve credibly.

## Discovery methods that go beyond a keyword tool

| Method | How | Why it finds what others miss |
|---|---|---|
| **Platform-as-intent** | Same seeds on Google/Bing/DDG + YouTube + Amazon + Wikipedia (`--sources`) | A phrase on YouTube wants a video or step-by-step; on Amazon it's a buyer; on Wikipedia it needs a definition. The format follows from where the demand lives. |
| **Cross-platform agreement** | `platforms` and `hits` in signals.json | Phrases confirmed by several engines and several expansions are the most reliable signals you can get without paid data. |
| **Snowball** | `--depth 2` | The strongest phrases from round one become seeds, reaching second-order phrases that seed lists never contain. |
| **Comparison mining** | `--expand compare` ("X vs", "X oder", "X alternative", "X statt") | Surfaces the competitors and alternatives buyers actually weigh: high-intent comparison articles. |
| **Seasonality timing** | `pageviews.mjs` → `peak_month`, `seasonality` | Publish or refresh 4–8 weeks before the peak. Black Friday shows 8× seasonality; evergreen tech topics ~1.1×. |
| **Fading-topic detection** | `pageviews.mjs` → `yoy_change_pct` | A topic losing 30–50 % of interest year over year (e.g. after a law's deadline passed) deserves updates, not new pages. |
| **Validated gaps** | `gap.mjs` with 2+ competitors | A topic several rivals covered independently is real market demand, and if you have nothing, it's your gap. |
| **Pain mining** | `questions.mjs --since 2023` | High-view questions show the exact problems people search for; recent ones show what's changing. |

Combine them: a cluster that appears on 3+ platforms, has rising interest, is covered by 2+ competitors and not by you is about as strong as free evidence gets.
