# Output formats

## 1. Keyword map (CSV)
Use `templates/keywords.csv`. Semicolon-separated (commas appear in keywords; semicolons don't), UTF-8, one row per keyword:

| column | values |
|---|---|
| keyword | the phrase, lowercase, in the searcher's wording |
| cluster | the cluster's primary keyword (the same for every row in a cluster) |
| intent | informational / commercial / transactional / local / navigational |
| funnel | TOFU / MOFU / BOFU |
| format | guide / comparison / checklist / service-page / category-page / tool / landing-page / faq |
| demand | a number (only if measured) or high / medium / rising / long-tail |
| demand_source | gsc / keyword-planner / ahrefs / semrush / autocomplete / trends / estimate |
| business_value | high / medium / low |
| fit | on-brand / other-property / skip |
| difficulty | low / medium / high (who ranks now; say why in notes) |
| priority | 1–27 (business_value × winnability × fit, each 1–3) |
| target_url | an existing URL to update, or the proposed new slug |
| action | update / new / merge / skip |
| notes | the reason: SERP observation, overlap %, trend source, risks |
| found | YYYY-MM-DD |

## 2. Plan summary (Markdown)
```
# SEO plan: <site>, <market>, <date>

## Decisions (do these next)
1. <action> <target_url>: <one-line reason> (cluster: <primary keyword>)
...

## Quick wins (existing pages)
## New pages (by priority)
## Parked / other property / skipped (and why)
## Assumptions and data sources
## Re-run cadence and what to watch
```

## 3. Content brief (per page)
```
Primary keyword: … | Secondary: … | Intent: … | Funnel: … | Format: …
Target URL: … (new | update)
First sentence must answer: "<the question>"
What ranks now and how we beat it: …
Outline (H2/H3): …
Questions to answer (FAQ): …
Facts that need a source: …
Internal links: to … / from …
CTA: …
Do not: <claims we can't make, YMYL cautions>
```
