# Writing for answer engines (AEO / GEO)

AI answers (Google AI Overviews and AI Mode, ChatGPT search, Perplexity, Claude, Copilot) quote pages that answer clearly and can be trusted. Plan keywords AND page structure for that.

## Keyword side
- Questions ("was kostet…", "how do I…", "is X required…") and definitions ("what is X") are the phrases AI answers most often. Capture them from autocomplete and "People also ask".
- Comparisons ("X vs Y") and "best X for Y" get summarized heavily. Be the source with a clear verdict and clear criteria.
- Track brand and topic visibility in AI answers by hand (ask the engines your key questions) until your tooling can measure it.

## Page side (put this in every brief)
1. **The first sentence answers the query directly.** One self-contained sentence that makes sense quoted alone.
2. Then depth: criteria, steps, ranges, exceptions. Scannable H2/H3s that mirror real sub-questions.
3. **A short FAQ** with 3–6 real questions (from PAA or autocomplete), each answered in 2–4 sentences.
4. **Concrete, verifiable facts** with dates and named sources ("Stand Oktober 2026, laut …"). No invented statistics.
5. Tables for comparisons and cost factors; numbered lists for processes.
6. Structured data where it fits (`Article`, `FAQPage`, `HowTo`, `Product`, `LocalBusiness`, `Organization`), and clean, crawlable HTML.
7. Clear authorship and real experience: who wrote it, and why they know.
8. Machine-readable site summaries help agents find you: `llms.txt` / `llms-full.txt` listing key pages with correct URLs.
