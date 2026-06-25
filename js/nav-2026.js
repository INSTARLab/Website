/**
 * nav-2026.js — INSTAR Lab 2026 Navigation
 * W3C APG Disclosure Navigation + WCAG 2.2 AA off-canvas mobile drawer.
 * No jQuery. Loaded with defer — runs after DOM parse.
 */
(function () {
  'use strict';

  function init() {

    /* ============================================================
       DESKTOP — W3C APG Disclosure Navigation
       ============================================================ */
    var nav = document.querySelector('.main-menu nav');
    if (!nav) return;

    var toggles = Array.from(nav.querySelectorAll('.nav-toggle'));

    function getSubmenu(t) {
      return document.getElementById(t.getAttribute('aria-controls'));
    }
    function closeAll() {
      toggles.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    }
    function openToggle(t) {
      toggles.forEach(function (s) { if (s !== t) s.setAttribute('aria-expanded', 'false'); });
      t.setAttribute('aria-expanded', 'true');
    }

    /* Click */
    toggles.forEach(function (t) {
      t.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = t.getAttribute('aria-expanded') === 'true';
        closeAll();
        if (!open) openToggle(t);
      });
    });

    /* ArrowDown: move focus into first submenu link */
    toggles.forEach(function (t) {
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          var sub = getSubmenu(t);
          if (sub) { openToggle(t); var a = sub.querySelector('a'); if (a) a.focus(); }
        }
      });
    });

    /* Focusout: close when focus leaves nav (WCAG 1.4.13) */
    nav.addEventListener('focusout', function (e) {
      if (!e.relatedTarget || !nav.contains(e.relatedTarget)) {
        setTimeout(closeAll, 0);
      }
    });

    /* Outside click */
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) closeAll();
    });

    /* Hover: progressive enhancement with 200 ms grace period */
    var timers = new Map();
    toggles.forEach(function (t) {
      var li  = t.closest('li');
      var sub = getSubmenu(t);
      if (!li) return;
      function cancel()   { clearTimeout(timers.get(t)); }
      /* Use closeAll so any future close-path logic (e.g. focus management)
         stays in one place rather than being duplicated here. */
      function schedule() { timers.set(t, setTimeout(closeAll, 200)); }
      li.addEventListener('mouseenter', function () { cancel(); openToggle(t); });
      li.addEventListener('mouseleave', schedule);
      if (sub) { sub.addEventListener('mouseenter', cancel); sub.addEventListener('mouseleave', schedule); }
    });

    /* ============================================================
       MOBILE — off-canvas drawer (vanilla, no jQuery/meanmenu)
       ============================================================ */
    var hamburger = document.querySelector('.mobile-menu-btn');
    var overlay   = document.querySelector('.mobile-nav-overlay');
    var drawer    = document.getElementById('mobile-nav');
    var closeBtn  = drawer && drawer.querySelector('.mobile-nav__close');

    if (!hamburger || !overlay || !drawer) return;

    /* Focusable set is cached per open gesture (static drawer DOM). */
    var cachedFocusables = null;
    function focusables() {
      if (!cachedFocusables) {
        cachedFocusables = Array.from(drawer.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ));
      }
      return cachedFocusables;
    }

    function openDrawer() {
      cachedFocusables = null; /* reset so Tab sees fresh set on each open */
      drawer.classList.add('is-open');
      overlay.classList.add('is-open');
      document.body.classList.add('nav-scroll-locked');
      hamburger.setAttribute('aria-expanded', 'true');
      drawer.removeAttribute('aria-hidden');
      if (closeBtn) closeBtn.focus();
    }

    function closeDrawer() {
      cachedFocusables = null;
      drawer.classList.remove('is-open');
      overlay.classList.remove('is-open');
      document.body.classList.remove('nav-scroll-locked');
      hamburger.setAttribute('aria-expanded', 'false');
      drawer.setAttribute('aria-hidden', 'true');
      hamburger.focus();
    }

    hamburger.addEventListener('click', function () {
      drawer.classList.contains('is-open') ? closeDrawer() : openDrawer();
    });
    overlay.addEventListener('click', closeDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    /* Unified Esc handler — covers both desktop submenus and mobile drawer.
       Check mobile first; desktop guard inlines getOpen() at its single call site. */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (drawer.classList.contains('is-open')) { closeDrawer(); return; }
      var o = nav.querySelector('.nav-toggle[aria-expanded="true"]');
      if (o) { closeAll(); o.focus(); }
    });

    /* Focus trap: Tab/Shift+Tab cycles within drawer */
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      if (e.shiftKey) {
        if (document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      } else {
        if (document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });

    /* Close on leaf-link click (navigation complete) */
    drawer.querySelectorAll('.mobile-nav__sub-link, .mobile-nav__link').forEach(function (a) {
      a.addEventListener('click', closeDrawer);
    });

    /* Accordion: one section open at a time — toggle set cached once */
    var mobileToggles = Array.from(drawer.querySelectorAll('.mobile-nav__toggle'));
    mobileToggles.forEach(function (t) {
      t.addEventListener('click', function () {
        var expanded = t.getAttribute('aria-expanded') === 'true';
        mobileToggles.forEach(function (s) {
          if (s !== t) s.setAttribute('aria-expanded', 'false');
        });
        t.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
