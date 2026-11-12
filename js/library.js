/* Bedrock Games library: home shelves, paged browsing, search, favorites and the in-page player. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var SANDBOX = 'allow-scripts allow-pointer-lock allow-forms allow-popups allow-modals allow-downloads allow-orientation-lock';
  var STAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/></svg>';
  var PICKS = ['Slope', 'Run 3', 'Subway Surfers', 'Cookie Clicker', '2048', 'Geometry Dash', 'Drive Mad', 'Retro Bowl', 'Fireboy and Watergirl', 'Smash Karts', '1v1.lol', 'Bad Ice Cream', 'Flappy Bird', 'Crossy Road', 'Basketball Stars', 'Tunnel Rush', 'Hextris', 'Doodle Jump', 'Happy Wheels', 'Tetris', 'Pac-Man', 'Snake', 'Among Us', 'Stickman Hook'];
  var NAV = [['home', 'Home'], ['all', 'All games'], ['favs', 'Favorites'], ['recent', 'Recent'], ['flash', 'Flash'], ['minecraft', 'Minecraft'], ['bedrock', 'Original']];
  var TILE_W = 168, TILE_H = 150, GAP = 14;

  var favs = new Set(load('bg_favs', []));
  var recent = load('bg_recent', []);
  var games = [], list = [], view = 'home', page = 0, pageSize = 24, first = 0;
  var els = { main: $('#main'), q: $('#q'), nav: $('#nav'), count: $('#count'), title: $('#v-title'), sub: $('#v-sub'), home: $('#home'), browse: $('#browse'), grid: $('#grid'), gridwrap: $('#gridwrap'), letters: $('#letters'), prev: $('#prev'), next: $('#next'), pageinfo: $('#pageinfo'), pager: $('#pager') };

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
    buildNav(); render();
  }).catch(function () { els.count.textContent = 'Could not load the game list.'; });

  function inFilter(g, f) {
    if (f === 'all') return true;
    if (f === 'favs') return favs.has(g.link);
    if (f === 'recent') return recent.indexOf(g.link) !== -1;
    return g.tags.indexOf(f) !== -1;
  }
  function byLink(l) { for (var i = 0; i < games.length; i++) if (games[i].link === l) return games[i]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function buildNav() {
    els.nav.innerHTML = '';
    NAV.forEach(function (n) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.v = n[0];
      var c = n[0] === 'home' || n[0] === 'recent' || n[0] === 'favs' ? '' : '<small>' + games.filter(function (g) { return inFilter(g, n[0]); }).length.toLocaleString() + '</small>';
      b.innerHTML = '<span>' + n[1] + '</span>' + c;
      b.addEventListener('click', function () { els.q.value = ''; go(n[0]); });
      els.nav.appendChild(b);
    });
  }
  function go(v) { view = v; first = 0; render(); }

  /* ---------- rendering ---------- */
  function render() {
    var q = norm(els.q.value), searching = !!q;
    var v = searching && view === 'home' ? 'all' : view;
    Array.prototype.forEach.call(els.nav.children, function (b) { b.setAttribute('aria-current', String(b.dataset.v === v && !searching ? 'page' : (searching && b.dataset.v === 'all'))); });
    if (v === 'home') { els.home.hidden = false; els.browse.hidden = true; renderHome(); return; }
    els.home.hidden = true; els.browse.hidden = false;
    var raw = els.q.value.trim().toLowerCase();
    list = games.filter(function (g) { return inFilter(g, v) && (!q || g.key.indexOf(q) !== -1 || g.title.toLowerCase().indexOf(raw) !== -1); });
    if (v === 'recent') list.sort(function (a, b) { return recent.indexOf(a.link) - recent.indexOf(b.link); });
    else if (q) list.sort(function (a, b) { return (b.key.indexOf(q) === 0) - (a.key.indexOf(q) === 0); });
    var label = searching ? 'Results for “' + els.q.value.trim() + '”' : NAV.filter(function (n) { return n[0] === v; })[0][1];
    els.title.textContent = label;
    els.sub.textContent = list.length.toLocaleString() + (list.length === 1 ? ' game' : ' games');
    var sorted = v !== 'recent' && !q;
    els.letters.hidden = !sorted;
    if (sorted) buildLetters();
    measure(); drawPage();
  }

  function measure() {
    var w = els.gridwrap.clientWidth, h = els.gridwrap.clientHeight;
    var cols = Math.max(1, Math.floor((w + GAP) / (TILE_W + GAP)));
    var rows = Math.max(1, Math.floor((h + GAP) / (TILE_H + GAP)));
    pageSize = cols * rows;
    els.grid.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';
    els.grid.style.gridTemplateRows = 'repeat(' + rows + ', ' + TILE_H + 'px)';
    page = Math.floor(first / pageSize);
  }

  function drawPage() {
    var pages = Math.max(1, Math.ceil(list.length / pageSize));
    if (page >= pages) page = pages - 1;
    first = page * pageSize;
    els.grid.innerHTML = '';
    if (!list.length) {
      var e = document.createElement('div'); e.className = 'empty';
      var msg = view === 'favs' && !els.q.value ? ['No favorites yet', 'Tap the star on a game to save it here.'] :
                view === 'recent' && !els.q.value ? ['Nothing played yet', 'Games you open show up here.'] : ['No games found', 'Try a different search or filter.'];
      e.innerHTML = '<strong></strong><span></span>'; e.firstChild.textContent = msg[0]; e.lastChild.textContent = msg[1];
      els.grid.appendChild(e); els.pager.hidden = true; return;
    }
    var frag = document.createDocumentFragment();
    list.slice(first, first + pageSize).forEach(function (g) { frag.appendChild(cell(g)); });
    els.grid.appendChild(frag);
    els.pager.hidden = pages < 2;
    els.pageinfo.textContent = 'Page ' + (page + 1) + ' of ' + pages;
    els.prev.disabled = page === 0; els.next.disabled = page >= pages - 1;
    Array.prototype.forEach.call(els.letters.children, function (b) {
      var on = b.dataset.l === list[first].letter;
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function buildLetters() {
    var have = {};
    list.forEach(function (g, i) { if (!(g.letter in have)) have[g.letter] = i; });
    els.letters.innerHTML = '';
    '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (L) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = L; b.dataset.l = L;
      if (!(L in have)) b.disabled = true;
      b.addEventListener('click', function () { page = Math.floor(have[L] / pageSize); drawPage(); });
      els.letters.appendChild(b);
    });
  }
  function turn(d) { var pages = Math.ceil(list.length / pageSize); var n = page + d; if (n < 0 || n >= pages) return; page = n; drawPage(); }
  els.prev.addEventListener('click', function () { turn(-1); });
  els.next.addEventListener('click', function () { turn(1); });

  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (!els.browse.hidden) { measure(); drawPage(); } }, 120); });

  function renderHome() {
    var h = els.home; h.innerHTML = '';
    var picks = [], used = {};
    PICKS.forEach(function (p) {
      var k = norm(p), m = games.filter(function (g) { return g.key === k; })[0] || games.filter(function (g) { return g.key.indexOf(k) === 0; })[0];
      if (m && !used[m.link]) { used[m.link] = 1; picks.push(m); }
    });

    var hero = document.createElement('div'); hero.className = 'hero';
    hero.innerHTML = '<div><h2>Pick something and play.</h2><p></p></div><div class="hero-btns"><button class="pbtn go" type="button" id="h-surprise">Surprise me</button><button class="pbtn" type="button" id="h-all">Browse all games</button></div>';
    hero.querySelector('p').textContent = games.length.toLocaleString() + ' games, from quick arcade runs to full Minecraft clients.';
    h.appendChild(hero);
    hero.querySelector('#h-surprise').addEventListener('click', function () { openGame(games[Math.floor(Math.random() * games.length)]); });
    hero.querySelector('#h-all').addEventListener('click', function () { go('all'); });

    var rec = recent.map(byLink).filter(Boolean);
    var fv = Array.from(favs).map(byLink).filter(Boolean);
    if (rec.length) shelf('Continue playing', rec.slice(0, 20), 'recent');
    if (fv.length) shelf('Your favorites', fv.slice(0, 20), 'favs');
    shelf('Popular picks', picks, 'all');
    shelf('Flash classics', shuffle(games.filter(function (g) { return g.tags.indexOf('flash') !== -1; })).slice(0, 20), 'flash');
    shelf('Minecraft', games.filter(function (g) { return g.tags.indexOf('minecraft') !== -1; }).slice(0, 20), 'minecraft');
    shelf('Original Bedrock games', shuffle(games.filter(function (g) { return g.tags.indexOf('bedrock') !== -1; })).slice(0, 20), 'bedrock');
  }

  function shelf(title, items, viewAll) {
    if (!items.length) return;
    var s = document.createElement('section'); s.className = 'shelf';
    s.innerHTML = '<div class="shelf-head"><h3></h3><div><button class="arrow" type="button" aria-label="Scroll left">‹</button><button class="arrow" type="button" aria-label="Scroll right">›</button><button class="link" type="button">View all</button></div></div><div class="row"></div>';
    s.querySelector('h3').textContent = title;
    var row = s.querySelector('.row');
    items.forEach(function (g) { row.appendChild(cell(g)); });
    var a = s.querySelectorAll('.arrow');
    a[0].addEventListener('click', function () { row.scrollBy({ left: -row.clientWidth * .8, behavior: 'smooth' }); });
    a[1].addEventListener('click', function () { row.scrollBy({ left: row.clientWidth * .8, behavior: 'smooth' }); });
    s.querySelector('.link').addEventListener('click', function () { go(viewAll); });
    els.home.appendChild(s);
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
      var im = new Image(); im.alt = ''; im.decoding = 'async';
      im.onload = function () { art.insertBefore(im, art.firstChild); art.querySelector('.glyph').hidden = true; };
      im.src = g.img;
    }
    var fav = d.querySelector('.fav');
    function label(now) { fav.setAttribute('aria-pressed', String(now)); fav.setAttribute('aria-label', (now ? 'Remove ' : 'Add ') + g.title + (now ? ' from favorites' : ' to favorites')); }
    label(on);
    d.querySelector('.tile').addEventListener('click', function () { openGame(g); });
    fav.addEventListener('click', function () {
      if (favs.has(g.link)) favs.delete(g.link); else favs.add(g.link);
      save('bg_favs', Array.from(favs));
      if (view === 'favs' && !els.browse.hidden) render(); else label(favs.has(g.link));
    });
    return d;
  }

  var t; els.q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { first = 0; page = 0; render(); }, 120); });
  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName);
    if (!player.hidden) return;
    if (e.key === '/' && !typing) { e.preventDefault(); els.q.focus(); }
    else if (e.key === 'Escape' && document.activeElement === els.q) { els.q.value = ''; render(); els.q.blur(); }
    else if (!typing && !els.browse.hidden && e.key === 'ArrowRight') turn(1);
    else if (!typing && !els.browse.hidden && e.key === 'ArrowLeft') turn(-1);
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
    render();
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
