(function () {
  'use strict';
  var T = window.TireMath, R = window.TireRender;
  var $ = function (id) { return document.getElementById(id); };
  var inA = $('size-a'), inB = $('size-b'), inC = $('size-conv');
  var out = $('results'), viz = $('viz'), speedo = $('speedo-wrap'), sum = $('summary'), conv = $('conv-out');

  function status(input, t) {
    var msg = $(input.id + '-msg');
    if (!input.value.trim()) { msg.textContent = ''; input.removeAttribute('aria-invalid'); return; }
    if (t) { msg.textContent = 'Reading as ' + t.label; input.removeAttribute('aria-invalid'); }
    else { msg.textContent = 'Not recognised yet. Try 265/70R17 or 33x12.50R17.'; input.setAttribute('aria-invalid', 'true'); }
  }

  function update() {
    var a = T.parse(inA.value), b = T.parse(inB.value);
    status(inA, a); status(inB, b);
    if (!a && b) { a = b; b = null; }
    out.innerHTML = a ? R.resultsTable(a, b) : '<p class="hint">Enter a tire size above to see its dimensions.</p>';
    viz.innerHTML = a ? T.profileSvg(a, b) : '';
    sum.innerHTML = a && b ? R.summary(a, b) : '';
    speedo.innerHTML = a && b ? R.speedoTable(a, b) : '<p class="hint">Enter two sizes to see speedometer error.</p>';
    var q = new URLSearchParams();
    if (inA.value.trim()) q.set('a', inA.value.trim());
    if (inB.value.trim()) q.set('b', inB.value.trim());
    var qs = q.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  function updateConv() {
    var t = T.parse(inC.value);
    status(inC, t);
    conv.innerHTML = t ? R.conversion(t) : '';
  }

  var params = new URLSearchParams(location.search);
  if (params.get('a')) inA.value = params.get('a');
  if (params.get('b')) inB.value = params.get('b');

  inA.addEventListener('input', update);
  inB.addEventListener('input', update);
  inC.addEventListener('input', updateConv);
  $('swap').addEventListener('click', function () { var t = inA.value; inA.value = inB.value; inB.value = t; update(); });
  $('copy-link').addEventListener('click', function () {
    var btn = this;
    var done = function () { btn.textContent = 'Link copied'; setTimeout(function () { btn.textContent = 'Copy link'; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, function () { prompt('Copy this link:', location.href); });
    else prompt('Copy this link:', location.href);
  });
  document.querySelectorAll('[data-example]').forEach(function (el) {
    el.addEventListener('click', function () { inA.value = el.dataset.a; inB.value = el.dataset.b; update(); inB.focus(); });
  });
  update(); updateConv();
})();
