// Regenerates the static HTML pages, sitemap.xml and robots.txt.
// The site itself has no build step: the generated files are committed and served as-is.
// Run after editing: node tools/build.js
const fs = require('fs');
const path = require('path');
const T = require('../js/tire.js');
const R = require('../js/render.js');

const BASE_URL = 'https://tire-size-tool.pages.dev';
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

function page({ file, urlPath, title, description, body, scripts = '', current = '' }) {
  const nav = [['/', 'Compare'], ['/how-it-works', 'How it works'], ['/privacy', 'Privacy']]
    .map(([h, t]) => `<a href="${h}"${current === h ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${urlPath ? `<link rel="canonical" href="${BASE_URL}${urlPath}">` : '<meta name="robots" content="noindex">'}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
${urlPath ? `<meta property="og:url" content="${BASE_URL}${urlPath}">` : ''}
<meta name="theme-color" content="#b45309">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/style.css">
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
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), html.replace(/\n{2,}/g, '\n'));
}

const pairLinks = PAIRS.map(([a, b]) => `<li><a href="/compare/${slug(a, b)}">${a} vs ${b}</a></li>`).join('');

// ---------- Home ----------
page({
  file: 'index.html', urlPath: '/', current: '/',
  title: 'Tire Size Calculator & Comparison – free, no ads',
  description: 'Compare two tire sizes instantly: diameter, width, sidewall, revolutions per mile, speedometer error and a to-scale drawing. Metric and flotation sizes.',
  body: `<h1>Tire size calculator</h1>
<p class="lead">Type one or two sizes. Results update as you type. Works with metric (265/70R17, LT285/75R16) and flotation (33x12.50R17) sizes.</p>
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
<section class="card" aria-labelledby="pp-h">
<h2 id="pp-h">Popular comparisons</h2>
<ul class="pairs">${pairLinks}</ul>
</section>`,
  scripts: '<script src="/js/tire.js"></script>\n<script src="/js/render.js"></script>\n<script src="/js/app.js"></script>\n',
});

// ---------- How it works ----------
const ex = T.parse('265/70R17');
page({
  file: 'how-it-works.html', urlPath: '/how-it-works', current: '/how-it-works',
  title: 'How tire size math works – ' + SITE,
  description: 'The formulas behind tire diameter, sidewall height, circumference, revolutions per mile and speedometer error, with a worked example.',
  body: `<article class="card prose">
<h1>How the math works</h1>
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
<h2>Things the math cannot tell you</h2>
<p>Whether a size fits your vehicle depends on wheel offset, suspension, load rating and more. Use these numbers as a starting point and confirm fitment with the tire maker or a tire shop.</p>
</article>`,
});

// ---------- Privacy ----------
page({
  file: 'privacy.html', urlPath: '/privacy', current: '/privacy',
  title: 'Privacy – ' + SITE,
  description: 'What this tire calculator collects: no accounts, no ads, no cookies. Anonymous page-view counts via Cloudflare Web Analytics.',
  body: `<article class="card prose">
<h1>Privacy</h1>
<p>This site has no accounts, no ads, no cookies and no third-party trackers.</p>
<p>All calculations happen in your browser. The sizes you type are never sent anywhere; they only appear in the page address so you can share a link.</p>
<p>To see how many people use the site, it uses <a href="https://www.cloudflare.com/web-analytics/" rel="noopener">Cloudflare Web Analytics</a>, which counts page views and load performance without cookies or fingerprinting. The site is hosted on Cloudflare Pages, which keeps standard server logs.</p>
<p>The source code is public on <a href="https://github.com/MarcusTravis/tire-size-tool" rel="noopener">GitHub</a>.</p>
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
  page({
    file: `compare/${s}.html`, urlPath: `/compare/${s}`,
    title: `${sa} vs ${sb} tire size comparison`,
    description: `${sb} is ${f(Math.abs(c.diameter.in.abs), 2)} in ${pct >= 0 ? 'taller' : 'shorter'} than ${sa} (${pct >= 0 ? '+' : ''}${f(pct, 1)}%). Diameter, width, sidewall, revs per mile and speedometer error side by side.`,
    body: `<h1>${sa} vs ${sb}</h1>
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
<p>These figures are calculated from the size alone. Actual tires vary by brand and model, and fitment depends on your wheels and suspension, so check with a tire shop before buying.</p>
</section>
<section class="card"><h2>More comparisons</h2><ul class="pairs">${PAIRS.filter(p => slug(p[0], p[1]) !== s).map(([x, y]) => `<li><a href="/compare/${slug(x, y)}">${x} vs ${y}</a></li>`).join('')}</ul></section>`,
  });
}

// ---------- sitemap + robots ----------
const urls = ['/', '/how-it-works', '/privacy', ...PAIRS.map(([a, b]) => `/compare/${slug(a, b)}`)];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${BASE_URL}${u}</loc></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`);
console.log('Built', urls.length, 'pages');
