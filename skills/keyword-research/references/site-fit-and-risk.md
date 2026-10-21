# Site fit, penalty risk and automation

## Fit test (ask for every keyword)
1. **Can this business credibly answer it?** It needs expertise, experience, products or services that relate. If not, it doesn't belong here.
2. **Does it strengthen the site's topical focus or dilute it?** Search engines judge sites partly as a whole. A focused site on "web design for SMEs" that also publishes "best gaming laptops" and "Nvidia stock" looks like a content farm.
3. **Could a searcher become a customer, or is the value only ad impressions?** Both are legitimate goals, but they often belong on **different properties**: a focused commercial site plus a separate broad info/ad site.

Outcomes: `on-brand` → plan it. `other-property` → note where it belongs. `skip` → drop it.

## Penalty risk: patterns to flag loudly
- **Scaled content abuse:** many pages produced mainly to rank, with little original value (mass AI articles, templated city/industry permutations, rewritten competitor content). Can demote the whole domain.
- **Site reputation abuse:** off-topic third-party or "parasite" content hosted for rankings.
- **Expired-domain abuse:** using an old domain's authority for unrelated content.
- **Thin YMYL:** health, finance, legal or safety content without real expertise and sources.
- **Fabricated E-E-A-T:** invented experience, statistics, testimonials, case studies or credentials.

If a site has already lost traffic in a core or spam update, **recommend fewer, better pages and fixing or removing weak ones** before publishing more. Volume is not the cure.

## Automation (scheduled agents that research and/or publish)
A setup that works in production:
- **Separate roles.** A *scout* only researches and appends to a keyword list. A *publisher* picks from the list, writes, checks and deploys. Neither does the other's job, so neither is tempted to lower the bar.
- **Make research dynamic.** The scout plans each run from the date and season, thin clusters, follow-ups to captured trends and a varied discovery mix, and changes its plan if it matches the last run. The publisher can do a quick live trend check before picking.
- **Cap per run** (e.g. 1–3 pages) and let a run publish **zero** when nothing passes the gates.
- **Dedupe every run** against published pages AND a log of used keywords; never rely on memory between runs.
- **Gates before publishing:** word-count range, first sentence answers the query, every internal link exists, no invented facts or numbers, required sections present, build passes.
- **Commit the source before deploying**, so a crash never leaves live pages without source files.
- **Trends expire** (30 days by default), and trend topics are written to stay useful after the news.
- **Log** every run: what was picked, what was skipped and why, what went live.
- **Watch Search Console** weekly: if new pages aren't being indexed or impressions fall, slow down.
