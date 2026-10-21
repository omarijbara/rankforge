#!/usr/bin/env node
/**
 * signals.mjs — collect REAL demand signals without API keys.
 *
 *   node signals.mjs suggest --seeds "website kosten,bfsg website" [--lang de] [--country de]
 *        [--sources google,bing,ddg,youtube,amazon,wikipedia] [--expand questions,modifiers,compare,alphabet]
 *        [--depth 2] [--fanout 20] [--max-queries 600] [--out signals.json]
 *   node signals.mjs trends  [--country de] [--out trends.json]
 *
 * suggest — autocomplete from up to six platforms. WHERE a phrase shows up is itself a signal:
 *   google/bing/ddg  → web search demand          youtube   → how-to / visual demand
 *   amazon           → buying / product demand    wikipedia → entity / definition interest
 *   A phrase returned by several platforms or several expansions is stronger (`hits`, `platforms`).
 *   --expand compare  mines alternatives: "X vs", "X alternative", "X oder" → competing entities.
 *   --depth 2         snowball: the strongest new phrases are fed back in as seeds once more.
 * trends  — Google Trends "trending now" RSS (approx. traffic + news headlines). Mostly off-topic: filter for fit.
 *
 * Autocomplete proves people TYPE a phrase, not how many. It is evidence, never a volume.
 */
import fs from 'node:fs';
import { parseArgs, list, die, log, sleep, today, get, decodeEntities } from './lib.mjs';

const a = parseArgs();
const cmd = a._[0];

const QUESTIONS = {
  de: ['was', 'wie', 'warum', 'wann', 'welche', 'wo', 'wer', 'kann man', 'ist', 'brauche ich'],
  en: ['what', 'how', 'why', 'when', 'which', 'where', 'who', 'can', 'is', 'do i need'],
  fr: ['quoi', 'comment', 'pourquoi', 'quand', 'quel', 'où', 'qui', 'est-ce que'],
  es: ['qué', 'cómo', 'por qué', 'cuándo', 'cuál', 'dónde', 'quién'],
  ar: ['ما هو', 'كيف', 'لماذا', 'متى', 'أين', 'من', 'هل', 'كم'],
  tr: ['nedir', 'nasıl', 'neden', 'ne zaman', 'hangi', 'nerede'],
};
const MODIFIERS = {
  de: ['kosten', 'preis', 'vergleich', 'beste', 'erfahrungen', 'pflicht', 'checkliste', 'anleitung', 'für', 'in der nähe', 'lassen', 'tipps', 'fehler', 'vorlage', 'beispiel'],
  en: ['cost', 'price', 'best', 'review', 'checklist', 'template', 'requirements', 'for', 'near me', 'examples', 'tips', 'mistakes', 'guide', 'tool'],
  fr: ['prix', 'coût', 'meilleur', 'avis', 'obligation', 'pour', 'près de moi', 'exemple', 'guide'],
  es: ['precio', 'costo', 'mejor', 'opiniones', 'obligatorio', 'para', 'cerca de mí', 'ejemplo', 'guía'],
  ar: ['سعر', 'أفضل', 'طريقة', 'شروط', 'مميزات', 'عيوب', 'بالتفصيل', 'خطوات'],
  tr: ['fiyat', 'en iyi', 'nasıl yapılır', 'şartları', 'için', 'örnek'],
};
const COMPARE = {
  de: ['vs', 'oder', 'alternative', 'statt', 'unterschied', 'besser als'],
  en: ['vs', 'or', 'alternative', 'instead of', 'difference', 'better than'],
  fr: ['vs', 'ou', 'alternative', 'différence'], es: ['vs', 'o', 'alternativa', 'diferencia'],
  ar: ['أو', 'بديل', 'الفرق بين', 'مقارنة'], tr: ['vs', 'veya', 'alternatif', 'farkı'],
};
const ALPHABET = { de: 'abcdefghijklmnopqrstuvwxyzäöü'.split(''), ar: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('') };
// Amazon autocomplete endpoints per marketplace (host, marketplace id).
const AMAZON = {
  us: ['completion.amazon.com', 'ATVPDKIKX0DER'], de: ['completion.amazon.de', 'A1PA6795UKMFR9'], uk: ['completion.amazon.co.uk', 'A1F83G8C2ARO7P'],
  gb: ['completion.amazon.co.uk', 'A1F83G8C2ARO7P'], fr: ['completion.amazon.fr', 'A13V1IB3VIYZZH'], es: ['completion.amazon.es', 'A1RKKUPIHCS9HS'],
  it: ['completion.amazon.it', 'APJ6JRA9NG5V4'], ca: ['completion.amazon.ca', 'A2EUQ1WTGCTBG2'],
};

