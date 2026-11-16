/* Bedrock Games gate.
   Set REQUIRE_BEDROCK_LAUNCH to true to require a valid launch link from Bedrock,
   or false to allow direct visits. lock.json is the emergency lock: set "locked": true and everyone,
   including people already playing, is sent to locked.html. This is a browser-side check, not real security. */
(function () {
  var REQUIRE_BEDROCK_LAUNCH = true; // Set to false to disable the Bedrock launch check.
  var SALT = 'bdrk-ca45991a75b798231a49a3df';          // must match portal.html in the Bedrock repo
  var MAX_AGE_MS = 2 * 60 * 1000;  // how long a launch link stays valid

  function hash(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  var ok = !REQUIRE_BEDROCK_LAUNCH;
  if (REQUIRE_BEDROCK_LAUNCH) {
    try {
      if (sessionStorage.getItem('bg_ok') === '1') {
        ok = true;                                   // already unlocked in this tab
      } else {
        var m = /[#&]bg=([a-z0-9]+)\.([a-z0-9]+)/.exec(location.hash);
        if (m && hash(m[1] + SALT) === m[2]) {
          var age = Date.now() - parseInt(m[1], 36);
          if (age >= -10000 && age < MAX_AGE_MS) {
            ok = true;
            sessionStorage.setItem('bg_ok', '1');
            history.replaceState(null, '', location.pathname + location.search);  // hide the code
          }
        }
      }
    } catch (e) {}
  }

  // Remote lock: lock.json is re-read while the page is open, so locking it in the repo also
  // kicks out anyone already playing. Network errors are ignored so a Wi-Fi blip doesn't kick people.
  var base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]*$/, '');
  function kick() {
    try { sessionStorage.removeItem('bg_ok'); } catch (e) {}
    try { window.stop(); } catch (e) {}
    location.replace(base + 'locked.html');
  }
  if (ok) {
    var root = document.documentElement, shown = false;
    root.style.visibility = 'hidden';                       // stay hidden until the first check finishes
    var reveal = function () { if (!shown) { shown = true; root.style.visibility = ''; } };
    setTimeout(reveal, 4000);
    var check = function () {
      try {
        fetch(base + 'lock.json?t=' + Date.now(), { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : { locked: false }; })
          .then(function (j) { if (j && j.locked === true) kick(); else reveal(); })
          .catch(reveal);
      } catch (e) { reveal(); }
    };
    check();
    setInterval(check, 15000);
    addEventListener('focus', check);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
  }

  if (ok) window.bgLaunchCode = function () { var t = Date.now().toString(36); return t + '.' + hash(t + SALT); };

  if (!ok) {
    var here = document.currentScript && document.currentScript.src;
    try { window.stop(); } catch (e) {}
    location.replace(here ? here.replace(/gate\.js[^/]*$/, 'locked.html') : 'locked.html');
  }
})();
