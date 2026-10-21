# Demand signals: what each source tells you (and what it doesn't)

Use the strongest source available and say which one you used. Never turn a weak signal into a fake number.

| Source | What it proves | What it does NOT prove | Access |
|---|---|---|---|
| **Search Console** (Performance → Queries) | Real queries that already show this site, with impressions, clicks, average position | Demand for topics the site doesn't rank for yet | Export, API, or a GSC connector/MCP |
| **Keyword tools** (Google Keyword Planner, Ahrefs, Semrush, Sistrix) | Approximate monthly volume, difficulty, CPC | Exact numbers. Tools disagree by 2–5x; treat as ranges | Paid account, export, or MCP |
| **Autocomplete** (Google, DuckDuckGo, YouTube, Amazon) | That real people type this phrase, in this wording | How many people; order is NOT a volume ranking | `scripts/signals.mjs suggest` (keyless) |
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
