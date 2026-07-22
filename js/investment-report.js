/* ==========================================================================
   INVESTMENT-REPORT.JS
   --------------------------------------------------------------------------
   Behavior for investment-report.html only. dashboard.js (loaded first)
   already handles the sidebar drawer, dropdowns, skeleton removal, and
   the topbar date -- every [data-skeleton] panel on this page is already
   covered by that shared logic, so it isn't repeated here. This file
   only adds what's specific to the report: the risk gauge reveal
   animation, keyboard-focus parity on the forecast cards, smooth
   in-page scrolling, and the four report action buttons.

   There is no backend yet, so Download/Print/Share are all simulated or
   browser-native only. Every spot that will need a real request later
   is marked // BACKEND HOOK.
   ========================================================================== */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     1. RISK METER GAUGE REVEAL
     The circular gauge arc is drawn with a CSS keyframe animation that
     plays once on load. This replays it when the Risk Analysis panel
     scrolls into view, so the fill-in is actually seen rather than
     happening off-screen -- same trick used on Company Research and
     AI Analysis.
     ------------------------------------------------------------------ */
  function replayAnimation(el) {
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetHeight; // forces reflow so the animation restarts
    el.style.animation = '';
  }

  function initRiskGaugeReveal() {
    var riskPanel = document.querySelector('.risk-analysis');
    if (!riskPanel) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.gauge-arc').forEach(replayAnimation);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(riskPanel);
  }

  /* ------------------------------------------------------------------
     2. FORECAST CARD KEYBOARD-FOCUS PARITY
     .prediction-card already lifts on mouse hover via CSS. It isn't a
     naturally focusable element, so keyboard users would miss that
     feedback entirely -- this makes each card tabbable and mirrors the
     same lifted state on keyboard focus.
     ------------------------------------------------------------------ */
  function initCardFocusParity() {
    document.querySelectorAll('.prediction-card').forEach(function (card) {
      if (!card.hasAttribute('tabindex')) {
        card.setAttribute('tabindex', '0');
      }
      card.addEventListener('focus', function () {
        card.style.transform = 'translateY(-4px)';
        card.style.boxShadow = 'var(--shadow-md)';
      });
      card.addEventListener('blur', function () {
        card.style.transform = '';
        card.style.boxShadow = '';
      });
    });
  }

  /* ------------------------------------------------------------------
     3. SMOOTH SCROLL
     Handles any in-page anchor links so navigation within this long
     report is smooth rather than an abrupt jump -- forward-compatible
     since the current markup has no in-page anchors yet.
     ------------------------------------------------------------------ */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var targetId = link.getAttribute('href');
        if (!targetId || targetId === '#') return;
        var target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  /* ------------------------------------------------------------------
     4. REPORT ACTIONS
     ------------------------------------------------------------------ */
  function runButtonFeedback(btn, busyText, doneText, busyMs, doneMs) {
    var label = btn.querySelector('.btn-label');
    if (!label) return;
    var originalText = label.textContent;

    btn.disabled = true;
    btn.style.opacity = '0.75';
    label.textContent = busyText;

    setTimeout(function () {
      label.textContent = doneText;
      setTimeout(function () {
        label.textContent = originalText;
        btn.disabled = false;
        btn.style.opacity = '';
      }, doneMs);
    }, busyMs);
  }

  function initDownloadPdf() {
    var btn = document.querySelector('[data-action="download-pdf"]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      // BACKEND HOOK: request a server-rendered PDF of this report from
      // /api/reports/:id/download and trigger the browser's file save.
      runButtonFeedback(btn, 'Preparing PDF...', 'Downloaded ✓', 1200, 1400);
    });
  }

  function initPrintReport() {
    var btn = document.querySelector('[data-action="print-report"]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      // Uses the browser's native print dialog. The @media print rules
      // in investment-report.css hide the sidebar/topbar/actions so
      // only the report content itself prints.
      window.print();
    });
  }

  function initShareReport() {
    var btn = document.querySelector('[data-action="share-report"]');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var shareData = {
        title: document.title,
        text: 'InvestIQ AI investment report',
        url: window.location.href
      };

      // Prefer the native OS share sheet where the browser supports it.
      if (navigator.share) {
        navigator.share(shareData).catch(function () {
          // User cancelled the share sheet -- no action needed.
        });
        return;
      }

      // BACKEND HOOK: once reports have real shareable URLs, replace
      // this fallback with copying that permanent link (rather than
      // the current page URL) to the clipboard.
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href).then(function () {
          runButtonFeedback(btn, 'Copying link...', 'Link Copied ✓', 300, 1400);
        });
      } else {
        runButtonFeedback(btn, 'Sharing...', 'Ready to Share', 500, 1200);
      }
    });
  }

  /* ------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initRiskGaugeReveal();
    initCardFocusParity();
    initSmoothScroll();
    initDownloadPdf();
    initPrintReport();
    initShareReport();
  });
})();
