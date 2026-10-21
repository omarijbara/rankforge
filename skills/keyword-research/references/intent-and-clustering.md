# Intent, funnel and clustering

## Intent types
| Intent | Searcher wants | Typical page | Example |
|---|---|---|---|
| Informational | to understand or learn | guide, explainer, checklist | "was ist ein website relaunch" |
| Commercial investigation | to compare before buying | comparison, "best X", pricing guide, reviews | "wix oder wordpress", "website kosten" |
| Transactional | to buy, hire or sign up now | service page, product/category page, pricing page | "website erstellen lassen" |
| Local | a provider nearby | location/service page + Google Business Profile | "webdesign regensburg" |
| Navigational | a specific brand or site | not yours to win, unless it's your brand | "shopify login" |

**The SERP decides.** If the top results for a phrase are service pages, a blog post will struggle, and vice versa. When results are mixed, the query is ambiguous: target the dominant format and cover the secondary intent in a section.

## Funnel
- **TOFU** (awareness): broad informational. Builds topical authority and internal links; rarely converts directly.
- **MOFU** (consideration): comparisons, costs, how to choose, requirements. Often the best ROI for service businesses.
- **BOFU** (decision): "hire / buy / near me / agency / service". Money pages: few, excellent, conversion-focused.

## Clustering rules
1. **One cluster = one URL = one primary intent.** Secondary keywords in the cluster become H2s, FAQ entries or naturally used phrasing.
2. Question words and definition words don't change intent ("was ist X" = "X bedeutung" = "X einfach erklärt"). `scripts/cluster.mjs` already ignores them.
3. Modifiers usually DO change intent: cost, checklist, agency, template, for <industry>, in <city>, vs.
4. The same words can carry opposite intents: "website kosten" (price) vs "website kostenlos" (free tools). Lexical tools can't see this; you must.
5. When two clusters would produce the same page outline, merge them.
6. City/industry permutations are only separate clusters if the page can be **genuinely different** (local proof, specific requirements, real examples). Otherwise one strong page with a section per segment beats twenty thin clones.

## Mapping to existing pages (cannibalization)
- Run `scripts/overlap.mjs` against the site's content folder or sitemap.
- `update`: a page already targets this. Improve it (depth, freshness, missing sub-questions, better title). Don't create a new one.
- `review`: open the page. If it's a different angle, create a new page that links to it and states the difference. If it's the same intent, update the existing page.
- `new`: create, and plan internal links from related pages.
- If two pages already compete, recommend merging them into the stronger URL with a 301 redirect.
