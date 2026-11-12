/* Static star background (drawn once, no animation, so it costs nothing while playing). */
(function () {
  var c = document.getElementById('space'); if (!c) return;
  var ctx = c.getContext('2d');
  function draw() {
    var dpr = Math.min(devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.min(300, Math.floor(W * H / 5000));
    for (var i = 0; i < n; i++) {
      var r = Math.random(), col = r > .94 ? '142,246,193' : r > .88 ? '190,150,255' : '255,255,255';
      ctx.fillStyle = 'rgba(' + col + ',' + (.2 + Math.random() * .7).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.3 + .3, 0, 6.283); ctx.fill();
    }
  }
  draw(); var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(draw, 200); });
})();
