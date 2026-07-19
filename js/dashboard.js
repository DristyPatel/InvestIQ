/* ==========================================================================
   DASHBOARD.JS
   --------------------------------------------------------------------------
   Behavior for dashboard.html only. Five independent, small jobs -- each
   checks for its own elements and bails out quietly if they're not on
   the page, same pattern as auth.js.

   NOTE ON THE SIDEBAR TOGGLE:
   dashboard.css currently only defines a visual effect for the
   `sidebar-open` body class inside its mobile (max-width: 768px) media
   query -- on tablet the sidebar already auto-collapses to an icon rail
   via CSS alone (no JS needed), and on desktop it's always full width.
   So this toggle button's real job today is opening/closing the mobile
   drawer; at wider viewports, clicking it is harmless (the class is
   added but nothing in CSS reacts to it yet). A future phase can extend
   dashboard.css with a desktop rail-collapse state if that's wanted --
   this file is already structured so that's a CSS-only addition.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. SIDEBAR MOBILE DRAWER
     ------------------------------------------------------------------ */
  function initSidebarToggle() {
    var toggleBtn = document.getElementById('sidebarToggle');
    var backdrop = document.getElementById('sidebarBackdrop');
    if (!toggleBtn) return;

    function closeSidebar() {
      document.body.classList.remove('sidebar-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }

    toggleBtn.addEventListener('click', function () {
      var isOpen = document.body.classList.toggle('sidebar-open');
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
    });

    if (backdrop) {
      backdrop.addEventListener('click', closeSidebar);
    }

    // If the window is resized past the mobile breakpoint while the
    // drawer is open, close it -- otherwise it could get "stuck" open
    // behind desktop layout styles that no longer expect it.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) {
        closeSidebar();
      }
    });

    // Escape key closes the drawer, same as it closes dropdowns below.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });
  }

  /* ------------------------------------------------------------------
     2. DROPDOWNS (notification bell + user menu)
     Both use the same markup contract: a wrapper with [data-dropdown],
     a trigger button with [data-dropdown-trigger], and a .dropdown__panel
     inside it. This lets one function drive any number of dropdowns
     without duplicating logic per-dropdown.
     ------------------------------------------------------------------ */
  function initDropdowns() {
    var dropdowns = document.querySelectorAll('[data-dropdown]');
    if (!dropdowns.length) return;

    function closeAllDropdowns() {
      document.querySelectorAll('.dropdown__panel.is-open').forEach(function (panel) {
        panel.classList.remove('is-open');
        var parent = panel.closest('[data-dropdown]');
        var trigger = parent ? parent.querySelector('[data-dropdown-trigger]') : null;
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    }

    dropdowns.forEach(function (dropdown) {
      var trigger = dropdown.querySelector('[data-dropdown-trigger]');
      var panel = dropdown.querySelector('.dropdown__panel');
      if (!trigger || !panel) return;

      trigger.addEventListener('click', function (e) {
        // Stop this click from immediately re-closing the panel via
        // the document-level listener registered just below.
        e.stopPropagation();
        var wasOpen = panel.classList.contains('is-open');
        closeAllDropdowns();
        if (!wasOpen) {
          panel.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });

    // Clicking anywhere outside an open dropdown closes it.
    document.addEventListener('click', closeAllDropdowns);

    // Escape closes any open dropdown too.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllDropdowns();
    });
  }

  /* ------------------------------------------------------------------
     3. SKELETON LOADING SIMULATION
     Every element marked [data-skeleton] starts with the `.skeleton`
     class (shimmering placeholder, see dashboard.css) and loses it
     shortly after the page loads -- standing in for the moment real
     data arrives from the backend.
     ------------------------------------------------------------------ */
  function initSkeletonLoading() {
    var skeletonEls = document.querySelectorAll('[data-skeleton]');
    if (!skeletonEls.length) return;

    // BACKEND HOOK: once Flask endpoints exist, replace this fixed
    // timeout with removing `.skeleton` inside the `.then()` of the
    // real fetch() calls that populate each panel's data.
    setTimeout(function () {
      skeletonEls.forEach(function (el) {
        el.classList.remove('skeleton');
      });
    }, 900);
  }

  /* ------------------------------------------------------------------
     4. STAT CARD COUNT-UP
     Same easing/IntersectionObserver approach as js/statistics.js on
     the landing page, reimplemented locally so dashboard.html has no
     dependency on that file loading first.
     ------------------------------------------------------------------ */
  function initStatCounters() {
    var values = document.querySelectorAll('.stat-card__value[data-target]');
    if (!values.length) return;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function animateValue(el) {
      var target = parseFloat(el.getAttribute('data-target'));
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      var duration = 1200;

      if (prefersReducedMotion) {
        el.textContent = prefix + target.toLocaleString('en-IN') + suffix;
        return;
      }

      var startTime = null;
      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.floor(eased * target);
        el.textContent = prefix + current.toLocaleString('en-IN') + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = prefix + target.toLocaleString('en-IN') + suffix;
        }
      }
      requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateValue(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    values.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ------------------------------------------------------------------
     5. LIVE TOPBAR DATE
     Fills in today's date automatically, same "don't hardcode a value
     that goes stale" principle as the footer year in main.js.
     ------------------------------------------------------------------ */
  function initTopbarDate() {
    var dateEl = document.getElementById('topbarDate');
    if (!dateEl) return;
    var today = new Date();
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = today.toLocaleDateString('en-US', options);
  }

  /* ------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initSidebarToggle();
    initDropdowns();
    initSkeletonLoading();
    initStatCounters();
    initTopbarDate();
  });
})();