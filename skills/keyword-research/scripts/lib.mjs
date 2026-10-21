/**
 * lib.mjs — shared helpers for the RankForge keyword-research scripts.
 * Node 18+, no dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';

// --- CLI ----------------------------------------------------------------------
export function parseArgs(argv = process.argv.slice(2)) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { o._.push(a); continue; }
    const k = a.slice(2); const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) o[k] = true; else { o[k] = v; i++; }
  }
  return o;
}
export const list = (s) => String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
export const die = (m) => { process.stderr.write(`✗ ${m}\n`); process.exit(1); };
export const log = (m) => process.stderr.write(`${m}\n`);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const today = () => new Date().toISOString().slice(0, 10);

// --- HTTP ---------------------------------------------------------------------
const UA = 'Mozilla/5.0 (compatible; rankforge-keyword-research; +https://github.com/omarijbara/rankforge)';
/** GET with timeout and polite retry on 429/5xx. Returns parsed JSON (default) or text. */
export const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
export async function get(url, { json = true, retries = 2, timeout = 15000, headers = {} } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: json ? 'application/json' : '*/*', ...headers }, signal: AbortSignal.timeout(timeout) });
      if ((res.status === 429 || res.status >= 500) && attempt < retries) { await sleep(1500 * (attempt + 1)); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return json ? await res.json() : await res.text();
    } catch (e) {
      if (attempt >= retries) throw e;
      await sleep(1000 * (attempt + 1));
    }
  }
}
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ' };
export const decodeEntities = (s) => String(s ?? '')
  .replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, (_, e) => ENTITIES[e])
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

// --- text normalisation -------------------------------------------------------
const STOP = new Set(('der die das und oder für mit ein eine einen im in von zu was wie ist den dem des auf am bei als ohne ' +
  'the a an and or for with in on of to what how is are does do your you my best ' +
  'le la les et ou pour avec un une des du de en est el los las y o para con que ' +
  'في من على عن ما هو هي كيف إلى او أو مع').split(' '));
export const stem = (t) => (t.length > 4 ? t.replace(/(ungen|ung|en|er|es|et|e|s|n|t|ing|ed)$/u, '') : t);
export const words = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '')
  .split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1 && !STOP.has(t)).map(stem);
// Question/definition words don't change which page answers a query ("was ist X" = "X bedeutung").
const FILLER = new Set(words('wer wo wann warum welche welcher kann man bedeutet bedeutung heißt definition erklärung erklärt einfach ' +
  'who where when why which can mean meaning definition explained simple ' +
  'quoi comment pourquoi quand quel signification que qui como cuando cual significado لماذا متى اين هل معنى تعريف'));
export const tokens = (s, { dropFiller = false } = {}) => new Set(dropFiller ? words(s).filter((t) => !FILLER.has(t)) : words(s));
export const jaccard = (a, b) => { let i = 0; for (const t of a) if (b.has(t)) i++; return i / (a.size + b.size - i || 1); };
/** share of a's tokens that also appear in b */
export const coverage = (a, b) => { if (!a.size) return 0; let i = 0; for (const t of a) if (b.has(t)) i++; return i / a.size; };

// --- tables -------------------------------------------------------------------
/** Read CSV (; or ,), JSON array, or plain lines. Returns { header, rows: object[] }. */
export function readTable(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  if (file.endsWith('.json')) {
    const arr = JSON.parse(raw);
    const rows = arr.map((r) => (typeof r === 'string' ? { keyword: r } : { keyword: r.keyword ?? r.phrase ?? r.term ?? r.question, ...r }));
    return { header: [...new Set(rows.flatMap(Object.keys))], rows };
  }
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { header: ['keyword'], rows: [] };
  const sep = lines[0].includes(';') ? ';' : lines[0].includes(',') ? ',' : null;
  const head = sep ? lines[0].split(sep).map((c) => c.trim()) : [];
  // A header row with several columns (or a `keyword` column) means a real table; otherwise one keyword per line.
  if (sep && (head.length > 1 || head[0].toLowerCase() === 'keyword')) {
    const rows = lines.slice(1).map((l) => Object.fromEntries(l.split(sep).map((v, i) => [head[i] ?? `col${i}`, v.trim()])));
    return { header: head, rows };
  }
  return { header: ['keyword'], rows: lines.map((l) => ({ keyword: l.trim() })) };
}
export const readKeywords = (file) => readTable(file).rows.map((r) => r.keyword ?? r.Keyword).filter(Boolean);

