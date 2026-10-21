#!/usr/bin/env node
/**
 * pageviews.mjs — MEASURED topic interest from Wikipedia page views (free, keyless, official Wikimedia API).
 *
 *   node pageviews.mjs --topics "barrierefreiheit,content management system" [--lang de] [--out pageviews.csv]
 *   node pageviews.mjs --in clustered.csv [--limit 40] [--lang de]
 *
 * For each topic: find the matching Wikipedia article (search → resolve redirects), pull 25 months of
 * monthly views, and report
 *   avg_monthly_views  — mean of the last 12 complete months
 *   yoy_change_pct     — last 3 months vs the same 3 months a year earlier (trend without seasonality noise)
 *   trend              — rising (≥ +25 %) / falling (≤ −25 %) / stable
 *   peak_month         — calendar month with the highest average → WHEN to publish/refresh
 *   seasonality        — peak month ÷ average month (1.0 = flat, 2.0 = strong season)
 *
 * What it is: a real, measured proxy for how much attention a TOPIC/ENTITY gets, and when.
 * What it is not: search volume for a long-tail commercial phrase. Use it for head topics and to rank
 * clusters against each other, to spot rising subjects, and to time content. Long phrases often have no article.
 */
import { parseArgs, list, die, log, sleep, get, readKeywords, writeCsv } from './lib.mjs';

const a = parseArgs();
const lang = a.lang || 'en';
const out = a.out || 'pageviews.csv';
let topics = a.topics ? list(a.topics) : a.in ? readKeywords(a.in) : die('usage: pageviews.mjs --topics "a,b" | --in keywords.csv [--lang de]');
topics = [...new Set(topics.map((t) => t.toLowerCase()))].slice(0, Number(a.limit || 60));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const now = new Date();
const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));          // last day of previous month
const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 25, 1));   // 25 months back
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

async function article(topic) {
  const s = await get(`https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(topic)}&limit=1&namespace=0&format=json`);
  const title = s?.[1]?.[0]; if (!title) return null;
  const q = await get(`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&redirects=1&format=json`);
  return Object.values(q?.query?.pages ?? {})[0]?.title ?? title;
}

const rows = [];
for (const topic of topics) {
  try {
    const title = await article(topic);
    if (!title) { rows.push({ topic, article: '', trend: 'no article' }); continue; }
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.wikipedia/all-access/user/${encodeURIComponent(title.replace(/ /g, '_'))}/monthly/${ymd(start)}/${ymd(end)}`;
    const items = (await get(url).catch(() => ({ items: [] })))?.items ?? [];
    const series = items.map((i) => ({ ym: i.timestamp.slice(0, 6), m: Number(i.timestamp.slice(4, 6)) - 1, v: i.views }));
    const v = series.map((s) => s.v);
    const last12 = v.slice(-12), last3 = v.slice(-3), yearAgo3 = v.slice(-15, -12);
    const yoy = mean(yearAgo3) ? Math.round(((mean(last3) - mean(yearAgo3)) / mean(yearAgo3)) * 100) : null;
    const byMonth = Array.from({ length: 12 }, (_, m) => mean(series.filter((s) => s.m === m).map((s) => s.v)));
    const peak = byMonth.indexOf(Math.max(...byMonth));
    const avg = mean(last12);
    rows.push({
      topic, article: title, avg_monthly_views: Math.round(avg), last_3m_avg: Math.round(mean(last3)),
      yoy_change_pct: yoy ?? '', trend: yoy == null ? 'new/unknown' : yoy >= 25 ? 'rising' : yoy <= -25 ? 'falling' : 'stable',
      peak_month: avg ? MONTHS[peak] : '', seasonality: avg ? (Math.max(...byMonth) / mean(byMonth.filter(Boolean))).toFixed(2) : '',
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    });
  } catch (e) {
    rows.push({ topic, article: '', trend: `error: ${e.message}` });
  }
  await sleep(100);
}
rows.sort((x, y) => (y.avg_monthly_views || 0) - (x.avg_monthly_views || 0));
writeCsv(out, ['topic', 'article', 'avg_monthly_views', 'last_3m_avg', 'yoy_change_pct', 'trend', 'peak_month', 'seasonality', 'url'], rows);
const rising = rows.filter((r) => r.trend === 'rising').map((r) => r.topic);
log(`✓ ${rows.filter((r) => r.article).length}/${rows.length} topics matched a ${lang}.wikipedia article → ${out}${rising.length ? `. Rising: ${rising.slice(0, 5).join(', ')}` : ''}`);
