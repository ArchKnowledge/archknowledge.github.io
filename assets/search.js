// Client-side search over search-index.json (generated at build time). No dependencies.
(function () {
  var input = document.getElementById('q');
  var list = document.getElementById('search-results');
  var status = document.getElementById('search-status');
  var missing = document.getElementById('search-missing');
  if (!input || !list) return;
  var index = null;

  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; });
  }
  function highlight(text, terms) {
    var out = esc(text);
    terms.forEach(function (t) {
      if (t.length < 2) return;
      out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
    });
    return out;
  }
  function snippet(e, terms) {
    if (e.s) return e.s;
    var x = e.x || '', lx = norm(x), pos = -1;
    terms.some(function (t) { pos = lx.indexOf(t); return pos >= 0; });
    if (pos < 0) return x.slice(0, 180);
    var start = Math.max(0, pos - 70);
    return (start ? '… ' : '') + x.slice(start, start + 200) + '…';
  }
  function score(e, terms) {
    var t = norm(e.t), total = 0;
    var alias = norm((e.a || []).join(' ')), sum = norm(e.s), text = norm(e.x);
    var meta = norm(e.k + ' ' + e.d), id = norm(e.id);
    for (var i = 0; i < terms.length; i++) {
      var q = terms[i], s = 0;
      if (id && id === q) s += 60;
      if (t === q) s += 50; else if (t.indexOf(q) === 0) s += 20; else if (t.indexOf(q) >= 0) s += 12;
      if (alias.indexOf(q) >= 0) s += 8;
      if (sum.indexOf(q) >= 0) s += 3;
      if (meta.indexOf(q) >= 0) s += 2;
      if (text.indexOf(q) >= 0) s += 1;
      if (!s) return 0;           // every term must match somewhere
      total += s;
    }
    var phrase = terms.join(' ');  // whole-query bonus: exact and phrase matches on the title win
    if (t === phrase) total += 100; else if (t.indexOf(phrase) === 0) total += 40; else if (t.indexOf(phrase) >= 0) total += 25;
    return total + (e.k === 'Page' ? -5 : 0);
  }
  function run(q) {
    var terms = norm(q).split(/\s+/).filter(Boolean);
    list.innerHTML = '';
    if (missing) missing.hidden = true;
    if (!terms.length) { status.textContent = ''; return; }
    var hits = index.map(function (e) { return {e: e, s: score(e, terms)}; })
      .filter(function (h) { return h.s > 0; })
      .sort(function (a, b) { return b.s - a.s || a.e.t.localeCompare(b.e.t); })
      .slice(0, 40);
    status.textContent = hits.length ? hits.length + (hits.length === 40 ? '+' : '') + ' result' + (hits.length === 1 ? '' : 's') : 'No results';
    if (!hits.length && missing) missing.hidden = false;
    list.innerHTML = hits.map(function (h) {
      var e = h.e;
      return '<li><a href="' + esc(e.u) + '">' + highlight(e.t, terms) + '</a>' +
        '<span class="result-meta">' + esc(e.k) + (e.d && e.k !== 'Domain' ? ' · ' + esc(e.d) : '') + (e.id ? ' · ' + esc(e.id) : '') + '</span>' +
        '<span class="result-snippet">' + highlight(snippet(e, terms), terms) + '</span></li>';
    }).join('');
  }
  var timer;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var url = new URL(window.location.href);
      if (input.value) url.searchParams.set('q', input.value); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
      if (index) run(input.value);
    }, 120);
  });
  document.querySelector('.search-form').addEventListener('submit', function (ev) { ev.preventDefault(); if (index) run(input.value); });
  var initial = new URLSearchParams(window.location.search).get('q') || '';
  input.value = initial;
  status.textContent = 'Loading index…';
  fetch('search-index.json').then(function (r) { return r.json(); }).then(function (data) {
    index = data;
    status.textContent = '';
    run(input.value);
    input.focus();
  }).catch(function () {
    status.textContent = 'The search index could not be loaded. Browse by domain on Explore instead.';
  });
})();
