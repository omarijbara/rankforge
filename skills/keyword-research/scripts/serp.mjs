#!/usr/bin/env node
/**
 * serp.mjs — read real search results pages: new keywords + what it takes to rank.
 *
 *   AGENT-NATIVE (best for Google): an agent opens the results page in its own browser tool, runs serp-extract.js,
 *     saves the JSON objects as an array, then:      node serp.mjs --import captured.json
 *   NATIVE HTTP (no browser, no dependencies, low volume):
 *     node serp.mjs --queries "website relaunch kosten,cookie banner pflicht" --engine ddg --lang de --country de
 *   OFFICIAL APIs (stable, your key):  --engine brave (BRAVE_API_KEY) · --engine google-api (GOOGLE_CSE_KEY, GOOGLE_CSE_CX)
 *   PLAYWRIGHT (a real Chromium window):
 *     node serp.mjs --queries "…" --engine google [--wait-for-human] [--paa-clicks 4] [--headless]
 *     node serp.mjs --queries "…" --engine bing --browser
 *   Any mode: --in keywords.csv [--limit 15]  [--out serp.json]
 *
 * Collects per query:
 *   related searches (Bing, Google) and "People also ask" questions (Google; Bing when shown) → NEW keywords
 *   the top 10 results: title, URL, domain and page format (guide, comparison, list, tool, video, forum, service, commerce)
 *   SERP features (Google: AI overview, people-also-ask, video, local pack, ads, featured/knowledge)
 * and derives a difficulty hint: forums/UGC ranking = beatable, many big brands = hard.
 *
 * Writes  serp.json           everything, per query
 *         serp-keywords.csv   keyword;source;query;engine     (feed it into cluster.mjs / overlap.mjs)
 *         serp-summary.csv    query;engine;dominant_format;formats;difficulty_hint;ugc_in_top10;big_brands_in_top10;features;top_domains;ai_subtopics;ai_cited
 *         serp-outline.csv    query;subtopic;engine           (Google AI Overview sub-headings = outline checklist for briefs)
 *
 * Google mode needs Playwright: `npm install` in the repo root (optional dependency) and `npx playwright install chromium`.
 * Be a polite, low-volume user: one query at a time, randomized pauses, 15 queries by default. If a search engine shows a
 * CAPTCHA or "unusual traffic" page, the script STOPS. It never solves or bypasses bot checks; switch to --engine bing,ddg
 * or try again later. On Google's consent page it chooses "reject all". You are responsible for respecting each engine's terms.
 */
import fs from 'node:fs';
import { parseArgs, list, die, log, sleep, today, get, BROWSER_UA, stripTags, decodeEntities, readKeywords, writeCsv } from './lib.mjs';

const a = parseArgs();
const engines = list(a.engine || 'bing,ddg').map((e) => e.toLowerCase());
const lang = a.lang || 'en';
const cc = (a.country || (lang === 'en' ? 'us' : lang)).toLowerCase();
let queries = a.queries ? list(a.queries) : a.in ? readKeywords(a.in) : a.import ? []
  : die('usage: serp.mjs --queries "a,b" | --in keywords.csv | --import captured.json  [--engine ddg,bing,google,brave,google-api] [--lang de --country de]');
queries = [...new Set(queries.map((q) => q.toLowerCase()))].slice(0, Number(a.limit || 15));
const outJson = a.out || 'serp.json';
const base = outJson.replace(/\.json$/i, '');
const pause = (min, max) => sleep(min + Math.random() * (max - min));
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

