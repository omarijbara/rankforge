#!/usr/bin/env node
/**
 * research.mjs — the whole discovery pipeline in one command.
 *
 *   node research.mjs --seeds "website relaunch,bfsg website" --lang de --country de
 *        [--site <content folder | sitemap URL | domain>] [--competitors "rival-a.de,rival-b.de"]
 *        [--sources google,bing,ddg,youtube,wikipedia,amazon] [--depth 2] [--questions] [--no-pageviews] [--no-trends]
 *        [--dir research-<date>]
 *
 * Runs, in order (each step's raw output is kept in --dir):
 *   1 signals.mjs suggest  multi-platform autocomplete + compare mining (+ snowball with --depth 2)
 *   2 signals.mjs trends   today's trending searches, filtered to ones that touch your seeds
 *   3 cluster.mjs          one cluster per intent
 *   4 overlap.mjs          vs your existing pages (with --site)
 *   5 pageviews.mjs        measured interest, trend and seasonality for the biggest clusters
 *   6 questions.mjs        real questions with view counts (default for English, --questions to force)
 *   7 gap.mjs              competitor topics you don't cover (with --competitors and --site)
 *   8 serp.mjs             what ranks for the biggest clusters: format, difficulty, PAA/related keywords, AI-overview outline
 *                          (--serp ddg | bing --browser | google [--wait-for-human] | brave | google-api, or
 *                           --serp-import captured.json from an agent's own browser via serp-extract.js)
 * and merges everything into
 *   keywords.csv  — the RankForge keyword map, PRE-FILLED: intent/funnel/format/business_value are heuristic
 *                   guesses from the wording and platform; fit and difficulty are left as "?" on purpose.
 *   report.md     — what was found, where the opportunities are, and what the agent must verify next.
 * The pipeline gathers evidence and drafts. Judgment (SERP check, fit, priority) stays with the agent: SKILL.md steps 3–5.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs, list, die, log, today, tokens, coverage, readTable, writeCsv } from './lib.mjs';

const a = parseArgs();
const seeds = list(a.seeds);
if (!seeds.length) die('usage: research.mjs --seeds "a,b" --lang de --country de [--site …] [--competitors …] [--depth 2]');
const lang = a.lang || 'en';
const cc = (a.country || (lang === 'en' ? 'us' : lang)).toLowerCase();
const dir = path.resolve(a.dir || `research-${today()}`);
fs.mkdirSync(dir, { recursive: true });
const here = path.dirname(fileURLToPath(import.meta.url));
const f = (n) => path.join(dir, n);
const step = (label, script, args) => {
  log(`\n▶ ${label}`);
  try { execFileSync(process.execPath, [path.join(here, script), ...args], { stdio: ['ignore', 'inherit', 'inherit'] }); return true; }
  catch { log(`! ${label} failed; continuing without it.`); return false; }
};

// --- 1–7: collect ----------------------------------------------------------------
const sources = a.sources || 'google,bing,ddg,youtube,wikipedia';
if (!step('Autocomplete on several platforms', 'signals.mjs', ['suggest', '--seeds', seeds.join(','), '--lang', lang, '--country', cc, '--sources', sources,
  '--expand', 'questions,modifiers,compare', '--depth', String(a.depth || 1), '--out', f('signals.json')])) die('no signals collected; check network access');
const haveTrends = !a['no-trends'] && step('Trending searches', 'signals.mjs', ['trends', '--country', cc, '--out', f('trends.json')]);
step('Clustering by intent', 'cluster.mjs', ['--in', f('signals.json'), '--out', f('clustered.csv')]);
const haveOverlap = Boolean(a.site) && step('Checking your existing pages', 'overlap.mjs', ['--keywords', f('clustered.csv'), '--titles', a.site, '--out', f('overlap.csv')]);

const clustered = readTable(f('clustered.csv')).rows;
const clusterHits = new Map();
for (const r of clustered) clusterHits.set(r.cluster, (clusterHits.get(r.cluster) || 0) + (Number(r.hits) || 0));
const bigClusters = [...clusterHits.entries()].sort((x, y) => y[1] - x[1]).slice(0, 30).map(([head]) => head);
const pvTopics = [...new Set([...seeds, ...bigClusters])];
const havePv = !a['no-pageviews'] && step('Wikipedia interest, trend and seasonality', 'pageviews.mjs', ['--topics', pvTopics.join(','), '--lang', lang, '--out', f('pageviews.csv')]);
const haveQ = Boolean(a.questions || lang === 'en') && step('Real questions (StackExchange, Hacker News)', 'questions.mjs', ['--seeds', seeds.join(','), '--hn', '--out', f('questions.csv')]);
const haveGap = Boolean(a.competitors && a.site) && step('Competitor content gap', 'gap.mjs', ['--competitors', a.competitors, '--mine', a.site, '--out', f('gap.csv')]);
// --serp ddg | bing --browser | google | brave | google-api  ·  --serp-import captured.json (agent's own browser)
const serpArgs = a['serp-import'] ? ['--import', a['serp-import']]
  : a.serp ? ['--queries', bigClusters.slice(0, Number(a['serp-limit'] || 8)).join(','), '--engine', String(a.serp), '--lang', lang, '--country', cc,
    ...(a.browser ? ['--browser'] : []), ...(a['wait-for-human'] ? ['--wait-for-human'] : [])] : null;
const haveSerp = Boolean(serpArgs) && step('Reading search results pages', 'serp.mjs', [...serpArgs, '--out', f('serp.json')]) && fs.existsSync(f('serp-summary.csv'));

// --- merge -----------------------------------------------------------------------
const overlap = new Map(haveOverlap ? readTable(f('overlap.csv')).rows.map((r) => [r.keyword, r]) : []);
const pv = havePv ? readTable(f('pageviews.csv')).rows.filter((r) => r.article) : [];
const pvFor = (head) => { const H = tokens(head, { dropFiller: true }); return pv.find((p) => coverage(tokens(p.topic, { dropFiller: true }), H) >= 0.99); };

const RX = {
  transactional: /\b(lassen|agentur|kaufen|bestellen|buchen|anbieter|dienstleister|freelancer|firma|hire|buy|order|agency|service|services|company|quote|angebot)\b/i,
  local: /\b(in der nähe|near me|regional|vor ort)\b/i,
  commercial: /\b(kosten|kostet|preis|preise|vergleich|vs|oder|alternative|alternativen|beste|besten|test|erfahrungen|günstig|cost|price|pricing|best|compare|review|reviews|cheap|top)\b/i,
};
const intentOf = (k, hints) => (RX.local.test(k) ? 'local' : RX.transactional.test(k) ? 'transactional'
  : RX.commercial.test(k) || hints.includes('product/buying') ? 'commercial' : 'informational');
const FUNNEL = { transactional: 'BOFU', local: 'BOFU', commercial: 'MOFU', informational: 'TOFU' };
// "der oder das X" / "die oder der X" is a grammar question about the word's article, not a comparison.
const GRAMMAR = /\b(der|die|das) oder (der|die|das)\b/i;
const formatOf = (k, hints) => (!GRAMMAR.test(k) && /\b(vs|oder|alternative|vergleich|unterschied|compare|difference|or)\b/i.test(k) ? 'comparison'
  : /\b(checkliste|checklist)\b/i.test(k) ? 'checklist' : /\b(vorlage|template|muster|beispiel|example)\b/i.test(k) ? 'template'
  : RX.transactional.test(k) ? 'service-page' : hints.length === 1 && hints[0] === 'video/how-to' ? 'video' : 'guide');
const VALUE = { transactional: 'high', local: 'high', commercial: 'high', informational: 'medium' };

const serpSum = new Map(haveSerp ? readTable(f('serp-summary.csv')).rows.map((s) => [s.query, s]) : []);
const rows = clustered.map((r) => {
  const hints = String(r.hints || '').split('+').filter(Boolean);
  const platforms = Number(r.platforms) || 0, hits = Number(r.hits) || 0;
  const intent = intentOf(r.keyword, hints);
  const p = pvFor(r.cluster);
  const ov = overlap.get(r.keyword);
  const demand = (platforms >= 3 && hits >= 10 ? 'high' : platforms >= 2 || hits >= 5 ? 'medium' : 'long-tail') + (p?.trend === 'rising' ? '+rising' : '');
  const notes = [`platforms ${r.sources || '?'}`, ov ? `overlap ${ov.overlap}%${ov.closest ? ` with "${ov.closest.slice(0, 50)}"` : ''}` : '',
    p ? `wikipedia ${p.avg_monthly_views}/mo ${p.trend}${p.peak_month ? ` peak ${p.peak_month}` : ''}` : '', 'intent/format/value = heuristic, verify SERP'].filter(Boolean).join(' | ');
  return {
    keyword: r.keyword, cluster: r.cluster, intent, funnel: FUNNEL[intent], format: formatOf(r.keyword, hints), demand,
    demand_source: `autocomplete:${r.sources || ''}${p ? '+wikipedia' : ''}`, business_value: VALUE[intent], fit: '?',
    difficulty: serpSum.get(r.cluster)?.difficulty_hint ? `${serpSum.get(r.cluster).difficulty_hint.split(' ')[0]} (serp)` : '?', priority: '',
    target_url: ov && ov.suggestion !== 'new' ? ov.closest_ref : '', action: ov ? ov.suggestion : 'new',
    notes, found: today(), platforms, hits, cluster_size: r.cluster_size, trend: p?.trend || '', peak_month: p?.peak_month || '',
  };
});
const COLS = ['keyword', 'cluster', 'intent', 'funnel', 'format', 'demand', 'demand_source', 'business_value', 'fit', 'difficulty', 'priority',
  'target_url', 'action', 'notes', 'found', 'platforms', 'hits', 'cluster_size', 'trend', 'peak_month'];
writeCsv(f('keywords.csv'), COLS, rows);

// --- report ------------------------------------------------------------------------
const byCluster = new Map(); for (const r of rows) { if (!byCluster.has(r.cluster)) byCluster.set(r.cluster, []); byCluster.get(r.cluster).push(r); }
const cl = [...byCluster.entries()].map(([head, rs]) => {
  const h = rs.find((r) => r.keyword === head) || rs[0];
  return { head, size: rs.length, hits: rs.reduce((s, r) => s + r.hits, 0), platforms: Math.max(...rs.map((r) => r.platforms)),
    intent: h.intent, action: h.action, trend: h.trend, peak: h.peak_month, target: rs.find((r) => r.target_url)?.target_url || '' };
}).sort((x, y) => y.platforms - x.platforms || y.hits - x.hits);
const table = (rs, cols) => [`| ${cols.join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`, ...rs.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const md = [`# Keyword research: ${seeds.join(', ')} (${lang}-${cc.toUpperCase()}), ${today()}`, ''];
md.push(`**${rows.length} real phrases** in **${cl.length} intent clusters** from ${sources.split(',').length} platforms` +
  (haveOverlap ? `; vs your site: **${rows.filter((r) => r.action === 'update').length} update**, ${rows.filter((r) => r.action === 'review').length} review, ${rows.filter((r) => r.action === 'new').length} new` : '') + '.', '');
md.push('> Evidence plus heuristic drafts. Before planning, check the SERP for the top clusters, then fill `fit`, `difficulty` and `priority` in keywords.csv (SKILL.md steps 3–5).', '');
md.push('## Top clusters (by platform spread, then autocomplete hits)', '',
  table(cl.slice(0, 25).map((c) => [c.head, c.size, c.platforms, c.hits, c.intent, c.action, [c.trend, c.peak && `peak ${c.peak}`].filter(Boolean).join(', ') || '–']),
    ['cluster', 'phrases', 'platforms', 'hits', 'intent', 'action', 'interest']), '');
const upd = cl.filter((c) => c.action === 'update');
if (upd.length) md.push('## Existing pages to improve first (cheapest wins)', '', ...upd.slice(0, 15).map((c) => `- **${c.head}** → \`${c.target}\` (${c.size} phrases)`), '');
const cmp = rows.filter((r) => r.format === 'comparison');
if (cmp.length) md.push('## Comparisons & alternatives searchers weigh', '', cmp.slice(0, 15).map((r) => `\`${r.keyword}\``).join(' · '), '');
const vid = rows.filter((r) => /youtube/.test(r.demand_source)).sort((x, y) => y.hits - x.hits);
if (vid.length) md.push('## Video demand (seen on YouTube): embed or make a video', '', vid.slice(0, 12).map((r) => `\`${r.keyword}\``).join(' · '), '');
const prod = rows.filter((r) => /amazon/.test(r.demand_source));
if (prod.length) md.push('## Product / buying demand (seen on Amazon)', '', prod.slice(0, 12).map((r) => `\`${r.keyword}\``).join(' · '), '');
if (pv.length) md.push('## Measured interest (Wikipedia page views)', '',
  table(pv.slice(0, 15).map((p) => [p.topic, p.avg_monthly_views, `${p.yoy_change_pct}%`, p.trend, p.peak_month, p.seasonality]), ['topic', 'views/month', 'YoY', 'trend', 'peak', 'season ×']),
  '', '_Seasonality ≥ 1.5: publish or refresh 4–8 weeks before the peak month._', '');
if (haveQ) { const q = readTable(f('questions.csv')).rows.slice(0, 15); if (q.length) md.push('## Real questions (with views)', '', ...q.map((x) => `- ${x.question}${x.views ? ` (${x.views} views)` : ''}: ${x.source}`), ''); }
if (haveGap) { const g = readTable(f('gap.csv')).rows.filter((r) => Number(r.covered_pct) < 50).slice(0, 20); if (g.length) md.push('## Competitor gaps (they cover it, you don\'t)', '', table(g.map((r) => [r.topic, r.competitor_count, `${r.covered_pct}%`]), ['topic', 'competitors', 'your coverage']), ''); }
if (haveSerp) {
  const ss = readTable(f('serp-summary.csv')).rows;
  md.push('## What ranks now (search results pages)', '',
    table(ss.map((s) => [s.query, s.engine, s.dominant_format, s.difficulty_hint, s.features || '–', s.top_domains.split(' ').slice(0, 3).join(', ')]),
      ['query', 'engine', 'winning format', 'difficulty', 'features', 'top domains']), '');
  const sk = fs.existsSync(f('serp-keywords.csv')) ? readTable(f('serp-keywords.csv')).rows : [];
  if (sk.length) md.push('## New keywords from the SERPs (People also ask, related searches)', '', ...sk.slice(0, 25).map((k) => `- ${k.keyword} _(${k.source}, from "${k.query}")_`), '');
  if (fs.existsSync(f('serp-outline.csv'))) {
    const byQ = new Map(); for (const o of readTable(f('serp-outline.csv')).rows) { if (!byQ.has(o.query)) byQ.set(o.query, []); byQ.get(o.query).push(o.subtopic); }
    md.push('## What Google\'s AI Overview covers (use as an outline checklist)', '', ...[...byQ].map(([q, s]) => `- **${q}:** ${s.join(' · ')}`), '');
  }
}
if (haveTrends) {
  const S = new Set(seeds.flatMap((s) => [...tokens(s, { dropFiller: true })]));
  // on-topic = the trending term itself shares a seed word, or its headlines share at least two different seed words
  const hitsIn = (s) => new Set([...tokens(s, { dropFiller: true })].filter((w) => S.has(w))).size;
  const tr = JSON.parse(fs.readFileSync(f('trends.json'), 'utf8')).filter((x) => hitsIn(x.term) >= 1 || hitsIn(x.news.map((n) => n.title).join(' ')) >= 2);
  md.push('## Trending today that touches your seeds', '', tr.length ? tr.map((x) => `- **${x.term}** (${x.traffic}): ${x.news[0]?.title || ''}`).join('\n') : '_Nothing on-topic in today\'s trending list (normal for niche B2B topics)._', '');
}
md.push('## Next steps for the agent', '',
  '1. Open the SERP for the top 10 clusters: confirm intent and format, note who ranks (difficulty).',
  '2. Mark `fit` (on-brand / other-property / skip). Drop navigational and off-brand phrases.',
  '3. Score `priority` = business_value × winnability × fit (1–3 each) and order: updates → money pages → supporting → trends.',
  '4. Write briefs for the top items (references/output-formats.md), applying references/aeo-geo.md.', '',
  `Files: ${fs.readdirSync(dir).join(', ')}`);
fs.writeFileSync(f('report.md'), md.join('\n') + '\n');
log(`\n✓ Done → ${dir}\n  keywords.csv (${rows.length} rows, ${cl.length} clusters) and report.md`);
