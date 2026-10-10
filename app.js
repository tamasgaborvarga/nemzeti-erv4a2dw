/* Nemzeti Étterem és Sütöde — interakciók */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- fejléc állapot ---------- */
  var header = document.getElementById('header');
  /* nyitott mobilmenünél is a tömör (világos) fejléc kell: különben a fehér
     logó-felirat és a fehér X a papírszínű menüháttéren láthatatlan */
  function onScroll() {
    var menuOpen = document.getElementById('nav').classList.contains('is-open');
    header.classList.toggle('is-scrolled', window.scrollY > 40 || menuOpen);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- mobil menü ---------- */
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');

  function closeNav() {
    nav.classList.remove('is-open');
    onScroll();
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Menü megnyitása');
  }

  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    onScroll();
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü bezárása' : 'Menü megnyitása');
  });

  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) closeNav();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      closeNav();
      toggle.focus();
    }
  });

  /* kattintás a drawer-en kívülre = bezárás (a fejléc-gomb kivételével) */
  document.addEventListener('click', function (e) {
    if (!nav.classList.contains('is-open')) return;
    if (e.target.closest('#nav') || e.target.closest('#navToggle')) return;
    closeNav();
  });

  /* ---------- aktív menüpont ---------- */
  var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-current', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- scroll reveal ---------- */
  var revealables = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.transitionDelay = Math.min(i * 70, 210) + 'ms';
        el.classList.add('is-in');
        obs.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- szűrő-státusz (képernyőolvasó) ---------- */
  /* A szűrés csak elrejt/megmutat; vizuális visszajelzésen kívül semmi nem
     jelzi az eredményt, ezért a találatszám élő régióba kerül. */
  var menuStatus = document.getElementById('menuStatus');
  var galleryStatus = document.getElementById('galleryStatus');

  /* Magyarban a számnév után egyes szám áll, ezért nincs többes alak. */
  function announce(el, label, count, noun) {
    if (!el) return;
    el.textContent = label + ': ' + count + ' ' + noun + ' látható.';
  }

  /* ---------- étlap szűrés ---------- */
  /* Az étlap és a galéria ugyanazt a .menu-filter/.pill komponenst használja,
     ezért a két csoportot az adat-attribútum választja szét: a puszta
     '.menu-filter .pill' a galéria gombjait is bevonná, azok pedig data-filter
     nélkül (filter === undefined) az egész étlapot elrejtenék. */
  var pills = document.querySelectorAll('.menu-filter [data-filter]');
  var blocks = document.querySelectorAll('.menu-block');

  pills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var filter = pill.dataset.filter;

      pills.forEach(function (p) {
        var active = p === pill;
        p.classList.toggle('is-active', active);
        p.setAttribute('aria-pressed', String(active));
      });

      var shown = 0;
      blocks.forEach(function (block) {
        var show = filter === 'all' || block.dataset.cat === filter;
        block.hidden = !show;
        if (show) { block.classList.add('is-in'); shown++; }
      });

      announce(menuStatus, pill.textContent.trim(), shown, 'fogáscsoport');
    });
  });

  /* ---------- galéria szűrés ---------- */
  /* A galéria két eltérő dolgot kever: tálalt éttermi ételeket és rendezvényi
     tálakat (a besorolás az ADATOK.md 6. pontjából). Ugyanaz a pill-komponens,
     mint az étlapnál — egy interakciós minta, kétszer. */
  var gPills = document.querySelectorAll('[data-gfilter]');
  var shotsAll = Array.prototype.slice.call(document.querySelectorAll('.shot'));

  function visibleShots() {
    return shotsAll.filter(function (el) { return !el.hidden; });
  }

  gPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var filter = pill.dataset.gfilter;
      gPills.forEach(function (p) {
        var active = p === pill;
        p.classList.toggle('is-active', active);
        p.setAttribute('aria-pressed', String(active));
      });
      var shown = 0;
      shotsAll.forEach(function (shot) {
        var show = filter === 'all' || shot.dataset.gcat === filter;
        shot.hidden = !show;
        if (show) shown++;
      });

      announce(galleryStatus, pill.textContent.trim(), shown, 'kép');
    });
  });

  /* ---------- lightbox ---------- */
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  /* A léptetés a SZŰRT listán megy: különben a nyilak elrejtett képekre vinnének. */
  var lbList = [];
  var current = 0;
  var lastFocus = null;

  function show(i) {
    if (!lbList.length) return;
    current = (i + lbList.length) % lbList.length;
    var shot = lbList[current];
    lbImg.src = shot.dataset.full;
    lbImg.alt = shot.querySelector('img').alt;
    lbCap.textContent = shot.dataset.caption + '  (' + (current + 1) + '/' + lbList.length + ')';
  }

  function openLb(shot) {
    lastFocus = document.activeElement;
    lbList = visibleShots();
    var i = lbList.indexOf(shot);
    show(i < 0 ? 0 : i);
    if (typeof lb.showModal === 'function') lb.showModal();
    else lb.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
  }

  function cleanupLb() {
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  function closeLb() {
    if (typeof lb.close === 'function' && lb.open) { lb.close(); return; }
    lb.removeAttribute('open');
    cleanupLb();
  }

  shotsAll.forEach(function (shot) {
    shot.addEventListener('click', function () { openLb(shot); });
  });

  document.getElementById('lbClose').addEventListener('click', closeLb);
  document.getElementById('lbPrev').addEventListener('click', function () { show(current - 1); });
  document.getElementById('lbNext').addEventListener('click', function () { show(current + 1); });

  lb.addEventListener('click', function (e) {
    if (e.target === lb) closeLb();
  });
  /* Esc-re a natív <dialog> csak 'cancel'/'close'-t ad: a görgetészárat és a
     fókusz visszaadását itt kell elvégezni, különben a body zárolva marad. */
  lb.addEventListener('close', cleanupLb);
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
  });

  /* ---------- nyitvatartás: élő állapot a hero-ban ----------
     H–P 11:00–14:00, hétvégén zárva (Google-cégprofil, a cég megerősítette).
     Az idő mindig budapesti, a látogató időzónájától függetlenül. Ünnepnapokat
     nem ismerünk, ezért azokon is a szokásos rendet mutatja. */
  var status = document.getElementById('openStatus');
  if (status && window.Intl) {
    var OPEN = 11 * 60, CLOSE = 14 * 60;
    var DAYS = ['vasárnap', 'hétfőn', 'kedden', 'szerdán', 'csütörtökön', 'pénteken', 'szombaton'];
    var parts = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Budapest', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    var mins = parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10);
    var workday = day >= 1 && day <= 5;
    var box = status.parentNode;
    if (workday && mins >= OPEN && mins < CLOSE) {
      status.textContent = 'Most nyitva · 14:00-ig';
      box.classList.add('is-open');
    } else {
      var when;
      if (workday && mins < OPEN) when = 'ma 11:00-kor';
      else if (day >= 1 && day <= 4) when = 'holnap 11:00-kor';
      else when = 'hétfőn 11:00-kor';
      status.textContent = 'Most zárva · ' + when + ' nyitunk';
      box.classList.add('is-closed');
    }
  }

  /* ---------- évszám ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
