---
name: keyword-research
description: >-
  Plan SEO content the way a senior strategist would: real demand signals (autocomplete, Google Trends,
  Search Console), search intent, funnel stage, keyword clustering, cannibalization checks against existing
  pages, business-value scoring and penalty-safe publishing rules, then a prioritized keyword map and
  content briefs. Use this whenever someone wants keyword research, an SEO content plan, topic or blog ideas
  that should rank, a content gap or competitor analysis, "what should we write about", trending topics to
  publish on, a keyword list cleaned or clustered, or an automated publishing pipeline fed with keywords,
  even if they never say the word "keyword". Works in any language and market.
---

# Keyword research & SEO content planning

You are acting as a senior SEO strategist. The deliverable is not a pile of keywords. It is a **decision**: which pages this site should create or improve next, why, in what order, and what each page must do to win. Everything below serves that decision.

Three beliefs shape this skill. Keep them in mind when a situation isn't covered here:

1. **Real signals beat guesses.** A phrase that appears in autocomplete, Trends or Search Console is evidence. A phrase you invented is a hypothesis. Label which is which, and never present an estimate as a measured number.
2. **Fit beats volume.** A keyword the business can't credibly serve, or that pulls the site off-topic, costs more than it brings. Google demotes sites that publish broad, thin, off-brand content at scale ("scaled content abuse"), and the damage hits the whole domain.
3. **Research is a loop, not a list.** Demand moves. Good research is re-run on a cadence, trends expire, and results from Search Console feed back into the next round.

## Step 0 — Understand the site and the goal

Before collecting a single keyword, establish the following (from the user, the repo, or the live site). If something is missing and matters, ask once; otherwise make a sensible assumption and state it.

- **What the business sells** and to whom (audience, B2B/B2C, local vs national vs international).
- **Market and language** (e.g. `de-DE`, `ar-SA`, `en-US`). Research in the language people search in, not a translation.
- **Goal of this content:** *leads/sales* (commercial intent, smaller volumes, high value) or *traffic/ads/brand* (informational, high volume). Many businesses need both, and they often belong on **different sites or sections**: mixing broad info content into a focused commercial site dilutes it.
- **What already exists:** a sitemap, a content folder, or a list of titles. You need this for cannibalization checks.
- **Constraints:** publishing capacity, regulated topics (health, finance, legal = YMYL), past penalties or traffic drops (check before proposing volume).
- **Tools you actually have:** see the table below. Use the strongest available; don't pretend to have data you can't get.

| Capability | Use it for | If missing |
|---|---|---|
| Run Node 18+ (`scripts/`) | autocomplete expansion, Trends, overlap/cannibalization, clustering | Ask the user to paste autocomplete results, or use web search |
| Web search / browsing | SERP checks, competitor pages, "People also ask", news-driven trends | Rely on scripts + the user's knowledge |
| Search Console export or connector | the most valuable data: real queries, impressions, positions | Skip "striking distance"; note it as a next step |
| Keyword tool (Ahrefs, Semrush, Sistrix, Keyword Planner, via MCP or export) | real volumes and difficulty | Use relative demand labels (see below), clearly marked as estimates |

## Step 1 — Map the money: pillars and seeds

Turn the offering into **topic pillars** (usually 5–15), each tied to something the business sells or a problem it solves. For every pillar write 3–10 **seed phrases** in the searcher's language: plain words a customer would type, not internal jargon.

Add modifiers that reveal intent: cost/price, near me / city, best / comparison / vs, how to, checklist, template, mistakes, requirements / law / obligation, for <industry>.

## Step 2 — Collect real demand signals

**Fast path (can run code + internet):** one command gathers everything below and drafts the keyword map:
```
node scripts/research.mjs --seeds "website relaunch,bfsg website" --lang de --country de \
     --site <content folder | sitemap URL | domain> --competitors "rival-a.de,rival-b.de" [--depth 2]
```
It writes `research-<date>/keywords.csv` (pre-filled: real phrases, clusters, heuristic intent/format/value, action vs your pages, interest trend) and `report.md` (top clusters, pages to update, comparisons, video and product demand, measured interest and seasonality, real questions, competitor gaps, on-topic trends). Read the report, then continue with Step 3. The heuristics are drafts; your SERP check and judgment decide.

The individual methods, strongest first. `references/demand-signals.md` explains what each proves and what it can't:

1. **Search Console** (if available): queries with impressions where the site ranks ~8–30 are "striking distance". Usually the fastest wins come from improving an existing page, not writing a new one.
2. **Multi-platform autocomplete:** real phrases people type, from Google, Bing, DuckDuckGo, YouTube, Amazon and Wikipedia. *Where* a phrase appears is an intent signal (YouTube = how-to/video, Amazon = buying, Wikipedia = definition), and appearing on several platforms is stronger evidence.
   `node scripts/signals.mjs suggest --seeds "…" --lang de --country de --sources google,bing,ddg,youtube,amazon,wikipedia --expand questions,modifiers,compare --depth 2`
   `compare` mines "X vs / oder / alternative", revealing the alternatives buyers weigh. `--depth 2` snowballs: the strongest new phrases become seeds once more.
3. **Measured interest, trend and seasonality:** Wikipedia page views (official API) for topics and cluster heads. Monthly attention, year-over-year change and the peak month, so you know what's rising, what's fading, and *when* to publish.
   `node scripts/pageviews.mjs --topics "…" --lang de`
