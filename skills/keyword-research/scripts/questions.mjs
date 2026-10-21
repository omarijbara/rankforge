#!/usr/bin/env node
/**
 * questions.mjs — mine REAL questions people ask, with real engagement numbers (keyless).
 *
 *   node questions.mjs --seeds "website relaunch,wordpress seo" [--sites webmasters,wordpress,ux,superuser,stackoverflow]
 *                      [--hn] [--since 2023] [--min-views 0] [--out questions.csv]
 *
 * Sources:
 *   StackExchange API — question titles with VIEW COUNTS (the number of people who had this exact problem),
 *                       score and answer count. 300 keyless requests/day per IP; the script respects `backoff`.
 *   Hacker News (Algolia) with --hn — discussions with points/comments; good for tech/SaaS/dev-tool markets.
 *
 * Use the output for: FAQ sections, H2s that mirror real wording, pain-point angles, "how to fix X" content,
 * and spotting problems competitors don't answer. StackExchange is mostly English; translate the INTENT,
 * not the words, for other markets, and re-check the local phrasing with signals.mjs.
 */
import { parseArgs, list, die, log, sleep, get, decodeEntities, writeCsv } from './lib.mjs';

const a = parseArgs();
const seeds = list(a.seeds);
if (!seeds.length) die('usage: questions.mjs --seeds "a,b" [--sites webmasters,wordpress,…] [--hn] [--out questions.csv]');
const sites = list(a.sites || 'webmasters,wordpress,ux,superuser');
const minViews = Number(a['min-views'] || 0);
const out = a.out || 'questions.csv';
const date = (unix) => new Date(unix * 1000).toISOString().slice(0, 10);
// --since 2023 (year) or 2023-06-01: only questions asked since then. Old questions show lasting demand;
// recent ones show what is changing now. Run both when it matters.
const since = a.since ? Math.floor(Date.parse(/^\d{4}$/.test(a.since) ? `${a.since}-01-01` : a.since) / 1000) : 0;

const rows = []; const seen = new Set();
const add = (r) => { const k = r.question.toLowerCase(); if (seen.has(k)) return; seen.add(k); rows.push(r); };

for (const seed of seeds) {
  for (const site of sites) {
    try {
      const d = await get(`https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=votes&q=${encodeURIComponent(seed)}&site=${site}&pagesize=25${since ? `&fromdate=${since}` : ''}`);
      for (const q of d.items ?? []) {
        if ((q.view_count ?? 0) < minViews) continue;
        add({ question: decodeEntities(q.title), source: `stackexchange:${site}`, views: q.view_count, score: q.score, answers: q.answer_count,
          date: date(q.creation_date), tags: (q.tags || []).join(' '), url: q.link, seed });
      }
      if (d.backoff) await sleep(d.backoff * 1000);
      if (d.quota_remaining !== undefined && d.quota_remaining < 5) { log('! StackExchange quota nearly used up; stopping StackExchange.'); break; }
    } catch (e) { log(`! stackexchange ${site}: ${e.message}`); }
    await sleep(150);
  }
  if (a.hn) {
    try {
      const d = await get(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(seed)}&tags=(story,ask_hn)&hitsPerPage=25`);
      for (const h of d.hits ?? []) {
        if (!h.title) continue;
        add({ question: h.title, source: 'hackernews', views: '', score: h.points, answers: h.num_comments,
          date: String(h.created_at).slice(0, 10), tags: (h._tags || []).filter((t) => /ask_hn|show_hn/.test(t)).join(' '),
          url: `https://news.ycombinator.com/item?id=${h.objectID}`, seed });
      }
    } catch (e) { log(`! hackernews: ${e.message}`); }
  }
}
rows.sort((x, y) => (Number(y.views) || 0) - (Number(x.views) || 0) || (y.score || 0) - (x.score || 0));
writeCsv(out, ['question', 'source', 'views', 'score', 'answers', 'date', 'tags', 'url', 'seed'], rows);
const top = rows.find((r) => r.views);
log(`✓ ${rows.length} questions → ${out}${top ? `. Most viewed: "${top.question}" (${top.views} views)` : ''}`);
