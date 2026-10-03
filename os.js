(function () {
  'use strict';

  var root = document.documentElement;
  var KEY = 'theme';
  var D = window.OS_DATA;

  function readStored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function writeStored(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* ignore */ } }

  // Same theme choice as the main site; dark by default. Runs in <head> to avoid a flash.
  var theme = readStored();
  if (theme !== 'light' && theme !== 'dark') { theme = 'dark'; }
  root.setAttribute('data-theme', theme);

  var LINKS = {
    github: 'https://github.com/MirzaSaniya',
    linkedin: 'https://www.linkedin.com/in/SaniyaMirza/',
    email: 'mailto:mirzasaniya305@gmail.com',
    resume: '../docs/SaniyaMirza_Resume.pdf'
  };
  var resumeOK = true;

  /* ---------- small helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  // Builds DOM with textContent only, so data can never inject markup.
  function h(tag, props, kids) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (k === 'class') { e.className = v; }
      else if (k === 'text') { e.textContent = v; }
      else if (v !== null && v !== undefined && v !== false) { e.setAttribute(k, v); }
    });
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined) { return; }
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }
  function ext(href, text, cls) {
    var a = h('a', { href: href, text: text, class: cls || '' });
    if (/^https?:/.test(href)) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); }
    return a;
  }

  /* ---------- logos: missing-file fallback and margin crop ---------- */
  function trim(img) {
    if (img.getAttribute('data-trimmed')) { return; }
    img.setAttribute('data-trimmed', '1');
    try {
      var w = img.naturalWidth, hh = img.naturalHeight;
      if (!w || !hh) { return; }
      var c = document.createElement('canvas');
      c.width = w; c.height = hh;
      var ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      var d = ctx.getImageData(0, 0, w, hh).data;
      var top = hh, left = w, right = -1, bottom = -1;
      for (var y = 0; y < hh; y += 1) {
        for (var x = 0; x < w; x += 1) {
          var i = (y * w + x) * 4;
          if (d[i + 3] < 16) { continue; }
          if (d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245) { continue; }
          if (x < left) { left = x; } if (x > right) { right = x; }
          if (y < top) { top = y; } if (y > bottom) { bottom = y; }
        }
      }
      if (right < 0) { return; }
      var cw = right - left + 1, ch = bottom - top + 1;
      if (cw * ch > w * hh * 0.9) { return; }
      var o = document.createElement('canvas');
      o.width = cw; o.height = ch;
      o.getContext('2d').drawImage(c, left, top, cw, ch, 0, 0, cw, ch);
      img.src = o.toDataURL('image/png');
    } catch (e) { /* unreadable image (for example a local file): keep the original */ }
  }
  function watch(img) {
    var holder = img.parentNode;
    function missing() { holder.classList.add('missing'); }
    if (img.complete && img.naturalWidth === 0) { missing(); }
    img.addEventListener('error', missing);
    if (img.complete && img.naturalWidth > 0) { trim(img); }
    else { img.addEventListener('load', function () { trim(img); }); }
  }
  function logo(file, initials) {
    var span = h('span', { class: 'lg', 'data-initials': initials || '' });
    var img = h('img', { src: '../assets/logos/' + file, alt: '', width: '64', height: '64' });
    span.appendChild(img);
    watch(img);
    return span;
  }
  function groupLogo(shortName) {
    var g = D.groups.filter(function (x) { return x.short === shortName; })[0];
    return logo(g.logo, g.initials);
  }

  /* ---------- icons (static, trusted markup) ---------- */
  var ICON = {
    github: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 7 4 12 9 17"/><polyline points="15 7 20 12 15 17"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><text x="12" y="17" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700">in</text></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>',
    resume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><line x1="10" y1="12" x2="15" y2="12"/><line x1="10" y1="16" x2="15" y2="16"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><polyline points="20 4 20 11 13 11"/></svg>'
  };
  function icon(name) { var s = document.createElement('span'); s.innerHTML = ICON[name]; return s.firstChild; }

  /* ---------- dialogs ---------- */
  var aboutDlg, sheetDlg, palDlg;
  function openAbout() { if (!aboutDlg.open) { palDlg.close(); aboutDlg.showModal(); } }

  /* ---------- sheet builders ---------- */
  var FILTERS = [['all', 'All'], ['ml', 'Machine learning'], ['ai', 'AI algorithms'], ['forecasting', 'Forecasting'], ['marketing', 'Marketing analytics'], ['finance', 'Finance and risk'], ['experimentation', 'Experimentation'], ['sql', 'SQL'], ['cleaning', 'Data cleaning'], ['viz', 'Visualization'], ['eda', 'Exploratory analysis']];

  function pills(items) { return h('ul', { class: 'pills' }, items.map(function (t) { return h('li', { text: t }); })); }

  var builders = {
    experience: { title: 'Experience', build: function () {
      var wrap = h('div');
      D.exp.forEach(function (e) {
        wrap.appendChild(h('div', { class: 'entry', 'data-id': e.id }, [
          h('div', { class: 'entry-head' }, [logo(e.logo, e.initials), h('div', {}, [h('h3', { text: e.role }), h('p', { class: 'sub', text: e.place })]), h('span', { class: 'date', text: e.date })]),
          h('p', { text: e.desc }),
          pills([e.cat])
        ]));
      });
      return wrap;
    } },

    projects: { title: 'Projects', build: function () {
      var wrap = h('div');
      wrap.appendChild(h('p', { class: 'sheet-note', text: 'Grouped by where I built them. Open a row for the summary and a link to the code.' }));
      var chips = h('div', { class: 'sheet-chips', role: 'group', 'aria-label': 'Filter projects' });
      var groups = [];
      FILTERS.forEach(function (f) {
        var b = h('button', { type: 'button', class: 'fchip', 'data-filter': f[0], 'aria-pressed': f[0] === 'all' ? 'true' : 'false', text: f[1] });
        b.addEventListener('click', function () {
          $$('.fchip', chips).forEach(function (c) { c.setAttribute('aria-pressed', String(c === b)); });
          groups.forEach(function (g) {
            var any = false;
            g.items.forEach(function (it) {
              var ok = f[0] === 'all' || it.tags.indexOf(f[0]) !== -1;
              it.el.hidden = !ok; if (ok) { any = true; }
            });
            g.title.hidden = !any;
          });
        });
        chips.appendChild(b);
      });
      wrap.appendChild(chips);
      D.groups.forEach(function (g) {
        var title = h('div', { class: 'group-title' }, [logo(g.logo, g.initials), h('div', {}, [h('h3', { text: g.name }), h('p', { class: 'sub', text: g.sub })])]);
        wrap.appendChild(title);
        var rec = { title: title, items: [] };
        D.projects.filter(function (p) { return p.group === g.short; }).forEach(function (p) {
          var det = h('details', { class: 'entry', 'data-id': p.id }, [
            h('summary', {}, [h('span', { class: 'p-title', text: p.title }), h('span', { class: 'p-cat', text: p.cat })]),
            h('p', { text: p.desc }),
            pills(p.tools),
            h('p', {}, [ext(p.href, p.link)])
          ]);
          wrap.appendChild(det);
          rec.items.push({ el: det, tags: p.tags });
        });
        groups.push(rec);
      });
      return wrap;
    } },

    skills: { title: 'Skills', build: function () {
      var wrap = h('div');
      D.skills.forEach(function (s) {
        wrap.appendChild(h('div', { class: 'entry' }, [h('h3', { text: s.name, class: 'plain-h' }), pills(s.items)]));
      });
      return wrap;
    } },

    achievements: { title: 'Conferences and hackathons', build: function () {
      var wrap = h('div');
      function section(name, list, withText) {
        wrap.appendChild(h('div', { class: 'group-title' }, [h('h3', { text: name })]));
        list.forEach(function (c) {
          var head = h('div', { class: 'entry-head' }, [logo(c.logo, c.initials), h('div', {}, [h('h3', { text: c.title })]), h('span', { class: 'date', text: c.year })]);
          var body = [head];
          if (c.text) { body.push(h('p', { text: c.text })); }
          wrap.appendChild(h('div', { class: 'entry' }, body));
        });
      }
      section('Conferences and panels', D.conf);
      section('Hackathons and apprenticeships', D.hack);
      wrap.appendChild(h('div', { class: 'group-title' }, [h('h3', { text: 'Research' })]));
      wrap.appendChild(h('div', { class: 'entry' }, [h('h3', { text: D.research.title, class: 'plain-h' }), h('p', { text: D.research.text }), h('p', {}, [ext(D.research.href, 'Read the paper')])]));
      return wrap;
    } },

    education: { title: 'Education', build: function () {
      var wrap = h('div');
      D.edu.forEach(function (e) {
        wrap.appendChild(h('div', { class: 'entry' }, [
          h('div', { class: 'entry-head' }, [logo(e.logo, e.initials), h('div', {}, [h('h3', { text: e.name }), h('p', { class: 'sub', text: e.lines.join(', ') })])])
        ]));
      });
      wrap.appendChild(h('div', { class: 'group-title' }, [h('h3', { text: 'Certifications' })]));
      wrap.appendChild(h('div', { class: 'entry' }, [pills(D.certs)]));
      return wrap;
    } }
  };

  function openSheet(kind, focusId) {
    var b = builders[kind];
    if (!b) { return; }
    palDlg.close();
    $('#sheet-title').textContent = b.title;
    $('#sheet-content').replaceChildren(b.build());
    if (!sheetDlg.open) { sheetDlg.showModal(); }
    $('.sheet-scroll', sheetDlg).scrollTop = 0;
    if (focusId) {
      window.requestAnimationFrame(function () {
        var t = $('[data-id="' + focusId + '"]', sheetDlg);
        if (!t) { return; }
        if (t.tagName === 'DETAILS') { t.open = true; }
        t.scrollIntoView({ block: 'center' });
        t.classList.add('flash');
      });
    }
  }

  /* ---------- tiles ---------- */
  function tile(label, kids, moreText, moreKind) {
    var t = h('section', { class: 'tile' }, [h('h2', { text: label })].concat(kids));
    if (moreText) {
      var m = h('button', { type: 'button', class: 'tile-more', text: moreText });
      m.addEventListener('click', function () { openSheet(moreKind); });
      t.appendChild(m);
    }
    return t;
  }

  function appsRow() {
    var row = h('div', { class: 'apps', role: 'list', 'aria-label': 'Quick links' });
    [['github', 'GitHub', LINKS.github], ['linkedin', 'LinkedIn', LINKS.linkedin], ['email', 'Email', LINKS.email], ['resume', 'Resume', LINKS.resume]].forEach(function (a) {
      var el = ext(a[2], '', 'app');
      el.setAttribute('role', 'listitem');
      el.appendChild(h('span', { class: 'app-icon' }, [icon(a[0])]));
      el.appendChild(h('span', { text: a[1] }));
      if (a[0] === 'resume') { el.setAttribute('data-resume', ''); el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
      row.appendChild(el);
    });
    return row;
  }

  function clockTile() {
    var timeEl = h('div', { class: 'time' });
    function tick() {
      var parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles', timeZoneName: 'short' }).formatToParts(new Date());
      var g = {}; parts.forEach(function (p) { g[p.type] = p.value; });
      timeEl.replaceChildren(document.createTextNode(g.hour + ':' + g.minute), h('small', { text: (g.dayPeriod || '') + ' ' + (g.timeZoneName || '') }));
    }
    tick();
    window.setInterval(tick, 20000);
    return tile('now', [
      h('div', { class: 'clock' }, [timeEl, h('div', { class: 'where' }, [h('strong', { text: 'San Jose' }), 'California'])]),
      h('p', { class: 'now-line', text: 'Data Scientist at Adobe, studying AI at Stanford.' })
    ]);
  }

  function experienceTile() {
    var wrap = h('div');
    D.exp.forEach(function (e) {
      var b = h('button', { type: 'button', class: 'rowbtn' }, [logo(e.logo, e.initials), h('span', { class: 'name', text: e.org }), h('span', { class: 'meta', text: e.years })]);
      b.addEventListener('click', function () { openSheet('experience', e.id); });
      wrap.appendChild(b);
    });
    return tile('experience', [wrap], 'see details', 'experience');
  }

  var FEATURED = ['ai-constraint-scheduler', 'intelligent-route-planner', 'probabilistic-risk-inference', 'lifetime-value-churn-and-uplift', 'revenue-arr-and-sales-forecasting', 'prise-predictive-risk-scoring-for-loan-defaults'];
  function projectsTile() {
    var wrap = h('div');
    FEATURED.forEach(function (id) {
      var p = D.projects.filter(function (x) { return x.id === id; })[0];
      if (!p) { return; }
      var b = h('button', { type: 'button', class: 'rowbtn' }, [groupLogo(p.group), h('span', { class: 'name', text: p.title }), h('span', { class: 'meta', text: p.group })]);
      b.addEventListener('click', function () { openSheet('projects', p.id); });
      wrap.appendChild(b);
    });
    return tile('projects', [wrap], 'all ' + D.projects.length + ' projects', 'projects');
  }

  function skillsTile() {
    var kids = [];
    D.skills.slice(0, 3).forEach(function (s) {
      kids.push(h('div', { class: 'skill-group' }, [h('h3', { text: s.name }), pills(s.items.slice(0, 6))]));
    });
    return tile('skills', kids, 'all skills', 'skills');
  }

  function confTile() {
    var tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Conferences or hackathons' });
    var scroller = h('div', { class: 'scroller', role: 'tabpanel' });
    var sets = { conferences: D.conf.map(function (c) { return { l: c.logo, i: c.initials, t: c.title, s: c.year + (c.text ? ', ' + c.text : '') }; }),
                 hackathons: D.hack.map(function (c) { return { l: c.logo, i: c.initials, t: c.title, s: c.year }; }) };
    function show(name) {
      $$('.tab', tabs).forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === name)); });
      scroller.replaceChildren.apply(scroller, sets[name].map(function (c) {
        return h('div', { class: 'card' }, [logo(c.l, c.i), h('p', { class: 't', text: c.t }), h('p', { class: 's', text: c.s })]);
      }));
      scroller.scrollLeft = 0;
    }
    ['conferences', 'hackathons'].forEach(function (n) {
      var b = h('button', { type: 'button', class: 'tab', role: 'tab', 'data-tab': n, text: n });
      b.addEventListener('click', function () { show(n); });
      tabs.appendChild(b);
    });
    show('conferences');
    return tile('talks', [tabs, scroller], 'see all', 'achievements');
  }

  var PROMPTS = [['Forecast. Score. Segment.', 'on data'], ['From search to Bayes.', 'on the Stanford AI program'], ['28% fewer defaults.', 'on PRiSE'], ['Agents that read the funnel.', 'on work at Adobe'], ['Badminton. Museums. Gardens.', 'on weekends'], ['18,000 feet.', 'on skydiving']];
  function promptTile() {
    var i = 0;
    var text = h('p', { class: 'prompt-text' }), on = h('p', { class: 'prompt-on' });
    function show() { text.textContent = PROMPTS[i][0]; on.textContent = PROMPTS[i][1]; }
    show();
    var btn = h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Show another' }, [icon('refresh')]);
    btn.addEventListener('click', function () { i = (i + 1) % PROMPTS.length; show(); });
    var t = tile('prompts', [text, on]);
    $('h2', t).appendChild(btn);
    return t;
  }

  function educationTile() {
    var wrap = h('div');
    var years = ['2026 – 27', '2019 – 21', '2015 – 17', '2012 – 15'];
    var names = ['Stanford', 'Northeastern', 'CIMP', "Patna Women's"];
    D.edu.forEach(function (e, n) {
      var b = h('button', { type: 'button', class: 'rowbtn' }, [logo(e.logo, e.initials), h('span', { class: 'name', text: names[n] }), h('span', { class: 'meta', text: years[n] })]);
      b.addEventListener('click', function () { openSheet('education'); });
      wrap.appendChild(b);
    });
    return tile('education', [wrap]);
  }

  /* ---------- command palette ---------- */
  var items = [], shown = [], active = 0;
  var GROUP_ORDER = ['Go to', 'Actions', 'Projects', 'Experience', 'Skills'];

  function buildItems() {
    items = [];
    function add(o) { items.push(o); }
    [['About me', function () { openAbout(); }], ['Experience', function () { openSheet('experience'); }], ['Projects', function () { openSheet('projects'); }],
     ['Skills', function () { openSheet('skills'); }], ['Conferences and hackathons', function () { openSheet('achievements'); }], ['Education', function () { openSheet('education'); }]]
      .forEach(function (s) { add({ group: 'Go to', label: s[0], glyph: '→', run: s[1] }); });
    add({ group: 'Actions', label: 'Switch theme', glyph: '◐', kw: 'dark light mode', run: function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next); writeStored(next); } });
    add({ group: 'Actions', label: 'Open GitHub', glyph: '↗', kw: 'code repositories', run: function () { window.open(LINKS.github, '_blank', 'noopener'); } });
    add({ group: 'Actions', label: 'Open LinkedIn', glyph: '↗', run: function () { window.open(LINKS.linkedin, '_blank', 'noopener'); } });
    add({ group: 'Actions', label: 'Send an email', glyph: '@', kw: 'contact mail', run: function () { window.location.href = LINKS.email; } });
    if (resumeOK) { add({ group: 'Actions', label: 'Open resume', glyph: '↗', kw: 'cv pdf', run: function () { window.open(LINKS.resume, '_blank', 'noopener'); } }); }
    add({ group: 'Actions', label: 'Open the classic site', glyph: '←', kw: 'portfolio', run: function () { window.location.href = '../'; } });
    D.projects.forEach(function (p) {
      add({ group: 'Projects', label: p.title, hint: p.group, logoEl: function () { return groupLogo(p.group); }, kw: [p.cat, p.desc, p.tools.join(' ')].join(' '), run: function () { openSheet('projects', p.id); } });
    });
    D.exp.forEach(function (e) {
      add({ group: 'Experience', label: e.org, hint: e.role, logoEl: function () { return logo(e.logo, e.initials); }, kw: [e.role, e.desc, e.cat].join(' '), run: function () { openSheet('experience', e.id); } });
    });
    D.skills.forEach(function (s) {
      add({ group: 'Skills', label: s.name, hint: s.items.length + ' tools', glyph: '#', kw: s.items.join(' '), run: function () { openSheet('skills'); } });
    });
  }

  function filterItems(q) {
    q = q.trim().toLowerCase();
    if (!q) { return items.filter(function (it) { return it.group === 'Go to' || it.group === 'Actions'; }); }
    var tokens = q.split(/\s+/);
    var scored = [];
    items.forEach(function (it) {
      var label = it.label.toLowerCase(), text = label + ' ' + (it.kw || '').toLowerCase(), s = 0, ok = true;
      tokens.forEach(function (t) {
        if (label.indexOf(t) === 0) { s += 4; }
        else if (label.indexOf(t) !== -1) { s += 3; }
        else if (text.indexOf(t) !== -1) { s += 1; }
        else { ok = false; }
      });
      if (ok) { scored.push({ it: it, s: s }); }
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored.map(function (x) { return x.it; }).slice(0, 24);
  }

  function renderPalette() {
    var list = $('#palette-list'), q = $('#palette-q');
    shown = filterItems(q.value);
    list.replaceChildren();
    if (!shown.length) {
      list.appendChild(h('li', { class: 'palette-empty', role: 'presentation', text: 'Nothing matches "' + q.value.trim() + '". Try a tool, a company or a project name.' }));
      q.removeAttribute('aria-activedescendant');
      return;
    }
    var n = 0;
    GROUP_ORDER.forEach(function (g) {
      var inGroup = shown.filter(function (it) { return it.group === g; });
      if (!inGroup.length) { return; }
      list.appendChild(h('li', { class: 'palette-group', role: 'presentation', text: g.toLowerCase() }));
      inGroup.forEach(function (it) {
        it._i = n;
        var lead = it.logoEl ? it.logoEl() : h('span', { class: 'glyph', text: it.glyph || '•' });
        var li = h('li', { class: 'palette-item', role: 'option', id: 'opt-' + n, 'aria-selected': 'false' }, [lead, h('span', { class: 'label', text: it.label }), it.hint ? h('span', { class: 'hint', text: it.hint }) : null]);
        li.addEventListener('click', function () { choose(it); });
        li.addEventListener('mousemove', function () { setActive(it._i, false); });
        list.appendChild(li);
        n += 1;
      });
    });
    shown = GROUP_ORDER.reduce(function (acc, g) { return acc.concat(shown.filter(function (it) { return it.group === g; })); }, []);
    setActive(0, false);
  }

  function setActive(i, scroll) {
    var opts = $$('.palette-item', $('#palette-list'));
    if (!opts.length) { return; }
    active = (i + opts.length) % opts.length;
    opts.forEach(function (o, k) { o.setAttribute('aria-selected', String(k === active)); });
    $('#palette-q').setAttribute('aria-activedescendant', opts[active].id);
    if (scroll) { opts[active].scrollIntoView({ block: 'nearest' }); }
  }

  function choose(it) { palDlg.close(); it.run(); }

  function openPalette() {
    if (palDlg.open) { return; }
    if (!items.length) { buildItems(); }
    $('#palette-q').value = '';
    renderPalette();
    palDlg.showModal();
    $('#palette-q').focus();
  }

  /* ---------- init ---------- */
  function init() {
    aboutDlg = $('#about'); sheetDlg = $('#sheet'); palDlg = $('#palette');

    // Greeting from the visitor's local time
    var hr = new Date().getHours();
    $('#greet').textContent = hr < 5 ? 'Good night' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : hr < 22 ? 'Good evening' : 'Good night';

    // Tiles
    $('#col-1').append(appsRow(), clockTile(), experienceTile());
    $('#col-2').append(projectsTile(), skillsTile());
    $('#col-3').append(confTile(), promptTile(), educationTile());

    // Static logos inside the About overlay
    $$('.lg img', aboutDlg).forEach(watch);

    // Open / close
    $('#open-about').addEventListener('click', openAbout);
    $('#mark').addEventListener('click', function (e) { e.preventDefault(); openAbout(); });
    $('#search-open').addEventListener('click', openPalette);
    $$('[data-close]').forEach(function (b) { b.addEventListener('click', function () { b.closest('dialog').close(); }); });
    palDlg.addEventListener('click', function (e) { if (e.target === palDlg) { palDlg.close(); } });
    $$('.about-body a[href^="#fn-"]', aboutDlg).forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); var t = $(a.getAttribute('href'), aboutDlg); if (t) { t.scrollIntoView({ block: 'center' }); } });
    });

    // Palette typing and keys
    var q = $('#palette-q');
    q.addEventListener('input', renderPalette);
    q.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1, true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1, true); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0, true); }
      else if (e.key === 'End') { e.preventDefault(); setActive(-1, true); }
      else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) { choose(shown[active]); } }
    });

    // Global shortcuts: Ctrl or Cmd + K, and "/"
    document.addEventListener('keydown', function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (palDlg.open) { palDlg.close(); } else { openPalette(); } }
      else if (e.key === '/' && !typing && !aboutDlg.open && !sheetDlg.open) { e.preventDefault(); openPalette(); }
    });
    $('#search-kbd').textContent = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘ K' : 'Ctrl K';

    // Resume: hide its shortcuts if the PDF has not been uploaded
    if (window.fetch) {
      fetch(LINKS.resume, { method: 'HEAD' })
        .then(function (r) { if (!r.ok) { throw new Error('missing'); } })
        .catch(function () { resumeOK = false; $$('[data-resume]').forEach(function (n) { n.remove(); }); items = []; });
    }
  }

  document.addEventListener('DOMContentLoaded', function () { if (D) { init(); } });
})();