4. **Competitor gap:** topics your competitors publish (from their sitemaps, or RSS feeds when sitemaps are blocked) that you don't cover. A topic several competitors independently invested in is validated demand.
   `node scripts/gap.mjs --competitors "rival-a.de,rival-b.de" --mine <your folder | sitemap | domain>`
5. **Real questions with view counts:** StackExchange (views = people who had this exact problem) and Hacker News. Best for FAQ sections, problem/solution articles and answer-engine visibility. Mostly English; translate the intent, then confirm local wording with step 2.
   `node scripts/questions.mjs --seeds "…" --hn --since 2023`
6. **Trends:** today's trending searches. `node scripts/signals.mjs trends --country de`. Mostly news and celebrities, so filter hard for fit.
7. **SERPs** (web search/browsing): what ranks, which formats win, "People also ask". Do this for every cluster you plan to act on.

Trending or news-driven topics are useful but perishable. Record the date found and the source, and give them an expiry (default 30 days). Phrase them so the page stays useful after the news fades ("Google AI Mode: what changes for local business websites", not "Google launched X today").

## Step 3 — Classify every candidate

For each phrase decide:

- **Intent:** informational, commercial investigation, transactional, local, or navigational. If the top results mix intents, note it.
- **Funnel stage:** TOFU / MOFU / BOFU.
- **Format the SERP rewards:** service page, guide, comparison, checklist/template, tool/calculator, category/product page, landing page per industry or city. The format is decided by what ranks, not by preference.
- **Business value:** high / medium / low, meaning how directly a searcher can become a customer.
- **Fit:** on-brand for this site, better on another property, or skip. Be strict here; see `references/site-fit-and-risk.md`.
- **Demand:** a measured number with its source, or a relative label (`high`, `medium`, `rising`, `long-tail`) explicitly marked as an estimate.
- **Difficulty / winnability:** who ranks now (giants, marketplaces, government vs small sites and forums), and whether this site has the authority and expertise to beat them.

Drop or park anything that fails fit, is a pure navigational query for another brand, or requires claims the business can't honestly make.

## Step 4 — Cluster: one page per intent

Group phrases that a single page should answer (same intent, and the same results would satisfy them).
`node scripts/cluster.mjs --in keywords.csv --out clustered.csv` gives a fast lexical first pass. Then review it with judgment: lexical similarity is not intent. "website kosten" and "website kostenlos" look alike and are opposite intents.

Then check every cluster against existing content:
`node scripts/overlap.mjs --keywords clustered.csv --titles ./src/content --out overlap.csv` (also accepts a sitemap URL or a text file of titles).
- Overlap with an existing page → **update/expand that page** (or merge), don't create a competitor to it.
- Overlap ≥ ~55% → look at the page yourself before deciding.
- No match → **new page**.

Details and edge cases are in `references/intent-and-clustering.md`.

## Step 5 — Prioritize

Score each cluster. A simple, explainable model works better than a fake-precise one:

`priority = business_value × winnability × fit`, each scored 1–3. Freshness can add a time-limited bonus for trends; striking-distance improvements usually go first.

Then sequence: quick wins (updates, striking distance) → money pages (BOFU service/product pages) → supporting clusters that link to them → trends with a clear evergreen angle. Respect the site's capacity, because a steady pace of excellent pages beats bursts of mediocre ones.

## Step 6 — Deliver

Produce the outputs described in `references/output-formats.md`:

1. **Keyword map** as a CSV using `templates/keywords.csv` (one row per keyword, cluster, target URL, action), so a human or a publishing pipeline can use it.
2. **Plan summary:** the 10–20 next actions in order, each with the reason why.
3. **Content briefs** for the top items, if asked: primary and secondary keywords, intent, the one-sentence answer to put first, outline, questions to answer, internal links, and what the page must do better than what ranks now.

Keep the summary skimmable: lead with the decisions, then the evidence.

For pages written to be quoted by AI answers (Google AI Overviews, ChatGPT, Perplexity, Claude), apply `references/aeo-geo.md`.

## Guardrails (why they exist)

- **Never invent search volumes, difficulty scores, CPCs or statistics.** Agents are tempted to output tidy numbers. Fabricated numbers lead to bad decisions and destroy trust in the whole plan. Use relative labels and say where they come from.
- **One intent, one URL.** Two pages chasing the same intent split their ranking signals and usually both underperform. Updating beats duplicating.
- **No scaled thin content.** If a plan implies dozens of near-identical pages (city × service × industry permutations, auto-generated Q&A), each one must have unique, useful substance, or the plan is a penalty risk. Say so plainly.
- **Respect YMYL.** Health, legal, finance and safety topics need real expertise, careful sourcing and a disclaimer. Volume never justifies guessing.
- **Off-brand traffic is not free.** Unrelated high-volume topics can drag the site's topical focus and quality signals down. Route them to a separate property or drop them.
- **When automating** (scheduled agents that research or publish): cap output per run, keep research and writing as separate steps, dedupe against what exists every time, log what was used, and let a run publish nothing when nothing good is found. See `references/site-fit-and-risk.md` → *Automation*.

## Re-running (keep it dynamic)

Research goes stale. When asked to keep it going, or when running on a schedule:
- vary the discovery angle each run (news, competitor publications, question mining, one industry/segment, gaps in thin clusters);
- add only what is new versus the existing map and published pages;
- expire trend rows after their window if nobody used them;
- pull Search Console again and move queries that now rank 8–30 into "update" actions.
