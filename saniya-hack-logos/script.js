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
  root.classList.add('js');

  /* ---------- Live neural network in the hero ---------- */
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
      var s = getComputedStyle(canvas);
      colors.bg = s.getPropertyValue('--h-bg').trim();
      colors.accent = s.getPropertyValue('--h-accent').trim();
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
      var host = canvas.parentNode;
      host.addEventListener('pointermove', function (e) {
        var rect = canvas.getBoundingClientRect();
        pointer.x = e.clientX - rect.left;
        pointer.y = e.clientY - rect.top;
      });
      host.addEventListener('pointerleave', function () { pointer.x = -9999; pointer.y = -9999; });
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

  }


  document.addEventListener('DOMContentLoaded', function () {

    // Floating header: transparent over the hero, solid after scrolling
    var header = document.getElementById('site-header');
    var navLinks = document.getElementById('nav-links');
    var menuToggle = document.querySelector('.menu-toggle');
    function updateHeader() {
      var menuOpen = navLinks && navLinks.classList.contains('open');
      header.classList.toggle('solid', window.scrollY > 40 || menuOpen);
    }
    if (header) {
      updateHeader();
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) { return; }
        ticking = true;
        window.requestAnimationFrame(function () { updateHeader(); ticking = false; });
      }, { passive: true });
    }

    // Theme toggle
    var themeToggle = document.getElementById('theme-toggle');
    function syncTheme() {
      var isDark = root.getAttribute('data-theme') === 'dark';
      themeToggle.textContent = isDark ? 'Light mode' : 'Dark mode';
      themeToggle.setAttribute('aria-pressed', String(!isDark));
    }
    if (themeToggle) {
      syncTheme();
      themeToggle.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        writeStored(next);
        syncTheme();
      });
    }

    // Mobile menu
    function closeMenu() {
      navLinks.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      updateHeader();
    }
    if (menuToggle && navLinks) {
      menuToggle.addEventListener('click', function () {
        var open = navLinks.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', String(open));
        updateHeader();
      });
      navLinks.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', closeMenu); });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && navLinks.classList.contains('open')) {
          closeMenu();
          menuToggle.focus();
        }
      });
    }

    // Project filters (a group hides itself when none of its projects match)
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
        document.querySelectorAll('.project-group').forEach(function (g) {
          g.hidden = g.querySelectorAll('.project:not([hidden])').length === 0;
        });
        if (status) { status.textContent = 'Showing ' + shown + ' of ' + projects.length + ' projects'; }
      });
    });

    var EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG'];

    // Logos, covers and photos: if an image file is missing, hide it (the text stays)
    document.querySelectorAll('.logo img, .cover img, .photo img').forEach(function (img) {
      // A data-base lists one or more file names (separated by |) without an ending.
      // The page tries each name with each common ending before giving up.
      var bases = (img.getAttribute('data-base') || '').split('|').filter(Boolean);
      var first = img.getAttribute('src');
      var candidates = [];
      bases.forEach(function (b) {
        EXTS.forEach(function (e) { if (b + e !== first) { candidates.push(b + e); } });
      });
      var attempt = -1;
      function markMissing() { img.parentNode.classList.add('missing'); }
      function failed() {
        if (candidates.length) {
          attempt += 1;
          if (attempt < candidates.length) { img.src = candidates[attempt]; return; }
        }
        markMissing();
      }
      if (img.complete && img.naturalWidth === 0) { failed(); }
      img.addEventListener('error', failed);
    });

    // Logos: crop empty white or transparent margins so every logo fills its tile
    function trimLogo(img) {
      if (img.getAttribute('data-trimmed')) { return; }
      img.setAttribute('data-trimmed', '1');
      try {
        var w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) { return; }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        var data = ctx.getImageData(0, 0, w, h).data;
        var top = h, left = w, right = -1, bottom = -1;
        for (var y = 0; y < h; y += 1) {
          for (var x = 0; x < w; x += 1) {
            var i = (y * w + x) * 4;
            if (data[i + 3] < 16) { continue; }
            if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) { continue; }
            if (x < left) { left = x; } if (x > right) { right = x; }
            if (y < top) { top = y; } if (y > bottom) { bottom = y; }
          }
        }
        if (right < 0) { return; }
        var cw = right - left + 1, ch = bottom - top + 1;
        if (cw * ch > w * h * 0.9) { return; }
        var out = document.createElement('canvas');
        out.width = cw; out.height = ch;
        out.getContext('2d').drawImage(canvas, left, top, cw, ch, 0, 0, cw, ch);
        img.src = out.toDataURL('image/png');
      } catch (e) { /* cannot read the image (for example on a local file); keep the original */ }
    }
    document.querySelectorAll('.logo img').forEach(function (img) {
      if (img.complete && img.naturalWidth > 0) { trimLogo(img); }
      else { img.addEventListener('load', function () { trimLogo(img); }); }
    });

    // Profile photo: show initials until the photo loads
    var card = document.getElementById('profile-card');
    var photo = card ? card.querySelector('.portrait') : null;
    function showPhoto() { card.classList.add('has-photo'); }
    if (photo) {
      if (photo.complete && photo.naturalWidth > 0) { showPhoto(); }
      photo.addEventListener('load', showPhoto);
    }

    // Resume buttons: only show them if the PDF has been uploaded
    var resumeLinks = document.querySelectorAll('.resume-link');
    function hideResume() { resumeLinks.forEach(function (l) { l.hidden = true; }); }
    if (resumeLinks.length && window.fetch) {
      fetch(resumeLinks[0].getAttribute('href'), { method: 'HEAD' })
        .then(function (r) { if (!r.ok) { hideResume(); } })
        .catch(hideResume);
    }

    // Event photos: try common file endings, hide the photo if none exists, open a larger view on click
    var lightbox = document.getElementById('lightbox');
    var lbImg = document.getElementById('lightbox-img');
    var lbCap = document.getElementById('lightbox-cap');
    document.querySelectorAll('.shot').forEach(function (btn) {
      var img = btn.querySelector('img');
      var base = btn.getAttribute('data-base');
      var tried = 0;
      function giveUp() {
        btn.hidden = true;
        var li = btn.closest('li');
        if (li) { li.classList.remove('has-shot'); }
      }
      function tryNext() {
        tried += 1;
        if (tried < EXTS.length) { img.src = base + EXTS[tried]; } else { giveUp(); }
      }
      img.addEventListener('error', tryNext);
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) { tryNext(); }
      btn.addEventListener('click', function () {
        if (!lightbox || !lbImg) { return; }
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt;
        lbCap.textContent = btn.getAttribute('data-caption') || '';
        lightbox.showModal();
      });
    });
    if (lightbox) {
      lightbox.addEventListener('click', function (e) { if (e.target === lightbox) { lightbox.close(); } });
      var lbClose = document.getElementById('lightbox-close');
      if (lbClose) { lbClose.addEventListener('click', function () { lightbox.close(); }); }
    }

    // Footer year
    var year = document.getElementById('year');
    if (year) { year.textContent = String(new Date().getFullYear()); }

    // Greeting: uses the visitor's own device clock. Nothing is sent anywhere.
    var greet = document.getElementById('greet');
    if (greet) {
      var hour = new Date().getHours();
      greet.textContent = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 22 ? 'Good evening' : 'Good night';
    }

    // Local time in San Jose: a fixed time zone, so it is always your time, not the visitor's
    var localTime = document.getElementById('local-time');
    function tickTime() {
      try {
        var parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles', timeZoneName: 'short' }).formatToParts(new Date());
        var g = {};
        parts.forEach(function (p) { g[p.type] = p.value; });
        localTime.textContent = ' Local time ' + g.hour + ':' + g.minute + ' ' + (g.dayPeriod || '') + ' ' + (g.timeZoneName || '') + '.';
      } catch (e) { localTime.textContent = ''; }
    }
    if (localTime) { tickTime(); window.setInterval(tickTime, 20000); }

    // Prompts: short lines from my work; the button shows the next one
    var PROMPTS = [['Forecast. Score. Segment.', 'on data'], ['From search to Bayes.', 'on the Stanford AI program'], ['28% fewer defaults.', 'on PRiSE'], ['Agents that read the funnel.', 'on work at Adobe'], ['Badminton. Museums. Gardens.', 'on weekends'], ['18,000 feet.', 'on skydiving']];
    var promptIndex = 0;
    var promptText = document.getElementById('prompt-text');
    var promptOn = document.getElementById('prompt-on');
    var promptBtn = document.getElementById('prompt-next');
    if (promptText && promptOn && promptBtn) {
      promptBtn.addEventListener('click', function () {
        promptIndex = (promptIndex + 1) % PROMPTS.length;
        promptText.textContent = PROMPTS[promptIndex][0];
        promptOn.textContent = PROMPTS[promptIndex][1];
      });
    }

    initNetwork();
  });
})();
