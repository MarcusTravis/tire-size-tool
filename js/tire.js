/* Tire math. Standard formulas only:
 *   sidewall (mm)      = section width (mm) * aspect ratio / 100
 *   overall diameter   = rim (in) * 25.4 + 2 * sidewall   (mm)
 *   circumference      = pi * diameter
 *   revolutions / mile = 63360 / (pi * diameter in inches)
 * Works in the browser (window.TireMath) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  var MM_PER_IN = 25.4;
  var IN_PER_MILE = 63360;

  function round(n, d) {
    var f = Math.pow(10, d || 0);
    return Math.round(n * f) / f;
  }

  // Build a full spec from width (mm), aspect (%), rim (in).
  function fromMetric(widthMm, aspect, rimIn) {
    var sidewallMm = widthMm * aspect / 100;
    var diameterMm = rimIn * MM_PER_IN + 2 * sidewallMm;
    return finish({ widthMm: widthMm, aspect: aspect, rimIn: rimIn, sidewallMm: sidewallMm, diameterMm: diameterMm });
  }

  // Build a full spec from overall diameter (in), section width (in), rim (in).
  function fromFlotation(diameterIn, widthIn, rimIn) {
    var sidewallIn = (diameterIn - rimIn) / 2;
    var widthMm = widthIn * MM_PER_IN;
    var sidewallMm = sidewallIn * MM_PER_IN;
    return finish({
      widthMm: widthMm,
      aspect: sidewallIn / widthIn * 100,
      rimIn: rimIn,
      sidewallMm: sidewallMm,
      diameterMm: diameterIn * MM_PER_IN
    });
  }

  function finish(t) {
    t.widthIn = t.widthMm / MM_PER_IN;
    t.sidewallIn = t.sidewallMm / MM_PER_IN;
    t.diameterIn = t.diameterMm / MM_PER_IN;
    t.circumferenceMm = Math.PI * t.diameterMm;
    t.circumferenceIn = Math.PI * t.diameterIn;
    t.revsPerMile = IN_PER_MILE / (Math.PI * t.diameterIn);
    t.revsPerKm = 1e6 / t.circumferenceMm;
    return t;
  }

  var METRIC_RE = /^(P|LT|ST|T)?\s*(\d{3})\s*\/\s*(\d{2,3})\s*(?:Z?R|D|B|-)?\s*(\d{2}(?:\.\d)?)\b/i;
  var FLOT_RE = /^(?:LT)?\s*(\d{2}(?:\.\d{1,2})?)\s*[x×*]\s*(\d{1,2}(?:\.\d{1,2})?)\s*(?:Z?R|D|B|-|\/)?\s*(\d{2}(?:\.\d)?)\b/i;

  // Parse a size string. Returns a spec object or null.
  function parse(input) {
    if (typeof input !== 'string') return null;
    var s = input.trim().toUpperCase().replace(/\s+/g, ' ');
    if (!s) return null;
    var m = METRIC_RE.exec(s);
    if (m) {
      var w = +m[2], a = +m[3], r = +m[4];
      if (w < 100 || w > 450 || a < 20 || a > 110 || r < 10 || r > 30) return null;
      var t = fromMetric(w, a, r);
      t.type = 'metric';
      t.prefix = (m[1] || '').toUpperCase();
      t.label = (t.prefix) + w + '/' + a + 'R' + r;
      return t;
    }
    m = FLOT_RE.exec(s);
    if (m) {
      var d = +m[1], fw = +m[2], fr = +m[3];
      if (d < 20 || d > 54 || fw < 6 || fw > 22 || fr < 10 || fr > 30 || d <= fr + 2) return null;
      var f = fromFlotation(d, fw, fr);
      f.type = 'flotation';
      f.prefix = 'LT';
      f.label = d + 'x' + fw.toFixed(2) + 'R' + fr;
      return f;
    }
    return null;
  }

  // Compare b against a. Positive = b is larger.
  function compare(a, b) {
    function diff(key) {
      var d = b[key] - a[key];
      return { abs: d, pct: d / a[key] * 100 };
    }
    return {
      diameter: { mm: diff('diameterMm'), in: diff('diameterIn') },
      width: { mm: diff('widthMm'), in: diff('widthIn') },
      sidewall: { mm: diff('sidewallMm'), in: diff('sidewallIn') },
      circumference: { mm: diff('circumferenceMm'), in: diff('circumferenceIn') },
      revsPerMile: diff('revsPerMile'),
      clearanceGainIn: (b.diameterIn - a.diameterIn) / 2,
      ratio: b.diameterMm / a.diameterMm
    };
  }

  // With original size a on the vehicle and new size b installed,
  // what is the real speed when the speedometer shows `indicated`?
  function actualSpeed(a, b, indicated) {
    return indicated * (b.diameterMm / a.diameterMm);
  }

  function speedoTable(a, b, speeds) {
    speeds = speeds || [20, 30, 40, 50, 60, 70, 80];
    return speeds.map(function (v) {
      var act = actualSpeed(a, b, v);
      return { indicated: v, actual: act, diff: act - v };
    });
  }

  // Nearest common metric size for a flotation size (widths end in 5, aspects step 5).
  function toMetric(t) {
    var w = Math.round((t.widthMm - 5) / 10) * 10 + 5;
    var a = Math.round(t.sidewallMm / w * 100 / 5) * 5;
    return fromMetricLabeled(w, a, t.rimIn);
  }
  function fromMetricLabeled(w, a, r) {
    var t = fromMetric(w, a, r);
    t.type = 'metric'; t.prefix = ''; t.label = w + '/' + a + 'R' + r;
    return t;
  }

  // Flotation-style equivalent for a metric size (rounded to common steps).
  function toFlotation(t) {
    var d = round(t.diameterIn, 1);
    var w = Math.round(t.widthIn * 2) / 2; // nearest 0.5 in
    return { diameterIn: d, widthIn: w, rimIn: t.rimIn, label: d + 'x' + w.toFixed(2) + 'R' + t.rimIn,
             exactLabel: round(t.diameterIn, 2) + 'x' + round(t.widthIn, 2) + 'R' + t.rimIn };
  }


  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Side-by-side SVG: side view (diameter + rim) and tread view (width), both to one scale.
  function profileSvg(a, b) {
    var tires = [a, b].filter(Boolean);
    if (!tires.length) return '';
    var maxD = Math.max.apply(null, tires.map(function (t) { return t.diameterMm; }));
    var H = 200, ground = 215, scale = H / maxD, out = [];
    var colors = ['tire-a', 'tire-b'];
    var names = ['A', 'B'];
    tires.forEach(function (t, i) {
      var r = t.diameterMm * scale / 2, rr = t.rimIn * 25.4 * scale / 2;
      var cx = 115 + i * 0.0, cy = ground - r;
      // side views overlap on the same centre-bottom so height difference is obvious
      out.push('<circle class="' + colors[i] + ' side" cx="' + cx + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '"/>');
      out.push('<circle class="' + colors[i] + ' rim" cx="' + cx + '" cy="' + cy.toFixed(1) + '" r="' + rr.toFixed(1) + '"/>');
      var w = t.widthMm * scale, h = t.diameterMm * scale;
      var x = 290 + i * 110 - w / 2;
      out.push('<rect class="' + colors[i] + ' tread" x="' + x.toFixed(1) + '" y="' + (ground - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + (w * 0.18).toFixed(1) + '"/>');
      out.push('<text x="' + (290 + i * 110) + '" y="236" text-anchor="middle">' + names[i] + ': ' + esc(t.label) + '</text>');
    });
    out.push('<line class="ground" x1="10" y1="' + ground + '" x2="450" y2="' + ground + '"/>');
    out.push('<text x="115" y="236" text-anchor="middle">Side view (overlaid)</text>');
    var desc = tires.map(function (t, i) { return 'Tire ' + names[i] + ' ' + t.label + ': ' + round(t.diameterIn, 2) + ' in tall, ' + round(t.widthIn, 2) + ' in wide'; }).join('; ');
    return '<svg class="profile" viewBox="0 0 460 245" role="img" aria-labelledby="svg-title svg-desc" xmlns="http://www.w3.org/2000/svg">' +
      '<title id="svg-title">Tire size comparison drawing, to scale</title><desc id="svg-desc">' + esc(desc) + '</desc>' +
      out.join('') + '</svg>';
  }

  var api = { profileSvg: profileSvg, esc: esc, parse: parse, fromMetric: fromMetric, fromFlotation: fromFlotation, compare: compare,
              actualSpeed: actualSpeed, speedoTable: speedoTable, toMetric: toMetric,
              toFlotation: toFlotation, round: round, MM_PER_IN: MM_PER_IN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TireMath = api;
})(this);
