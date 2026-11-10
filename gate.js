/* Bedrock Games gate.
   The page only opens when launched from Bedrock, which adds a short-lived signed code
   to the link (#bg=...). Anything else is sent to locked.html.
   This runs in the browser, so it keeps casual visitors out but is not real security. */
(function () {
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

  var ok = false;
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

  if (!ok) {
    var here = document.currentScript && document.currentScript.src;
    try { window.stop(); } catch (e) {}
    location.replace(here ? here.replace(/gate\.js[^/]*$/, 'locked.html') : 'locked.html');
  }
})();