export function writeCsv(file, header, rows) {
  const cell = (v) => (Array.isArray(v) ? v.join('+') : String(v ?? '')).replace(/[;\r\n]+/g, ' ').trim();
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, [header.join(';'), ...rows.map((r) => header.map((h) => cell(r[h])).join(';'))].join('\n') + '\n');
}

export const stripTags = (s) => decodeEntities(String(s ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// --- site content (own pages or competitors) ----------------------------------
const SKIP_PATH = /\/(tag|tags|category|categories|kategorie|author|autor|page|seite|feed|wp-content|cart|checkout|account|login|search|suche)(\/|$)/i;
/** Sitemap URLs (follows sitemap indexes; accepts a domain and tries robots.txt + /sitemap.xml). */
export async function sitemapUrls(src, { max = 20000 } = {}) {
  let start = src;
  if (!/\.xml(\?|$)/i.test(src)) {
    const base = src.replace(/\/+$/, '');
    const robots = await get(`${base}/robots.txt`, { json: false }).catch(() => '');
    const fromRobots = [...robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
    start = fromRobots[0] || `${base}/sitemap.xml`;
  }
  const seen = new Set(); const out = []; const queue = [start]; let lastError = '';
  while (queue.length && out.length < max && seen.size < 60) {
    const u = queue.shift(); if (seen.has(u)) continue; seen.add(u);
    const xml = await get(u, { json: false }).catch((e) => { lastError = `${u}: ${e.message}`; return ''; });
    const locs = [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?([^<\]]+)/g)].map((m) => decodeEntities(m[1].trim()));
    for (const l of locs) (/\.xml(\.gz)?(\?|$)/i.test(l) ? queue.push(l) : out.push(l));
  }
  if (out.length) return out.slice(0, max);
  // Fallback: many sites block bots on sitemaps but leave RSS/Atom feeds open (recent posts only).
  const base = new URL(start).origin;
  for (const f of ['/feed/', '/rss.xml', '/feed.xml', '/atom.xml', '/index.xml', '/blog/feed/']) {
    const xml = await get(base + f, { json: false }).catch(() => '');
    const links = [...xml.matchAll(/<link>\s*(?:<!\[CDATA\[)?(https?:[^<\]]+)/g), ...xml.matchAll(/<link[^>]+href="(https?:[^"]+)"/g)]
      .map((m) => decodeEntities(m[1].trim())).filter((l) => l.replace(/\/+$/, '') !== base);
    if (links.length > 2) { log(`  ${base}: sitemap unavailable${lastError ? ` (${lastError})` : ''}; using ${f} (recent posts only)`); return [...new Set(links)].slice(0, max); }
  }
  log(`  ${base}: no sitemap or feed readable${lastError ? ` (${lastError})` : ''}. The site may block bots; paste URLs into a text file instead.`);
  return [];
}
/** Turn a URL into a readable topic phrase from its last meaningful path segment. */
export function urlTopic(u) {
  try {
    const p = decodeURIComponent(new URL(u).pathname);
    if (SKIP_PATH.test(p)) return '';
    const seg = p.split('/').filter(Boolean).pop() || '';
    return seg.replace(/\.(html?|php|aspx?)$/i, '').replace(/[-_+]+/g, ' ').replace(/\b\d{4,}\b/g, '').trim();
  } catch { return ''; }
}
/** Titles of existing pages: content folder (md/mdx/html), sitemap URL/domain, or text file. */
export async function readTitles(src) {
  if (/^https?:\/\//.test(src)) return (await sitemapUrls(src)).map((u) => ({ ref: u, text: urlTopic(u) })).filter((d) => d.text);
  if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
    const out = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (!/^(node_modules|\.git|dist|build|\.next)$/.test(e.name)) walk(p); continue; }
        if (!/\.(mdx?|html?)$/i.test(e.name)) continue;
        const t = fs.readFileSync(p, 'utf8');
        const fm = (k) => (t.match(new RegExp(`^${k}:\\s*["']?(.+?)["']?\\s*$`, 'm')) || [])[1];
        const title = fm('title') || (t.match(/<title>([^<]+)<\/title>/i) || [])[1] || '';
        const slug = fm('slug') || e.name.replace(/\.\w+$/, '');
        out.push({ ref: p, text: `${title} ${slug.replace(/[-_]+/g, ' ')}` });
      }
    };
    walk(src);
    return out;
  }
  if (fs.existsSync(src)) return fs.readFileSync(src, 'utf8').split(/\r?\n/).filter(Boolean)
    .map((l) => ({ ref: l, text: /^https?:/.test(l) ? urlTopic(l) : l.replace(/[-_/]+/g, ' ') })).filter((d) => d.text);
  die(`not a folder, file or URL: ${src}`);
}
