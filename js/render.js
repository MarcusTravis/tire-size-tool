/* HTML builders shared by the live calculator and the static comparison pages. */
(function (root) {
  'use strict';
  var T = (typeof module !== 'undefined' && module.exports) ? require('./tire.js') : root.TireMath;
  var esc = T.esc;

  function f(n, d) { return Number(n).toFixed(d); }
  function signed(n, d) { var s = f(n, d); return (n > 0 && +s !== 0 ? '+' : '') + (+s === 0 ? f(0, d) : s); }

  var ROWS = [
    ['Overall diameter', 'diameterIn', 'diameterMm', 'diameter'],
    ['Section width', 'widthIn', 'widthMm', 'width'],
    ['Sidewall height', 'sidewallIn', 'sidewallMm', 'sidewall'],
    ['Circumference', 'circumferenceIn', 'circumferenceMm', 'circumference']
  ];

  function cell(t, kin, kmm) {
    return t ? '<span class="v-in">' + f(t[kin], 2) + ' in</span><span class="v-mm">' + f(t[kmm], 1) + ' mm</span>' : '&mdash;';
  }

  function resultsTable(a, b) {
    var c = a && b ? T.compare(a, b) : null;
    var h = '<table class="results"><caption class="sr-only">Tire dimensions' + (c ? ' and differences' : '') + '</caption><thead><tr><th scope="col">Measurement</th>' +
      '<th scope="col">A' + (a ? '<span class="lbl">' + esc(a.label) + '</span>' : '') + '</th>' +
      (b ? '<th scope="col">B<span class="lbl">' + esc(b.label) + '</span></th>' : '') +
      (c ? '<th scope="col">Change</th>' : '') + '</tr></thead><tbody>';
    ROWS.forEach(function (r) {
      h += '<tr><th scope="row">' + r[0] + '</th><td>' + cell(a, r[1], r[2]) + '</td>' + (b ? '<td>' + cell(b, r[1], r[2]) + '</td>' : '');
      if (c) {
        var d = c[r[3]];
        h += '<td class="' + cls(d.in.abs) + '"><span class="v-in">' + signed(d.in.abs, 2) + ' in</span><span class="v-mm">' + signed(d.mm.abs, 1) + ' mm</span><span class="v-pct">' + signed(d.in.pct, 2) + '%</span></td>';
      }
      h += '</tr>';
    });
    h += '<tr><th scope="row">Aspect ratio</th><td>' + (a ? f(a.aspect, 1) + '%' : '&mdash;') + '</td>' + (b ? '<td>' + f(b.aspect, 1) + '%</td>' : '') + (c ? '<td>' + signed(b.aspect - a.aspect, 1) + ' pts</td>' : '') + '</tr>';
    h += '<tr><th scope="row">Revolutions per mile</th><td>' + (a ? f(a.revsPerMile, 1) : '&mdash;') + '</td>' + (b ? '<td>' + f(b.revsPerMile, 1) + '</td>' : '') +
      (c ? '<td class="' + cls(c.revsPerMile.abs) + '">' + signed(c.revsPerMile.abs, 1) + '<span class="v-pct">' + signed(c.revsPerMile.pct, 2) + '%</span></td>' : '') + '</tr>';
    h += '</tbody></table>';
    return h;
  }

  function cls(n) { return Math.abs(n) < 1e-9 ? 'same' : (n > 0 ? 'up' : 'down'); }

  function speedoTable(a, b) {
    var rows = T.speedoTable(a, b);
    var h = '<table class="speedo"><caption>Speedometer calibrated for ' + esc(a.label) + ', driving on ' + esc(b.label) + '</caption>' +
      '<thead><tr><th scope="col">Speedometer shows</th><th scope="col">Actual speed</th><th scope="col">Change</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr><td>' + r.indicated + ' mph</td><td>' + f(r.actual, 1) + ' mph</td><td class="' + cls(r.diff) + '">' + signed(r.diff, 1) + ' mph</td></tr>';
    });
    return h + '</tbody></table>';
  }

  function summary(a, b) {
    var c = T.compare(a, b);
    var pct = c.diameter.in.pct;
    if (Math.abs(pct) < 0.005) return esc(b.label) + ' has the same overall diameter as ' + esc(a.label) + '.';
    var taller = pct > 0;
    var s = esc(b.label) + ' is <strong>' + f(Math.abs(c.diameter.in.abs), 2) + ' in (' + f(Math.abs(c.diameter.mm.abs), 1) + ' mm) ' +
      (taller ? 'taller' : 'shorter') + '</strong> than ' + esc(a.label) + ' (' + signed(pct, 2) + '%). ';
    s += 'Ground clearance at the axle changes by about ' + signed(c.clearanceGainIn, 2) + ' in. ';
    s += 'At an indicated 60 mph you would really be going ' + f(T.actualSpeed(a, b, 60), 1) + ' mph.';
    if (Math.abs(pct) > 3) s += ' <span class="warn">That is more than a 3% change in diameter, so check clearance, gearing and speedometer calibration.</span>';
    return s;
  }

  function conversion(t) {
    if (!t) return '';
    if (t.type === 'flotation') {
      var m = T.toMetric(t);
      return esc(t.label) + ' is about <strong>' + esc(m.label) + '</strong> in metric (' + f(m.diameterIn, 2) + ' in vs ' + f(t.diameterIn, 2) + ' in tall). ' +
        'Exact metric equivalent: ' + f(t.widthMm, 0) + ' mm wide, ' + f(t.aspect, 1) + '% aspect.';
    }
    var fl = T.toFlotation(t);
    return esc(t.label) + ' is about <strong>' + esc(fl.label) + '</strong> in flotation (inch) sizing. Exact: ' + esc(fl.exactLabel) + '.';
  }

  var api = { resultsTable: resultsTable, speedoTable: speedoTable, summary: summary, conversion: conversion };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TireRender = api;
})(this);
