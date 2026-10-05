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
  function initDotGrid() {
    var canvas = document.getElementById('net');
    if (!canvas || !canvas.getContext) { return; }
    var ctx = canvas.getContext('2d');

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var GAP = 22;            // distance between dots, in pixels
    var REACH = 150;         // how far the cursor highlight reaches
    var width = 0, height = 0;
    var colors = {};
    var target = { x: -9999, y: -9999 };
    var cur = { x: -9999, y: -9999 };
    var strength = 0, strengthTarget = 0;
    var running = false;

    function readColors() {
      var st = getComputedStyle(canvas);
      colors.dot = st.getPropertyValue('--dot').trim() || 'rgba(120,160,255,0.28)';
      colors.accent = st.getPropertyValue('--h-accent').trim() || '#6c9cff';
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      var cols = Math.floor(width / GAP), rows = Math.floor(height / GAP);
      var offX = (width - (cols - 1) * GAP) / 2, offY = (height - (rows - 1) * GAP) / 2;

      // the still grid
      ctx.fillStyle = colors.dot;
      ctx.beginPath();
      for (var r = 0; r < rows; r += 1) {
        for (var c = 0; c < cols; c += 1) {
          var x = offX + c * GAP, y = offY + r * GAP;
          ctx.moveTo(x + 1, y);
          ctx.arc(x, y, 1, 0, Math.PI * 2);
        }
      }
      ctx.fill();

      // a few brighter dots that never move
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.85;
      [[0.84, 0.05], [0.1, 0.93], [0.9, 0.86]].forEach(function (p) {
        var cx = offX + Math.round(p[0] * (cols - 1)) * GAP, cy = offY + Math.round(p[1] * (rows - 1)) * GAP;
        ctx.beginPath(); ctx.arc(cx, cy, 1.9, 0, Math.PI * 2); ctx.fill();
      });

      // the faint highlight that follows the cursor
      if (strength > 0.01) {
        for (var rr = 0; rr < rows; rr += 1) {
          for (var cc = 0; cc < cols; cc += 1) {
            var px = offX + cc * GAP, py = offY + rr * GAP;
            var dx = px - cur.x, dy = py - cur.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d >= REACH) { continue; }
            var t = 1 - d / REACH;
            var level = t * t * strength;
            ctx.globalAlpha = level * 0.9;
            ctx.beginPath();
            ctx.arc(px, py, 1 + level * 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame() {
      cur.x += (target.x - cur.x) * 0.2;
      cur.y += (target.y - cur.y) * 0.2;
      strength += (strengthTarget - strength) * 0.12;
      draw();
      var settled = Math.abs(target.x - cur.x) < 0.5 && Math.abs(target.y - cur.y) < 0.5 && Math.abs(strengthTarget - strength) < 0.01;
      if (settled && strengthTarget === 0) { strength = 0; draw(); running = false; return; }
      window.requestAnimationFrame(frame);
    }
    function wake() { if (!running) { running = true; window.requestAnimationFrame(frame); } }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    readColors();
    resize();

    if (!reduceMotion) {
      var host = canvas.parentNode;
      host.addEventListener('pointermove', function (e) {
        var rect = canvas.getBoundingClientRect();
        target.x = e.clientX - rect.left;
        target.y = e.clientY - rect.top;
        if (strengthTarget === 0) { cur.x = target.x; cur.y = target.y; }
        strengthTarget = 1;
        wake();
      });
      host.addEventListener('pointerleave', function () { strengthTarget = 0; wake(); });
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
        document.querySelectorAll('.project-sub').forEach(function (sub) {
          sub.hidden = sub.querySelectorAll('.project:not([hidden])').length === 0;
        });
        document.querySelectorAll('.project-group').forEach(function (g) {
          g.hidden = g.querySelectorAll('.project:not([hidden])').length === 0;
        });
        if (status) { status.textContent = 'Showing ' + shown + ' of ' + projects.length + ' projects'; }
      });
    });

    var EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG'];

    // Logos, covers and photos: if an image file is missing, hide it (the text stays)
    document.querySelectorAll('.logo img, .cover img, .photo img, .mark-box img').forEach(function (img) {
      // A data-base lists one or more file names (separated by |) without an ending.
      // The page tries each name with each common ending before giving up.
      var bases = (img.getAttribute('data-base') || '').split('|').filter(Boolean);
      var first = img.getAttribute('src');
      var candidates = [];
      bases.forEach(function (b) {
        EXTS.forEach(function (e) { if (b + e !== first) { candidates.push(b + e); } });
      });
      var attempt = -1;
      function markMissing() {
        var holder = img.parentNode;
        holder.classList.add('missing');
        // A logo tile beside an entry: let the entry use the full width when there is no logo
        if (holder.classList.contains('mark-box') && holder.closest('li')) { holder.closest('li').classList.remove('has-shot'); }
      }
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
    document.querySelectorAll('.logo img, .mark-box img').forEach(function (img) {
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
    var lbDetail = document.getElementById('lightbox-detail');
    document.querySelectorAll('.shot').forEach(function (btn) {
      var img = btn.querySelector('img');
      var base = btn.getAttribute('data-base');
      var tried = 0;
      function giveUp() {
        btn.hidden = true;
        var li = btn.closest('li');
        if (li) { li.classList.remove('has-shot'); }
        // A publication photo with no file: hide its whole tile, and the row if every photo is missing
        if (li && li.classList.contains('pub-photo')) {
          li.hidden = true;
          var list = li.parentNode;
          if (list && list.querySelectorAll('li:not([hidden])').length === 0) { list.hidden = true; }
        }
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
        if (lbDetail) { lbDetail.textContent = btn.getAttribute('data-detail') || ''; }
        lightbox.showModal();
      });
    });
    if (lightbox) {
      lightbox.addEventListener('click', function (e) { if (e.target === lightbox) { lightbox.close(); } });
      var lbClose = document.getElementById('lightbox-close');
      if (lbClose) { lbClose.addEventListener('click', function () { lightbox.close(); }); }
    }

    // Time in role: the current job counts up to today (start and end months both counted, like LinkedIn)
    document.querySelectorAll('.dur[data-start]').forEach(function (el) {
      var p = el.getAttribute('data-start').split('-');
      var now = new Date();
      var months = (now.getFullYear() - Number(p[0])) * 12 + (now.getMonth() + 1 - Number(p[1])) + 1;
      if (months < 1) { return; }
      var y = Math.floor(months / 12), m = months % 12, out = [];
      if (y) { out.push(y + (y > 1 ? ' yrs' : ' yr')); }
      if (m) { out.push(m + (m > 1 ? ' mos' : ' mo')); }
      el.textContent = out.join(' ');
    });

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

    // Copy email: works even when the computer has no mail app set up
    function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) { return navigator.clipboard.writeText(text); }
      return new Promise(function (resolve, reject) {
        var box = document.createElement('textarea');
        box.value = text;
        box.setAttribute('readonly', '');
        box.style.position = 'fixed';
        box.style.opacity = '0';
        document.body.appendChild(box);
        box.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(box);
        if (ok) { resolve(); } else { reject(new Error('copy failed')); }
      });
    }
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        copyText(btn.getAttribute('data-copy')).then(function () {
          var swap = btn.querySelector('.copy-label');
          if (swap) {
            var original = swap.textContent;
            swap.textContent = 'Copied to clipboard';
            window.setTimeout(function () { swap.textContent = original; }, 1800);
            return;
          }
          var label = btn.textContent.trim();
          if (label) {
            btn.textContent = 'Copied';
            window.setTimeout(function () { btn.textContent = label; }, 1800);
          } else {
            var note = btn.parentNode.querySelector('.copied');
            if (note) {
              note.textContent = 'Copied';
              window.setTimeout(function () { note.textContent = ''; }, 1800);
            }
          }
        }).catch(function () { window.location.href = 'mailto:' + btn.getAttribute('data-copy'); });
      });
    });

    // Optional music: shown only when assets/music/track.mp3 exists. It never plays by itself.
    var music = document.getElementById('music');
    var audio = document.getElementById('bgm');
    var musicBtn = document.getElementById('music-toggle');
    if (music && audio && musicBtn && window.fetch) {
      var source = audio.querySelector('source');
      var titleEl = document.getElementById('track-title');
      if (titleEl && music.getAttribute('data-title')) { titleEl.textContent = music.getAttribute('data-title'); }
      fetch(source.getAttribute('src'), { method: 'HEAD' })
        .then(function (r) { if (r.ok) { music.hidden = false; } })
        .catch(function () { /* no music file: keep the player hidden */ });
      function showPlaying(on) {
        musicBtn.classList.toggle('playing', on);
        musicBtn.setAttribute('aria-pressed', String(on));
        musicBtn.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
      }
      audio.addEventListener('play', function () { showPlaying(true); });
      audio.addEventListener('pause', function () { showPlaying(false); });
      musicBtn.addEventListener('click', function () {
        if (audio.paused) {
          audio.play().catch(function () { showPlaying(false); /* the browser blocked playback */ });
        } else {
          audio.pause();
        }
      });
    }

    initDotGrid();
  });
})();
