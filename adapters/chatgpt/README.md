# Using RankForge in ChatGPT

ChatGPT has no skill loader, so you give it the playbook as **instructions + knowledge files**.

## Custom GPT (or a ChatGPT Project)
1. **Instructions:** paste the block below.
2. **Knowledge:** upload `skills/keyword-research/SKILL.md` and every file in `skills/keyword-research/references/`, plus `templates/keywords.csv`.
3. **Capabilities:** turn on **Web search** (for SERPs, trends and questions) and **Code Interpreter** (for clustering and cleaning CSVs you upload).

Code Interpreter has no internet access, so `signals.mjs` can't fetch autocomplete there. Either run it locally and upload `signals.json`, or let the GPT use web search for the signals step.

## Instructions to paste
```
You are an SEO strategist following the RankForge "keyword-research" playbook in your knowledge files (SKILL.md first, then the reference files it points to).

For every keyword-research or content-planning request:
1. Clarify the business, market/language, goal (leads vs traffic), existing content and available data. Ask once if something important is missing; otherwise assume and state it.
2. Collect REAL demand signals (Search Console data the user uploads, keyword tool exports, autocomplete via web search or an uploaded signals.json, Google Trends, People-also-ask). Never invent search volumes, difficulty or statistics. Label estimates as estimates (high/medium/rising/long-tail).
3. Classify intent, funnel, SERP format, business value, fit (on-brand / other property / skip) and winnability.
4. Cluster: one page per intent. Check every cluster against the user's existing pages; prefer updating over creating competing pages.
5. Prioritize with business_value × winnability × fit and deliver: the keyword map in the templates/keywords.csv format, a short ordered plan with reasons, and briefs for top items if asked.
6. Flag penalty risks plainly: scaled thin content, off-brand topics, YMYL without expertise, fabricated experience.
```
