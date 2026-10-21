#!/usr/bin/env node
/**
 * overlap.mjs — cannibalization check: does a page for this keyword already exist?
 *
 *   node overlap.mjs --keywords clustered.csv --titles <content folder | sitemap URL | domain | titles.txt> [--out overlap.csv]
 *
 * --keywords  CSV with a `keyword` column, signals.json, or one keyword per line.
 * --titles    a content folder (reads `title:`/`slug:` frontmatter of .md/.mdx, <title> of .html), a sitemap URL or
 *             domain (follows sitemap indexes, uses URL slugs), or a text file with one title or URL per line.
 * Output: keyword;closest;closest_ref;overlap;suggestion
 *   update  (≥ 80 %) a page already targets this: improve it instead of writing a competitor
 *   review  (55–79 %) look at the page before deciding
 *   new     (< 55 %)
 * Lexical overlap is a first filter, not a verdict: the same words can carry different intents.
 */
import fs from 'node:fs';
import { parseArgs, die, log, tokens, coverage, readKeywords, readTitles, writeCsv } from './lib.mjs';

const a = parseArgs();
if (!a.keywords || !a.titles) die('usage: overlap.mjs --keywords keywords.csv --titles <dir|sitemap URL|domain|titles.txt> [--out overlap.csv]');
const out = a.out || 'overlap.csv';
const src = fs.existsSync(a.titles) || /^https?:\/\//.test(a.titles) ? a.titles : `https://${a.titles}`;

const keywords = [...new Set(readKeywords(a.keywords))];
const docs = (await readTitles(src)).map((d) => ({ ...d, t: tokens(d.text, { dropFiller: true }) }));
const counts = { update: 0, review: 0, new: 0 };
const rows = keywords.map((keyword) => {
  const K = tokens(keyword, { dropFiller: true });
  let best = { c: 0, d: null };
  for (const d of docs) { const c = coverage(K, d.t); if (c > best.c) best = { c, d }; }
  const overlap = Math.round(best.c * 100);
  const suggestion = overlap >= 80 ? 'update' : overlap >= 55 ? 'review' : 'new';
  counts[suggestion]++;
  return { keyword, closest: best.d?.text.slice(0, 120) ?? '', closest_ref: best.d?.ref ?? '', overlap, suggestion };
});
writeCsv(out, ['keyword', 'closest', 'closest_ref', 'overlap', 'suggestion'], rows);
log(`✓ ${keywords.length} keywords vs ${docs.length} pages → ${out}  (update ${counts.update}, review ${counts.review}, new ${counts.new})`);
