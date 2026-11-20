// Regenerates the static HTML pages, sitemap.xml and robots.txt.
// The site itself has no build step: the generated files are committed and served as-is.
// Run after editing: node tools/build.js
const fs = require('fs');
const path = require('path');
const T = require('../js/tire.js');
const R = require('../js/render.js');

const BASE_URL = 'https://tiresizing.pages.dev';
const SITE = 'Tire Size Tool';
// Cloudflare Web Analytics (cookieless). Leave empty to omit the beacon.
const CF_BEACON_TOKEN = process.env.CF_BEACON_TOKEN || fs.readFileSync(path.join(__dirname, 'beacon-token.txt'), 'utf8').trim();
const ROOT = path.join(__dirname, '..');

const PAIRS = [
  ['265/70R17', '285/70R17'],
  ['275/70R18', '285/75R18'],
  ['265/70R17', '33x12.50R17'],
  ['245/75R16', '265/75R16'],
  ['275/65R18', '275/70R18'],
  ['285/75R16', '315/75R16'],
  ['265/65R18', '275/65R18'],
  ['275/60R20', '275/65R20'],
];
const slug = (a, b) => (a + '-vs-' + b).toLowerCase().replace(/\//g, '-').replace(/\./g, '-');

const esc = T.esc;
const beacon = CF_BEACON_TOKEN
  ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${CF_BEACON_TOKEN}"}'></script>`
  : '';

const OG_IMAGE = BASE_URL + '/og.png';
const ld = obj => `<script type="application/ld+json">${JSON.stringify(Object.assign({ '@context': 'https://schema.org' }, obj)).replace(/</g, '\\u003c')}</script>`;
// Breadcrumbs: visible trail + BreadcrumbList JSON-LD. items = [[name, path], ...] after Home.
function crumbs(items) {
  const all = [['Home', '/'], ...items];
  return {
    html: `<nav class="crumbs" aria-label="Breadcrumb">${all.map(([n, u], i) => i < all.length - 1 ? `<a href="${u}">${esc(n)}</a> › ` : `<span aria-current="page">${esc(n)}</span>`).join('')}</nav>`,
    ld: ld({ '@type': 'BreadcrumbList', itemListElement: all.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: BASE_URL + u })) }),
  };
}
// FAQ: visible <h3>/<p> list + FAQPage JSON-LD. qa = [[question, answerHtml], ...]
const strip = h => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
function faq(qa) {
  return {
    html: qa.map(([q, a]) => `<h3>${esc(q)}</h3>\n<p>${a}</p>`).join('\n'),
    ld: ld({ '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: strip(a) } })) }),
  };
}
const pages = [];
function page({ file, urlPath, title, description, body, scripts = '', current = '', jsonld = '' }) {
  const nav = [['/', 'Compare'], ['/how-it-works', 'How it works'], ['/privacy', 'Privacy']]
    .map(([h, t]) => `<a href="${h}"${current === h ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="google-site-verification" content="DBsd4dRo6CszvxQNH2xXlYTnwq2I4v30uIsV_nwwEc8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${urlPath ? `<link rel="canonical" href="${BASE_URL}${urlPath}">` : '<meta name="robots" content="noindex">'}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE}">
<meta property="og:locale" content="en_US">
${urlPath ? `<meta property="og:url" content="${BASE_URL}${urlPath}">` : ''}
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Tire Size Calculator: compare two sizes, diameter, revs per mile and speedometer error">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${OG_IMAGE}">
<meta name="theme-color" content="#b45309">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/style.css">
${jsonld}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site"><div class="wrap"><a class="brand" href="/">${SITE}</a><nav aria-label="Main">${nav}</nav></div></header>
<main id="main" class="wrap">
${body}
</main>
<footer class="site"><div class="wrap"><p>Free and ad-free. If this site helped you, <a href="https://ko-fi.com/marcustravis" rel="noopener">buy me a coffee →</a></p></div></footer>
${scripts}${beacon}
</body>
</html>
`;
  const out = html.replace(/\n{2,}/g, '\n');
  const full = path.join(ROOT, file);
  const changed = !fs.existsSync(full) || fs.readFileSync(full, 'utf8') !== out;
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, out);
  if (urlPath) pages.push({ urlPath, title, description, changed });
}

const pairLinks = PAIRS.map(([a, b]) => `<li><a href="/compare/${slug(a, b)}">${a} vs ${b}</a></li>`).join('');

// ---------- Home ----------
const f2 = (n, d) => Number(n).toFixed(d);
const t265 = T.parse('265/70R17'), t33 = T.parse('33x12.50R17'), t285 = T.parse('285/70R17');
const m33 = T.toMetric(t33);
const pct33 = T.compare(t265, t33).diameter.in.pct;
const homeFaq = faq([
  ['What do the numbers in a tire size mean?',
   `Take <code>265/70R17</code>. 265 is the tread section width in millimetres, 70 is the aspect ratio (the sidewall is 70% as tall as the tire is wide), R means radial, and 17 is the wheel diameter in inches. An <code>LT</code> or <code>P</code> in front marks a light-truck or passenger tire. Flotation sizes such as <code>33x12.50R17</code> list overall diameter × width in inches, then the rim size.`],
  ['How do I calculate tire diameter?',
   `Sidewall height = width × aspect ratio ÷ 100. Overall diameter = rim × 25.4 + 2 × sidewall, in millimetres; divide by 25.4 for inches. For 265/70R17: 265 × 0.70 = 185.5 mm sidewall, 17 × 25.4 + 2 × 185.5 = 802.8 mm, or ${f2(t265.diameterIn, 1)} in. See <a href="/how-it-works">how the math works</a> for the full set of formulas.`],
  ['How much does a bigger tire throw off my speedometer?',
   `The error is the same percentage as the change in diameter. Going from 265/70R17 (${f2(t265.diameterIn, 1)} in) to 33x12.50R17 (${f2(t33.diameterIn, 1)} in) is ${f2(pct33, 1)}% taller, so at an indicated 60 mph you are really doing about ${f2(T.actualSpeed(t265, t33, 60), 1)} mph, and the odometer under-counts miles by the same ${f2(pct33, 1)}%. A smaller tire makes the speedometer read high instead.`],
  ['What is 33x12.50R17 in metric?',
   `A 33x12.50R17 is 33 in tall and 12.5 in (317.5 mm) wide. The closest standard metric size is ${m33.label}, about ${f2(m33.diameterIn, 1)} in tall. 285/70R17 (${f2(t285.diameterIn, 1)} in) is also commonly treated as a "33" even though it is a little shorter and narrower. Use the converter above for any other size.`],
  ['Is 265/70R17 a 33-inch tire?',
   `No. A 265/70R17 is about ${f2(t265.diameterIn, 1)} in tall, roughly ${f2(33 - t265.diameterIn, 1)} in short of a 33. For about 33 in on a 17 in wheel, look at 285/70R17 (${f2(t285.diameterIn, 1)} in), 315/65R17 or 33x12.50R17. Compare them on <a href="/compare/265-70r17-vs-33x12-50r17">265/70R17 vs 33x12.50R17</a>.`],
  ['How much can I change tire size safely?',
   `A common rule of thumb is to keep the new overall diameter within about 3% of the original. It is general guidance, not a rule: it keeps speedometer error small and usually avoids clearance problems, but whether a size fits depends on your wheels, suspension, load rating and the vehicle maker's recommendations. Check with a tire shop before buying.`],
  ['What does revolutions per mile mean?',
   `It is how many times a tire turns to cover one mile: 63,360 inches in a mile ÷ (π × diameter in inches). A ${f2(t265.diameterIn, 1)} in 265/70R17 turns about ${f2(t265.revsPerMile, 0)} times per mile; a 33 in tire about ${f2(t33.revsPerMile, 0)}. Fewer revolutions per mile means a taller tire and an effectively taller gear ratio.`],
]);
page({
  file: 'index.html', urlPath: '/', current: '/',
  title: 'Tire Size Calculator & Comparison – free, no ads',
  description: 'Free tire size calculator with no ads. Compare two sizes for diameter, width, sidewall, revs per mile and speedometer error, and convert metric to 33x12.50 sizes.',
  jsonld: ld({ '@type': 'WebSite', name: SITE, alternateName: 'tiresizing.pages.dev', url: BASE_URL + '/', inLanguage: 'en' }) + '\n' +
    ld({ '@type': 'WebApplication', name: 'Tire Size Calculator', url: BASE_URL + '/', applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (runs in a web browser)', browserRequirements: 'Requires JavaScript', isAccessibleForFree: true,
      description: 'Compares two tire sizes (metric or flotation) and shows overall diameter, section width, sidewall height, circumference, revolutions per mile and speedometer error, with a to-scale drawing.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }) + '\n' + homeFaq.ld,
  body: `<h1>Tire size calculator and comparison</h1>
<p class="lead">Type one or two sizes. Results update as you type. Works with metric (265/70R17, LT285/75R16) and flotation (33x12.50R17) sizes. Free, no ads, no sign-up.</p>
<section class="card" aria-labelledby="in-h">
<h2 id="in-h" class="sr-only">Tire sizes</h2>
<div class="inputs">
<div><label for="size-a"><span class="tag tag-a" aria-hidden="true">A</span>Current size</label>
<input type="text" id="size-a" value="265/70R17" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="size-a-msg">
<p class="msg" id="size-a-msg" aria-live="polite"></p></div>
<button type="button" id="swap" aria-label="Swap size A and size B">⇄</button>
<div><label for="size-b"><span class="tag tag-b" aria-hidden="true">B</span>New size <span class="v-mm">(optional)</span></label>
<input type="text" id="size-b" value="285/70R17" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="size-b-msg">
<p class="msg" id="size-b-msg" aria-live="polite"></p></div>
</div>
<p class="examples">Try: ${PAIRS.slice(0, 3).map(([a, b]) => `<button type="button" data-example data-a="${a}" data-b="${b}">${a} → ${b}</button>`).join('')}</p>
</section>
<section class="card" aria-labelledby="res-h">
<h2 id="res-h">Results</h2>
<p class="summary" id="summary" aria-live="polite"></p>
<div id="viz"></div>
<p class="legend">Solid blue = A, dashed orange = B. Left: side view with both tires on the same ground line. Right: tread view showing height and width. Drawn to scale.</p>
<div class="table-scroll" id="results"><noscript><p>The live calculator needs JavaScript. The <a href="/how-it-works">formulas</a> are simple enough to do by hand.</p></noscript></div>
<p><button type="button" id="copy-link">Copy link</button> <span class="v-mm">The link keeps both sizes.</span></p>
</section>
<section class="card" aria-labelledby="sp-h">
<h2 id="sp-h">Speedometer error</h2>
<p class="hint">If your speedometer was set up for size A and you fit size B:</p>
<div class="table-scroll" id="speedo-wrap"></div>
</section>
<section class="card" aria-labelledby="cv-h">
<h2 id="cv-h">Metric ↔ flotation converter</h2>
<label for="size-conv">Size to convert</label>
<input type="text" id="size-conv" value="33x12.50R17" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="size-conv-msg">
<p class="msg" id="size-conv-msg"></p>
<p id="conv-out" aria-live="polite"></p>
<p class="hint">Metric sizes come in fixed steps (widths ending in 5 mm, aspect ratios in steps of 5), so the closest metric size is rarely an exact match. Always compare the real diameters.</p>
</section>
<section class="card" id="popular" aria-labelledby="pp-h">
<h2 id="pp-h">Popular comparisons</h2>
<ul class="pairs">${pairLinks}</ul>
</section>
<section class="card prose" aria-labelledby="faq-h">
<h2 id="faq-h">Tire size questions</h2>
${homeFaq.html}
<p>All numbers come from the size alone using the <a href="/how-it-works">standard tire size formulas</a>. Real tires vary a little by brand and model.</p>
</section>`,
  scripts: '<script src="/js/tire.js"></script>\n<script src="/js/render.js"></script>\n<script src="/js/app.js"></script>\n',
});

// ---------- How it works ----------
const ex = T.parse('265/70R17');
const hiwCrumbs = crumbs([['How it works', '/how-it-works']]);
const privCrumbs = crumbs([['Privacy', '/privacy']]);
page({
  file: 'how-it-works.html', urlPath: '/how-it-works', current: '/how-it-works',
  title: 'How to Calculate Tire Diameter & Revs per Mile',
  description: 'The formulas behind tire diameter, sidewall height, circumference, revolutions per mile and speedometer error, with a worked 265/70R17 example.',
  jsonld: hiwCrumbs.ld,
  body: `${hiwCrumbs.html}<article class="card prose">
<h1>How tire size math works</h1>
<p>Everything on this site comes from a few textbook formulas. Nothing is looked up from a manufacturer database, so real tires can differ slightly from these numbers: measured diameter depends on the brand, tread depth, rim width and inflation.</p>
<h2>Reading a metric size</h2>
<p>In <code>LT265/70R17</code>, <code>LT</code> means light truck (a <code>P</code> means passenger; no letter is common too), <code>265</code> is the section width in millimetres, <code>70</code> is the aspect ratio (sidewall height as a percentage of width), <code>R</code> means radial construction, and <code>17</code> is the rim diameter in inches. Load and speed ratings after the size (like <code>121/118S</code>) do not change the dimensions and are ignored.</p>
<h2>The formulas</h2>
<ul>
<li><strong>Sidewall height</strong> = width × aspect ÷ 100</li>
<li><strong>Overall diameter</strong> = rim × 25.4 + 2 × sidewall (in mm)</li>
<li><strong>Circumference</strong> = π × diameter</li>
<li><strong>Revolutions per mile</strong> = 63,360 ÷ (π × diameter in inches). There are 63,360 inches in a mile.</li>
<li><strong>Actual speed</strong> = speedometer reading × new diameter ÷ old diameter</li>
</ul>
<h2>Worked example: 265/70R17</h2>
<p>Sidewall = 265 × 70 ÷ 100 = <strong>185.5 mm</strong> (${ex.sidewallIn.toFixed(2)} in).<br>
Diameter = 17 × 25.4 + 2 × 185.5 = 431.8 + 371 = <strong>802.8 mm</strong>, or ${ex.diameterIn.toFixed(2)} in.<br>
Revolutions per mile = 63,360 ÷ (π × ${ex.diameterIn.toFixed(2)}) ≈ <strong>${ex.revsPerMile.toFixed(0)}</strong>.</p>
<h2>Flotation sizes</h2>
<p>A flotation size like <code>33x12.50R17</code> states the overall diameter (33 in), section width (12.5 in) and rim (17 in) directly. The sidewall is (33 − 17) ÷ 2 = 8 in. The same 33 in tire on a 15 in rim has a 9 in sidewall. To convert to metric, the width is multiplied by 25.4 and the sidewall divided by the width gives the aspect ratio, which is then rounded to the nearest standard metric step.</p>
<h2>Speedometer error</h2>
<p>A speedometer counts wheel revolutions. A taller tire covers more ground per revolution, so the car is moving faster than the gauge shows; a shorter tire does the opposite. The difference is proportional: a tire 3% taller means you are going 3% faster than indicated, and the odometer under-counts by the same 3%.</p>
<h2>How much size change is safe?</h2>
<p>A widely used rule of thumb is to stay within about 3% of the original overall diameter. Treat it as general guidance: it keeps speedometer error small and usually avoids rubbing, but some vehicles have room for much more and some for less.</p>
<h2>Things the math cannot tell you</h2>
<p>Whether a size fits your vehicle depends on wheel offset, suspension, load rating and more. Use these numbers as a starting point and confirm fitment with the tire maker or a tire shop.</p>
<h2>Try it</h2>
<p>Use the <a href="/">tire size calculator</a> with any two sizes, or start from a popular comparison:</p>
<ul class="pairs">${pairLinks}</ul>
</article>`,
});

// ---------- Privacy ----------
page({
  file: 'privacy.html', urlPath: '/privacy', current: '/privacy',
  title: 'Privacy Policy – ' + SITE + ' (no ads, no cookies)',
  jsonld: privCrumbs.ld,
  description: 'What this tire calculator collects: no accounts, no ads, no cookies. Anonymous page-view counts via Cloudflare Web Analytics.',
  body: `${privCrumbs.html}<article class="card prose">
<h1>Privacy</h1>
<p>This site has no accounts, no ads, no cookies and no third-party trackers.</p>
<p>All calculations happen in your browser. The sizes you type are never sent anywhere; they only appear in the page address so you can share a link.</p>
<p>To see how many people use the site, it uses <a href="https://www.cloudflare.com/web-analytics/" rel="noopener">Cloudflare Web Analytics</a>, which counts page views and load performance without cookies or fingerprinting. The site is hosted on Cloudflare Pages, which keeps standard server logs.</p>
<p>The source code is public on <a href="https://github.com/MarcusTravis/tire-size-tool" rel="noopener">GitHub</a>.</p>
<p>Back to the <a href="/">tire size calculator</a>.</p>
</article>`,
});

// ---------- 404 ----------
page({
  file: '404.html', urlPath: null, title: 'Page not found – ' + SITE, description: 'Page not found.',
  body: `<div class="card"><h1>Page not found</h1><p>That page does not exist. <a href="/">Go to the tire size calculator</a>.</p></div>`,
});

// ---------- Comparison pages ----------
function f(n, d) { return Number(n).toFixed(d); }
for (const [sa, sb] of PAIRS) {
  const a = T.parse(sa), b = T.parse(sb), c = T.compare(a, b);
  const pct = c.diameter.in.pct;
  const wider = c.width.mm.abs;
  const s = slug(sa, sb);
  const widthLine = Math.abs(wider) < 0.5
    ? `Both are the same width, so the difference is all in the sidewall.`
    : `${sb} is ${f(Math.abs(c.width.in.abs), 2)} in (${f(Math.abs(wider), 1)} mm) ${wider > 0 ? 'wider' : 'narrower'}, and its sidewall is ${f(Math.abs(c.sidewall.in.abs), 2)} in ${c.sidewall.in.abs >= 0 ? 'taller' : 'shorter'}.`;
  const sameRim = a.rimIn === b.rimIn;
  const ap = Math.abs(pct), taller = pct >= 0;
  const cc = crumbs([[`${sa} vs ${sb}`, `/compare/${s}`]]);
  const qa = faq([
    [`Is ${sb} bigger than ${sa}?`,
     ap < 0.05 ? `No. They have the same overall diameter (${f(a.diameterIn, 2)} in).`
       : `${taller ? 'Yes' : 'No'}. ${sb} is ${f(b.diameterIn, 2)} in tall and ${sa} is ${f(a.diameterIn, 2)} in, so ${sb} is ${f(Math.abs(c.diameter.in.abs), 2)} in ${taller ? 'taller' : 'shorter'} (${taller ? '+' : '−'}${f(ap, 1)}%). ${widthLine}`],
    [`How far off will my speedometer be with ${sb} instead of ${sa}?`,
     `About ${f(ap, 1)}%. If the speedometer is set for ${sa}, it reads ${taller ? 'low' : 'high'}: an indicated 60 mph is really ${f(T.actualSpeed(a, b, 60), 1)} mph, and 70 mph is really ${f(T.actualSpeed(a, b, 70), 1)} mph. The odometer is off by the same percentage.`],
    [`Is ${sa} to ${sb} within the 3% guideline?`,
     ap <= 3 ? `Yes. The ${f(ap, 1)}% change in diameter is inside the common rule of thumb of about 3%. That is general guidance only; still check fitment for your vehicle.`
       : `No. The ${f(ap, 1)}% change in diameter is more than the common rule of thumb of about 3%. That does not mean it will not fit, but check clearance, gearing and speedometer recalibration, and confirm fitment with a tire shop.`],
  ]);
  page({
    file: `compare/${s}.html`, urlPath: `/compare/${s}`,
    title: `${sa} vs ${sb} Tire Size Comparison`,
    description: `${sb} is ${f(Math.abs(c.diameter.in.abs), 2)} in ${pct >= 0 ? 'taller' : 'shorter'} than ${sa} (${pct >= 0 ? '+' : ''}${f(pct, 1)}%); 60 mph indicated is ${f(T.actualSpeed(a, b, 60), 1)} mph. Diameter, width, sidewall and revs per mile side by side.`,
    jsonld: cc.ld + '\n' + qa.ld,
    body: `${cc.html}<h1>${sa} vs ${sb} tire size comparison</h1>
<p class="lead">${R.summary(a, b)}</p>
<section class="card"><h2>Side by side</h2>
${T.profileSvg(a, b)}
<p class="legend">Solid blue = ${sa}, dashed orange = ${sb}. Drawn to scale.</p>
<div class="table-scroll">${R.resultsTable(a, b)}</div>
<p><a href="/?a=${encodeURIComponent(sa)}&amp;b=${encodeURIComponent(sb)}">Open this comparison in the calculator</a> to change either size.</p>
</section>
<section class="card"><h2>Speedometer error</h2><div class="table-scroll">${R.speedoTable(a, b)}</div></section>
<section class="card prose"><h2>What changes</h2>
<p>${widthLine} ${sameRim ? `Both mount on a ${a.rimIn} in wheel.` : `They use different rim diameters (${a.rimIn} in and ${b.rimIn} in).`}</p>
<p>Each mile, ${sa} turns about ${f(a.revsPerMile, 0)} times and ${sb} about ${f(b.revsPerMile, 0)} times. Fewer turns per mile means the speedometer and odometer read ${c.revsPerMile.abs < 0 ? 'low' : 'high'} by roughly ${f(Math.abs(pct), 1)}% unless they are recalibrated${Math.abs(pct) > 2 ? ', and the effective final drive ratio gets ' + (pct > 0 ? 'taller, which can feel like slightly less acceleration' : 'shorter') : ''}.</p>
<p>These figures are calculated from the size alone using the <a href="/how-it-works">standard tire size formulas</a>. Actual tires vary by brand and model, and fitment depends on your wheels and suspension, so check with a tire shop before buying.</p>
</section>
<section class="card prose"><h2>Quick answers</h2>
${qa.html}
</section>
<section class="card"><h2>More comparisons</h2><ul class="pairs">${PAIRS.filter(p => slug(p[0], p[1]) !== s).map(([x, y]) => `<li><a href="/compare/${slug(x, y)}">${x} vs ${y}</a></li>`).join('')}</ul><p><a href="/">Compare any two sizes</a> in the calculator, or read <a href="/how-it-works">how the math works</a>.</p></section>`,
  });
}

// ---------- sitemap + robots + llms.txt ----------
// lastmod only moves when a page's generated HTML actually changes.
const today = new Date().toISOString().slice(0, 10);
const smPath = path.join(ROOT, 'sitemap.xml');
const oldSm = fs.existsSync(smPath) ? fs.readFileSync(smPath, 'utf8') : '';
const oldLastmod = {};
for (const m of oldSm.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) oldLastmod[m[1]] = m[2];
fs.writeFileSync(smPath, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => { const loc = BASE_URL + p.urlPath; return `  <url><loc>${loc}</loc><lastmod>${!p.changed && oldLastmod[loc] ? oldLastmod[loc] : today}</lastmod></url>`; }).join('\n')}
</urlset>
`);
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Bingbot'];
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\n${AI_BOTS.map(b => `User-agent: ${b}\nAllow: /\n`).join('\n')}\nSitemap: ${BASE_URL}/sitemap.xml\n`);
const compareLines = PAIRS.map(([x, y]) => {
  const a = T.parse(x), b = T.parse(y), c = T.compare(a, b);
  return `- [${x} vs ${y}](${BASE_URL}/compare/${slug(x, y)}): ${x} is ${f(a.diameterIn, 2)} in tall, ${y} is ${f(b.diameterIn, 2)} in (${c.diameter.in.pct >= 0 ? '+' : ''}${f(c.diameter.in.pct, 1)}%); 60 mph indicated = ${f(T.actualSpeed(a, b, 60), 1)} mph actual.`;
}).join('\n');
fs.writeFileSync(path.join(ROOT, 'llms.txt'), `# ${SITE} (tiresizing.pages.dev)

> Free, ad-free tire size calculator: compare two tire sizes (metric like 265/70R17 or flotation like 33x12.50R17) for overall diameter, width, sidewall, circumference, revolutions per mile and speedometer error, and convert between metric and inch sizes. No sign-up, no cookies.

All numbers are calculated from the size with standard formulas (not a manufacturer database), so real tires can differ slightly by brand, rim width and inflation:

- Sidewall height (mm) = section width (mm) × aspect ratio ÷ 100
- Overall diameter (mm) = rim (in) × 25.4 + 2 × sidewall (mm); ÷ 25.4 for inches
- Circumference = π × diameter
- Revolutions per mile = 63,360 ÷ (π × diameter in inches)
- Actual speed = speedometer reading × new diameter ÷ old diameter
- Flotation size DxWxR: sidewall (in) = (D − R) ÷ 2; aspect = sidewall ÷ W × 100

A common rule of thumb is to keep a new tire within about 3% of the original diameter; that is general guidance, and fitment should be confirmed for the specific vehicle.

## Main pages

- [Tire size calculator and comparison](${BASE_URL}/): interactive two-size comparison with a to-scale drawing, speedometer error table, metric ↔ flotation converter and an FAQ. Shareable links: ${BASE_URL}/?a=265%2F70R17&b=285%2F70R17
- [How tire size math works](${BASE_URL}/how-it-works): the formulas above with a worked 265/70R17 example, how to read a size, flotation sizes and speedometer error.

## Popular comparisons

${compareLines}

## Optional

- [Privacy](${BASE_URL}/privacy): no accounts, ads or cookies; cookieless Cloudflare Web Analytics page counts.
- [Source code](https://github.com/MarcusTravis/tire-size-tool): plain HTML/JS, MIT licensed.
`);
console.log('Built', pages.length, 'pages');
