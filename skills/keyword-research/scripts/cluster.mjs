#!/usr/bin/env node
/**
 * cluster.mjs — fast first-pass clustering: "which phrases could ONE page answer?"
 *
 *   node cluster.mjs --in signals.json|keywords.csv [--out clustered.csv] [--threshold 0.8]
 *
 * Input: CSV with a `keyword` column (; or , separated; other columns are kept), signals.json, or one keyword per line.
 * Greedy: phrases are visited shortest-first (short phrases make better cluster heads); each joins the most similar
 * head if Jaccard similarity ≥ threshold, ignoring question/definition words, else it starts a new cluster.
 *   "was ist website relaunch" + "website relaunch bedeutung"   → same cluster (definition intent)
 *   "website relaunch kosten" + "was kostet ein website relaunch" → same cluster (cost intent)
 *   "website relaunch kosten" vs "website relaunch checkliste"   → different clusters (different modifier = intent)
 * Output: input columns + `cluster` (head phrase) + `cluster_size` + `cluster_similarity` (0–100).
 * Still review by INTENT: "website kosten" and "website kostenlos" share words and are opposite intents.
 */
import { parseArgs, die, log, tokens, jaccard, readTable, writeCsv } from './lib.mjs';

const a = parseArgs();
if (!a.in) die('usage: cluster.mjs --in keywords.csv [--out clustered.csv] [--threshold 0.8]');
const out = a.out || 'clustered.csv';
const threshold = Number(a.threshold || 0.8);

const { header, rows } = readTable(a.in);
const items = rows.map((r, i) => ({ i, kw: String(r.keyword ?? '').trim(), t: tokens(r.keyword, { dropFiller: true }) })).filter((x) => x.kw);
items.sort((x, y) => x.t.size - y.t.size || x.kw.length - y.kw.length);
const heads = [];
for (const it of items) {
  let best = { sim: 0, head: null };
  for (const h of heads) { const s = jaccard(it.t, h.t); if (s > best.sim) best = { sim: s, head: h }; }
  if (best.head && best.sim >= threshold) { it.head = best.head; it.sim = best.sim; best.head.size++; }
  else { const h = { kw: it.kw, t: it.t, size: 1 }; heads.push(h); it.head = h; it.sim = 1; }
}
items.sort((x, y) => y.head.size - x.head.size || x.head.kw.localeCompare(y.head.kw) || y.sim - x.sim);

const cols = ['keyword', ...header.filter((h) => !['keyword', 'phrase', 'cluster', 'cluster_size', 'cluster_similarity'].includes(h)), 'cluster', 'cluster_size', 'cluster_similarity'];
writeCsv(out, cols, items.map((it) => ({ ...rows[it.i], keyword: it.kw, cluster: it.head.kw, cluster_size: it.head.size, cluster_similarity: Math.round(it.sim * 100) })));
log(`✓ ${items.length} keywords → ${heads.length} clusters (${heads.filter((h) => h.size > 1).length} with 2+ phrases) → ${out}. Review by intent next.`);
