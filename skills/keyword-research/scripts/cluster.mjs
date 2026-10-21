#!/usr/bin/env node
/**
 * cluster.mjs — fast lexical first-pass clustering ("which phrases could one page answer?").
 *
 *   node cluster.mjs --in keywords.csv [--out clustered.csv] [--threshold 0.8]
 *
 * --in  CSV with a `keyword` column (; or , separated; other columns are kept), signals.json, or a
 *       text file with one keyword per line.
 * Greedy: phrases are visited shortest-first (short phrases make better cluster heads); each joins the
 * most similar existing head if Jaccard similarity ≥ threshold (default 0.8, ignoring question words),
 * else starts a new cluster.
 *
 * Output: the input columns plus `cluster` (head phrase) and `cluster_similarity` (0–100).
 * This groups by WORDS. An agent must still review by INTENT: "website kosten" vs "website kostenlos"
 * share words and are opposite intents. Split or merge clusters by what the search results show.
 * Node 18+. No dependencies.
 */
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i > -1 ? args[i + 1] : d; };
const die = (m) => { process.stderr.write(`✗ ${m}\n`); process.exit(1); };

// same normalisation as overlap.mjs
const STOP = new Set(('der die das und oder für mit ein eine einen im in von zu was wie ist den dem des auf am bei als ohne ' +
  'the a an and or for with in on of to what how is are does do your you my best ' +
  'le la les et ou pour avec un une des du de en est el los las y o para con que ' +
  'في من على عن ما هو هي كيف إلى او أو مع').split(' '));
// Question and "definition" words don't change WHICH page answers a query ("was ist X" = "X bedeutung"),
// so clustering ignores them. Every other extra word is a modifier that usually DOES change the intent
// ("X kosten" ≠ "X checkliste"), which is why the default threshold is strict.
const stem = (t) => (t.length > 4 ? t.replace(/(ungen|ung|en|er|es|et|e|s|n|t|ing|ed)$/u, '') : t);
const words = (s) => String(s).toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '')
  .split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1 && !STOP.has(t)).map(stem);
const FILLER = new Set(words('wer wo wann warum welche welcher kann man bedeutet bedeutung heißt definition erklärung erklärt einfach ' +
  'who where when why which can mean meaning definition explained simple ' +
  'quoi comment pourquoi quand quel signification que qui ' +
  'como cuando cual significado ' +
  'لماذا متى اين هل معنى تعريف'));
const tokens = (s) => new Set(words(s).filter((t) => !FILLER.has(t)));
const jaccard = (a, b) => { let i = 0; for (const t of a) if (b.has(t)) i++; return i / (a.size + b.size - i || 1); };

const inFile = opt('in'); const out = opt('out', 'clustered.csv'); const threshold = Number(opt('threshold', 0.8));
if (!inFile) die('usage: cluster.mjs --in keywords.csv [--out clustered.csv] [--threshold 0.8]');

// --- read rows, keeping all columns -----------------------------------------
const raw = fs.readFileSync(inFile, 'utf8').replace(/^﻿/, '');
let header, rows;
if (inFile.endsWith('.json')) {
  header = ['keyword', 'hits', 'sources', 'found'];
  rows = JSON.parse(raw).map((r) => [r.keyword || r.phrase || r.term, r.hits ?? '', (r.sources || []).join('+'), r.found ?? '']);
} else {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const sep = lines[0].includes(';') ? ';' : lines[0].includes(',') ? ',' : null;
  const cols = sep ? lines[0].split(sep).map((c) => c.trim()) : [];
  if (sep && cols.map((c) => c.toLowerCase()).includes('keyword')) {
    header = cols; rows = lines.slice(1).map((l) => l.split(sep));
  } else {
    header = ['keyword']; rows = lines.map((l) => [l.trim()]);
  }
}
const k = header.map((c) => c.toLowerCase()).indexOf('keyword');
const ci = header.map((c) => c.toLowerCase()).indexOf('cluster');

// --- greedy clustering --------------------------------------------------------
const items = rows.map((r, i) => ({ i, kw: (r[k] || '').trim(), t: tokens(r[k] || '') })).filter((x) => x.kw);
items.sort((a, b) => a.t.size - b.t.size || a.kw.length - b.kw.length);
const heads = [];
for (const it of items) {
  let best = { sim: 0, head: null };
  for (const h of heads) { const s = jaccard(it.t, h.t); if (s > best.sim) best = { sim: s, head: h }; }
  if (best.head && best.sim >= threshold) { it.cluster = best.head.kw; it.sim = best.sim; best.head.size++; }
  else { it.cluster = it.kw; it.sim = 1; heads.push({ kw: it.kw, t: it.t, size: 1 }); }
}
items.sort((a, b) => a.cluster.localeCompare(b.cluster) || b.sim - a.sim);

// --- write ------------------------------------------------------------------
const outHeader = ci > -1 ? header.map((c, j) => (j === ci ? 'cluster' : c)) : [...header, 'cluster'];
const lines = [[...outHeader, 'cluster_similarity'].join(';')];
for (const it of items) {
  const r = [...rows[it.i]];
  if (ci > -1) r[ci] = it.cluster; else r.push(it.cluster);
  lines.push([...r.map((v) => String(v ?? '').replace(/;/g, ',')), Math.round(it.sim * 100)].join(';'));
}
fs.writeFileSync(out, lines.join('\n') + '\n');
const multi = heads.filter((h) => h.size > 1).length;
process.stderr.write(`✓ ${items.length} keywords → ${heads.length} clusters (${multi} with 2+ phrases) → ${out}. Review by intent next.\n`);
