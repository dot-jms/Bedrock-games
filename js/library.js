/* Bedrock Games library: search, filters, favorites and the in-page player. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var BATCH = 60;
  var SANDBOX = 'allow-scripts allow-pointer-lock allow-forms allow-popups allow-modals allow-downloads allow-orientation-lock';
  var STAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/></svg>';

  var favs = new Set(load('bg_favs', []));
  var recent = load('bg_recent', []);
  var games = [], list = [], shown = 0;
  var filter = 'all';
  var els = { grid: $('#grid'), q: $('#q'), chips: $('#chips'), letters: $('#letters'), status: $('#status'), count: $('#count'), more: $('#more') };

  /* ---------- data ---------- */
  function hue(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  function letterOf(t) { var c = t.trim().charAt(0).toUpperCase(); return c >= 'A' && c <= 'Z' ? c : '#'; }

  function get(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }

  Promise.all([get('config/games.json'), get('config/ugs-games.json').catch(function () { return []; })]).then(function (res) {
    var seen = {};
    res[0].forEach(function (g) { add({ title: g.title, link: g.link, img: g.imgSrc, tags: ['bedrock'], plain: true }); });
    res[1].forEach(function (g) { add({ title: g.title, link: g.link, tags: g.tags || [], plain: false }); });
    function add(g) {
      var k = norm(g.title) + '|' + g.link;
      if (seen[k] || !g.title) return; seen[k] = 1;
      g.key = norm(g.title); g.letter = letterOf(g.title); g.h = hue(g.title);
      games.push(g);
    }
    games.sort(function (a, b) { return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }); });
    els.count.textContent = games.length.toLocaleString() + ' games';
    buildChips(); update();
  }).catch(function () { els.count.textContent = 'Could not load the game list.'; });

  /* ---------- filters ---------- */
  var CHIPS = [['all', 'All'], ['favs', 'Favorites'], ['recent', 'Recent'], ['flash', 'Flash'], ['minecraft', 'Minecraft'], ['bedrock', 'Original']];
  function inFilter(g, f) {
    if (f === 'all') return true;
    if (f === 'favs') return favs.has(g.link);
    if (f === 'recent') return recent.indexOf(g.link) !== -1;
    return g.tags.indexOf(f) !== -1;
  }
  function buildChips() {
    els.chips.innerHTML = '';
    CHIPS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.f = c[0];
      b.innerHTML = c[1] + (c[0] === 'favs' || c[0] === 'recent' ? '' : ' <small>' + games.filter(function (g) { return inFilter(g, c[0]); }).length.toLocaleString() + '</small>');
      b.addEventListener('click', function () { filter = c[0]; update(); });
      els.chips.appendChild(b);
    });
  }

  function update() {
    var q = norm(els.q.value);
    var raw = els.q.value.trim().toLowerCase();
    list = games.filter(function (g) { return inFilter(g, filter) && (!q || g.key.indexOf(q) !== -1 || g.title.toLowerCase().indexOf(raw) !== -1); });
    if (filter === 'recent') list.sort(function (a, b) { return recent.indexOf(a.link) - recent.indexOf(b.link); });
    else if (q) list.sort(function (a, b) { return (b.key.indexOf(q) === 0) - (a.key.indexOf(q) === 0); });
    Array.prototype.forEach.call(els.chips.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.f === filter)); });
    buildLetters();
    els.grid.innerHTML = ''; shown = 0;
    if (!list.length) {
      var e = document.createElement('div'); e.className = 'empty';
      var msg = filter === 'favs' && !q ? ['No favorites yet', 'Tap the star on a game to save it here.'] :
                filter === 'recent' && !q ? ['Nothing played yet', 'Games you open show up here.'] : ['No games found', 'Try a different search or filter.'];
      e.innerHTML = '<strong></strong><span></span>'; e.firstChild.textContent = msg[0]; e.lastChild.textContent = msg[1];
      els.grid.appendChild(e); els.status.textContent = '';
      return;
    }
    els.status.textContent = (q || filter !== 'all') ? list.length.toLocaleString() + (list.length === 1 ? ' game' : ' games') : '';
    renderMore();
  }

  function buildLetters() {
    var have = {}, sorted = filter !== 'recent' && !norm(els.q.value);
    list.forEach(function (g) { if (!(g.letter in have)) have[g.letter] = list.indexOf(g); });
    els.letters.innerHTML = '';
    els.letters.hidden = !sorted;
    '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (L) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = L;
      if (!(L in have)) b.disabled = true;
      b.addEventListener('click', function () {
        var i = have[L]; while (shown <= i) renderMore(true);
        var cell = els.grid.children[i]; if (cell) cell.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      els.letters.appendChild(b);
    });
  }

  /* ---------- tiles ---------- */
  function renderMore() {
    var end = Math.min(list.length, shown + BATCH), frag = document.createDocumentFragment();
    for (var i = shown; i < end; i++) frag.appendChild(cell(list[i]));
    shown = end; els.grid.appendChild(frag);
  }
  function cell(g) {
    var d = document.createElement('div'); d.className = 'cell';
    var on = favs.has(g.link);
    d.innerHTML = '<button class="tile" type="button"><div class="art"><span class="glyph"></span><span class="tag" hidden></span></div><div class="name"></div></button>' +
      '<button class="fav" type="button" aria-pressed="' + on + '">' + STAR + '</button>';
    var art = d.querySelector('.art'); art.style.setProperty('--h', g.h);
    d.querySelector('.glyph').textContent = g.title.trim().replace(/^the\s+/i, '').slice(0, 2).replace(/^./, function (c) { return c.toUpperCase(); });
    d.querySelector('.name').textContent = g.title;
    d.querySelector('.name').title = g.title;
    var tag = d.querySelector('.tag');
    if (g.tags.indexOf('flash') !== -1) { tag.textContent = 'Flash'; tag.hidden = false; }
    else if (g.tags.indexOf('minecraft') !== -1) { tag.textContent = 'Minecraft'; tag.hidden = false; }
    if (g.img) {
      var im = new Image(); im.loading = 'lazy'; im.alt = ''; im.decoding = 'async';
      im.onload = function () { art.insertBefore(im, art.firstChild); art.querySelector('.glyph').hidden = true; };
      im.src = g.img;
    }
    var fav = d.querySelector('.fav'); fav.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + g.title + (on ? ' from favorites' : ' to favorites'));
    d.querySelector('.tile').addEventListener('click', function () { openGame(g); });
    fav.addEventListener('click', function () {
      if (favs.has(g.link)) favs.delete(g.link); else favs.add(g.link);
      save('bg_favs', Array.from(favs));
      if (filter === 'favs') update();
      else { var now = favs.has(g.link); fav.setAttribute('aria-pressed', String(now)); fav.setAttribute('aria-label', (now ? 'Remove ' : 'Add ') + g.title + (now ? ' from favorites' : ' to favorites')); }
    });
    return d;
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { if (e[0].isIntersecting && shown < list.length) renderMore(); }, { rootMargin: '900px' }).observe(els.more);
  } else addEventListener('scroll', function () { if (shown < list.length && innerHeight + scrollY > document.body.scrollHeight - 900) renderMore(); });

  var t; els.q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(update, 90); });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== els.q && player.hidden) { e.preventDefault(); els.q.focus(); }
    if (e.key === 'Escape' && document.activeElement === els.q) { els.q.value = ''; update(); els.q.blur(); }
  });

  /* ---------- player ---------- */
  var player = $('#player'), stage = $('#p-stage'), loadEl = $('#p-load'), hint = $('#p-hint');
  var cur = null, frame = null, mode = 'plain', hintTimer = 0, seq = 0;

  /* Runs first inside sandboxed games. Gives them working localStorage / sessionStorage / cookies
     and sends changes back to this page, which keeps them per game. */
  var SHIM = '(' + function (INIT) {
    var timer = 0;
    function sched() { clearTimeout(timer); timer = setTimeout(flush, 400); }
    function flush() { try { parent.postMessage({ bg: 'save', data: data }, '*'); } catch (e) {} }
    var data = {}; for (var k in INIT) data[k] = String(INIT[k]);
    function store(d, persist) {
      var api = {
        getItem: function (k) { k = String(k); return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
        setItem: function (k, v) { d[String(k)] = String(v); persist && sched(); },
        removeItem: function (k) { delete d[String(k)]; persist && sched(); },
        clear: function () { for (var k in d) delete d[k]; persist && sched(); },
        key: function (i) { var ks = Object.keys(d); return i < ks.length ? ks[i] : null; }
      };
      return new Proxy(api, {
        get: function (t, p) { if (p === 'length') return Object.keys(d).length; if (typeof p === 'string' && p in api && !(p in d)) return api[p]; if (typeof p === 'string' && p in d) return d[p]; return undefined; },
        set: function (t, p, v) { if (typeof p === 'string') { d[p] = String(v); persist && sched(); } return true; },
        deleteProperty: function (t, p) { delete d[p]; persist && sched(); return true; },
        has: function (t, p) { return p in d || p in api || p === 'length'; },
        ownKeys: function () { return Object.keys(d); },
        getOwnPropertyDescriptor: function (t, p) { return p in d ? { value: d[p], enumerable: true, configurable: true, writable: true } : undefined; }
      });
    }
    var ls = store(data, true), ss = store({}, false);
    try { Object.defineProperty(window, 'localStorage', { get: function () { return ls; }, configurable: true }); } catch (e) {}
    try { Object.defineProperty(window, 'sessionStorage', { get: function () { return ss; }, configurable: true }); } catch (e) {}
    var jar = {};
    try {
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: function () { return Object.keys(jar).map(function (k) { return k + '=' + jar[k]; }).join('; '); },
        set: function (s) {
          var p = String(s).split(';'), kv = p[0], i = kv.indexOf('='); if (i < 0) return;
          var k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim(), dead = false;
          p.slice(1).forEach(function (a) { a = a.trim().toLowerCase(); if (a.indexOf('max-age=') === 0 && parseInt(a.slice(8), 10) <= 0) dead = true; if (a.indexOf('expires=') === 0 && Date.parse(a.slice(8)) < Date.now()) dead = true; });
          if (dead) delete jar[k]; else jar[k] = v;
        }
      });
    } catch (e) {}
    addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); });
  }.toString() + ')(__INIT__);';

  function savedFor(g) { var d = load('bgsave:' + g.link, {}); return d && typeof d === 'object' ? d : {}; }

  function openGame(g) {
    recent = [g.link].concat(recent.filter(function (x) { return x !== g.link; })).slice(0, 24);
    save('bg_recent', recent);
    cur = g;
    $('#p-title').textContent = g.title;
    player.hidden = false; document.body.style.overflow = 'hidden';
    start(g.plain ? 'plain' : 'sandbox');
  }

  function start(m) {
    mode = m; var id = ++seq;
    if (frame) { frame.remove(); frame = null; }
    loadEl.hidden = false; hint.textContent = 'Loading…'; clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      if (!loadEl.hidden) hint.textContent = mode === 'sandbox' ? 'Still loading. If it stays blank, your network may block the game host. Compatibility mode can help.' : 'Still loading…';
    }, 9000);
    $('#p-compat').hidden = m !== 'sandbox';

    frame = document.createElement('iframe');
    frame.setAttribute('allow', 'fullscreen; autoplay; gamepad; clipboard-write');
    frame.setAttribute('allowfullscreen', '');
    frame.title = cur.title;
    frame.addEventListener('load', function () { if (id === seq && frame && frame.src !== 'about:blank') { loadEl.hidden = true; } });

    if (m === 'sandbox') {
      fetch(cur.link).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function (html) {
        if (id !== seq) return;
        var shim = '<script>' + SHIM.replace('__INIT__', function () { return JSON.stringify(savedFor(cur)).replace(/</g, '\\u003c'); }) + '<\/script>';
        var done = false;
        html = html.replace(/<head[^>]*>/i, function (x) { done = true; return x + shim; });
        if (!done) html = html.replace(/<html[^>]*>/i, function (x) { done = true; return x + shim; });
        if (!done) html = shim + html;
        frame.setAttribute('sandbox', SANDBOX);
        frame.srcdoc = html;
        stage.appendChild(frame);
      }).catch(function () { if (id === seq) hint.textContent = 'Could not load this game. Try Reload, or Compatibility mode.'; });
    } else {
      frame.src = cur.link;
      stage.appendChild(frame);
    }
  }

  addEventListener('message', function (ev) {
    if (!frame || !cur || ev.source !== frame.contentWindow) return;
    var m = ev.data;
    if (!m || m.bg !== 'save' || !m.data || typeof m.data !== 'object') return;
    var clean = {}, size = 0;
    for (var k in m.data) { if (typeof m.data[k] === 'string') { clean[k] = m.data[k]; size += k.length + m.data[k].length; } }
    if (size > 1500000) return;
    save('bgsave:' + cur.link, clean);
  });

  function closePlayer() {
    seq++; clearTimeout(hintTimer);
    if (document.fullscreenElement) document.exitFullscreen();
    if (frame) { frame.remove(); frame = null; }
    player.hidden = true; document.body.style.overflow = ''; cur = null;
    if (filter === 'recent') update();
  }
  $('#p-back').addEventListener('click', closePlayer);
  $('#p-reload').addEventListener('click', function () { if (cur) start(mode); });
  $('#p-full').addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen(); else if (stage.requestFullscreen) stage.requestFullscreen();
  });
  $('#p-compat').addEventListener('click', function () {
    if (!cur) return;
    if (confirm('Compatibility mode runs this game without the safety sandbox, so it can use more browser features (like saves in IndexedDB) but is less isolated from this site. Only use it if the game won\'t work normally. Continue?')) start('plain');
  });
})();
