#!/usr/bin/env node
/**
 * signals.mjs — collect REAL demand signals without API keys.
 *
 *   node signals.mjs suggest --seeds "website kosten,bfsg website" [--lang de] [--country de]
 *                            [--expand questions,alphabet,modifiers] [--sources google,ddg] [--out signals.json]
 *   node signals.mjs trends  [--country de] [--out trends.json]
 *
 * suggest: Google + DuckDuckGo autocomplete for each seed and its expansions
 *          ("<question word> <seed>", "<seed> a…z", "<seed> <modifier>"). A phrase returned for
 *          several expansions or by both engines is a stronger signal (`hits`).
 * trends:  Google Trends "trending now" RSS for a country (approx. traffic + news headlines).
 *
 * Autocomplete shows what people TYPE, not how often. It is evidence of demand, not a volume.
 * Node 18+ (global fetch). No dependencies. Be polite: requests are spaced out.
 */
import fs from 'node:fs';

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = new Date().toISOString().slice(0, 10);

// Question starters and intent modifiers per language. Extend freely (PRs welcome).
const QUESTIONS = {
  de: ['was', 'wie', 'warum', 'wann', 'welche', 'wo', 'wer', 'kann man', 'ist'],
  en: ['what', 'how', 'why', 'when', 'which', 'where', 'who', 'can', 'is', 'does'],
  fr: ['quoi', 'comment', 'pourquoi', 'quand', 'quel', 'où', 'qui', 'est-ce que'],
  es: ['qué', 'cómo', 'por qué', 'cuándo', 'cuál', 'dónde', 'quién'],
  ar: ['ما هو', 'كيف', 'لماذا', 'متى', 'أين', 'من', 'هل', 'كم'],
  tr: ['nedir', 'nasıl', 'neden', 'ne zaman', 'hangi', 'nerede'],
};
const MODIFIERS = {
  de: ['kosten', 'preis', 'vergleich', 'vs', 'beste', 'erfahrungen', 'pflicht', 'checkliste', 'anleitung', 'für', 'in der nähe', 'lassen'],
  en: ['cost', 'price', 'vs', 'best', 'review', 'checklist', 'template', 'requirements', 'for', 'near me', 'examples', 'alternatives'],
  fr: ['prix', 'coût', 'comparatif', 'meilleur', 'avis', 'obligation', 'pour', 'près de moi'],
  es: ['precio', 'costo', 'comparativa', 'mejor', 'opiniones', 'obligatorio', 'para', 'cerca de mí'],
  ar: ['سعر', 'أفضل', 'مقارنة', 'طريقة', 'شروط', 'مميزات', 'عيوب', 'بالتفصيل'],
  tr: ['fiyat', 'en iyi', 'karşılaştırma', 'nasıl yapılır', 'şartları', 'için'],
};
const ALPHABET = {
  de: 'abcdefghijklmnopqrstuvwxyzäöü'.split(''),
  ar: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split(''),
};

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (rankforge keyword-research)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const engines = {
  async google(q, lang, country) {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=${lang}&gl=${country}&q=${encodeURIComponent(q)}`;
    const data = await getJson(url);
    return Array.isArray(data?.[1]) ? data[1] : [];
  },
  async ddg(q, lang, country) {
    const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&kl=${country}-${lang}`;
    const data = await getJson(url);
    return Array.isArray(data) ? data.map((d) => d.phrase).filter(Boolean) : [];
  },
};

async function suggest() {
  const seeds = (opt('seeds', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!seeds.length) die('suggest needs --seeds "seed one,seed two"');
  const lang = opt('lang', 'en');
  const country = opt('country', lang === 'en' ? 'us' : lang);
  const expand = opt('expand', 'questions,modifiers').split(',').filter(Boolean);
  const sources = opt('sources', 'google,ddg').split(',').filter((s) => engines[s]);
  const out = opt('out', 'signals.json');

  const queries = [];
  for (const seed of seeds) {
    queries.push({ seed, q: seed });
    if (expand.includes('questions')) for (const w of QUESTIONS[lang] || QUESTIONS.en) queries.push({ seed, q: `${w} ${seed}` });
    if (expand.includes('modifiers')) for (const m of MODIFIERS[lang] || MODIFIERS.en) queries.push({ seed, q: `${seed} ${m}` });
    if (expand.includes('alphabet')) for (const c of ALPHABET[lang] || 'abcdefghijklmnopqrstuvwxyz'.split('')) queries.push({ seed, q: `${seed} ${c}` });
  }

  const found = new Map(); // phrase -> { phrase, seed, sources:Set, hits }
  let errors = 0;
  process.stderr.write(`${queries.length} queries × ${sources.length} source(s)…\n`);
  for (const { seed, q } of queries) {
    for (const src of sources) {
      try {
        for (const raw of await engines[src](q, lang, country)) {
          const phrase = raw.toLowerCase().trim();
          if (!phrase) continue;
          const e = found.get(phrase) || { phrase, seed, sources: new Set(), hits: 0 };
          e.sources.add(src); e.hits++;
          found.set(phrase, e);
        }
      } catch (err) {
        errors++;
        if (errors === 3) process.stderr.write(`! ${src} failing (${err.message}); network may be blocked.\n`);
      }
      await sleep(150);
    }
  }
  const rows = [...found.values()]
    .map((e) => ({ phrase: e.phrase, seed: e.seed, sources: [...e.sources], hits: e.hits, found: today }))
    .sort((a, b) => b.hits - a.hits || a.phrase.localeCompare(b.phrase));
  fs.writeFileSync(out, JSON.stringify(rows, null, 2));
  process.stderr.write(`✓ ${rows.length} unique phrases → ${out} (${errors} request errors)\n`);
  if (!rows.length && errors) process.exit(1);
}

async function trends() {
  const country = (opt('country', 'us') || 'us').toUpperCase();
  const out = opt('out', 'trends.json');
  const res = await fetch(`https://trends.google.com/trending/rss?geo=${country}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) die(`trends HTTP ${res.status}`);
  const xml = await res.text();
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
  const decode = (s) => s.replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, e) => entities[e]);
  const tag = (s, t) => decode((s.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)) || [, ''])[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim());
  const rows = xml.split('<item>').slice(1).map((item) => ({
    term: tag(item, 'title'),
    traffic: tag(item, 'ht:approx_traffic'),
    news: item.split('<ht:news_item>').slice(1).map((n) => ({ title: tag(n, 'ht:news_item_title'), source: tag(n, 'ht:news_item_source') })).slice(0, 3),
    country,
    found: today,
  }));
  fs.writeFileSync(out, JSON.stringify(rows, null, 2));
  process.stderr.write(`✓ ${rows.length} trending searches (${country}) → ${out}. Most are off-topic: filter for fit.\n`);
}

function die(msg) { process.stderr.write(`✗ ${msg}\n`); process.exit(1); }

if (cmd === 'suggest') await suggest();
else if (cmd === 'trends') await trends();
else die('usage: signals.mjs suggest --seeds "a,b" [--lang de --country de --expand questions,modifiers,alphabet] | trends --country de');