const engines = {
  async google(q, lang, cc) { const d = await get(`https://suggestqueries.google.com/complete/search?client=firefox&hl=${lang}&gl=${cc}&q=${encodeURIComponent(q)}`); return d?.[1] ?? []; },
  async bing(q, lang, cc) { const d = await get(`https://api.bing.com/osjson.aspx?query=${encodeURIComponent(q)}&market=${lang}-${cc.toUpperCase()}`); return d?.[1] ?? []; },
  async ddg(q, lang, cc) { const d = await get(`https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&kl=${cc}-${lang}`); return Array.isArray(d) ? d.map((x) => x.phrase) : []; },
  async youtube(q, lang, cc) { const d = await get(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=${lang}&gl=${cc}&q=${encodeURIComponent(q)}`); return d?.[1] ?? []; },
  async amazon(q, lang, cc) {
    const m = AMAZON[cc]; if (!m) return [];
    const d = await get(`https://${m[0]}/api/2017/suggestions?mid=${m[1]}&alias=aps&prefix=${encodeURIComponent(q)}`);
    return (d?.suggestions ?? []).map((s) => s.value);
  },
  async wikipedia(q, lang) { const d = await get(`https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=10&namespace=0&format=json`); return d?.[1] ?? []; },
};
const HINT = { google: 'web', bing: 'web', ddg: 'web', youtube: 'video/how-to', amazon: 'product/buying', wikipedia: 'entity/definition' };

async function suggest() {
  const seeds = list(a.seeds);
  if (!seeds.length) die('suggest needs --seeds "seed one,seed two"');
  const lang = a.lang || 'en';
  const cc = (a.country || (lang === 'en' ? 'us' : lang)).toLowerCase();
  const sources = list(a.sources || 'google,bing,ddg,youtube').filter((s) => engines[s]);
  const expand = list(a.expand || 'questions,modifiers,compare');
  const depth = Number(a.depth || 1);
  const fanout = Number(a.fanout || 20);
  const maxQ = Number(a['max-queries'] || 600);
  const out = a.out || 'signals.json';

  const variants = (seed) => {
    const v = [seed];
    if (expand.includes('questions')) for (const w of QUESTIONS[lang] || QUESTIONS.en) v.push(`${w} ${seed}`);
    if (expand.includes('modifiers')) for (const m of MODIFIERS[lang] || MODIFIERS.en) v.push(`${seed} ${m}`);
    if (expand.includes('compare')) for (const c of COMPARE[lang] || COMPARE.en) v.push(`${seed} ${c}`);
    if (expand.includes('alphabet')) for (const c of ALPHABET[lang] || 'abcdefghijklmnopqrstuvwxyz'.split('')) v.push(`${seed} ${c}`);
    return v;
  };

  const found = new Map(); const queried = new Set();
  let calls = 0, errors = 0;
  const failing = new Set(); const errCount = {};
  const run = async (q, seed, level) => {
    if (queried.has(q) || calls >= maxQ) return; queried.add(q);
    for (const src of sources) {
      if (failing.has(src)) continue;
      calls++;
      try {
        for (const raw of await engines[src](q, lang, cc)) {
          const phrase = String(raw ?? '').toLowerCase().trim();
          if (!phrase || phrase.length > 120) continue;
          const e = found.get(phrase) || { phrase, seed, sources: new Set(), via: new Set(), hits: 0, depth: level };
          e.sources.add(src); e.via.add(q); e.hits++;
          found.set(phrase, e);
        }
      } catch (err) {
        errors++;
        errCount[src] = (errCount[src] || 0) + 1;
        if (errCount[src] === 4) { failing.add(src); log(`! ${src} disabled after repeated errors (${err.message}). Network blocked or rate-limited.`); }
      }
      await sleep(120);
    }
  };

  for (const seed of seeds) for (const q of variants(seed)) await run(q, seed, 1);
  for (let level = 2; level <= depth; level++) {
    // snowball: strongest phrases not yet used as a query become new seeds (bare + 3 question variants)
    const next = [...found.values()].filter((e) => !queried.has(e.phrase)).sort((x, y) => y.hits - x.hits).slice(0, fanout);
    log(`depth ${level}: expanding the ${next.length} strongest new phrases`);
    for (const e of next) for (const q of [e.phrase, ...(QUESTIONS[lang] || QUESTIONS.en).slice(0, 3).map((w) => `${w} ${e.phrase}`)]) await run(q, e.seed, level);
  }

  const rows = [...found.values()].map((e) => ({
    phrase: e.phrase, seed: e.seed, sources: [...e.sources], platforms: e.sources.size,
    hints: [...new Set([...e.sources].map((s) => HINT[s]))], hits: e.hits, variants: e.via.size, depth: e.depth, found: today(),
  })).sort((x, y) => y.platforms - x.platforms || y.hits - x.hits || x.phrase.localeCompare(y.phrase));
  fs.writeFileSync(out, JSON.stringify(rows, null, 2));
  log(`✓ ${rows.length} unique phrases from ${calls} calls (${sources.join(', ')}; ${errors} errors) → ${out}`);
  if (!rows.length && errors) process.exit(1);
}

async function trends() {
  const cc = String(a.country || 'us').toUpperCase();
  const out = a.out || 'trends.json';
  const xml = await get(`https://trends.google.com/trending/rss?geo=${cc}`, { json: false }).catch((e) => die(`trends: ${e.message}`));
  const tag = (s, t) => decodeEntities((s.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)) || [, ''])[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim());
  const rows = xml.split('<item>').slice(1).map((item) => ({
    term: tag(item, 'title'), traffic: tag(item, 'ht:approx_traffic'),
    news: item.split('<ht:news_item>').slice(1).slice(0, 3).map((n) => ({ title: tag(n, 'ht:news_item_title'), source: tag(n, 'ht:news_item_source') })),
    country: cc, found: today(),
  }));
  fs.writeFileSync(out, JSON.stringify(rows, null, 2));
  log(`✓ ${rows.length} trending searches (${cc}) → ${out}. Most are off-topic: filter for fit.`);
}

if (cmd === 'suggest') await suggest();
else if (cmd === 'trends') await trends();
else die('usage: signals.mjs suggest --seeds "a,b" [--lang de --country de --sources … --expand … --depth 2] | trends --country de');
