/* ============================================================
   운세도사 · 앰비언트 빛 입자 (fx.js)
   - 캔버스 한 장에 테마별 빛 입자를 그린다 (ember · petal · star)
   - 스프라이트를 한 번만 만들어 drawImage 로만 그려 모바일에서도 가볍다
   - 화면에 보일 때만 requestAnimationFrame 을 돌리고,
     prefers-reduced-motion 이면 움직이지 않는 한 장만 그린다
   - 캔버스가 문서에서 빠지면 스스로 멈춘다 (컷을 다시 그려도 안전)
   ============================================================ */
(function (global) {
  'use strict';
  if (!global || !global.document) return;

  var doc = global.document;
  var reduced = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var sprites = {};          /* 색·종류별 스프라이트 캐시 */
  var TAU = Math.PI * 2;

  /* 테마별 프리셋
     per100k : 100,000px² 당 입자 수, size: 지름(px), speed: px/s,
     sway/swayHz: 좌우 흔들림, flicker: 반짝임 속도(rad/s), spark: 별빛 비율 */
  var PRESETS = {
    /* 도령 — 은은한 금빛 불티가 아래에서 위로 천천히 떠오른다 */
    ember: {
      per100k: 13, min: 8, max: 42,
      size: [9, 21], speed: [10, 30],
      sway: [5, 16], swayHz: [0.06, 0.18],
      alpha: [0.3, 0.78], flicker: [0.7, 2.0],
      spark: 0, spin: 0, sharp: false,
      vx: [0, 0], vy: [-1, 0],
      colors: ['255,218,150', '255,244,206', '244,190,110']
    },
    /* 선녀 — 부드러운 별빛·꽃빛 입자가 몽환적으로 반짝이며 흐른다 */
    petal: {
      per100k: 16, min: 10, max: 48,
      size: [5, 14], speed: [4, 12],
      sway: [8, 22], swayHz: [0.08, 0.2],
      alpha: [0.3, 0.82], flicker: [1.2, 3.2],
      spark: 0.16, spin: 0.8, sharp: false,
      vx: [0.25, 1], vy: [-0.12, 0.35],
      colors: ['255,196,220', '236,200,255', '255,240,246']
    },
    /* 역술가 — 밤하늘 은빛 별빛이 반짝이며 천천히 흐른다 */
    star: {
      per100k: 17, min: 12, max: 52,
      size: [3.5, 11],
      speed: [2, 7],
      sway: [3, 10], swayHz: [0.05, 0.14],
      alpha: [0.34, 0.95], flicker: [1.0, 3.4],
      spark: 0.34, spin: 0.5, sharp: true,
      vx: [0.2, 1], vy: [-0.5, 0.2],
      colors: ['226,238,255', '255,255,255', '198,220,255']
    }
  };

  function rand(a, b) { return a + Math.random() * (b - a); }

  /* 부드러운 빛 덩어리 스프라이트 */
  function glow(color) {
    var key = 'g:' + color;
    if (sprites[key]) return sprites[key];
    var s = 64, c = doc.createElement('canvas'), h = s / 2;
    c.width = c.height = s;
    var g = c.getContext('2d');
    if (!g) return null;
    var grad = g.createRadialGradient(h, h, 0, h, h, h);
    grad.addColorStop(0, 'rgba(' + color + ',1)');
    grad.addColorStop(0.2, 'rgba(' + color + ',0.78)');
    grad.addColorStop(0.52, 'rgba(' + color + ',0.24)');
    grad.addColorStop(1, 'rgba(' + color + ',0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(h, h, h, 0, TAU); g.fill();
    return (sprites[key] = c);
  }

  /* 네 갈래로 반짝이는 별 스프라이트 */
  function spark(color) {
    var key = 's:' + color;
    if (sprites[key]) return sprites[key];
    var s = 64, c = doc.createElement('canvas'), h = s / 2;
    c.width = c.height = s;
    var g = c.getContext('2d');
    if (!g) return null;
    g.translate(h, h);
    g.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 2; i++) {
      var lg = i
        ? g.createLinearGradient(0, -h, 0, h)
        : g.createLinearGradient(-h, 0, h, 0);
      lg.addColorStop(0, 'rgba(' + color + ',0)');
      lg.addColorStop(0.5, 'rgba(' + color + ',0.92)');
      lg.addColorStop(1, 'rgba(' + color + ',0)');
      g.fillStyle = lg;
      if (i) g.fillRect(-1.1, -h, 2.2, s);
      else g.fillRect(-h, -1.1, s, 2.2);
    }
    var rad = g.createRadialGradient(0, 0, 0, 0, 0, h * 0.5);
    rad.addColorStop(0, 'rgba(' + color + ',0.9)');
    rad.addColorStop(1, 'rgba(' + color + ',0)');
    g.fillStyle = rad;
    g.fillRect(-h, -h, s, s);
    return (sprites[key] = c);
  }

  function layer(canvas, kind, opts) {
    var preset = PRESETS[kind] || PRESETS.ember;
    var ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return null;

    opts = opts || {};
    var scale = opts.scale || 1;
    var countCap = opts.count || 0;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var W = 0, H = 0, items = [], raf = 0, last = 0, clock = 0, visible = false;

    function spawn(p, fromTop) {
      p.r = rand(preset.size[0], preset.size[1]) * scale / 2;
      p.color = preset.colors[(Math.random() * preset.colors.length) | 0];
      p.isSpark = preset.spark ? Math.random() < preset.spark : false;
      p.a = rand(preset.alpha[0], preset.alpha[1]);
      p.vx = rand(preset.vx[0], preset.vx[1]) * rand(preset.speed[0], preset.speed[1]);
      p.vy = rand(preset.vy[0], preset.vy[1]) * rand(preset.speed[0], preset.speed[1]);
      p.sway = rand(preset.sway[0], preset.sway[1]) * scale;
      p.swayHz = rand(preset.swayHz[0], preset.swayHz[1]);
      p.ph = Math.random() * TAU;
      p.twHz = rand(preset.flicker[0], preset.flicker[1]);
      p.twPh = Math.random() * TAU;
      p.rot = Math.random() * TAU;
      p.spin = (Math.random() - 0.5) * 1.6 * preset.spin;
      p.x = rand(0, W || 1);
      p.y = fromTop ? rand(-24, -4) : rand(-12, (H || 1) + 12);
      return p;
    }

    function seed() {
      items = [];
      if (!W || !H) return;
      var n = Math.round((W * H) / 100000 * preset.per100k);
      if (countCap) n = Math.min(n, countCap);
      n = Math.max(preset.min, Math.min(preset.max, n));
      if (countCap) n = Math.min(n, countCap);
      for (var i = 0; i < n; i++) items.push(spawn({}, false));
    }

    function size() {
      var rect = canvas.getBoundingClientRect();
      var w = Math.round(rect.width), h = Math.round(rect.height);
      if (w === W && h === H) return false;
      W = w; H = h;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      return true;
    }

    function draw(dt) {
      if (!W || !H) return;
      clock += dt;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      var pad = 0;
      for (var i = 0; i < items.length; i++) {
        var p = items[i];
        if (dt) {
          p.ph += p.swayHz * TAU * dt;
          p.twPh += p.twHz * dt;
          p.rot += p.spin * dt;
          p.x += (p.vx + Math.cos(p.ph) * p.sway) * dt;
          p.y += p.vy * dt;
          pad = p.r * 2 + 10;
          if (p.y < -pad) { p.y = H + pad; p.x = rand(0, W); }
          else if (p.y > H + pad) { p.y = -pad; p.x = rand(0, W); }
          if (p.x < -pad) p.x = W + pad;
          else if (p.x > W + pad) p.x = -pad;
        }
        var tw = 0.5 + 0.5 * Math.sin(p.twPh);
        if (preset.sharp) tw = Math.pow(tw, 1.7);
        var a = p.a * (0.32 + 0.68 * tw);
        if (a < 0.012) continue;
        var img = p.isSpark ? spark(p.color) : glow(p.color);
        if (!img) continue;
        var d = p.r * 2;
        ctx.globalAlpha = a > 1 ? 1 : a;
        if (p.isSpark) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.drawImage(img, -d / 2, -d / 2, d, d);
          ctx.restore();
        } else {
          ctx.drawImage(img, p.x - d / 2, p.y - d / 2, d, d);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function frame(now) {
      raf = 0;
      if (!canvas.isConnected) return;          /* 컷이 새로 그려졌으면 조용히 끝난다 */
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      draw(dt);
      if (visible && !reduced) raf = global.requestAnimationFrame(frame);
    }

    function start() {
      size();
      if (reduced) { last = 0; draw(0); return; }
      if (!raf && visible) raf = global.requestAnimationFrame(frame);
    }

    function stop() {
      if (raf) global.cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    }

    if (global.IntersectionObserver) {
      var io = new global.IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) visible = entries[i].isIntersecting;
        if (visible && !doc.hidden) start(); else stop();
      }, { rootMargin: '90px' });
      io.observe(canvas);
    } else {
      visible = true;
      start();
    }

    if (global.ResizeObserver) {
      new global.ResizeObserver(function () {
        if (size() && reduced) draw(0);
      }).observe(canvas);
    }

    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) stop();
      else if (visible) start();
    });

    size();
    return { kind: kind, canvas: canvas };
  }

  function mount(canvas, kind, opts) {
    if (!canvas || canvas.__fx) return canvas ? canvas.__fx : null;
    var k = kind || canvas.getAttribute('data-fx') || 'ember';
    var o = opts || {};
    if (!opts) {
      if (canvas.getAttribute('data-fx-count')) o.count = +canvas.getAttribute('data-fx-count');
      if (canvas.getAttribute('data-fx-scale')) o.scale = +canvas.getAttribute('data-fx-scale');
    }
    var made = layer(canvas, k, o);
    canvas.__fx = made;
    return made;
  }

  function mountAll(root) {
    var list = (root || doc).querySelectorAll('canvas[data-fx]');
    for (var i = 0; i < list.length; i++) mount(list[i]);
  }

  function boot() { mountAll(doc); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.FX = { mount: mount, mountAll: mountAll, presets: PRESETS };
})(typeof window !== 'undefined' ? window : globalThis);
