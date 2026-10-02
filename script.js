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

  // Light by default; honor a saved choice. Runs in <head> to avoid a flash.
  var theme = readStored();
  if (theme !== 'light' && theme !== 'dark') { theme = 'light'; }
  root.setAttribute('data-theme', theme);
  root.classList.add('js');

  document.addEventListener('DOMContentLoaded', function () {

    // Theme toggle
    var themeToggle = document.getElementById('theme-toggle');
    function syncTheme() {
      var isDark = root.getAttribute('data-theme') === 'dark';
      themeToggle.textContent = isDark ? 'Light mode' : 'Dark mode';
      themeToggle.setAttribute('aria-pressed', String(isDark));
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
    var menuToggle = document.querySelector('.menu-toggle');
    var navLinks = document.getElementById('nav-links');
    function closeMenu() {
      navLinks.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
    if (menuToggle && navLinks) {
      menuToggle.addEventListener('click', function () {
        var open = navLinks.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', String(open));
      });
      navLinks.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', closeMenu); });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && navLinks.classList.contains('open')) {
          closeMenu();
          menuToggle.focus();
        }
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
        document.querySelectorAll('.project-group').forEach(function (g) {
          g.hidden = g.querySelectorAll('.project:not([hidden])').length === 0;
        });
        if (status) { status.textContent = 'Showing ' + shown + ' of ' + projects.length + ' projects'; }
      });
    });

    // Logos, covers and photos: if an image file is missing, hide it (the text stays)
    document.querySelectorAll('.logo img, .cover img, .photo img').forEach(function (img) {
      function markMissing() { img.parentNode.classList.add('missing'); }
      if (img.complete && img.naturalWidth === 0) { markMissing(); }
      img.addEventListener('error', markMissing);
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

    // Footer year
    var year = document.getElementById('year');
    if (year) { year.textContent = String(new Date().getFullYear()); }
  });
})();
