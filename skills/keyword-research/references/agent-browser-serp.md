# Reading search results natively (agent browser) and with Playwright

The richest keyword and ranking data lives on the results page itself: **People also ask**, **related searches**, the **AI Overview's sub-headings** (the subtopics Google thinks a complete answer needs), which **formats** rank, and **who** ranks. There are four ways to get it, from most to least robust:

| Route | When | Command / action |
|---|---|---|
| **1. Agent-native browser** (recommended for Google) | The agent has a browser tool: Claude in Chrome, the Claude app's browser, ChatGPT Agent, Playwright MCP, Codex browser | Open the search URL, run `scripts/serp-extract.js` in the page, collect the JSON, then `node scripts/serp.mjs --import captured.json` |
| **2. Official APIs** | Regular or larger volumes, automation | `--engine brave` (BRAVE_API_KEY, free tier) or `--engine google-api` (GOOGLE_CSE_KEY + GOOGLE_CSE_CX) |
| **3. Native HTTP** | Quick look without a browser, a few queries | `--engine ddg` (DuckDuckGo HTML). Bing usually serves scripts an empty page |
| **4. Playwright script** | Local runs where a human can watch | `--engine google` (or `--engine bing --browser`) with `--wait-for-human` |

## Route 1: agent-native, step by step
1. Open `https://www.google.com/search?q=<query>&hl=<lang>&gl=<country>` (or Bing/DuckDuckGo) in your browser tool.
2. If a cookie consent page appears, choose the **privacy-preserving option** ("Reject all" / "Alle ablehnen").
3. If a CAPTCHA or "unusual traffic" page appears: **stop**. Do not try to solve or get around it. Tell the user and continue with another route or later.
4. Optional: open 2–4 "People also ask" questions (click to expand). Google then appends more questions.
5. Run the content of `scripts/serp-extract.js` with your JavaScript tool. It returns `{query, engine, results, paa, related, features, ai}` and only reads the page.
6. Repeat for each query (keep it to the queries you will actually act on, ~5–15). Pause between searches like a person would.
7. Save all returned objects as one JSON array (`captured.json`) and run `node scripts/serp.mjs --import captured.json`, or pass `--serp-import captured.json` to `research.mjs`.

No JavaScript tool? Read the page text and copy the same fields by hand: the top 10 titles and domains, the "People also ask" questions, related searches, and AI Overview headings.

## What to do with the output
- `serp-keywords.csv`: PAA questions and related searches are **real demand in the searcher's words**. Add them to the keyword map; questions become FAQ entries or H2s.
- `serp-outline.csv`: the AI Overview's subtopics are a **coverage checklist** for the brief. A page that answers every subtopic better than the overview has a reason to be clicked and cited.
- `serp-summary.csv`: `dominant_format` tells you which page type wins (don't write a blog post where service pages rank); `difficulty_hint` comes from who ranks (forums/UGC in the top 10 = beatable; many big brands/government sites = hard); `features` shows what takes attention away from organic results (AI Overview, ads, video, local pack).
- Check whether **your own domain** appears in the results. If you have a matching page and don't rank, that's an update task, not a new page.

## Limits and etiquette
- Search engines block automated browsers and fast scrapers; RankForge never tries to defeat bot checks. Low volume, real pauses, stop on challenges.
- Results depend on location, language, device and personalization. Use `hl`/`gl` and note them.
- URLs taken from Google's visible `cite` line keep the exact domain, but long paths may be shortened.
- Respect each search engine's terms. For volume, use the official APIs.
