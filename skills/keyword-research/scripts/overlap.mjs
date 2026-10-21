#!/usr/bin/env node
/**
 * overlap.mjs — cannibalization check: does a page for this keyword already exist?
 *
 *   node overlap.mjs --keywords keywords.csv --titles <dir | sitemap URL | titles.txt> [--out overlap.csv]
 *
 * --keywords  CSV with a `keyword` column (; or , separated), signals.json from signals.mjs,
 *             or a plain text file with one keyword per line.
 * --titles    a content folder (reads `title:`/`slug:` frontmatter of .md/.mdx, <title> of .html),
 *             a sitemap URL (uses URL slugs; follows one level of sitemap index),
 *             or a text file with one title or URL per line.
 *
 * Output CSV: keyword;closest;closest_ref;overlap;suggestion
 *   suggestion = update (≥ 80%: a page already targets this), review (55–79%: look before deciding),
 *                new (< 55%).
 * Lexical overlap is a first filter, not a verdict: same words can mean different intents.
 * Node 18+. No dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i > -1 ? args[i + 1] : d; };
const die = (m) => { process.stderr.write(`✗ ${m}\n`); process.exit(1); };

// --- text normalisation (shared logic with cluster.mjs) ---------------------
const STOP = new Set(('der die das und oder für mit ein eine einen im in von zu was wie ist den dem des auf am bei als ohne ' +
  'the a an and or for with in on of to what how is are does do your you my best ' +
  'le la les et ou pour avec un une des du de en est el los las y o para con que ' +
  'في من على عن ما هو هي كيف إلى او أو مع').split(' '));
const tokens = (s) => new Set(String(s).toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '')
  .split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1 && !STOP.has(t))
  .map((t) => (t.length > 4 ? t.replace(/(ungen|ung|en|er|es|e|s|n|ing|ed)$/u, '') : t)));

// --- inputs -----------------------------------------------------------------
function readKeywords(file) {
  const txt = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  if (file.endsWith('.json')) return JSON.parse(txt).map((r) => r.keyword || r.phrase || r.term).filter(Boolean);
  const lines = txt.split(/\r?\n/).filter(Boolean);
  const sep = lines[0].includes(';') ? ';' : lines[0].includes(',') ? ',' : null;
  if (sep) {
    const cols = lines[0].split(sep).map((c) => c.trim().toLowerCase());
    const k = cols.indexOf('keyword');
    if (k > -1) return lines.slice(1).map((l) => l.split(sep)[k]?.trim()).filter(Boolean);
  }
  return lines.map((l) => l.trim());
}

async function readTitles(src) {
  if (/^https?:\/\//.test(src)) {
    const get = async (u) => (await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
    let locs = [...(await get(src)).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    if (locs.some((l) => /\.xml(\?|$)/.test(l))) {
      const nested = [];
      for (const l of locs) nested.push(...[...(await get(l)).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()));
      locs = nested;
    }
    return locs.map((u) => ({ ref: u, text: decodeURIComponent(new URL(u).pathname).replace(/[-_/]+/g, ' ') }));
  }
  if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
    const out = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (!/^(node_modules|\.git|dist)$/.test(e.name)) walk(p); continue; }
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
  if (fs.existsSync(src)) return fs.readFileSync(src, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => ({ ref: l, text: l.replace(/[-_/]+/g, ' ') }));
  die(`--titles: not a folder, file or URL: ${src}`);
}

// --- main -------------------------------------------------------------------
const kwFile = opt('keywords'); const titleSrc = opt('titles'); const out = opt('out', 'overlap.csv');
if (!kwFile || !titleSrc) die('usage: overlap.mjs --keywords keywords.csv --titles <dir|sitemap URL|titles.txt> [--out overlap.csv]');

const keywords = readKeywords(kwFile);
const docs = (await readTitles(titleSrc)).map((d) => ({ ...d, t: tokens(d.text) }));
const rows = ['keyword;closest;closest_ref;overlap;suggestion'];
const counts = { update: 0, review: 0, new: 0 };
for (const kw of keywords) {
  const K = tokens(kw);
  let best = { score: 0, doc: null };
  for (const d of docs) {
    if (!K.size) break;
    let hit = 0; for (const t of K) if (d.t.has(t)) hit++;
    const score = hit / K.size;
    if (score > best.score) best = { score, doc: d };
  }
  const pct = Math.round(best.score * 100);
  const suggestion = pct >= 80 ? 'update' : pct >= 55 ? 'review' : 'new';
  counts[suggestion]++;
  const clean = (s) => String(s || '').replace(/;/g, ',').replace(/\s+/g, ' ').trim();
  rows.push([kw, clean(best.doc?.text).slice(0, 120), clean(best.doc?.ref), pct, suggestion].map(clean).join(';'));
}
fs.writeFileSync(out, rows.join('\n') + '\n');
process.stderr.write(`✓ ${keywords.length} keywords vs ${docs.length} pages → ${out}  (update ${counts.update}, review ${counts.review}, new ${counts.new})\n`);
