/* Animated star background. */
(function () {
  var canvas = document.getElementById('space');
  if (!canvas) return;
  var ctx = canvas.getContext('2d'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W, H, stars = [], blobs = [], raf = 0, rand = function (a, b) { return Math.random() * (b - a) + a; };
  function size() {
    var dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.min(260, Math.floor(W * H / 6500)) }, function () {
      var r = Math.random();
      return { x: rand(0, W), y: rand(0, H), z: rand(.25, 1), r: rand(.4, 1.5), vx: rand(-.02, .02), vy: rand(-.04, .04), p: rand(0, 6.28), s: rand(.4, 1.4), c: r > .93 ? '142,246,193' : r > .87 ? '190,150,255' : '255,255,255' };
    });
    blobs = Array.from({ length: 5 }, function (_, i) { return { x: rand(0, W), y: rand(0, H), r: rand(160, 320), vx: rand(-.06, .06), vy: rand(-.04, .04), c: i % 2 ? '150,85,255' : '142,246,193', a: rand(.035, .07) }; });
  }
  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    blobs.forEach(function (b) {
      if (!reduce) { b.x += b.vx; b.y += b.vy; }
      if (b.x < -b.r) b.x = W + b.r; if (b.x > W + b.r) b.x = -b.r; if (b.y < -b.r) b.y = H + b.r; if (b.y > H + b.r) b.y = -b.r;
      var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r); g.addColorStop(0, 'rgba(' + b.c + ',' + b.a + ')'); g.addColorStop(1, 'rgba(' + b.c + ',0)');
      ctx.fillStyle = g; ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    });
    var sec = t / 1000;
    stars.forEach(function (s) {
      if (!reduce) { s.x += s.vx * s.z; s.y += s.vy * s.z; if (s.x < 0) s.x = W; if (s.x > W) s.x = 0; if (s.y < 0) s.y = H; if (s.y > H) s.y = 0; }
      var tw = reduce ? .7 : .55 + .45 * Math.sin(sec * s.s + s.p);
      ctx.fillStyle = 'rgba(' + s.c + ',' + (.25 + .75 * s.z * tw).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (.6 + s.z * .6), 0, 6.283); ctx.fill();
    });
    if (!reduce && !document.hidden) raf = requestAnimationFrame(frame);
  }
  size(); raf = requestAnimationFrame(frame);
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 150); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !reduce) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } });
})();
