/* ==========================================================================
   AI-ANALYSIS.JS
   --------------------------------------------------------------------------
   Behavior for ai-analysis.html only. dashboard.js (loaded first) already
   handles the sidebar drawer, dropdowns, skeleton removal, and the
   topbar date; company-research.js is not required by this page's
   markup but may load alongside it on shared layouts -- this file does
   not depend on either and is fully self-contained.

   There is no backend yet, so every score, gauge value, and "report" is
   simulated on the frontend. Every spot that will need a real fetch()
   later is marked // BACKEND HOOK.
   ========================================================================== */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     1. OVERALL AI SCORE COUNTER
     Animates the big "92" in the score circle from 0 up to its target,
     starting the moment the score panel scrolls into view.
     ------------------------------------------------------------------ */
  function initScoreCounter() {
    var scoreEl = document.querySelector('.ai-score__number');
    if (!scoreEl) return;

    var target = parseInt(scoreEl.textContent, 10);
    if (isNaN(target)) return;

    function animate() {
      if (prefersReducedMotion) {
        scoreEl.textContent = target;
        return;
      }
      var duration = 1400;
      var startTime = null;
      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        scoreEl.textContent = Math.floor(eased * target);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          scoreEl.textContent = target;
        }
      }
      requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animate();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(scoreEl);
  }

  /* ------------------------------------------------------------------
     2. PROGRESS / GAUGE ARC ANIMATION
     The circular gauge arcs (Overall AI Score, Market Sentiment) are
     drawn with a CSS keyframe animation in ai-analysis.css/dashboard.css
     that plays once on load. This replays that animation whenever its
     panel scrolls into view, so the fill-in doesn't just happen off-
     screen and go unseen -- the same "restart a CSS animation" trick
     used across the rest of the site.
     ------------------------------------------------------------------ */
  function replayAnimation(el) {
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetHeight; // forces reflow so the animation restarts
    el.style.animation = '';
  }

  function initGaugeReveal() {
    var gaugePanels = document.querySelectorAll('.ai-score, .market-sentiment');
    if (!gaugePanels.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.gauge-arc, .donut-segment').forEach(replayAnimation);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    gaugePanels.forEach(function (panel) {
      observer.observe(panel);
    });
  }

  /* ------------------------------------------------------------------
     3. AI PROCESSING TIMELINE REVEAL
     Steps fade and slide in one after another (staggered) the first
     time the timeline scrolls into view, reinforcing the sense that
     the AI worked through these stages in order.
     ------------------------------------------------------------------ */
  function initTimelineReveal() {
    var steps = document.querySelectorAll('.ai-timeline__step');
    if (!steps.length) return;

    if (prefersReducedMotion) return; // steps are visible by default; nothing to do

    steps.forEach(function (step) {
      step.style.opacity = '0';
      step.style.transform = 'translateY(10px)';
      step.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    var timelineList = document.querySelector('.ai-timeline__list');
    if (!timelineList) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          steps.forEach(function (step, i) {
            setTimeout(function () {
              step.style.opacity = '1';
              step.style.transform = 'translateY(0)';
            }, i * 180);
          });
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(timelineList);
  }

  /* ------------------------------------------------------------------
     4. CARD HOVER / FOCUS PARITY
     .swot-quadrant and .prediction-card already lift on mouse hover
     via CSS. Neither is a naturally focusable element, so keyboard
     users would miss that feedback entirely -- this makes them
     tabbable and mirrors the same lifted state on keyboard focus.
     ------------------------------------------------------------------ */
  function initCardFocusParity() {
    var cards = document.querySelectorAll('.swot-quadrant, .prediction-card');
    cards.forEach(function (card) {
      if (!card.hasAttribute('tabindex')) {
        card.setAttribute('tabindex', '0');
      }
      card.addEventListener('focus', function () {
        card.style.transform = 'translateY(-3px)';
        card.style.boxShadow = 'var(--shadow-md)';
      });
      card.addEventListener('blur', function () {
        card.style.transform = '';
        card.style.boxShadow = '';
      });
    });
  }

  /* ------------------------------------------------------------------
     5. SMOOTH SCROLL
     Handles any in-page anchor links (e.g. a future "Jump to SWOT"
     shortcut) so navigation within this long page is smooth rather
     than an abrupt jump -- defensive/forward-compatible since the
     current markup has no in-page anchors yet.
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
     6. ACTION BUTTONS
     Generate Report / Export / Compare all share the same "busy label
     -> confirmation label -> revert" pattern used on Company Research,
     reimplemented locally so this file has no cross-file dependency.
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

  function initActionButtons() {
    var generateBtns = document.querySelectorAll('[data-action="generate-report"]');
    var exportBtn = document.querySelector('[data-action="export-pdf"]');
    var compareBtn = document.querySelector('[data-action="compare-company"]');

    generateBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        // BACKEND HOOK: POST to /api/reports/generate with the current
        // ticker + AI score payload, then redirect to the generated report.
        runButtonFeedback(btn, 'Generating...', 'Report Ready ✓', 1500, 1400);
      });
    });

    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        // BACKEND HOOK: request a server-rendered PDF/CSV export of this
        // analysis from /api/analysis/export and trigger its download.
        runButtonFeedback(exportBtn, 'Exporting...', 'Downloaded ✓', 1000, 1400);
      });
    }

    if (compareBtn) {
      compareBtn.addEventListener('click', function () {
        // BACKEND HOOK: navigate to the comparison view with this
        // company pre-loaded as the first slot.
        runButtonFeedback(compareBtn, 'Opening...', 'Ready to Compare', 700, 1200);
      });
    }
  }

  /* ------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initScoreCounter();
    initGaugeReveal();
    initTimelineReveal();
    initCardFocusParity();
    initSmoothScroll();
    initActionButtons();
  });
})();