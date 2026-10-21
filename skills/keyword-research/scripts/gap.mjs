#!/usr/bin/env node
/**
 * gap.mjs — competitor content gap from public sitemaps: topics your competitors publish that you don't.
 *
 *   node gap.mjs --competitors "rival-a.de,https://rival-b.de/sitemap_index.xml" --mine <folder | sitemap URL | domain>
 *                [--min 2] [--max-pages 3000] [--out gap.csv]
 *
 * Each competitor is a domain (robots.txt / sitemap.xml are found automatically) or a sitemap URL.
 * URL slugs become topic phrases; the same topic across competitors is grouped (intent-aware token match),
 * then checked against YOUR pages.
 *
 * Why it works: a topic that several competitors independently invested in is validated demand in your market,
 * and if you have nothing on it, it is a gap. Sorted by how many competitors cover it, then by how little you do.
 *   competitor_count  — distinct competitors with a page on the topic (--min filters; default 2, or 1 with one competitor)
 *   covered_pct       — how much of the topic your best-matching page already covers (0 = clear gap)
 * Slugs are short and sometimes cryptic; open the example URLs before planning a page.
 */
import fs from 'node:fs';
import { parseArgs, list, die, log, tokens, jaccard, coverage, sitemapUrls, urlTopic, readTitles, writeCsv } from './lib.mjs';

const a = parseArgs();
const comps = list(a.competitors);
if (!comps.length || !a.mine) die('usage: gap.mjs --competitors "domainA,domainB" --mine <folder|sitemap|domain> [--min 2] [--out gap.csv]');
const min = Number(a.min || (comps.length > 1 ? 2 : 1));
const maxPages = Number(a['max-pages'] || 3000);
const out = a.out || 'gap.csv';
const asUrl = (s) => (/^https?:\/\//.test(s) ? s : `https://${s}`);

// --- collect competitor topics -------------------------------------------------
const items = [];
for (const c of comps) {
  const src = asUrl(c);
  const host = new URL(src).hostname.replace(/^www\./, '');
  const urls = await sitemapUrls(src, { max: maxPages }).catch(() => []);
  let n = 0;
  for (const u of urls) {
    const topic = urlTopic(u); const t = tokens(topic, { dropFiller: true });
    if (t.size < 2) continue;                 // one-word slugs (about, kontakt, shop) are not topics
    items.push({ comp: host, topic, url: u, t }); n++;
  }
  log(`  ${host}: ${urls.length} URLs, ${n} topic slugs`);
}
if (!items.length) die('no competitor topics found (sitemaps unreachable or empty)');

// --- group the same topic across competitors (token index keeps this fast) -----
const groups = []; const index = new Map();
for (const it of items) {
  const cand = new Set(); for (const tok of it.t) for (const g of index.get(tok) || []) cand.add(g);
  let best = null, bestSim = 0;
  for (const g of cand) { const s = jaccard(it.t, g.t); if (s > bestSim) { bestSim = s; best = g; } }
  if (best && bestSim >= 0.6) { best.comps.add(it.comp); best.pages.push(it); continue; }
  const g = { t: it.t, comps: new Set([it.comp]), pages: [it] };
  groups.push(g);
  for (const tok of it.t) { if (!index.has(tok)) index.set(tok, []); index.get(tok).push(g); }
}

// --- compare with my pages -------------------------------------------------------
const mineSrc = fs.existsSync(a.mine) ? a.mine : asUrl(a.mine);
const mine = (await readTitles(mineSrc)).map((d) => ({ ...d, t: tokens(d.text, { dropFiller: true }) }));
const rows = [];
for (const g of groups) {
  if (g.comps.size < min) continue;
  let best = { c: 0, d: null };
  for (const d of mine) { const c = coverage(g.t, d.t); if (c > best.c) best = { c, d }; }
  const shortest = g.pages.map((p) => p.topic).sort((x, y) => x.length - y.length)[0];
  rows.push({
    topic: shortest, competitor_count: g.comps.size, competitors: [...g.comps].join(' '), pages: g.pages.length,
    covered_pct: Math.round(best.c * 100), closest_mine: best.d ? best.d.text.slice(0, 90) : '',
    example_urls: g.pages.slice(0, 3).map((p) => p.url).join(' '),
  });
}
rows.sort((x, y) => y.competitor_count - x.competitor_count || x.covered_pct - y.covered_pct || y.pages - x.pages);
writeCsv(out, ['topic', 'competitor_count', 'competitors', 'pages', 'covered_pct', 'closest_mine', 'example_urls'], rows);
const gaps = rows.filter((r) => r.covered_pct < 50).length;
log(`✓ ${groups.length} competitor topics (${mine.length} of your pages), ${rows.length} covered by ≥${min} competitor(s), ${gaps} look like gaps (<50% covered) → ${out}`);
