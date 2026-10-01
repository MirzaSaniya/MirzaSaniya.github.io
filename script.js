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
        if (status) { status.textContent = 'Showing ' + shown + ' of ' + projects.length + ' projects'; }
      });
    });

    // Logos: if an image file is missing, hide it and keep the organization name
    document.querySelectorAll('.logo img').forEach(function (img) {
      function markMissing() { img.parentNode.classList.add('missing'); }
      if (img.complete && img.naturalWidth === 0) { markMissing(); }
      img.addEventListener('error', markMissing);
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