// --- result classification ------------------------------------------------------
const UGC = /(reddit\.com|gutefrage\.net|quora\.com|stackexchange\.com|stackoverflow\.com|facebook\.com|x\.com|twitter\.com|pinterest\.|tiktok\.com|instagram\.com|wer-weiss-was|motor-talk|forum|community|answers\.)/i;
const BIG = /(wikipedia\.org|amazon\.|youtube\.com|google\.|microsoft\.com|apple\.com|\.gov(\.|$)|bund\.de|europa\.eu|ionos\.|strato\.|chip\.de|computerbild\.de|t3n\.de|heise\.de|zeit\.de|spiegel\.de|faz\.net|forbes\.com|hubspot\.com|shopify\.com|wix\.com|wordpress\.(com|org)|ebay\.|idealo\.|check24\.|ihk\.de|verbraucherzentrale)/i;
function formatOf(r) {
  const s = `${r.title} ${r.url}`.toLowerCase();
  if (/youtube\.com|vimeo\.com/.test(s)) return 'video';
  if (UGC.test(r.url)) return 'forum/ugc';
  if (/ vs\.? | oder | versus|vergleich|compare|alternative/.test(s)) return 'comparison';
  if (/\b(test|bestenliste|beste[nr]?|best|top \d+|ranking)\b/.test(s)) return 'list/review';
  if (/rechner|calculator|generator|checker|vorlage|template|tool/.test(s)) return 'tool/template';
  if (/wikipedia\.org|was ist|what is|definition|bedeutung/.test(s)) return 'definition';
  if (/\/(produkt|product|shop|p|dp)\/|kaufen|buy now|in den warenkorb/.test(s)) return 'commerce';
  if (/\b(agentur|agency|leistungen|services?|angebot|preise|pricing)\b/.test(s) && !/\/(blog|magazin|ratgeber|news)\//.test(s)) return 'service-page';
  return 'article/guide';
}
function summarize(results, features) {
  const formats = {}; for (const r of results) formats[r.format] = (formats[r.format] || 0) + 1;
  const dominant = Object.entries(formats).sort((x, y) => y[1] - x[1])[0]?.[0] || '';
  const ugc = results.filter((r) => r.format === 'forum/ugc').length;
  const big = results.filter((r) => BIG.test(r.domain)).length;
  const difficulty_hint = !results.length ? '' : ugc >= 2 ? 'low (forums/UGC rank)' : big >= 5 ? 'high (big brands)' : big >= 3 ? 'medium-high' : 'medium';
  return { dominant_format: dominant, formats: Object.entries(formats).map(([k, v]) => `${k}:${v}`).join(' '), difficulty_hint,
    ugc_in_top10: ugc, big_brands_in_top10: big, features: features.join(' '), top_domains: results.slice(0, 5).map((r) => r.domain).join(' ') };
}

// --- native engines (plain HTTP) ----------------------------------------------------
const htmlHeaders = { 'User-Agent': BROWSER_UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': `${lang}-${cc.toUpperCase()},${lang};q=0.9` };
const blockedPage = (html) => /captcha|unusual traffic|are you a robot|bist du ein mensch|anomaly/i.test(html.slice(0, 30000)) && !/b_algo|result__a/.test(html);

// --- official APIs (stable, need your own key; use these for regular or larger volumes) ---
const API = {
  // Brave Search API (free tier available): set BRAVE_API_KEY. Returns web results + FAQ questions.
  async brave(q) {
    const key = process.env.BRAVE_API_KEY; if (!key) return { blocked: true, reason: 'set BRAVE_API_KEY (https://api.search.brave.com)' };
    const d = await get(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&country=${cc}&search_lang=${lang}&count=10`,
      { headers: { 'X-Subscription-Token': key, Accept: 'application/json' } });
    const paa = (d.faq?.results || []).map((x) => stripTags(x.question)).filter(Boolean);
    return { results: (d.web?.results || []).map((x) => ({ title: stripTags(x.title), url: x.url, snippet: stripTags(x.description).slice(0, 300) })),
      related: [], paa, features: [...(paa.length ? ['faq'] : []), ...(d.videos?.results?.length ? ['video'] : []), ...(d.discussions?.results?.length ? ['discussions'] : [])] };
  },
  // Google Programmable Search JSON API: set GOOGLE_CSE_KEY and GOOGLE_CSE_CX (search engine set to "search the entire web").
  async 'google-api'(q) {
    const key = process.env.GOOGLE_CSE_KEY, cx = process.env.GOOGLE_CSE_CX;
    if (!key || !cx) return { blocked: true, reason: 'set GOOGLE_CSE_KEY and GOOGLE_CSE_CX (Google Programmable Search JSON API)' };
    const d = await get(`https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(q)}&hl=${lang}&gl=${cc}&num=10`);
    return { results: (d.items || []).map((x) => ({ title: x.title, url: x.link, snippet: (x.snippet || '').slice(0, 300) })), related: [], paa: [], features: [] };
  },
};

function bingUrl(href) {
  // Bing sometimes wraps results in /ck/a?…&u=a1<base64url>
  const m = /[?&]u=a1([^&]+)/.exec(href);
  if (/bing\.com\/ck\/a/.test(href) && m) { try { return Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); } catch { /* keep */ } }
  return decodeEntities(href);
}
const bingSearchUrl = (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=${lang}&cc=${cc.toUpperCase()}&count=10`;
function parseBing(html) {
  if (blockedPage(html)) return { blocked: true };
  // Bing answers some scripted clients with an empty "no results" page instead of an error.
  if (!html.includes('class="b_algo"') && /class="b_no/.test(html)) return { blocked: true, reason: 'Bing served an empty page to the script (bot protection); use --browser, --engine ddg or an API engine' };
  {
    const results = html.split('<li class="b_algo"').slice(1).map((chunk) => {
      const m = chunk.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      if (!m) return null;
      return { title: stripTags(m[2]), url: bingUrl(m[1]), snippet: stripTags((chunk.match(/<p[^>]*>([\s\S]*?)<\/p>/) || [])[1]).slice(0, 300) };
    }).filter(Boolean);
    const related = new Set();
    for (const marker of ['class="b_rs', 'id="brsv3"', 'class="b_rrsr']) {
      const i = html.indexOf(marker); if (i < 0) continue;
      for (const m of html.slice(i, i + 12000).matchAll(/href="\/search\?q=([^"&]+)/g)) related.add(decodeURIComponent(m[1].replace(/\+/g, ' ')).toLowerCase());
    }
    const paa = [...html.matchAll(/class="df_qntext[^"]*"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => stripTags(m[1])).filter(Boolean);
    return { results, related: [...related], paa, features: paa.length ? ['people-also-ask'] : [] };
  }
}
const ddgSearchUrl = (q) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=${cc}-${lang}`;
const NATIVE = {
  bing: async (q) => parseBing(await get(bingSearchUrl(q), { json: false, headers: htmlHeaders })),
  ddg: async (q) => parseDdg(await get(ddgSearchUrl(q), { json: false, headers: htmlHeaders })),
};
// --browser: fetch Bing / DuckDuckGo through the same real browser as Google, then parse identically.
const BROWSER_URL = { bing: bingSearchUrl, ddg: ddgSearchUrl };
const PARSE = { bing: parseBing, ddg: parseDdg };
function parseDdg(html) {
  {
    if (blockedPage(html)) return { blocked: true };
    const results = html.split(/<div class="result results_links/).slice(1).map((chunk) => {
      if (/result--ad/.test(chunk.slice(0, 300))) return null;                 // skip ads
      const m = chunk.match(/class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/); if (!m) return null;
      let url = decodeEntities(m[1]); const u = /[?&]uddg=([^&]+)/.exec(url); if (u) url = decodeURIComponent(u[1]);
      if (/duckduckgo\.com\/y\.js|ad_domain=/.test(url)) return null;
      return { title: stripTags(m[2]), url: url.startsWith('//') ? `https:${url}` : url, snippet: stripTags((chunk.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/) || [])[1]).slice(0, 300) };
    }).filter(Boolean);
    return { results, related: [], paa: [], features: [] };
  }
}

// --- Google via Playwright (real browser) ---------------------------------------------
async function openBrowser() {
  let pw;
  try { pw = await import('playwright'); }
  catch { die('Google mode needs Playwright. In the rankforge folder run: npm install && npx playwright install chromium\n  (or use the native engines: --engine bing,ddg)'); }
  const browser = await pw.chromium.launch({ headless: Boolean(a.headless) });
  const context = await browser.newContext({ locale: `${lang}-${cc.toUpperCase()}`, userAgent: BROWSER_UA, viewport: { width: 1280, height: 900 } });
  return { browser, page: await context.newPage() };
}
async function google(page, q) {
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(q)}&hl=${lang}&gl=${cc}&num=10&pws=0`, { waitUntil: 'domcontentloaded' });
  if (/consent\.google/.test(page.url()) || (await page.locator('form[action*="consent"]').count())) {
    // privacy-preserving choice on the cookie consent wall
    const reject = page.getByRole('button', { name: /alle ablehnen|reject all|tout refuser|rechazar todo|rifiuta tutto|alles afwijzen/i }).first();
    if (await reject.count()) { await reject.click(); await page.waitForLoadState('domcontentloaded'); }
  }
  if (/\/sorry\//.test(page.url()) || (await page.getByText(/unusual traffic|ungewöhnlichen datenverkehr|not a robot|kein roboter/i).count())) {
    if (!(await waitForHuman(page, '#rso h3'))) return { blocked: true };
  }
  await page.waitForSelector('#search', { timeout: 15000 }).catch(() => {});
  const clicks = Number(a['paa-clicks'] ?? 4);
  for (let i = 0; i < clicks; i++) {            // opening PAA items makes Google append more questions
    const items = page.locator('[data-q] [role="button"], .related-question-pair [role="button"]');
    if (i >= (await items.count())) break;
    await items.nth(i).click({ timeout: 3000 }).catch(() => {});
    await pause(700, 1300);
  }
  return page.evaluate(EXTRACTOR);   // the same extractor agents run in their own browser (serp-extract.js)
}
const EXTRACTOR = fs.readFileSync(new URL('./serp-extract.js', import.meta.url), 'utf8');
// --wait-for-human: in a visible browser window, YOU pass the check; the script only waits (max 3 min).
async function waitForHuman(page, readySelector) {
  if (!a['wait-for-human'] || a.headless) return false;
  log('  ⏸ A human check is shown in the browser window. Please complete it yourself; waiting up to 3 minutes…');
  try { await page.waitForSelector(readySelector, { timeout: 180000 }); log('  ▶ continuing'); return true; } catch { return false; }
}

// --- run ------------------------------------------------------------------------------
const all = []; const kwRows = []; const sumRows = []; const outline = []; const seenKw = new Set();
function record(q, engine, r) {
  q = String(q || '').toLowerCase();
  const results = (r.results || []).map((x, i) => ({ pos: i + 1, ...x, domain: host(x.url) })).map((x) => ({ ...x, format: formatOf(x) }));
  const related = r.related || [], paa = r.paa || [], features = r.features || [], ai = r.ai || null;
  const summary = { ...summarize(results, features), ai_subtopics: ai?.subtopics?.length || 0, ai_cited: (ai?.cited || []).join(' ') };
  all.push({ query: q, engine, date: today(), results, related, paa, features, ai, summary });
  sumRows.push({ query: q, engine, ...summary });
  for (const [items, source] of [[related, 'related-searches'], [paa, 'people-also-ask']]) {
    for (const k of items) { const kw = k.toLowerCase().trim(); if (!kw || kw === q || seenKw.has(kw)) continue; seenKw.add(kw); kwRows.push({ keyword: kw, source, query: q, engine }); }
  }
  for (const s of ai?.subtopics || []) outline.push({ query: q, subtopic: s.replace(/:$/, ''), engine });
  log(`  ${engine} "${q}": ${results.length} results, ${related.length} related, ${paa.length} questions${ai ? `, AI overview with ${ai.subtopics.length} subtopics` : ''} · ${summary.dominant_format} · ${summary.difficulty_hint}`);
}
let session = null;
// --import: SERPs captured by an agent's own browser with serp-extract.js (a JSON array of its outputs)
if (a.import) for (const r of JSON.parse(fs.readFileSync(a.import, 'utf8'))) record(r.query, r.engine || 'google', r);
outer: for (const engine of a.import ? [] : engines) {
  const viaBrowser = engine === 'google' || (a.browser && BROWSER_URL[engine]);
  if (viaBrowser) session ||= await openBrowser();
  else if (!NATIVE[engine] && !API[engine]) { log(`! unknown engine "${engine}" (use ddg, bing, google, brave, google-api)`); continue; }
  for (const q of queries) {
    let r;
    try {
      if (engine === 'google') r = await google(session.page, q);
      else if (viaBrowser) {
        await session.page.goto(BROWSER_URL[engine](q), { waitUntil: 'domcontentloaded' }); await pause(800, 1500);
        r = PARSE[engine](await session.page.content());
        if (r.blocked && (await waitForHuman(session.page, engine === 'bing' ? 'li.b_algo' : 'a.result__a'))) r = PARSE[engine](await session.page.content());
      }
      else if (API[engine]) r = await API[engine](q);
      else r = await NATIVE[engine](q);
    } catch (e) { log(`! ${engine} "${q}": ${e.message}`); continue; }
    if (r.blocked) {
      log(`! ${engine}: ${r.reason || 'CAPTCHA / unusual-traffic page'}. Stopping ${engine}; RankForge never solves or evades bot checks.`);
      if (viaBrowser && !a['wait-for-human']) log('  Options: rerun with --wait-for-human (you pass the check in the window), use an agent\'s own browser + serp-extract.js, or an API engine (brave, google-api).');
      continue outer;
    }
    record(q, engine, r);
    // Pacing: APIs are fine fast; HTML pages and the browser get human-like gaps (scrapers that hurry get blocked).
    await (API[engine] ? pause(300, 600) : viaBrowser ? pause(6000, 12000) : pause(4000, 8000));
  }
}
if (session) await session.browser.close();
fs.writeFileSync(outJson, JSON.stringify(all, null, 2));
writeCsv(`${base}-keywords.csv`, ['keyword', 'source', 'query', 'engine'], kwRows);
writeCsv(`${base}-summary.csv`, ['query', 'engine', 'dominant_format', 'formats', 'difficulty_hint', 'ugc_in_top10', 'big_brands_in_top10', 'features', 'top_domains', 'ai_subtopics', 'ai_cited'], sumRows);
if (outline.length) writeCsv(`${base}-outline.csv`, ['query', 'subtopic', 'engine'], outline);
log(`✓ ${all.length} SERPs → ${outJson}; ${kwRows.length} new keywords → ${base}-keywords.csv; summary → ${base}-summary.csv` +
  (outline.length ? `; ${outline.length} AI-overview subtopics → ${base}-outline.csv` : ''));
