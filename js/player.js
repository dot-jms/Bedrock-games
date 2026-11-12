/* Bedrock Games player (play.html). Runs one game, full screen. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var SANDBOX = 'allow-scripts allow-pointer-lock allow-forms allow-popups allow-modals allow-downloads allow-orientation-lock';
  /* ---------- player ---------- */
  var stage = $('#p-stage'), loadEl = $('#p-load'), hint = $('#p-hint');
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

  function start(m) {
    mode = m; var id = ++seq;
    if (frame) { frame.remove(); frame = null; }
    loadEl.hidden = false; hint.textContent = 'Loading…'; clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      if (!loadEl.hidden) hint.textContent = mode === 'sandbox' ? 'Still loading. If it stays blank, your network may block the game host. Compatibility mode can help.' : 'Still loading…';
    }, 9000);
    var tg = $('#p-compat'); tg.hidden = cur.plain; tg.textContent = m === 'sandbox' ? 'Compatibility mode' : 'Safe mode';
    tg.title = m === 'sandbox' ? 'Run the game normally, with full browser features.' : 'Run the game in an isolated sandbox.';

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
      }).catch(function () { if (id === seq) hint.textContent = 'Could not load this game. Try Reload.'; });
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

  $('#p-back').addEventListener('click', function () {
    try { if (top !== window && top.opener) { top.close(); return; } } catch (e) {}
    location.href = 'index.html';
  });
  $('#p-reload').addEventListener('click', function () { if (cur) start(mode); });
  $('#p-full').addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen(); else if (stage.requestFullscreen) stage.requestFullscreen();
  });
  $('#p-compat').addEventListener('click', function () { if (cur) start(mode === 'sandbox' ? 'plain' : 'sandbox'); });

  var link = new URLSearchParams(location.search).get('g') || '';
  function find(list, plain) { for (var i = 0; i < list.length; i++) if (list[i].link === link) return { title: list[i].title, link: link, plain: plain }; }
  Promise.all([
    fetch('config/games.json').then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch('config/ugs-games.json').then(function (r) { return r.json(); }).catch(function () { return []; })
  ]).then(function (r) {
    var g = find(r[0], true) || find(r[1], false);
    if (!g) { hint.textContent = 'Game not found.'; $('#p-compat').hidden = true; return; }
    cur = g; $('#p-title').textContent = g.title; document.title = 'Bedrock Games';
    start('plain');
  });
})();
