/*
 * RankForge SERP extractor — run INSIDE an open results page (Google, Bing or DuckDuckGo).
 * It is one expression that returns JSON, so it works with any agent browser tool:
 *   Claude in Chrome / Claude app browser  → javascript tool, paste this file's content
 *   Playwright MCP                         → browser_evaluate with this content
 *   Playwright / Puppeteer scripts         → page.evaluate(fs.readFileSync('serp-extract.js', 'utf8'))
 * Save each returned object (one per query) into a JSON array, then:  node serp.mjs --import captured.json
 *
 * Returns { query, engine, results[{title,url,snippet}], paa[], related[], features[], ai{subtopics[],cited[]} }
 *   paa        "People also ask" / "Weitere Fragen" questions → new question keywords
 *   ai         Google AI Overview sub-headings (the subtopics Google thinks the answer needs) and cited domains
 *   related    related searches when the engine shows them
 * Read-only: it clicks nothing and sends nothing.
 */
(() => {
  const txt = (e) => (e?.innerText || '').trim();
  const host = location.hostname;
  const engine = /bing\./.test(host) ? 'bing' : /duckduckgo\./.test(host) ? 'ddg' : 'google';
  const query = new URLSearchParams(location.search).get('q') || document.querySelector('textarea[name=q], input[name=q]')?.value || '';
  const fromCite = (block) => {
    const parts = txt(block?.querySelector('cite')).split('›').map((s) => s.trim()).filter(Boolean);
    if (!parts.length || !/^https?:\/\//.test(parts[0])) return '';
    return parts[0].replace(/\/$/, '') + (parts.length > 1 ? '/' + parts.slice(1).join('/').replace(/\.{3}|…/g, '').trim() : '');
  };
  const realUrl = (a, block) => {
    try {
      const u = new URL(a.href);
      if (/(^|\.)google\./.test(u.hostname)) {           // /url?q=… or /goto?url=… wrappers
        const t = u.searchParams.get('q') || u.searchParams.get('url');
        return t && /^https?:/.test(t) ? t : fromCite(block);
      }
      return a.href;
    } catch { return fromCite(block); }
  };

  const results = [];
  if (engine === 'google') {
    const seen = new Set();
    for (const h3 of document.querySelectorAll('#rso a h3, #search a h3')) {
      const a = h3.closest('a');
      if (!a || h3.closest('[data-q]')) continue;          // skip links inside "People also ask" answers
      const block = h3.closest('[data-hveid]') || a.parentElement?.parentElement;
      const url = realUrl(a, block);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      results.push({ title: txt(h3), url, snippet: txt(block?.querySelector('.VwiC3b, [data-sncf], [style*="line-clamp"]')).slice(0, 300) });
    }
  } else if (engine === 'bing') {
    for (const li of document.querySelectorAll('li.b_algo')) {
      const a = li.querySelector('h2 a'); if (a) results.push({ title: txt(a), url: a.href, snippet: txt(li.querySelector('p')).slice(0, 300) });
    }
  } else {
    for (const a of document.querySelectorAll('a.result__a, [data-testid="result-title-a"]')) results.push({ title: txt(a), url: a.href, snippet: '' });
  }

  const paa = [...new Set([...document.querySelectorAll('[data-q]')].map((e) => e.getAttribute('data-q'))
    .concat([...document.querySelectorAll('.df_qntext')].map(txt)).filter(Boolean))];
  const related = [...new Set([...document.querySelectorAll('#botstuff a[href*="/search?"], #bres a[href*="/search?"], .b_rs a, #brsv3 a')]
    .map((x) => { try { return new URL(x.href).searchParams.get('q'); } catch { return null; } })
    .filter((q) => q && q.toLowerCase() !== query.toLowerCase()))];

  const features = []; let ai = null;
  const aiHead = [...document.querySelectorAll('[role="heading"], h1, h2')].find((h) => /^(AI Overview|Übersicht mit KI|KI-Übersicht|Aperçu IA|Resumen de IA|Panoramica IA)/i.test(txt(h)));
  if (aiHead) {
    features.push('ai-overview');
    let box = aiHead; for (let i = 0; i < 6 && box.parentElement; i++) box = box.parentElement;
    ai = {
      subtopics: [...new Set([...box.querySelectorAll('[role="heading"], strong')].map(txt)
        .filter((t) => t && t.length >= 6 && t.length < 90 && !/Übersicht mit KI|AI Overview|KI-Übersicht|Feedback|Mehr anzeigen|Show more/i.test(t)))].slice(0, 15),
      cited: [...new Set([...box.querySelectorAll('a[href^="http"]')].map((x) => { try { return new URL(x.href).hostname.replace(/^www\./, ''); } catch { return null; } })
        .filter((h) => h && !/(^|\.)google\./.test(h)))].slice(0, 15),
    };
  }
  if (paa.length) features.push('people-also-ask');
  if (document.querySelector('a[href*="youtube.com/watch"]')) features.push('video');
  if (document.querySelector('[data-cid], .VkpGBb')) features.push('local-pack');
  if (document.querySelector('[data-text-ad], #tads, .b_ad, .result--ad')) features.push('ads');
  if (document.querySelector('.xpdopen, .kp-wholepage, [data-attrid="wa:/description"]')) features.push('featured/knowledge');
  return { query, engine, results: results.slice(0, 10), paa, related, features, ai };
})()
