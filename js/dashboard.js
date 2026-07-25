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
     0. AUTH GUARD (frontend-only, no backend yet)
     This file is loaded on every internal page (Dashboard, Company
     Research, AI Analysis, Investment Report, Saved Reports, Profile,
     Settings, Help) so this is the one place to gate all of them.
     If there's no session flag from js/auth.js's startSession(), bounce
     back to the login page immediately -- before the rest of the page
     has a chance to render -- rather than waiting for DOMContentLoaded.

     BACKEND HOOK: once Flask exists, replace the localStorage check
     with a real session/token validation call.
     ------------------------------------------------------------------ */
  var SESSION_KEY = 'investiq_auth';
  var USER_KEY = 'investiq_user';

  if (localStorage.getItem(SESSION_KEY) !== 'true') {
    window.location.href = 'login.html';
    return;
  }

  /* ------------------------------------------------------------------
     LOGOUT
     Every internal page has a `.sidebar__link--logout` link that
     already points at index.html -- this just makes sure the frontend
     session is actually cleared before it navigates there, so a
     "logged out" user can't hit the browser back button into a
     Dashboard page that's supposed to be gated above.
     ------------------------------------------------------------------ */
  function initLogout() {
    document.querySelectorAll('.sidebar__link--logout').forEach(function (link) {
      link.addEventListener('click', function () {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(USER_KEY);
        // No e.preventDefault(): the link's own href="index.html" still
        // does the navigation, we just clear the session first.
      });
    });
  }
  initLogout();

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
     6. QUICK ACTIONS, REPORT TABLE "VIEW", AND RECENT SEARCH CHIPS
     None of these had a destination before -- they're plain buttons
     with a data-action attribute and nowhere to go. Each one routes to
     the existing page that matches its intent; the two that involve a
     specific company (View Report row / recent-search chip) pass it
     along as a `?company=` query string, which company-research.js
     now reads on load (see initDeepLinkCompany there) to pre-load that
     company instead of the default.

     BACKEND HOOK: once real report IDs exist, "View" should link to
     /reports/:id instead of a query-string company name.
     ------------------------------------------------------------------ */
  function initQuickActions() {
    var routes = {
      'analyse': 'company-research.html',
      'generate-report': 'ai-analysis.html',
      'market-trends': 'company-research.html',
      'compare': 'company-research.html'
    };

    document.querySelectorAll('.quick-action[data-action]').forEach(function (btn) {
      var target = routes[btn.getAttribute('data-action')];
      if (!target) return;
      btn.addEventListener('click', function () {
        window.location.href = target;
      });
    });
  }

  function initViewReportButtons() {
    document.querySelectorAll('[data-action="view-report"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.location.href = 'investment-report.html';
      });
    });
  }

  function initRecentSearchChips() {
    document.querySelectorAll('.search-chip[data-action="open-company"]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var company = chip.getAttribute('data-company');
        var url = 'company-research.html';
        if (company) url += '?company=' + encodeURIComponent(company);
        window.location.href = url;
      });
    });
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
    initQuickActions();
    initViewReportButtons();
    initRecentSearchChips();
  });
})();