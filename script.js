(function () {
  'use strict';

  var root = document.documentElement;
  var KEY = 'theme';

  function readStored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function writeStored(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* storage unavailable, ignore */ }
  }

  // Dark by default; honor a saved choice. Runs in <head> to avoid a flash.
  var theme = readStored();
  if (theme !== 'light' && theme !== 'dark') { theme = 'dark'; }
  root.setAttribute('data-theme', theme);

  /* ---------- Neural network canvas ---------- */
  function initNetwork() {
    var canvas = document.getElementById('net');
    if (!canvas || !canvas.getContext) { return; }
    var ctx = canvas.getContext('2d');

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var layerSizes = [4, 6, 6, 3];
    var layers = [];
    var nodes = [];
    var edges = [];
    var pulses = [];
    var colors = {};
    var width = 0, height = 0;
    var pointer = { x: -9999, y: -9999 };
    var running = false;
    var onScreen = true;
    var lastTs = 0;
    var spawnTimer = 0;

    // Small seeded generator so the layout is the same on every visit.
    var seed = 11;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

    layerSizes.forEach(function (count, li) {
      var column = [];
      for (var i = 0; i < count; i += 1) {
        var node = {
          x: 0.08 + li * (0.84 / (layerSizes.length - 1)) + (rnd() - 0.5) * 0.03,
          y: (i + 1) / (count + 1) + (rnd() - 0.5) * 0.04,
          out: [],
          glow: 0
        };
        column.push(node);
        nodes.push(node);
      }
      layers.push(column);
    });

    for (var l = 0; l < layers.length - 1; l += 1) {
      layers[l].forEach(function (a) {
        layers[l + 1].forEach(function (b) {
          var edge = { a: a, b: b };
          a.out.push(edge);
          edges.push(edge);
        });
      });
    }

    function readColors() {
      var s = getComputedStyle(root);
      colors.bg = s.getPropertyValue('--bg').trim();
      colors.accent = s.getPropertyValue('--accent').trim();
      colors.pulse = s.getPropertyValue('--pulse').trim();
      colors.edge = s.getPropertyValue('--net-edge').trim();
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) { draw(); }
    }

    function spawn() {
      if (pulses.length > 16) { return; }
      var start = layers[0][Math.floor(Math.random() * layers[0].length)];
      var edge = start.out[Math.floor(Math.random() * start.out.length)];
      pulses.push({ edge: edge, t: 0, speed: 0.45 + Math.random() * 0.3 });
      start.glow = 1;
    }

    function update(dt) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawn(); spawnTimer = 0.35 + Math.random() * 0.5; }

      for (var i = pulses.length - 1; i >= 0; i -= 1) {
        var p = pulses[i];
        p.t += p.speed * dt;
        if (p.t >= 1) {
          var dest = p.edge.b;
          dest.glow = 1;
          if (dest.out.length) {
            p.edge = dest.out[Math.floor(Math.random() * dest.out.length)];
            p.t = 0;
          } else {
            pulses.splice(i, 1);
          }
        }
      }

      nodes.forEach(function (n) { n.glow = Math.max(0, n.glow - dt * 1.4); });
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.edge;
      ctx.beginPath();
      edges.forEach(function (e) {
        ctx.moveTo(e.a.x * width, e.a.y * height);
        ctx.lineTo(e.b.x * width, e.b.y * height);
      });
      ctx.stroke();

      // Pulses with a short fading tail
      pulses.forEach(function (p) {
        var ax = p.edge.a.x * width, ay = p.edge.a.y * height;
        var bx = p.edge.b.x * width, by = p.edge.b.y * height;
        for (var k = 0; k < 6; k += 1) {
          var tt = Math.max(0, p.t - k * 0.035);
          ctx.globalAlpha = (1 - k / 6) * 0.9;
          ctx.fillStyle = colors.pulse;
          ctx.beginPath();
          ctx.arc(ax + (bx - ax) * tt, ay + (by - ay) * tt, 2.6 - k * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // Nodes
      nodes.forEach(function (n) {
        var x = n.x * width, y = n.y * height;
        var dx = x - pointer.x, dy = y - pointer.y;
        var near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 120);
        var lit = Math.min(1, n.glow + near);

        ctx.beginPath();
        ctx.arc(x, y, 4.5 + lit * 3, 0, Math.PI * 2);
        ctx.fillStyle = lit > 0.05 ? colors.accent : colors.bg;
        ctx.globalAlpha = lit > 0.05 ? 0.35 + lit * 0.65 : 1;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = colors.accent;
        ctx.stroke();
      });
    }

    function frame(ts) {
      if (!running) { return; }
      var dt = Math.min((ts - lastTs) / 1000 || 0, 0.05);
      lastTs = ts;
      update(dt);
      draw();
      window.requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduceMotion || !onScreen || document.hidden) { return; }
      running = true;
      lastTs = performance.now();
      window.requestAnimationFrame(frame);
    }
    function stop() { running = false; }

    readColors();
    resize();

    if (reduceMotion) { draw(); }

    if (!reduceMotion) {
      canvas.addEventListener('pointermove', function (e) {
        var rect = canvas.getBoundingClientRect();
        pointer.x = e.clientX - rect.left;
        pointer.y = e.clientY - rect.top;
      });
      canvas.addEventListener('pointerleave', function () { pointer.x = -9999; pointer.y = -9999; });
      document.addEventListener('visibilitychange', function () { if (document.hidden) { stop(); } else { start(); } });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          onScreen = entries[0].isIntersecting;
          if (onScreen) { start(); } else { stop(); }
        }).observe(canvas);
      }
      start();
    }

    if ('ResizeObserver' in window) { new ResizeObserver(resize).observe(canvas); }
    else { window.addEventListener('resize', resize); }

    document.addEventListener('themechange', function () {
      readColors();
      if (!running) { draw(); }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Theme toggle
    var toggle = document.getElementById('theme-toggle');
    function syncToggle() {
      var isDark = root.getAttribute('data-theme') === 'dark';
      toggle.textContent = isDark ? 'Light mode' : 'Dark mode';
      toggle.setAttribute('aria-pressed', String(!isDark));
    }
    if (toggle) {
      syncToggle();
      toggle.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        writeStored(next);
        syncToggle();
        document.dispatchEvent(new Event('themechange'));
      });
    }

    // Project filters
    var chips = document.querySelectorAll('.chip');
    var projects = document.querySelectorAll('#project-list .project');
    var status = document.getElementById('filter-status');

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var filter = chip.getAttribute('data-filter');
        var shown = 0;

        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });

        projects.forEach(function (p) {
          var tags = (p.getAttribute('data-tags') || '').split(' ');
          var match = filter === 'all' || tags.indexOf(filter) !== -1;
          p.hidden = !match;
          if (match) { shown += 1; }
        });

        if (status) { status.textContent = 'Showing ' + shown + ' of ' + projects.length + ' projects'; }
      });
    });

    // Logos: if an image file is missing, hide it and keep the organization name
    document.querySelectorAll('.logo img').forEach(function (img) {
      function markMissing() { img.parentNode.classList.add('missing'); }
      if (img.complete && img.naturalWidth === 0) { markMissing(); }
      img.addEventListener('error', markMissing);
    });

    // Footer year
    var year = document.getElementById('year');
    if (year) { year.textContent = String(new Date().getFullYear()); }

    initNetwork();
  });
})();
