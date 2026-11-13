// Run with: node tests/tire.test.js
const assert = require('assert');
const T = require('../js/tire.js');
let n = 0;
function near(actual, expected, tol, msg) {
  n++;
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: got ${actual}, expected ${expected} ±${tol}`);
}

const a = T.parse('265/70R17');
near(a.sidewallMm, 185.5, 1e-9, '265/70R17 sidewall mm');
near(a.diameterMm, 802.8, 1e-9, '265/70R17 diameter mm');
near(a.diameterIn, 31.6, 0.05, '265/70R17 diameter in');
near(a.revsPerMile, 638, 1, '265/70R17 revs/mile');

const f = T.parse('33x12.50R15');
near(f.diameterIn, 33.0, 1e-9, '33x12.50R15 diameter');
near(f.widthIn, 12.5, 1e-9, '33x12.50R15 width');
near(f.sidewallIn, 9.0, 1e-9, '33x12.50R15 sidewall');
near(f.revsPerMile, 611.1, 0.1, '33x12.50R15 revs/mile');

const f17 = T.parse('LT33x12.50R17');
near(f17.diameterIn, 33.0, 1e-9, 'flotation on 17 diameter');
near(f17.sidewallIn, 8.0, 1e-9, 'flotation on 17 sidewall');

const p = T.parse('P225/45ZR18 95W');
assert.strictEqual(p.prefix, 'P'); n++;
near(p.diameterIn, 25.97, 0.01, 'P225/45ZR18 diameter');
const lt = T.parse('lt 285/75 r 16 126/123R');
assert.strictEqual(lt.prefix, 'LT'); n++;
near(lt.diameterIn, 32.83, 0.01, 'LT285/75R16 diameter');

assert.strictEqual(T.parse('hello'), null); n++;
assert.strictEqual(T.parse(''), null); n++;
assert.strictEqual(T.parse('265/70'), null); n++;

const b = T.parse('285/70R17');
const c = T.compare(a, b);
near(c.diameter.mm.abs, 28, 1e-9, '285 vs 265 diameter diff mm');
near(c.diameter.in.pct, 3.488, 0.01, '285 vs 265 diameter diff %');
const sp = T.speedoTable(a, b);
near(sp[4].actual, 62.09, 0.01, 'speedo at 60');
assert.strictEqual(sp.length, 7); n++;

const m = T.toMetric(f);
assert.strictEqual(m.label, '315/75R15'); n++;
const fl = T.toFlotation(a);
assert.strictEqual(fl.label, '31.6x10.50R17'); n++;

console.log(`All ${n} checks passed.`);
console.log(`265/70R17: ${a.diameterIn.toFixed(2)} in, ${a.revsPerMile.toFixed(1)} revs/mile`);
console.log(`33x12.50R15: ${f.diameterIn.toFixed(2)} in, ${f.revsPerMile.toFixed(1)} revs/mile`);
